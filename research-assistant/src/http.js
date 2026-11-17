import { BODY_BYTES, ORIGIN, SINGLETON, grant, validQuestion } from "./policy.js";
import { minute } from "./ledger.js";

class BodyError extends Error {
  constructor(status) { super(); this.status = status; }
}

export async function readJson(message, limit) {
  const length = message.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new BodyError(413);
  if (!message.body) throw new BodyError(400);
  const reader = message.body.getReader(), buffer = new Uint8Array(limit);
  let offset = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.length > limit) {
        reader.cancel().catch(() => {});
        throw new BodyError(413);
      }
      buffer.set(value, offset);
      offset += value.length;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, offset)));
  } finally { reader.releaseLock(); }
}

async function clientSlot(request, secret, now) {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!request.cf || request.headers.has("CF-Worker") || !ip || ip.length > 45 ||
      !/^[0-9a-f:.]+$/i.test(ip)) return null;
  const encoder = new TextEncoder(), window = minute(now);
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(window + ":" + ip));
  // Only an 8-bit, many-to-one counter index leaves the edge. No client identifier is stored.
  return { window, bucket: new Uint8Array(digest)[0] };
}

export async function handle(request, env, now = Date.now) {
  const { pathname, search } = new URL(request.url);
  const statusRoute = pathname === "/status";
  const origin = request.headers.get("Origin");
  const headers = { "Cache-Control": "no-store", Vary: "Origin", "X-Content-Type-Options": "nosniff" };
  const reply = (status, body) => Response.json(body ?? (statusRoute ? { available: false } :
    { error: ({ 400: "Invalid request.", 403: "Forbidden.", 404: "Not found.", 405: "Method not allowed.",
      413: "Request too large.", 415: "Expected JSON.", 429: "Please try again later." })[status] ??
      "Assistant unavailable." }), { status, headers });
  if (origin !== null && origin !== ORIGIN) return reply(403);
  if (origin === ORIGIN) headers["Access-Control-Allow-Origin"] = ORIGIN;
  if (search || (!statusRoute && pathname !== "/ask")) return reply(404);
  if ((!statusRoute && origin !== ORIGIN) || request.headers.has("Authorization") ||
      request.headers.has("Cookie")) return reply(403);
  const method = statusRoute ? "GET" : "POST";
  if (request.method === "OPTIONS") {
    if (origin !== ORIGIN || request.headers.get("Access-Control-Request-Method") !== method ||
        (request.headers.get("Access-Control-Request-Headers") || "").split(",")
          .some(h => !["", "content-type"].includes(h.trim().toLowerCase()))) return reply(403);
    return new Response(null, { status: 204, headers: { ...headers,
      "Access-Control-Allow-Methods": method, "Access-Control-Allow-Headers": "Content-Type" } });
  }
  if (request.method !== method) return reply(405);
  try {
    if (!grant(env, now())) return reply(statusRoute ? 200 : 503);
    const stub = env.LEDGER.getByName(SINGLETON);
    if (statusRoute) return reply(200, { available: await stub.available(env.VERIFIED_GRANT) === true });
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("Content-Type") || "") ||
        request.headers.has("Content-Encoding")) return reply(415);
    const slot = await clientSlot(request, env.THROTTLE_SECRET, now());
    if (!slot) return reply(403);
    let input;
    try { input = await readJson(request, BODY_BYTES); }
    catch (e) { return reply(e instanceof BodyError ? e.status : 400); }
    if (!validQuestion(input)) return reply(400);
    const result = await stub.ask(env.VERIFIED_GRANT, slot, input);
    return result.status === 200 ? reply(200, result.body) : reply(result.status);
  } catch { return reply(statusRoute ? 200 : 503); }
}
