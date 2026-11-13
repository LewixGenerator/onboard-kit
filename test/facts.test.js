const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cli, tmpProject, execFileSync } = require("./helpers");

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
