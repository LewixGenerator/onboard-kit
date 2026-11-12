#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, relative } from "node:path";
import { createOnboardingHandler } from "../adapters/node";
import { detectFramework, FRAMEWORK_IDS, FRAMEWORKS, readProjectManifests } from "../detect";
import { collectFacts, NOTE_KINDS, TODO_KINDS, type RepoFacts } from "../facts";
import { DEFAULT_FILE, loadOnboarding, resolveFile } from "../load";
import { aiPrompt, createTemplate } from "../template";
import type { Framework } from "../types";
import { validateOnboarding } from "../validate";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (open: number, close: number) => (s: string) => (useColor ? `\x1b[${open}m${s}\x1b[${close}m` : s);
const c = {
  bold: paint(1, 22),
  dim: paint(2, 22),
  green: paint(32, 39),
  yellow: paint(33, 39),
  red: paint(31, 39),
  cyan: paint(36, 39),
};

const HELP = `
${c.bold("onboarding-kit")} — onboarding do projeto gerado pela sua IA local

${c.bold("Uso")}
  npx onboarding-kit init       Cria o onboarding.json em branco e a rota /onboarding
  npx onboarding-kit prompt     Mostra o texto para enviar à sua IA
  npx onboarding-kit facts      Fatos do git e do código para a IA (branches, commits, CI, testes, TODOs)
  npx onboarding-kit validate   Confere o JSON preenchido (campos, evidências, segredos)
  npx onboarding-kit serve      Abre a apresentação em http://localhost:4321

${c.bold("Opções")}
  --file <caminho>           Arquivo de onboarding (padrão: onboarding.json)
  --framework <id>           Força o framework em vez de detectar (init). Veja a lista abaixo
  --lang <idioma>            Idioma do conteúdo gerado (init, padrão: pt-BR)
  --no-route                 Não cria/edita a rota no projeto (init)
  --force                    Sobrescreve o onboarding.json existente (init)
  --port <porta>             Porta do serve (padrão: 4321)
  --json                     Saída em JSON (facts)

${c.bold("Frameworks")}
  ${FRAMEWORK_IDS.join(", ")}
`;

interface Args {
  command?: string;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | boolean> = {};
  let command: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=", 2);
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[key] = argv[++i];
      else flags[key] = true;
    } else if (arg === "-h") {
      flags.help = true;
    } else if (!command) {
      command = arg;
    }
  }
  return { command, flags };
}

export { detectFramework };

function gitHead(cwd: string): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return undefined;
  }
}

const NEXT_ROUTE = `import { createOnboardingRoute } from "onboarding-kit/next";

// Criado pelo onboarding-kit. Mostra a apresentação do projeto em /onboarding.
// Fica desligada em produção; para ligar: createOnboardingRoute({ enabled: true }).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createOnboardingRoute();
`;

const NEXT_PAGES_SNIPPET = `// pages/api/onboarding.ts
import { createOnboardingApiHandler } from "onboarding-kit/next";
export default createOnboardingApiHandler();

// next.config: para servir em /onboarding
async rewrites() { return [{ source: "/onboarding", destination: "/api/onboarding" }]; }`;

const NEST_SNIPPET = `// src/app.module.ts
import { OnboardingModule } from "onboarding-kit/nest";

@Module({
  imports: [OnboardingModule.register(), /* ...seus módulos */],
})`;

const NODE_SNIPPET = `// http nativo
import { createOnboardingHandler } from "onboarding-kit/node";
const onboarding = createOnboardingHandler();
if (req.url === "/onboarding") return onboarding(req, res);`;

const ROUTE_FILES: Partial<Record<Framework, { file: (ext: string) => string; source: string }>> = {
  nuxt: {
    file: (ext) => `server/routes/onboarding.get.${ext}`,
    source: `import { createOnboardingFetchHandler } from "onboarding-kit/fetch";

// Criado pelo onboarding-kit. Mostra a apresentação do projeto em /onboarding.
// Fica desligada em produção; para ligar: createOnboardingFetchHandler({ enabled: true }).
const onboarding = createOnboardingFetchHandler();
export default defineEventHandler(() => onboarding());
`,
  },
  sveltekit: {
    file: (ext) => `src/routes/onboarding/+server.${ext}`,
    source: `import { createOnboardingFetchHandler } from "onboarding-kit/fetch";

// Criado pelo onboarding-kit. Mostra a apresentação do projeto em /onboarding.
// Fica desligada em produção; para ligar: createOnboardingFetchHandler({ enabled: true }).
export const GET = createOnboardingFetchHandler();
`,
  },
  cra: {
    file: () => "src/setupProxy.js",
    source: `// Criado pelo onboarding-kit. Mostra a apresentação do projeto em /onboarding (só no npm start).
const { createOnboardingHandler } = require("onboarding-kit/node");

module.exports = function (app) {
  app.get("/onboarding", createOnboardingHandler());
};
`,
  },
};

