import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { parseColor } from "./brand";
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
  { path: "workflow.branching.branches", key: "pattern", optional: true },
  { path: "workflow.release.environments", key: "name", optional: true },
  { path: "quality.checks", key: "name", evidence: "warning", optional: true },
  { path: "docs", key: "file", optional: true },
  { path: "codeNotes", key: "file", optional: true },
  { path: "todos", key: "file", optional: true },
];

/** Limites de itens: acima disso a apresentação fica pesada para quem está chegando. */
const MAX_ITEMS: Record<string, number> = {
  "architecture.patterns": 5,
  "workflow.branching.branches": 6,
  "quality.checks": 6,
  docs: 6,
  codeNotes: 6,
  todos: 8,
  gotchas: 6,
};

const EVIDENCE_KEYS = new Set(["evidence", "entryPoints", "files"]);

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
    issues.push({ level: "error", path: at, message: `use caminho relativo à raiz, não absoluto: "${ref}"` });
    return;
  }
  const full = resolve(root, file);
  const rel = relative(root, full);
  if (rel.startsWith("..") || rel.split(sep).includes("..")) {
    issues.push({ level: "error", path: at, message: `caminho fora do repositório: "${ref}"` });
    return;
  }
  if (!existsSync(full)) {
    issues.push({ level: "error", path: at, message: `arquivo não existe: "${file}"` });
    return;
  }
  if (line !== undefined && statSync(full).isFile()) {
    const total = readFileSync(full, "utf8").split("\n").length;
    if (line < 1 || line > total) {
      issues.push({ level: "warning", path: at, message: `linha ${line} não existe em "${file}" (${total} linhas)` });
    }
  }
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

