import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { dependencyNames, detectProject, detectSubprojects, LANGUAGE_BY_EXT, readProjectManifests, type ProjectProfile } from "./detect";

/* ───────────────────────── marcadores no código ───────────────────────── */

export const TODO_KINDS = ["TODO", "FIXME", "HACK", "XXX", "BUG"] as const;
export const NOTE_KINDS = ["NOTE", "IMPORTANT", "WARNING", "DEPRECATED"] as const;

export interface Marker {
  kind: string;
  text: string;
  /** caminho/relativo:linha */
  file: string;
}

export interface MarkerScan {
  counts: Record<string, number>;
  /** Quantos marcadores de TODO há em cada pasta de primeiro nível (ou em cada subprojeto, num monorepo). */
  byFolder: Record<string, number>;
  items: Marker[];
  scannedFiles: number;
  /** Linhas dos arquivos lidos (para a densidade de dívida técnica). */
  lines: number;
}

const CODE_EXT = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro", ".mdx", ".marko", ".gjs", ".gts",
  ".hbs", ".handlebars", ".ejs", ".pug", ".njk", ".liquid", ".coffee", ".res", ".resi", ".re", ".rei", ".elm", ".purs", ".cljs", ".cljc", ".civet", ".imba",
  ".styl", ".pcss",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".cs", ".php", ".swift", ".dart", ".scala", ".ex", ".exs",
  ".css", ".scss", ".sass", ".less", ".html", ".sql", ".prisma", ".graphql", ".gql",
  ".sh", ".yml", ".yaml", ".toml", ".tf",
]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".output", ".svelte-kit", ".astro", ".angular", ".expo", ".docusaurus", ".react-router", "storybook-static", "coverage", ".turbo", ".vercel", ".netlify", ".cache", "vendor", "generated", "__generated__", "tmp", "ios/Pods", "Pods"]);
const MAX_FILES = 4000;
const MAX_BYTES = 400_000;
/** Só conta o marcador quando ele está num comentário, em maiúsculas (evita "todo" em texto comum). */
const MARKER_RE = /(?:\/\/|\/\*|^\s*\*|#|<!--|--|\{\/\*)\s*(TODO|FIXME|HACK|XXX|BUG|NOTE|IMPORTANT|WARNING|WARN|@deprecated)\b(?:\([^)]*\))?[\s:\-\]]*(.*)$/;

/** Arquivos versionados (respeita o .gitignore); sem git, percorre as pastas. */
export function listRepoFiles(root: string): string[] {
  try {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).toString();
    const files = out.split("\0").filter(Boolean);
    if (files.length) return files;
  } catch {
    // sem git: cai na varredura manual
  }
  const found: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 8 || found.length >= MAX_FILES) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= MAX_FILES) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) walk(full, depth + 1);
      } else {
        found.push(relative(root, full).split(sep).join("/"));
      }
    }
  };
  walk(root, 0);
  return found;
}

function normalizeKind(kind: string): string {
  if (kind === "WARN") return "WARNING";
  if (kind === "@deprecated") return "DEPRECATED";
  return kind;
}

/** Agrupa arquivos pelo subprojeto que os contém; fora deles, pela pasta de primeiro nível. */
export function markerFolder(subprojects: { path: string }[]): (file: string) => string {
  const paths = subprojects.map((s) => s.path).sort((a, b) => b.length - a.length);
  return (file) => paths.find((p) => file.startsWith(`${p}/`)) ?? (file.includes("/") ? file.split("/")[0] : ".");
}

