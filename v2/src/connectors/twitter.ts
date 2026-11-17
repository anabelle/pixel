/**
 * Twitter/X Connector — hybrid scraper + API v2
 *
 * Scraper: cookie-cached login, getTweet(), sendTweet() (GraphQL endpoints still work)
 * API v2: OAuth 1.0a signed — mentions polling, search (scraper search returns 404 since Feb 2026)
 *
 * Pattern: receive mention → identify user → load context → prompt agent → reply
 * Exports: startTwitter(), postTweet(), searchTwitter(), getTweet(), getTwitterStatus()
 *
 * Safety: TWITTER_POST_ENABLE=false for read-only mode (default).
 * Rate limits: 2 posts/day, 4h minimum gap between posts, 4h lockout on 429.
 * Replies have a separate budget (8/day, no gap). Nothing is ever truncated: over-length text is refused and rewritten.
 */

import { Scraper } from "@the-convocation/twitter-scraper";
import { promptWithHistory } from "../agent.js";
import { appendToLog } from "../conversations.js";
import { audit } from "../services/audit.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import crypto from "crypto";

// ============================================================
// Configuration
// ============================================================

const TWITTER_USERNAME = process.env.TWITTER_USERNAME ?? "";
const TWITTER_PASSWORD = process.env.TWITTER_PASSWORD ?? "";
const TWITTER_EMAIL = process.env.TWITTER_EMAIL ?? "";
const POST_ENABLED = process.env.TWITTER_POST_ENABLE === "true";
const COOKIE_PATH = "/app/data/twitter-cookies.json";
const MAX_POSTS_PER_DAY = 2; // Free tier is 17/24h, but rate limits are aggressive — stay conservative
const MIN_POST_GAP_MS = 4 * 60 * 60 * 1000; // 4 hours between posts
const MENTION_POLL_MS = 15 * 60 * 1000; // 15 minutes
const MENTION_POLL_STARTUP_MS = 5 * 60 * 1000; // 5 min after boot
const MAX_MENTION_REPLIES_PER_CYCLE = 3;
// Replies have their own budget: a mention answer must not be blocked by the 4h gap of autonomous posts.
const MAX_REPLIES_PER_DAY = 8;
const TWEET_MAX = 280;
const MAX_REPLY_ATTEMPTS = 3; // per mention, across poll cycles, before giving up loudly
const SELF_CHECK_MS = 24 * 60 * 60 * 1000;
const SELF_CHECK_STARTUP_MS = 20 * 60 * 1000;
const POSTED_LOG_PATH = "/app/data/x-posted.jsonl";
const SELF_VIEW_PATH = "/app/data/x-self-view.json";

// Twitter API v2 credentials (OAuth 1.0a)
const API_KEY = process.env.TWITTER_API_KEY ?? "";
const API_SECRET = process.env.TWITTER_API_SECRET_KEY ?? "";
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN ?? "";
const ACCESS_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET ?? "";
const hasApiV2Creds = !!(API_KEY && API_SECRET && ACCESS_TOKEN && ACCESS_SECRET);

// ============================================================
// Tweet length as X counts it (twitter-text v3 weights: most Latin/punctuation = 1, CJK/emoji = 2, URL = 23)
// ============================================================

export function tweetLength(text: string): number {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, "");
  const urlCount = (text.match(/https?:\/\/\S+/g) ?? []).length;
  let n = urlCount * 23;
  for (const ch of withoutUrls) {
    const cp = ch.codePointAt(0) ?? 0;
    const light = cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247);
    n += light ? 1 : 2;
  }
  return n;
}

export function fitsTweet(text: string): boolean {
  return tweetLength(text) <= TWEET_MAX;
}

