const { test } = require("node:test");
const assert = require("node:assert/strict");
const { kit, createOnboardingHandler, createOnboardingRoute, tmpProject, filledData, join, http } = require("./helpers");

test("adapter Node: 404 desligado, HTML ligado", async () => {
  const root = tmpProject({ "onboarding.json": JSON.stringify(filledData()) });
  const file = join(root, "onboarding.json");
  const call = (handler) =>
    new Promise((resolve) => {
      const server = http.createServer((req, res) => handler(req, res)).listen(0, async () => {
        const res = await fetch(`http://127.0.0.1:${server.address().port}/onboarding`);
        const body = await res.text();
        server.close();
        resolve({ status: res.status, body });
      });
    });
  assert.equal((await call(createOnboardingHandler({ file, enabled: false }))).status, 404);
  const on = await call(createOnboardingHandler({ file, enabled: true }));
  assert.equal(on.status, 200);
  assert.match(on.body, /<span class="grad">Loja<\/span>/);
});

test("adapter Next: devolve Response com HTML e página de arquivo ausente", async () => {
  const root = tmpProject({ "onboarding.json": JSON.stringify(filledData()) });
  const res = await createOnboardingRoute({ file: join(root, "onboarding.json"), enabled: true })();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const missing = await createOnboardingRoute({ file: join(root, "nada.json"), enabled: true })();
  assert.match(await missing.text(), /npx onboarding-kit init/);
});

test("adapters fetch, vite, fastify e koa", async () => {
  const root = tmpProject({ "onboarding.json": JSON.stringify(filledData()) });
  const file = join(root, "onboarding.json");

  const { createOnboardingFetchHandler } = require("../dist/adapters/fetch.js");
  const res = await createOnboardingFetchHandler({ file, enabled: true })(new Request("http://x/onboarding"));
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Loja/);
  assert.equal((await createOnboardingFetchHandler({ file, enabled: false })()).status, 404);

  const { onboarding } = require("../dist/adapters/vite.js");
  const plugin = onboarding({ file });
  assert.equal(plugin.apply, "serve");
  let middleware;
  plugin.configureServer({ config: { base: "/" }, middlewares: { use: (fn) => (middleware = fn) } });
  const server = http.createServer((req, res) => middleware(req, res, () => { res.writeHead(418); res.end(); }));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/onboarding?x=1`)).status, 200);
  assert.equal((await fetch(`${base}/outra`)).status, 418);
  server.close();

  const { fastifyOnboarding } = require("../dist/adapters/fastify.js");
  const routes = {};
  let doneCalled = false;
  fastifyOnboarding({ get: (path, h) => (routes[path] = h) }, { file, enabled: true, path: "/docs/onboarding" }, () => (doneCalled = true));
  assert.ok(doneCalled);
  const reply = { sent: undefined, status: 0, hdrs: {}, code(s) { this.status = s; return this; }, headers(h) { Object.assign(this.hdrs, h); return this; }, send(b) { this.sent = b; return this; } };
  await routes["/docs/onboarding"]({}, reply);
  assert.equal(reply.status, 200);
  assert.match(reply.hdrs["Content-Type"], /text\/html/);

  const { createOnboardingMiddleware } = require("../dist/adapters/koa.js");
  const mw = createOnboardingMiddleware({ file, enabled: true });
  const ctx = { method: "GET", path: "/onboarding", status: 404, body: undefined, headers: {}, set(h) { Object.assign(this.headers, h); } };
  await mw(ctx, async () => assert.fail("não deveria chamar next"));
  assert.equal(ctx.status, 200);
  assert.match(ctx.body, /Loja/);
  let nextCalled = false;
  await mw({ ...ctx, path: "/" }, async () => (nextCalled = true));
  assert.ok(nextCalled);

  assert.equal(typeof require("../dist/adapters/express.js").createOnboardingHandler, "function");
});
