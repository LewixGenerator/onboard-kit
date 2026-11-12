const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");
const http = require("node:http");

const kit = require("../dist/index.js");
const { createOnboardingHandler } = require("../dist/adapters/node.js");
const { createOnboardingRoute } = require("../dist/adapters/next.js");
const cli = require("../dist/cli/index.js");

const CLI = join(__dirname, "..", "dist", "cli", "index.js");

function tmpProject(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "onboarding-kit-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function filledData() {
  const data = kit.createTemplate({ framework: "node" });
  data.meta = { ...data.meta, status: "filled", generatedAt: "2026-11-11T10:00:00Z", generatedBy: "test", commit: "abc1234" };
  data.project = { name: "Loja", tagline: "E-commerce", purpose: "Vender coisas", audience: "Clientes", status: "Em produção", repoUrl: "https://github.com/acme/loja" };
  data.business = {
    model: "Comissão por venda",
    valueProposition: "Lojistas vendem online sem montar loja própria",
    actors: [{ name: "Lojista", description: "Cadastra produtos", evidence: ["src/index.js"] }],
    flows: [{ name: "Compra", steps: ["Escolhe", "Paga", "Recebe"], evidence: [] }],
  };
  data.gettingStarted = { prerequisites: ["Node 20"], setup: ["npm install"], commands: [{ name: "dev", command: "npm run dev", description: "Sobe o app" }], envVars: [] };
  data.stack = [{ name: "Express", category: "framework", version: "4.19.0", why: "HTTP", evidence: ["package.json"] }];
  data.architecture = { summary: "Monólito", diagram: "graph TD\n  A-->B", modules: [{ name: "Pedidos", path: "src/orders", responsibility: "Pedidos" }] };
  data.conventions = [{ title: "Services", description: "Regra fica no service", example: "", evidence: ["src/index.js:2"] }];
  data.domain = { glossary: [{ term: "SKU", definition: "Código do produto" }, { term: "Carrinho", definition: "Itens antes da compra" }, { term: "Lojista", definition: "Quem vende" }], businessRules: [{ title: "Frete grátis", description: "Acima de R$ 200", evidence: ["src/index.js"] }] };
  data.features = [{ name: "Checkout", description: "Finaliza compra", entryPoints: ["src/index.js"], status: "estável" }];
  data.tours = [{ title: "Requisição", description: "", steps: [{ file: "src/index.js:1", explanation: "Entrada" }] }];
  data.gotchas = [];
  data.decisions = [];
  data.firstTasks = [{ title: "Adicionar teste", description: "Cobrir o frete", files: ["src/index.js"] }];
  data.architecture.style = "Monolito modular";
  data.architecture.patterns = [{ name: "Services", description: "Regra no service", evidence: ["src/index.js"] }];
  data.workflow = {
    branching: { model: "GitHub Flow", mainBranch: "main", description: "Branches curtas a partir da main.", branches: [{ pattern: "feat/<ticket>", purpose: "Funcionalidades" }], evidence: [] },
    commits: { convention: "Conventional Commits", format: "tipo(escopo): descrição", examples: ["feat(checkout): aceita pix"], enforcedBy: "commitlint", evidence: [] },
    pullRequests: { process: "1 aprovação e squash", checklist: ["Testes passando"], evidence: [] },
    release: { process: "Deploy no merge", environments: [{ name: "Produção", trigger: "merge na main", description: "" }], evidence: [] },
  };
  data.quality = { testing: { approach: "Unitários com node:test", location: "test/", command: "npm test", evidence: [] }, checks: [{ name: "CI", when: "PR", description: "Roda os testes", evidence: [] }] };
  data.docs = [{ title: "README", file: "src/index.js", why: "Visão geral" }];
  data.codeNotes = [{ title: "Não mexer no cálculo", description: "Usado pelo financeiro", file: "src/index.js:1", kind: "IMPORTANT" }];
  data.todos = [{ title: "Frete internacional", description: "Ainda não calcula", file: "src/index.js:2", kind: "TODO", impact: "Afeta pedidos de fora" }];
  return data;
}

