import { tr } from "./i18n";
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { parseColor } from "./brand";
import { detectSubprojects } from "./detect";
import { isBlank } from "./load";

export interface Issue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface ValidateOptions {
  /** Raiz do repositório, usada para conferir as evidências. */
  root: string;
  /** Commit atual (git rev-parse HEAD), para avisar quando o JSON está desatualizado. */
  headCommit?: string;
}

type Obj = Record<string, unknown>;

/** Campo que identifica cada item e precisa estar preenchido. */
const ARRAY_SECTIONS: { path: string; key: string; evidence?: "error" | "warning"; min?: number; optional?: boolean }[] = [
  { path: "business.actors", key: "name", evidence: "warning", optional: true },
  { path: "business.flows", key: "name", evidence: "warning", optional: true },
  { path: "stack", key: "name", evidence: "warning", min: 1 },
  { path: "architecture.modules", key: "path" },
  { path: "conventions", key: "title", evidence: "error" },
  { path: "domain.glossary", key: "term" },
  { path: "domain.businessRules", key: "title", evidence: "error" },
  { path: "features", key: "name", min: 1 },
  { path: "tours", key: "title" },
  { path: "gotchas", key: "title", evidence: "error" },
  { path: "decisions", key: "title", evidence: "warning" },
  { path: "firstTasks", key: "title" },
  { path: "gettingStarted.commands", key: "command" },
  { path: "gettingStarted.envVars", key: "name" },
  { path: "architecture.patterns", key: "name", evidence: "warning", optional: true },
  { path: "subprojects", key: "path", optional: true },
  { path: "tracks", key: "id", optional: true },
  { path: "people", key: "name", optional: true },
  { path: "workflow.branching.branches", key: "pattern", optional: true },
  { path: "workflow.release.environments", key: "name", optional: true },
  { path: "quality.checks", key: "name", evidence: "warning", optional: true },
  { path: "docs", key: "file", optional: true },
  { path: "codeNotes", key: "file", optional: true },
  { path: "todos", key: "file", optional: true },
  { path: "executive.risks", key: "title", evidence: "error", optional: true },
  { path: "executive.integrations", key: "name", evidence: "warning", optional: true },
  { path: "openQuestions", key: "question", optional: true },
];

/** Limites de itens: acima disso a apresentação fica pesada para quem está chegando. */
const MAX_ITEMS: Record<string, number> = {
  "executive.risks": 3,
  "executive.integrations": 12,
  openQuestions: 6,
  "architecture.patterns": 5,
  "workflow.branching.branches": 6,
  "quality.checks": 6,
  docs: 6,
  codeNotes: 6,
  todos: 8,
  gotchas: 6,
  tracks: 6,
  people: 8,
};

const CHAPTER_IDS = new Set(["why", "business", "product", "language", "rules", "stack", "architecture", "setup", "conventions", "workflow", "people", "quality", "docs", "tours", "gotchas", "todos", "executive", "questions", "mission", "cheatsheet"]);
const PERSONAL_DATA = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{8,}\d/;

const EVIDENCE_KEYS = new Set(["evidence", "entryPoints", "files"]);

/** Tamanho a partir do qual o texto não cabe bem num slide. */
const TEXT_LIMITS: Record<string, number> = { tagline: 160, purpose: 700, summary: 700 };
const LONG_TEXT_KEYS = new Set(["description", "why", "explanation", "responsibility", "definition", "valueProposition", "model", "context", "decision", "impact", "approach", "process", "audience"]);
const LONG_TEXT = 450;

const MERMAID_TYPES =
  /^(graph|flowchart)(\s+(TB|TD|BT|RL|LR))?\s*;?$|^(sequenceDiagram|classDiagram(-v2)?|stateDiagram(-v2)?|erDiagram|gantt|journey|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|kanban)\b/;

