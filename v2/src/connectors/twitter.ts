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
 * Rate limits: 5 posts/day, 2h minimum gap between posts.
 */

import { Scraper } from "@the-convocation/twitter-scraper";
import { promptWithHistory } from "../agent.js";
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
const MAX_POSTS_PER_DAY = 5;
const MIN_POST_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours
const MENTION_POLL_MS = 15 * 60 * 1000; // 15 minutes
const MENTION_POLL_STARTUP_MS = 5 * 60 * 1000; // 5 min after boot
const MAX_MENTION_REPLIES_PER_CYCLE = 3;

// Twitter API v2 credentials (OAuth 1.0a)
const API_KEY = process.env.TWITTER_API_KEY ?? "";
const API_SECRET = process.env.TWITTER_API_SECRET_KEY ?? "";
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN ?? "";
const ACCESS_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET ?? "";
const hasApiV2Creds = !!(API_KEY && API_SECRET && ACCESS_TOKEN && ACCESS_SECRET);

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
let twitterUserId = ""; // numeric ID, resolved at boot via API v2
let mentionSinceId: string | null = null; // pagination cursor for mention polling
const repliedTweetIds = new Set<string>();
const readOnlySeenTweetIds = new Set<string>();
const REPLIED_IDS_PATH = "/app/data/twitter-replied.json";
const RATELIMIT_PATH = "/app/data/twitter-ratelimit.json";

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
    console.log(`[twitter] Restored rate limit state: ${postsToday} posts today, last post ${lastPostTime ? Math.round((Date.now() - lastPostTime) / 60_000) + "m ago" : "never"}`);
  } catch {
    console.error("[twitter] Failed to load rate limit state — starting fresh");
  }
}

