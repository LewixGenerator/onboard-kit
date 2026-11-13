const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, tmpProject, filledData, writeFileSync, join, execFileSync } = require("./helpers");
const { mkdirSync } = require("node:fs");

/** Repositório com histórico controlado: cada commit tem autor, data e arquivos. */
function history(steps) {
  const dir = tmpProject({});
  const git = (args, env = {}) => execFileSync("git", args, { cwd: dir, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "ignore"] }).toString();
  git(["init", "-q"]);
  for (const { author, daysAgo, message, files } of steps) {
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(join(dir, file, ".."), { recursive: true });
      writeFileSync(join(dir, file), content);
    }
    const date = new Date(Date.now() - daysAgo * 864e5).toISOString();
    git(["add", "-A"]);
    git(["-c", `user.name=${author}`, "-c", `user.email=${author}@t`, "commit", "-q", "--allow-empty", "-m", message], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
  }
  return dir;
}

const big = (n, tag) => Array.from({ length: n }, (_, i) => `const line${i} = "${tag}";`).join("\n");

test("sinais: pontos críticos, conhecimento concentrado, dívida antiga, acoplamento, entregas, ritmo e camadas", () => {
  const steps = [
    { author: "ana", daysAgo: 700, message: "init", files: { "src/legacy/old.ts": "// TODO: remover isso\nexport const a = 1;\n// FIXME: e isso\n", "src/legacy/older.ts": "// HACK: contorno\n", "src/domain/order.ts": 'import { db } from "../infra/db";\nexport const order = 1;\n', "src/infra/db.ts": "export const db = 1;\n" } },
  ];
  // checkout: grande e muda o tempo todo, sempre junto com o cliente de pagamento (outra pasta)
  for (let i = 0; i < 12; i++) {
    steps.push({
      author: i % 6 === 0 ? "bia" : "ana",
      daysAgo: 170 - i * 3,
      message: i === 3 ? "hotfix: checkout quebrado" : i === 5 ? 'Revert "feat: novo checkout"' : `feat: checkout ${i}`,
      files: { "src/checkout/checkout.ts": big(500, i), "src/payments/client.ts": `export const v = ${i};\n` },
    });
  }
  // ritmo: muito antes, pouco agora
  for (let i = 0; i < 12; i++) steps.push({ author: "bia", daysAgo: 160 - i, message: `chore: ${i}`, files: { "src/misc.ts": `export const m = ${i};\n` } });
  steps.push({ author: "ana", daysAgo: 5, message: "fix: ajuste", files: { "src/misc.ts": "export const m = 99;\n" } });
  const root = history(steps);
  const s = kit.projectSignals(root);

  const checkout = s.quadrant.find((q) => q.file === "src/checkout/checkout.ts");
  assert.equal(checkout.commits, 12);
  assert.ok(checkout.lines >= 500);
  assert.ok(s.ownership.some((o) => o.area === "src/checkout" && o.share >= 0.8));
  assert.ok(!JSON.stringify(s.ownership).includes("ana"), "sem nomes de pessoas");
  assert.equal(s.debtAge.overYear, 3);
  assert.ok(s.debtAge.oldest.days >= 690);
  assert.deepEqual(s.coChange.map((p) => [p.a, p.b]), [["src/checkout/checkout.ts", "src/payments/client.ts"]]);
  assert.deepEqual({ r: s.delivery.reverts, h: s.delivery.hotfixes }, { r: 1, h: 1 });
  assert.deepEqual(s.drift.map((d) => `${d.file}:${d.line}`), ["src/domain/order.ts:1"]);

  const ids = kit.highlights(s).map((h) => h.id);
  for (const id of ["quadrant", "ownership", "debtAge", "trend", "coChange", "drift"]) assert.ok(ids.includes(id), id);

  const html = kit.renderOnboarding(filledData(), { root });
  const slide = html.match(/<section class="slide"[^>]*data-kind="signals"[\s\S]*?<\/section>/)?.[0] ?? html.match(/Sinais que merecem atenção[\s\S]*?<\/section>/)?.[0];
  assert.ok(slide, "slide de sinais");
  assert.equal((slide.match(/class="card signal"/g) ?? []).length, 3, "no máximo 3 sinais");
  assert.match(html, /<svg class="spark"/, "minigráfico de atividade");
});

test("sinais somem quando não há nada fora do normal", () => {
  const root = history([{ author: "ana", daysAgo: 3, message: "init", files: { "src/a.ts": "export const a = 1;\n" } }]);
  assert.deepEqual(kit.highlights(kit.projectSignals(root)), []);
  assert.doesNotMatch(kit.renderOnboarding(filledData(), { root }), /Sinais que merecem atenção/);
});

test("módulos sem teste só quando os testes ficam ao lado do código", () => {
  const files = {};
  for (let i = 0; i < 4; i++) {
    files[`src/orders/o${i}.ts`] = "x";
    files[`src/orders/o${i}.test.ts`] = "x";
  }
  for (let i = 0; i < 6; i++) files[`src/billing/b${i}.ts`] = "x";
  const root = history([{ author: "ana", daysAgo: 1, message: "init", files }]);
  assert.deepEqual(kit.projectSignals(root).untested, [{ area: "src/billing", source: 6 }]);
  const separate = history([{ author: "ana", daysAgo: 1, message: "init", files: { "src/a.py": "", "src/b.py": "", "src/c.py": "", "src/d.py": "", "src/e.py": "", "tests/test_a.py": "", "tests/test_b.py": "", "tests/test_c.py": "" } }]);
  assert.deepEqual(kit.projectSignals(separate).untested, []);
});
