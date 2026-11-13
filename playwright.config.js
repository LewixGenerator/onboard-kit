// Testes de navegador do deck exportado. Localmente, PW_CHANNEL=chrome usa o Chrome instalado.
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { browserName: "chromium", channel: process.env.PW_CHANNEL || undefined, viewport: { width: 1280, height: 800 } },
});
