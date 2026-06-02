import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function generateSlug(length = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no confusable chars
  let slug = "";
  for (let i = 0; i < length; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = supabaseAdmin();

  // Generate a unique slug
  let slug = generateSlug();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await db.from("saved_quotes").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = generateSlug();
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("saved_quotes")
    .insert({
      slug,
      partner_id: body.partner_id ?? null,
      partner_name: body.partner_name ?? null,
      coupon_code: body.coupon_code ?? null,
      spaces: body.spaces ?? [],
      total_plates: body.total_plates ?? null,
      total_area_m2: body.total_area_m2 ?? null,
      material_total: body.material_total ?? null,
      material_discounted: body.material_discounted ?? null,
      expires_at: expiresAt,
    })
    .select("slug")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slug: data.slug }, { status: 201 });
}
