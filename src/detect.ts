import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Framework } from "./types";

/* ───────────────────────── frameworks ───────────────────────── */

export const FRAMEWORKS: { id: Framework; label: string }[] = [
  { id: "next", label: "Next.js" },
  { id: "nuxt", label: "Nuxt" },
  { id: "sveltekit", label: "SvelteKit" },
  { id: "astro", label: "Astro" },
  { id: "remix", label: "Remix / React Router" },
  { id: "gatsby", label: "Gatsby" },
  { id: "nest", label: "NestJS" },
  { id: "adonis", label: "AdonisJS" },
  { id: "express", label: "Express" },
  { id: "fastify", label: "Fastify" },
  { id: "koa", label: "Koa" },
  { id: "hono", label: "Hono" },
  { id: "elysia", label: "Elysia" },
  { id: "angular", label: "Angular" },
  { id: "vite", label: "Vite (React, Vue, Svelte, Solid, Preact, Qwik, Lit)" },
  { id: "cra", label: "Create React App" },
  { id: "webpack", label: "Webpack / Vue CLI" },
  { id: "react-native", label: "React Native / Expo" },
  { id: "electron", label: "Electron" },
  { id: "library", label: "Biblioteca / CLI" },
  { id: "node", label: "Node.js" },
];

export const FRAMEWORK_IDS = FRAMEWORKS.map((f) => f.id);

/** Ordem importa: metaframeworks antes dos servidores HTTP, e estes antes do bundler. */
const RULES: [Framework, string[]][] = [
  ["next", ["next"]],
  ["nuxt", ["nuxt", "nuxt3"]],
  ["sveltekit", ["@sveltejs/kit"]],
  ["astro", ["astro"]],
  ["remix", ["@remix-run/dev", "@remix-run/react", "@react-router/dev"]],
  ["gatsby", ["gatsby"]],
  ["nest", ["@nestjs/core"]],
  ["react-native", ["expo", "react-native"]],
  ["electron", ["electron"]],
  ["angular", ["@angular/core"]],
  ["adonis", ["@adonisjs/core"]],
  ["elysia", ["elysia"]],
  ["hono", ["hono", "@hono/node-server"]],
  ["fastify", ["fastify"]],
  ["koa", ["koa"]],
  ["express", ["express"]],
  ["vite", ["vite"]],
  ["cra", ["react-scripts"]],
  ["webpack", ["@vue/cli-service", "webpack-dev-server"]],
];

type Pkg = Record<string, any> | undefined;

/** Dependências do package.json e, em projetos Deno, os nomes do mapa de imports. */
export function dependencyNames(pkg: Pkg, deno?: Record<string, any>): Record<string, string> {
  const deps: Record<string, string> = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}), ...(pkg?.peerDependencies ?? {}) };
  for (const [name, spec] of Object.entries(deno?.imports ?? {})) {
    deps[name.replace(/\/$/, "")] = String(spec);
    // "jsr:@hono/hono@^4" → também registra "hono"
    const m = /^(?:jsr|npm):(@?[^@]+)/.exec(String(spec));
    if (m) deps[m[1].split("/").pop()!] = String(spec);
  }
  return deps;
}

export function detectFramework(pkg: Pkg, deno?: Record<string, any>): Framework {
  const deps = dependencyNames(pkg, deno);
  for (const [id, names] of RULES) if (names.some((n) => deps[n])) return id;
  if (pkg && (pkg.bin || ((pkg.exports || pkg.main || pkg.module) && !pkg.private))) return "library";
  return "node";
}

/* ───────────────────────── perfil do projeto ───────────────────────── */

export interface ProjectProfile {
  framework: Framework;
  frameworkLabel: string;
  /** Bibliotecas de interface: React, Vue, Svelte... */
  ui: string[];
  language: "TypeScript" | "JavaScript";
  /** Outras linguagens que compilam para JS e aparecem na configuração (ReScript, Elm...). */
  compileToJs: string[];
  runtime: "Node.js" | "Bun" | "Deno";
  packageManager?: string;
  moduleSystem: "ESM" | "CommonJS";
  monorepo?: string;
  /** Projetos dentro do repositório (pacotes do workspace ou pastas com package.json/deno.json próprio). */
  subprojects: Subproject[];
}

