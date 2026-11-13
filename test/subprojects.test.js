const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, cli, CLI, tmpProject, filledData, readFileSync, existsSync, join, execFileSync } = require("./helpers");

test("template, validate e render com subprojetos", () => {
  const dir = tmpProject({
    "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*", "packages/*"] }),
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { vite: "6", react: "19", ui: "*" } }),
    "packages/ui/package.json": JSON.stringify({ name: "ui", main: "index.js" }),
    "src/index.js": "// app\nmodule.exports = {};\n",
  });
  const subprojects = kit.detectSubprojects(dir);
  const template = kit.createTemplate({ framework: "node", subprojects });
  assert.deepEqual(template.subprojects.map((s) => [s.name, s.path, s.framework, s.dependsOn]), [
    ["web", "apps/web", "Vite · React", ["ui"]],
    ["ui", "packages/ui", "Biblioteca / CLI", []],
  ]);
  assert.match(template._instructions.monorepo.readme, /2 projetos/);
  assert.ok(Object.keys(template._instructions.monorepo.frameworks).some((k) => k.startsWith("Vite") && k.includes("apps/web")));
  assert.equal(kit.createTemplate({ framework: "node" })._instructions.monorepo, undefined);
  assert.deepEqual(kit.createTemplate({ framework: "node" }).subprojects, []);

  const data = filledData();
  data.subprojects = template.subprojects.map((s) => ({ ...s, description: "", kind: "app" }));
  let issues = kit.validateOnboarding(data, { root: dir });
  assert.ok(issues.some((i) => i.path === "subprojects[0].description" && i.level === "error"));

  data.subprojects[0].description = "O site da loja";
  data.subprojects[0].command = "npm run dev -w apps/web";
  data.subprojects[0].dependsOn = ["ui", "fantasma"];
  data.subprojects[1].description = "Componentes <compartilhados>";
  data.subprojects[1].path = "packages/nao-existe";
  issues = kit.validateOnboarding(data, { root: dir });
  assert.ok(issues.some((i) => i.path === "subprojects[0].dependsOn[1]" && i.level === "warning"));
  assert.ok(issues.some((i) => i.path === "subprojects[1].path" && i.level === "error"));

  data.subprojects[1].path = "packages/ui";
  const html = kit.renderOnboarding(data);
  assert.match(html, /Os projetos deste repositório/);
  assert.match(html, /npm run dev -w apps\/web/);
  assert.match(html, /usado por: web/);
  assert.match(html, /Componentes &lt;compartilhados&gt;/);
  assert.doesNotMatch(kit.renderOnboarding(filledData()), /Os projetos deste repositório/);
});

test("init em monorepo cria a rota no web app apontando para o JSON da raiz", () => {
  const dir = tmpProject({
    "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*", "packages/*"] }),
    "pnpm-lock.yaml": "",
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { next: "15" } }),
    "apps/web/app/page.tsx": "",
    "apps/web/tsconfig.json": "{}",
    "apps/api/package.json": JSON.stringify({ name: "api", dependencies: { "@nestjs/core": "11" } }),
    "apps/admin/package.json": JSON.stringify({ name: "admin", devDependencies: { vite: "6", "onboarding-kit": "*" } }),
    "apps/admin/vite.config.ts": 'import { defineConfig } from "vite";\nexport default defineConfig({ plugins: [] });\n',
    "packages/ui/package.json": JSON.stringify({ name: "ui", main: "index.js" }),
  });
  const env = { ...process.env, NO_COLOR: "1" };
  const out = execFileSync("node", [CLI, "init"], { cwd: dir, env }).toString();
  assert.match(out, /Rota no subprojeto apps\/web/);
  assert.match(out, /pnpm add -D onboarding-kit --filter web/);
  const route = readFileSync(join(dir, "apps/web/app/onboarding/route.ts"), "utf8");
  assert.match(route, /createOnboardingRoute\(\{ file: "\.\.\/\.\.\/onboarding\.json" \}\)/);
  assert.equal(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).scripts.onboarding, "onboarding-kit serve");

  const chosen = execFileSync("node", [CLI, "init", "--project", "admin"], { cwd: dir, env }).toString();
  assert.match(chosen, /Rota no subprojeto apps\/admin/);
  assert.doesNotMatch(chosen, /Instale o kit/);
  assert.match(readFileSync(join(dir, "apps/admin/vite.config.ts"), "utf8"), /plugins: \[onboarding\(\{ file: "\.\.\/\.\.\/onboarding\.json" \}\)\]/);

  assert.throws(() => execFileSync("node", [CLI, "init", "--project", "nada"], { cwd: dir, env, stdio: "pipe" }), /Subprojeto não encontrado/);
  assert.equal(cli.pickRouteHost("next", [{ framework: "next" }]), undefined);
  assert.match(cli.withFile("defineEventHandler(() => onboarding()); createOnboardingFetchHandler()", "../x.json"), /onboarding\(\)\); createOnboardingFetchHandler\(\{ file: "\.\.\/x\.json" \}\)/);
  assert.match(cli.patchNestAppModule("@Module({ imports: [] })", "../../onboarding.json"), /OnboardingModule\.register\(\{ file: "\.\.\/\.\.\/onboarding\.json" \}\)/);
});

test("facts --project e TODOs agrupados por subprojeto", () => {
  const dir = tmpProject({
    "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*"] }),
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { vite: "6", react: "19" } }),
    "apps/web/src/a.ts": "// TODO: web 1\n// TODO: web 2\n",
    "apps/web/src/a.test.ts": "",
    "apps/api/package.json": JSON.stringify({ name: "api", dependencies: { express: "5" } }),
    "apps/api/index.js": "// FIXME: api\n",
  });
  const all = kit.collectFacts(dir);
  assert.deepEqual(all.markers.byFolder, { "apps/web": 2, "apps/api": 1 });

  const web = kit.collectFacts(dir, { project: "apps/web" });
  assert.equal(web.scope, "apps/web");
  assert.equal(web.project.framework, "vite");
  assert.deepEqual(web.project.ui, ["React"]);
  assert.equal(web.markers.items.length, 2);
  assert.ok(web.markers.items.every((m) => m.file.startsWith("apps/web/")));
  assert.equal(web.tests.testFiles, 1);

  const out = execFileSync("node", [CLI, "facts", "--project", "api"], { cwd: dir, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.match(out, /## Projeto apps\/api/);
  assert.match(out, /framework: Express/);
});

test("render desenha o diagrama de dependências entre subprojetos", () => {
  assert.equal(kit.dependencyDiagram([{ name: "a", dependsOn: [] }]), "");
  assert.equal(kit.dependencyDiagram([{ name: "web", dependsOn: ["ui", "fora"] }, { name: "ui" }]), 'graph LR\n  p0["web"]\n  p1["ui"]\n  p0 --> p1');
  const data = filledData();
  data.architecture.diagram = "";
  data.subprojects = [
    { name: "web", path: "src", kind: "app", framework: "Next.js", description: "Site", dependsOn: ["ui"], command: "" },
    { name: "ui", path: "src", kind: "lib", framework: "", description: "Componentes", dependsOn: [], command: "" },
  ];
  const html = kit.renderOnboarding(data);
  assert.match(html, /Como os projetos se conectam/);
  assert.match(html, /mermaid/);
});