const PROJECT_FILES = { "package.json": "{}", "src/index.js": "line1\n// TODO: frete internacional\nline3\n" };

test("template em branco começa pendente e com instruções", () => {
  const data = kit.createTemplate({ framework: "nest" });
  assert.equal(data.meta.status, "pending");
  assert.equal(data.meta.framework, "nest");
  assert.match(data._instructions.framework, /NestJS/);
  assert.ok(kit.isBlank(data.project));
  assert.ok(kit.isBlank(data.stack[0]));
});

test("validate aponta template não preenchido", () => {
  const issues = kit.validateOnboarding(kit.createTemplate({ framework: "node" }), { root: tmpProject() });
  const paths = issues.filter((i) => i.level === "error").map((i) => i.path);
  assert.ok(paths.includes("meta.status"));
  assert.ok(paths.includes("project.name"));
  assert.ok(paths.includes("stack[0]"));
});

test("validate aceita um arquivo preenchido com evidências reais", () => {
  const root = tmpProject(PROJECT_FILES);
  const issues = kit.validateOnboarding(filledData(), { root, headCommit: "abc1234ffff" });
  assert.deepEqual(issues.filter((i) => i.level === "error"), []);
});

test("validate detecta evidência inexistente, linha inválida, caminho fora do repo e segredo", () => {
  const root = tmpProject(PROJECT_FILES);
  const data = filledData();
  data.stack[0].evidence = ["nao-existe.ts"];
  data.conventions[0].evidence = ["src/index.js:99"];
  data.features[0].entryPoints = ["../fora.js"];
  data.project.purpose = "token ghp_abcdefghijklmnopqrstuvwxyz0123456789";
  const issues = kit.validateOnboarding(data, { root, headCommit: "def5678" });
  const msgs = issues.map((i) => `${i.level} ${i.path} ${i.message}`).join("\n");
  assert.match(msgs, /error stack\[0\]\.evidence\[0\] arquivo não existe/);
  assert.match(msgs, /warning conventions\[0\]\.evidence\[0\] linha 99/);
  assert.match(msgs, /error features\[0\]\.entryPoints\[0\] caminho fora/);
  assert.match(msgs, /token do GitHub/);
  assert.match(msgs, /warning meta\.commit .*atualizar/);
});

test("validate exige evidência em regras de negócio", () => {
  const data = filledData();
  data.domain.businessRules[0].evidence = [];
  const issues = kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) });
  assert.ok(issues.some((i) => i.level === "error" && i.path === "domain.businessRules[0].evidence"));
});

test("parseEvidence separa arquivo e linha", () => {
  assert.deepEqual(kit.parseEvidence("src/a.ts:10"), { file: "src/a.ts", line: 10 });
  assert.deepEqual(kit.parseEvidence("src/a.ts:10-20"), { file: "src/a.ts", line: 10 });
  assert.deepEqual(kit.parseEvidence("src/a.ts"), { file: "src/a.ts", line: undefined });
});

test("render mostra o prompt para copiar e o progresso quando pendente", () => {
  const data = kit.createTemplate({ framework: "node" });
  data.project.name = "Loja";
  const html = kit.renderOnboarding(data);
  assert.match(html, /ainda não foi gerado/);
  assert.match(html, /data-ok-state="pending"/);
  assert.match(html, /class="cta copy-cta" data-copy="Leia o arquivo onboarding\.json[^"]*_instructions/);
  assert.match(html, /1 de 17 seções preenchidas/);
  assert.match(html, /<li data-key="project" class="is-done">/);
});