export interface Subproject {
  /** Nome do package.json (ou deno.json); sem nome, a pasta. */
  name: string;
  /** Caminho relativo à raiz, com "/". */
  path: string;
  framework: Framework;
  frameworkLabel: string;
  ui: string[];
  /** "app" roda sozinho (site, API, app mobile); "package" é consumido por outros (lib, config, CLI). */
  kind: "app" | "package";
  private: boolean;
  /** Outros subprojetos do repositório de que este depende (pelo name). */
  dependsOn: string[];
}

const UI_LIBS: [string, string[]][] = [
  ["React", ["react"]],
  ["Vue", ["vue"]],
  ["Svelte", ["svelte"]],
  ["Solid", ["solid-js"]],
  ["Preact", ["preact"]],
  ["Qwik", ["@builder.io/qwik", "@qwik.dev/core"]],
  ["Angular", ["@angular/core"]],
  ["Lit", ["lit"]],
  ["Ember", ["ember-source"]],
  ["Alpine.js", ["alpinejs"]],
  ["htmx", ["htmx.org"]],
  ["React Native", ["react-native"]],
];

/** Linguagens que compilam para JavaScript, reconhecidas pela dependência ou pelo arquivo de config. */
const COMPILE_TO_JS: [string, string[], string[]][] = [
  ["CoffeeScript", ["coffeescript", "coffee-script"], []],
  ["ReScript", ["rescript"], ["rescript.json", "bsconfig.json"]],
  ["Elm", ["elm"], ["elm.json"]],
  ["PureScript", ["purescript"], ["spago.yaml", "spago.dhall"]],
  ["ClojureScript", ["shadow-cljs"], ["shadow-cljs.edn"]],
  ["Civet", ["@danielx/civet"], []],
  ["Imba", ["imba"], []],
  ["Flow", ["flow-bin"], [".flowconfig"]],
];

function readJson(path: string): Record<string, any> | undefined {
  try {
    // deno.jsonc aceita comentários de linha
    return JSON.parse(readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, ""));
  } catch {
    return undefined;
  }
}

export function readProjectManifests(root: string): { pkg?: Record<string, any>; deno?: Record<string, any> } {
  return {
    pkg: readJson(join(root, "package.json")),
    deno: readJson(join(root, "deno.json")) ?? readJson(join(root, "deno.jsonc")),
  };
}

export function detectProject(root: string): ProjectProfile {
  const { pkg, deno } = readProjectManifests(root);
  const deps = dependencyNames(pkg, deno);
  const has = (file: string) => existsSync(join(root, file));
  const framework = detectFramework(pkg, deno);

  const lockfiles: [string, string][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
    ["deno.lock", "deno"],
  ];
  const packageManager = (typeof pkg?.packageManager === "string" ? pkg.packageManager.split("@")[0] : undefined) ?? lockfiles.find(([f]) => has(f))?.[1];

  const monorepoTools = [
    has("turbo.json") && "Turborepo",
    has("nx.json") && "Nx",
    has("lerna.json") && "Lerna",
    has("rush.json") && "Rush",
    has("pnpm-workspace.yaml") && "pnpm workspaces",
    pkg?.workspaces && `${packageManager === "yarn" ? "Yarn" : packageManager === "bun" ? "Bun" : "npm"} workspaces`,
    deno?.workspace && "Deno workspace",
  ].filter(Boolean) as string[];
  const subprojects = detectSubprojects(root);
  if (!monorepoTools.length && subprojects.length > 1) monorepoTools.push("vários projetos sem workspace");

  return {
    framework,
    frameworkLabel: FRAMEWORKS.find((f) => f.id === framework)!.label,
    ui: UI_LIBS.filter(([, names]) => names.some((n) => deps[n])).map(([label]) => label),
    language: has("tsconfig.json") || deps.typescript || deno ? "TypeScript" : "JavaScript",
    compileToJs: COMPILE_TO_JS.filter(([, names, files]) => names.some((n) => deps[n]) || files.some(has)).map(([label]) => label),
    runtime: deno && !pkg ? "Deno" : has("bun.lock") || has("bun.lockb") || has("bunfig.toml") || deps["@types/bun"] ? "Bun" : "Node.js",
    packageManager,
    moduleSystem: pkg?.type === "module" || (deno && !pkg) ? "ESM" : "CommonJS",
    monorepo: monorepoTools.length ? monorepoTools.join(", ") : undefined,
    subprojects,
  };
}

