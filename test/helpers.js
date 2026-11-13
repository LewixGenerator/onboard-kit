/* Utilitários compartilhados pelos testes. */
// as mensagens da CLI seguem o idioma do sistema; os testes conferem as em português
process.env.ONBOARDING_KIT_LANG = "pt";
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

module.exports = { kit, createOnboardingHandler, createOnboardingRoute, cli, CLI, tmpProject, filledData, PROJECT_FILES, mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, tmpdir, join, execFileSync, http };
