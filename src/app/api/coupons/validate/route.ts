import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const upperCode = (code as string).toUpperCase().trim();
  const db = supabaseAdmin();

  // 1. Check partner coupons first
  const { data: partner } = await db
    .from("partners")
    .select("id, name, coupon_code, discount_type, discount_value, commission_type, commission_value")
    .eq("coupon_code", upperCode)
    .eq("status", "active")
    .single();

  if (partner) {
    return NextResponse.json({
      id: partner.id,
      partner_name: partner.name,
      coupon_code: partner.coupon_code,
      discount_type: partner.discount_type,
      discount_value: partner.discount_value,
      commission_type: partner.commission_type,
      commission_value: partner.commission_value,
      source: "partner",
    });
  }

  // 2. Check admin coupons
  const { data: adminCoupon } = await db
    .from("admin_coupons")
    .select("*")
    .eq("code", upperCode)
    .eq("used", false)
    .single();

  if (!adminCoupon) {
    // 3. Check sales rep referral codes (direct sales)
    const { data: rep } = await db
      .from("sales_reps")
      .select("id, name, referral_code, commission_type, commission_value, status")
      .eq("referral_code", upperCode)
      .eq("status", "active")
      .single();

    if (rep) {
      return NextResponse.json({
        id: rep.id,
        partner_name: rep.name,
        coupon_code: rep.referral_code,
        discount_type: "percentage",
        discount_value: 0,
        commission_type: rep.commission_type,
        commission_value: rep.commission_value,
        source: "rep",
      });
    }

    return NextResponse.json({ error: "Cupom inválido ou inativo." }, { status: 404 });
  }

  // Check expiry
  if (adminCoupon.expires_at && new Date(adminCoupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "Cupom expirado." }, { status: 404 });
  }

  // Mark single-use coupon as used immediately on validation
  if (adminCoupon.usage_type === "single_use") {
    await db.from("admin_coupons").update({ used: true }).eq("id", adminCoupon.id);
  }

  return NextResponse.json({
    id: adminCoupon.id,
    partner_name: "Orbital",
    coupon_code: adminCoupon.code,
    discount_type: "percentage",
    discount_value: adminCoupon.discount_pct,
    commission_type: null,
    commission_value: null,
    payment_type: adminCoupon.payment_type,
    source: "admin",
  });
}
