import { DurableObject } from "cloudflare:workers";
import knowledge from "./knowledge.json";
import { handle } from "./http.js";
import { contextFrom } from "./policy.js";
import { service } from "./service.js";

const context = contextFrom(knowledge);

export class BudgetLedger extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = service(ctx.storage, env, context);
  }
  available(proof) { return this.core.available(proof); }
  ask(proof, slot, input) { return this.core.ask(proof, slot, input); }
}

export default { fetch(request, env) { return handle(request, env); } };
