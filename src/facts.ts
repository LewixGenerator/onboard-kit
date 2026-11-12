import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

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
  /** Quantos marcadores de TODO há em cada pasta de primeiro nível. */
  byFolder: Record<string, number>;
  items: Marker[];
  scannedFiles: number;
}

const CODE_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".cs", ".php", ".swift", ".dart", ".scala", ".ex", ".exs",
  ".css", ".scss", ".sass", ".less", ".html", ".sql", ".prisma", ".graphql", ".gql",
  ".sh", ".yml", ".yaml", ".toml", ".tf",
]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".output", ".svelte-kit", "coverage", ".turbo", ".vercel", ".cache", "vendor", "generated", "__generated__", "tmp"]);
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

export function scanMarkers(root: string, files = listRepoFiles(root)): MarkerScan {
  const counts: Record<string, number> = {};
  const byFolder: Record<string, number> = {};
  const items: Marker[] = [];
  let scannedFiles = 0;
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
    const lines = source.split("\n");
    lines.forEach((line, i) => {
      const m = MARKER_RE.exec(line);
      if (!m) return;
      const kind = normalizeKind(m[1]);
      const text = m[2].replace(/\s*(\*\/|-->|\*\/\}).*$/, "").trim().slice(0, 180);
      counts[kind] = (counts[kind] ?? 0) + 1;
      if ((TODO_KINDS as readonly string[]).includes(kind)) {
        const folder = file.includes("/") ? file.split("/")[0] : ".";
        byFolder[folder] = (byFolder[folder] ?? 0) + 1;
      }
      items.push({ kind, text, file: `${file}:${i + 1}` });
    });
  }
  return { counts, byFolder, items, scannedFiles };
}

const markerCache = new Map<string, { at: number; scan: MarkerScan }>();
const MARKER_CACHE_MS = 30_000;