test("página sem arquivo pede para a IA rodar o init", () => {
  const { renderMissingPage } = require("../dist/render/index.js");
  const page = renderMissingPage(tmpProject({ "package.json": JSON.stringify({ name: "minha-loja" }) }));
  assert.match(page, /data-ok-state="missing"/);
  assert.match(page, /data-copy="Rode &quot;npx onboarding-kit init&quot;/);
  assert.match(page, /minha-loja/);
});

test("parseColor entende hex, rgb, hsl, trio do shadcn, oklch e nomes do Tailwind", () => {
  assert.equal(kit.toHex(kit.parseColor("#4F46E5")), "#4f46e5");
  assert.equal(kit.toHex(kit.parseColor("#fff")), "#ffffff");
  assert.equal(kit.toHex(kit.parseColor("rgb(79, 70, 229)")), "#4f46e5");
  assert.equal(Math.round(kit.parseColor("hsl(243 75% 59%)").h), 243);
  assert.equal(Math.round(kit.parseColor("243.4 75.4% 58.6%").h), 243);
  const ok = kit.parseColor("oklch(0.511 0.262 276.966)");
  assert.ok(ok.h > 235 && ok.h < 250, `oklch indigo, h=${ok.h}`);
  assert.equal(kit.toHex(kit.parseColor("indigo")), "#6366f1");
  assert.equal(kit.parseColor("var(--primary)"), undefined);
});

test("resolveBrand detecta cores do Tailwind/CSS e o logo em public/", () => {
  const root = tmpProject({
    "package.json": "{}",
    "tailwind.config.ts": `export default { theme: { extend: { colors: { primary: { DEFAULT: "#e11d48", foreground: "#fff" }, secondary: colors.amber } } } }`,
    "src/app/globals.css": `:root { --background: 0 0% 100%; --primary-foreground: 0 0% 98%; --accent: 199 89% 48%; }`,
    "public/next.svg": "<svg/>",
    "public/logo.svg": '<svg xmlns="http://www.w3.org/2000/svg"/>',
    "public/favicon.ico": "ico",
  });
  const brand = kit.resolveBrand(undefined, root);
  assert.equal(kit.toHex(brand.colors[0]), "#e11d48");
  assert.equal(brand.colors.length, 3);
  assert.match(brand.logo, /^data:image\/svg\+xml;base64,/);
  assert.equal(Buffer.from(brand.logo.split(",")[1], "base64").toString(), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  assert.match(brand.favicon, /^data:image\/x-icon;base64,/);

  // o que a IA preencheu tem prioridade, e caminhos fora do repo são ignorados
  const declared = kit.resolveBrand({ brand: { primaryColor: "#16a34a", palette: [], logo: "../fora.svg", favicon: "", evidence: [] } }, root);
  assert.equal(kit.toHex(declared.colors[0]), "#16a34a");
  assert.match(declared.logo, /^data:image\/svg\+xml/);
});

test("render aplica as cores e o logo da marca", () => {
  const root = tmpProject({ ...PROJECT_FILES, "public/logo.png": "png" });
  const data = filledData();
  data.brand = { primaryColor: "#e11d48", palette: ["#f59e0b"], logo: "public/logo.png", favicon: "", evidence: [] };
  const html = kit.renderOnboarding(data, { root });
  assert.match(html, /data-palette="#e11d48 #f59e0b"/);
  assert.match(html, /<link rel="icon" href="data:image\/png;base64,/);
  assert.match(html, /class="brand-logo"><img src="data:image\/png/);
  assert.match(html, /data-chapter="welcome"[^>]*style="--h:347"/);
  assert.match(html, /id="ok-wipe"/);

  // marca preta/cinza vira tema monocromático
  data.brand = { primaryColor: "#111111", palette: [], logo: "", favicon: "", evidence: [] };
  assert.match(kit.renderOnboarding(data), /<html lang="pt-BR" data-mono/);
});

test("validate confere cores e logo da marca", () => {
  const data = filledData();
  data.brand = { primaryColor: "azul bonito", palette: [], logo: "public/nao-existe.svg", favicon: "", evidence: [] };
  const issues = kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) });
  assert.ok(issues.some((i) => i.level === "warning" && i.path === "brand.primaryColor"));
  assert.ok(issues.some((i) => i.level === "error" && i.path === "brand.logo"));
});

test("render monta o deck em ordem narrativa, com links e HTML escapado", () => {
  const data = filledData();
  data.project.tagline = "<script>alert(1)</script>";
  const html = kit.renderOnboarding(data);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(html, /&lt;script&gt;/);

  const chapters = [...html.matchAll(/<section class="slide"[^>]*data-chapter="([a-z]+)"/g)].map((m) => m[1]);
  const order = [...new Set(chapters)];
  assert.deepEqual(order, ["welcome", "why", "business", "product", "language", "rules", "stack", "architecture", "setup", "conventions", "workflow", "quality", "docs", "tours", "todos", "mission", "cheatsheet", "finale"]);
  assert.ok(!chapters.includes("gotchas"), "capítulo vazio não aparece");

  // tour: 1 slide de abertura + 1 por parada
  assert.equal(chapters.filter((c) => c === "tours").length, 2);
  // segmentos da barra de progresso = capítulos
  assert.equal((html.match(/class="seg"/g) || []).length, order.length);

  assert.match(html, /href="https:\/\/github\.com\/acme\/loja\/blob\/abc1234\/src\/index\.js#L2"/);
  assert.match(html, /mermaid@11/);
  assert.match(html, /data-kind="quiz"/);
  assert.match(html, /Que bom ter você/);
});

test("render mostra Git, qualidade, docs, TODOs ao vivo e a cola", () => {
  const root = tmpProject({ ...PROJECT_FILES, "src/legacy.js": "// FIXME: remover\n// TODO: x\n/** @deprecated use novo() */\n" });
  const html = kit.renderOnboarding(filledData(), { root });
  assert.match(html, /class="branch-map/);
  assert.match(html, /git commit -m "feat\(checkout\): aceita pix"/);
  assert.match(html, /Garantido por commitlint/);
  assert.match(html, /class="timeline/);
  assert.match(html, /<span class="kind kind-important">IMPORTANT<\/span>/);
  // varredura do código: 2 TODOs e 1 FIXME
  assert.match(html, /<strong data-count="3">3<\/strong>/);
  assert.match(html, /Afeta pedidos de fora/);
  assert.match(html, /data-kind="cheatsheet"/);
  assert.match(html, /<code>tipo\(escopo\): descrição<\/code>/);
  // decisões passam a fechar o capítulo de arquitetura
  assert.match(html, /O desenho do sistema/);
});

test("scanMarkers e collectFacts leem marcadores, git e sinais de arquitetura", () => {
  const { scanMarkers, collectFacts } = require("../dist/facts.js");
  const root = tmpProject({
    "package.json": JSON.stringify({ devDependencies: { vitest: "1" }, workspaces: ["apps/*"] }),
    "apps/api/src/a.ts": "const todo = 1; // TODO(lewi): validar CPF\n// NOTE: valores em centavos\n",
    "apps/api/src/a.test.ts": "",
    "apps/web/Dockerfile": "",
    "apps/api/Dockerfile": "",
    ".github/workflows/ci.yml": "",
    "commitlint.config.js": "",
  });
  const scan = scanMarkers(root);
  assert.equal(scan.counts.TODO, 1);
  assert.equal(scan.counts.NOTE, 1);
  assert.deepEqual(scan.items[0], { kind: "TODO", text: "validar CPF", file: "apps/api/src/a.ts:1" });
  assert.equal(scan.byFolder.apps, 1);

  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "feat(api): primeira versão"], { cwd: root });
  const facts = collectFacts(root);
  assert.equal(facts.git.conventionalRatio, 1);
  assert.deepEqual(facts.files.ci, [".github/workflows/ci.yml"]);
  assert.deepEqual(facts.files.commitRules, ["commitlint.config.js"]);
  assert.deepEqual(facts.tests.frameworks, ["vitest"]);
  assert.equal(facts.tests.testFiles, 1);
  assert.ok(facts.architectureSignals.some((s) => s.startsWith("monorepo")));
  assert.ok(facts.architectureSignals.some((s) => s.includes("2 Dockerfiles")));
  assert.match(cli.formatFacts(facts), /Conventional Commits: 100%/);
});

test("validate avisa quando uma seção passa do limite de itens", () => {
  const data = filledData();
  data.todos = Array.from({ length: 10 }, (_, i) => ({ title: `T${i}`, description: "", file: "src/index.js", kind: "TODO", impact: "" }));
  const issues = kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) });
  assert.ok(issues.some((i) => i.level === "warning" && i.path === "todos" && /no máximo 8/.test(i.message)));
});

