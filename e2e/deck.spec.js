/* Navegação, deep links, busca, impressão e layout do deck exportado (usa o onboarding.json do próprio repositório). */
const { test, expect } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const { mkdtempSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = join(__dirname, "..");
let deck;
let errors = [];

test.beforeAll(() => {
  const out = join(mkdtempSync(join(tmpdir(), "onboarding-e2e-")), "onboarding.html");
  execFileSync(process.execPath, [join(ROOT, "dist/cli/index.js"), "export", "--out", out], { cwd: ROOT });
  deck = pathToFileURL(out).href;
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

test.afterEach(async () => {
  expect(errors, "erros de JavaScript na página").toEqual([]);
});