/** Erros comuns de Mermaid que quebram o diagrama na tela. */
export function checkMermaid(diagram: string): Issue[] {
  const issues: Issue[] = [];
  const lines = diagram.split(/\r?\n/).map((l) => l.trim());
  let i = 0;
  if (lines[0] === "---") i = lines.indexOf("---", 1) + 1; // frontmatter
  while (i < lines.length && (!lines[i] || lines[i].startsWith("%%"))) i++;
  const header = lines[i] ?? "";
  if (!MERMAID_TYPES.test(header)) {
    issues.push({ level: "error", path: "architecture.diagram", message: tr(`tipo de diagrama Mermaid desconhecido na primeira linha: "${header.slice(0, 40)}" (use graph TD, flowchart LR, sequenceDiagram...)`, `unknown Mermaid diagram type on the first line: "${header.slice(0, 40)}" (use graph TD, flowchart LR, sequenceDiagram...)`) });
    return issues;
  }
  const body = lines.slice(i + 1).join("\n").replace(/"[^"\n]*"/g, '""');
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of body.replace(/%%.*$/gm, "").replace(/-->|==>|-\.->|<--|--[ox]|[ox]--/g, "")) {
    if ("([{".includes(ch)) stack.push(ch);
    else if (ch in pairs && stack.pop() !== pairs[ch]) {
      issues.push({ level: "warning", path: "architecture.diagram", message: tr(`parênteses/colchetes desbalanceados perto de "${ch}"`, `unbalanced brackets near "${ch}"`) });
      return issues;
    }
  }
  if (stack.length) issues.push({ level: "warning", path: "architecture.diagram", message: tr(`"${stack[stack.length - 1]}" aberto e não fechado`, `"${stack[stack.length - 1]}" opened and never closed`) });
  if (/^(graph|flowchart)/.test(header)) {
    // A[texto (assim)] quebra; formatos como B[(Banco)], C[[Sub]] e D[/x/] são válidos
    const bad = lines.slice(i + 1).find((l) => /\[[^\]"([/\\][^\]"]*[()][^\]"]*\]/.test(l));
    if (bad) issues.push({ level: "warning", path: "architecture.diagram", message: tr(`texto com parênteses ou colchetes dentro de um nó quebra o Mermaid; use aspas: A["texto (assim)"]. Linha: ${bad.slice(0, 60)}`, `brackets inside a node label break Mermaid; use quotes: A["text (like this)"]. Line: ${bad.slice(0, 60)}`) });
  }
  return issues;
}

/** Textos longos demais para um slide. */
function checkLength(value: unknown, at: string, issues: Issue[]): void {
  if (Array.isArray(value)) return value.forEach((v, i) => checkLength(v, `${at}[${i}]`, issues));
  if (!isObj(value)) return;
  for (const [key, v] of Object.entries(value)) {
    if (key.startsWith("_") || key === "meta") continue;
    const here = at ? `${at}.${key}` : key;
    const limit = TEXT_LIMITS[key] ?? (LONG_TEXT_KEYS.has(key) ? LONG_TEXT : undefined);
    if (typeof v === "string" && limit && v.length > limit) {
      issues.push({ level: "warning", path: here, message: tr(`texto longo para um slide (${v.length} caracteres): resuma em até ${limit}`, `text too long for a slide (${v.length} characters): keep it under ${limit}`) });
    } else {
      checkLength(v, here, issues);
    }
  }
}

const SECRET_PATTERNS: { name: string; re: RegExp; level: Issue["level"] }[] = [
  { name: "chave AWS", re: /\bAKIA[0-9A-Z]{16}\b/, level: "error" },
  { name: "chave de API (sk-...)", re: /\bsk-[A-Za-z0-9_-]{20,}/, level: "error" },
  { name: "token do GitHub", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/, level: "error" },
  { name: "token do Slack", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/, level: "error" },
  { name: "chave do Google", re: /\bAIza[0-9A-Za-z_-]{35}\b/, level: "error" },
  { name: "chave privada", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, level: "error" },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, level: "error" },
  { name: "URL com usuário e senha", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/"]+:[^\s@/"]+@/i, level: "warning" },
];

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Obj)[key] : undefined), obj);
}

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Separa "src/a.ts:10" ou "src/a.ts:10-20" em caminho e linha. */
export function parseEvidence(ref: string): { file: string; line?: number } {
  const match = /^(.*?)(?::(\d+)(?:-\d+)?)?$/.exec(ref.trim());
  const file = (match?.[1] ?? ref).trim();
  const line = match?.[2] ? Number(match[2]) : undefined;
  return { file, line };
}