test("render pagina listas longas em vários slides", () => {
  const data = filledData();
  data.stack = Array.from({ length: 13 }, (_, i) => ({ name: `Lib ${i}`, category: "lib", version: "1", why: "x", evidence: [] }));
  const html = kit.renderOnboarding(data);
  const stackSlides = (html.match(/data-chapter="stack"/g) || []).length;
  assert.equal(stackSlides, 3);
  assert.match(html, /<span class="cont">3\/3<\/span>/);
});

test("render em inglês quando meta.language é en", () => {
  const data = filledData();
  data.meta.language = "en";
  assert.match(kit.renderOnboarding(data), /Start the tour/);
});

test("adapter Node: 404 desligado, HTML ligado", async () => {
  const root = tmpProject({ "onboarding.json": JSON.stringify(filledData()) });
  const file = join(root, "onboarding.json");
  const call = (handler) =>
    new Promise((resolve) => {
      const server = http.createServer((req, res) => handler(req, res)).listen(0, async () => {
        const res = await fetch(`http://127.0.0.1:${server.address().port}/onboarding`);
        const body = await res.text();
        server.close();
        resolve({ status: res.status, body });
      });
    });
  assert.equal((await call(createOnboardingHandler({ file, enabled: false }))).status, 404);
  const on = await call(createOnboardingHandler({ file, enabled: true }));
  assert.equal(on.status, 200);
  assert.match(on.body, /<span class="grad">Loja<\/span>/);
});

