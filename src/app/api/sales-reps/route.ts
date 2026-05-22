import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("sales_reps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    email,
    phone,
    referral_code,
    commission_type,
    commission_value,
    portal_password,
  } = body;

  if (!name || !referral_code) {
    return NextResponse.json({ error: "name e referral_code são obrigatórios." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("sales_reps")
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      referral_code: (referral_code as string).toUpperCase(),
      commission_type: commission_type || "percentage",
      commission_value: commission_value ?? 5,
      portal_password: portal_password || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Código de indicação já existe." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
