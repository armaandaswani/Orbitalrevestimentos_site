import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/partner-simulations?partner_id=<uuid>
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partner_id");
  if (!partnerId) return NextResponse.json({ error: "partner_id required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("partner_simulations")
    .select("id, spaces, total_plates, total_area_m2, material_discounted, sim_url, status, converted_at, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/partner-simulations
// Called by the partner portal when generating a client link.
// Returns { id } which is appended to the simulator URL as sim_id=<id>.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    partner_id, coupon_code, partner_name,
    spaces, total_plates, total_area_m2,
    material_total, material_discounted, sim_url,
  } = body;

  if (!partner_id) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data, error } = await db
    .from("partner_simulations")
    .insert({
      partner_id,
      coupon_code: coupon_code ?? null,
      partner_name: partner_name ?? null,
      spaces: Array.isArray(spaces) ? spaces : [],
      total_plates: total_plates ?? null,
      total_area_m2: total_area_m2 ?? null,
      material_total: material_total ?? null,
      material_discounted: material_discounted ?? null,
      sim_url: sim_url ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
