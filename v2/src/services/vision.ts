import type { ImageContent } from "@mariozechner/pi-ai";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_IMAGES = 2;
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export function extractImageUrls(text: string): string[] {
  if (!text) return [];
  const urls = new Set<string>();
  const regex = /(https?:\/\/[^\s)\]]+)/gi;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(text)) !== null) {
    const url = match[1];
    const lower = url.toLowerCase();
    if (IMAGE_EXTENSIONS.some((ext) => lower.includes(ext))) {
      urls.add(url.replace(/[\]\[()<>"']+$/g, ""));
    }
  }
  return Array.from(urls).slice(0, MAX_IMAGES);
}

export async function fetchImages(urls: string[]): Promise<ImageContent[]> {
  const images: ImageContent[] = [];
  for (const url of urls) {
    if (images.length >= MAX_IMAGES) break;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength > MAX_IMAGE_BYTES) continue;

      images.push({
        type: "image",
        data: buffer.toString("base64"),
        mimeType: contentType.split(";")[0] || "image/jpeg",
      });
    } catch {
      continue;
    }
  }
  return images;
}
