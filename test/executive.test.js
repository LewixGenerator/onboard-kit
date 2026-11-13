const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, CLI, tmpProject, filledData, PROJECT_FILES, writeFileSync, readFileSync, join, execFileSync } = require("./helpers");

function gitRepo(files) {
  const dir = tmpProject(files);
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  const as = (name) => ["-c", `user.email=${name}@t`, "-c", `user.name=${name}`];
  git("init", "-q");
  git(...as("ana"), "add", "-A");
  git(...as("ana"), "commit", "-q", "-m", "init");
  return { dir, git, as };
}

test("saúde do projeto sai do git e dos arquivos, sem IA", () => {
  const { dir, git, as } = gitRepo({
    "package.json": JSON.stringify({ name: "loja", dependencies: { stripe: "1", "@sentry/node": "1", pg: "1" }, devDependencies: { vitest: "1" } }),
    "src/a.js": "// TODO: um\n// FIXME: dois\nconst a = 1;\n",
    "src/a.test.js": "test()\n",
    "vercel.json": "{}",
    "coverage/coverage-summary.json": JSON.stringify({ total: { lines: { pct: 82.4 } } }),
  });
  for (let i = 0; i < 3; i++) {
    writeFileSync(join(dir, "src/a.js"), `// TODO: um\n// FIXME: dois\nconst a = ${i};\n`);
    git(...as(i === 2 ? "bia" : "ana"), "commit", "-q", "-am", `change ${i}`);
  }
  git(...as("ana"), "tag", "v1.0.0");
  const h = kit.projectHealth(dir);
  assert.equal(h.releases.last12m, 1);
  assert.equal(h.releases.lastTag, "v1.0.0");
  assert.equal(h.knowledge.authors, 2);
  assert.equal(h.knowledge.people, 2, "ana fez 3 de 4 commits: precisa das duas para chegar a 80%");
  assert.equal(h.knowledge.level, "attention");
  assert.equal(h.debt.markers, 2);
  assert.equal(h.tests.coverage, 82);
  assert.equal(h.tests.level, "good");
  assert.equal(h.dependencies.total, 4);
  assert.equal(h.hotspots[0].file, "src/a.js");

  const names = kit.detectIntegrations(dir).map((i) => `${i.name}:${i.category}`);
  assert.deepEqual(names.sort(), ["PostgreSQL:data", "Sentry:observability", "Stripe:payments", "Vercel:hosting"]);
});

test("visão executiva: painel calculado, integrações com o papel escrito pela IA, riscos e áreas quentes", () => {
  const { dir } = gitRepo({ ...PROJECT_FILES, "package.json": JSON.stringify({ name: "loja", dependencies: { stripe: "1" } }) });
  const html = kit.renderOnboarding(filledData(), { root: dir });
  const exec = html.match(/<section class="slide"[^>]*data-chapter="executive"[\s\S]*?<\/section>/g) ?? [];
  assert.equal(exec.length, 3);
  assert.match(exec[0], /class="card metric" data-level="(good|attention|risk|unknown)"/);
  assert.match(exec[0], /Em produção e crescendo/, "o resumo da IA vira o lede");
  assert.match(exec[1], /Stripe[\s\S]*Pagamentos[\s\S]*Cobra os pedidos no checkout/);
  assert.match(exec[2], /Frete só nacional[\s\S]*Mais alterados/);
  assert.match(html, /data-chapter="questions"[\s\S]*Qual o SLA do checkout\?/);
});

test("trilha de gestão vem pronta e mostra só os capítulos de negócio e saúde", () => {
  const data = filledData();
  assert.deepEqual(kit.tracksFor(data).map((t) => t.id), ["gestao"]);
  const html = kit.renderOnboarding(data, { track: "gestao" });
  const chapters = [...new Set([...html.matchAll(/<section class="slide"[^>]*data-chapter="([^"]+)"/g)].map((m) => m[1]))];
  assert.deepEqual(chapters, ["welcome", "why", "business", "product", "executive", "architecture", "workflow", "quality", "todos", "questions", "finale"]);
  data.tracks = [{ id: "gestao", name: "Diretoria", description: "", chapters: ["why"], paths: [] }];
  assert.equal(kit.tracksFor(data).length, 1, "o time pode trocar a trilha de gestão pela dele");
});

test("validate confere se a linha citada fala do símbolo do texto, e confidence vale metade na cobertura", () => {
  const root = tmpProject({ "src/a.ts": "line\nexport function checkPassword() {}\nline\n" });
  assert.deepEqual(kit.unmentionedSymbols({ title: "Senha", description: "Usa `checkPassword`.", evidence: ["src/a.ts:2"] }, root), []);
  assert.deepEqual(kit.unmentionedSymbols({ title: "Senha", description: "Usa `hashSenha`.", evidence: ["src/a.ts:2"] }, root), ["hashSenha"]);
  assert.equal(kit.unmentionedSymbols({ title: "Sem símbolo", description: "texto", evidence: ["src/a.ts:2"] }, root), undefined);

  const data = filledData();
  data.conventions = [{ title: "Senha", description: "Sempre `hashSenha`.", example: "", evidence: ["src/index.js:1"] }];
  const issues = kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) });
  assert.ok(issues.some((i) => i.path === "conventions[0].evidence" && /não mencionam `hashSenha`/.test(i.message)));
  data.conventions[0].confidence = "inferred";
  assert.ok(!kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) }).some((i) => i.path === "conventions[0].evidence"));

  const verified = kit.coverageScore(filledData());
  const all = filledData();
  for (const list of [all.stack, all.conventions, all.business.actors, all.domain.businessRules]) for (const item of list) item.confidence = "inferred";
  const lower = kit.coverageScore(all);
  assert.ok(lower.inferred > 0 && lower.score < verified.score);
});

test("review registra quem revisou e o status avisa quando o capítulo muda depois", () => {
  const { dir, git, as } = gitRepo(PROJECT_FILES);
  const data = filledData();
  data.meta.commit = git("rev-parse", "HEAD");
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(data));
  const run = (...args) => execFileSync("node", [CLI, ...args], { cwd: dir, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.match(run("review", "rules", "--by", "Ana"), /rules revisado por Ana/);
  const saved = JSON.parse(readFileSync(join(dir, "onboarding.json"), "utf8"));
  assert.equal(saved.reviews.rules.by, "Ana");
  assert.equal(saved.reviews.rules.commit, git("rev-parse", "HEAD"));
  assert.match(kit.renderOnboarding(saved, {}), /class="reviewed">✓ Revisado por Ana em/);

  git(...as("ana"), "add", "-A");
  git(...as("ana"), "commit", "-q", "-m", "review");
  writeFileSync(join(dir, "src/index.js"), "line1\n// TODO: frete internacional\nnovo\n");
  assert.match(run("status"), /Capítulos revisados que mudaram[\s\S]*rules revisado por Ana · mudou: src\/index\.js/);
  assert.match(run("review"), /! rules/);
  assert.throws(() => execFileSync("node", [CLI, "review", "nada"], { cwd: dir, stdio: "pipe" }), /Capítulo desconhecido/);
  assert.equal(kit.chapterOf("domain.businessRules[3]"), "rules");
  assert.equal(kit.chapterOf("tours[0].steps[2]"), "tours");
});
