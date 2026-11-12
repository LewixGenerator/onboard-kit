#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, relative } from "node:path";
import { createOnboardingHandler } from "../adapters/node";
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
  npx onboarding-kit validate   Confere o JSON preenchido (campos, evidências, segredos)
  npx onboarding-kit serve      Abre a apresentação em http://localhost:4321

${c.bold("Opções")}
  --file <caminho>           Arquivo de onboarding (padrão: onboarding.json)
  --framework <next|nest|node>  Força o framework em vez de detectar (init)
  --lang <idioma>            Idioma do conteúdo gerado (init, padrão: pt-BR)
  --no-route                 Não cria/edita a rota no projeto (init)
  --force                    Sobrescreve o onboarding.json existente (init)
  --port <porta>             Porta do serve (padrão: 4321)
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

function readPackageJson(root: string): Record<string, any> | undefined {
  const path = join(root, "package.json");
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

export function detectFramework(pkg: Record<string, any> | undefined): Framework {
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  if (deps.next) return "next";
  if (deps["@nestjs/core"]) return "nest";
  return "node";
}

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

const NODE_SNIPPET = `// Express
import { createOnboardingHandler } from "onboarding-kit/node";
app.get("/onboarding", createOnboardingHandler());

// http nativo
const onboarding = createOnboardingHandler();
if (req.url === "/onboarding") return onboarding(req, res);`;

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
  const pkg = readPackageJson(root);
  if (!pkg) {
    console.error(c.red("✗ Não encontrei package.json. Rode o comando na raiz do projeto."));
    return 1;
  }

  const forced = typeof flags.framework === "string" ? (flags.framework as Framework) : undefined;
  if (forced && !["next", "nest", "node"].includes(forced)) {
    console.error(c.red(`✗ Framework inválido: ${forced}. Use next, nest ou node.`));
    return 1;
  }
  const framework = forced ?? detectFramework(pkg);
  const language = typeof flags.lang === "string" ? flags.lang : "pt-BR";
  const file = resolveFile(typeof flags.file === "string" ? flags.file : undefined);
  const relFile = relative(root, file);
  const lines: string[] = [`Framework: ${c.bold(framework)}${forced ? "" : c.dim(" (detectado)")}`];

  if (existsSync(file) && !flags.force) {
    lines.push(`${c.dim("•")} ${relFile} já existe, mantive como está ${c.dim("(use --force para recriar)")}`);
  } else {
    writeFileSync(file, JSON.stringify(createTemplate({ framework, language }), null, 2) + "\n");
    lines.push(`${c.green("✓")} Criei ${c.bold(relFile)} com os campos em branco e as instruções para a IA`);
  }

  if (flags.route !== false && !flags["no-route"]) {
    if (framework === "next") lines.push(...setupNext(root));
    else if (framework === "nest") lines.push(...setupNest(root));
    else lines.push(`${c.dim("•")} Para servir em /onboarding no seu servidor:`, "", c.dim(NODE_SNIPPET));
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