// ============================================================
// OAuth 1.0a signing (for Twitter API v2)
// ============================================================

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateOAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(API_SECRET)}&${percentEncode(ACCESS_SECRET)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
  oauthParams["oauth_signature"] = signature;
  const parts = Object.keys(oauthParams).sort().map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`);
  return `OAuth ${parts.join(", ")}`;
}

/** Make an authenticated Twitter API v2 request */
async function twitterApiV2(method: string, url: string, params: Record<string, string> = {}): Promise<{ ok: boolean; status: number; data: any; rateLimitRemaining?: number; rateLimitReset?: number }> {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const fullUrl = qs ? `${url}?${qs}` : url;
  const authHeader = generateOAuthHeader(method, url, params);
  const resp = await fetch(fullUrl, { headers: { Authorization: authHeader } });
  const body = await resp.text();
  let data: any;
  try { data = JSON.parse(body); } catch { data = body; }
  const rateLimitRemaining = parseInt(resp.headers.get("x-rate-limit-remaining") ?? "", 10) || undefined;
  const rateLimitReset = parseInt(resp.headers.get("x-rate-limit-reset") ?? "", 10) || undefined;
  return { ok: resp.ok, status: resp.status, data, rateLimitRemaining, rateLimitReset };
}

// ============================================================
// State
// ============================================================

let scraper: Scraper | null = null;
let running = false;
let mentionTimer: ReturnType<typeof setTimeout> | null = null;
let lastPostTime = 0;
let postsToday = 0;
let postsDayStart = 0; // timestamp of when we started counting
let rateLimitLockoutUntil = 0; // timestamp — posting blocked until this time (set on 429)
let consecutiveFailures = 0; // track consecutive post failures for backoff
let twitterUserId = ""; // numeric ID, resolved at boot via API v2
let mentionSinceId: string | null = null; // pagination cursor for mention polling
let apiV2DegradedReason: string | null = null;
let repliesToday = 0;
let repliesDayStart = 0;
let selfCheckTimer: ReturnType<typeof setTimeout> | null = null;
const mentionFailures = new Map<string, number>();
const repliedTweetIds = new Set<string>();
const readOnlySeenTweetIds = new Set<string>();
const REPLIED_IDS_PATH = "/app/data/twitter-replied.json";
const RATELIMIT_PATH = "/app/data/twitter-ratelimit.json";

function isTwitterProjectConfigError(data: any): boolean {
  const raw = typeof data === "string" ? data : JSON.stringify(data);
  return raw.includes("attached to a Project");
}

function disableApiV2(reason: string, data?: any): void {
  if (apiV2DegradedReason === reason) return;
  apiV2DegradedReason = reason;
  if (mentionTimer) {
    clearTimeout(mentionTimer);
    mentionTimer = null;
  }
  console.error(`[twitter] API v2 disabled: ${reason}`);
  audit("twitter_error", `API v2 disabled: ${reason}`, data ? { detail: typeof data === "string" ? data : JSON.stringify(data).slice(0, 500) } : undefined);
}

// ============================================================
// Cookie persistence
// ============================================================

async function saveCookies(): Promise<void> {
  if (!scraper) return;
  try {
    const cookies = await scraper.getCookies();
    writeFileSync(COOKIE_PATH, JSON.stringify(cookies));
  } catch (err: any) {
    console.error("[twitter] Failed to save cookies:", err.message);
  }
}

async function loadCookies(): Promise<boolean> {
  if (!scraper || !existsSync(COOKIE_PATH)) return false;
  try {
    const raw = readFileSync(COOKIE_PATH, "utf-8");
    const cookies = JSON.parse(raw);
    await scraper.setCookies(cookies);
    const loggedIn = await scraper.isLoggedIn();
    if (loggedIn) console.log("[twitter] Restored session from cookies");
    return loggedIn;
  } catch (err: any) {
    console.error("[twitter] Failed to load cookies:", err.message);
    return false;
  }
}

function loadRepliedIds(): void {
  if (!existsSync(REPLIED_IDS_PATH)) {
    mentionSinceId = null;
    return;
  }
  try {
    const raw = readFileSync(REPLIED_IDS_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      data.forEach((id) => repliedTweetIds.add(id));
      mentionSinceId = null;
      return;
    }
    const replied: string[] = Array.isArray(data?.replied) ? data.replied : [];
    const readOnly: string[] = Array.isArray(data?.readOnly) ? data.readOnly : [];
    replied.forEach((id) => repliedTweetIds.add(id));
    readOnly.forEach((id) => readOnlySeenTweetIds.add(id));
    if (data?.sinceId) mentionSinceId = data.sinceId;
    else mentionSinceId = null;
  } catch {
    mentionSinceId = null;
  }
}

function resetMentionSinceIdIfEmpty(): void {
  // Deprecated: loadRepliedIds() now handles empty/no-file reset
}

function saveRepliedIds(): void {
  try {
    // Keep only last 500 in each bucket
    const replied = [...repliedTweetIds].slice(-500);
    const readOnly = [...readOnlySeenTweetIds].slice(-500);
    writeFileSync(REPLIED_IDS_PATH, JSON.stringify({ replied, readOnly, sinceId: mentionSinceId }));
  } catch { /* ignore */ }
}

// ============================================================
// Rate limit persistence (survives reboots)
// ============================================================

function loadRateLimitState(): void {
  if (!existsSync(RATELIMIT_PATH)) return;
  try {
    const raw = readFileSync(RATELIMIT_PATH, "utf-8");
    const state = JSON.parse(raw);
    lastPostTime = state.lastPostTime ?? 0;
    postsToday = state.postsToday ?? 0;
    postsDayStart = state.postsDayStart ?? 0;
    rateLimitLockoutUntil = state.rateLimitLockoutUntil ?? 0;
    consecutiveFailures = state.consecutiveFailures ?? 0;
    repliesToday = state.repliesToday ?? 0;
    repliesDayStart = state.repliesDayStart ?? 0;
    const lockoutRemaining = rateLimitLockoutUntil > Date.now() ? Math.round((rateLimitLockoutUntil - Date.now()) / 60_000) + "m" : "none";
    console.log(`[twitter] Restored rate limit state: ${postsToday} posts today, last post ${lastPostTime ? Math.round((Date.now() - lastPostTime) / 60_000) + "m ago" : "never"}, lockout: ${lockoutRemaining}`);
  } catch {
    console.error("[twitter] Failed to load rate limit state — starting fresh");
  }
}

function saveRateLimitState(): void {
  try {
    writeFileSync(RATELIMIT_PATH, JSON.stringify({ lastPostTime, postsToday, postsDayStart, rateLimitLockoutUntil, consecutiveFailures, repliesToday, repliesDayStart }));
  } catch { /* ignore */ }
}

// ============================================================
// Login
// ============================================================

async function ensureLoggedIn(): Promise<boolean> {
  if (!scraper) scraper = new Scraper();
  if (await loadCookies()) return true;

  if (!TWITTER_USERNAME || !TWITTER_PASSWORD) {
    console.log("[twitter] No credentials configured — cannot log in");
    return false;
  }

  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    try {
      console.log(`[twitter] Logging in as @${TWITTER_USERNAME} (attempt ${i}/${attempts})`);
      await scraper.login(TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL);
      const loggedIn = await scraper.isLoggedIn();
      if (loggedIn) {
        console.log("[twitter] Login successful");
        await saveCookies();
        return true;
      }
      console.error("[twitter] Login returned but isLoggedIn() is false");
    } catch (err: any) {
      console.error("[twitter] Login failed:", err.message);
      audit("twitter_error", `Login failed: ${err.message}`);
    }

    // Simple backoff: 5s, 10s
    if (i < attempts) await new Promise((r) => setTimeout(r, 5000 * i));
  }

  return false;
}

// ============================================================
// Post rate limiting
// ============================================================

function resetDailyCounterIfNeeded(): void {
  const now = Date.now();
  if (now - postsDayStart > 24 * 60 * 60 * 1000) {
    postsToday = 0;
    postsDayStart = now;
  }
}

function canPost(): { ok: boolean; reason?: string } {
  if (!POST_ENABLED) return { ok: false, reason: "TWITTER_POST_ENABLE=false" };
  if (apiV2DegradedReason) return { ok: false, reason: `Twitter API v2 degraded: ${apiV2DegradedReason}` };
  resetDailyCounterIfNeeded();
  if (postsToday >= MAX_POSTS_PER_DAY) return { ok: false, reason: `Daily limit (${MAX_POSTS_PER_DAY}) reached` };
  if (Date.now() - lastPostTime < MIN_POST_GAP_MS) return { ok: false, reason: "Min 4h gap between posts" };
  if (Date.now() < rateLimitLockoutUntil) {
    const minutesLeft = Math.ceil((rateLimitLockoutUntil - Date.now()) / 60_000);
    return { ok: false, reason: `Rate-limited by Twitter — locked out for ${minutesLeft} more minutes. Do NOT retry.` };
  }
  return { ok: true };
}

function canReply(): { ok: boolean; reason?: string } {
  if (!POST_ENABLED) return { ok: false, reason: "TWITTER_POST_ENABLE=false" };
  if (apiV2DegradedReason) return { ok: false, reason: `Twitter API v2 degraded: ${apiV2DegradedReason}` };
  const now = Date.now();
  if (now - repliesDayStart > 24 * 60 * 60 * 1000) {
    repliesToday = 0;
    repliesDayStart = now;
  }
  if (repliesToday >= MAX_REPLIES_PER_DAY) return { ok: false, reason: `Daily reply limit (${MAX_REPLIES_PER_DAY}) reached` };
  if (now < rateLimitLockoutUntil) {
    const minutesLeft = Math.ceil((rateLimitLockoutUntil - now) / 60_000);
    return { ok: false, reason: `Rate-limited by Twitter — locked out for ${minutesLeft} more minutes. Do NOT retry.` };
  }
  return { ok: true };
}

function recordPosted(entry: Record<string, unknown>): void {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
    writeFileSync(POSTED_LOG_PATH, line, { flag: "a" });
  } catch { /* ignore */ }
}

/** Check if posting is allowed right now (rate limits + enable flag). */
export function canPostTweet(): { ok: boolean; reason?: string } {
  return canPost();
}

// ============================================================
// Public API
// ============================================================

/** Post a tweet via API v2. Respects rate limits and read-only mode. */
export async function postTweet(text: string, replyToId?: string): Promise<{ success: boolean; error?: string; tweetId?: string }> {
  const check = replyToId ? canReply() : canPost();
  if (!check.ok) return { success: false, error: check.reason };
  if (!hasApiV2Creds) return { success: false, error: "No API v2 credentials" };
  const weighted = tweetLength(text);
  if (weighted > TWEET_MAX) {
    audit("twitter_error", `Refused over-length tweet (${weighted}/${TWEET_MAX}): ${text.slice(0, 60)}`);
    return { success: false, error: `TOO_LONG: ${weighted} chars, X limit is ${TWEET_MAX}. Rewrite it shorter (aim for 250) — nothing was posted.` };
  }

  try {
    const url = "https://api.twitter.com/2/tweets";
    const body: any = { text };
    if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

    // OAuth 1.0a for POST: sign only OAuth params, not JSON body
    const authHeader = generateOAuthHeader("POST", url);
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await resp.json() as any;
    // Log rate limit headers for debugging
    const rlRemaining = resp.headers.get("x-rate-limit-remaining");
    const rlReset = resp.headers.get("x-rate-limit-reset");
    const rlLimit = resp.headers.get("x-rate-limit-limit");
    if (rlRemaining || rlReset) {
      const resetIn = rlReset ? Math.ceil((parseInt(rlReset) * 1000 - Date.now()) / 60_000) + "min" : "unknown";
      audit("twitter_ratelimit", `Post rate limits: ${rlRemaining ?? "?"}/${rlLimit ?? "?"} remaining, resets in ${resetIn}`, { remaining: rlRemaining, limit: rlLimit, resetIn });
    }
    if (!resp.ok) {
      const errMsg = json?.detail || json?.title || JSON.stringify(json).slice(0, 200);

      if (resp.status === 403 && isTwitterProjectConfigError(json)) {
        disableApiV2("keys and tokens are not attached to a Twitter Project; manual developer-portal fix required", json);
        return { success: false, error: "TWITTER_API_PROJECT_MISCONFIG: keys and tokens are not attached to a Twitter Project. Manual fix required in Twitter developer portal." };
      }
      if (resp.status === 401) {
        disableApiV2("API v2 credentials rejected (401) — token revoked, expired, or mismatched", json);
        return { success: false, error: "TWITTER_AUTH_FAILED: API v2 token rejected (401). Token revoked or expired. Do NOT retry until credentials are updated." };
      }

      consecutiveFailures++;

      if (resp.status === 429) {
        // 429 lockout: block posting for 4 hours (prevents LLM retry storm, respects free tier limits)
        const lockoutMs = 4 * 60 * 60 * 1000;
        rateLimitLockoutUntil = Date.now() + lockoutMs;
        // Also count against daily limit to prevent further attempts
        postsToday = MAX_POSTS_PER_DAY;
        saveRateLimitState();
        audit("twitter_error", `Post 429 rate-limited — locked out for 4h. Text: ${text.slice(0, 60)}`);
        return { success: false, error: `RATE_LIMITED: Twitter returned 429. Posting locked for 4 hours. Do NOT retry this tweet.` };
      }

      // For other errors, apply exponential backoff via consecutive failure tracking
      if (consecutiveFailures >= 3) {
        // After 3 consecutive failures, lock out for 15 minutes
        rateLimitLockoutUntil = Date.now() + 15 * 60 * 1000;
        saveRateLimitState();
        audit("twitter_error", `Post failed ${consecutiveFailures}x consecutively — locked out 15min: ${errMsg}`);
        return { success: false, error: `CONSECUTIVE_FAILURES: ${consecutiveFailures} failures in a row. Posting locked for 15 minutes. Do NOT retry.` };
      }

      audit("twitter_error", `Post failed (${resp.status}): ${errMsg}`);
      return { success: false, error: errMsg };
    }

    consecutiveFailures = 0; // reset on success
    const tweetId = json?.data?.id;
    if (replyToId) {
      repliesToday++;
    } else {
      lastPostTime = Date.now();
      postsToday++;
    }
    saveRateLimitState();
    const servedText: string | undefined = json?.data?.text;
    recordPosted({ tweetId, replyToId: replyToId ?? null, sent: text, served: servedText ?? null, length: weighted });
    if (servedText && servedText.length < text.length - 5) {
      audit("twitter_error", `X served a shorter text than sent (${servedText.length} < ${text.length}) for ${tweetId}`);
    }
    audit("twitter_post", `Posted tweet${replyToId ? ` (reply to ${replyToId})` : ""}: ${text.slice(0, 80)}...`);
    return { success: true, tweetId };
  } catch (err: any) {
    audit("twitter_error", `Post failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/** Search tweets via API v2 (falls back to scraper if no API creds). */
export async function searchTwitter(query: string, limit = 10): Promise<any[]> {
  if (apiV2DegradedReason) return [];
  if (!hasApiV2Creds) return [];
  try {
    const params: Record<string, string> = {
      query,
      max_results: String(Math.min(limit, 100)),
      "tweet.fields": "author_id,created_at,public_metrics,conversation_id",
      "expansions": "author_id",
      "user.fields": "username,name",
    };
    const { ok, status, data, rateLimitReset } = await twitterApiV2("GET", "https://api.twitter.com/2/tweets/search/recent", params);
    if (!ok) {
      if (status === 429 && rateLimitReset) {
        const waitSec = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000));
        console.error(`[twitter] Search rate-limited, resets in ${Math.ceil(waitSec / 60)}m`);
      } else if (status === 403 && isTwitterProjectConfigError(data)) {
        disableApiV2("keys and tokens are not attached to a Twitter Project; manual developer-portal fix required", data);
      } else if (status === 401) {
        disableApiV2("API v2 credentials rejected (401) — token revoked, expired, or mismatched", data);
      } else {
        console.error(`[twitter] API v2 search failed (${status}):`, JSON.stringify(data).slice(0, 200));
      }
      return [];
    }
    const users = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const u of data.includes.users) users.set(u.id, { username: u.username, name: u.name });
    }
    return (data.data ?? []).map((t: any) => ({
      id: t.id,
      text: t.text,
      username: users.get(t.author_id)?.username ?? t.author_id,
      name: users.get(t.author_id)?.name ?? "",
      likes: t.public_metrics?.like_count ?? 0,
      retweets: t.public_metrics?.retweet_count ?? 0,
      timeParsed: t.created_at ? new Date(t.created_at) : null,
    }));
  } catch (err: any) {
    console.error("[twitter] Search failed:", err.message);
    return [];
  }
}

