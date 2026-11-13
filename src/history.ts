import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { basename, join } from "node:path";
import type { OnboardingData } from "./types";

/** Um item que entrou ou mudou numa versão mais nova do onboarding. */
export interface HistoryChange {
  /** Capítulo da apresentação onde o item aparece. */
  chapter: string;
  title: string;
  kind: "new" | "updated";
}

/** Lista do JSON → capítulo onde aparece. */
const SECTIONS: [string, string][] = [
  ["business.actors", "business"],
  ["business.flows", "business"],
  ["features", "product"],
  ["domain.glossary", "language"],
  ["domain.businessRules", "rules"],
  ["stack", "stack"],
  ["architecture.patterns", "architecture"],
  ["architecture.modules", "architecture"],
  ["subprojects", "architecture"],
  ["decisions", "architecture"],
  ["gettingStarted.commands", "setup"],
  ["gettingStarted.envVars", "setup"],
  ["conventions", "conventions"],
  ["workflow.branching.branches", "workflow"],
  ["people", "people"],
  ["quality.checks", "quality"],
  ["docs", "docs"],
  ["codeNotes", "docs"],
  ["tours", "tours"],
  ["gotchas", "gotchas"],
  ["todos", "todos"],
  ["firstTasks", "mission"],
];

function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function itemKey(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const o = item as Record<string, unknown>;
  const key = [o.title, o.name, o.term, o.pattern, o.command, o.path, o.file].find((v) => typeof v === "string" && v.trim());
  return key ? String(key).trim() : undefined;
}

/** Itens novos ou alterados de `before` para `after`, com o capítulo de cada um. */
export function diffOnboarding(before: OnboardingData, after: OnboardingData): HistoryChange[] {
  const changes: HistoryChange[] = [];
  for (const [path, chapter] of SECTIONS) {
    const now = get(after, path);
    if (!Array.isArray(now)) continue;
    const old = get(before, path);
    const previous = new Map((Array.isArray(old) ? old : []).map((item) => [itemKey(item)?.toLowerCase(), JSON.stringify(item)]));
    for (const item of now) {
      const key = itemKey(item);
      if (!key) continue;
      const was = previous.get(key.toLowerCase());
      if (was === undefined) changes.push({ chapter, title: key, kind: "new" });
      else if (was !== JSON.stringify(item)) changes.push({ chapter, title: key, kind: "updated" });
    }
  }
  return changes;
}

function git(cwd: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 * 1024 * 1024 }).toString();
  } catch {
    return undefined;
  }
}

const cache = new Map<string, { key: string; value: Record<string, HistoryChange[]> }>();

/**
 * O que mudou desde cada versão anterior do onboarding.json no git, indexado pelo meta.commit daquela versão.
 * A página guarda o meta.commit visto por último e mostra as mudanças desde ele.
 */
export function onboardingHistory(file: string, current: OnboardingData, versions = 8): Record<string, HistoryChange[]> {
  const root = join(file, "..");
  let mtime = 0;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    // arquivo pode não existir no export de dados em memória
  }
  const head = git(root, ["rev-parse", "HEAD"])?.trim();
  if (!head) return {};
  const key = `${head}:${mtime}:${current.meta?.commit ?? ""}`;
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  const prefix = git(root, ["rev-parse", "--show-prefix"])?.trim() ?? "";
  const path = `${prefix}${basename(file)}`;
  const history: Record<string, HistoryChange[]> = {};
  const shas = (git(root, ["log", `-n${versions}`, "--format=%H", "--", basename(file)]) ?? "").split("\n").filter(Boolean);
  for (const sha of shas) {
    let old: OnboardingData;
    try {
      old = JSON.parse(git(root, ["show", `${sha}:${path}`]) ?? "");
    } catch {
      continue;
    }
    const seen = old.meta?.commit?.trim();
    if (!seen || seen === current.meta?.commit || history[seen] || old.meta?.status !== "filled") continue;
    history[seen] = diffOnboarding(old, current).slice(0, 40);
  }
  cache.set(file, { key, value: history });
  return history;
}
