import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("line_pricing")
    .select("linha, special_price, public_price, updated_at")
    .order("linha");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { linha: string; special_price: number; public_price: number };
  const { linha, special_price, public_price } = body;

  if (!["Classic", "Brilliance", "Elegance"].includes(linha))
    return NextResponse.json({ error: "Invalid linha" }, { status: 400 });
  if (typeof special_price !== "number" || typeof public_price !== "number" || special_price <= 0 || public_price <= 0)
    return NextResponse.json({ error: "Invalid prices" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("line_pricing")
    .upsert({ linha, special_price, public_price, updated_at: new Date().toISOString() }, { onConflict: "linha" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
