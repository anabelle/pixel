/**
 * Text-to-Speech — Edge TTS → ffmpeg → OGG/Opus for Telegram voice messages.
 * Free, no API key. Returns null on any failure — caller falls back to text.
 */

import { EdgeTTS } from "node-edge-tts";
import { join } from "path";
import { unlinkSync, existsSync, readFileSync } from "fs";

const MAX_LEN = 1500;

const VOICES: Record<string, [string, string]> = {
  es: ["es-MX-DaliaNeural", "es-MX"],
  en: ["en-US-AriaNeural", "en-US"],
  fr: ["fr-FR-DeniseNeural", "fr-FR"],
  pt: ["pt-BR-FranciscaNeural", "pt-BR"],
  ja: ["ja-JP-NanamiNeural", "ja-JP"],
  zh: ["zh-CN-XiaoyiNeural", "zh-CN"],
};

function detectLang(text: string): string {
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  const es = (text.match(/\b(que|para|pero|por|una|los|las|con|más|tiene|puede|está|esto|también|ahora|bien|porque|tengo|creo)\b/gi) || []).length;
  const en = (text.match(/\b(the|and|that|with|from|have|for|but|not|you|can|was|just|what|how|about|would|like|when|could|know|think)\b/gi) || []).length;
  if (es > en && es >= 2) return "es";
  if (en >= 2) return "en";
  return "es";
}

/** Is this response worth voicing? No code, no long lists, no walls of text. */
export function isSuitableForVoice(text: string): boolean {
  if (!text || text.length > MAX_LEN || text.length < 5) return false;
  if (text.includes("```") || text.includes("[SILENT]")) return false;
  if ((text.match(/https?:\/\//g) || []).length > 1) return false;
  if ((text.match(/^[-*•]\s/gm) || []).length > 3) return false;
  return true;
}

/** Generate OGG/Opus voice buffer from text. Returns null on failure. */
export async function textToSpeech(text: string): Promise<Buffer | null> {
  if (!text || text.length > MAX_LEN) return null;

  const cleaned = text
    .replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/_(.+?)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 3) return null;

  const lang = detectLang(cleaned);
  const [voice, locale] = VOICES[lang] ?? VOICES.es;
  const id = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const mp3 = join("/tmp", `${id}.mp3`);
  const ogg = join("/tmp", `${id}.ogg`);

  try {
    await new EdgeTTS({ voice, lang: locale, rate: "+5%", pitch: "+5%", timeout: 15000 }).ttsPromise(cleaned, mp3);
    if (!existsSync(mp3)) return null;

    const proc = Bun.spawn(["ffmpeg", "-y", "-i", mp3, "-c:a", "libopus", "-b:a", "48k", "-vn", "-f", "ogg", ogg], { stdout: "ignore", stderr: "ignore" });
    if ((await proc.exited) !== 0 || !existsSync(ogg)) return null;

    const buf = Buffer.from(readFileSync(ogg));
    console.log(`[tts] ${cleaned.length} chars → ${buf.byteLength} bytes (${voice})`);
    return buf;
  } catch (err: any) {
    console.error(`[tts] Failed: ${err.message}`);
    return null;
  } finally {
    try { if (existsSync(mp3)) unlinkSync(mp3); } catch {}
    try { if (existsSync(ogg)) unlinkSync(ogg); } catch {}
  }
}
