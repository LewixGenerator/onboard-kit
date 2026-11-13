import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FEEDBACK_FILE, readFeedback, type FeedbackEntry } from "./handler";
import { isBlank } from "./load";
import type { OnboardingData } from "./types";
import { parseEvidence } from "./validate";

/** Uma referência a arquivo dentro do onboarding.json. */
export interface EvidenceRef {
  /** Caminho no JSON, ex.: domain.businessRules[0].evidence[1]. */
  at: string;
  ref: string;
  /** Item que contém a referência, ex.: domain.businessRules[0]. */
  item: string;
  title: string;
}

export interface StaleItem {
  item: string;
  title: string;
  /** Arquivos citados pelo item que mudaram desde meta.commit. */
  files: string[];
}

/** Evidência que continua válida, mas em outro lugar: a linha andou ou o arquivo foi renomeado. */
export interface Drift {
  at: string;
  from: string;
  to: string;
}

export interface StatusReport {
  /** Por que não deu para comparar: sem git, sem meta.commit ou commit que não existe no repositório. */
  problem?: "no-git" | "no-commit" | "unknown-commit";
  since?: string;
  head?: string;
  changed: string[];
  added: string[];
  deleted: string[];
  /** Arquivo antigo → arquivo novo. */
  renamed: Record<string, string>;
  stale: StaleItem[];
  drift: Drift[];
  /** Referências a arquivos apagados (sem renomeação). */
  broken: { at: string; ref: string }[];
  /** Arquivos de código novos que o onboarding não cita. */
  uncovered: string[];
  /** Comentários "ficou confuso?" deixados nos slides da versão atual. */
  feedback: FeedbackEntry[];
}

const EVIDENCE_KEYS = new Set(["evidence", "entryPoints", "files"]);
const FILE_KEYS = new Set(["file", "path", "logo", "favicon"]);
const SOURCE_FILE = /\.([cm]?[jt]sx?|vue|svelte|astro|marko|gjs|gts|coffee|res|elm|purs|cljs|civet|imba|prisma|graphql|sql)$/i;
const TEST_FILE = /(\.|_)(test|spec)\.|(^|\/)(__tests__|tests?|e2e|cypress)\//i;

/** Todas as referências a arquivos do onboarding, com o item a que pertencem. */
export function collectRefs(data: OnboardingData): EvidenceRef[] {
  const refs: EvidenceRef[] = [];
  const visit = (value: unknown, at: string, owner: { at: string; title: string }) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => visit(v, `${at}[${i}]`, owner));
      return;
    }
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    const title = [obj.title, obj.name, obj.term].find((v) => typeof v === "string" && v.trim()) as string | undefined;
    // o item é o elemento de lista mais próximo (tours[0].steps[1]); fora de listas, o próprio objeto (workflow.branching)
    const me = at.endsWith("]") || !owner.at.endsWith("]") ? { at, title: title ?? owner.title } : owner;
    for (const [key, v] of Object.entries(obj)) {
      if (key.startsWith("_") || key.startsWith("$") || key === "meta") continue;
      const here = at ? `${at}.${key}` : key;
      const add = (ref: unknown, refAt: string) => {
        if (typeof ref === "string" && !isBlank(ref)) refs.push({ at: refAt, ref: ref.trim(), item: me.at, title: me.title });
      };
      if (EVIDENCE_KEYS.has(key) && Array.isArray(v)) v.forEach((ref, i) => add(ref, `${here}[${i}]`));
      else if (FILE_KEYS.has(key) && typeof v === "string") add(v, here);
      else visit(v, here, me);
    }
  };
  visit(data, "", { at: "", title: "" });
  return refs;
}

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).toString();
  } catch {
    return undefined;
  }
}

/** Linhas genéricas demais para reencontrar ("}", "return;"...) não servem de âncora. */
function anchor(line: string | undefined): string | undefined {
  const t = line?.trim();
  return t && t.replace(/[\s{}()[\];,]/g, "").length >= 6 ? t : undefined;
}

/** Nova linha de uma evidência: a ocorrência do mesmo texto mais próxima da posição antiga. */
export function relocateLine(oldSource: string, newSource: string, line: number): number | undefined {
  const text = anchor(oldSource.split("\n")[line - 1]);
  if (!text) return undefined;
  const lines = newSource.split("\n");
  if (lines[line - 1]?.trim() === text) return line;
  let best: number | undefined;
  lines.forEach((l, i) => {
    if (l.trim() === text && (best === undefined || Math.abs(i + 1 - line) < Math.abs(best - line))) best = i + 1;
  });
  return best;
}

