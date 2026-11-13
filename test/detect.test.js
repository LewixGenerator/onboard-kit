const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, cli, tmpProject } = require("./helpers");

test("detectFramework e patch do app.module do Nest", () => {
  assert.equal(cli.detectFramework({ dependencies: { next: "15" } }), "next");
  assert.equal(cli.detectFramework({ dependencies: { "@nestjs/core": "11" } }), "nest");
  assert.equal(cli.detectFramework({ dependencies: { express: "4" } }), "express");
  assert.equal(cli.detectFramework({ private: true, dependencies: { lodash: "4" } }), "node");

  const src = `import { Module } from '@nestjs/common';\n@Module({\n  imports: [UsersModule],\n})\nexport class AppModule {}\n`;
  const patched = cli.patchNestAppModule(src);
  assert.match(patched, /^import \{ OnboardingModule \} from "onboarding-kit\/nest";/);
  assert.match(patched, /imports: \[OnboardingModule\.register\(\), UsersModule\]/);
  assert.equal(cli.patchNestAppModule(patched), patched);
  assert.match(cli.patchNestAppModule("@Module({ imports: [ ] })"), /imports: \[OnboardingModule\.register\(\)\]/);
  assert.equal(cli.patchNestAppModule("@Module({ imports: [A] }) @Module({ imports: [B] })"), undefined);
});

test("detectFramework reconhece o ecossistema JavaScript", () => {
  const cases = {
    nuxt: { nuxt: "3" },
    sveltekit: { "@sveltejs/kit": "2", vite: "5" },
    astro: { astro: "5", react: "19" },
    remix: { "@react-router/dev": "7", vite: "6" },
    gatsby: { gatsby: "5" },
    adonis: { "@adonisjs/core": "6" },
    fastify: { fastify: "5" },
    koa: { koa: "2" },
    hono: { hono: "4" },
    elysia: { elysia: "1" },
    angular: { "@angular/core": "19" },
    vite: { vite: "6", vue: "3" },
    cra: { "react-scripts": "5" },
    webpack: { "@vue/cli-service": "5" },
    "react-native": { expo: "52", "react-native": "0.76" },
    electron: { electron: "33", vite: "6" },
  };
  for (const [expected, deps] of Object.entries(cases)) assert.equal(cli.detectFramework({ devDependencies: deps }), expected, expected);
  assert.equal(cli.detectFramework({ name: "lib", main: "index.js" }), "library");
  assert.equal(cli.detectFramework({ name: "tool", private: true, bin: { tool: "cli.js" } }), "library");
  // Deno: mapa de imports do deno.json
  assert.equal(cli.detectFramework(undefined, { imports: { "@hono/hono": "jsr:@hono/hono@^4" } }), "hono");
  // todo framework tem instrução própria para a IA
  for (const { id } of kit.FRAMEWORKS) assert.ok(kit.createTemplate({ framework: id })._instructions.framework.length > 40, id);
});

test("detectProject: UI, linguagem, runtime e linguagens no facts", () => {
  const root = tmpProject({
    "package.json": JSON.stringify({ type: "module", devDependencies: { vite: "6", vue: "3", rescript: "11" } }),
    "pnpm-lock.yaml": "",
    "tsconfig.json": "{}",
    "src/App.vue": "<template><div/></template>",
    "src/main.ts": "",
    "src/Button.res": "",
    "src/style.styl": "",
  });
  const p = kit.detectProject(root);
  assert.equal(p.framework, "vite");
  assert.deepEqual(p.ui, ["Vue"]);
  assert.equal(p.language, "TypeScript");
  assert.deepEqual(p.compileToJs, ["ReScript"]);
  assert.equal(p.moduleSystem, "ESM");
  assert.equal(p.packageManager, "pnpm");
  const facts = require("../dist/facts.js").collectFacts(root);
  const langs = facts.languages.map((l) => l.name);
  for (const l of ["Vue", "TypeScript", "ReScript", "Stylus"]) assert.ok(langs.includes(l), l);
  assert.match(cli.formatFacts(facts), /UI: Vue/);
});