const SNIPPETS: Partial<Record<Framework, string>> = {
  express: `import { createOnboardingHandler } from "onboarding-kit/express";
app.get("/onboarding", createOnboardingHandler());`,
  fastify: `import { fastifyOnboarding } from "onboarding-kit/fastify";
app.register(fastifyOnboarding);`,
  koa: `import { createOnboardingMiddleware } from "onboarding-kit/koa";
app.use(createOnboardingMiddleware());`,
  hono: `import { createOnboardingFetchHandler } from "onboarding-kit/fetch";
const onboarding = createOnboardingFetchHandler();
app.get("/onboarding", () => onboarding());`,
  elysia: `import { createOnboardingFetchHandler } from "onboarding-kit/fetch";
const onboarding = createOnboardingFetchHandler();
app.get("/onboarding", () => onboarding());`,
  adonis: `// start/routes.ts
import { createOnboardingFetchHandler } from "onboarding-kit/fetch";
const onboarding = createOnboardingFetchHandler();
router.get("/onboarding", async ({ response }) => {
  const page = await onboarding();
  response.status(page.status).header("Content-Type", "text/html; charset=utf-8");
  return page.text();
});`,
  astro: `// astro.config.mjs
import { onboarding } from "onboarding-kit/vite";
export default defineConfig({ vite: { plugins: [onboarding()] } });`,
  gatsby: `// gatsby-node.js
const { createOnboardingHandler } = require("onboarding-kit/node");
exports.onCreateDevServer = ({ app }) => app.get("/onboarding", createOnboardingHandler());`,
  webpack: `// webpack.config.js ou vue.config.js
const { createOnboardingHandler } = require("onboarding-kit/node");
devServer: {
  setupMiddlewares(middlewares, devServer) {
    devServer.app.get("/onboarding", createOnboardingHandler());
    return middlewares;
  },
}`,
  remix: `// app/routes/onboarding.ts
import { createOnboardingFetchHandler } from "onboarding-kit/fetch";
export const loader = createOnboardingFetchHandler();`,
  vite: `// vite.config.ts
import { onboarding } from "onboarding-kit/vite";
export default defineConfig({ plugins: [onboarding()] });`,
  node: NODE_SNIPPET,
};

const VITE_CONFIGS = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs", "vite.config.cjs"];

function setupNext(root: string): string[] {
  const appDir = ["src/app", "app"].find((dir) => existsSync(join(root, dir)));
  if (!appDir) {
    return [`${c.yellow("!")} Não encontrei a pasta app/ (App Router). Para o Pages Router, adicione:`, "", c.dim(NEXT_PAGES_SNIPPET)];
  }
  const ext = existsSync(join(root, "tsconfig.json")) ? "ts" : "js";
  const routeFile = join(root, appDir, "onboarding", `route.${ext}`);
  const rel = relative(root, routeFile);
  if (existsSync(routeFile)) return [`${c.dim("•")} ${rel} já existe, mantive como está`];
  mkdirSync(dirname(routeFile), { recursive: true });
  writeFileSync(routeFile, NEXT_ROUTE);
  return [`${c.green("✓")} Criei ${c.bold(rel)} (rota /onboarding)`];
}

