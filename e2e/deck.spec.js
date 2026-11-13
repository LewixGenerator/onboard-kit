/* Navegação, deep links, busca, impressão e layout do deck exportado (usa o onboarding.json do próprio repositório). */
const { test, expect } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = join(__dirname, "..");
let deck;
let translated;
let errors = [];

test.beforeAll(() => {
  const out = join(mkdtempSync(join(tmpdir(), "onboarding-e2e-")), "onboarding.html");
  execFileSync(process.execPath, [join(ROOT, "dist/cli/index.js"), "export", "--out", out], { cwd: ROOT });
  deck = pathToFileURL(out).href;

  // cópia com tradução para inglês: translate gera o arquivo de trabalho, a "IA" traduz, translate guarda
  const dir = mkdtempSync(join(tmpdir(), "onboarding-e2e-lang-"));
  writeFileSync(join(dir, "onboarding.json"), readFileSync(join(ROOT, "onboarding.json")));
  const cli = (...args) => execFileSync(process.execPath, [join(ROOT, "dist/cli/index.js"), ...args], { cwd: dir });
  cli("translate", "--to", "en");
  const todo = JSON.parse(readFileSync(join(dir, "onboarding.en.todo.json"), "utf8"));
  for (const key of Object.keys(todo.strings)) todo.strings[key] = `EN ${todo.strings[key]}`;
  writeFileSync(join(dir, "onboarding.en.todo.json"), JSON.stringify(todo));
  cli("translate", "--to", "en");
  cli("export", "--out", "site/index.html");
  translated = pathToFileURL(join(dir, "site/index.html")).href;
});

const active = (page) => page.locator(".slide.is-active");

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript(() => localStorage.clear());
});

test("abre no primeiro slide e navega pelo teclado", async ({ page }, info) => {
  await page.goto(deck);
  await expect(active(page)).toHaveAttribute("id", "slide-1");
  await page.keyboard.press("ArrowRight");
  await expect(active(page)).toHaveAttribute("id", "slide-2");
  await expect(page).toHaveURL(/#\/.+/);
  await page.keyboard.press("ArrowLeft");
  await expect(active(page)).toHaveAttribute("id", "slide-1");
  await info.attach("welcome", { body: await page.screenshot(), contentType: "image/png" });
});

test("deep link por capítulo e por número", async ({ page }) => {
  const anchor = await (async () => {
    await page.goto(deck);
    return page.locator("#slide-4").getAttribute("data-anchor");
  })();
  await page.goto(`${deck}#/${anchor}`);
  await expect(active(page)).toHaveAttribute("id", "slide-4");
  await page.goto(`${deck}#/3`);
  await page.reload();
  await expect(active(page)).toHaveAttribute("id", "slide-3");
});

test("busca com Ctrl+K leva ao slide encontrado", async ({ page }) => {
  await page.goto(deck);
  await page.keyboard.press("Control+k");
  await expect(page.locator("#ok-search")).toHaveClass(/is-open/);
  await page.locator("#ok-search-input").fill("onboarding");
  const first = page.locator("#ok-results button").first();
  await expect(first).toBeVisible();
  const target = await first.getAttribute("data-go");
  await page.keyboard.press("Enter");
  await expect(page.locator("#ok-search")).not.toHaveClass(/is-open/);
  await expect(active(page)).toHaveAttribute("id", `slide-${Number(target) + 1}`);
});

test("nenhum slide estoura a largura no desktop e no celular", async ({ page }, info) => {
  test.setTimeout(120_000);
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(deck);
    const total = await page.locator(".slide").count();
    for (let i = 1; i <= total; i++) {
      await page.goto(`${deck}#/${i}`);
      await page.reload();
      const overflow = await active(page).evaluate((s) => s.scrollWidth - s.clientWidth);
      expect(overflow, `slide ${i} em ${viewport.width}px`).toBeLessThanOrEqual(1);
    }
    await info.attach(`ultimo-${viewport.width}`, { body: await page.screenshot(), contentType: "image/png" });
  }
});

test("impressão mostra todos os slides e esconde a interface", async ({ page }) => {
  await page.goto(deck);
  await page.emulateMedia({ media: "print" });
  const total = await page.locator(".slide").count();
  await expect(page.locator(".slide:visible")).toHaveCount(total);
  await expect(page.locator(".topbar")).toBeHidden();
});

test("na impressão os cartões do vocabulário saem sem espelhar, com termo e definição", async ({ page }) => {
  await page.goto(deck);
  await page.emulateMedia({ media: "print" });
  const cards = page.locator(".flip");
  test.skip((await cards.count()) === 0, "o onboarding não tem glossário");
  const layout = await cards.evaluateAll((all) =>
    all.map((card) => {
      const inner = card.querySelector(".flip-inner");
      const front = card.querySelector(".front").getBoundingClientRect();
      const back = card.querySelector(".back");
      return { inner: getComputedStyle(inner).transform, back: getComputedStyle(back).transform, stacked: back.getBoundingClientRect().top >= front.bottom - 1 };
    }),
  );
  for (const card of layout) expect(card).toEqual({ inner: "none", back: "none", stacked: true });
  // mesmo um cartão virado antes de imprimir sai do lado certo
  await page.emulateMedia({ media: "screen" });
  await page.goto(`${deck}#/${await page.locator(".slide:has(.flip)").first().getAttribute("data-anchor")}`);
  await page.reload();
  await cards.first().click();
  await page.emulateMedia({ media: "print" });
  await expect(cards.first().locator(".flip-inner")).toHaveCSS("transform", "none");
});

test("seletor de idioma troca entre as versões exportadas", async ({ page }) => {
  await page.goto(translated);
  await expect(page.locator(".langs a[aria-current]")).toHaveText("PT");
  await page.locator(".langs a", { hasText: "EN" }).click();
  await expect(page).toHaveURL(/index\.en\.html/);
  await expect(page.locator(".langs a[aria-current]")).toHaveText("EN");
  await expect(page.locator(".slide.is-active")).toContainText("Welcome");
  await expect(page.locator(".slide.is-active")).toContainText("EN ");
  await expect(page.locator(".untranslated")).toHaveCount(0);
});

test("a barra do topo cabe no celular, com o seletor de idioma", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(translated);
  await expect(page.locator(".langs a")).toHaveCount(2);
  const overflow = await page.locator(".topbar").evaluate((bar) => Math.max(...[...bar.children].map((el) => el.getBoundingClientRect().right)) - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test.afterEach(async () => {
  expect(errors, "erros de JavaScript na página").toEqual([]);
});
