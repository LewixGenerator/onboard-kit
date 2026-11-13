const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, createOnboardingHandler, CLI, tmpProject, filledData, PROJECT_FILES, writeFileSync, readFileSync, existsSync, join, execFileSync } = require("./helpers");

test("CLI init em projeto Next cria JSON e rota", () => {
  const root = tmpProject({ "package.json": JSON.stringify({ dependencies: { next: "16.0.0" } }), "tsconfig.json": "{}", "src/app/page.tsx": "" });
  const out = execFileSync("node", [CLI, "init"], { cwd: root }).toString();
  assert.match(out, /Framework: .*Next\.js/);
  const data = JSON.parse(readFileSync(join(root, "onboarding.json"), "utf8"));
  assert.equal(data.meta.framework, "next");
  assert.ok(existsSync(join(root, "src/app/onboarding/route.ts")));
  // segunda execução não sobrescreve
  writeFileSync(join(root, "onboarding.json"), JSON.stringify({ ...data, project: { ...data.project, name: "X" } }));
  execFileSync("node", [CLI, "init"], { cwd: root });
  assert.equal(JSON.parse(readFileSync(join(root, "onboarding.json"), "utf8")).project.name, "X");
});

test("CLI validate sai com código 1 no template e 0 preenchido", () => {
  const root = tmpProject(PROJECT_FILES);
  execFileSync("node", [CLI, "init", "--framework", "node", "--no-route"], { cwd: root });
  assert.throws(() => execFileSync("node", [CLI, "validate"], { cwd: root, stdio: "pipe" }));
  writeFileSync(join(root, "onboarding.json"), JSON.stringify(filledData()));
  const out = execFileSync("node", [CLI, "validate"], { cwd: root }).toString();
  assert.match(out, /válido/);
});

test("CLI init: Nuxt, SvelteKit, Vite, CRA e projetos sem servidor", () => {
  const nuxt = tmpProject({ "package.json": JSON.stringify({ dependencies: { nuxt: "3" } }), "tsconfig.json": "{}" });
  execFileSync("node", [CLI, "init"], { cwd: nuxt });
  assert.match(readFileSync(join(nuxt, "server/routes/onboarding.ts"), "utf8"), /defineEventHandler/);

  const kitApp = tmpProject({ "package.json": JSON.stringify({ devDependencies: { "@sveltejs/kit": "2" } }) });
  execFileSync("node", [CLI, "init"], { cwd: kitApp });
  assert.ok(existsSync(join(kitApp, "src/routes/onboarding/+server.js")));

  const vite = tmpProject({
    "package.json": JSON.stringify({ devDependencies: { vite: "6", react: "19" } }),
    "vite.config.ts": `import { defineConfig } from "vite";\nexport default defineConfig({ plugins: [react()] });\n`,
  });
  const out = execFileSync("node", [CLI, "init"], { cwd: vite }).toString();
  assert.match(out, /Framework: .*Vite/);
  assert.match(readFileSync(join(vite, "vite.config.ts"), "utf8"), /plugins: \[onboarding\(\), react\(\)\]/);

  const cra = tmpProject({ "package.json": JSON.stringify({ dependencies: { "react-scripts": "5" } }) });
  execFileSync("node", [CLI, "init"], { cwd: cra });
  assert.match(readFileSync(join(cra, "src/setupProxy.js"), "utf8"), /createOnboardingHandler/);

  const rn = tmpProject({ "package.json": JSON.stringify({ name: "app", dependencies: { expo: "52" }, scripts: { start: "expo start" } }, null, 4) + "\n" });
  execFileSync("node", [CLI, "init"], { cwd: rn });
  const pkg = readFileSync(join(rn, "package.json"), "utf8");
  assert.equal(JSON.parse(pkg).scripts.onboarding, "onboarding-kit serve");
  assert.match(pkg, /^ {4}"name"/m);

  const deno = tmpProject({ "deno.json": JSON.stringify({ imports: { hono: "jsr:@hono/hono@^4" } }) });
  const denoOut = execFileSync("node", [CLI, "init"], { cwd: deno }).toString();
  assert.match(denoOut, /Hono/);
  assert.match(denoOut, /onboarding-kit\/fetch/);

  assert.throws(() => execFileSync("node", [CLI, "init", "--framework", "cobol"], { cwd: deno, stdio: "pipe" }));
});

