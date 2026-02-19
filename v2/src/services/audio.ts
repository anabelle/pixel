/**
 * Audio Transcription Service — Gemini-based voice message processing
 *
 * Transcribes audio (voice messages) using Google Gemini's native audio understanding.
 * Gemini 2.0 Flash accepts audio/ogg natively — no ffmpeg needed.
 *
 * This is a pre-processing step: audio → text, then text feeds into promptWithHistory().
 * Pi-ai has no AudioContent type, so we call the Gemini REST API directly.
 */

import { resolveGoogleApiKey } from "./google-key.js";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB (Gemini supports up to ~8.4 hours)
const TRANSCRIPTION_TIMEOUT_MS = 30_000;

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: normalizedMime,
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

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`[audio] Gemini API error ${res.status}: ${errorText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || text.trim() === "[inaudible]") {
      console.log("[audio] Transcription empty or inaudible");
      return null;
    }

    const transcription = text.trim();
    console.log(`[audio] Transcribed ${buffer.byteLength} bytes → ${transcription.length} chars`);
    return transcription;
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.error("[audio] Transcription timed out");
    } else {
      console.error(`[audio] Transcription failed: ${err.message}`);
    }
    return null;
  }
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
