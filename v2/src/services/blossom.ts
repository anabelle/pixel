/**
 * Blossom upload helper for Nostr media
 *
 * Uses a simple multipart/form-data POST to a Blossom server.
 * Default server: https://blossom.primal.net
 */

const DEFAULT_BLOSSOM = "https://blossom.primal.net";

export type BlossomUploadResult = {
  url: string;
  sha256?: string;
  type?: string;
  size?: number;
};

export async function uploadToBlossom(
  buffer: Buffer,
  mimeType: string,
  filename = "pixel.png",
  serverUrl = DEFAULT_BLOSSOM
): Promise<BlossomUploadResult> {
  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  form.append("file", blob, filename);

  const res = await fetch(`${serverUrl.replace(/\/$/, "")}/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Blossom upload failed (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  const url = data?.url ?? data?.data?.url;
  if (!url) throw new Error("Blossom upload returned no URL");

  return {
    url,
    sha256: data?.sha256 ?? data?.data?.sha256,
    type: data?.type ?? data?.data?.type,
    size: data?.size ?? data?.data?.size,
  };
}
