import type { NextRequest } from "next/server";

export function radarEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.RADAR_ENABLED === "1";
}
export function invalidWriteOrigin(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const value=req.headers.get("origin");
  if (!value) return false;
  try {
    const origin=new URL(value);
    // Next may canonicalize the loopback hostname internally. Browser Host is
    // authoritative for this check; do not accept arbitrary forwarded hosts.
    return origin.host !== (req.headers.get("host") || req.nextUrl.host) ||
      (process.env.VERCEL ? origin.protocol!=="https:" : !["https:","http:"].includes(origin.protocol));
  } catch { return true; }
}
export async function boundedBody(req: Request, limit: number) {
  if (Number(req.headers.get("content-length")) > limit || !req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) { await reader.cancel(); return null; }
      chunks.push(next.value);
    }
    return Buffer.concat(chunks);
  } finally { reader.releaseLock(); }
}
