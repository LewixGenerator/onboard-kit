const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, CLI, tmpProject, writeFileSync, readFileSync, join, execFileSync } = require("./helpers");

const COMPOSER = JSON.stringify({
  name: "acme/loja",
  require: { php: "^8.2", "ext-json": "*", "laravel/framework": "^11.0", "stripe/stripe-php": "^13", "sentry/sentry-laravel": "^4", "predis/predis": "^2" },
  "require-dev": { "pestphp/pest": "^2", "larastan/larastan": "^2", "laravel/pint": "^1" },
  scripts: { test: "pest", lint: "pint", "post-autoload-dump": "x" },
});

test("PHP: Laravel pelo composer.json, comandos, ferramentas, licenças e integrações", () => {
  const root = tmpProject({
    "composer.json": COMPOSER,
    "composer.lock": JSON.stringify({ packages: [{ name: "laravel/framework", license: ["MIT"] }, { name: "predis/predis", license: ["AGPL-3.0"] }] }),
    artisan: "",
    "package.json": JSON.stringify({ devDependencies: { vite: "5", "laravel-vite-plugin": "1" } }),
    "app/Models/Order.php": "<?php\n// TODO: frete internacional\nclass Order {}\n",
    "tests/Feature/OrderTest.php": "<?php\n",
  });
  const [php] = kit.detectEcosystems(root);
  assert.equal(php.framework, "laravel");
  assert.deepEqual(Object.keys(php.dependencies), ["laravel/framework", "stripe/stripe-php", "sentry/sentry-laravel", "predis/predis"]);
  assert.deepEqual(php.commands.map((c) => c.command), ["composer test", "composer lint", "php artisan serve", "php artisan migrate", "php artisan test"]);
  assert.deepEqual(php.testTools, ["pest"]);
  assert.deepEqual(php.qualityTools, ["larastan", "pint"]);

  // o package.json do Vite só empacota assets: o app é Laravel
  const profile = kit.detectProject(root);
  assert.equal(profile.framework, "laravel");
  assert.equal(profile.language, "PHP");
  assert.equal(profile.packageManager, "composer");

  const names = kit.detectIntegrations(root).map((i) => i.name).sort();
  assert.deepEqual(names, ["Redis", "Sentry", "Stripe"]);
  const health = kit.projectHealth(root);
  assert.equal(health.dependencies.total, 7 + 2);
  assert.deepEqual(health.dependencies.restrictive, [{ name: "predis/predis", license: "AGPL-3.0" }]);
  assert.equal(health.tests.testFiles, 1);
});

