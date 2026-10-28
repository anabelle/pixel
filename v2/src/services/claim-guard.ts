/**
 * Done-proof claim guard for autonomous posts.
 *
 * Pixel's heartbeat posts kept announcing events that never happened
 * ("someone forked my dedup logic" x4 with 0 forks, "just finished my first
 * paid audit" with no revenue row, "charged 10 sats for a pixel yesterday"
 * two weeks after the last canvas sale) and promises nobody tracked
 * ("shipping the fix tonight").
 *
 * Rule: a public post may share opinions, craft, observations and clearly
 * imagined scenes freely. A post that asserts a concrete EVENT (something
 * I did, something someone did to me, a sale, a metric) must be backed by a
 * receipt the runtime can show. A post that PROMISES future work is rejected
 * outright: promises belong in a tracked ledger, not in a feed.
 *
 * Detection is deterministic. Verification of flagged event claims uses the
 * judge with the receipts block and FAILS CLOSED (no judge → no post).
 */

export type ClaimKind = "promise" | "event" | "metric";
export type ClaimHit = { kind: ClaimKind; match: string };

const PROMISE_PATTERNS: RegExp[] = [
  // "shipping the fix tonight", "launching it next week", "rolling out tomorrow"
  /\b(?:shipping|launching|releasing|deploying|rolling\s+out|dropping|publishing|opening)\b[^.!?\n]{0,40}\b(?:tonight|tomorrow|this\s+week(?:end)?|next\s+week|soon|later\s+today)\b/i,
  // "i'll ship", "i will launch", "going to build", "gonna fix"
  /\b(?:i'll|i\s+will|i'm\s+going\s+to|im\s+going\s+to|going\s+to|gonna|about\s+to)\s+(?:ship|launch|release|deploy|fix|build|open|publish|add|roll\s+out)\b/i,
  /\bcoming\s+soon\b/i,
];

const EVENT_PATTERNS: RegExp[] = [
  // First-person accomplishment, optionally "just"/"finally"/"finished ..."
  /\b(?:i|i've|i\s+have|we|we've)\s+(?:just\s+|finally\s+|already\s+)?(?:built|shipped|finished|launched|deployed|fixed|released|completed|merged|landed|charged|sold|earned|closed|signed|hired|onboarded|automated|rewrote|refactored|migrated|cut|slashed)\b/i,
  /\bjust\s+(?:finished|shipped|launched|built|deployed|released|landed|sold|closed|signed)\b/i,
  /\bmy\s+first\s+(?:paid|real|client|customer|sale|commission|audit|contract)\b/i,
  // Third parties acting on me / my work
  /\b(?:someone|somebody|a\s+stranger|strangers|a\s+user|users|a\s+buyer|a\s+client|a\s+dev(?:eloper)?|people|two\s+\w+|three\s+\w+|a\s+collector|an?\s+artist)\s+(?:just\s+|quietly\s+|finally\s+)?(?:forked|filed|sent|mailed|zapped|bought|paid|placed|painted|drew|took|found|starred|hired|commissioned|tipped|asked|reported|submitted|opened|merged|copied|stole)\b/i,
  // Subjectless past action anchored in time ("charged 10 sats ... yesterday")
  /\b(?:charged|sold|shipped|built|fixed|launched|deployed|released|finished|earned|landed|closed|received|got\s+paid)\b[^.!?\n]{0,60}\b(?:yesterday|last\s+night|this\s+week|today|this\s+morning|earlier)\b/i,
  // Time-anchored happenings ("yesterday a buyer...", "last night someone...")
  /\b(?:yesterday|last\s+night|this\s+morning|earlier\s+today|at\s+\d{1,2}\s*(?:am|pm))\b[^.!?\n]{0,60}\b(?:someone|somebody|a\s+\w+|i)\b/i,
];

const METRIC_PATTERNS: RegExp[] = [
  // Counts of my own business/world: "9k dots", "84,000 sats", "3 forks"
  /\b\d[\d,.]*\s*k?\s+(?:sats|pixels|dots|users|buyers|clients|customers|forks|stars|issues|followers|zaps|calls|requests|commits)\b/i,
];