export function onboardingStatus(data: OnboardingData, root: string): StatusReport {
  const feedback = readFeedback(join(root, FEEDBACK_FILE)).filter((f) => !data.meta?.commit || !f.commit || f.commit === data.meta.commit);
  const report: StatusReport = { changed: [], added: [], deleted: [], renamed: {}, stale: [], drift: [], broken: [], uncovered: [], feedback };
  if (git(root, ["rev-parse", "--is-inside-work-tree"])?.trim() !== "true") return { ...report, problem: "no-git" };
  const since = data.meta?.commit?.trim();
  if (!since) return { ...report, problem: "no-commit" };
  if (git(root, ["cat-file", "-e", `${since}^{commit}`]) === undefined) return { ...report, problem: "unknown-commit", since };
  report.since = since;
  report.head = git(root, ["rev-parse", "HEAD"])?.trim();

  // diff do commit analisado até a árvore de trabalho (inclui o que ainda não foi commitado)
  const prefix = git(root, ["rev-parse", "--show-prefix"])?.trim() ?? "";
  const strip = (f: string) => (prefix && f.startsWith(prefix) ? f.slice(prefix.length) : f);
  for (const line of (git(root, ["diff", "--name-status", "-M", since, "--", "."]) ?? "").split("\n")) {
    const [status, a, b] = line.split("\t");
    if (!status || !a) continue;
    if (status.startsWith("R") && b) report.renamed[strip(a)] = strip(b);
    else if (status === "A") report.added.push(strip(a));
    else if (status === "D") report.deleted.push(strip(a));
    else report.changed.push(strip(a));
  }
  report.added.push(...(git(root, ["ls-files", "--others", "--exclude-standard"]) ?? "").split("\n").filter(Boolean));

  const refs = collectRefs(data);
  const touched = new Set([...report.changed, ...report.deleted, ...Object.keys(report.renamed)]);
  const touches = (file: string) => (touched.has(file) ? [file] : [...touched].filter((f) => f.startsWith(`${file.replace(/\/+$/, "")}/`)));
  const stale = new Map<string, StaleItem>();
  const oldSources = new Map<string, string | undefined>();

  for (const r of refs) {
    const { file, line } = parseEvidence(r.ref);
    const hits = touches(file);
    if (hits.length) {
      const item = stale.get(r.item) ?? { item: r.item, title: r.title, files: [] };
      for (const h of hits) if (!item.files.includes(h)) item.files.push(h);
      stale.set(r.item, item);
    }
    const target = report.renamed[file];
    if (report.deleted.includes(file)) {
      report.broken.push({ at: r.at, ref: r.ref });
      continue;
    }
    if (line === undefined) {
      if (target) report.drift.push({ at: r.at, from: r.ref, to: target });
      continue;
    }
    if (!touched.has(file)) continue;
    const now = target ?? file;
    if (!existsSync(join(root, now)) || !statSync(join(root, now)).isFile()) continue;
    if (!oldSources.has(file)) oldSources.set(file, git(root, ["show", `${since}:${prefix}${file}`]));
    const old = oldSources.get(file);
    const moved = old === undefined ? undefined : relocateLine(old, readFileSync(join(root, now), "utf8"), line);
    if (moved !== undefined && (moved !== line || target)) report.drift.push({ at: r.at, from: r.ref, to: `${now}:${moved}` });
    else if (moved === undefined && target) report.drift.push({ at: r.at, from: r.ref, to: `${target}:${line}` });
  }
  report.stale = [...stale.values()];

  const cited = refs.map((r) => parseEvidence(r.ref).file);
  report.uncovered = report.added
    .filter((f) => SOURCE_FILE.test(f) && !TEST_FILE.test(f) && !/(^|\/)(node_modules|dist|build)\//.test(f) && !/\.d\.[cm]?ts$/.test(f))
    .filter((f) => !cited.some((c) => f === c))
    .slice(0, 20);
  return report;
}

function parsePath(path: string): (string | number)[] {
  return [...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map((m) => (m[2] !== undefined ? Number(m[2]) : m[1]));
}

/** Aplica as correções de posição (linha nova, arquivo renomeado). Devolve quantas foram aplicadas. */
export function applyDrift(data: OnboardingData, drift: Drift[]): number {
  let applied = 0;
  for (const d of drift) {
    const keys = parsePath(d.at);
    let parent: any = data;
    for (const k of keys.slice(0, -1)) parent = parent?.[k];
    const last = keys[keys.length - 1];
    if (parent && typeof parent[last] === "string" && parent[last].trim() === d.from) {
      parent[last] = d.to;
      applied++;
    }
  }
  return applied;
}

/** Prompt pronto para a IA atualizar só o que mudou. */
export function statusPrompt(report: StatusReport, file = "onboarding.json"): string | undefined {
  if (!report.since || (!report.stale.length && !report.broken.length && !report.uncovered.length && !report.feedback.length)) return undefined;
  const parts = [
    report.stale.length || report.broken.length || report.uncovered.length
      ? `Atualize o ${file}. Desde o commit ${report.since.slice(0, 7)}, mudaram arquivos que o onboarding cita.`
      : `Melhore o ${file} com o feedback de quem leu.`,
  ];
  if (report.stale.length) parts.push(`Revise estes itens: ${report.stale.map((s) => `${s.item}${s.title ? ` ("${s.title}")` : ""}`).join("; ")}.`);
  if (report.broken.length) parts.push(`Estas evidências apontam para arquivos apagados: ${report.broken.map((b) => b.ref).join(", ")}.`);
  if (report.uncovered.length) parts.push(`Veja se estes arquivos novos pedem itens novos: ${report.uncovered.join(", ")}.`);
  if (report.feedback.length) {
    parts.push(`Quem leu achou confuso: ${report.feedback.slice(-10).map((f) => `${f.title || f.slide} ("${f.comment.replace(/\s+/g, " ").slice(0, 200)}")`).join("; ")}. Reescreva esses trechos de forma mais clara e, no fim, esvazie o ${FEEDBACK_FILE} (deixe []).`);
  }
  parts.push(`Use \`git diff ${report.since.slice(0, 7)} -- <arquivo>\` para ver o que mudou, mantenha o restante como está, atualize meta.commit e meta.generatedAt e rode "npx onboarding-kit validate".`);
  return parts.join(" ");
}