test("init em projeto PHP sem package.json: composer onboarding e rota só em dev", () => {
  const root = tmpProject({ "composer.json": COMPOSER, artisan: "" });
  const out = execFileSync("node", [CLI, "init"], { cwd: root, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.match(out, /Framework: Laravel/);
  assert.match(out, /app\(\)->environment\('local'\)/);
  assert.match(out, /composer onboarding/);
  const composer = JSON.parse(readFileSync(join(root, "composer.json"), "utf8"));
  assert.deepEqual(composer.scripts.onboarding, ["Composer\\Config::disableProcessTimeout", "npx onboarding-kit serve"]);
  assert.equal(composer.scripts.test, "pest", "os scripts do projeto continuam lá");
  assert.equal(JSON.parse(readFileSync(join(root, "onboarding.json"), "utf8")).meta.framework, "laravel");
});

test("init em projeto Laravel com package.json não mexe no package.json", () => {
  const pkg = JSON.stringify({ devDependencies: { vite: "5" } });
  const root = tmpProject({ "composer.json": COMPOSER, "package.json": pkg, "vite.config.js": "export default {}\n" });
  execFileSync("node", [CLI, "init"], { cwd: root, env: { ...process.env, NO_COLOR: "1" } });
  assert.equal(readFileSync(join(root, "package.json"), "utf8"), pkg);
  assert.equal(readFileSync(join(root, "vite.config.js"), "utf8"), "export default {}\n");
});

test("Python: pyproject (PEP 621 e Poetry), requirements, Django e FastAPI", () => {
  const pep621 = tmpProject({
    "pyproject.toml": `[project]
name = "api"
dependencies = [
  "fastapi>=0.110",
  "SQLAlchemy[asyncio]==2.0.29",  # banco
  "boto3",
]

[dependency-groups]
dev = ["pytest>=8", "ruff"]
`,
    "uv.lock": "",
  });
  const [py] = kit.detectEcosystems(pep621);
  assert.equal(py.framework, "fastapi");
  assert.equal(py.packageManager, "uv");
  assert.deepEqual(py.dependencies, { fastapi: ">=0.110", sqlalchemy: "==2.0.29", boto3: "" });
  assert.deepEqual(py.testTools, ["pytest"]);
  assert.deepEqual(py.qualityTools, ["ruff"]);
  assert.ok(py.commands.some((c) => c.command === "uv run pytest"));
  assert.deepEqual(kit.detectIntegrations(pep621).map((i) => i.name).sort(), ["AWS", "SQLAlchemy"]);

  const poetry = tmpProject({ "pyproject.toml": '[tool.poetry.dependencies]\npython = "^3.12"\ndjango = "^5.0"\ncelery = { version = "^5", extras = ["redis"] }\n\n[tool.poetry.group.dev.dependencies]\npytest-django = "^4"\n', "poetry.lock": "", "manage.py": "" });
  const [dj] = kit.detectEcosystems(poetry);
  assert.equal(dj.framework, "django");
  assert.deepEqual(Object.keys(dj.dependencies), ["django", "celery"]);
  assert.ok(dj.commands.some((c) => c.command === "poetry run python manage.py runserver"));

  const reqs = tmpProject({ "requirements.txt": "flask==3.0\n# comentário\n-r base.txt\nstripe\n" });
  assert.equal(kit.detectEcosystems(reqs)[0].framework, "flask");
  assert.equal(kit.detectProject(reqs).language, "Python");
});

test("Ruby, Go, Java/Kotlin e .NET", () => {
  const rails = tmpProject({ Gemfile: 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\ngem "sidekiq"\ngroup :development, :test do\n  gem "rspec-rails"\n  gem "rubocop"\nend\n', "bin/rails": "" });
  const [rb] = kit.detectEcosystems(rails);
  assert.equal(rb.framework, "rails");
  assert.deepEqual(Object.keys(rb.dependencies), ["rails", "sidekiq"]);
  assert.deepEqual(rb.testTools, ["rspec-rails"]);
  assert.ok(rb.commands.some((c) => c.command === "bundle exec rspec"));

  const gin = tmpProject({ "go.mod": "module example.com/api\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.10.0\n\tgithub.com/jackc/pgx/v5 v5.5.0 // indirect\n)\n", "main.go": "package main\n" });
  const [g] = kit.detectEcosystems(gin);
  assert.equal(g.framework, "gin");
  assert.equal(g.dependencies["github.com/gin-gonic/gin"], "v1.10.0");
  assert.deepEqual(kit.detectIntegrations(gin).map((i) => i.name), ["PostgreSQL"]);

  const spring = tmpProject({
    "pom.xml": "<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency><dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency><dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId><scope>test</scope></dependency></dependencies></project>",
    mvnw: "",
  });
  const [jv] = kit.detectEcosystems(spring);
  assert.equal(jv.framework, "spring");
  assert.equal(jv.packageManager, "maven");
  assert.deepEqual(jv.testTools, ["junit-jupiter"]);
  assert.equal(jv.commands[0].command, "./mvnw spring-boot:run");

  const kotlin = tmpProject({ "build.gradle.kts": 'plugins { id("io.quarkus") }\ndependencies {\n  implementation("io.quarkus:quarkus-rest:3.8.0")\n  testImplementation("io.mockk:mockk:1.13.10")\n}\n' });
  const [kt] = kit.detectEcosystems(kotlin);
  assert.equal(kt.framework, "quarkus");
  assert.equal(kt.language, "Kotlin");
  assert.deepEqual(Object.keys(kt.devDependencies), ["io.mockk:mockk"]);

  const aspnet = tmpProject({
    "Loja.sln": "",
    "src/Loja.Api/Loja.Api.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.2" /><PackageReference Include="Stripe.net" Version="44.0.0" /></ItemGroup></Project>',
    "tests/Loja.Tests/Loja.Tests.csproj": '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup><PackageReference Include="xunit" Version="2.7.0" /></ItemGroup></Project>',
  });
  const [cs] = kit.detectEcosystems(aspnet);
  assert.equal(cs.framework, "aspnet");
  assert.equal(cs.manifest, "Loja.sln");
  assert.deepEqual(cs.testTools, ["xunit"]);
  assert.deepEqual(kit.detectIntegrations(aspnet).map((i) => i.name).sort(), ["PostgreSQL", "Stripe"]);
});

test("monorepo com backend PHP e frontend JS vira dois subprojetos", () => {
  const root = tmpProject({
    "backend/composer.json": JSON.stringify({ name: "acme/api", require: { "symfony/framework-bundle": "^7" } }),
    "frontend/package.json": JSON.stringify({ name: "web", dependencies: { vue: "3", vite: "5" } }),
  });
  const subs = kit.detectSubprojects(root).map((s) => `${s.path}:${s.name}:${s.framework}:${s.kind}`);
  assert.deepEqual(subs, ["backend:acme/api:symfony:app", "frontend:web:vite:app"]);
});

test("init sem nenhum manifesto explica o que procura", () => {
  const root = tmpProject({ "README.md": "# nada" });
  assert.throws(() => execFileSync("node", [CLI, "init"], { cwd: root, stdio: "pipe" }), /composer\.json, pyproject\.toml/);
});

test("cobertura pelo Clover (PHPUnit) e pelo Cobertura (pytest-cov, coverlet)", () => {
  const clover = tmpProject({ "composer.json": COMPOSER, "src/a.php": "<?php\n", "coverage/clover.xml": '<coverage><project timestamp="1"><metrics files="1" statements="200" coveredstatements="150"/></project></coverage>' });
  assert.equal(kit.projectHealth(clover).tests.coverage, 75);
  const cobertura = tmpProject({ "requirements.txt": "flask\n", "app.py": "", "coverage.xml": '<?xml version="1.0" ?><coverage version="7" line-rate="0.912" branch-rate="0">' });
  assert.equal(kit.projectHealth(cobertura).tests.coverage, 91);
});

test("facts mostra a linguagem, as dependências e os comandos do backend", () => {
  const root = tmpProject({ "composer.json": COMPOSER, artisan: "" });
  const out = execFileSync("node", [CLI, "facts"], { cwd: root, env: { ...process.env, NO_COLOR: "1" } }).toString();
  assert.match(out, /framework: Laravel/);
  assert.match(out, /PHP \(composer\.json, composer\): Laravel · 4 dependências/);
  assert.match(out, /testes: pest · qualidade: larastan, pint/);
  assert.match(out, /comandos: composer test · composer lint · php artisan serve/);
});
