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
  return data;
}

const PROJECT_FILES = { "package.json": "{}", "src/index.js": "line1\nline2\nline3\n" };

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

test("render mostra o prompt quando pendente", () => {
  const html = kit.renderOnboarding(kit.createTemplate({ framework: "node" }));
  assert.match(html, /ainda não foi gerado/);
  assert.match(html, /_instructions/);
});

test("render monta o deck em ordem narrativa, com links e HTML escapado", () => {
  const data = filledData();
  data.project.tagline = "<script>alert(1)</script>";
  const html = kit.renderOnboarding(data);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(html, /&lt;script&gt;/);

  const chapters = [...html.matchAll(/<section class="slide"[^>]*data-chapter="([a-z]+)"/g)].map((m) => m[1]);
  const order = [...new Set(chapters)];
  assert.deepEqual(order, ["welcome", "why", "business", "product", "language", "rules", "stack", "architecture", "setup", "conventions", "tours", "mission", "finale"]);
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
  assert.equal(cli.detectFramework({ dependencies: { express: "4" } }), "node");

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
  assert.match(out, /Framework: .*next/);
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
