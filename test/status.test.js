const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, CLI, tmpProject, filledData, writeFileSync, readFileSync, join, execFileSync } = require("./helpers");
const { renameSync, rmSync } = require("node:fs");

function gitRepo(files) {
  const dir = tmpProject(files);
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  git("init", "-q");
  git("-c", "user.email=t@t", "-c", "user.name=t", "add", "-A");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "init");
  return { dir, git, head: git("rev-parse", "HEAD") };
}

test("collectRefs liga cada evidência ao item dono", () => {
  const refs = kit.collectRefs(filledData());
  const rule = refs.find((r) => r.at === "domain.businessRules[0].evidence[0]");
  assert.deepEqual({ item: rule.item, title: rule.title }, { item: "domain.businessRules[0]", title: "Frete grátis" });
  const step = refs.find((r) => r.at === "tours[0].steps[0].file");
  assert.equal(step.item, "tours[0].steps[0]");
  assert.equal(step.title, "Requisição");
  assert.ok(refs.some((r) => r.at === "architecture.modules[0].path"));
});

test("relocateLine acha a linha que andou e ignora âncoras genéricas", () => {
  const old = "a\nconst frete = calcularFrete(pedido);\n}\n";
  assert.equal(kit.relocateLine(old, "x\ny\na\nconst frete = calcularFrete(pedido);\n}\n", 2), 4);
  assert.equal(kit.relocateLine(old, old, 2), 2);
  assert.equal(kit.relocateLine(old, "nada aqui\n", 2), undefined);
  assert.equal(kit.relocateLine(old, "}\n}\n}\n", 3), undefined);
});

test("status aponta itens desatualizados, linhas que andaram, renomeações e arquivos novos", () => {
  const { dir, head } = gitRepo({
    "package.json": "{}",
    "src/index.js": "line1\nfunction frete(pedido) {\nline3\n",
    "src/old.js": "module.exports = 1;\n",
    "src/gone.js": "x\n",
    "src/untouched.js": "y\n",
  });
  const data = filledData();
  data.meta.commit = head;
  data.domain.businessRules = [{ title: "Frete grátis", description: "Acima de R$ 200", evidence: ["src/index.js:2"] }];
  data.conventions = [{ title: "Módulos", description: "CommonJS", example: "", evidence: ["src/old.js", "src/untouched.js"] }];
  data.gotchas = [{ title: "Arquivo velho", description: "", evidence: ["src/gone.js"] }];
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(data, null, 2));

  writeFileSync(join(dir, "src/index.js"), "// novo cabeçalho\n\nline1\nfunction frete(pedido) {\nline3\n");
  renameSync(join(dir, "src/old.js"), join(dir, "src/new.js"));
  execFileSync("git", ["add", "-A"], { cwd: dir });
  rmSync(join(dir, "src/gone.js"));
  writeFileSync(join(dir, "src/pagamentos.ts"), "export {}\n");
  writeFileSync(join(dir, "src/pagamentos.test.ts"), "");

  const report = kit.onboardingStatus(data, dir);
  assert.equal(report.since, head);
  const items = report.stale.map((s) => s.item).sort();
  assert.ok(items.includes("domain.businessRules[0]"));
  assert.ok(items.includes("conventions[0]"));
  assert.ok(items.includes("gotchas[0]"));
  assert.ok(!report.stale.some((s) => s.files.includes("src/untouched.js")));
  assert.deepEqual(report.drift.find((d) => d.at === "domain.businessRules[0].evidence[0]"), { at: "domain.businessRules[0].evidence[0]", from: "src/index.js:2", to: "src/index.js:4" });
  assert.deepEqual(report.drift.find((d) => d.at === "conventions[0].evidence[0]").to, "src/new.js");
  assert.deepEqual(report.broken, [{ at: "gotchas[0].evidence[0]", ref: "src/gone.js" }]);
  assert.deepEqual(report.uncovered, ["src/pagamentos.ts"]);
  assert.match(kit.statusPrompt(report), /domain\.businessRules\[0\] \("Frete grátis"\)/);

  const env = { ...process.env, NO_COLOR: "1", GITHUB_ACTIONS: "" };
  const out = execFileSync("node", [CLI, "status", "--fix"], { cwd: dir, env }).toString();
  assert.match(out, /Itens que podem estar desatualizados/);
  assert.match(out, /src\/index\.js:2 → src\/index\.js:4/);
  assert.match(out, /Corrigi 4 evidência/);
  const fixed = JSON.parse(readFileSync(join(dir, "onboarding.json"), "utf8"));
  assert.equal(fixed.domain.businessRules[0].evidence[0], "src/index.js:4");
  assert.equal(fixed.conventions[0].evidence[0], "src/new.js");
});

test("status sem meta.commit e em dia", () => {
  const { dir, head } = gitRepo({ "package.json": "{}", "src/index.js": "line1\n// TODO: frete internacional\nline3\n" });
  const data = filledData();
  data.meta.commit = "";
  assert.equal(kit.onboardingStatus(data, dir).problem, "no-commit");
  data.meta.commit = "0123456789abcdef0123456789abcdef01234567";
  assert.equal(kit.onboardingStatus(data, dir).problem, "unknown-commit");
  data.meta.commit = head;
  const report = kit.onboardingStatus(data, dir);
  assert.equal(report.stale.length, 0);
  assert.equal(kit.statusPrompt(report), undefined);
});

test("validate --ci escreve anotações e resumo do GitHub Actions", () => {
  const dir = tmpProject({ "package.json": "{}" });
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(kit.createTemplate({ framework: "node" })));
  const summary = join(dir, "summary.md");
  writeFileSync(summary, "");
  let out = "";
  try {
    execFileSync("node", [CLI, "validate", "--ci"], { cwd: dir, env: { ...process.env, NO_COLOR: "1", GITHUB_STEP_SUMMARY: summary }, stdio: "pipe" });
  } catch (err) {
    out = err.stdout.toString();
  }
  assert.match(out, /^::error file=onboarding\.json,title=onboarding%3A meta\.status::/m);
  assert.match(readFileSync(summary, "utf8"), /### onboarding-kit validate[\s\S]*\| ❌ \| `meta\.status` \|/);
});