test("adapter Next: devolve Response com HTML e página de arquivo ausente", async () => {
  const root = tmpProject({ "onboarding.json": JSON.stringify(filledData()) });
  const res = await createOnboardingRoute({ file: join(root, "onboarding.json"), enabled: true })();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const missing = await createOnboardingRoute({ file: join(root, "nada.json"), enabled: true })();
  assert.match(await missing.text(), /npx onboarding-kit init/);
});

test("detectFramework e patch do app.module do Nest", () => {
  assert.equal(cli.detectFramework({ dependencies: { next: "15" } }), "next");
  assert.equal(cli.detectFramework({ dependencies: { "@nestjs/core": "11" } }), "nest");
  assert.equal(cli.detectFramework({ dependencies: { express: "4" } }), "express");
  assert.equal(cli.detectFramework({ private: true, dependencies: { lodash: "4" } }), "node");

  const src = `import { Module } from '@nestjs/common';\n@Module({\n  imports: [UsersModule],\n})\nexport class AppModule {}\n`;
  const patched = cli.patchNestAppModule(src);
  assert.match(patched, /^import \{ OnboardingModule \} from "onboarding-kit\/nest";/);
  assert.match(patched, /imports: \[OnboardingModule\.register\(\), UsersModule\]/);
  assert.equal(cli.patchNestAppModule(patched), patched);
  assert.match(cli.patchNestAppModule("@Module({ imports: [ ] })"), /imports: \[OnboardingModule\.register\(\)\]/);
  assert.equal(cli.patchNestAppModule("@Module({ imports: [A] }) @Module({ imports: [B] })"), undefined);
});

