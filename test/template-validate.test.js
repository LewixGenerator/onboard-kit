const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, tmpProject, filledData, PROJECT_FILES, readFileSync, join } = require("./helpers");

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
  assert.match(msgs, /warning meta\.commit .*onboarding-kit status/);
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

test("validate confere cores e logo da marca", () => {
  const data = filledData();
  data.brand = { primaryColor: "azul bonito", palette: [], logo: "public/nao-existe.svg", favicon: "", evidence: [] };
  const issues = kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) });
  assert.ok(issues.some((i) => i.level === "warning" && i.path === "brand.primaryColor"));
  assert.ok(issues.some((i) => i.level === "error" && i.path === "brand.logo"));
});

test("validate avisa quando uma seção passa do limite de itens", () => {
  const data = filledData();
  data.todos = Array.from({ length: 10 }, (_, i) => ({ title: `T${i}`, description: "", file: "src/index.js", kind: "TODO", impact: "" }));
  const issues = kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) });
  assert.ok(issues.some((i) => i.level === "warning" && i.path === "todos" && /no máximo 8/.test(i.message)));
});

test("JSON Schema cobre todas as seções do template", () => {
  const schema = kit.onboardingSchema("1.2.3");
  const template = kit.createTemplate({ framework: "node" });
  assert.equal(template.$schema, kit.SCHEMA_URL);
  assert.match(kit.SCHEMA_URL, /^https:\/\/unpkg\.com\/onboarding-kit@\d+\.\d+\.\d+\/dist\/onboarding\.schema\.json$/);
  for (const key of Object.keys(template)) assert.ok(schema.properties[key], `schema sem a seção ${key}`);
  const built = JSON.parse(readFileSync(join(__dirname, "..", "dist", "onboarding.schema.json"), "utf8"));
  assert.equal(built.$id, kit.SCHEMA_URL);
  assert.equal(built.properties.todos.maxItems, 8);
});

test("checkMermaid pega tipo desconhecido, desbalanceamento e parênteses em nós", () => {
  assert.deepEqual(kit.checkMermaid("graph TD\n  A[Web] --> B[(Banco)]"), []);
  assert.deepEqual(kit.checkMermaid("%% comentário\nflowchart LR\n  A[\"Pedidos (core)\"] --> B"), []);
  assert.deepEqual(kit.checkMermaid("sequenceDiagram\n  A->>B: oi"), []);
  assert.equal(kit.checkMermaid("diagrama\n A-->B")[0].level, "error");
  assert.match(kit.checkMermaid("graph TD\n  A[Web --> B")[0].message, /aberto/);
  assert.match(kit.checkMermaid("graph TD\n  A[Pedidos (core)] --> B")[0].message, /aspas/);
});

test("validate avisa textos longos, itens repetidos e subprojetos esquecidos", () => {
  const root = tmpProject({
    ...PROJECT_FILES,
    "package.json": JSON.stringify({ name: "r", private: true, workspaces: ["apps/*"] }),
    "apps/web/package.json": JSON.stringify({ name: "web" }),
    "apps/api/package.json": JSON.stringify({ name: "api" }),
  });
  const data = filledData();
  data.features[0].description = "x".repeat(500);
  data.domain.glossary[1].term = "sku";
  let issues = kit.validateOnboarding(data, { root });
  assert.ok(issues.some((i) => i.path === "features[0].description" && /texto longo/.test(i.message)));
  assert.ok(issues.some((i) => i.path === "domain.glossary[1].term" && /repetido/.test(i.message)));
  assert.ok(issues.some((i) => i.path === "subprojects" && /vazio, mas/.test(i.message)));
  delete data.subprojects;
  issues = kit.validateOnboarding(data, { root });
  assert.ok(issues.some((i) => i.path === "subprojects" && /seção ausente/.test(i.message)));
  data.subprojects = [{ name: "web", path: "apps/web", kind: "app", framework: "", description: "Site", dependsOn: [], command: "" }];
  issues = kit.validateOnboarding(data, { root });
  assert.ok(issues.some((i) => i.path === "subprojects" && /apps\/api/.test(i.message)));
});