/** Get a specific tweet by ID. */
export async function getTweet(id: string): Promise<any | null> {
  if (!scraper || !(await scraper.isLoggedIn())) {
    if (!(await ensureLoggedIn())) return null;
  }
  try {
    const tweet = await scraper!.getTweet(id);
    if (!tweet) return null;
    return {
      id: tweet.id,
      text: tweet.text,
      username: tweet.username,
      name: tweet.name,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      timeParsed: tweet.timeParsed,
      isRetweet: tweet.isRetweet,
      isReply: tweet.isReply,
    };
  } catch (err: any) {
    console.error("[twitter] getTweet failed:", err.message);
    return null;
  }
}

/** Get Twitter connector status */
export function getTwitterStatus(): {
  connected: boolean;
  postEnabled: boolean;
  postAvailable: boolean;
  postsToday: number;
  maxPostsPerDay: number;
  username: string;
  apiV2: boolean;
  apiV2Configured: boolean;
  apiV2DegradedReason: string | null;
  mentionPollingActive: boolean;
  userId: string;
  mentionSinceId: string | null;
  rateLimitLockoutUntil: number;
  consecutiveFailures: number;
} {
  return {
    connected: running,
    postEnabled: POST_ENABLED,
    postAvailable: POST_ENABLED && !apiV2DegradedReason,
    postsToday,
    maxPostsPerDay: MAX_POSTS_PER_DAY,
    username: TWITTER_USERNAME,
    apiV2: hasApiV2Creds && !apiV2DegradedReason,
    apiV2Configured: hasApiV2Creds,
    apiV2DegradedReason,
    mentionPollingActive: !!mentionTimer && !apiV2DegradedReason,
    userId: twitterUserId,
    mentionSinceId,
    rateLimitLockoutUntil,
    consecutiveFailures,
  };
}