export function validateOnboarding(data: unknown, options: ValidateOptions): Issue[] {
  const issues: Issue[] = [];
  const err = (path: string, message: string) => issues.push({ level: "error", path, message });
  const warn = (path: string, message: string) => issues.push({ level: "warning", path, message });

  if (!isObj(data)) {
    err("", "o arquivo precisa ser um objeto JSON");
    return issues;
  }

  // meta
  const meta = data.meta;
  if (!isObj(meta)) {
    err("meta", "seção ausente");
  } else {
    if (meta.status !== "filled") err("meta.status", 'ainda não foi preenchido pela IA (esperado "filled")');
    if (isBlank(meta.generatedAt)) warn("meta.generatedAt", "vazio");
    if (isBlank(meta.generatedBy)) warn("meta.generatedBy", "vazio");
    if (options.headCommit) {
      if (isBlank(meta.commit)) {
        warn("meta.commit", "vazio: preencha com `git rev-parse HEAD`");
      } else if (!options.headCommit.startsWith(String(meta.commit)) && !String(meta.commit).startsWith(options.headCommit)) {
        warn("meta.commit", `gerado no commit ${String(meta.commit).slice(0, 7)}, mas o HEAD é ${options.headCommit.slice(0, 7)}: peça à IA para atualizar`);
      }
    }
  }

  // project
  const project = data.project;
  if (!isObj(project)) {
    err("project", "seção ausente");
  } else {
    for (const key of ["name", "purpose"]) {
      if (isBlank(project[key])) err(`project.${key}`, "obrigatório");
    }
    for (const key of ["tagline", "audience"]) {
      if (isBlank(project[key])) warn(`project.${key}`, "vazio");
    }
  }

  // architecture
  const architecture = data.architecture;
  if (!isObj(architecture)) {
    err("architecture", "seção ausente");
  } else {
    if (isBlank(architecture.summary)) warn("architecture.summary", "vazio");
    if (typeof architecture.diagram === "string" && architecture.diagram.trim().startsWith("```")) {
      err("architecture.diagram", "remova as cercas ``` e deixe só o código Mermaid");
    }
  }

  const business = data.business;
  if (business === undefined) {
    warn("business", "seção ausente: rode `npx onboarding-kit init --force` num arquivo novo ou peça à IA para adicionar o modelo de negócio");
  } else if (!isObj(business)) {
    err("business", "precisa ser um objeto");
  } else {
    if (isBlank(business.model)) warn("business.model", "vazio");
    if (isBlank(business.valueProposition)) warn("business.valueProposition", "vazio");
    if (Array.isArray(business.flows)) {
      business.flows.forEach((flow, i) => {
        if (isObj(flow) && !isBlank(flow) && Array.isArray(flow.steps) && flow.steps.some(isBlank)) {
          err(`business.flows[${i}].steps`, "tem passos em branco");
        }
      });
    }
  }

  const brand = data.brand;
  if (brand !== undefined && !isObj(brand)) {
    err("brand", "precisa ser um objeto");
  } else if (isObj(brand)) {
    const colors = [["brand.primaryColor", brand.primaryColor], ...(Array.isArray(brand.palette) ? brand.palette.map((c, i) => [`brand.palette[${i}]`, c]) : [])];
    for (const [path, value] of colors) {
      if (typeof value === "string" && !isBlank(value) && !parseColor(value)) warn(String(path), `cor não reconhecida: "${value}" (use hex, ex.: #4f46e5)`);
    }
  }

  if (!isObj(data.gettingStarted)) err("gettingStarted", "seção ausente");
  if (!isObj(data.domain)) err("domain", "seção ausente");

  // listas
  for (const section of ARRAY_SECTIONS) {
    const list = get(data, section.path);
    if (list === undefined) {
      if (!section.optional) err(section.path, "seção ausente");
      continue;
    }
    if (!Array.isArray(list)) {
      err(section.path, "precisa ser uma lista");
      continue;
    }
    let real = 0;
    list.forEach((item, i) => {
      const at = `${section.path}[${i}]`;
      if (isBlank(item)) {
        err(at, "item modelo em branco: substitua por um item real ou remova");
        return;
      }
      real++;
      if (!isObj(item)) return;
      if (isBlank(item[section.key])) err(`${at}.${section.key}`, "obrigatório");
      if (section.evidence && Array.isArray(item.evidence) && item.evidence.every(isBlank)) {
        issues.push({ level: section.evidence, path: `${at}.evidence`, message: "sem evidência no código" });
      }
    });
    if (section.min && real < section.min) err(section.path, `precisa de pelo menos ${section.min} item`);
    const max = MAX_ITEMS[section.path];
    if (max && real > max) warn(section.path, `${real} itens: mantenha no máximo ${max}, só os que importam para quem está chegando`);
  }

  const subprojects = data.subprojects;
  if (Array.isArray(subprojects)) {
    const names = new Set(subprojects.filter(isObj).map((s) => s.name));
    subprojects.forEach((s, i) => {
      if (!isObj(s) || isBlank(s)) return;
      const at = `subprojects[${i}]`;
      if (isBlank(s.description)) err(`${at}.description`, "vazio: explique o que este projeto faz");
      if (typeof s.path === "string" && !isBlank(s.path)) checkEvidence(s.path, `${at}.path`, options.root, issues);
      if (Array.isArray(s.dependsOn)) {
        s.dependsOn.forEach((dep, j) => {
          if (!isBlank(dep) && !names.has(dep)) warn(`${at}.dependsOn[${j}]`, `"${dep}" não está em subprojects`);
        });
      }
    });
  }

  const examples = get(data, "workflow.commits.examples");
  if (Array.isArray(examples) && examples.length > 1 && examples.some(isBlank)) {
    err("workflow.commits.examples", "tem exemplos em branco: use mensagens reais do git log ou deixe a lista vazia");
  }

  for (const key of ["prerequisites", "setup"]) {
    const list = get(data, `gettingStarted.${key}`);
    if (Array.isArray(list) && list.length > 0 && list.every(isBlank)) {
      err(`gettingStarted.${key}`, "só tem itens em branco: preencha ou deixe a lista vazia");
    }
  }

  walkEvidence(data, "", options.root, issues);

  // segredos (ignora as instruções)
  const { _instructions, ...content } = data;
  void _instructions;
  const text = JSON.stringify(content);
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.re.test(text)) {
      issues.push({ level: pattern.level, path: "(arquivo)", message: `possível segredo encontrado: ${pattern.name}. Remova antes de commitar.` });
    }
  }

  return issues;
}