export function scanMarkers(root: string, files = listRepoFiles(root), folderOf = markerFolder([])): MarkerScan {
  const counts: Record<string, number> = {};
  const byFolder: Record<string, number> = {};
  const items: Marker[] = [];
  let scannedFiles = 0;
  let total = 0;
  for (const file of files) {
    if (scannedFiles >= MAX_FILES) break;
    if (!CODE_EXT.has(extname(file).toLowerCase()) || file.split("/").some((part) => SKIP_DIRS.has(part)) || /\.min\.|\.d\.ts$|lock\.ya?ml$/.test(file)) continue;
    let source: string;
    try {
      const full = join(root, file);
      if (statSync(full).size > MAX_BYTES) continue;
      source = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    scannedFiles++;
    const lines = source.split(/\r?\n/);
    total += lines.length;
    lines.forEach((line, i) => {
      const m = MARKER_RE.exec(line);
      if (!m) return;
      const kind = normalizeKind(m[1]);
      const text = m[2].replace(/\s*(\*\/|-->|\*\/\}).*$/, "").trim().slice(0, 180);
      counts[kind] = (counts[kind] ?? 0) + 1;
      if ((TODO_KINDS as readonly string[]).includes(kind)) {
        const folder = folderOf(file);
        byFolder[folder] = (byFolder[folder] ?? 0) + 1;
      }
      items.push({ kind, text, file: `${file}:${i + 1}` });
    });
  }
  return { counts, byFolder, items, scannedFiles, lines: total };
}

const markerCache = new Map<string, { at: number; scan: MarkerScan }>();
const MARKER_CACHE_MS = 30_000;

/** Varredura com cache curto, para a rota /onboarding não reler o repositório a cada clique. */
export function cachedMarkers(root: string): MarkerScan {
  const hit = markerCache.get(root);
  if (hit && Date.now() - hit.at < MARKER_CACHE_MS) return hit.scan;
  const scan = scanMarkers(root, listRepoFiles(root), markerFolder(detectSubprojects(root)));
  markerCache.set(root, { at: Date.now(), scan });
  return scan;
}

/* ───────────────────────── git ───────────────────────── */

export interface GitFacts {
  currentBranch?: string;
  defaultBranch?: string;
  branches: string[];
  /** Prefixos de branch e quantas branches usam cada um (feature/, fix/...). */
  branchPrefixes: Record<string, number>;
  recentCommits: string[];
  /** Fração dos commits recentes no formato Conventional Commits (0–1). */
  conventionalRatio: number;
  commitTypes: Record<string, number>;
  mergeCommits: number;
  tags: string[];
}

const CONVENTIONAL_RE = /^(feat|fix|chore|docs|refactor|test|tests|style|perf|ci|build|revert|release|hotfix)(\([^)]*\))?!?:\s.+/i;

export function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 * 1024 * 1024 }).toString().trim();
  } catch {
    return undefined;
  }
}