function saveRateLimitState(): void {
  try {
    writeFileSync(RATELIMIT_PATH, JSON.stringify({ lastPostTime, postsToday, postsDayStart }));
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
  resetDailyCounterIfNeeded();
  if (postsToday >= MAX_POSTS_PER_DAY) return { ok: false, reason: `Daily limit (${MAX_POSTS_PER_DAY}) reached` };
  if (Date.now() - lastPostTime < MIN_POST_GAP_MS) return { ok: false, reason: "Min 2h gap between posts" };
  return { ok: true };
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
  const check = canPost();
  if (!check.ok) return { success: false, error: check.reason };
  if (!hasApiV2Creds) return { success: false, error: "No API v2 credentials" };

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
    if (!resp.ok) {
      const errMsg = json?.detail || json?.title || JSON.stringify(json).slice(0, 200);
      audit("twitter_error", `Post failed (${resp.status}): ${errMsg}`);
      return { success: false, error: errMsg };
    }

    const tweetId = json?.data?.id;
    lastPostTime = Date.now();
    postsToday++;
    saveRateLimitState();
    audit("twitter_post", `Posted tweet${replyToId ? ` (reply to ${replyToId})` : ""}: ${text.slice(0, 80)}...`);
    return { success: true, tweetId };
  } catch (err: any) {
    audit("twitter_error", `Post failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/** Search tweets via API v2 (falls back to scraper if no API creds). */
export async function searchTwitter(query: string, limit = 10): Promise<any[]> {
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
  postsToday: number;
  maxPostsPerDay: number;
  username: string;
  apiV2: boolean;
  userId: string;
  mentionSinceId: string | null;
} {
  return {
    connected: running,
    postEnabled: POST_ENABLED,
    postsToday,
    maxPostsPerDay: MAX_POSTS_PER_DAY,
    username: TWITTER_USERNAME,
    apiV2: hasApiV2Creds,
    userId: twitterUserId,
    mentionSinceId,
  };
}

// ============================================================
// Mention polling via API v2
// ============================================================

async function pollMentions(): Promise<void> {
  if (!hasApiV2Creds || !twitterUserId) return;

  try {
    const params: Record<string, string> = {
      max_results: "20",
      "tweet.fields": "author_id,created_at,conversation_id,in_reply_to_user_id",
      "expansions": "author_id",
      "user.fields": "username,name",
    };
    if (mentionSinceId) params.since_id = mentionSinceId;

    const { ok, status, data, rateLimitReset } = await twitterApiV2("GET", `https://api.twitter.com/2/users/${twitterUserId}/mentions`, params);
    if (!ok) {
      if (status === 429 && rateLimitReset) {
        const waitSec = Math.max(0, rateLimitReset - Math.floor(Date.now() / 1000));
        console.log(`[twitter] Mention poll rate-limited, resets in ${Math.ceil(waitSec / 60)}m`);
      } else {
        console.error(`[twitter] Mention poll API error (${status}):`, JSON.stringify(data).slice(0, 200));
      }
      return;
    }

    const tweets = data.data ?? [];
    if (tweets.length === 0) return;

    // Build user lookup from expansions
    const users = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const u of data.includes.users) users.set(u.id, { username: u.username, name: u.name });
    }

    // Update sinceId to newest tweet (first in list — API returns newest first)
    const newestId = data.meta?.newest_id;
    if (newestId) {
      mentionSinceId = newestId;
      saveRepliedIds(); // persist sinceId immediately
    }

    // Filter and process
    const toProcess: Array<{ id: string; text: string; username: string; authorId: string }> = [];
    for (const t of tweets) {
      if (repliedTweetIds.has(t.id) || readOnlySeenTweetIds.has(t.id)) continue;
      const user = users.get(t.author_id);
      const username = user?.username ?? t.author_id;
      if (username.toLowerCase() === TWITTER_USERNAME.toLowerCase()) continue;
      toProcess.push({ id: t.id, text: t.text, username, authorId: t.author_id });
      if (toProcess.length >= MAX_MENTION_REPLIES_PER_CYCLE) break;
    }

    if (toProcess.length === 0) return;
    console.log(`[twitter] Found ${toProcess.length} new mention(s) via API v2`);

    for (const tweet of toProcess) {
      try {
        const userId = `twitter-${tweet.username}`;
        const mentionText = `[Twitter mention from @${tweet.username}]: ${tweet.text}`;

        const response = await promptWithHistory(
          { userId, platform: "twitter" },
          mentionText,
        );

        if (!response || response.startsWith("[SILENT]")) {
          if (POST_ENABLED) repliedTweetIds.add(tweet.id);
          else readOnlySeenTweetIds.add(tweet.id);
          continue;
        }

        const replyText = response.length > 280 ? response.slice(0, 277) + "..." : response;

        if (POST_ENABLED) {
          const result = await postTweet(replyText, tweet.id);
          if (result.success) {
            console.log(`[twitter] Replied to @${tweet.username}: ${replyText.slice(0, 60)}...`);
            repliedTweetIds.add(tweet.id);
          } else {
            console.error(`[twitter] Reply failed for ${tweet.id}: ${result.error}`);
          }
        } else {
          console.log(`[twitter] [READ-ONLY] Would reply to @${tweet.username}: ${replyText.slice(0, 60)}...`);
          readOnlySeenTweetIds.add(tweet.id);
        }
      } catch (err: any) {
        console.error(`[twitter] Error processing mention ${tweet.id}:`, err.message, err.stack?.split("\n").slice(0, 3).join(" | "));
      }
    }

    saveRepliedIds();
  } catch (err: any) {
    console.error("[twitter] Mention poll failed:", err.message);
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

    // If not cached, resolve via API
    if (!twitterUserId) {
      try {
        const { ok, data } = await twitterApiV2("GET", `https://api.twitter.com/2/users/by/username/${TWITTER_USERNAME}`);
        if (ok && data?.data?.id) {
          twitterUserId = data.data.id;
          writeFileSync(USER_ID_PATH, JSON.stringify({ username: TWITTER_USERNAME, id: twitterUserId }));
          console.log(`[twitter] Resolved user ID: ${twitterUserId}`);
        } else {
          console.error("[twitter] Failed to resolve user ID:", JSON.stringify(data).slice(0, 200));
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
  console.log(`[twitter] API v2: ${hasApiV2Creds ? "available" : "not configured"} | User ID: ${twitterUserId || "unknown"}`);
  console.log(`[twitter] Mention poll every ${MENTION_POLL_MS / 60_000} min${mentionSinceId ? ` (since_id: ${mentionSinceId})` : ""}`);

  // Start mention polling with startup delay
  if (twitterUserId) {
    mentionTimer = setTimeout(mentionLoop, MENTION_POLL_STARTUP_MS);
  }

  audit("twitter_boot", `Twitter connected as @${TWITTER_USERNAME} (posting: ${POST_ENABLED}, api_v2: ${hasApiV2Creds})`);
}

export function stopTwitter(): void {
  running = false;
  if (mentionTimer) {
    clearTimeout(mentionTimer);
    mentionTimer = null;
  }
  saveRepliedIds();
  saveRateLimitState();
  console.log("[twitter] Stopped");
}