test("CLI init em projeto Next cria JSON e rota", () => {
  const root = tmpProject({ "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }), "tsconfig.json": "{}", "src/app/page.tsx": "" });
  const out = execFileSync("node", [CLI, "init"], { cwd: root }).toString();
  assert.match(out, /Framework: .*Next\.js/);
  const data = JSON.parse(readFileSync(join(root, "onboarding.json"), "utf8"));
  assert.equal(data.meta.framework, "next");
  assert.ok(existsSync(join(root, "src/app/onboarding/route.ts")));
  // segunda execução não sobrescreve
  writeFileSync(join(root, "onboarding.json"), JSON.stringify({ ...data, project: { ...data.project, name: "X" } }));
  execFileSync("node", [CLI, "init"], { cwd: root });
  assert.equal(JSON.parse(readFileSync(join(root, "onboarding.json"), "utf8")).project.name, "X");
});

test("CLI validate sai com código 1 no template e 0 preenchido", () => {
  const root = tmpProject(PROJECT_FILES);
  execFileSync("node", [CLI, "init", "--framework", "node", "--no-route"], { cwd: root });
  assert.throws(() => execFileSync("node", [CLI, "validate"], { cwd: root, stdio: "pipe" }));
  writeFileSync(join(root, "onboarding.json"), JSON.stringify(filledData()));
  const out = execFileSync("node", [CLI, "validate"], { cwd: root }).toString();
  assert.match(out, /válido/);
});

test("detectFramework reconhece o ecossistema JavaScript", () => {
  const cases = {
    nuxt: { nuxt: "3" },
    sveltekit: { "@sveltejs/kit": "2", vite: "5" },
    astro: { astro: "5", react: "19" },
    remix: { "@react-router/dev": "7", vite: "6" },
    gatsby: { gatsby: "5" },
    adonis: { "@adonisjs/core": "6" },
    fastify: { fastify: "5" },
    koa: { koa: "2" },
    hono: { hono: "4" },
    elysia: { elysia: "1" },
    angular: { "@angular/core": "19" },
    vite: { vite: "6", vue: "3" },
    cra: { "react-scripts": "5" },
    webpack: { "@vue/cli-service": "5" },
    "react-native": { expo: "52", "react-native": "0.76" },
    electron: { electron: "33", vite: "6" },
  };
  for (const [expected, deps] of Object.entries(cases)) assert.equal(cli.detectFramework({ devDependencies: deps }), expected, expected);
  assert.equal(cli.detectFramework({ name: "lib", main: "index.js" }), "library");
  assert.equal(cli.detectFramework({ name: "tool", private: true, bin: { tool: "cli.js" } }), "library");
  // Deno: mapa de imports do deno.json
  assert.equal(cli.detectFramework(undefined, { imports: { "@hono/hono": "jsr:@hono/hono@^4" } }), "hono");
  // todo framework tem instrução própria para a IA
  for (const { id } of kit.FRAMEWORKS) assert.ok(kit.createTemplate({ framework: id })._instructions.framework.length > 40, id);
});

test("detectProject: UI, linguagem, runtime e linguagens no facts", () => {
  const root = tmpProject({
    "package.json": JSON.stringify({ type: "module", devDependencies: { vite: "6", vue: "3", rescript: "11" } }),
    "pnpm-lock.yaml": "",
    "tsconfig.json": "{}",
    "src/App.vue": "<template><div/></template>",
    "src/main.ts": "",
    "src/Button.res": "",
    "src/style.styl": "",
  });
  const p = kit.detectProject(root);
  assert.equal(p.framework, "vite");
  assert.deepEqual(p.ui, ["Vue"]);
  assert.equal(p.language, "TypeScript");
  assert.deepEqual(p.compileToJs, ["ReScript"]);
  assert.equal(p.moduleSystem, "ESM");
  assert.equal(p.packageManager, "pnpm");
  const facts = require("../dist/facts.js").collectFacts(root);
  const langs = facts.languages.map((l) => l.name);
  for (const l of ["Vue", "TypeScript", "ReScript", "Stylus"]) assert.ok(langs.includes(l), l);
  assert.match(cli.formatFacts(facts), /UI: Vue/);
});

test("marcadores em arquivos Vue, Svelte, CoffeeScript e MDX", () => {
  const root = tmpProject({
    "src/App.vue": "<script setup>\n// TODO: trocar por Pinia\n</script>",
    "src/Card.svelte": "<!-- FIXME: acessibilidade -->",
    "src/legacy.coffee": "# HACK: compat com IE",
    "docs/intro.mdx": "{/* NOTE: gerado */}",
  });
  const scan = require("../dist/facts.js").scanMarkers(root);
  assert.deepEqual(Object.keys(scan.counts).sort(), ["FIXME", "HACK", "NOTE", "TODO"]);
});

test("adapters fetch, vite, fastify e koa", async () => {
  const root = tmpProject({ "onboarding.json": JSON.stringify(filledData()) });
  const file = join(root, "onboarding.json");

  const { createOnboardingFetchHandler } = require("../dist/adapters/fetch.js");
  const res = await createOnboardingFetchHandler({ file, enabled: true })(new Request("http://x/onboarding"));
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Loja/);
  assert.equal((await createOnboardingFetchHandler({ file, enabled: false })()).status, 404);

  const { onboarding } = require("../dist/adapters/vite.js");
  const plugin = onboarding({ file });
  assert.equal(plugin.apply, "serve");
  let middleware;
  plugin.configureServer({ config: { base: "/" }, middlewares: { use: (fn) => (middleware = fn) } });
  const server = http.createServer((req, res) => middleware(req, res, () => { res.writeHead(418); res.end(); }));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/onboarding?x=1`)).status, 200);
  assert.equal((await fetch(`${base}/outra`)).status, 418);
  server.close();

  const { fastifyOnboarding } = require("../dist/adapters/fastify.js");
  const routes = {};
  let doneCalled = false;
  fastifyOnboarding({ get: (path, h) => (routes[path] = h) }, { file, enabled: true, path: "/docs/onboarding" }, () => (doneCalled = true));
  assert.ok(doneCalled);
  const reply = { sent: undefined, status: 0, hdrs: {}, code(s) { this.status = s; return this; }, headers(h) { Object.assign(this.hdrs, h); return this; }, send(b) { this.sent = b; return this; } };
  await routes["/docs/onboarding"]({}, reply);
  assert.equal(reply.status, 200);
  assert.match(reply.hdrs["Content-Type"], /text\/html/);

  const { createOnboardingMiddleware } = require("../dist/adapters/koa.js");
  const mw = createOnboardingMiddleware({ file, enabled: true });
  const ctx = { method: "GET", path: "/onboarding", status: 404, body: undefined, headers: {}, set(h) { Object.assign(this.headers, h); } };
  await mw(ctx, async () => assert.fail("não deveria chamar next"));
  assert.equal(ctx.status, 200);
  assert.match(ctx.body, /Loja/);
  let nextCalled = false;
  await mw({ ...ctx, path: "/" }, async () => (nextCalled = true));
  assert.ok(nextCalled);

  assert.equal(typeof require("../dist/adapters/express.js").createOnboardingHandler, "function");
});

test("patchViteConfig adiciona o plugin com segurança", () => {
  const esm = `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({\n  plugins: [react()],\n});\n`;
  const patched = cli.patchViteConfig(esm);
  assert.match(patched, /^import \{ onboarding \} from "onboarding-kit\/vite";/);
  assert.match(patched, /plugins: \[onboarding\(\), react\(\)\]/);
  assert.equal(cli.patchViteConfig(patched), patched);
  assert.match(cli.patchViteConfig(`export default defineConfig({ plugins: [] })`), /plugins: \[onboarding\(\)\]/);
  assert.match(cli.patchViteConfig(`export default defineConfig({\n  server: { port: 3000 },\n})`), /plugins: \[onboarding\(\)\],\n  server/);
  assert.match(cli.patchViteConfig(`const { defineConfig } = require("vite");\nmodule.exports = defineConfig({ plugins: [vue()] });`), /^const \{ onboarding \} = require/);
  assert.equal(cli.patchViteConfig(`export default { plugins: [a()], worker: { plugins: [b()] } }`), undefined);
});

test("CLI init: Nuxt, SvelteKit, Vite, CRA e projetos sem servidor", () => {
  const nuxt = tmpProject({ "package.json": JSON.stringify({ dependencies: { nuxt: "3" } }), "tsconfig.json": "{}" });
  execFileSync("node", [CLI, "init"], { cwd: nuxt });
  assert.match(readFileSync(join(nuxt, "server/routes/onboarding.get.ts"), "utf8"), /defineEventHandler/);

  const kitApp = tmpProject({ "package.json": JSON.stringify({ devDependencies: { "@sveltejs/kit": "2" } }) });
  execFileSync("node", [CLI, "init"], { cwd: kitApp });
  assert.ok(existsSync(join(kitApp, "src/routes/onboarding/+server.js")));

  const vite = tmpProject({
    "package.json": JSON.stringify({ devDependencies: { vite: "6", react: "19" } }),
    "vite.config.ts": `import { defineConfig } from "vite";\nexport default defineConfig({ plugins: [react()] });\n`,
  });
  const out = execFileSync("node", [CLI, "init"], { cwd: vite }).toString();
  assert.match(out, /Framework: .*Vite/);
  assert.match(readFileSync(join(vite, "vite.config.ts"), "utf8"), /plugins: \[onboarding\(\), react\(\)\]/);

  const cra = tmpProject({ "package.json": JSON.stringify({ dependencies: { "react-scripts": "5" } }) });
  execFileSync("node", [CLI, "init"], { cwd: cra });
  assert.match(readFileSync(join(cra, "src/setupProxy.js"), "utf8"), /createOnboardingHandler/);

  const rn = tmpProject({ "package.json": JSON.stringify({ name: "app", dependencies: { expo: "52" }, scripts: { start: "expo start" } }, null, 4) + "\n" });
  execFileSync("node", [CLI, "init"], { cwd: rn });
  const pkg = readFileSync(join(rn, "package.json"), "utf8");
  assert.equal(JSON.parse(pkg).scripts.onboarding, "onboarding-kit serve");
  assert.match(pkg, /^ {4}"name"/m);

  const deno = tmpProject({ "deno.json": JSON.stringify({ imports: { hono: "jsr:@hono/hono@^4" } }) });
  const denoOut = execFileSync("node", [CLI, "init"], { cwd: deno }).toString();
  assert.match(denoOut, /Hono/);
  assert.match(denoOut, /onboarding-kit\/fetch/);

  assert.throws(() => execFileSync("node", [CLI, "init", "--framework", "rails"], { cwd: deno, stdio: "pipe" }));
});

test("cores da marca em Expo, Vuetify e blocos <style> de Vue", () => {
  const expo = tmpProject({ "app.json": JSON.stringify({ expo: { name: "x", primaryColor: "#e11d48" } }) });
  assert.equal(kit.toHex(kit.resolveBrand({}, expo).colors[0]), "#e11d48");
  const vue = tmpProject({ "src/App.vue": "<template/>\n<style>\n:root { --brand: #0ea5e9; }\n</style>" });
  assert.equal(kit.toHex(kit.resolveBrand({}, vue).colors[0]), "#0ea5e9");
});
