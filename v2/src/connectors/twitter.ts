/**
 * Twitter/X Connector — @the-convocation/twitter-scraper wired to Pi agent-core
 *
 * Pattern: cookie-cached Scraper → poll mentions → reply via promptWithHistory
 * Exports: startTwitter(), postTweet(), searchTwitter(), getTwitterStatus()
 *
 * Safety: TWITTER_POST_ENABLE=false for read-only mode (default).
 * Rate limits: 5 posts/day, 2h minimum gap between posts.
 * Cookies cached at /app/data/twitter-cookies.json to avoid repeated logins.
 */

import { Scraper, SearchMode } from "@the-convocation/twitter-scraper";
import { promptWithHistory } from "../agent.js";
import { audit } from "../services/audit.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

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

// ============================================================
// State
// ============================================================

let scraper: Scraper | null = null;
let running = false;
let mentionTimer: ReturnType<typeof setTimeout> | null = null;
let lastPostTime = 0;
let postsToday = 0;
let postsDayStart = 0; // timestamp of when we started counting
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
  if (!existsSync(REPLIED_IDS_PATH)) return;
  try {
    const raw = readFileSync(REPLIED_IDS_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      data.forEach((id) => repliedTweetIds.add(id));
      return;
    }
    const replied: string[] = Array.isArray(data?.replied) ? data.replied : [];
    const readOnly: string[] = Array.isArray(data?.readOnly) ? data.readOnly : [];
    replied.forEach((id) => repliedTweetIds.add(id));
    readOnly.forEach((id) => readOnlySeenTweetIds.add(id));
  } catch { /* ignore */ }
}

function saveRepliedIds(): void {
  try {
    // Keep only last 500 in each bucket
    const replied = [...repliedTweetIds].slice(-500);
    const readOnly = [...readOnlySeenTweetIds].slice(-500);
    writeFileSync(REPLIED_IDS_PATH, JSON.stringify({ replied, readOnly }));
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

// ============================================================
// Public API
// ============================================================

/** Post a tweet. Respects rate limits and read-only mode. */
export async function postTweet(text: string, replyToId?: string): Promise<{ success: boolean; error?: string; tweetId?: string }> {
  const check = canPost();
  if (!check.ok) return { success: false, error: check.reason };
  if (!scraper || !(await scraper.isLoggedIn())) {
    if (!(await ensureLoggedIn())) return { success: false, error: "Not logged in" };
  }

  try {
    const response = await scraper!.sendTweet(text, replyToId);
    // sendTweet returns a Response object in newer versions
    const json = await response.json() as any;
    const tweetId = json?.data?.create_tweet?.tweet_results?.result?.rest_id;
    lastPostTime = Date.now();
    postsToday++;
    saveRateLimitState();
    await saveCookies();
    audit("twitter_post", `Posted tweet${replyToId ? ` (reply to ${replyToId})` : ""}: ${text.slice(0, 80)}...`);
    return { success: true, tweetId };
  } catch (err: any) {
    audit("twitter_error", `Post failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/** Search tweets. Read-only, no auth required but better results when logged in. */
export async function searchTwitter(query: string, limit = 10): Promise<any[]> {
  if (!scraper || !(await scraper.isLoggedIn())) {
    if (!(await ensureLoggedIn())) return [];
  }
  try {
    const results: any[] = [];
    const tweets = scraper!.searchTweets(query, limit, SearchMode.Latest);
    for await (const tweet of tweets) {
      results.push({
        id: tweet.id,
        text: tweet.text,
        username: tweet.username,
        name: tweet.name,
        likes: tweet.likes,
        retweets: tweet.retweets,
        timeParsed: tweet.timeParsed,
      });
      if (results.length >= limit) break;
    }
    return results;
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
} {
  return {
    connected: scraper !== null && running,
    postEnabled: POST_ENABLED,
    postsToday,
    maxPostsPerDay: MAX_POSTS_PER_DAY,
    username: TWITTER_USERNAME,
  };
}

// ============================================================
// Mention polling (read-only engagement)
// ============================================================

async function pollMentions(): Promise<void> {
  if (!scraper || !(await scraper.isLoggedIn())) return;

  try {
    const query = `@${TWITTER_USERNAME}`;
    const results: any[] = [];
    const tweets = scraper.searchTweets(query, 20, SearchMode.Latest);

    for await (const tweet of tweets) {
      if (!tweet.id || repliedTweetIds.has(tweet.id) || readOnlySeenTweetIds.has(tweet.id)) continue;
      // Skip our own tweets
      if (tweet.username?.toLowerCase() === TWITTER_USERNAME.toLowerCase()) continue;
      results.push(tweet);
      if (results.length >= MAX_MENTION_REPLIES_PER_CYCLE) break;
    }

    if (results.length === 0) return;
    console.log(`[twitter] Found ${results.length} new mention(s)`);

    for (const tweet of results) {
      try {
        const userId = `twitter-${tweet.username}`;
        const mentionText = `[Twitter mention from @${tweet.username}]: ${tweet.text}`;

        const response = await promptWithHistory({
          userId,
          platform: "twitter",
          message: mentionText,
        });

        if (!response || response.startsWith("[SILENT]")) {
          // Mark as seen even in read-only to avoid repeated processing
          if (POST_ENABLED) repliedTweetIds.add(tweet.id!);
          else readOnlySeenTweetIds.add(tweet.id!);
          continue;
        }

        // Truncate to 280 chars for Twitter
        const replyText = response.length > 280 ? response.slice(0, 277) + "..." : response;

        if (POST_ENABLED && tweet.id) {
          const result = await postTweet(replyText, tweet.id);
          if (result.success) {
            console.log(`[twitter] Replied to @${tweet.username}: ${replyText.slice(0, 60)}...`);
            repliedTweetIds.add(tweet.id!);
          } else {
            console.error(`[twitter] Reply failed for ${tweet.id}: ${result.error}`);
          }
        } else {
          console.log(`[twitter] [READ-ONLY] Would reply to @${tweet.username}: ${replyText.slice(0, 60)}...`);
          if (tweet.id) readOnlySeenTweetIds.add(tweet.id);
        }
      } catch (err: any) {
        console.error(`[twitter] Error replying to mention:`, err.message);
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

  const loggedIn = await ensureLoggedIn();
  if (!loggedIn) {
    console.log("[twitter] Failed to authenticate — Twitter disabled");
    return;
  }

  running = true;
  loadRepliedIds();
  loadRateLimitState();
  // Initialize postsDayStart only if not loaded from disk
  if (!postsDayStart) postsDayStart = Date.now();

  console.log(`[twitter] Connected as @${TWITTER_USERNAME}`);
  console.log(`[twitter] Posting: ${POST_ENABLED ? "ENABLED" : "READ-ONLY"}`);
  console.log(`[twitter] Mention poll every ${MENTION_POLL_MS / 60_000} min`);

  // Start mention polling with startup delay
  mentionTimer = setTimeout(mentionLoop, MENTION_POLL_STARTUP_MS);

  audit("twitter_boot", `Twitter connected as @${TWITTER_USERNAME} (posting: ${POST_ENABLED})`);
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
