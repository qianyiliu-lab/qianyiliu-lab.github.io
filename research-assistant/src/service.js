import { GUARD_MS, RETIREMENT, TIMEOUT_MS, grant, parseAnswer, prompt, validQuestion } from "./policy.js";
import { admission, finish } from "./ledger.js";
import { readJson } from "./http.js";

export function service(storage, env, context, send = fetch, now = Date.now) {
  const current = proof => context && proof === env.VERIFIED_GRANT && grant(env, now());
  return {
    available(proof) {
      const g = current(proof);
      return Boolean(g && admission(storage, g, now()) === 200);
    },
    async ask(proof, slot, input) {
      const g = current(proof);
      if (!g || !slot) return { status: 503 };
      if (!validQuestion(input)) return { status: 400 };
      const ticket = crypto.randomUUID();
      const body = prompt(context, input, ticket);
      if (!body) return { status: 413 };
      const status = admission(storage, g, now(), slot, ticket);
      if (status !== 200) return { status };
      await storage.sync();
      if (now() + GUARD_MS >= Math.min(g.end, RETIREMENT)) return { status: 503 };

      // At most one dispatch. Every failure from here keeps the entire reservation.
      try {
        const response = await send("https://api.openai.com/v1/responses", {
          method: "POST", redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.OPENAI_API_KEY,
            "OpenAI-Organization": g.org, "OpenAI-Project": g.project }, body
        });
        if (!response.ok) {
          if ([401, 402, 403, 404, 429].includes(response.status)) finish(storage, g, now(), ticket, "block");
          response.body?.cancel().catch(() => {});
          return { status: 503 };
        }
        const answer = parseAnswer(await readJson(response, 65_536), ticket);
        if (!answer) return { status: 503 };
        if (!finish(storage, g, now(), ticket, answer.charge)) return { status: 503 };
        return { status: 200, body: answer.body };
      } catch { return { status: 503 }; }
    }
  };
}
