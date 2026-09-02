/**
 * SSRF guard for outbound fetches from tools.
 *
 * Blocks loopback/private/link-local targets and non-public hostnames
 * (docker service names). Closes the web_fetch → 127.0.0.1:4000/api/whatsapp/qr/data
 * takeover chain (internal admin endpoints trust loopback callers).
 *
 * Known gap: DNS-rebinding (public name resolving to a private IP) is not covered.
 */
export function isForbiddenFetchTarget(rawUrl: string): boolean {
  let u: URL
  try { u = new URL(rawUrl) } catch { return true }
  if (u.protocol !== "http:" && u.protocol !== "https:") return true
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0" || h === "::1" || h === "[::]") return true
  // Dotless hostname = internal docker/service name (public hosts always have a domain)
  if (!h.includes(".")) return true
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2])
    if (a === 0 || a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) return true
  }
  if (h.includes(":")) { // IPv6 literal
    const low = h.replace(/^::ffff:/, "") // unwrap IPv4-mapped
    if (/^\d+\.\d+\.\d+\.\d+$/.test(low)) return isForbiddenFetchTarget(`http://${low}/`)
    if (/^f[cd][0-9a-f]{2}:/.test(low) || /^fe[89ab][0-9a-f]:/.test(low)) return true // fc00::/7, fe80::/10
  }
  return false
}
