import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Framework } from "./types";

/**
 * Projetos fora do JavaScript: PHP, Python, Ruby, Go, Java/Kotlin e .NET. Tudo sai dos arquivos de
 * manifesto do próprio repositório (composer.json, pyproject.toml, Gemfile, go.mod, pom.xml, *.csproj),
 * sem rodar o gerenciador de pacotes e sem acessar a rede.
 */

export type EcosystemId = "php" | "python" | "ruby" | "go" | "java" | "dotnet";

export interface Ecosystem {
  id: EcosystemId;
  language: string;
  /** Arquivo de onde vieram as dependências. */
  manifest: string;
  packageManager: string;
  framework: Framework;
  frameworkLabel: string;
  /** Nome → versão pedida. */
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  /** Comandos do projeto (scripts do Composer, manage.py, bin/rails...). */
  commands: { name: string; command: string }[];
  testTools: string[];
  qualityTools: string[];
  /** Licenças do lockfile, quando ele traz (composer.lock). */
  licenses: { name: string; license: string }[];
}

/** Frameworks de outras linguagens, com o rótulo mostrado no init e no facts. */
export const ECOSYSTEM_FRAMEWORKS: { id: Framework; label: string }[] = [
  { id: "laravel", label: "Laravel" },
  { id: "symfony", label: "Symfony" },
  { id: "wordpress", label: "WordPress" },
  { id: "drupal", label: "Drupal" },
  { id: "magento", label: "Magento / Adobe Commerce" },
  { id: "codeigniter", label: "CodeIgniter" },
  { id: "slim", label: "Slim" },
  { id: "php", label: "PHP" },
  { id: "django", label: "Django" },
  { id: "fastapi", label: "FastAPI" },
  { id: "flask", label: "Flask" },
  { id: "python", label: "Python" },
  { id: "rails", label: "Ruby on Rails" },
  { id: "sinatra", label: "Sinatra" },
  { id: "ruby", label: "Ruby" },
  { id: "gin", label: "Gin" },
  { id: "echo", label: "Echo" },
  { id: "fiber", label: "Fiber" },
  { id: "go", label: "Go" },
  { id: "spring", label: "Spring Boot" },
  { id: "quarkus", label: "Quarkus" },
  { id: "java", label: "Java / Kotlin (JVM)" },
  { id: "aspnet", label: "ASP.NET Core" },
  { id: "dotnet", label: ".NET" },
];

const label = (id: Framework) => ECOSYSTEM_FRAMEWORKS.find((f) => f.id === id)!.label;
const read = (path: string): string | undefined => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
};
const pick = (deps: Record<string, string>, names: string[]) => names.filter((n) => Object.keys(deps).some((d) => d === n || d.endsWith(`:${n}`) || d.endsWith(`/${n}`)));
const firstMatch = (deps: Record<string, string>, rules: [Framework, RegExp][], fallback: Framework): Framework => rules.find(([, re]) => Object.keys(deps).some((d) => re.test(d)))?.[0] ?? fallback;

/* ───────────── PHP ───────────── */