export function gitFacts(root: string): GitFacts | undefined {
  if (git(root, ["rev-parse", "--is-inside-work-tree"]) !== "true") return undefined;
  const lines = (out?: string) => (out ? out.split("\n").map((l) => l.trim()).filter(Boolean) : []);

  const branches = [
    ...new Set(
      lines(git(root, ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"]))
        .map((b) => b.replace(/^origin\//, ""))
        .filter((b) => b !== "HEAD" && b !== "origin"),
    ),
  ];
  const branchPrefixes: Record<string, number> = {};
  for (const b of branches) {
    if (b.includes("/")) {
      const prefix = `${b.split("/")[0]}/`;
      branchPrefixes[prefix] = (branchPrefixes[prefix] ?? 0) + 1;
    }
  }

  const recentCommits = lines(git(root, ["log", "-n", "60", "--no-merges", "--pretty=%s"]));
  const commitTypes: Record<string, number> = {};
  let conventional = 0;
  for (const subject of recentCommits) {
    const m = CONVENTIONAL_RE.exec(subject);
    if (m) {
      conventional++;
      const type = m[1].toLowerCase();
      commitTypes[type] = (commitTypes[type] ?? 0) + 1;
    }
  }

  return {
    currentBranch: git(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    defaultBranch: git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])?.replace(/^origin\//, ""),
    branches: branches.slice(0, 40),
    branchPrefixes,
    recentCommits: recentCommits.slice(0, 25),
    conventionalRatio: recentCommits.length ? Math.round((conventional / recentCommits.length) * 100) / 100 : 0,
    commitTypes,
    mergeCommits: lines(git(root, ["log", "-n", "300", "--merges", "--pretty=%h"])).length,
    tags: lines(git(root, ["tag", "--sort=-creatordate"])).slice(0, 10),
  };
}

/* ───────────────────────── arquivos que revelam o processo ───────────────────────── */

export interface RepoFacts {
  /** Subprojeto analisado (facts --project); vazio quando é o repositório inteiro. */
  scope?: string;
  /** Framework, UI, runtime, gerenciador de pacotes e linguagem detectados. */
  project: ProjectProfile;
  /** Linguagens do repositório por quantidade de arquivos, da mais usada para a menos. */
  languages: { name: string; files: number }[];
  git?: GitFacts;
  /** Arquivos de processo agrupados: CI, hooks, commitlint, templates de PR, docs... */
  files: Record<string, string[]>;
  tests: { testFiles: number; sourceFiles: number; frameworks: string[]; colocated: number; inTestFolders: number };
  /** Sinais de arquitetura: monorepo, vários serviços, Docker... */
  architectureSignals: string[];
  markers: MarkerScan;
  /** Só com facts --people: donos de código e quem mais fez commits em cada área. */
  people?: PeopleFacts;
  /** Saúde do projeto e integrações, calculadas sem IA (para a visão executiva). */
  health?: import("./health").Health;
  integrations?: import("./health").Integration[];
}

export interface PeopleFacts {
  codeowners: { pattern: string; owners: string[] }[];
  /** Área (subprojeto ou pasta de primeiro nível) → autores com mais commits no último ano. */
  areas: { area: string; authors: { name: string; commits: number }[] }[];
}

/** Donos de código (CODEOWNERS) e autores mais ativos por área. Sem e-mails. */
export function peopleFacts(root: string, areas: string[]): PeopleFacts {
  const codeowners: PeopleFacts["codeowners"] = [];
  for (const file of [".github/CODEOWNERS", "CODEOWNERS", "docs/CODEOWNERS"]) {
    let source: string;
    try {
      source = readFileSync(join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const line of source.split(/\r?\n/)) {
      const [pattern, ...owners] = line.replace(/#.*$/, "").trim().split(/\s+/);
      if (pattern && owners.length) codeowners.push({ pattern, owners: owners.filter((o) => !o.includes("@") || o.startsWith("@")) });
    }
    break;
  }
  const result: PeopleFacts["areas"] = [];
  for (const area of areas.slice(0, 20)) {
    const counts: Record<string, number> = {};
    for (const name of (git(root, ["log", "--since=12.months", "--no-merges", "--format=%aN", "--", area]) ?? "").split("\n")) {
      if (name.trim() && !/\[bot\]|^dependabot|^renovate/i.test(name)) counts[name.trim()] = (counts[name.trim()] ?? 0) + 1;
    }
    const authors = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, commits]) => ({ name, commits }));
    if (authors.length) result.push({ area, authors });
  }
  return { codeowners: codeowners.slice(0, 40), areas: result };
}

const FILE_GROUPS: [string, RegExp][] = [
  ["ci", /^(\.github\/workflows\/.+\.ya?ml|\.gitlab-ci\.yml|\.circleci\/config\.yml|azure-pipelines\.yml|bitbucket-pipelines\.yml|Jenkinsfile|\.drone\.yml|vercel\.json|netlify\.toml)$/i],
  ["hooks", /^(\.husky\/[^_][^/]*|\.lintstagedrc.*|lint-staged\.config\.[cm]?js|\.pre-commit-config\.yaml|lefthook\.ya?ml)$/i],
  ["commitRules", /^(commitlint\.config\.[cm]?[jt]s|release-please-config\.json|\.versionrc.*|\.commitlintrc.*|\.czrc|\.cz-config\.[cm]?js|release\.config\.[cm]?js|\.releaserc.*|\.changeset\/config\.json)$/i],
  ["pullRequests", /^(\.github\/(pull_request_template\.md|PULL_REQUEST_TEMPLATE\/.+)|\.github\/CODEOWNERS|CODEOWNERS|docs\/CODEOWNERS|\.gitlab\/merge_request_templates\/.+)$/i],
  ["docs", /^((README|CONTRIBUTING|CHANGELOG|ARCHITECTURE|SECURITY|CODE_OF_CONDUCT|DEVELOPMENT|SETUP)\.md|docs?\/.+\.mdx?|adrs?\/.+\.md|.+\/adr\/.+\.md|.+\/decisions\/.+\.md)$/i],
  ["lint", /^(\.oxlintrc\.json|deno\.jsonc?|\.eslintrc.*|eslint\.config\.[cm]?[jt]s|\.prettierrc.*|prettier\.config\.[cm]?js|biome\.jsonc?|\.editorconfig|\.stylelintrc.*)$/i],
  ["containers", /(^|\/)(Dockerfile[^/]*|docker-compose[^/]*\.ya?ml|compose\.ya?ml|k8s\/.+|helm\/.+|.+\.tf)$/i],
  ["deploy", /^(fly\.toml|render\.yaml|railway\.(json|toml)|wrangler\.(toml|jsonc?)|eas\.json|Procfile|app\.yaml|amplify\.yml|serverless\.(yml|ts)|electron-builder\.(ya?ml|json)|forge\.config\.[cm]?[jt]s|capacitor\.config\.[jt]s|sst\.config\.ts)$/i],
  ["monorepo", /^(pnpm-workspace\.yaml|turbo\.json|nx\.json|lerna\.json|rush\.json|\.moon\/workspace\.yml)$/i],
];
const TEST_FILE = /(\.|_)(test|spec|e2e-spec|cy)\.([cm]?[jt]sx?|coffee|res)$|(^|\/)(__tests__|tests?|e2e|cypress|playwright)\//i;
const SOURCE_FILE = /\.([cm]?[jt]sx?|vue|svelte|astro|marko|gjs|gts|coffee|res|elm|purs|cljs|civet|imba|py|go|rb|java|kt|cs|php|rs)$/i;
const TEST_FRAMEWORKS = [
  "jest", "vitest", "mocha", "ava", "tap", "uvu", "jasmine", "karma", "@web/test-runner",
  "@playwright/test", "cypress", "puppeteer", "@wdio/cli", "detox",
  "@testing-library/react", "@testing-library/vue", "@testing-library/svelte", "@testing-library/angular", "@testing-library/react-native",
  "@vue/test-utils", "@storybook/test", "supertest", "msw", "nock",
];
/** Libs que revelam como o sistema conversa por dentro e com o mundo. */
const ARCHITECTURE_DEPS: [string, string][] = [
  ["@nestjs/microservices", "NestJS microservices"], ["kafkajs", "Kafka"], ["amqplib", "RabbitMQ"], ["bullmq", "filas BullMQ"], ["bull", "filas Bull"],
  ["@aws-sdk/client-sqs", "AWS SQS"], ["nats", "NATS"], ["@temporalio/client", "Temporal"], ["inngest", "Inngest"], ["@trigger.dev/sdk", "Trigger.dev"],
  ["@grpc/grpc-js", "gRPC"], ["@apollo/federation", "GraphQL federation"], ["@apollo/subgraph", "GraphQL federation"], ["@trpc/server", "tRPC"],
  ["graphql", "GraphQL"], ["socket.io", "WebSockets (socket.io)"], ["ws", "WebSockets"], ["@module-federation/enhanced", "micro-frontends (Module Federation)"],
  ["single-spa", "micro-frontends (single-spa)"], ["xstate", "máquinas de estado (XState)"], ["effect", "Effect"], ["inversify", "injeção de dependência (Inversify)"],
  ["tsyringe", "injeção de dependência (tsyringe)"], ["awilix", "injeção de dependência (Awilix)"], ["@cloudflare/workers-types", "Cloudflare Workers"], ["wrangler", "Cloudflare Workers"],
];

export interface CollectOptions {
  /** Pasta de um subprojeto: código, testes, TODOs e perfil só dele (CI, hooks e git continuam do repositório). */
  project?: string;
  /** Inclui donos de código e autores por área (nomes de pessoas: só quando pedido). */
  people?: boolean;
}

export function collectFacts(root: string, options: CollectOptions = {}): RepoFacts {
  const allFiles = listRepoFiles(root);
  const scope = options.project?.replace(/^\.\//, "").replace(/\/+$/, "") || undefined;
  const prefix = scope ? `${scope}/` : "";
  const base = scope ? join(root, scope) : root;
  const files = scope ? allFiles.filter((f) => f.startsWith(prefix)) : allFiles;
  const groups: Record<string, string[]> = {};
  for (const [name, re] of FILE_GROUPS) {
    // processos (CI, hooks, PR) valem para o repositório todo; num subprojeto, os arquivos dele também entram
    const hits = [...new Set([...allFiles.filter((f) => re.test(f)), ...files.filter((f) => re.test(f.slice(prefix.length)))])].filter((f) => !f.split("/").some((p) => SKIP_DIRS.has(p)));
    if (hits.length) groups[name] = hits.slice(0, 25);
  }

  const manifests = readProjectManifests(base);
  const pkg = manifests.pkg ?? {};
  const deps = dependencyNames(manifests.pkg, manifests.deno);

  const languageCounts: Record<string, number> = {};
  for (const f of files) {
    const lang = LANGUAGE_BY_EXT[extname(f).toLowerCase()];
    if (lang && !f.split("/").some((p) => SKIP_DIRS.has(p)) && !/\.d\.[cm]?ts$|\.min\./.test(f)) languageCounts[lang] = (languageCounts[lang] ?? 0) + 1;
  }

  const code = files.filter((f) => SOURCE_FILE.test(f) && !f.split("/").some((p) => SKIP_DIRS.has(p)));
  const tests = code.filter((f) => TEST_FILE.test(f));
  const colocated = tests.filter((f) => /(\.|_)(test|spec)\./.test(f) && !/(^|\/)(__tests__|tests?|e2e)\//.test(f)).length;

  const signals: string[] = [];
  if (groups.monorepo || pkg.workspaces) signals.push(`monorepo (${[...(groups.monorepo ?? []), pkg.workspaces ? "package.json#workspaces" : ""].filter(Boolean).join(", ")})`);
  const dockerfiles = files.filter((f) => /(^|\/)Dockerfile[^/]*$/.test(f));
  if (dockerfiles.length > 1) signals.push(`${dockerfiles.length} Dockerfiles: ${dockerfiles.slice(0, 6).join(", ")} (possíveis serviços separados)`);
  const serviceDirs = [...new Set(files.map((f) => /^(apps|services|packages|microservices)\/([^/]+)\//.exec(f.slice(prefix.length))).filter(Boolean).map((m) => `${m![1]}/${m![2]}`))];
  if (serviceDirs.length) signals.push(`pastas de apps/serviços: ${serviceDirs.slice(0, 12).join(", ")}`);
  if (existsSync(join(base, "serverless.yml")) || existsSync(join(base, "serverless.ts"))) signals.push("serverless.yml (Serverless Framework)");
  const seen = new Set<string>();
  for (const [dep, label] of ARCHITECTURE_DEPS) {
    if (deps[dep] && !seen.has(label)) {
      seen.add(label);
      signals.push(`${label} (${dep})`);
    }
  }
  if (files.some((f) => /(^|\/)wrangler\.(toml|jsonc?)$/.test(f)) && !seen.has("Cloudflare Workers")) signals.push("Cloudflare Workers (wrangler)");
  const fnDirs = ["netlify/functions", "api", "functions", "supabase/functions", "amplify"].filter((dir) => files.some((f) => f.startsWith(`${prefix}${dir}/`)));
  if (fnDirs.length && (existsSync(join(base, "vercel.json")) || existsSync(join(base, "netlify.toml")) || fnDirs.some((d) => d !== "api"))) signals.push(`funções serverless: ${fnDirs.join(", ")}`);
  const layered = ["domain", "application", "infrastructure", "infra", "adapters", "ports", "use-cases", "usecases", "entities", "repositories", "controllers", "services"].filter((dir) =>
    files.some((f) => f.split("/").slice(0, -1).includes(dir)),
  );
  if (layered.length >= 2) signals.push(`pastas de camadas: ${layered.join(", ")}`);

  const project = detectProject(base);
  return {
    scope,
    project,
    languages: Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, files: count })),
    git: gitFacts(root),
    files: groups,
    tests: {
      testFiles: tests.length,
      sourceFiles: code.length - tests.length,
      frameworks: TEST_FRAMEWORKS.filter((f) => deps[f]),
      colocated,
      inTestFolders: tests.length - colocated,
    },
    architectureSignals: signals,
    markers: scanMarkers(root, files, markerFolder(scope ? [] : project.subprojects)),
    people: options.people
      ? peopleFacts(root, scope ? [scope] : project.subprojects.length ? project.subprojects.map((s) => s.path) : [...new Set(files.filter((f) => f.includes("/") && !f.startsWith(".")).map((f) => f.split("/")[0]))])
      : undefined,
  };
}
