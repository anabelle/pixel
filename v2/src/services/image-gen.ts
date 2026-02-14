/**
 * Image Generation Service — Gemini Image API
 *
 * Pixel-first: generate images for autonomous creation and sharing.
 * Uses Gemini image-capable models via REST (no new deps).
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const DEFAULT_MODEL: ImageModel = "pro";
const IMAGE_TIMEOUT_MS = 45_000;
const MAX_PROMPT_CHARS = 1500;

const MODEL_IDS = {
  pro: "gemini-3-pro-image-preview",
  flash: "gemini-2.5-flash-image",
} as const;

const VALID_RATIOS = new Set([
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
]);

type ImageModel = "pro" | "flash";
type ImageSize = "1K" | "2K" | "4K";

export type ImageGenOptions = {
  model?: ImageModel;
  ratio?: string;
  size?: ImageSize; // pro only
};

export type ImageGenResult = {
  buffer: Buffer;
  mimeType: string;
  modelUsed: ImageModel;
  path?: string;
};

export async function generateImage(
  prompt: string,
  options: ImageGenOptions = {}
): Promise<ImageGenResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("No Gemini API key available for image generation");
  }

  const trimmed = (prompt || "").trim();
  if (!trimmed) {
    throw new Error("Prompt is required for image generation");
  }

  const safePrompt = trimmed.length > MAX_PROMPT_CHARS
    ? trimmed.slice(0, MAX_PROMPT_CHARS)
    : trimmed;

  const ratio = options.ratio && VALID_RATIOS.has(options.ratio)
    ? options.ratio
    : "1:1";

  const requestedModel: ImageModel = options.model ?? DEFAULT_MODEL;
  const modelFallbacks: ImageModel[] = requestedModel === "pro"
    ? ["pro", "flash"]
    : ["flash", "pro"];

  let lastError: string | null = null;

  for (const model of modelFallbacks) {
    try {
      const modelId = MODEL_IDS[model];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

      const imageConfig: Record<string, string> = { aspectRatio: ratio };
      if (options.size && model === "pro") {
        imageConfig.imageSize = options.size;
      }

      const body = {
        contents: [{ parts: [{ text: safePrompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig,
        },
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Gemini image API ${res.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part?.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          const buffer = Buffer.from(part.inlineData.data, "base64");
          const path = saveGeneratedImage(buffer, mimeType);
          return { buffer, mimeType, modelUsed: model, path };
        }
      }

      throw new Error("No image data in Gemini response");
    } catch (err: any) {
      lastError = err?.message ?? "Unknown error";
      continue;
    }
  }

  throw new Error(lastError ?? "Image generation failed");
}

function saveGeneratedImage(buffer: Buffer, mimeType: string): string {
  const dir = "/app/data/generated";
  mkdirSync(dir, { recursive: true });

  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const filename = `pixel-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;
  const path = join(dir, filename);
  writeFileSync(path, buffer);
  return path;
}