function php(root: string): Ecosystem | undefined {
  const raw = read(join(root, "composer.json"));
  const wordpressFiles = existsSync(join(root, "wp-config.php")) || existsSync(join(root, "wp-content"));
  if (!raw && !wordpressFiles) return undefined;
  let composer: Record<string, any> = {};
  try {
    composer = raw ? JSON.parse(raw) : {};
  } catch {
    composer = {};
  }
  const strip = (deps: Record<string, string> = {}) => Object.fromEntries(Object.entries(deps).filter(([n]) => n !== "php" && !n.startsWith("ext-")));
  const dependencies = strip(composer.require);
  const devDependencies = strip(composer["require-dev"]);
  const all = { ...dependencies, ...devDependencies };
  const framework = wordpressFiles
    ? "wordpress"
    : firstMatch(
        all,
        [
          ["laravel", /^laravel\/(framework|lumen-framework)$/],
          ["drupal", /^drupal\/core(-recommended)?$/],
          ["magento", /^magento\/(framework|product-community-edition|product-enterprise-edition)$/],
          ["wordpress", /^(johnpbloch|roots)\/wordpress/],
          ["symfony", /^symfony\/(framework-bundle|http-kernel)$/],
          ["codeigniter", /^codeigniter4\/(framework|appstarter)$/],
          ["slim", /^slim\/slim$/],
        ],
        "php",
      );
  // pre-/post- são ganchos do Composer, não comandos para rodar à mão
  const commands = Object.keys(composer.scripts ?? {})
    .filter((name) => !/^(pre|post)-/.test(name))
    .map((name) => ({ name, command: `composer ${name}` }));
  if (existsSync(join(root, "artisan"))) {
    commands.push({ name: "serve", command: "php artisan serve" }, { name: "migrate", command: "php artisan migrate" }, { name: "test", command: "php artisan test" });
  }
  if (existsSync(join(root, "bin", "console"))) commands.push({ name: "console", command: "php bin/console" });
  const licenses: Ecosystem["licenses"] = [];
  try {
    const lock = JSON.parse(read(join(root, "composer.lock")) ?? "{}");
    for (const p of lock.packages ?? []) if (p?.name) licenses.push({ name: p.name, license: (p.license ?? []).join(" OR ") });
  } catch {
    // lockfile inválido ou ausente
  }
  return {
    id: "php",
    language: "PHP",
    manifest: raw ? "composer.json" : "wp-config.php",
    packageManager: "composer",
    framework,
    frameworkLabel: label(framework),
    dependencies,
    devDependencies,
    commands,
    testTools: pick(all, ["phpunit", "pest", "codeception", "behat", "infection", "dusk", "paratest", "mockery"]),
    qualityTools: pick(all, ["phpstan", "larastan", "psalm", "php-cs-fixer", "php_codesniffer", "pint", "rector", "phpmd", "deptrac"]),
    licenses,
  };
}

/* ───────────── Python ───────────── */

/** Lê só o que importa do TOML: seções, chaves e listas de strings (inclusive em várias linhas). */
export function parseTomlLite(source: string): Record<string, Record<string, string | string[]>> {
  const out: Record<string, Record<string, string | string[]>> = { "": {} };
  let section = "";
  let pending: { key: string; values: string[] } | undefined;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (pending) {
      pending.values.push(...[...line.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]));
      // o "]" das extras (pacote[extra]) fica dentro das aspas: só fecha a lista o que está fora delas
      if (line.replace(/"[^"]*"|'[^']*'/g, "").includes("]")) {
        out[section][pending.key] = pending.values;
        pending = undefined;
      }
      continue;
    }
    const header = /^\[\[?([^\]]+)\]\]?$/.exec(line);
    if (header) {
      section = header[1].trim();
      out[section] ??= {};
      continue;
    }
    const kv = /^("?[\w.-]+"?)\s*=\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1].replace(/"/g, "");
    const value = kv[2];
    if (value.startsWith("[")) {
      const values = [...value.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
      if (value.replace(/"[^"]*"|'[^']*'/g, "").includes("]")) out[section][key] = values;
      else pending = { key, values };
    } else {
      out[section][key] = /^["']/.test(value) ? value.replace(/^["']|["'],?$/g, "") : /version\s*=\s*"([^"]+)"/.exec(value)?.[1] ?? value;
    }
  }
  return out;
}

