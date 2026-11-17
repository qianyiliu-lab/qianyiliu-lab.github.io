import { HOLD } from "./policy.js";

const KEY = "grant";
const RATE = "throttle";
export const minute = t => Math.floor(t / 60_000);

// The only path to an upstream call is a successful committed reservation here.
export function admission(storage, g, now, client = null, ticket = null) {
  return storage.transactionSync(() => {
    const kv = storage.kv;
    let row = kv.get(KEY);
    if (row !== undefined) {
      if (row.version !== 1 || row.org !== g.org || row.project !== g.project ||
          ![row.start, row.end, row.cap, row.spent, row.pending].every(Number.isSafeInteger) ||
          row.start >= row.end || row.cap < 0 || row.cap > 1000 || row.spent < row.pending ||
          row.spent > 10_000_000 || row.pending < 0 || row.pending % HOLD !== 0 ||
          !Array.isArray(row.tickets) || row.tickets.length * HOLD > row.pending ||
          typeof row.blocked !== "boolean") return 503;
      if (g.start === row.start) {
        if (g.end !== row.end || g.cents > row.cap) return 503;
        if (g.cents < row.cap) {
          row.cap = g.cents; // A later rollback cannot raise an observed reduction.
          kv.put(KEY, row);
        }
      } else if (g.start < row.end) return 503;
    }
    if (!row || row.start !== g.start) {
      // Unknown or still-in-flight charges can cross a provider billing boundary.
      const carry = row?.pending ?? 0;
      row = { version: 1, org: g.org, project: g.project, start: g.start, end: g.end,
        cap: g.cents, spent: carry, pending: carry, tickets: [], blocked: false };
      kv.put(KEY, row);
    }
    if (row.blocked || row.spent + HOLD > row.cap * 10_000) return 503;

    const window = minute(now);
    let rate = kv.get(RATE);
    if (rate && rate.window > window) return 503;
    if (!rate || rate.window !== window) rate = { window, total: 0, buckets: {} };
    if (rate.total >= 8) return 429;
    if (!client) return 200; // Status never reserves or consumes a throttle slot.
    if (!ticket || row.tickets.includes(ticket)) return 503;
    if (client.window !== window || !Number.isInteger(client.bucket) ||
        client.bucket < 0 || client.bucket > 255) return 429;
    const count = rate.buckets[client.bucket] ?? 0;
    if (count >= 2) return 429;
    rate.buckets[client.bucket] = count + 1;
    rate.total++;
    row.spent += HOLD;
    row.pending += HOLD;
    row.tickets.push(ticket);
    kv.put(RATE, rate);
    kv.put(KEY, row);
    return 200;
  });
}

export function finish(storage, g, now, ticket, charge) {
  return storage.transactionSync(() => {
    const row = storage.kv.get(KEY);
    if (!row || row.org !== g.org || row.project !== g.project || row.start !== g.start ||
        row.end !== g.end || now >= g.end || !row.tickets.includes(ticket)) return false;
    if (charge === "block") row.blocked = true; // Keep the hold; stop this verified grant.
    else {
      if (!Number.isSafeInteger(charge) || charge <= 0 || charge > HOLD) return false;
      row.pending -= HOLD;
      row.spent -= HOLD - charge;
    }
    row.tickets = row.tickets.filter(t => t !== ticket); // Consume once, in the same transaction.
    storage.kv.put(KEY, row);
    return true;
  });
}