test("CLI init e facts mostram os subprojetos", () => {
  const dir = tmpProject({
    "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*"] }),
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { next: "15" } }),
    "apps/api/package.json": JSON.stringify({ name: "api", dependencies: { fastify: "5" } }),
  });
  const out = execFileSync("node", [CLI, "init", "--no-route"], { cwd: dir, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.match(out, /Subprojetos: 2/);
  const json = JSON.parse(readFileSync(join(dir, "onboarding.json"), "utf8"));
  assert.deepEqual(json.subprojects.map((s) => s.path), ["apps/api", "apps/web"]);

  const facts = execFileSync("node", [CLI, "facts"], { cwd: dir, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.match(facts, /Subprojetos \(2\)/);
  assert.match(facts, /web apps\/web · app · Next\.js/);
});

test("CLI agents cria AGENTS.md e o /onboarding do Claude Code sem duplicar", () => {
  const dir = tmpProject({ "package.json": "{}", "CLAUDE.md": "# Regras\n\nUse TypeScript.\n", ".cursor/.keep": "" });
  const env = { ...process.env, NO_COLOR: "1" };
  const out = execFileSync("node", [CLI, "agents"], { cwd: dir, env }).toString();
  assert.match(out, /Criei AGENTS\.md/);
  assert.match(out, /Atualizei CLAUDE\.md/);
  const claude = readFileSync(join(dir, "CLAUDE.md"), "utf8");
  assert.match(claude, /^# Regras\n\nUse TypeScript\.\n\n<!-- onboarding-kit:start -->/);
  assert.match(readFileSync(join(dir, ".claude/commands/onboarding.md"), "utf8"), /status --fix/);
  assert.ok(existsSync(join(dir, ".cursor/rules/onboarding.mdc")));
  const again = execFileSync("node", [CLI, "agents"], { cwd: dir, env }).toString();
  assert.match(again, /Já estava em dia: CLAUDE\.md/);
  assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf8"), claude);
  assert.equal(kit.upsertBlock("a\n<!-- onboarding-kit:start -->velho<!-- onboarding-kit:end -->\nb", "NOVO"), "a\nNOVO\nb");
});

test("CLI export gera um HTML único e recusa onboarding pendente", () => {
  const dir = tmpProject(PROJECT_FILES);
  const env = { ...process.env, NO_COLOR: "1" };
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(kit.createTemplate({ framework: "node" })));
  assert.throws(() => execFileSync("node", [CLI, "export"], { cwd: dir, env, stdio: "pipe" }), /ainda não foi preenchido/);
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(filledData()));
  const out = execFileSync("node", [CLI, "export", "--out", "site/index.html"], { cwd: dir, env }).toString();
  assert.match(out, /site\/index\.html/);
  const html = readFileSync(join(dir, "site/index.html"), "utf8");
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /Loja/);
  // caminhos absolutos em --out e --badge não são colados no cwd
  const elsewhere = tmpProject();
  execFileSync("node", [CLI, "export", "--out", join(elsewhere, "deck/index.html")], { cwd: dir, env });
  execFileSync("node", [CLI, "validate", "--badge", join(elsewhere, "deck/badge.json")], { cwd: dir, env });
  assert.ok(existsSync(join(elsewhere, "deck/index.html")));
  assert.ok(existsSync(join(elsewhere, "deck/badge.json")));
});

test("CLI fala inglês fora de sistemas em português", () => {
  const env = { ...process.env, ONBOARDING_KIT_LANG: "en_US.UTF-8" };
  const help = execFileSync(process.execPath, [CLI, "--help"], { env }).toString();
  assert.match(help, /project onboarding generated by your local AI/);
  const dir = tmpProject({ "package.json": JSON.stringify({ name: "x", dependencies: { express: "4" } }) });
  const out = execFileSync(process.execPath, [CLI, "init", "--no-route"], { cwd: dir, env }).toString();
  assert.match(out, /Created .*onboarding\.json/);
  assert.equal(JSON.parse(readFileSync(join(dir, "onboarding.json"), "utf8")).meta.language, "en");
});

test("init adiciona o script onboarding em qualquer projeto, com o gerenciador certo", () => {
  const next = tmpProject({ "package.json": JSON.stringify({ name: "web", dependencies: { next: "16.0.0" } }, null, 2) + "\n", "pnpm-lock.yaml": "", "app/page.tsx": "" });
  const out = execFileSync("node", [CLI, "init"], { cwd: next, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.equal(JSON.parse(readFileSync(join(next, "package.json"), "utf8")).scripts.onboarding, "onboarding-kit serve");
  assert.match(out, /Adicionei o script pnpm onboarding/);
  assert.match(out, /ou rode pnpm onboarding/);
  assert.ok(existsSync(join(next, "app/onboarding/route.js")), "a rota continua sendo criada");
  // não duplica nem sobrescreve
  assert.match(execFileSync("node", [CLI, "init"], { cwd: next, env: { ...process.env, NO_COLOR: "1" } }).toString(), /já existe no package.json/);

  const skip = tmpProject({ "package.json": JSON.stringify({ name: "lib" }) });
  execFileSync("node", [CLI, "init", "--no-script"], { cwd: skip });
  assert.equal(JSON.parse(readFileSync(join(skip, "package.json"), "utf8")).scripts, undefined);
});

test("banner do serve mostra projeto, endereço, números e atalhos numa caixa alinhada", () => {
  const { serveBanner } = require("../dist/cli/banner.js");
  const base = { version: "1.2.3", url: "http://localhost:4321", lang: "pt", file: "onboarding.json", readyMs: 12.4, colors: [] };
  const filled = serveBanner(
    { ...base, status: "filled", project: { name: "Loja", tagline: "Venda online" }, slides: 42, chapters: 18, coverage: 75, tracks: [{ id: "frontend", name: "Front" }], generatedAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
    { color: false, truecolor: false },
  );
  assert.match(filled, /onboarding-kit {2}v1\.2\.3/);
  assert.match(filled, /Loja — Venda online/);
  assert.match(filled, /http:\/\/localhost:4321/);
  assert.match(filled, /\/\?trilha=frontend/);
  assert.match(filled, /42 slides .* 18 capítulos .* cobertura 75%/);
  assert.match(filled, /gerado há 2 h/);
  assert.match(filled, /pronto em 12 ms/);
  const box = filled.split("\n").filter((l) => /[╭│╰]/.test(l));
  assert.equal(new Set(box.map((l) => [...l].length)).size, 1, "todas as linhas da caixa têm a mesma largura");

  const pending = serveBanner({ ...base, lang: "en", status: "pending" }, { color: true, truecolor: true });
  assert.match(pending, /Waiting for the AI/);
  assert.match(pending, /\x1b\[38;2;/, "usa cor RGB quando o terminal aceita");
});