/** Adiciona o OnboardingModule ao app.module.ts quando dá para fazer isso com segurança. */
export function patchNestAppModule(source: string): string | undefined {
  if (source.includes("OnboardingModule")) return source;
  const matches = source.match(/imports\s*:\s*\[/g);
  if (!matches || matches.length !== 1) return undefined;
  const withImport = source.replace(/imports\s*:\s*\[(\s*\])?/, (m, empty?: string) =>
    empty ? m.replace(/\[\s*\]$/, "[OnboardingModule.register()]") : `${m}OnboardingModule.register(), `,
  );
  return `import { OnboardingModule } from "onboarding-kit/nest";\n${withImport}`;
}

/** Adiciona o plugin onboarding() ao vite.config quando dá para fazer isso com segurança. */
export function patchViteConfig(source: string): string | undefined {
  if (source.includes("onboarding-kit/vite")) return source;
  const cjs = !/^\s*import\s/m.test(source) && /require\(/.test(source);
  const importLine = cjs ? `const { onboarding } = require("onboarding-kit/vite");` : `import { onboarding } from "onboarding-kit/vite";`;
  const plugins = source.match(/plugins\s*:\s*\[/g);
  let patched: string | undefined;
  if (plugins?.length === 1) {
    patched = source.replace(/plugins\s*:\s*\[/, (m) => `${m}onboarding(), `).replace(/onboarding\(\), (\s*\])/, "onboarding()$1");
  } else if (!plugins && (source.match(/defineConfig\(\s*\{/g) ?? []).length === 1) {
    patched = source.replace(/defineConfig\(\s*\{/, (m) => `${m}\n  plugins: [onboarding()],`);
  }
  return patched && `${importLine}\n${patched}`;
}

function setupVite(root: string, framework: Framework): string[] {
  const config = VITE_CONFIGS.find((f) => existsSync(join(root, f)));
  if (config) {
    const source = readFileSync(join(root, config), "utf8");
    const patched = patchViteConfig(source);
    if (patched === source) return [`${c.dim("•")} ${config} já usa o plugin do onboarding-kit`];
    if (patched) {
      writeFileSync(join(root, config), patched);
      return [`${c.green("✓")} Adicionei ${c.bold("onboarding()")} aos plugins do ${config} (rota /onboarding no vite dev)`];
    }
  }
  return [`${c.yellow("!")} Não consegui editar o ${config ?? "vite.config"} sozinho. Adicione:`, "", c.dim(SNIPPETS[framework] ?? SNIPPETS.vite!)];
}

function createRouteFile(root: string, framework: Framework): string[] {
  const route = ROUTE_FILES[framework]!;
  const ext = existsSync(join(root, "tsconfig.json")) ? "ts" : "js";
  const rel = route.file(ext);
  if (existsSync(join(root, rel))) {
    return [`${c.yellow("!")} ${rel} já existe. Para servir em /onboarding, use:`, "", c.dim(framework === "cra" ? `app.get("/onboarding", require("onboarding-kit/node").createOnboardingHandler());` : route.source)];
  }
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), route.source);
  return [`${c.green("✓")} Criei ${c.bold(rel)} (rota /onboarding)`];
}

/** Para projetos sem servidor web próprio (mobile, desktop, bibliotecas): `npm run onboarding`. */
function addServeScript(root: string): string[] {
  const path = join(root, "package.json");
  if (!existsSync(path)) return [`${c.dim("•")} Para ver a apresentação: ${c.bold("deno run -A npm:onboarding-kit serve")}`];
  const raw = readFileSync(path, "utf8");
  const pkg = JSON.parse(raw);
  if (pkg.scripts?.onboarding) return [`${c.dim("•")} O script ${c.bold("onboarding")} já existe no package.json`];
  pkg.scripts = { ...(pkg.scripts ?? {}), onboarding: "onboarding-kit serve" };
  const indent = /^(\s+)"/m.exec(raw)?.[1] ?? "  ";
  writeFileSync(path, JSON.stringify(pkg, null, indent) + (raw.endsWith("\n") ? "\n" : ""));
  return [`${c.green("✓")} Adicionei o script ${c.bold("npm run onboarding")} (abre a apresentação em http://localhost:4321)`];
}

export function setupRoute(root: string, framework: Framework): string[] {
  switch (framework) {
    case "next":
      return setupNext(root);
    case "nest":
      return setupNest(root);
    case "nuxt":
    case "sveltekit":
    case "cra":
      return createRouteFile(root, framework);
    case "vite":
      return setupVite(root, framework);
    case "remix":
      return VITE_CONFIGS.some((f) => existsSync(join(root, f))) ? setupVite(root, framework) : [`${c.dim("•")} Para servir em /onboarding:`, "", c.dim(SNIPPETS.remix!)];
    case "angular":
    case "react-native":
    case "electron":
    case "library":
      return addServeScript(root);
    default: {
      const snippet = SNIPPETS[framework] ?? NODE_SNIPPET;
      return [`${c.dim("•")} Para servir em /onboarding no seu servidor:`, "", c.dim(snippet)];
    }
  }
}

function setupNest(root: string): string[] {
  const file = join(root, "src", "app.module.ts");
  if (existsSync(file)) {
    const source = readFileSync(file, "utf8");
    const patched = patchNestAppModule(source);
    if (patched === source) return [`${c.dim("•")} src/app.module.ts já importa o OnboardingModule`];
    if (patched) {
      writeFileSync(file, patched);
      return [`${c.green("✓")} Adicionei ${c.bold("OnboardingModule.register()")} em src/app.module.ts (rota /onboarding)`];
    }
  }
  return [`${c.yellow("!")} Não consegui editar o app.module.ts sozinho. Adicione:`, "", c.dim(NEST_SNIPPET)];
}

function cmdInit(flags: Args["flags"]): number {
  const root = process.cwd();
  const { pkg, deno } = readProjectManifests(root);
  if (!pkg && !deno) {
    console.error(c.red("✗ Não encontrei package.json nem deno.json. Rode o comando na raiz do projeto."));
    return 1;
  }

  const forced = typeof flags.framework === "string" ? (flags.framework as Framework) : undefined;
  if (forced && !FRAMEWORK_IDS.includes(forced)) {
    console.error(c.red(`✗ Framework inválido: ${forced}. Use um destes: ${FRAMEWORK_IDS.join(", ")}.`));
    return 1;
  }
  const framework = forced ?? detectFramework(pkg, deno);
  const label = FRAMEWORKS.find((f) => f.id === framework)!.label;
  const language = typeof flags.lang === "string" ? flags.lang : "pt-BR";
  const file = resolveFile(typeof flags.file === "string" ? flags.file : undefined);
  const relFile = relative(root, file);
  const lines: string[] = [`Framework: ${c.bold(label)}${forced ? "" : c.dim(" (detectado)")}`];

  if (existsSync(file) && !flags.force) {
    lines.push(`${c.dim("•")} ${relFile} já existe, mantive como está ${c.dim("(use --force para recriar)")}`);
  } else {
    writeFileSync(file, JSON.stringify(createTemplate({ framework, language }), null, 2) + "\n");
    lines.push(`${c.green("✓")} Criei ${c.bold(relFile)} com os campos em branco e as instruções para a IA`);
  }

  if (flags.route !== false && !flags["no-route"]) {
    lines.push(...setupRoute(root, framework));
  }

  const prompt = aiPrompt(relFile);
  console.log(`
${lines.join("\n")}

${c.bold("Próximo passo:")} envie para a IA que você usa neste projeto (Claude Code, Cursor, Copilot…):

  ${c.cyan(prompt)}

Depois rode ${c.bold("npx onboarding-kit validate")} e acesse ${c.bold("/onboarding")} no app em dev (ou ${c.bold("npx onboarding-kit serve")}).
`);
  return 0;
}

async function cmdValidate(flags: Args["flags"]): Promise<number> {
  const result = await loadOnboarding(typeof flags.file === "string" ? flags.file : undefined);
  if (!result.ok) {
    console.error(c.red(`✗ ${result.message}`));
    if (result.reason === "missing") console.error(`  Rode ${c.bold("npx onboarding-kit init")} primeiro.`);
    return 1;
  }
  const root = dirname(result.file);
  const issues = validateOnboarding(result.data, { root, headCommit: gitHead(root) });
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  for (const issue of [...errors, ...warnings]) {
    const mark = issue.level === "error" ? c.red("✗") : c.yellow("!");
    console.log(`${mark} ${c.bold(issue.path || "(raiz)")} ${issue.message}`);
  }
  if (errors.length) {
    console.log(`\n${c.red(`${errors.length} erro(s)`)}, ${warnings.length} aviso(s). Peça à IA para corrigir e rode de novo.`);
    return 1;
  }
  console.log(`${issues.length ? "\n" : ""}${c.green("✓")} ${relative(process.cwd(), result.file)} válido${warnings.length ? ` com ${warnings.length} aviso(s)` : ""}.`);
  return 0;
}

function cmdServe(flags: Args["flags"]): Promise<number> {
  const port = Number(flags.port ?? 4321);
  const handler = createOnboardingHandler({ file: typeof flags.file === "string" ? flags.file : undefined, enabled: true });
  const server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (path === "/" || path === "/onboarding") return void handler(req, res);
    res.writeHead(302, { Location: "/" });
    res.end();
  });
  return new Promise((resolvePromise) => {
    server.on("error", (err: NodeJS.ErrnoException) => {
      console.error(c.red(`✗ ${err.code === "EADDRINUSE" ? `A porta ${port} está em uso. Use --port.` : err.message}`));
      resolvePromise(1);
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`${c.green("✓")} Onboarding em ${c.bold(`http://localhost:${port}`)} ${c.dim("(Ctrl+C para sair)")}`);
    });
  });
}

export function formatFacts(f: RepoFacts): string {
  const out: string[] = [];
  const section = (title: string) => out.push("", c.bold(`## ${title}`));
  const list = (items: string[]) => items.forEach((i) => out.push(`  - ${i}`));
  const counts = (obj: Record<string, number>) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");

  section("Projeto");
  const p = f.project;
  out.push(`  framework: ${p.frameworkLabel}${p.ui.length ? ` · UI: ${p.ui.join(", ")}` : ""}`);
  out.push(`  ${p.language}${p.compileToJs.length ? ` + ${p.compileToJs.join(", ")}` : ""} · ${p.moduleSystem} · ${p.runtime}${p.packageManager ? ` · ${p.packageManager}` : ""}${p.monorepo ? ` · monorepo: ${p.monorepo}` : ""}`);
  if (f.languages.length) {
    const total = f.languages.reduce((sum, l) => sum + l.files, 0);
    out.push(`  linguagens: ${f.languages.map((l) => `${l.name} ${Math.round((l.files / total) * 100)}%`).join(", ")}`);
  }

  section("Git");
  if (!f.git) out.push("  (não é um repositório git)");
  else {
    const g = f.git;
    out.push(`  branch atual: ${g.currentBranch ?? "?"} · branch padrão: ${g.defaultBranch ?? "(sem origin/HEAD)"}`);
    out.push(`  branches (${g.branches.length}): ${g.branches.join(", ") || "-"}`);
    if (Object.keys(g.branchPrefixes).length) out.push(`  prefixos: ${counts(g.branchPrefixes)}`);
    out.push(`  commits recentes no formato Conventional Commits: ${Math.round(g.conventionalRatio * 100)}%${Object.keys(g.commitTypes).length ? ` (${counts(g.commitTypes)})` : ""}`);
    out.push(`  merge commits nos últimos 300: ${g.mergeCommits}${g.mergeCommits === 0 && g.recentCommits.length >= 20 ? " (indica squash/rebase)" : ""}`);
    if (g.tags.length) out.push(`  tags recentes: ${g.tags.join(", ")}`);
    out.push("  últimos commits:");
    g.recentCommits.forEach((m) => out.push(`    ${c.dim("•")} ${m}`));
  }

  section("Arquivos de processo");
  const labels: Record<string, string> = { ci: "CI/CD", hooks: "Git hooks", commitRules: "Regras de commit/release", pullRequests: "PRs e donos de código", docs: "Documentação", lint: "Lint e formatação", containers: "Containers e infra", deploy: "Deploy e empacotamento", monorepo: "Monorepo" };
  const groups = Object.entries(f.files);
  if (!groups.length) out.push("  (nenhum encontrado)");
  for (const [key, files] of groups) out.push(`  ${labels[key] ?? key}: ${files.join(", ")}`);

  section("Testes");
  const t = f.tests;
  out.push(`  ${t.testFiles} arquivos de teste para ${t.sourceFiles} de código${t.frameworks.length ? ` · ${t.frameworks.join(", ")}` : ""}`);
  out.push(`  ${t.colocated} ao lado do código, ${t.inTestFolders} em pastas de teste`);

  section("Sinais de arquitetura");
  list(f.architectureSignals.length ? f.architectureSignals : ["(nenhum sinal forte: provavelmente um app único)"]);

  section("Marcadores no código");
  const m = f.markers;
  out.push(`  ${m.scannedFiles} arquivos lidos · ${counts(m.counts) || "nenhum marcador"}`);
  if (Object.keys(m.byFolder).length) out.push(`  TODOs por pasta: ${counts(m.byFolder)}`);
  const show = (kinds: readonly string[], title: string) => {
    const items = m.items.filter((i) => kinds.includes(i.kind));
    if (!items.length) return;
    out.push(`  ${title}:`);
    items.slice(0, 60).forEach((i) => out.push(`    ${c.dim("•")} [${i.kind}] ${i.file} ${i.text}`));
    if (items.length > 60) out.push(`    … e mais ${items.length - 60}`);
  };
  show(TODO_KINDS, "TODO/FIXME/HACK");
  show(NOTE_KINDS, "Observações (NOTE/IMPORTANT/WARNING/@deprecated)");
  return out.join("\n").trimStart();
}

async function main(): Promise<number> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (flags["no-route"]) flags.route = false;
  if (!command || flags.help || command === "help") {
    console.log(HELP);
    return 0;
  }
  switch (command) {
    case "init":
      return cmdInit(flags);
    case "validate":
      return cmdValidate(flags);
    case "serve":
      return cmdServe(flags);
    case "facts": {
      const facts = collectFacts(process.cwd());
      console.log(flags.json ? JSON.stringify(facts, null, 2) : formatFacts(facts));
      return 0;
    }
    case "prompt":
      console.log(aiPrompt(typeof flags.file === "string" ? flags.file : DEFAULT_FILE));
      return 0;
    default:
      console.error(c.red(`✗ Comando desconhecido: ${command}`));
      console.log(HELP);
      return 1;
  }
}

if (require.main === module) {
  main().then((code) => {
    if (code !== 0) process.exitCode = code;
  });
}
