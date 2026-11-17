import { IDS, MODEL } from "../src/policy.js";

// Synthetic periods and credentials for offline tests only.
export const NOW = Date.parse("2026-05-31T20:30:00Z");
export const period = { org: "org-fixture", project: "proj_fixture", cents: 1000,
  start: "2026-05-19T00:00:00Z", expiry: "2026-06-19T00:00:00Z" };
export const settings = overrides => ({ ENABLED: "true", OPENAI_API_KEY: "sk-" + "x".repeat(20),
  THROTTLE_SECRET: "a".repeat(64), VERIFIED_GRANT: JSON.stringify({ ...period, ...overrides }) });
export const knowledge = Object.fromEntries(IDS.map(id => [id, "Public fixture: " + id]));
export function completion(ticket) {
  return { id: "resp_fixture", object: "response", status: "completed", service_tier: "default",
    model: MODEL, metadata: { reservation: ticket }, error: null, incomplete_details: null,
    usage: { input_tokens: 2000, output_tokens: 100, total_tokens: 2100 },
    output: [{ type: "message", role: "assistant", content: [{ type: "output_text",
      text: JSON.stringify({ answer: "A short answer.", sources: ["research"] }) }] }] };
}

export function memory() {
  const map = new Map();
  return { kv: { get: k => structuredClone(map.get(k)), put: (k, v) => map.set(k, structuredClone(v)) },
    transactionSync: fn => fn(), sync: async () => {} };
}