test("patchViteConfig adiciona o plugin com segurança", () => {
  const esm = `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({\n  plugins: [react()],\n});\n`;
  const patched = cli.patchViteConfig(esm);
  assert.match(patched, /^import \{ onboarding \} from "onboarding-kit\/vite";/);
  assert.match(patched, /plugins: \[onboarding\(\), react\(\)\]/);
  assert.equal(cli.patchViteConfig(patched), patched);
  assert.match(cli.patchViteConfig(`export default defineConfig({ plugins: [] })`), /plugins: \[onboarding\(\)\]/);
  assert.match(cli.patchViteConfig(`export default defineConfig({\n  server: { port: 3000 },\n})`), /plugins: \[onboarding\(\)\],\n  server/);
  assert.match(cli.patchViteConfig(`const { defineConfig } = require("vite");\nmodule.exports = defineConfig({ plugins: [vue()] });`), /^const \{ onboarding \} = require/);
  assert.equal(cli.patchViteConfig(`export default { plugins: [a()], worker: { plugins: [b()] } }`), undefined);
});

test("detectSubprojects lê workspaces (npm, pnpm, exclusões) e dependências internas", () => {
  const dir = tmpProject({
    "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*", "packages/*", "!packages/legacy"] }),
    "turbo.json": "{}",
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { next: "15", react: "19", "@acme/ui": "workspace:*" } }),
    "apps/api/package.json": JSON.stringify({ name: "api", dependencies: { "@nestjs/core": "11", "@acme/config": "*" } }),
    "packages/ui/package.json": JSON.stringify({ name: "@acme/ui", main: "index.js", dependencies: { react: "19" } }),
    "packages/config/package.json": JSON.stringify({ name: "@acme/config", private: true }),
    "packages/legacy/package.json": JSON.stringify({ name: "legacy" }),
    "packages/notes/README.md": "sem package.json",
  });
  const subs = kit.detectSubprojects(dir);
  assert.deepEqual(subs.map((s) => s.path), ["apps/api", "apps/web", "packages/config", "packages/ui"]);
  const web = subs.find((s) => s.name === "web");
  assert.equal(web.framework, "next");
  assert.equal(web.kind, "app");
  assert.deepEqual(web.ui, ["React"]);
  assert.deepEqual(web.dependsOn, ["@acme/ui"]);
  assert.equal(subs.find((s) => s.name === "@acme/ui").kind, "package");
  assert.equal(subs.find((s) => s.name === "@acme/config").kind, "package");

  const profile = kit.detectProject(dir);
  assert.match(profile.monorepo, /Turborepo/);
  assert.match(profile.monorepo, /workspaces/);
  assert.equal(profile.subprojects.length, 4);

  const pnpm = tmpProject({
    "package.json": JSON.stringify({ name: "root", private: true }),
    "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n  - \"tools/**\" # tudo\ncatalog:\n  react: ^19\n",
    "apps/site/package.json": JSON.stringify({ name: "site", devDependencies: { astro: "5" } }),
    "tools/scripts/cli/package.json": JSON.stringify({ name: "cli", bin: "index.js" }),
  });
  assert.deepEqual(kit.detectSubprojects(pnpm).map((s) => [s.path, s.framework]), [["apps/site", "astro"], ["tools/scripts/cli", "library"]]);
  assert.deepEqual(kit.expandWorkspacePattern(pnpm, "apps/{site,docs}"), ["apps/site"]);
});

test("detectSubprojects acha projetos sem workspace e ignora projeto único", () => {
  const multi = tmpProject({
    "README.md": "# dois projetos",
    "frontend/package.json": JSON.stringify({ name: "frontend", devDependencies: { vite: "6", vue: "3" } }),
    "backend/package.json": JSON.stringify({ name: "backend", dependencies: { express: "5" }, scripts: { start: "node ." } }),
    "frontend/node_modules/vue/package.json": JSON.stringify({ name: "vue" }),
    "test/fixtures/app/package.json": JSON.stringify({ name: "fixture" }),
  });
  assert.deepEqual(kit.detectSubprojects(multi).map((s) => `${s.name}:${s.framework}:${s.kind}`), ["backend:express:app", "frontend:vite:app"]);
  assert.equal(kit.detectProject(multi).monorepo, "vários projetos sem workspace");

  const single = tmpProject({ "package.json": JSON.stringify({ name: "solo", dependencies: { express: "5" } }), "src/index.js": "" });
  assert.deepEqual(kit.detectSubprojects(single), []);
  assert.equal(kit.detectProject(single).monorepo, undefined);
});