/** Varredura com cache curto, para a rota /onboarding não reler o repositório a cada clique. */
export function cachedMarkers(root: string): MarkerScan {
  const hit = markerCache.get(root);
  if (hit && Date.now() - hit.at < MARKER_CACHE_MS) return hit.scan;
  const scan = scanMarkers(root);
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

function git(root: string, args: string[]): string | undefined {
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
  git?: GitFacts;
  /** Arquivos de processo agrupados: CI, hooks, commitlint, templates de PR, docs... */
  files: Record<string, string[]>;
  tests: { testFiles: number; sourceFiles: number; frameworks: string[]; colocated: number; inTestFolders: number };
  /** Sinais de arquitetura: monorepo, vários serviços, Docker... */
  architectureSignals: string[];
  markers: MarkerScan;
}

const FILE_GROUPS: [string, RegExp][] = [
  ["ci", /^(\.github\/workflows\/.+\.ya?ml|\.gitlab-ci\.yml|\.circleci\/config\.yml|azure-pipelines\.yml|bitbucket-pipelines\.yml|Jenkinsfile|\.drone\.yml|vercel\.json|netlify\.toml)$/i],
  ["hooks", /^(\.husky\/[^_][^/]*|\.lintstagedrc.*|lint-staged\.config\.[cm]?js|\.pre-commit-config\.yaml|lefthook\.ya?ml)$/i],
  ["commitRules", /^(commitlint\.config\.[cm]?[jt]s|\.commitlintrc.*|\.czrc|\.cz-config\.[cm]?js|release\.config\.[cm]?js|\.releaserc.*|\.changeset\/config\.json)$/i],
  ["pullRequests", /^(\.github\/(pull_request_template\.md|PULL_REQUEST_TEMPLATE\/.+)|\.github\/CODEOWNERS|CODEOWNERS|docs\/CODEOWNERS|\.gitlab\/merge_request_templates\/.+)$/i],
  ["docs", /^((README|CONTRIBUTING|CHANGELOG|ARCHITECTURE|SECURITY|CODE_OF_CONDUCT|DEVELOPMENT|SETUP)\.md|docs?\/.+\.mdx?|adrs?\/.+\.md|.+\/adr\/.+\.md|.+\/decisions\/.+\.md)$/i],
  ["lint", /^(\.eslintrc.*|eslint\.config\.[cm]?[jt]s|\.prettierrc.*|prettier\.config\.[cm]?js|biome\.jsonc?|\.editorconfig|\.stylelintrc.*)$/i],
  ["containers", /(^|\/)(Dockerfile[^/]*|docker-compose[^/]*\.ya?ml|compose\.ya?ml|k8s\/.+|helm\/.+|.+\.tf)$/i],
  ["monorepo", /^(pnpm-workspace\.yaml|turbo\.json|nx\.json|lerna\.json|rush\.json)$/i],
];
const TEST_FILE = /(\.|_)(test|spec)\.[cm]?[jt]sx?$|(^|\/)(__tests__|tests?|e2e|cypress|playwright)\//i;
const SOURCE_FILE = /\.([cm]?[jt]sx?|py|go|rb|java|kt|cs|php|rs|vue|svelte)$/i;
const TEST_FRAMEWORKS = ["jest", "vitest", "mocha", "ava", "@playwright/test", "cypress", "@testing-library/react", "supertest", "jasmine", "karma"];

export function collectFacts(root: string): RepoFacts {
  const files = listRepoFiles(root);
  const groups: Record<string, string[]> = {};
  for (const [name, re] of FILE_GROUPS) {
    const hits = files.filter((f) => re.test(f) && !f.split("/").some((p) => SKIP_DIRS.has(p)));
    if (hits.length) groups[name] = hits.slice(0, 25);
  }

  let pkg: Record<string, any> = {};
  try {
    pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  } catch {
    // projeto sem package.json
  }
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  const code = files.filter((f) => SOURCE_FILE.test(f) && !f.split("/").some((p) => SKIP_DIRS.has(p)));
  const tests = code.filter((f) => TEST_FILE.test(f));
  const colocated = tests.filter((f) => /(\.|_)(test|spec)\./.test(f) && !/(^|\/)(__tests__|tests?|e2e)\//.test(f)).length;

  const signals: string[] = [];
  if (groups.monorepo || pkg.workspaces) signals.push(`monorepo (${[...(groups.monorepo ?? []), pkg.workspaces ? "package.json#workspaces" : ""].filter(Boolean).join(", ")})`);
  const dockerfiles = files.filter((f) => /(^|\/)Dockerfile[^/]*$/.test(f));
  if (dockerfiles.length > 1) signals.push(`${dockerfiles.length} Dockerfiles: ${dockerfiles.slice(0, 6).join(", ")} (possíveis serviços separados)`);
  const serviceDirs = [...new Set(files.map((f) => /^(apps|services|packages|microservices)\/([^/]+)\//.exec(f)).filter(Boolean).map((m) => `${m![1]}/${m![2]}`))];
  if (serviceDirs.length) signals.push(`pastas de apps/serviços: ${serviceDirs.slice(0, 12).join(", ")}`);
  if (existsSync(join(root, "serverless.yml")) || existsSync(join(root, "serverless.ts"))) signals.push("serverless.yml (Serverless Framework)");
  for (const [dep, label] of [["@nestjs/microservices", "NestJS microservices"], ["kafkajs", "Kafka"], ["amqplib", "RabbitMQ"], ["bullmq", "filas BullMQ"], ["@grpc/grpc-js", "gRPC"], ["@apollo/federation", "GraphQL federation"]] as const) {
    if (deps[dep]) signals.push(`${label} (${dep})`);
  }
  const layered = ["domain", "application", "infrastructure", "infra", "adapters", "ports", "use-cases", "usecases", "entities", "repositories", "controllers", "services"].filter((dir) =>
    files.some((f) => f.split("/").slice(0, -1).includes(dir)),
  );
  if (layered.length >= 2) signals.push(`pastas de camadas: ${layered.join(", ")}`);

  return {
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
    markers: scanMarkers(root, files),
  };
}