// ============================================================
// Mention polling via API v2
// ============================================================

async function pollMentions(): Promise<void> {
  if (apiV2DegradedReason) return;
  if (!hasApiV2Creds || !twitterUserId) return;
  // Every returned mention is a paid read: when we can't answer anyway, don't fetch.
  if (POST_ENABLED && !canReply().ok) return;

  try {
    const params: Record<string, string> = {
      max_results: "20",
      "tweet.fields": "author_id,created_at,conversation_id,in_reply_to_user_id,referenced_tweets",
      "expansions": "author_id,referenced_tweets.id,referenced_tweets.id.author_id",
      "user.fields": "username,name",
    };
    if (mentionSinceId) params.since_id = mentionSinceId;

    const { ok, status, data, rateLimitReset } = await twitterApiV2("GET", `https://api.twitter.com/2/users/${twitterUserId}/mentions`, params);
    if (!ok) {
      if (status === 429 && rateLimitReset) {
        const waitSec = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000));
        console.log(`[twitter] Mention poll rate-limited, resets in ${Math.ceil(waitSec / 60)}m`);
      } else if (status === 403 && isTwitterProjectConfigError(data)) {
        disableApiV2("keys and tokens are not attached to a Twitter Project; manual developer-portal fix required", data);
      } else if (status === 401) {
        disableApiV2("API v2 credentials rejected (401) — token revoked, expired, or mismatched", data);
      } else {
        console.error(`[twitter] Mention poll API error (${status}):`, JSON.stringify(data).slice(0, 200));
      }
      return;
    }

    const tweets: any[] = data.data ?? [];
    if (tweets.length === 0) return;

    const users = new Map<string, { username: string; name: string }>();
    for (const u of data.includes?.users ?? []) users.set(u.id, { username: u.username, name: u.name });
    const refTweets = new Map<string, any>();
    for (const t of data.includes?.tweets ?? []) refTweets.set(t.id, t);

    const toProcess: Array<{ id: string; text: string; username: string; authorId: string; parent?: { text: string; author: string; own: boolean } }> = [];
    const heldBack: string[] = []; // fetched but not handled this cycle — must be fetched again
    // API returns newest first; answer oldest first so conversations read in order
    for (const t of [...tweets].reverse()) {
      if (repliedTweetIds.has(t.id) || readOnlySeenTweetIds.has(t.id)) continue;
      const user = users.get(t.author_id);
      const username = user?.username ?? t.author_id;
      if (username.toLowerCase() === TWITTER_USERNAME.toLowerCase()) continue;
      if (toProcess.length >= MAX_MENTION_REPLIES_PER_CYCLE) { heldBack.push(t.id); continue; }
      const parentRef = (t.referenced_tweets ?? []).find((r: any) => r.type === "replied_to" || r.type === "quoted");
      const parentTweet = parentRef ? refTweets.get(parentRef.id) : undefined;
      const parent = parentTweet ? {
        text: parentTweet.text as string,
        author: users.get(parentTweet.author_id)?.username ?? parentTweet.author_id,
        own: parentTweet.author_id === twitterUserId,
      } : undefined;
      toProcess.push({ id: t.id, text: t.text, username, authorId: t.author_id, parent });
    }

    if (toProcess.length > 0) console.log(`[twitter] Found ${toProcess.length} new mention(s) via API v2${heldBack.length ? ` (+${heldBack.length} held for next cycle)` : ""}`);

    for (const tweet of toProcess) {
      const outcome = await handleMention(tweet);
      if (outcome === "defer") {
        heldBack.push(tweet.id); // budget/lockout: wait, don't burn an attempt
      } else if (outcome === "fail") {
        const n = (mentionFailures.get(tweet.id) ?? 0) + 1;
        mentionFailures.set(tweet.id, n);
        if (n >= MAX_REPLY_ATTEMPTS) {
          audit("twitter_error", `Gave up replying to @${tweet.username} (${tweet.id}) after ${n} attempts: ${tweet.text.slice(0, 80)}`);
          repliedTweetIds.add(tweet.id); // stop retrying, but loudly
          mentionFailures.delete(tweet.id);
        } else {
          heldBack.push(tweet.id);
        }
      } else {
        mentionFailures.delete(tweet.id);
      }
    }

    // Advance the cursor only past mentions we actually handled. A failed or deferred
    // mention keeps the cursor just below it so the next poll sees it again.
    if (heldBack.length > 0) {
      const oldest = heldBack.map((id) => BigInt(id)).reduce((a, b) => (a < b ? a : b));
      mentionSinceId = (oldest - 1n).toString();
    } else if (data.meta?.newest_id) {
      mentionSinceId = data.meta.newest_id;
    }
    saveRepliedIds();
  } catch (err: any) {
    console.error("[twitter] Mention poll failed:", err.message);
  }
}

