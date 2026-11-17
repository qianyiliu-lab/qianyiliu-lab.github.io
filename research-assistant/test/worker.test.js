import assert from "node:assert/strict";
import test from "node:test";
import { handle } from "../src/http.js";
import { admission, finish, minute } from "../src/ledger.js";
import { BODY_BYTES, GUARD_MS, HOLD, MODEL, ORIGIN, OUTPUT_TOKENS, RETIREMENT, SINGLETON,
  contextFrom, grant, parseAnswer, prompt, validQuestion } from "../src/policy.js";
import { service } from "../src/service.js";
import { completion, knowledge, memory, NOW, period, settings } from "../test-support/fixtures.js";

const input = { question: "What does Qianyi study?" };
const context = contextFrom(knowledge);
const slot = (t = NOW, bucket = 3) => ({ window: minute(t), bucket });
function rig(overrides, responder = r => Response.json(completion(r.metadata.reservation))) {
  const store = memory(), env = settings(overrides), calls = [];
  let t = NOW;
  const core = service(store, env, context, async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, init, body });
    return responder(body);
  }, () => t);
  env.LEDGER = { getByName(name) { assert.equal(name, SINGLETON); return core; } };
  function http(path, method, body, headers = {}, cf = true) {
    const request = new Request("https://unit.invalid" + path, { method,
      headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1",
        ...headers }, ...(body !== undefined && { body, duplex: "half" }) });
    if (cf) Object.defineProperty(request, "cf", { value: {} });
    return handle(request, env, () => t);
  }
  return { env, store, calls, core, http, advance: n => { t = n; },
    ask: () => http("/ask", "POST", JSON.stringify(input)),
    status: async () => (await http("/status", "GET")).json() };
}

test("requires explicit enable, server secrets, valid tenant, exact active ISO grant and allocation", () => {
  const e = settings();
  for (const k of Object.keys(e)) assert.equal(grant({ ...e, [k]: "" }, NOW), null, k);
  for (const x of [{ cents: -1 }, { cents: 1001 }, { cents: "99" }, { cents: 0.5 }, { expiry: null },
    { start: "2026-02-30T00:00:00Z" }, { start: "2026-05-19" }, { start: "2026-06-01T00:00:00Z" },
    { expiry: "2026-05-21T00:00:00Z" }, { project: "other" }, { org: [] }, { unknown: true }])
    assert.equal(grant(settings(x), NOW), null, JSON.stringify(x));
  assert.equal(grant(e, Date.parse(period.expiry) - GUARD_MS), null);
  assert.equal(grant(settings({ expiry: "2027-01-20T00:00:00Z" }), RETIREMENT), null);
  assert.ok(grant(settings({ start: "2026-05-19T00:00:00.123Z" }), NOW));
});

test("status is opaque, never bills, and failures of config, knowledge or ledger close access", async () => {
  const r = rig({ cents: 0 });
  assert.deepEqual(await r.status(), { available: false });
  assert.equal((await r.ask()).status, 503);
  r.env.ENABLED = "false";
  assert.deepEqual(await r.status(), { available: false });
  assert.equal(service(memory(), settings(), null).available(settings().VERIFIED_GRANT), false);
  const healthy = rig();
  assert.equal(healthy.core.available("different attestation"), false);
  assert.deepEqual(await healthy.status(), { available: true });
  assert.equal(healthy.store.kv.get("grant").spent, 0);
  healthy.env.LEDGER = null;
  assert.deepEqual(await healthy.status(), { available: false });
  assert.equal((await healthy.ask()).status, 503);
  assert.equal(r.calls.length + healthy.calls.length, 0);
});

test("exact origin only, no credentials, no alternate routes, restrictive preflight; spoofed XFF ignored", async () => {
  const r = rig();
  for (const origin of ["https://qianyiliu.github.io", ORIGIN + ".example", "null", ""])
    assert.equal((await r.http("/ask", "POST", "{}", { Origin: origin })).status, 403);
  const none = new Request("https://unit.invalid/ask", { method: "POST" });
  assert.equal((await handle(none, r.env, () => NOW)).status, 403);
  for (const headers of [{ Cookie: "session=x" }, { Authorization: "Bearer x" }, { "CF-Worker": "x" },
    { "CF-Connecting-IP": "", "X-Forwarded-For": "192.0.2.1" }])
    assert.equal((await r.http("/ask", "POST", "{}", headers)).status, 403);
  assert.equal((await r.http("/ask", "POST", "{}", {}, false)).status, 403);
  assert.equal((await r.http("/ask?tenant=x", "POST", "{}")).status, 404);
  assert.equal((await r.http("/reserve", "POST", "{}")).status, 404);
  assert.equal((await r.http("/ask", "GET")).status, 405);
  const pre = { "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" };
  const ok = await r.http("/ask", "OPTIONS", undefined, pre);
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(ok.headers.get("Access-Control-Allow-Credentials"), null);
  assert.equal((await r.http("/ask", "OPTIONS", undefined,
    { ...pre, "Access-Control-Request-Headers": "authorization" })).status, 403);
  assert.equal(r.calls.length, 0);
});

