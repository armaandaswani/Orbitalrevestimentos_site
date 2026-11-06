import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Short link to a Visualizador render, for the WhatsApp message: /v/<first 12 hex of the render id>.
 * The raw Storage URL was long and scary, and WhatsApp read the UUID inside it as a Pix key (owner,
 * 2026-11-06). Same idea as /o. Redirects to the latest image of that render.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const hex = code.toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(hex)) return NextResponse.redirect(new URL("/visualizador", req.url));
  const head = `${hex.slice(0, 8)}-${hex.slice(8, 12)}`;
  const { data } = await supabaseAdmin()
    .from("visualizador_renders")
    .select("images")
    .gte("id", `${head}-0000-0000-000000000000`)
    .lte("id", `${head}-ffff-ffff-ffffffffffff`)
    .limit(1)
    .maybeSingle();
  const images = (data as { images?: { url?: string }[] } | null)?.images;
  const url = Array.isArray(images) ? images[images.length - 1]?.url : undefined;
  return NextResponse.redirect(url ? new URL(url) : new URL("/visualizador", req.url));
}
