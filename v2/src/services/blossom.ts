/**
 * Blossom upload helper for Nostr media (BUD-01 auth)
 *
 * PUT /upload with a signed kind-24242 auth event:
 * tags: t=upload, expiration, u=<url>, x=<sha256 of body>
 * Authorization: Nostr base64(full event JSON)
 * Default server: https://blossom.primal.net
 */

import { createHash } from "crypto";

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
  const { NDKPrivateKeySigner } = await import("@nostr-dev-kit/ndk");
  const key = process.env.NOSTR_PRIVATE_KEY || process.env.NOSTR_KEY;
  if (!key) throw new Error("Blossom upload needs NOSTR_PRIVATE_KEY");

  const signer = new NDKPrivateKeySigner(key);
  await signer.blockUntilReady();
  const pubkey = await Promise.resolve(signer.pubkey as string);

  const uploadUrl = `${serverUrl.replace(/\/$/, "")}/upload`;
  const x = createHash("sha256").update(buffer).digest("hex");
  const created_at = Math.floor(Date.now() / 1000);
  const tags = [
    ["t", "upload"],
    ["expiration", String(created_at + 600)],
    ["u", uploadUrl],
    ["x", x],
  ];

  const ser = JSON.stringify([0, pubkey, created_at, 24242, tags, ""]);
  const id = createHash("sha256").update(ser).digest("hex");
  const sig = await signer.sign({ id, pubkey, created_at, kind: 24242, tags, content: "" });
  const token = Buffer.from(
    JSON.stringify({ id, pubkey, created_at, kind: 24242, tags, content: "", sig })
  ).toString("base64");

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      Authorization: `Nostr ${token}`,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Blossom upload failed (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const url = data?.url ?? data?.data?.url;
  if (!url) throw new Error("Blossom upload returned no URL");

  return {
    url,
    sha256: data?.sha256 ?? data?.data?.sha256 ?? x,
    type: data?.type ?? data?.data?.type ?? mimeType,
    size: data?.size ?? data?.data?.size ?? buffer.length,
  };
}