/** Generate and post one mention reply. Returns true when the mention is settled (posted, silent, or read-only logged). */
async function handleMention(tweet: { id: string; text: string; username: string; authorId: string; parent?: { text: string; author: string; own: boolean } }): Promise<"ok" | "fail" | "defer"> {
  // Check the reply budget BEFORE spending an LLM call; over budget = try again next cycle.
  if (POST_ENABLED) {
    const budget = canReply();
    if (!budget.ok) {
      console.log(`[twitter] Deferring mention ${tweet.id}: ${budget.reason}`);
      return "defer";
    }
  }
  try {
    const userId = `twitter-${tweet.authorId}`;
    let mentionText = `[Twitter mention from @${tweet.username}]: ${tweet.text}`;
    if (tweet.parent) {
      const who = tweet.parent.own ? "YOUR OWN post" : `@${tweet.parent.author}'s post`;
      const cut = tweet.parent.own && tweet.parent.text.length >= 270 && /(\.\.\.|…)$/.test(tweet.parent.text.trim())
        ? " (note: that post of yours is cut off — it ended in '...' at the 280 limit)"
        : "";
      mentionText = `[Twitter mention from @${tweet.username}, replying to ${who}${cut}: "${tweet.parent.text}"]\n${tweet.text}`;
    }

    let response = await promptWithHistory(
      { userId, platform: "twitter", displayName: `@${tweet.username}` },
      mentionText,
    );

    if (!response || response.includes("[SILENT]")) {
      if (POST_ENABLED) repliedTweetIds.add(tweet.id);
      else readOnlySeenTweetIds.add(tweet.id);
      return "ok";
    }

    // Never cut a reply: ask for a shorter rewrite instead.
    for (let i = 0; i < 2 && response && !fitsTweet(response.trim()); i++) {
      const len = tweetLength(response.trim());
      response = await promptWithHistory(
        { userId, platform: "twitter", displayName: `@${tweet.username}` },
        `[SYSTEM: your reply is ${len} characters; X allows ${TWEET_MAX} and nothing gets trimmed for you. Rewrite the SAME reply in under 250 characters. Output only the reply text.]`,
      );
    }
    const replyText = (response ?? "").trim();
    if (!replyText || replyText.includes("[SILENT]")) {
      repliedTweetIds.add(tweet.id);
      return "ok";
    }
    if (!fitsTweet(replyText)) {
      audit("twitter_error", `Reply to ${tweet.id} still too long after rewrites (${tweetLength(replyText)}) — not posted`);
      return "fail";
    }

    if (!POST_ENABLED) {
      appendToLog(userId, mentionText, `[NOT POSTED — read-only mode] ${replyText}`, "twitter");
      console.log(`[twitter] [READ-ONLY] Would reply to @${tweet.username}: ${replyText.slice(0, 60)}...`);
      readOnlySeenTweetIds.add(tweet.id);
      return "ok";
    }

    const result = await postTweet(replyText, tweet.id);
    if (result.success) {
      appendToLog(userId, mentionText, replyText, "twitter");
      console.log(`[twitter] Replied to @${tweet.username}: ${replyText.slice(0, 60)}...`);
      repliedTweetIds.add(tweet.id);
      return "ok";
    }
    // Make the failure visible in his own memory so he doesn't believe he answered.
    appendToLog(userId, mentionText, `[REPLY NOT POSTED — ${result.error}] ${replyText}`, "twitter");
    console.error(`[twitter] Reply failed for ${tweet.id}: ${result.error}`);
    audit("twitter_error", `Reply to @${tweet.username} (${tweet.id}) not posted: ${result.error}`);
    return "fail";
  } catch (err: any) {
    console.error(`[twitter] Error processing mention ${tweet.id}:`, err.message, err.stack?.split("\n").slice(0, 3).join(" | "));
    return "fail";
  }
}

