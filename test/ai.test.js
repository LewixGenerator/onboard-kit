const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, CLI, tmpProject, filledData, PROJECT_FILES, writeFileSync, readFileSync, existsSync, join, execFileSync } = require("./helpers");
const { spawn } = require("node:child_process");
const { chmodSync, mkdirSync } = require("node:fs");

test("MCP: initialize, tools/list e tools/call pelo stdio", async () => {
  const dir = tmpProject(PROJECT_FILES);
  const child = spawn("node", [CLI, "mcp"], { cwd: dir });
  const lines = [];
  let buffer = "";
  child.stdout.on("data", (d) => {
    buffer += d;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      lines.push(JSON.parse(buffer.slice(0, i)));
      buffer = buffer.slice(i + 1);
    }
  });
  const send = (msg) => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
  const waitFor = async (id) => {
    for (let k = 0; k < 200; k++) {
      const hit = lines.find((l) => l.id === id);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`sem resposta para ${id}`);
  };
  send({ id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
  assert.equal((await waitFor(1)).result.serverInfo.name, "onboarding-kit");
  send({ method: "notifications/initialized" });
  send({ id: 2, method: "tools/list" });
  const names = (await waitFor(2)).result.tools.map((t) => t.name);
  assert.deepEqual(names, ["onboarding_init", "onboarding_instructions", "onboarding_facts", "onboarding_status", "onboarding_fix_evidence", "onboarding_validate"]);
  send({ id: 3, method: "tools/call", params: { name: "onboarding_validate", arguments: {} } });
  assert.equal((await waitFor(3)).result.isError, true);
  send({ id: 4, method: "tools/call", params: { name: "onboarding_init", arguments: {} } });
  assert.equal((await waitFor(4)).result.structuredContent.created, true);
  assert.ok(existsSync(join(dir, "onboarding.json")));
  send({ id: 5, method: "tools/call", params: { name: "onboarding_instructions", arguments: { section: "architecture" } } });
  assert.match((await waitFor(5)).result.structuredContent.instructions, /style/);
  send({ id: 6, method: "tools/call", params: { name: "onboarding_validate", arguments: {} } });
  const validate = (await waitFor(6)).result.structuredContent;
  assert.equal(validate.ok, false);
  assert.equal(typeof validate.coverage.score, "number");
  send({ id: 7, method: "nada" });
  assert.equal((await waitFor(7)).error.code, -32601);
  child.stdin.end();
  await new Promise((r) => child.on("close", r));
});

// a CLI falsa é um script com shebang, que o Windows não executa
test("init --ai roda a CLI de IA instalada e valida no fim", { skip: process.platform === "win32" }, () => {
  const dir = tmpProject({ "package.json": JSON.stringify({ name: "app", dependencies: { express: "5" } }), "src/index.js": "line1\n// TODO: frete internacional\nline3\n" });
  const bin = join(dir, ".bin");
  mkdirSync(bin);
  // "claude" falso: registra os argumentos e preenche o onboarding como a IA faria
  const fake = join(bin, "claude");
  writeFileSync(
    fake,
    `#!/usr/bin/env node
if (process.argv[2] === "--version") process.exit(0);
const fs = require("fs");
fs.writeFileSync("args.json", JSON.stringify(process.argv.slice(2)));
fs.writeFileSync("onboarding.json", fs.readFileSync(${JSON.stringify(join(dir, "filled.json"))}, "utf8"));
`,
  );
  chmodSync(fake, 0o755);
  writeFileSync(join(dir, "filled.json"), JSON.stringify(filledData()));
  const env = { ...process.env, NO_COLOR: "1", PATH: `${bin}${require("node:path").delimiter}${process.env.PATH}` };
  const out = execFileSync("node", [CLI, "init", "--no-route", "--ai"], { cwd: dir, env }).toString();
  assert.match(out, /Rodando claude/);
  assert.match(out, /válido/);
  assert.match(out, /Cobertura: \d+%/);
  const args = JSON.parse(readFileSync(join(dir, "args.json"), "utf8"));
  assert.equal(args[0], "-p");
  assert.match(args[1], /_instructions/);
  assert.match(args[3], /Bash\(npx onboarding-kit:\*\)/);
  assert.equal(kit.detectAiCli("gemini-que-nao-existe"), undefined);
});

test("cobertura: nota, badge e --min-score", () => {
  const empty = kit.coverageScore(kit.createTemplate({ framework: "node" }));
  assert.equal(empty.filled, 0);
  const full = kit.coverageScore(filledData());
  assert.ok(full.score > 50 && full.score < 100, `nota ${full.score}`);
  assert.equal(full.filled, 14);
  assert.deepEqual(kit.coverageBadge({ score: 90 }), { schemaVersion: 1, label: "onboarding", message: "90%", color: "brightgreen" });

  const dir = tmpProject(PROJECT_FILES);
  writeFileSync(join(dir, "onboarding.json"), JSON.stringify(filledData()));
  const env = { ...process.env, NO_COLOR: "1", GITHUB_ACTIONS: "" };
  execFileSync("node", [CLI, "validate", "--badge", "badge.json"], { cwd: dir, env });
  assert.equal(JSON.parse(readFileSync(join(dir, "badge.json"), "utf8")).label, "onboarding");
  assert.throws(() => execFileSync("node", [CLI, "validate", "--min-score", "101"], { cwd: dir, env, stdio: "pipe" }), (err) => /abaixo do mínimo/.test(err.stdout.toString()));
});
