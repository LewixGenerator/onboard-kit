const { test } = require("node:test");
const assert = require("node:assert/strict");
const { utimesSync } = require("node:fs");
const { kit, CLI, tmpProject, filledData, PROJECT_FILES, writeFileSync, readFileSync, existsSync, join, execFileSync } = require("./helpers");
const tr = require("../dist/translate.js");

test("translatableStrings pega só texto: nada de caminhos, comandos, nomes de pacote ou código", () => {
  const strings = tr.translatableStrings(filledData());
  const keys = Object.keys(strings);
  assert.ok(keys.includes("project.purpose"));
  assert.ok(keys.some((k) => /^features\[\d+\]\.description$/.test(k)));
  assert.ok(!keys.some((k) => /evidence|entryPoints|\.files|\.file$|\.path$|\.command$|meta\.|brand\.|repoUrl|diagram/.test(k)), keys.join(", "));
  assert.ok(!keys.some((k) => /^stack\[\d+\]\.name$/.test(k)), "nome de pacote fica como está");
  assert.ok(!keys.includes("project.name"));
});

test("translate é incremental: só o que mudou volta para a IA", () => {
  const dir = tmpProject(PROJECT_FILES);
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(filledData()));
  const run = (...args) => execFileSync("node", [CLI, "translate", ...args], { cwd: dir, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.match(run("--to", "en"), /texto\(s\) para traduzir em onboarding\.en\.todo\.json/);
  const todoPath = join(dir, "onboarding.en.todo.json");
  const todo = JSON.parse(readFileSync(todoPath, "utf8"));
  const total = Object.keys(todo.strings).length;
  assert.ok(total > 10);
  assert.match(todo._instructions, /Translate each value/);
  for (const k of Object.keys(todo.strings)) todo.strings[k] = `EN ${todo.strings[k]}`;
  writeFileSync(todoPath, JSON.stringify(todo));
  assert.match(run("--to", "en"), new RegExp(`${total} texto\\(s\\) traduzido\\(s\\)[\\s\\S]*em dia`));
  assert.ok(!existsSync(todoPath), "sem pendências o arquivo de trabalho some");

  // muda um texto: só ele fica pendente
  const data = JSON.parse(readFileSync(join(dir, "onboarding.json"), "utf8"));
  data.project.purpose = "Vender muitas coisas";
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(data));
  assert.match(run("--to", "en"), /1 texto\(s\) para traduzir/);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(todoPath, "utf8")).strings), ["project.purpose"]);

  // texto igual nos dois idiomas conta como traduzido quando a IA salvou o arquivo
  const later = new Date(Date.now() + 5000);
  utimesSync(todoPath, later, later);
  assert.match(run("--to", "en"), /1 texto\(s\) traduzido/);

  assert.throws(() => execFileSync("node", [CLI, "translate", "--to", "pt"], { cwd: dir, stdio: "pipe" }), /já está em português/);
});

test("localize aplica a tradução, mantém o original no que falta e troca a interface", () => {
  const dir = tmpProject();
  const file = join(dir, "onboarding.json");
  const data = filledData();
  writeFileSync(file, JSON.stringify(data));
  const strings = tr.translatableStrings(data);
  const hash = (s) => require("node:crypto").createHash("sha1").update(s).digest("hex").slice(0, 10);
  writeFileSync(join(dir, "onboarding.en.json"), JSON.stringify({ language: "en", source: "pt-BR", strings: { "project.purpose": { h: hash(strings["project.purpose"]), t: "Sell things" }, "project.tagline": { h: "stale", t: "Old" } } }));
  const view = tr.localize(data, file, "en");
  assert.equal(view.current, "en");
  assert.equal(view.data.project.purpose, "Sell things");
  assert.equal(view.data.project.tagline, data.project.tagline, "tradução de texto que mudou não é usada");
  assert.equal(view.data.meta.language, "en");
  assert.equal(view.untranslated, Object.keys(strings).length - 1);
  assert.equal(data.project.purpose, "Vender coisas", "o original não muda");

  const html = kit.renderOnboarding(view.data, { languages: { current: "en", source: "pt", untranslated: view.untranslated, list: ["pt", "en"] } });
  assert.match(html, /<nav class="langs"[\s\S]*href="\?"[^>]*>PT<\/a><a href="\?lang=en"[^>]*aria-current="true">EN<\/a>/);
  assert.match(html, /translate --to en/);
  assert.match(html, /Sell things/);
});

test("servidor atende ?lang=en com a interface em inglês e o aviso do que falta traduzir", async () => {
  const dir = tmpProject(PROJECT_FILES);
  const file = join(dir, "onboarding.json");
  writeFileSync(file, JSON.stringify(filledData()));
  const page = await kit.renderOnboardingPage(file, { lang: "en" });
  assert.match(page.html, /<html lang="en"/);
  assert.match(page.html, /Start the tour/);
  assert.match(page.html, /aria-current="true">EN</);
  assert.match(page.html, /class="untranslated"/);
  const pt = await kit.renderOnboardingPage(file, {});
  assert.match(pt.html, /aria-current="true">PT</);
  assert.doesNotMatch(pt.html, /class="untranslated"/);
});

test("MCP onboarding_translate devolve pendências e guarda traduções sem arquivo de trabalho", async () => {
  const dir = tmpProject();
  const file = join(dir, "onboarding.json");
  writeFileSync(file, JSON.stringify(filledData()));
  const tool = kit.mcpTools(file).find((t) => t.name === "onboarding_translate");
  const first = await tool.run({ to: "en" });
  assert.ok(first.remaining > 10);
  assert.equal(first.pending["project.purpose"], "Vender coisas");
  const second = await tool.run({ to: "en", translations: { "project.purpose": "Sell things", "caminho.inexistente": "x" } });
  assert.equal(second.added, 1);
  assert.equal(second.remaining, first.remaining - 1);
  assert.equal(JSON.parse(readFileSync(join(dir, "onboarding.en.json"), "utf8")).strings["project.purpose"].t, "Sell things");
});
