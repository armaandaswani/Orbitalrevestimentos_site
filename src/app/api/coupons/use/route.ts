import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const couponCode = searchParams.get("coupon_code");
  const salesRepCode = searchParams.get("sales_rep_code");

  const db = supabaseAdmin();
  let query = db.from("coupon_uses").select("*").order("created_at", { ascending: false });

  if (couponCode) {
    query = query.eq("coupon_code", couponCode.toUpperCase());
  }

  if (salesRepCode) {
    query = query.eq("sales_rep_referral_code", salesRepCode.toUpperCase());
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with partner name when filtering by sales rep
  if (salesRepCode && data && data.length > 0) {
    const couponCodes = [...new Set(data.map((u: Record<string, unknown>) => u.coupon_code as string).filter(Boolean))];
    const { data: partners } = await db
      .from("partners")
      .select("coupon_code, name")
      .in("coupon_code", couponCodes);
    const nameMap: Record<string, string> = {};
    (partners || []).forEach((p: { coupon_code: string; name: string }) => { nameMap[p.coupon_code] = p.name; });
    return NextResponse.json(data.map((u: Record<string, unknown>) => ({ ...u, partner_name: nameMap[u.coupon_code as string] || null })));
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = supabaseAdmin();

  // Look up the partner to get their sales_rep_referral_code
  let salesRepReferralCode: string | null = null;
  let salesRepCommissionOwed: number | null = null;

  if (body.coupon_code) {
    const { data: partner } = await db
      .from("partners")
      .select("sales_rep_referral_code")
      .eq("coupon_code", (body.coupon_code as string).toUpperCase())
      .maybeSingle();

    if (partner?.sales_rep_referral_code) {
      salesRepReferralCode = partner.sales_rep_referral_code as string;

      const { data: salesRep } = await db
        .from("sales_reps")
        .select("commission_type, commission_value")
        .eq("referral_code", salesRepReferralCode)
        .eq("status", "active")
        .maybeSingle();

      if (salesRep && body.material_discounted != null) {
        salesRepCommissionOwed =
          salesRep.commission_type === "percentage"
            ? (body.material_discounted as number) * (salesRep.commission_value as number) / 100
            : (salesRep.commission_value as number);
      }
    }
  }

  const { data, error } = await db
    .from("coupon_uses")
    .insert({
      partner_id: body.partner_id,
      coupon_code: body.coupon_code,
      space: body.space,
      product_name: body.product_name,
      product_code: body.product_code,
      area_m2: body.area_m2,
      plates: body.plates,
      material_total: body.material_total,
      material_discounted: body.material_discounted,
      discount_applied: body.discount_applied,
      commission_owed: body.commission_owed,
      architect_name: body.architect_name,
      sales_rep_referral_code: salesRepReferralCode,
      sales_rep_commission_owed: salesRepCommissionOwed,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
