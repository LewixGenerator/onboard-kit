import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cachedMarkers, git, listRepoFiles, TODO_KINDS } from "./facts";
import { TEST } from "./health";

/**
 * Sinais para a visão executiva, calculados do git e dos arquivos (sem IA e sem rede).
 * Cada sinal tem uma gravidade; a apresentação mostra só os que fogem do normal.
 */

export interface Signals {
  /** Arquivos alterados nos últimos 12 meses: quantas vezes mudaram × tamanho. */
  quadrant: { file: string; commits: number; lines: number }[];
  /** Por área: quanto dos commits é de uma pessoa só. */
  ownership: { area: string; share: number; authors: number; commits: number }[];
  /** Idade dos TODO/FIXME pelo git blame. */
  debtAge?: { total: number; dated: number; medianDays: number; overYear: number; oldest?: { file: string; text: string; days: number } };
  /** Commits por semana (26 semanas, a última é a atual). */
  weeks: number[];
  /** Pares de arquivos de pastas diferentes que quase sempre mudam juntos. */
  coChange: { a: string; b: string; together: number; ratio: number }[];
  /** Commits de revert e hotfix nos últimos 6 meses. */
  delivery: { commits: number; reverts: number; hotfixes: number; ratio: number };
  /** Áreas com código e nenhum teste (só quando o projeto põe os testes ao lado do código). */
  untested: { area: string; source: number }[];
  /** Arquivos de domínio que importam infraestrutura. */
  drift: { file: string; line: number; text: string }[];
}

export type SignalId = "quadrant" | "ownership" | "debtAge" | "trend" | "coChange" | "delivery" | "untested" | "drift";

const CODE = /\.([cm]?[jt]sx?|vue|svelte|astro|py|go|rb|java|kt|cs|php|rs)$/i;
const IGNORED = /(^|\/)(node_modules|dist|build|vendor|venv|\.venv|target|obj|coverage|migrations?|generated|__generated__)\//;
const BOT = /\[bot\]|^dependabot|^renovate|^github-actions/i;
const DAY = 864e5;

interface Commit {
  author: string;
  at: number;
  subject: string;
  files: string[];
}

function commits(root: string): Commit[] {
  const out = git(root, ["log", "--since=12.months", "--no-merges", "--format=@@%aN\t%cI\t%s", "--name-only"]) ?? "";
  const list: Commit[] = [];
  for (const block of out.split("@@").slice(1)) {
    const [header, ...files] = block.split("\n");
    const [author, at, ...subject] = header.split("\t");
    list.push({ author: author.trim(), at: Date.parse(at), subject: subject.join("\t"), files: files.map((f) => f.trim()).filter(Boolean) });
  }
  return list;
}

const isCode = (file: string) => CODE.test(file) && !IGNORED.test(file);

function lineCount(root: string, file: string): number {
  try {
    if (statSync(join(root, file)).size > 2_000_000) return 0;
    return readFileSync(join(root, file), "utf8").split("\n").length;
  } catch {
    return 0;
  }
}

/** Área de um arquivo: a pasta de primeiro nível, ou a de segundo quando quase tudo mora numa só (src/, app/). */
function areaOf(files: string[]): (file: string) => string {
  const top: Record<string, number> = {};
  for (const f of files) if (f.includes("/")) top[f.split("/")[0]] = (top[f.split("/")[0]] ?? 0) + 1;
  const total = Object.values(top).reduce((a, b) => a + b, 0);
  const deep = new Set(Object.entries(top).filter(([, n]) => total && n / total > 0.6).map(([dir]) => dir));
  return (file) => {
    const parts = file.split("/");
    if (parts.length === 1) return "(raiz)";
    return deep.has(parts[0]) && parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  };
}