function checkEvidence(ref: unknown, at: string, root: string, issues: Issue[]): void {
  if (typeof ref !== "string" || ref.trim() === "") return;
  const { file, line } = parseEvidence(ref);
  if (isAbsolute(file)) {
    issues.push({ level: "error", path: at, message: tr(`use caminho relativo à raiz, não absoluto: "${ref}"`, `use a path relative to the root, not absolute: "${ref}"`) });
    return;
  }
  const full = resolve(root, file);
  const rel = relative(root, full);
  if (rel.startsWith("..") || rel.split(sep).includes("..")) {
    issues.push({ level: "error", path: at, message: tr(`caminho fora do repositório: "${ref}"`, `path outside the repository: "${ref}"`) });
    return;
  }
  if (!existsSync(full)) {
    issues.push({ level: "error", path: at, message: tr(`arquivo não existe: "${file}"`, `file does not exist: "${file}"`) });
    return;
  }
  if (line !== undefined && statSync(full).isFile()) {
    const total = readFileSync(full, "utf8").split("\n").length;
    if (line < 1 || line > total) {
      issues.push({ level: "warning", path: at, message: tr(`linha ${line} não existe em "${file}" (${total} linhas): \`npx onboarding-kit status --fix\` acha a linha nova`, `line ${line} does not exist in "${file}" (${total} lines): \`npx onboarding-kit status --fix\` finds the new line`) });
    }
  }
}

/**
 * Símbolos citados entre crases no texto do item que não aparecem perto de nenhuma linha citada na evidência.
 * Pega evidência genérica ("src/index.ts:1") ou que mudou de assunto. undefined quando não dá para conferir.
 */
export function unmentionedSymbols(item: Record<string, unknown>, root: string): string[] | undefined {
  const textOf = [item.title, item.name, item.description, item.why, item.decision].filter((v) => typeof v === "string").join(" ");
  const symbols = [...new Set([...textOf.matchAll(/`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(?:\(\))?`/g)].map((m) => m[1]).filter((s) => s.length >= 3))];
  const refs = (Array.isArray(item.evidence) ? item.evidence : []).filter((r): r is string => typeof r === "string").map(parseEvidence).filter((e) => e.line);
  if (!symbols.length || !refs.length) return undefined;
  let windows = "";
  for (const { file, line } of refs) {
    const full = resolve(root, file);
    if (relative(root, full).startsWith("..")) continue;
    try {
      const lines = readFileSync(full, "utf8").split(/\r?\n/);
      windows += lines.slice(Math.max(0, line! - 4), line! + 3).join("\n") + "\n";
    } catch {
      return undefined;
    }
  }
  const missing = symbols.filter((sym) => !windows.includes(sym.split(".").pop()!));
  return missing.length === symbols.length ? missing : [];
}

function walkEvidence(value: unknown, at: string, root: string, issues: Issue[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkEvidence(v, `${at}[${i}]`, root, issues));
    return;
  }
  if (!isObj(value)) return;
  for (const [key, v] of Object.entries(value)) {
    if (key.startsWith("_") || key === "meta") continue;
    const here = at ? `${at}.${key}` : key;
    if (EVIDENCE_KEYS.has(key) && Array.isArray(v)) {
      v.forEach((ref, i) => checkEvidence(ref, `${here}[${i}]`, root, issues));
    } else if ((key === "file" || key === "logo" || key === "favicon") && typeof v === "string") {
      checkEvidence(v, here, root, issues);
    } else {
      walkEvidence(v, here, root, issues);
    }
  }
}

/** Seções que contam para a cobertura (as mesmas que a tela de espera acompanha). */
const COVERAGE_SECTIONS = ["project", "business", "features", "domain", "stack", "architecture", "gettingStarted", "conventions", "tours", "gotchas", "decisions", "firstTasks", "workflow", "quality", "docs", "todos", "brand"];

export interface Coverage {
  /** 0–100: 70% pelas seções preenchidas, 30% pela densidade de evidências. */
  score: number;
  filled: number;
  total: number;
  /** Referências a arquivos por item com campo de evidência. */
  evidencePerItem: number;
  /** Itens marcados como deduzidos (confidence: "inferred"): valem metade na parte de evidências. */
  inferred: number;
}

