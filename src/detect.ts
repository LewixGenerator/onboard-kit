import { existsSync, readFileSync } from "node:fs";
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
    pkg?.workspaces && "workspaces",
    deno?.workspace && "Deno workspace",
  ].filter(Boolean) as string[];

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
  };
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