// ============================================================
// Daily self-check: what do my posts actually look like on X?
// ============================================================

export interface XSelfView {
  checkedAt: string;
  posts: Array<{ id: string; createdAt: string; text: string; length: number; cut: boolean; replyTo: string | null; likes: number; replies: number; reposts: number }>;
  cutCount: number;
  missing: Array<{ tweetId: string; sent: string }>;
}

async function selfCheck(): Promise<void> {
  if (apiV2DegradedReason || !hasApiV2Creds || !twitterUserId) return;
  try {
    const { ok, status, data } = await twitterApiV2("GET", `https://api.twitter.com/2/users/${twitterUserId}/tweets`, {
      max_results: "10",
      "tweet.fields": "created_at,referenced_tweets,public_metrics",
    });
    if (!ok) {
      console.error(`[twitter] Self-check failed (${status}):`, JSON.stringify(data).slice(0, 200));
      return;
    }
    const posts = (data.data ?? []).map((t: any) => {
      const text: string = t.text ?? "";
      const len = tweetLength(text);
      return {
        id: t.id,
        createdAt: t.created_at,
        text,
        length: len,
        cut: len >= 270 && /(\.\.\.|…)$/.test(text.trim()),
        replyTo: (t.referenced_tweets ?? []).find((r: any) => r.type === "replied_to")?.id ?? null,
        likes: t.public_metrics?.like_count ?? 0,
        replies: t.public_metrics?.reply_count ?? 0,
        reposts: t.public_metrics?.retweet_count ?? 0,
      };
    });
    const seen = new Set(posts.map((p: any) => p.id));
    const oldestSeen = posts.length ? posts.map((p: any) => BigInt(p.id)).reduce((a: bigint, b: bigint) => (a < b ? a : b)) : 0n;
    const missing: XSelfView["missing"] = [];
    if (existsSync(POSTED_LOG_PATH)) {
      for (const line of readFileSync(POSTED_LOG_PATH, "utf-8").split("\n").filter(Boolean).slice(-20)) {
        try {
          const e = JSON.parse(line);
          if (e.tweetId && BigInt(e.tweetId) >= oldestSeen && !seen.has(e.tweetId)) missing.push({ tweetId: e.tweetId, sent: String(e.sent).slice(0, 120) });
        } catch { /* ignore */ }
      }
    }
    const view: XSelfView = { checkedAt: new Date().toISOString(), posts, cutCount: posts.filter((p: any) => p.cut).length, missing };
    writeFileSync(SELF_VIEW_PATH, JSON.stringify(view, null, 2));
    audit("twitter_selfcheck", `X self-check: ${posts.length} posts read back, ${view.cutCount} cut off, ${missing.length} missing`, { cut: view.cutCount, missing: missing.length });
  } catch (err: any) {
    console.error("[twitter] Self-check error:", err.message);
  }
}

