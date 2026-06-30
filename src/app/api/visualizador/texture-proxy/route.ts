import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy for slab textures used by the deterministic projection.
// WHY: the projection draws the texture to a <canvas> and reads pixels back
// (toDataURL/getImageData). A cross-origin image (Supabase storage) taints the
// canvas and those reads throw — silently dropping the render to the generative
// path. Loading the texture THROUGH this route makes it same-origin, so the
// canvas is never tainted, regardless of the storage bucket's CORS config.
//
// SSRF guard: only proxies https URLs on the project's own Supabase host.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaHost = supaUrl ? (() => { try { return new URL(supaUrl).host; } catch { return null; } })() : null;
  if (target.protocol !== "https:" || (supaHost && target.host !== supaHost)) {
    return new NextResponse("forbidden host", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString());
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
  if (!upstream.ok) return new NextResponse(`upstream ${upstream.status}`, { status: 502 });

  const buf = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
