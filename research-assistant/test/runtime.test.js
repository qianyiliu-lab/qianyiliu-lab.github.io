import test from "node:test";
import assert from "node:assert/strict";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { ORIGIN } from "../src/policy.js";
import { completion, knowledge, NOW, settings } from "../test-support/fixtures.js";

// Two separate Workers bind the same actual SQLite-backed DO in local workerd.
// Only the clock and public corpus are fixtures; every outbound fetch is intercepted.
test("two edge workers racing one hold: durable debit, exactly one send, restart and retry", async () => {
  const calls = [], waiting = Promise.withResolvers(), release = Promise.withResolvers();
  const modules = [
    { type: "ESModule", path: "runtime-entry.js", contents:
      "import worker from './src/index.js'; export { BudgetLedger } from './src/index.js';" +
      "Date.now = () => " + NOW + ";" +
      // getWorker's loopback RPC proxy rejects foreign Origin before delivering a request.
      "export default { fetch(req, env) { const headers = new Headers(req.headers);" +
      "headers.set('Origin', " + JSON.stringify(ORIGIN) + ");" +
      "return worker.fetch(new Request(req, { headers, cf: { colo: 'TEST' } }), env); } };" },
    ...["index", "http", "policy", "ledger", "service"].map(name => ({
      type: "ESModule", path: "src/" + name + ".js" })),
    { type: "ESModule", path: "src/knowledge.json", contents: "export default " + JSON.stringify(knowledge) }
  ];
  const options = cents => convertV4MiniflareOptions({ cf: false, workers: ["owner", "edge"].map(name => ({
    name, compatibilityDate: "2026-05-01", modules, bindings: settings({ cents }),
    durableObjects: { LEDGER: { className: "BudgetLedger", scriptName: "owner", useSQLite: true } },
    outboundService: async request => {
      const body = await request.json();
      calls.push({ url: request.url, ticket: body.metadata.reservation });
      waiting.resolve();
      await release.promise;
      return Response.json(completion(body.metadata.reservation));
    }
  })) });
  const mf = new Miniflare(options(43));
  try {
    const a = await mf.getWorker("owner"), b = await mf.getWorker("edge");
    const ask = (worker, ip) => worker.fetch("https://test.invalid/ask", { method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2." + ip },
      body: '{"question":"What does Qianyi study?"}' });
    const get = async w => (await w.fetch("https://test.invalid/status")).json();
    assert.deepEqual(await get(b), { available: true });
    const first = ask(a, 1);
    await Promise.race([waiting.promise, first.then(r => { throw Error("early response " + r.status); })]);
    const race = await Promise.all(Array.from({ length: 24 }, (_, i) => ask(i % 2 ? a : b, i + 2)));
    assert.ok(race.every(r => r.status === 503));
    assert.deepEqual(await get(b), { available: false });
    assert.equal(calls.length, 1);
    release.resolve();
    assert.equal((await first).status, 200);
    assert.deepEqual(await get(a), { available: true }); // Only 960 micro-USD settled.
    assert.equal((await ask(b, 30)).status, 200);
    await mf.setOptions(options(42));
    const fresh = await mf.getWorker("edge");
    assert.equal((await ask(fresh, 31)).status, 503);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(c => c.url === "https://api.openai.com/v1/responses"));
    assert.notEqual(calls[0].ticket, calls[1].ticket);
    assert.deepEqual(await get(fresh), { available: false });
  } finally { release.resolve(); await mf.dispose(); }
});