async function selfCheckLoop(): Promise<void> {
  if (!running) return;
  await selfCheck();
  if (running) selfCheckTimer = setTimeout(selfCheckLoop, SELF_CHECK_MS);
}

/** Short plain-text summary of how his recent X posts actually look, for prompt context. */
export function getXSelfViewSummary(limit = 5): string {
  try {
    if (!existsSync(SELF_VIEW_PATH)) return "";
    const view = JSON.parse(readFileSync(SELF_VIEW_PATH, "utf-8")) as XSelfView;
    const lines = view.posts.filter((p) => !p.replyTo).slice(0, limit).map((p) =>
      `- ${p.createdAt.slice(0, 10)} [${p.length} chars, ${p.likes} likes, ${p.replies} replies]${p.cut ? " CUT OFF" : ""}: ${p.text}`);
    if (lines.length === 0) return "";
    const warn = view.cutCount > 0 ? `\n${view.cutCount} of your recent X posts are visibly cut off. Write shorter.` : "";
    return `## Your recent X posts, as X actually shows them (checked ${view.checkedAt.slice(0, 16)}Z)\n${lines.join("\n")}${warn}`;
  } catch {
    return "";
  }
}

async function mentionLoop(): Promise<void> {
  if (!running) return;
  try {
    await pollMentions();
  } catch (err: any) {
    console.error("[twitter] mentionLoop error:", err.message);
  }
  if (running) {
    if (apiV2DegradedReason) return;
    // Add small jitter (±2 min) to avoid predictable polling
    const jitter = Math.floor((Math.random() * 2 - 1) * 2 * 60 * 1000);
    const delay = Math.max(60_000, MENTION_POLL_MS + jitter);
    mentionTimer = setTimeout(mentionLoop, delay);
  }
}