const pyName = (spec: string) => spec.trim().split(/[\s<>=!~;[(@]/)[0].toLowerCase().replace(/_/g, "-");
const pyVersion = (spec: string) => /[<>=!~]=?\s*[\w.*]+/.exec(spec)?.[0]?.replace(/\s/g, "") ?? "";

function python(root: string): Ecosystem | undefined {
  const pyproject = read(join(root, "pyproject.toml"));
  const reqFiles = ["requirements.txt", "requirements/base.txt", "requirements/prod.txt", "requirements-dev.txt", "requirements/dev.txt", "requirements/test.txt"];
  const reqs = reqFiles.map((f) => [f, read(join(root, f))] as const).filter(([, s]) => s !== undefined);
  const pipfile = read(join(root, "Pipfile"));
  const setupPy = existsSync(join(root, "setup.py"));
  if (!pyproject && !reqs.length && !pipfile && !setupPy && !existsSync(join(root, "manage.py"))) return undefined;
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const add = (target: Record<string, string>, spec: string, version?: string) => {
    const name = pyName(spec);
    if (name && !name.startsWith("-") && name !== "python") target[name] = version ?? pyVersion(spec);
  };
  let manifest = "";
  if (pyproject) {
    manifest = "pyproject.toml";
    const toml = parseTomlLite(pyproject);
    for (const spec of (toml.project?.dependencies as string[]) ?? []) add(dependencies, spec);
    for (const [key, value] of Object.entries(toml["tool.poetry.dependencies"] ?? {})) add(dependencies, key, typeof value === "string" ? value : "");
    for (const [section, values] of Object.entries(toml)) {
      if (/^tool\.poetry\.(dev-dependencies|group\.[^.]+\.dependencies)$/.test(section)) for (const key of Object.keys(values)) add(devDependencies, key);
      if (section === "dependency-groups" || section === "project.optional-dependencies") for (const list of Object.values(values)) if (Array.isArray(list)) list.forEach((s) => add(devDependencies, s));
    }
  }
  for (const [file, source] of reqs) {
    manifest ||= file;
    for (const line of source!.split(/\r?\n/)) if (line.trim() && !line.trim().startsWith("#")) add(/dev|test/.test(file) ? devDependencies : dependencies, line);
  }
  if (pipfile) {
    manifest ||= "Pipfile";
    const toml = parseTomlLite(pipfile);
    for (const key of Object.keys(toml.packages ?? {})) add(dependencies, key);
    for (const key of Object.keys(toml["dev-packages"] ?? {})) add(devDependencies, key);
  }
  manifest ||= setupPy ? "setup.py" : "manage.py";
  const all = { ...dependencies, ...devDependencies };
  const has = (f: string) => existsSync(join(root, f));
  const framework = existsSync(join(root, "manage.py"))
    ? "django"
    : firstMatch(all, [["django", /^django$/], ["fastapi", /^fastapi$/], ["flask", /^flask$/]], "python");
  const packageManager = has("uv.lock") ? "uv" : has("poetry.lock") ? "poetry" : has("pdm.lock") ? "pdm" : has("Pipfile.lock") || pipfile ? "pipenv" : "pip";
  const run = packageManager === "uv" ? "uv run " : packageManager === "poetry" ? "poetry run " : packageManager === "pipenv" ? "pipenv run " : "";
  const commands: Ecosystem["commands"] = [];
  if (has("manage.py")) commands.push({ name: "runserver", command: `${run}python manage.py runserver` }, { name: "migrate", command: `${run}python manage.py migrate` }, { name: "test", command: `${run}python manage.py test` });
  if ("pytest" in all) commands.push({ name: "test", command: `${run}pytest` });
  return {
    id: "python",
    language: "Python",
    manifest,
    packageManager,
    framework,
    frameworkLabel: label(framework),
    dependencies,
    devDependencies,
    commands: commands.filter((c, i) => commands.findIndex((o) => o.name === c.name) === i),
    testTools: pick(all, ["pytest", "pytest-django", "pytest-asyncio", "hypothesis", "tox", "nox", "coverage", "factory-boy", "behave"]),
    qualityTools: pick(all, ["ruff", "black", "mypy", "pyright", "flake8", "pylint", "isort", "bandit", "pre-commit"]),
    licenses: [],
  };
}

/* ───────────── Ruby ───────────── */

function ruby(root: string): Ecosystem | undefined {
  const gemfile = read(join(root, "Gemfile"));
  if (!gemfile) return undefined;
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  let group = 0;
  for (const line of gemfile.split(/\r?\n/)) {
    if (/^\s*group\b.*\b(development|test)\b.*\bdo\b/.test(line)) group++;
    else if (group && /^\s*end\b/.test(line)) group--;
    const m = /^\s*gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/.exec(line);
    if (m) (group ? devDependencies : dependencies)[m[1]] = m[2] ?? "";
  }
  const all = { ...dependencies, ...devDependencies };
  const framework = firstMatch(all, [["rails", /^rails$/], ["sinatra", /^sinatra$/]], "ruby");
  const commands: Ecosystem["commands"] = [{ name: "install", command: "bundle install" }];
  if (existsSync(join(root, "bin", "rails"))) commands.push({ name: "server", command: "bin/rails server" }, { name: "migrate", command: "bin/rails db:migrate" }, { name: "console", command: "bin/rails console" });
  if ("rspec" in all || "rspec-rails" in all) commands.push({ name: "test", command: "bundle exec rspec" });
  else if (framework === "rails") commands.push({ name: "test", command: "bin/rails test" });
  return {
    id: "ruby",
    language: "Ruby",
    manifest: "Gemfile",
    packageManager: "bundler",
    framework,
    frameworkLabel: label(framework),
    dependencies,
    devDependencies,
    commands,
    testTools: pick(all, ["rspec", "rspec-rails", "minitest", "capybara", "cucumber", "factory_bot", "factory_bot_rails", "simplecov"]),
    qualityTools: pick(all, ["rubocop", "rubocop-rails", "standard", "brakeman", "sorbet", "reek", "bundler-audit"]),
    licenses: [],
  };
}

/* ───────────── Go ───────────── */

function go(root: string): Ecosystem | undefined {
  const mod = read(join(root, "go.mod"));
  if (!mod) return undefined;
  const dependencies: Record<string, string> = {};
  let block = false;
  for (const line of mod.split(/\r?\n/)) {
    const clean = line.replace(/\/\/.*$/, "").trim();
    if (/^require\s*\($/.test(clean)) block = true;
    else if (block && clean === ")") block = false;
    const m = (block ? /^(\S+)\s+(\S+)/ : /^require\s+(\S+)\s+(\S+)/).exec(clean);
    if (m && m[1] !== "require") dependencies[m[1]] = m[2];
  }
  const framework = firstMatch(dependencies, [["gin", /^github\.com\/gin-gonic\/gin$/], ["echo", /^github\.com\/labstack\/echo/], ["fiber", /^github\.com\/gofiber\/fiber/]], "go");
  return {
    id: "go",
    language: "Go",
    manifest: "go.mod",
    packageManager: "go modules",
    framework,
    frameworkLabel: label(framework),
    dependencies,
    devDependencies: {},
    commands: [{ name: "run", command: existsSync(join(root, "main.go")) ? "go run ." : "go run ./cmd/..." }, { name: "test", command: "go test ./..." }],
    testTools: ["go test", ...Object.keys(dependencies).filter((d) => /testify|gomock|ginkgo|testcontainers/.test(d)).map((d) => d.split("/").slice(-2).join("/"))],
    qualityTools: [existsSync(join(root, ".golangci.yml")) || existsSync(join(root, ".golangci.yaml")) ? "golangci-lint" : "", "go vet"].filter(Boolean),
    licenses: [],
  };
}

/* ───────────── Java / Kotlin ───────────── */

function java(root: string): Ecosystem | undefined {
  const pom = read(join(root, "pom.xml"));
  const gradleFile = ["build.gradle.kts", "build.gradle"].find((f) => existsSync(join(root, f)));
  const gradle = gradleFile ? read(join(root, gradleFile)) : undefined;
  if (!pom && !gradle) return undefined;
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  if (pom) {
    for (const m of pom.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
      const tag = (name: string) => new RegExp(`<${name}>([^<]+)</${name}>`).exec(m[1])?.[1]?.trim() ?? "";
      const name = `${tag("groupId")}:${tag("artifactId")}`;
      (tag("scope") === "test" ? devDependencies : dependencies)[name] = tag("version");
    }
    const parent = /<parent>[\s\S]*?<artifactId>([^<]+)<\/artifactId>/.exec(pom)?.[1];
    if (parent) dependencies[`parent:${parent}`] = "";
  }
  if (gradle) {
    for (const m of gradle.matchAll(/^\s*(\w+)\s*\(?\s*["']([\w.-]+):([\w.-]+)(?::([\w.$-]+))?["']/gm)) {
      (/test/i.test(m[1]) ? devDependencies : dependencies)[`${m[2]}:${m[3]}`] = m[4] ?? "";
    }
    for (const m of gradle.matchAll(/id\s*\(?\s*["']([\w.-]+)["']/g)) dependencies[`plugin:${m[1]}`] = "";
  }
  const all = { ...dependencies, ...devDependencies };
  const framework = firstMatch(all, [["spring", /spring-boot|org\.springframework\.boot/], ["quarkus", /^io\.quarkus/]], "java");
  const kotlin = gradleFile?.endsWith(".kts") || Object.keys(all).some((d) => /kotlin/.test(d));
  const wrapper = (unix: string) => (existsSync(join(root, unix)) ? `./${unix}` : unix.replace(/^.*\//, "").replace("w", ""));
  const commands = pom
    ? [{ name: "build", command: `${wrapper("mvnw")} package` }, { name: "test", command: `${wrapper("mvnw")} test` }]
    : [{ name: "build", command: `${wrapper("gradlew")} build` }, { name: "test", command: `${wrapper("gradlew")} test` }];
  if (framework === "spring") commands.unshift({ name: "run", command: pom ? `${wrapper("mvnw")} spring-boot:run` : `${wrapper("gradlew")} bootRun` });
  return {
    id: "java",
    language: kotlin ? "Kotlin" : "Java",
    manifest: pom ? "pom.xml" : gradleFile!,
    packageManager: pom ? "maven" : "gradle",
    framework,
    frameworkLabel: label(framework),
    dependencies,
    devDependencies,
    commands,
    testTools: pick(all, ["junit", "junit-jupiter", "mockito-core", "mockk", "assertj-core", "testcontainers", "spring-boot-starter-test", "kotest-runner-junit5"]),
    qualityTools: [...pick(all, ["checkstyle", "spotbugs", "detekt", "ktlint"]), ...Object.keys(all).filter((d) => /spotless|jacoco|sonarqube/.test(d)).map((d) => d.split(/[:.]/).pop()!)],
    licenses: [],
  };
}

/* ───────────── .NET ───────────── */

function dotnet(root: string): Ecosystem | undefined {
  const projects: string[] = [];
  const scan = (dir: string, depth: number) => {
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isFile() && /\.(cs|fs|vb)proj$/.test(e.name)) projects.push(rel);
      else if (e.isDirectory() && depth < 2 && !/^(\.|bin$|obj$|node_modules$)/.test(e.name)) scan(rel, depth + 1);
    }
  };
  scan("", 0);
  if (!projects.length) return undefined;
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  let web = false;
  for (const project of projects.slice(0, 30)) {
    const source = read(join(root, project)) ?? "";
    if (/Sdk="Microsoft\.NET\.Sdk\.Web"/.test(source)) web = true;
    const isTest = /test/i.test(project);
    for (const m of source.matchAll(/<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?/g)) (isTest ? devDependencies : dependencies)[m[1]] = m[2] ?? "";
  }
  const all = { ...dependencies, ...devDependencies };
  const framework: Framework = web || Object.keys(all).some((d) => /^Microsoft\.AspNetCore\./.test(d)) ? "aspnet" : "dotnet";
  const solution = readdirSync(root).find((f) => f.endsWith(".sln") || f.endsWith(".slnx"));
  return {
    id: "dotnet",
    language: projects.some((p) => p.endsWith(".fsproj")) ? "F#" : "C#",
    manifest: solution ?? projects[0],
    packageManager: "nuget",
    framework,
    frameworkLabel: label(framework),
    dependencies,
    devDependencies,
    commands: [{ name: "build", command: "dotnet build" }, { name: "test", command: "dotnet test" }, ...(framework === "aspnet" ? [{ name: "run", command: "dotnet run" }] : [])],
    testTools: Object.keys(all).filter((d) => /^(xunit|NUnit|MSTest\.TestFramework|Moq|NSubstitute|FluentAssertions|Testcontainers)$/i.test(d)),
    qualityTools: Object.keys(all).filter((d) => /StyleCop|SonarAnalyzer|Roslynator|coverlet/i.test(d)),
    licenses: [],
  };
}

/** Ecossistemas não JavaScript encontrados na pasta, na ordem em que costumam ser o "app principal". */
export function detectEcosystems(root: string): Ecosystem[] {
  return [php, python, ruby, go, java, dotnet].map((fn) => fn(root)).filter((e): e is Ecosystem => Boolean(e));
}

/** Há algum projeto aqui que o kit entende (JavaScript ou outra linguagem)? */
export function hasAnyManifest(root: string): boolean {
  return ["package.json", "deno.json", "deno.jsonc"].some((f) => existsSync(join(root, f))) || detectEcosystems(root).length > 0;
}