function debtAge(root: string): Signals["debtAge"] {
  const items = cachedMarkers(root).items.filter((m) => (TODO_KINDS as readonly string[]).includes(m.kind));
  if (!items.length) return undefined;
  const byFile = new Map<string, { line: number; text: string }[]>();
  for (const m of items.slice(0, 300)) {
    const [file, line] = [m.file.replace(/:\d+$/, ""), Number(/:(\d+)$/.exec(m.file)?.[1])];
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file)!.push({ line, text: m.text });
  }
  const ages: { file: string; text: string; days: number }[] = [];
  for (const [file, lines] of [...byFile].slice(0, 60)) {
    const out = git(root, ["blame", "--porcelain", ...lines.flatMap((l) => ["-L", `${l.line},${l.line}`]), "--", file]);
    if (!out) continue;
    const times = [...out.matchAll(/^author-time (\d+)$/gm)].map((m) => Number(m[1]) * 1000);
    // o porcelain repete o cabeçalho só na primeira vez que vê um commit: os tempos seguem a ordem dos commits, não das linhas
    const commitsOrder = [...out.matchAll(/^([0-9a-f]{40}) \d+ (\d+)/gm)].map((m) => ({ sha: m[1], line: Number(m[2]) }));
    const timeBySha = new Map<string, number>();
    let i = 0;
    for (const c of commitsOrder) if (!timeBySha.has(c.sha) && times[i] !== undefined) timeBySha.set(c.sha, times[i++]);
    for (const c of commitsOrder) {
      const at = timeBySha.get(c.sha);
      const hit = lines.find((l) => l.line === c.line);
      if (at && hit && !/^0{40}$/.test(c.sha)) ages.push({ file: `${file}:${c.line}`, text: hit.text, days: Math.round((Date.now() - at) / DAY) });
    }
  }
  if (!ages.length) return { total: items.length, dated: 0, medianDays: 0, overYear: 0 };
  const sorted = ages.map((a) => a.days).sort((a, b) => a - b);
  const oldest = ages.reduce((a, b) => (b.days > a.days ? b : a));
  return { total: items.length, dated: ages.length, medianDays: sorted[Math.floor(sorted.length / 2)], overYear: ages.filter((a) => a.days > 365).length, oldest };
}