// ============================================================
// Boot
// ============================================================

export async function startTwitter(): Promise<void> {
  if (running) {
    console.log("[twitter] Already running");
    return;
  }

  if (!TWITTER_USERNAME) {
    console.log("[twitter] No TWITTER_USERNAME — Twitter disabled");
    return;
  }

  // Scraper auth (for getTweet, sendTweet — GraphQL endpoints still work)
  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.log("[twitter] Scraper auth failed — posting disabled, API v2 may still work");
  }

  // Resolve numeric user ID via API v2 for mention polling (cached to disk)
  const USER_ID_PATH = "/app/data/twitter-userid.json";
  if (hasApiV2Creds) {
    // Try disk cache first
    try {
      if (existsSync(USER_ID_PATH)) {
        const cached = JSON.parse(readFileSync(USER_ID_PATH, "utf-8"));
        if (cached.username === TWITTER_USERNAME && cached.id) {
          twitterUserId = cached.id;
          console.log(`[twitter] User ID from cache: ${twitterUserId}`);
        }
      }
    } catch { /* ignore */ }

    // Validate cached creds with a live probe (GET /2/users/me)
    // Cached user ID alone doesn't prove tokens are still valid — a revoked
    // token passes the cache check but silently fails on every subsequent call.
    if (twitterUserId) {
      try {
        const { ok: probeOk, status: probeStatus, data: probeData } = await twitterApiV2("GET", "https://api.twitter.com/2/users/me");
        if (!probeOk) {
          if (probeStatus === 401) {
            disableApiV2("API v2 credentials rejected (401) — token revoked, expired, or mismatched", probeData);
            twitterUserId = "";
          } else if (probeStatus === 403 && isTwitterProjectConfigError(probeData)) {
            disableApiV2("keys and tokens are not attached to a Twitter Project; manual developer-portal fix required", probeData);
            twitterUserId = "";
          } else {
            console.warn(`[twitter] Cred probe returned ${probeStatus} — proceeding with caution`);
          }
        } else {
          console.log("[twitter] API v2 credentials validated via /users/me probe");
        }
      } catch (err: any) {
        console.warn(`[twitter] Cred probe failed: ${err.message} — proceeding with cached user ID`);
      }
    }

    // If not cached (or probe cleared a bad cache), resolve via API
    if (!twitterUserId) {
      try {
        const { ok, status, data } = await twitterApiV2("GET", `https://api.twitter.com/2/users/by/username/${TWITTER_USERNAME}`);
        if (ok && data?.data?.id) {
          twitterUserId = data.data.id;
          writeFileSync(USER_ID_PATH, JSON.stringify({ username: TWITTER_USERNAME, id: twitterUserId }));
          console.log(`[twitter] Resolved user ID: ${twitterUserId}`);
        } else if (status === 403 && isTwitterProjectConfigError(data)) {
          disableApiV2("keys and tokens are not attached to a Twitter Project; manual developer-portal fix required", data);
        } else if (status === 401) {
          disableApiV2("API v2 credentials rejected (401) — token revoked, expired, or mismatched", data);
        } else {
          // Any other failure means creds are not working — degrade immediately instead of silent failure
          disableApiV2(`API v2 user-ID resolution failed (${status})`, data);
        }
      } catch (err: any) {
        console.error("[twitter] User ID lookup failed:", err.message);
      }
    }
  } else {
    console.log("[twitter] No API v2 credentials — mention polling & search disabled");
  }

  running = true;
  loadRepliedIds();
  loadRateLimitState();
  if (!postsDayStart) postsDayStart = Date.now();

  console.log(`[twitter] Connected as @${TWITTER_USERNAME}`);
  console.log(`[twitter] Posting: ${POST_ENABLED ? "ENABLED" : "READ-ONLY"}`);
  console.log(`[twitter] API v2: ${apiV2DegradedReason ? `degraded (${apiV2DegradedReason})` : hasApiV2Creds ? "available" : "not configured"} | User ID: ${twitterUserId || "unknown"}`);
  if (!apiV2DegradedReason) {
    console.log(`[twitter] Mention poll every ${MENTION_POLL_MS / 60_000} min${mentionSinceId ? ` (since_id: ${mentionSinceId})` : ""}`);
  }

  // Start mention polling with startup delay
  if (twitterUserId && !apiV2DegradedReason) {
    mentionTimer = setTimeout(mentionLoop, MENTION_POLL_STARTUP_MS);
    selfCheckTimer = setTimeout(selfCheckLoop, SELF_CHECK_STARTUP_MS);
  }

  audit("twitter_boot", `Twitter connected as @${TWITTER_USERNAME} (posting: ${POST_ENABLED}, api_v2: ${hasApiV2Creds && !apiV2DegradedReason})`);
}

export function stopTwitter(): void {
  running = false;
  if (mentionTimer) {
    clearTimeout(mentionTimer);
    mentionTimer = null;
  }
  if (selfCheckTimer) {
    clearTimeout(selfCheckTimer);
    selfCheckTimer = null;
  }
  saveRepliedIds();
  saveRateLimitState();
  console.log("[twitter] Stopped");
}
