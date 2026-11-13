const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, tmpProject, filledData, PROJECT_FILES } = require("./helpers");

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

test("render monta o deck em ordem narrativa, com links e HTML escapado", () => {
  const data = filledData();
  data.project.tagline = "<script>alert(1)</script>";
  const html = kit.renderOnboarding(data);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(html, /&lt;script&gt;/);

  const chapters = [...html.matchAll(/<section class="slide"[^>]*data-chapter="([a-z]+)"/g)].map((m) => m[1]);
  const order = [...new Set(chapters)];
  assert.deepEqual(order, ["welcome", "why", "business", "product", "executive", "language", "rules", "stack", "architecture", "setup", "conventions", "workflow", "quality", "docs", "tours", "todos", "questions", "mission", "cheatsheet", "finale"]);
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

test("slides têm âncoras para links diretos e botão de imprimir", () => {
  const html = kit.renderOnboarding(filledData());
  assert.match(html, /<section class="slide" id="slide-1" data-anchor="boas-vindas"/);
  assert.match(html, /data-anchor="arquitetura"/);
  assert.match(html, /data-anchor="vocabulario"/);
  assert.match(html, /data-print>Imprimir \/ PDF</);
  assert.match(html, /@media print\{/);
  const anchors = [...html.matchAll(/data-anchor="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(anchors).size, anchors.length);
});

test("render em espanhol quando meta.language é es", () => {
  const data = filledData();
  data.meta.language = "es-AR";
  const html = kit.renderOnboarding(data);
  assert.match(html, /Empezar el recorrido/);
  assert.match(html, /data-anchor="bienvenida"/);
  assert.match(html, /Imprimir \/ PDF/);
});

test("trechos de código de arquivos com CRLF não carregam \\r", () => {
  const { codeSnippet } = require("../dist/render/html.js");
  const root = tmpProject({ "src/a.ts": "const a = 1;\r\nconst b = 2;\r\nconst c = 3;\r\n" });
  const html = codeSnippet("src/a.ts:2", root);
  assert.match(html, /const b = 2;/);
  assert.doesNotMatch(html, /\r/);
});