/** Nota de cobertura do onboarding, para acompanhar na CI e mostrar como badge. */
export function coverageScore(data: unknown): Coverage {
  const obj = isObj(data) ? data : {};
  const filled = COVERAGE_SECTIONS.filter((key) => !isBlank(obj[key])).length;
  let items = 0;
  let refs = 0;
  let inferred = 0;
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!isObj(value)) return;
    const evidence = Object.entries(value).filter(([k]) => EVIDENCE_KEYS.has(k));
    if (evidence.length && !isBlank(value)) {
      items++;
      if (value.confidence === "inferred") inferred++;
      for (const [, v] of evidence) if (Array.isArray(v)) refs += v.filter((r) => !isBlank(r)).length;
    }
    for (const [k, v] of Object.entries(value)) if (!k.startsWith("_") && k !== "meta") visit(v);
  };
  visit(obj);
  const evidencePerItem = items ? Math.round((refs / items) * 10) / 10 : 0;
  const trust = items ? 1 - 0.5 * (inferred / items) : 1;
  const score = Math.round(100 * (0.7 * (filled / COVERAGE_SECTIONS.length) + 0.3 * Math.min(1, evidencePerItem / 1.5) * trust));
  return { score, filled, total: COVERAGE_SECTIONS.length, evidencePerItem, inferred };
}

/** JSON do endpoint do shields.io para o badge de cobertura. */
export function coverageBadge(coverage: Coverage): Record<string, unknown> {
  const color = coverage.score >= 85 ? "brightgreen" : coverage.score >= 70 ? "green" : coverage.score >= 50 ? "yellow" : "orange";
  return { schemaVersion: 1, label: "onboarding", message: `${coverage.score}%`, color };
}

