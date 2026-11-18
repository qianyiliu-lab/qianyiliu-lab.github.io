# Research assistant Worker

## Publish the disabled endpoint first (no OpenAI key)

Run these commands **inside this directory**, using Node 24 and pnpm 11. No OpenAI account, grant, API key or payment method is required for this stage.

~~~sh
pnpm install --frozen-lockfile
pnpm test
pnpm run check:bundle
pnpm exec wrangler whoami
~~~

The bundle check is a dry run, not a deployment. If Cloudflare authentication timed out, run `pnpm exec wrangler login`, complete the browser flow, then repeat `pnpm exec wrangler whoami`. Do not use a temporary account. Confirm the intended Cloudflare account is on **Workers Free**, with a workers.dev subdomain. SQLite-backed Durable Objects are included, subject to [free-plan limits](https://developers.cloudflare.com/durable-objects/platform/pricing/).

When **you** are ready to publish, keep `ENABLED` set to `"false"` and run:

~~~sh
pnpm exec wrangler deploy
~~~

Use the actual workers.dev URL printed by Wrangler. The homepage uses the public origin in `_config.yml`; check its `/status` after deployment. When disabled, expect HTTP 200 and `{"available":false}`. Disabled requests never contact OpenAI or instantiate the ledger. There is no preview URL, custom domain, scheduled job or automatic activation. A public status check consumes a Cloudflare request, not OpenAI credit. A Free-plan quota failure is not a reason to upgrade or add funding.

## Before enabling answers

1. **Verify the grant yourself.** In the [OpenAI billing dashboard](https://platform.openai.com/settings/organization/billing/overview), select the dedicated organization linked to the eligible Pro subscription. Confirm the actual issued grant, start, expiry and *remaining* promotional credit. Allocate at most the smaller of that remaining amount and 1,000 US cents, rounded down. Use the real subscription cycle, including any prorated first period. This Worker cannot verify entitlement, payment methods, available funding or competing usage live.
2. **Isolate billing.** Require a dedicated promo-only organization, dedicated project and restricted server-side project key for Responses. No purchased balance, auto-recharge, invoice/paid fallback, other keys, workloads or competing spend against this allocation. Do not buy credits. Organization/project headers pin every request to the attested tenant. [Subscription credit behavior](https://developers.openai.com/api/docs/guides/chatgpt-api-credits) makes this isolation important: purchased credit can be consumed after promo credit runs out. Project budget alerts are not a hard cap.
3. **Verify privacy and pricing.** This application does not persist prompts, answers or IP addresses; Responses uses `store:false`. Standard provider abuse-monitoring retention may still apply; the live composer discloses this before submission. If you require zero retention at the provider, keep the service off until effective Zero Data Retention is confirmed for the project. Do not enable request-body logging, payload tracing, a logging proxy, or AI Gateway. Review [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) and the model links below.
4. **Check the trusted corpus.** The parent site generates `src/knowledge.json`, a plain object with nonempty public text for each of the seven IDs below. Missing/extra keys, empty sections or an oversized corpus disable Q&A. Regenerate and rebundle after public content changes. Never put secrets or unpublished work in it.
5. **Set secrets on the disabled Worker** using the interactive prompts below or the official Cloudflare dashboard (Worker Settings → Variables and Secrets → Add → Secret). Never paste values into this repository, shell arguments, chat, or the public homepage. Follow [Cloudflare secret handling](https://developers.cloudflare.com/workers/configuration/secrets/).

~~~sh
pnpm exec wrangler secret put OPENAI_API_KEY
pnpm exec wrangler secret put THROTTLE_SECRET
pnpm exec wrangler secret put VERIFIED_GRANT
~~~

Use a cryptographically random 32-byte secret encoded as 64 lowercase hex digits for `THROTTLE_SECRET`. Keep it stable. `VERIFIED_GRANT` is a single JSON object; setting it is the owner's attestation to steps 1-3. Its fields (no real grant values are provided):

| Field | Required value |
| --- | --- |
| `org`, `project` | Exact OpenAI organization ID (`org-...`) and project ID (`proj_...`) associated with the dedicated key |
| `start`, `expiry` | Actual grant instants, UTC ISO strings `YYYY-MM-DDTHH:mm:ssZ` or milliseconds `.sssZ` |
| `cents` | JSON **integer** from 0 to 1000, the remaining amount exclusively allocated when first armed; never a new allowance on redeploy |

6. Enable only after verification: `pnpm exec wrangler deploy --var ENABLED:true`. Check `/status`; do not use a paid question as a health check. To disable, deploy the unmodified checked-in config again (`pnpm exec wrangler deploy`). Disabling cannot cancel a request already sent. For suspected compromise also revoke the OpenAI key.
7. **Each new cycle requires a fresh manual verification.** Deploy disabled, verify the newly issued nonoverlapping grant and its remaining balance, update the grant secret and explicitly enable again. There is no monthly reset, rollover of unused credit, or assumption that the subscription renewed. A smaller same-grant cap is a reduction of the *total*, not an extra balance; observed reductions cannot be reversed. Switching tenant/project, extending the same grant, overlapping periods or increasing an existing cap fails closed.

Never create a second production Worker/environment/namespace against the same grant. Preserve the Worker, class, migration, singleton name and Durable Object storage across releases. Do not delete, restore or reset the ledger to reclaim holds. Disable first and reconcile billing offline if ownership, prices, pending charges or storage integrity are in doubt.

## What a request costs

Only the [pinned GPT-4.1 mini snapshot](https://developers.openai.com/api/docs/models/gpt-4.1-mini) is used with the standard [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), no tools and a 384-token output cap. Published text rates are $0.40 input and $1.60 output per million tokens. Never assume caching discounts. The snapshot is deprecated: [scheduled shutdown January 14, 2027](https://developers.openai.com/api/docs/deprecations). The code stops admitting requests one minute before that date (UTC) or grant expiry, whichever comes first. No model fallback. Recheck prices, access and lifecycle before every grant; disable immediately if they change.

Every dispatch first reserves **42 cents**. This bounds the entire 1,047,576-token context at the input rate plus the maximum output, rounded up to a whole cent. It does not guess at hidden envelope tokens. Separately, the visitor body is limited to 8 KiB while streaming, trusted context to 32 KiB, and the **entire serialized request** to 48 KiB.

The named singleton atomically checks both minute throttles and funding and writes a unique ticket in a [SQLite-backed DO transaction](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/). It awaits durable writes before the single outbound POST. Only an unambiguous completed response for that ticket, correct model/tier, valid answer and consistent bounded usage can settle. Settlement consumes the ticket exactly once and charges undiscounted usage, rounded **up** to a microdollar. For example, 2,000 input + 100 output tokens settle to $0.000960, not $0.42. Admission still requires a full free hold; less than 42 cents of headroom is unusable.

There is no provider retry. Timeouts, crashes, redirects, malformed replies, late replies and missing usage keep the full hold. A visitor retry must acquire its own ticket. Unresolved liabilities count against subsequent verified grants too. Provider HTTP 401/402/403/404/429 stops admissions for the rest of that grant; no public unlock or refund endpoint exists. A status response is advisory, not a reservation.

## Browser contract

- `GET /status` returns only `{"available":true|false}`; it never calls OpenAI. Originless status probes are allowed.
- `POST /ask` from **https://qianyiliu-lab.github.io** requires `Content-Type: application/json`. Use `credentials:"omit"`; do not send cookies or authorization. Body: `{"question":"What does Qianyi study?"}`, optionally with `history` of up to six `{role,content}` entries (`user` or `assistant` only). Question and each entry: at most 2,048 UTF-8 bytes.
- Success: `{answer:string,sources:string[]}`. Render the answer as text, never HTML. Map source IDs locally: `research`, `publications`, `projects`, `awards-news`, `teaching`, `cv`, `contact`. No model-supplied URLs. Errors are generic; 429 means throttled, 503 means unavailable.
- Only direct Cloudflare edge traffic with platform-provided `CF-Connecting-IP` may ask. Do not put another Worker in front of this endpoint. Each UTC minute allows eight global admissions and two per client bucket. An HMAC of platform IP and minute selects one of 256 shared counters; only the bucket counts persist, never IPs, full digests, questions or histories. Collisions can conservatively throttle unrelated clients. An Origin check is a browser restriction, **not authentication**; a non-browser client can imitate it. The ledger remains authoritative.

The Node tests use synthetic grants and provider responses, including a two-Worker race against a real local workerd SQLite Durable Object. No test uses a live provider, credential, or Cloudflare account. The site UI and Jekyll exclusion belong to the parent project.
