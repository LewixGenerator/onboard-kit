const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, CLI, tmpProject, filledData, PROJECT_FILES, writeFileSync, readFileSync, existsSync, join, execFileSync } = require("./helpers");
const { createOnboardingFetchHandler } = require("../dist/adapters/fetch.js");

function project(data = filledData()) {
  const dir = tmpProject(PROJECT_FILES);
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(data));
  return dir;
}

test("senha: pede Basic Auth e liga a rota mesmo em produção", async () => {
  const dir = project();
  const handler = createOnboardingFetchHandler({ file: join(dir, "onboarding.json"), password: "s3gredo" });
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const denied = await handler(new Request("http://x/onboarding"));
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get("www-authenticate"), /Basic/);
    const wrong = await handler(new Request("http://x/onboarding", { headers: { Authorization: `Basic ${Buffer.from("a:errada").toString("base64")}` } }));
    assert.equal(wrong.status, 401);
    const ok = await handler(new Request("http://x/onboarding", { headers: { Authorization: `Basic ${Buffer.from("qualquer:s3gredo").toString("base64")}` } }));
    assert.equal(ok.status, 200);
    assert.match(await ok.text(), /Loja/);
    assert.equal((await createOnboardingFetchHandler({ file: join(dir, "onboarding.json") })()).status, 404);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test("feedback: POST grava em onboarding-feedback.json e entra no status", async () => {
  const dir = project();
  const handler = createOnboardingFetchHandler({ file: join(dir, "onboarding.json") });
  const html = await (await handler(new Request("http://x/onboarding"))).text();
  assert.match(html, /data-feedback/);
  const post = (body, type = "application/json") => handler(new Request("http://x/onboarding", { method: "POST", headers: { "Content-Type": type }, body }));
  assert.equal((await post("comment=oi", "application/x-www-form-urlencoded")).status, 415);
  assert.equal((await post(JSON.stringify({ comment: " " }))).status, 400);
  assert.equal((await post(JSON.stringify({ slide: "regras-do-jogo", title: "As regras do jogo", comment: "Não entendi o frete" }))).status, 201);
  const saved = JSON.parse(readFileSync(join(dir, "onboarding-feedback.json"), "utf8"));
  assert.equal(saved[0].comment, "Não entendi o frete");
  assert.equal(saved[0].commit, "abc1234");

  const report = kit.onboardingStatus(filledData(), dir);
  assert.equal(report.feedback.length, 1);
  const off = createOnboardingFetchHandler({ file: join(dir, "onboarding.json"), feedback: false });
  assert.doesNotMatch(await (await off(new Request("http://x/onboarding"))).text(), /id="ok-feedback"/);
  report.since = "abc1234";
  assert.match(kit.statusPrompt(report), /Não entendi o frete/);
});

test("trilhas: escolha na boas-vindas, filtro por ?trilha= e um arquivo por trilha no export", async () => {
  const data = filledData();
  data.tracks = [{ id: "dev", name: "Dev", description: "Código e setup", chapters: ["setup", "conventions"], paths: [] }];
  const dir = project(data);
  const handler = createOnboardingFetchHandler({ file: join(dir, "onboarding.json") });
  const all = await (await handler(new Request("http://x/onboarding"))).text();
  assert.match(all, /href="\?trilha=dev"/);
  assert.match(all, /data-chapter="rules"/);
  const dev = await (await handler(new Request("http://x/onboarding?trilha=dev"))).text();
  assert.match(dev, /Trilha: Dev/);
  assert.match(dev, /data-chapter="setup"/);
  assert.doesNotMatch(dev, /data-chapter="rules"/);

  execFileSync("node", [CLI, "export"], { cwd: dir, env: { ...process.env, NO_COLOR: "1" } });
  assert.match(readFileSync(join(dir, "onboarding.html"), "utf8"), /href="onboarding\.dev\.html"/);
  assert.match(readFileSync(join(dir, "onboarding.dev.html"), "utf8"), /href="onboarding\.html">Ver tudo/);
  assert.doesNotMatch(readFileSync(join(dir, "onboarding.html"), "utf8"), /id="ok-feedback"/);

  data.tracks[0].id = "Dev Team";
  data.tracks[0].chapters.push("nada");
  const issues = kit.validateOnboarding(data, { root: dir });
  assert.ok(issues.some((i) => i.path === "tracks[0].id" && i.level === "error"));
  assert.ok(issues.some((i) => i.path === "tracks[0].chapters[2]"));
});

test("trecho do código aparece no tour e nas regras", () => {
  const dir = tmpProject({ ...PROJECT_FILES, "src/frete.js": "function frete(total) {\n  if (total > 200) return 0;\n  return 15;\n}\n" });
  const data = filledData();
  data.domain.businessRules[0].evidence = ["src/frete.js:2"];
  data.tours[0].steps[0].file = "src/frete.js:1";
  const html = kit.renderOnboarding(data, { root: dir });
  assert.match(html, /<pre class="snippet"><code><span class=""><i>1<\/i>function frete\(total\) \{<\/span><span class="hl"><i>2<\/i>  if \(total &gt; 200\) return 0;<\/span>/);
  assert.match(html, /<span class="hl"><i>1<\/i>function frete\(total\) \{<\/span>/);
  assert.doesNotMatch(kit.renderOnboarding(data), /class="snippet"/);
});

test("pessoas: seção opcional, validate barra e-mail e facts --people", () => {
  assert.equal(kit.createTemplate({ framework: "node" }).people, undefined);
  assert.equal(kit.createTemplate({ framework: "node", people: true }).people.length, 1);
  const data = filledData();
  data.people = [{ name: "Ana", role: "Tech lead", areas: ["src/orders"], contact: "#time-checkout" }];
  const html = kit.renderOnboarding(data);
  assert.match(html, /Quem procurar/);
  assert.match(html, /#time-checkout/);
  data.people[0].contact = "ana@empresa.com";
  assert.ok(kit.validateOnboarding(data, { root: tmpProject(PROJECT_FILES) }).some((i) => i.path === "people[0]" && i.level === "error"));

  const dir = tmpProject({ ...PROJECT_FILES, ".github/CODEOWNERS": "src/ @acme/checkout\n" });
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  git("-c", "user.email=ana@x", "-c", "user.name=Ana", "add", "-A");
  git("-c", "user.email=ana@x", "-c", "user.name=Ana", "commit", "-qm", "init");
  const facts = kit.collectFacts(dir, { people: true });
  assert.deepEqual(facts.people.codeowners, [{ pattern: "src/", owners: ["@acme/checkout"] }]);
  assert.deepEqual(facts.people.areas.find((a) => a.area === "src").authors, [{ name: "Ana", commits: 1 }]);
  assert.equal(kit.collectFacts(dir).people, undefined);
});

test("novidades desde a última visita vêm do histórico do onboarding.json no git", () => {
  const dir = tmpProject(PROJECT_FILES);
  const git = (...a) => execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  const v1 = filledData();
  v1.meta.commit = "1111111";
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(v1));
  git("add", "-A");
  git("commit", "-qm", "v1");
  const v2 = filledData();
  v2.meta.commit = "2222222";
  v2.domain.businessRules.push({ title: "Cupom", description: "Um por pedido", evidence: ["src/index.js"] });
  v2.features[0].description = "Finaliza a compra com pix";
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(v2));
  git("add", "-A");
  git("commit", "-qm", "v2");

  const history = kit.onboardingHistory(join(dir, "onboarding.json"), v2);
  assert.deepEqual(history["1111111"], [
    { chapter: "product", title: "Checkout", kind: "updated" },
    { chapter: "rules", title: "Cupom", kind: "new" },
  ]);
  const html = kit.renderOnboarding(v2, { root: dir, file: join(dir, "onboarding.json") });
  assert.match(html, /<script type="application\/json" id="ok-history">\{"1111111":/);
  assert.match(html, /data-commit="2222222"/);
});

test("busca e modo offline", () => {
  const html = kit.renderOnboarding(filledData(), { inline: { mermaid: "window.mermaid={};</script>", fonts: "@font-face{}" } });
  assert.match(html, /id="ok-search"/);
  assert.match(html, /<style>@font-face\{\}<\/style>/);
  assert.doesNotMatch(html, /fonts\.googleapis/);
  assert.doesNotMatch(html, /cdn\.jsdelivr/);
  assert.match(html, /window\.mermaid=\{\};<\\\/script>/);
});
