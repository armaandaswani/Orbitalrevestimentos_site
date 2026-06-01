import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-auth") === ADMIN_PW;
}

/** GET — list all admin coupons */
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("admin_coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** POST — create a new admin coupon */
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    code,           // string — e.g. "AVISTA5"
    discount_pct,   // number — e.g. 5
    payment_type,   // "a_vista" | "parcelado" | "qualquer"
    usage_type,     // "single_use" | "temporary"
    expires_at,     // ISO string | null (for temporary)
  } = body;

  if (!code || !discount_pct || !payment_type || !usage_type) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("admin_coupons")
    .insert({
      code: (code as string).toUpperCase().trim(),
      discount_pct: Number(discount_pct),
      payment_type,
      usage_type,
      expires_at: expires_at ?? null,
      used: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE — remove an admin coupon */
export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const db = supabaseAdmin();
  const { error } = await db.from("admin_coupons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