export function detectClaims(text: string): ClaimHit[] {
  const hits: ClaimHit[] = [];
  if (!text) return hits;
  const scan = (kind: ClaimKind, patterns: RegExp[]) => {
    for (const re of patterns) {
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      for (const m of text.matchAll(g)) {
        const start = m.index ?? 0;
        const end = start + m[0].length;
        if (kind === "metric" && isPriceOffer(text.slice(Math.max(0, start - 6), start), text.slice(end, end + 10))) continue;
        hits.push({ kind, match: m[0].slice(0, 80) });
      }
    }
  };
  scan("promise", PROMISE_PATTERNS);
  scan("event", EVENT_PATTERNS);
  scan("metric", METRIC_PATTERNS);
  return hits;
}

/** Price menus ("1-10 sats per pixel", "10 sats a call") are offers, not claims. */
function isPriceOffer(before: string, after: string): boolean {
  return /\d\s*[-–‑]\s*$/.test(before) || /^\s*(?:\/|per\b|a\s+(?:pixel|call|pop|square|dot|job|request|time|choice)\b|each\b)/i.test(after);
}

export type ClaimGateDecision =
  | { action: "pass" }
  | { action: "reject"; reason: string }
  | { action: "verify"; claims: ClaimHit[] };

/** Deterministic first stage: pass, hard-reject (promises), or needs-receipt. */
export function classifyDraft(text: string): ClaimGateDecision {
  const hits = detectClaims(text);
  const promise = hits.find((h) => h.kind === "promise");
  if (promise) {
    return { action: "reject", reason: `unreceipted promise ("${promise.match}") — no future-work announcements` };
  }
  if (hits.length === 0) return { action: "pass" };
  return { action: "verify", claims: hits };
}

export const RECEIPT_GATE = [
  "You verify factual claims in a draft social post against a RECEIPTS ledger.",
  "Opinions, metaphors, craft talk, general observations about the world, and scenes clearly framed as imagined or hypothetical are fine.",
  "Reject the draft if it states, as something that actually happened, any specific event, sale, payment, fork, issue, audit, client, fix, launch, user action, or number that is NOT directly supported by the receipts.",
  "Numbers must match the receipts (rounding is ok). Present-tense activity claims (\"buyers are painting right now\") need a recent receipt.",
  "When in doubt, reject.",
].join(" ");

export type Judge = (instruction: string, ...context: string[]) => Promise<{ ok: boolean; reason?: string } | null>;

/**
 * Full gate. Returns null when the draft may publish, or a reject reason.
 * Fails closed: if verification is needed and the judge is unavailable,
 * the draft does not publish.
 */
export async function claimGate(draft: string, receipts: string, judge: Judge): Promise<string | null> {
  const decision = classifyDraft(draft);
  if (decision.action === "pass") return null;
  if (decision.action === "reject") return decision.reason;
  const v = await judge(
    RECEIPT_GATE,
    `RECEIPTS:\n${receipts || "(none)"}`,
    `Flagged phrases: ${decision.claims.map((c) => `[${c.kind}] ${c.match}`).join(" | ")}`,
    `Draft: ${draft.slice(0, 600)}`,
  );
  if (v === null) return "claim needs a receipt and verifier unavailable (fail-closed)";
  if (!v.ok) return `unreceipted claim (${v.reason ?? "no receipt"}) — share an opinion or observation instead, or cite only what the receipts show`;
  return null;
}

export const DONE_PROOF_GUIDELINES = `## Done-proof (hard rule)
- Only state that something HAPPENED (you built/shipped/fixed/sold something, someone forked/paid/zapped/painted/asked, a number) if it appears in the Receipts block above. No receipt, no claim.
- Never announce future work ("shipping tonight", "launching soon", "I'll add..."). Ship first, then talk about it with the receipt.
- Opinions, craft, observations about the wider world, and openly imagined scenes ("imagine a...") are always fine.`;
