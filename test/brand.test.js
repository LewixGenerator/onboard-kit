const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, tmpProject, filledData, PROJECT_FILES } = require("./helpers");

test("parseColor entende hex, rgb, hsl, trio do shadcn, oklch e nomes do Tailwind", () => {
  assert.equal(kit.toHex(kit.parseColor("#4F46E5")), "#4f46e5");
  assert.equal(kit.toHex(kit.parseColor("#fff")), "#ffffff");
  assert.equal(kit.toHex(kit.parseColor("rgb(79, 70, 229)")), "#4f46e5");
  assert.equal(Math.round(kit.parseColor("hsl(243 75% 59%)").h), 243);
  assert.equal(Math.round(kit.parseColor("243.4 75.4% 58.6%").h), 243);
  const ok = kit.parseColor("oklch(0.511 0.262 276.966)");
  assert.ok(ok.h > 235 && ok.h < 250, `oklch indigo, h=${ok.h}`);
  assert.equal(kit.toHex(kit.parseColor("indigo")), "#6366f1");
  assert.equal(kit.parseColor("var(--primary)"), undefined);
});

test("resolveBrand detecta cores do Tailwind/CSS e o logo em public/", () => {
  const root = tmpProject({
    "package.json": "{}",
    "tailwind.config.ts": `export default { theme: { extend: { colors: { primary: { DEFAULT: "#e11d48", foreground: "#fff" }, secondary: colors.amber } } } }`,
    "src/app/globals.css": `:root { --background: 0 0% 100%; --primary-foreground: 0 0% 98%; --accent: 199 89% 48%; }`,
    "public/next.svg": "<svg/>",
    "public/logo.svg": '<svg xmlns="http://www.w3.org/2000/svg"/>',
    "public/favicon.ico": "ico",
  });
  const brand = kit.resolveBrand(undefined, root);
  assert.equal(kit.toHex(brand.colors[0]), "#e11d48");
  assert.equal(brand.colors.length, 3);
  assert.match(brand.logo, /^data:image\/svg\+xml;base64,/);
  assert.equal(Buffer.from(brand.logo.split(",")[1], "base64").toString(), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  assert.match(brand.favicon, /^data:image\/x-icon;base64,/);

  // o que a IA preencheu tem prioridade, e caminhos fora do repo são ignorados
  const declared = kit.resolveBrand({ brand: { primaryColor: "#16a34a", palette: [], logo: "../fora.svg", favicon: "", evidence: [] } }, root);
  assert.equal(kit.toHex(declared.colors[0]), "#16a34a");
  assert.match(declared.logo, /^data:image\/svg\+xml/);
});

test("render aplica as cores e o logo da marca", () => {
  const root = tmpProject({ ...PROJECT_FILES, "public/logo.png": "png" });
  const data = filledData();
  data.brand = { primaryColor: "#e11d48", palette: ["#f59e0b"], logo: "public/logo.png", favicon: "", evidence: [] };
  const html = kit.renderOnboarding(data, { root });
  assert.match(html, /data-palette="#e11d48 #f59e0b"/);
  assert.match(html, /<link rel="icon" href="data:image\/png;base64,/);
  assert.match(html, /class="brand-logo"><img src="data:image\/png/);
  assert.match(html, /data-chapter="welcome"[^>]*style="--h:347"/);
  assert.match(html, /id="ok-wipe"/);

  // marca preta/cinza vira tema monocromático
  data.brand = { primaryColor: "#111111", palette: [], logo: "", favicon: "", evidence: [] };
  assert.match(kit.renderOnboarding(data), /<html lang="pt-BR" data-mono/);
});

test("cores da marca em Expo, Vuetify e blocos <style> de Vue", () => {
  const expo = tmpProject({ "app.json": JSON.stringify({ expo: { name: "x", primaryColor: "#e11d48" } }) });
  assert.equal(kit.toHex(kit.resolveBrand({}, expo).colors[0]), "#e11d48");
  const vue = tmpProject({ "src/App.vue": "<template/>\n<style>\n:root { --brand: #0ea5e9; }\n</style>" });
  assert.equal(kit.toHex(kit.resolveBrand({}, vue).colors[0]), "#0ea5e9");
});