/** Linhas de import que apontam para infraestrutura, em JS/TS, Python, PHP, Java, C# e Go. */
const IMPORT_LINE = /^\s*(import\b|from\s+\S+\s+import\b|use\s+[\w\\]|using\s+[\w.]|require(_once)?\b|const\s+\w+\s*=\s*require\(|"[\w./-]+"$)/;
const INFRA = /(^|[/\\.'"])(infra|infrastructure|adapters?)([/\\.'"]|$)/i;

function drift(root: string, files: string[]): Signals["drift"] {
  const found: Signals["drift"] = [];
  const domain = files.filter((f) => /(^|\/)domain\//i.test(f) && isCode(f) && !TEST.test(f)).slice(0, 400);
  for (const file of domain) {
    let lines: string[];
    try {
      lines = readFileSync(join(root, file), "utf8").split(/\r?\n/).slice(0, 80);
    } catch {
      continue;
    }
    lines.forEach((line, i) => {
      if (IMPORT_LINE.test(line) && INFRA.test(line)) found.push({ file, line: i + 1, text: line.trim().slice(0, 120) });
    });
    if (found.length >= 20) break;
  }
  return found;
}

const cache = new Map<string, { key: string; value: Signals }>();

export function projectSignals(root: string): Signals {
  const head = git(root, ["rev-parse", "HEAD"]) ?? "";
  const key = `${head}:${Math.floor(Date.now() / 60_000)}`;
  const hit = cache.get(root);
  if (hit?.key === key) return hit.value;

  const log = commits(root).filter((c) => !BOT.test(c.author));
  const repoFiles = listRepoFiles(root).filter((f) => !IGNORED.test(f));
  const area = areaOf(repoFiles.filter(isCode));

  // pontos críticos: muda muito × é grande
  const changes: Record<string, number> = {};
  for (const c of log) for (const f of c.files) if (isCode(f) && !TEST.test(f)) changes[f] = (changes[f] ?? 0) + 1;
  const quadrant = Object.entries(changes)
    .filter(([f]) => existsSync(join(root, f)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([file, n]) => ({ file, commits: n, lines: lineCount(root, file) }))
    .filter((q) => q.lines > 0);

  // conhecimento por área
  const byArea: Record<string, Record<string, number>> = {};
  for (const c of log) {
    for (const a of new Set(c.files.filter(isCode).map(area))) {
      byArea[a] ??= {};
      byArea[a][c.author] = (byArea[a][c.author] ?? 0) + 1;
    }
  }
  const ownership = Object.entries(byArea)
    .map(([a, authors]) => {
      const sorted = Object.entries(authors).sort((x, y) => y[1] - x[1]);
      const total = sorted.reduce((s, [, n]) => s + n, 0);
      // sem nomes: quem é a pessoa só aparece na seção people, que o time liga se quiser
      return { area: a, share: Math.round((sorted[0][1] / total) * 100) / 100, authors: sorted.length, commits: total };
    })
    .filter((o) => o.commits >= 5)
    .sort((x, y) => y.share - x.share || y.commits - x.commits);

  // tendência: commits por semana nas últimas 26
  const weeks = Array<number>(26).fill(0);
  for (const c of log) {
    const w = Math.floor((Date.now() - c.at) / (7 * DAY));
    if (w >= 0 && w < 26) weeks[25 - w]++;
  }

  // acoplamento escondido: arquivos de áreas diferentes que mudam juntos
  const pairCount: Record<string, number> = {};
  for (const c of log) {
    const files = [...new Set(c.files.filter((f) => isCode(f) && !TEST.test(f)))];
    if (files.length < 2 || files.length > 12) continue;
    for (let i = 0; i < files.length; i++) for (let j = i + 1; j < files.length; j++) if (area(files[i]) !== area(files[j])) pairCount[[files[i], files[j]].sort().join("\n")] = (pairCount[[files[i], files[j]].sort().join("\n")] ?? 0) + 1;
  }
  const coChange = Object.entries(pairCount)
    .map(([k, together]) => {
      const [a, b] = k.split("\n");
      return { a, b, together, ratio: Math.round((together / Math.min(changes[a] ?? together, changes[b] ?? together)) * 100) / 100 };
    })
    .filter((p) => p.together >= 3 && p.ratio >= 0.6 && existsSync(join(root, p.a)) && existsSync(join(root, p.b)))
    .sort((x, y) => y.together - x.together)
    .slice(0, 5);

  // entregas: reverts e hotfixes em 6 meses
  const recent = log.filter((c) => c.at >= Date.now() - 183 * DAY);
  const reverts = recent.filter((c) => /^revert\b|^Revert "/i.test(c.subject)).length;
  const hotfixes = recent.filter((c) => /\bhot-?fix\b/i.test(c.subject)).length;
  const delivery = { commits: recent.length, reverts, hotfixes, ratio: recent.length ? Math.round(((reverts + hotfixes) / recent.length) * 100) / 100 : 0 };

  // módulos sem teste: só faz sentido quando os testes ficam ao lado do código
  const code = repoFiles.filter(isCode);
  const tests = code.filter((f) => TEST.test(f));
  const colocated = tests.filter((f) => !/(^|\/)(__tests__|tests?|spec|e2e)\//i.test(f)).length;
  let untested: Signals["untested"] = [];
  if (tests.length >= 3 && colocated / tests.length >= 0.6) {
    const perArea: Record<string, { source: number; tests: number }> = {};
    for (const f of code) {
      const a = area(f);
      perArea[a] ??= { source: 0, tests: 0 };
      if (TEST.test(f)) perArea[a].tests++;
      else perArea[a].source++;
    }
    untested = Object.entries(perArea)
      .filter(([a, n]) => a !== "(raiz)" && n.tests === 0 && n.source >= 5)
      .map(([a, n]) => ({ area: a, source: n.source }))
      .sort((x, y) => y.source - x.source)
      .slice(0, 6);
  }

  const value: Signals = { quadrant, ownership, debtAge: debtAge(root), weeks, coChange, delivery, untested, drift: drift(root, repoFiles) };
  cache.set(root, { key, value });
  return value;
}

export interface Highlight {
  id: SignalId;
  /** 1 = vale olhar, 2 = merece atenção já. */
  severity: 1 | 2;
}

/** Os sinais que fogem do normal, do mais grave para o menos. A apresentação mostra os 3 primeiros. */
export function highlights(s: Signals): Highlight[] {
  const out: Highlight[] = [];
  const hot = s.quadrant.filter((q) => q.commits >= 6 && q.lines >= 250);
  if (hot.length) out.push({ id: "quadrant", severity: hot.some((q) => q.commits >= 10 && q.lines >= 400) ? 2 : 1 });
  const solo = s.ownership.filter((o) => o.share >= 0.8 && o.commits >= 10);
  // projeto de uma pessoa só: concentração é a regra, não um sinal
  if (solo.length && s.ownership.some((o) => o.authors > 1)) out.push({ id: "ownership", severity: solo.some((o) => o.share >= 0.9 && o.commits >= 20) ? 2 : 1 });
  if (s.debtAge && s.debtAge.dated >= 3 && s.debtAge.overYear > 0) out.push({ id: "debtAge", severity: s.debtAge.overYear / s.debtAge.dated >= 0.5 ? 2 : 1 });
  const last = s.weeks.slice(13).reduce((a, b) => a + b, 0);
  const before = s.weeks.slice(0, 13).reduce((a, b) => a + b, 0);
  if (before >= 10 && last <= before * 0.7) out.push({ id: "trend", severity: last <= before * 0.5 ? 2 : 1 });
  if (s.coChange.length) out.push({ id: "coChange", severity: s.coChange[0].together >= 6 ? 2 : 1 });
  if (s.delivery.commits >= 20 && s.delivery.ratio >= 0.07) out.push({ id: "delivery", severity: s.delivery.ratio >= 0.15 ? 2 : 1 });
  if (s.untested.length) out.push({ id: "untested", severity: s.untested.length >= 3 ? 2 : 1 });
  if (s.drift.length) out.push({ id: "drift", severity: s.drift.length >= 5 ? 2 : 1 });
  return out.sort((a, b) => b.severity - a.severity);
}