export function validateOnboarding(data: unknown, options: ValidateOptions): Issue[] {
  const issues: Issue[] = [];
  const err = (path: string, message: string) => issues.push({ level: "error", path, message });
  const warn = (path: string, message: string) => issues.push({ level: "warning", path, message });

  if (!isObj(data)) {
    err("", tr("o arquivo precisa ser um objeto JSON", "the file must be a JSON object"));
    return issues;
  }

  // meta
  const meta = data.meta;
  if (!isObj(meta)) {
    err("meta", tr("seção ausente", "missing section"));
  } else {
    if (meta.status !== "filled") err("meta.status", tr('ainda não foi preenchido pela IA (esperado "filled")', 'not filled in by the AI yet (expected "filled")'));
    if (isBlank(meta.generatedAt)) warn("meta.generatedAt", tr("vazio", "empty"));
    if (isBlank(meta.generatedBy)) warn("meta.generatedBy", tr("vazio", "empty"));
    if (options.headCommit) {
      if (isBlank(meta.commit)) {
        warn("meta.commit", tr("vazio: preencha com `git rev-parse HEAD`", "empty: fill it with `git rev-parse HEAD`"));
      } else if (!options.headCommit.startsWith(String(meta.commit)) && !String(meta.commit).startsWith(options.headCommit)) {
        warn("meta.commit", tr(`gerado no commit ${String(meta.commit).slice(0, 7)}, mas o HEAD é ${options.headCommit.slice(0, 7)}: rode \`npx onboarding-kit status\` para ver o que mudou`, `generated at commit ${String(meta.commit).slice(0, 7)}, but HEAD is ${options.headCommit.slice(0, 7)}: run \`npx onboarding-kit status\` to see what changed`));
      }
    }
  }

  // project
  const project = data.project;
  if (!isObj(project)) {
    err("project", tr("seção ausente", "missing section"));
  } else {
    for (const key of ["name", "purpose"]) {
      if (isBlank(project[key])) err(`project.${key}`, tr("obrigatório", "required"));
    }
    for (const key of ["tagline", "audience"]) {
      if (isBlank(project[key])) warn(`project.${key}`, tr("vazio", "empty"));
    }
  }

  // architecture
  const architecture = data.architecture;
  if (!isObj(architecture)) {
    err("architecture", tr("seção ausente", "missing section"));
  } else {
    if (isBlank(architecture.summary)) warn("architecture.summary", tr("vazio", "empty"));
    if (typeof architecture.diagram === "string" && architecture.diagram.trim().startsWith("```")) {
      err("architecture.diagram", tr("remova as cercas ``` e deixe só o código Mermaid", "remove the ``` fences and keep only the Mermaid code"));
    } else if (typeof architecture.diagram === "string" && !isBlank(architecture.diagram)) {
      issues.push(...checkMermaid(architecture.diagram));
    }
  }

  const business = data.business;
  if (business === undefined) {
    warn("business", tr("seção ausente: rode `npx onboarding-kit init --force` num arquivo novo ou peça à IA para adicionar o modelo de negócio", "missing section: run `npx onboarding-kit init --force` on a new file or ask the AI to add the business model"));
  } else if (!isObj(business)) {
    err("business", tr("precisa ser um objeto", "must be an object"));
  } else {
    if (isBlank(business.model)) warn("business.model", tr("vazio", "empty"));
    if (isBlank(business.valueProposition)) warn("business.valueProposition", tr("vazio", "empty"));
    if (Array.isArray(business.flows)) {
      business.flows.forEach((flow, i) => {
        if (isObj(flow) && !isBlank(flow) && Array.isArray(flow.steps) && flow.steps.some(isBlank)) {
          err(`business.flows[${i}].steps`, tr("tem passos em branco", "has blank steps"));
        }
      });
    }
  }

  const brand = data.brand;
  if (brand !== undefined && !isObj(brand)) {
    err("brand", tr("precisa ser um objeto", "must be an object"));
  } else if (isObj(brand)) {
    const colors = [["brand.primaryColor", brand.primaryColor], ...(Array.isArray(brand.palette) ? brand.palette.map((c, i) => [`brand.palette[${i}]`, c]) : [])];
    for (const [path, value] of colors) {
      if (typeof value === "string" && !isBlank(value) && !parseColor(value)) warn(String(path), tr(`cor não reconhecida: "${value}" (use hex, ex.: #4f46e5)`, `unrecognized color: "${value}" (use hex, e.g. #4f46e5)`));
    }
  }

  if (!isObj(data.gettingStarted)) err("gettingStarted", tr("seção ausente", "missing section"));
  if (!isObj(data.domain)) err("domain", tr("seção ausente", "missing section"));

  // listas
  for (const section of ARRAY_SECTIONS) {
    const list = get(data, section.path);
    if (list === undefined) {
      if (!section.optional) err(section.path, tr("seção ausente", "missing section"));
      continue;
    }
    if (!Array.isArray(list)) {
      err(section.path, tr("precisa ser uma lista", "must be a list"));
      continue;
    }
    let real = 0;
    const seen = new Map<string, number>();
    list.forEach((item, i) => {
      const at = `${section.path}[${i}]`;
      if (isBlank(item)) {
        err(at, tr("item modelo em branco: substitua por um item real ou remova", "blank template item: replace it with a real item or remove it"));
        return;
      }
      real++;
      if (!isObj(item)) return;
      if (isBlank(item[section.key])) err(`${at}.${section.key}`, tr("obrigatório", "required"));
      else if (typeof item[section.key] === "string") {
        const id = String(item[section.key]).trim().toLowerCase();
        if (seen.has(id)) warn(`${at}.${section.key}`, tr(`repetido: igual a ${section.path}[${seen.get(id)}]`, `duplicate of ${section.path}[${seen.get(id)}]`));
        else seen.set(id, i);
      }
      if (section.evidence && Array.isArray(item.evidence) && item.evidence.every(isBlank)) {
        issues.push({ level: section.evidence, path: `${at}.evidence`, message: tr("sem evidência no código", "no evidence in the code") });
      }
      if (item.confidence !== undefined && item.confidence !== "verified" && item.confidence !== "inferred") {
        warn(`${at}.confidence`, tr(`use "verified" ou "inferred": "${String(item.confidence)}"`, `use "verified" or "inferred": "${String(item.confidence)}"`));
      }
      if (options.root && item.confidence !== "inferred") {
        const missing = unmentionedSymbols(item, options.root);
        if (missing?.length) {
          warn(
            `${at}.evidence`,
            tr(
              `as linhas citadas não mencionam ${missing.map((m) => `\`${m}\``).join(", ")}: aponte a linha certa ou marque confidence: "inferred"`,
              `the cited lines don't mention ${missing.map((m) => `\`${m}\``).join(", ")}: point to the right line or set confidence: "inferred"`,
            ),
          );
        }
      }
    });
    if (section.min && real < section.min) err(section.path, tr(`precisa de pelo menos ${section.min} item`, `needs at least ${section.min} item`));
    const max = MAX_ITEMS[section.path];
    if (max && real > max) warn(section.path, tr(`${real} itens: mantenha no máximo ${max}, só os que importam para quem está chegando`, `${real} items: keep at most ${max}, only what matters to a newcomer`));
  }

  const subprojects = data.subprojects;
  const detected = detectSubprojects(options.root);
  if (detected.length && subprojects === undefined) {
    warn("subprojects", tr(`seção ausente: o repositório tem ${detected.length} projeto(s) (${detected.slice(0, 5).map((s) => s.path).join(", ")})`, `missing section: the repository has ${detected.length} project(s) (${detected.slice(0, 5).map((s) => s.path).join(", ")})`));
  } else if (detected.length > 1 && Array.isArray(subprojects)) {
    const listed = new Set(subprojects.filter(isObj).map((s) => String(s.path ?? "").replace(/\/+$/, "")));
    const missing = detected.filter((s) => !listed.has(s.path));
    if (missing.length) {
      warn("subprojects", tr(`${subprojects.length ? "projeto(s) do repositório fora da lista" : "vazio, mas o repositório tem estes projetos"}: ${missing.map((s) => s.path).join(", ")} (ignore se forem exemplos ou fixtures)`, `${subprojects.length ? "repository project(s) missing from the list" : "empty, but the repository has these projects"}: ${missing.map((s) => s.path).join(", ")} (ignore if they are examples or fixtures)`));
    }
  }
  if (Array.isArray(subprojects)) {
    const names = new Set(subprojects.filter(isObj).map((s) => s.name));
    subprojects.forEach((s, i) => {
      if (!isObj(s) || isBlank(s)) return;
      const at = `subprojects[${i}]`;
      if (isBlank(s.description)) err(`${at}.description`, tr("vazio: explique o que este projeto faz", "empty: explain what this project does"));
      if (typeof s.path === "string" && !isBlank(s.path)) checkEvidence(s.path, `${at}.path`, options.root, issues);
      if (Array.isArray(s.dependsOn)) {
        s.dependsOn.forEach((dep, j) => {
          if (!isBlank(dep) && !names.has(dep)) warn(`${at}.dependsOn[${j}]`, tr(`"${dep}" não está em subprojects`, `"${dep}" is not in subprojects`));
        });
      }
    });
  }

  if (Array.isArray(data.tracks)) {
    const paths = new Set(Array.isArray(subprojects) ? subprojects.filter(isObj).map((s) => s.path) : []);
    data.tracks.forEach((track, i) => {
      if (!isObj(track) || isBlank(track)) return;
      if (typeof track.id === "string" && track.id && !/^[a-z0-9-]+$/.test(track.id)) err(`tracks[${i}].id`, tr(`use minúsculas e hífens (vai na URL): "${track.id}"`, `use lowercase and hyphens (it goes in the URL): "${track.id}"`));
      (Array.isArray(track.chapters) ? track.chapters : []).forEach((ch, j) => {
        if (!isBlank(ch) && !CHAPTER_IDS.has(String(ch))) warn(`tracks[${i}].chapters[${j}]`, tr(`capítulo desconhecido: "${ch}"`, `unknown chapter: "${ch}"`));
      });
      (Array.isArray(track.paths) ? track.paths : []).forEach((p, j) => {
        if (!isBlank(p) && !paths.has(p)) warn(`tracks[${i}].paths[${j}]`, tr(`"${p}" não está em subprojects`, `"${p}" is not in subprojects`));
      });
    });
  }
  if (Array.isArray(data.people)) {
    data.people.forEach((person, i) => {
      if (isObj(person) && PERSONAL_DATA.test(JSON.stringify(person))) err(`people[${i}]`, tr("parece ter e-mail ou telefone: use só o canal do time ou o @usuario", "looks like it has an e-mail or phone number: use only the team channel or @handle"));
    });
  }

  const examples = get(data, "workflow.commits.examples");
  if (Array.isArray(examples) && examples.length > 1 && examples.some(isBlank)) {
    err("workflow.commits.examples", tr("tem exemplos em branco: use mensagens reais do git log ou deixe a lista vazia", "has blank examples: use real messages from git log or leave the list empty"));
  }

  for (const key of ["prerequisites", "setup"]) {
    const list = get(data, `gettingStarted.${key}`);
    if (Array.isArray(list) && list.length > 0 && list.every(isBlank)) {
      err(`gettingStarted.${key}`, tr("só tem itens em branco: preencha ou deixe a lista vazia", "only has blank items: fill them in or leave the list empty"));
    }
  }

  walkEvidence(data, "", options.root, issues);
  checkLength(data, "", issues);

  // segredos (ignora as instruções)
  const { _instructions, ...content } = data;
  void _instructions;
  const text = JSON.stringify(content);
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.re.test(text)) {
      issues.push({ level: pattern.level, path: "(arquivo)", message: tr(`possível segredo encontrado: ${pattern.name}. Remova antes de commitar.`, `possible secret found: ${pattern.name}. Remove it before committing.`) });
    }
  }

  return issues;
}