test("stream and final serialized model input bounded, including history, context and envelope", async () => {
  const r = rig();
  let stopped = false;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(513)); }, cancel() { stopped = true; } });
  assert.equal((await r.http("/ask", "POST", stream, { "Content-Length": "1" })).status, 413);
  assert.ok(stopped);
  assert.equal((await r.http("/ask", "POST", "{}", { "Content-Length": String(BODY_BYTES + 1) })).status, 413);
  for (const body of ["{", "null", "[]", '{"question":" "}', new Uint8Array([255])])
    assert.equal((await r.http("/ask", "POST", body)).status, 400);
  for (const headers of [{ "Content-Encoding": "gzip" }, { "Content-Type": "text/plain" }])
    assert.equal((await r.http("/ask", "POST", "{}", headers)).status, 415);
  for (const x of [{ ...input, tools: [] }, { ...input, history: [{ role: "system", content: "x" }] },
    { ...input, history: Array(7).fill({ role: "user", content: "x" }) }, { question: "\u20ac".repeat(700) }])
    assert.equal(validQuestion(x), false);
  assert.equal(contextFrom({}), null);
  assert.equal(contextFrom({ ...knowledge, cv: "a".repeat(32768) }), null);
  assert.equal(prompt("a".repeat(48 * 1024), input, "x"), null);
  assert.equal(r.calls.length, 0);
});

test("real API shape: tenant headers, fixed model and tier, no tools/storage/retries or visitor identifiers", async () => {
  const r = rig(), response = await r.ask(), [{ url, init, body }] = r.calls;
  assert.deepEqual(await response.json(), { answer: "A short answer.", sources: ["research"] });
  assert.equal(url, "https://api.openai.com/v1/responses");
  assert.equal(init.headers["OpenAI-Organization"], period.org);
  assert.equal(init.headers["OpenAI-Project"], period.project);
  assert.equal(init.redirect, "manual");
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(body.model, MODEL);
  assert.equal(body.max_output_tokens, OUTPUT_TOKENS);
  assert.equal(body.service_tier, "default");
  assert.deepEqual(body.tools, []);
  assert.equal(body.store, false);
  assert.ok(body.instructions.includes(knowledge.research));
  assert.ok(!JSON.stringify(r.calls).includes("192.0.2.1"));
  assert.ok(!JSON.stringify([r.store.kv.get("grant"), r.store.kv.get("throttle")]).includes(input.question));
  assert.equal(r.store.kv.get("grant").spent, 960); // 2000 input + 100 output, in micro-USD.
  assert.equal(r.store.kv.get("grant").pending, 0);
});

test("only validated usage for this reservation is reconcilable; source IDs are allowlisted", () => {
  for (const mutate of [r => delete r.usage, r => r.usage.input_tokens = -1, r => r.usage.output_tokens = 1.1,
    r => r.usage.total_tokens++, r => r.usage.output_tokens = OUTPUT_TOKENS + 1, r => r.model = "alias",
    r => r.metadata.reservation = "other", r => r.service_tier = "priority", r => r.status = "incomplete",
    r => r.usage = { input_tokens: 1_047_576, output_tokens: 5, total_tokens: 1_047_581 },
    r => r.output[0].content[0].text = '{"answer":"ok","sources":["external"]}']) {
    const r = completion("t"); mutate(r); assert.equal(parseAnswer(r, "t"), null);
  }
});

test("ambiguity, retry and duplicate reconciliation never release the same money twice", async () => {
  const r = rig({ cents: 85 }, () => { throw new Error("private timeout detail"); });
  for (let i = 0; i < 2; i++) {
    const res = await r.ask();
    assert.deepEqual(await res.json(), { error: "Assistant unavailable." });
  }
  assert.deepEqual(await r.status(), { available: false });
  assert.equal((await r.ask()).status, 503);
  assert.equal(r.calls.length, 2);
  const g = grant(r.env, NOW);
  const { tickets, spent } = r.store.kv.get("grant");
  assert.equal(spent, 2 * HOLD);
  assert.equal(finish(r.store, g, NOW, "unknown", 960), false);
  assert.equal(finish(r.store, g, NOW, tickets[0], -1), false);
  assert.equal(finish(r.store, g, NOW, tickets[0], 960), true);
  assert.equal(finish(r.store, g, NOW, tickets[0], 960), false);
  assert.equal(r.store.kv.get("grant").spent, HOLD + 960);
});

