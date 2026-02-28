/**
 * Audio Transcription Service — Gemini-based voice message processing
 *
 * Transcribes audio (voice messages) using Google Gemini's native audio understanding.
 * Gemini models accept audio/ogg natively — no ffmpeg needed.
 *
 * This is a pre-processing step: audio → text, then text feeds into promptWithHistory().
 * Pi-ai has no AudioContent type, so we call the Gemini REST API directly.
 *
 * Features retry with exponential backoff on 429, and fallback models.
 */

import { resolveGoogleApiKey } from "./google-key.js";
import { costMonitor } from "./cost-monitor.js";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB (Gemini supports up to ~8.4 hours)
const TRANSCRIPTION_TIMEOUT_MS = 30_000;

/** Model fallback chain for transcription (ordered by quality) */
const TRANSCRIPTION_MODELS = [
  "gemini-2.5-flash",       // Best quality
  "gemini-2.0-flash",       // Fast, reliable
  "gemini-2.5-flash-lite",  // Lighter fallback
];

/** Supported audio MIME types (Gemini native support) */
const SUPPORTED_MIME_TYPES = new Set([
  "audio/ogg",       // Telegram voice messages
  "audio/oga",       // Telegram voice (alternate extension)
  "audio/opus",      // Opus codec
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/flac",
  "audio/x-aac",
  "audio/aac",
]);

/**
 * Transcribe audio using Google Gemini's native audio understanding.
 * Uses retry with exponential backoff on 429, and fallback models.
 *
 * @param buffer - Raw audio file bytes
 * @param mimeType - MIME type of the audio (e.g., "audio/ogg")
 * @returns Transcribed text, or null if transcription failed
 */
export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const apiKey = resolveGoogleApiKey();

  if (!apiKey) {
    console.error("[audio] No Gemini API key available for transcription");
    return null;
  }

  if (buffer.byteLength > MAX_AUDIO_BYTES) {
    console.error(`[audio] Audio too large: ${buffer.byteLength} bytes (max ${MAX_AUDIO_BYTES})`);
    return null;
  }

  // Normalize MIME type
  const normalizedMime = normalizeMimeType(mimeType);
  if (!SUPPORTED_MIME_TYPES.has(normalizedMime)) {
    console.error(`[audio] Unsupported MIME type: ${mimeType} (normalized: ${normalizedMime})`);
    return null;
  }

  const base64 = buffer.toString("base64");

  // Try each model in the fallback chain
  for (const model of TRANSCRIPTION_MODELS) {
    const result = await tryTranscribe(apiKey, model, base64, normalizedMime);
    if (result !== null) {
      return result;
    }
    // If we get here, this model failed - try next
  }

  console.error("[audio] All transcription models failed");
  return null;
}

/**
 * Attempt transcription with a specific model.
 * Returns null on failure (caller tries next model).
 */
async function tryTranscribe(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: "Transcribe this audio message accurately. Output ONLY the transcription text, nothing else. If the audio is in a language other than English, transcribe in the original language. If the audio is empty or inaudible, output: [inaudible]",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for accurate transcription
      maxOutputTokens: 4096,
    },
  };

  // Retry with exponential backoff on 429
  const retryDelays = [0, 1000, 3000]; // immediate, 1s, 3s

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    const delay = retryDelays[attempt];
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");

        // 429: retry with backoff (if attempts left), otherwise try next model
        if (res.status === 429) {
          if (attempt < retryDelays.length - 1) {
            console.log(`[audio] Model ${model} rate limited, retrying in ${retryDelays[attempt + 1]}ms...`);
            continue;
          }
          costMonitor.recordError(model, '429 rate limit', 'conversation');
          console.log(`[audio] Model ${model} rate limited after ${attempt + 1} attempts, trying next model`);
          return null;
        }

        // Other errors: log and try next model
        costMonitor.recordError(model, `API error ${res.status}`, 'conversation');
        console.error(`[audio] Model ${model} error ${res.status}: ${errorText.slice(0, 200)}`);
        return null;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text || text.trim() === "[inaudible]") {
        console.log("[audio] Transcription empty or inaudible");
        return null;
      }

      const transcription = text.trim();
      
      // Track transcription usage
      // Input: audio binary - hard to estimate tokens, use buffer size / 1000 as rough proxy
      // Output: transcription text tokens
      const outputTokens = Math.ceil(transcription.length / 4);
      const inputTokens = Math.ceil((base64.length * 3 / 4) / 1000); // rough audio token estimate
      costMonitor.recordUsage(model, inputTokens, outputTokens, 'conversation');
      
      console.log(`[audio] Transcribed via ${model}: ${transcription.length} chars`);
      return transcription;
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        console.error(`[audio] Model ${model} timed out`);
      } else {
        console.error(`[audio] Model ${model} failed: ${err.message}`);
      }
      return null;
    }
  }

  return null;
}

/** Normalize MIME type for Gemini API */
function normalizeMimeType(mime: string): string {
  const lower = mime.toLowerCase().split(";")[0].trim();
  // Telegram sends "audio/ogg" which is correct
  // Some clients send "audio/ogg; codecs=opus" — strip codec info
  if (lower === "audio/oga") return "audio/ogg";
  if (lower === "audio/aac") return "audio/x-aac";
  return lower;
}