/* ───────────────────────── subprojetos ───────────────────────── */

/** Acha o subprojeto por pasta ou nome (como em --project apps/web ou --project web). */
export function findSubproject(subprojects: Subproject[], ref: string): Subproject | undefined {
  const clean = ref.replace(/^\.\//, "").replace(/\/+$/, "");
  return subprojects.find((s) => s.path === clean || s.name === clean);
}

/** Pastas que nunca são subprojetos (dependências, saídas de build, fixtures de teste). */
const NOT_PROJECT_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage", "vendor", "tmp", "fixtures", "__fixtures__", "__mocks__", "bower_components", "jspm_packages"]);
const MAX_SUBPROJECTS = 60;

function subdirs(root: string, dir: string): string[] {
  try {
    return readdirSync(join(root, dir), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !NOT_PROJECT_DIRS.has(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

const joinRel = (base: string, name: string) => (base ? `${base}/${name}` : name);

function globSegment(part: string): RegExp {
  const source = part
    .replace(/[.+^$()|[\]\\]/g, "\\$&")
    .replace(/\{([^}]*)\}/g, (_, alts: string) => `(${alts.split(",").join("|")})`)
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${source}$`);
}

/** Expande um padrão de workspace ("packages/*", "apps/**", "tools/cli") em pastas existentes. */
export function expandWorkspacePattern(root: string, pattern: string): string[] {
  const parts = pattern.trim().replace(/^\.\//, "").replace(/\/+$/, "").split("/").filter((p) => p && p !== ".");
  let current = [""];
  for (const part of parts) {
    const next: string[] = [];
    for (const base of current) {
      if (part === "**") {
        const walk = (dir: string, depth: number) => {
          next.push(dir);
          if (depth < 4) for (const d of subdirs(root, dir)) walk(joinRel(dir, d), depth + 1);
        };
        walk(base, 0);
      } else if (/[*?{]/.test(part)) {
        const re = globSegment(part);
        for (const d of subdirs(root, base)) if (re.test(d)) next.push(joinRel(base, d));
      } else if (existsSync(join(root, base, part))) {
        next.push(joinRel(base, part));
      }
    }
    current = [...new Set(next)];
  }
  return current.filter(Boolean);
}

function readYamlList(path: string, key: string): string[] {
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const items: string[] = [];
  let inside = false;
  for (const line of source.split(/\r?\n/)) {
    if (new RegExp(`^${key}:\\s*$`).test(line)) {
      inside = true;
    } else if (inside && /^\s*-\s*/.test(line)) {
      items.push(line.replace(/^\s*-\s*/, "").replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "").trim());
    } else if (inside && /^\S/.test(line)) {
      inside = false;
    }
  }
  return items.filter(Boolean);
}

/** Padrões de workspace declarados no repositório (package.json, pnpm, Lerna, Rush, Deno). */
export function workspacePatterns(root: string): string[] {
  const { pkg, deno } = readProjectManifests(root);
  const lerna = readJson(join(root, "lerna.json"));
  const rush = readJson(join(root, "rush.json"));
  const ws = pkg?.workspaces;
  return [
    ...(Array.isArray(ws) ? ws : Array.isArray(ws?.packages) ? ws.packages : []),
    ...readYamlList(join(root, "pnpm-workspace.yaml"), "packages"),
    ...(Array.isArray(lerna?.packages) ? lerna.packages : []),
    ...(Array.isArray(rush?.projects) ? rush.projects.map((p: { projectFolder?: string }) => p.projectFolder).filter(Boolean) : []),
    ...(Array.isArray(deno?.workspace) ? deno.workspace : []),
  ].filter((p): p is string => typeof p === "string" && p.trim() !== "");
}

const hasManifest = (root: string, dir: string) => ["package.json", "deno.json", "deno.jsonc"].some((f) => existsSync(join(root, dir, f)));

/** Sem workspace declarado: procura package.json/deno.json até dois níveis abaixo da raiz (ex.: frontend/ + backend/). */
function looseProjectDirs(root: string): string[] {
  const found: string[] = [];
  for (const first of subdirs(root, "")) {
    if (hasManifest(root, first)) {
      found.push(first);
      continue;
    }
    for (const second of subdirs(root, first)) if (hasManifest(root, joinRel(first, second))) found.push(joinRel(first, second));
  }
  return found;
}

/**
 * Subprojetos do repositório. Usa os workspaces declarados (npm/Yarn/Bun/pnpm, Lerna, Rush, Deno)
 * e, sem eles, as pastas com package.json/deno.json próprio. Repositório de um projeto só devolve [].
 */
export function detectSubprojects(root: string): Subproject[] {
  const patterns = workspacePatterns(root);
  let dirs: string[];
  if (patterns.length) {
    const excluded = new Set(patterns.filter((p) => p.startsWith("!")).flatMap((p) => expandWorkspacePattern(root, p.slice(1))));
    dirs = patterns.filter((p) => !p.startsWith("!")).flatMap((p) => expandWorkspacePattern(root, p));
    dirs = [...new Set(dirs)].filter((d) => !excluded.has(d) && hasManifest(root, d));
  } else {
    dirs = looseProjectDirs(root);
  }

  const projects = dirs.slice(0, MAX_SUBPROJECTS).map((path) => {
    const { pkg, deno } = readProjectManifests(join(root, path));
    const deps = dependencyNames(pkg, deno);
    const framework = detectFramework(pkg, deno);
    const runnable = Boolean(pkg?.scripts?.start || pkg?.scripts?.dev || deno?.tasks?.start || deno?.tasks?.dev);
    return {
      name: String(pkg?.name ?? deno?.name ?? path.split("/").pop()),
      path,
      framework,
      frameworkLabel: FRAMEWORKS.find((f) => f.id === framework)!.label,
      ui: UI_LIBS.filter(([, names]) => names.some((n) => deps[n])).map(([label]) => label),
      kind: framework === "library" || (framework === "node" && !runnable) ? "package" : "app",
      private: Boolean(pkg?.private),
      deps,
    } as Subproject & { deps: Record<string, string> };
  });

  const names = new Set(projects.map((p) => p.name));
  return projects.map(({ deps, ...p }) => ({ ...p, dependsOn: Object.keys(deps).filter((d) => d !== p.name && names.has(d)).sort() }));
}

/* ───────────────────────── linguagens por extensão ───────────────────────── */

export const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "TypeScript", ".mts": "TypeScript", ".cts": "TypeScript", ".tsx": "TSX",
  ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript", ".jsx": "JSX",
  ".vue": "Vue", ".svelte": "Svelte", ".astro": "Astro", ".mdx": "MDX", ".marko": "Marko",
  ".gjs": "Glimmer (Ember)", ".gts": "Glimmer (Ember)", ".hbs": "Handlebars", ".handlebars": "Handlebars",
  ".ejs": "EJS", ".pug": "Pug", ".njk": "Nunjucks", ".liquid": "Liquid",
  ".coffee": "CoffeeScript", ".res": "ReScript", ".resi": "ReScript", ".re": "Reason", ".rei": "Reason",
  ".elm": "Elm", ".purs": "PureScript", ".cljs": "ClojureScript", ".cljc": "ClojureScript",
  ".civet": "Civet", ".imba": "Imba",
  ".css": "CSS", ".scss": "SCSS", ".sass": "Sass", ".less": "Less", ".styl": "Stylus", ".pcss": "PostCSS",
  ".graphql": "GraphQL", ".gql": "GraphQL", ".prisma": "Prisma", ".sql": "SQL",
  ".py": "Python", ".go": "Go", ".rs": "Rust", ".rb": "Ruby", ".java": "Java", ".kt": "Kotlin",
  ".swift": "Swift", ".dart": "Dart", ".php": "PHP", ".cs": "C#",
};