test("malformed or declined provider response never refunds; billing/auth/model denial latches grant", async () => {
  for (const provider of [() => Response.json(completion("wrong")), () => new Response("x".repeat(65537)),
    () => new Response("private", { status: 429 })]) {
    const r = rig({}, provider);
    assert.equal((await r.ask()).status, 503);
    assert.equal(r.store.kv.get("grant").spent, HOLD);
  }
  const r = rig({}, () => new Response("secret", { status: 401 }));
  await r.ask();
  assert.deepEqual(await r.status(), { available: false });
  assert.equal((await r.ask()).status, 503);
  assert.equal(r.calls.length, 1);
});

test("no calendar reset, overlapping/edited grants, tenant/project switching or reconfig refill", async () => {
  const r = rig(), configure = o => r.env.VERIFIED_GRANT = settings(o).VERIFIED_GRANT;
  await r.ask();
  r.advance(Date.parse("2026-06-01T00:00:00Z"));
  for (const change of [{ start: "2026-05-20T00:00:00Z" }, { expiry: "2026-06-20T00:00:00Z" },
    { org: "org-different" }, { project: "proj_different" }]) {
    configure(change); assert.deepEqual(await r.status(), { available: false });
  }
  configure({ cents: 42 }); // Total cap reduced: a prior successful charge leaves < one hold.
  assert.deepEqual(await r.status(), { available: false });
  configure({}); assert.deepEqual(await r.status(), { available: false });
  assert.equal(r.store.kv.get("grant").spent, 960);
  assert.equal(r.calls.length, 1);
});

test("only a fresh verified nonoverlapping grant reopens; unknown liabilities survive rollover", async () => {
  const r = rig({}, () => { throw Error(); });
  await r.ask();
  const g = grant(r.env, NOW), [ticket] = r.store.kv.get("grant").tickets;
  const next = { start: period.expiry, expiry: "2026-07-19T00:00:00Z", cents: 83 };
  r.advance(Date.parse(period.expiry));
  assert.deepEqual(await r.status(), { available: false });
  for (const change of [{ ...next, org: "org-new" }, { ...next, project: "proj_new" }]) {
    r.env.VERIFIED_GRANT = settings(change).VERIFIED_GRANT;
    assert.deepEqual(await r.status(), { available: false });
  }
  r.env.VERIFIED_GRANT = settings(next).VERIFIED_GRANT;
  assert.deepEqual(await r.status(), { available: false }); // 83 - 42 < 42.
  assert.equal(r.store.kv.get("grant").start, Date.parse(next.start));
  assert.equal(finish(r.store, g, Date.parse(next.start), ticket, 960), false);
  assert.equal(r.store.kv.get("grant").spent, HOLD);
  const clean = rig();
  await clean.ask(); clean.advance(Date.parse(next.start));
  clean.env.VERIFIED_GRANT = settings(next).VERIFIED_GRANT;
  assert.deepEqual(await clean.status(), { available: true });
  assert.equal(clean.store.kv.get("grant").spent, 0);
});

test("client and global minute limits share the debit transaction; quota resets, funding does not", () => {
  const s = memory(), g = grant(settings(), NOW);
  const take = (bucket, t = NOW) => admission(s, g, t, slot(t, bucket), crypto.randomUUID());
  assert.equal(take(0), 200); assert.equal(take(0), 200); assert.equal(take(0), 429);
  for (let i = 1; i <= 6; i++) assert.equal(take(i), 200);
  assert.equal(take(20), 429);
  assert.equal(take(0, NOW + 60_000), 200);
  assert.equal(s.kv.get("grant").spent, HOLD * 9);
});

test("no dispatch on storage failure or if grant expires while waiting for durable commit", async () => {
  for (const fails of [true, false]) {
    const r = rig();
    r.store.sync = async () => { if (fails) throw Error("storage"); r.advance(Date.parse(period.expiry)); };
    assert.equal((await r.ask()).status, 503);
    assert.equal(r.calls.length, 0);
    assert.equal(r.store.kv.get("grant").spent, HOLD);
  }
});
