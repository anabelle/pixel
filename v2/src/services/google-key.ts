/**
 * Google API Key Failover — centralised key resolution for all Google services.
 *
 * Priority: primary key ($300 free credits) → fallback key (billed).
 * On quota errors, callers flip to fallback. On success, callers reset to primary.
 *
 * Env vars (checked in order):
 *   Primary: GEMINI_API_KEY_PRIMARY / GOOGLE_GENERATIVE_AI_API_KEY_PRIMARY
 *   Fallback: GEMINI_API_KEY_FALLBACK / GOOGLE_GENERATIVE_AI_API_KEY_FALLBACK / GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY
 *
 * This module has ZERO internal imports to avoid circular dependencies.
 * agent.ts, memory.ts, image-gen.ts, audio.ts all import from here.
 */

// Runtime flag — flips to true on Google quota errors, resets on success
let googleKeyUseFallback = false;

/** Resolve the current Google API key (primary or fallback). */
export function resolveGoogleApiKey(): string {
  const primary = process.env.GEMINI_API_KEY_PRIMARY
    ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY_PRIMARY
    ?? "";
  const fallback = process.env.GEMINI_API_KEY_FALLBACK
    ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY_FALLBACK
    ?? process.env.GEMINI_API_KEY
    ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ?? process.env.GOOGLE_API_KEY
    ?? "";
  if (googleKeyUseFallback) return fallback || primary || "";
  return primary || fallback || "";
}

/** Flip to fallback key (call on Google quota/rate-limit errors). */
export function setGoogleKeyFallback(): void {
  if (!googleKeyUseFallback) {
    googleKeyUseFallback = true;
    console.log("[google-key] Switched to FALLBACK Google API key");
  }
}

/** Reset to primary key (call on successful Google API response). */
export function resetGoogleKeyToPrimary(): void {
  if (googleKeyUseFallback) {
    googleKeyUseFallback = false;
    console.log("[google-key] Reset to PRIMARY Google API key");
  }
}

/** Check which key is currently active (for logging). */
export function isUsingFallbackKey(): boolean {
  return googleKeyUseFallback;
}
