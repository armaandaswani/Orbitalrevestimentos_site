import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const couponCode = searchParams.get("coupon_code");
  const salesRepCode = searchParams.get("sales_rep_code");

  const db = supabaseAdmin();

  if (salesRepCode) {
    // Primary: fetch via coupon_use_commissions (new multi-rep table)
    const { data: commRows, error: commErr } = await db
      .from("coupon_use_commissions")
      .select("coupon_use_id, commission_owed, sales_rep_referral_code")
      .eq("sales_rep_referral_code", salesRepCode.toUpperCase());

    // Fallback: also fetch direct coupon_uses (legacy single-rep field)
    const { data: directUses } = await db
      .from("coupon_uses")
      .select("*")
      .eq("sales_rep_referral_code", salesRepCode.toUpperCase())
      .order("created_at", { ascending: false });

    if (commErr) return NextResponse.json({ error: commErr.message }, { status: 500 });

    const commissionByUseId: Record<string, number> = {};
    for (const r of (commRows ?? [])) {
      commissionByUseId[r.coupon_use_id as string] = r.commission_owed as number;
    }

    // Collect all coupon_use_ids from commissions table
    const commUseIds = (commRows ?? []).map((r) => r.coupon_use_id as string).filter(Boolean);

    let allUses: Record<string, unknown>[] = [];

    if (commUseIds.length > 0) {
      const { data: commUses } = await db
        .from("coupon_uses")
        .select("*")
        .in("id", commUseIds)
        .order("created_at", { ascending: false });
      allUses = (commUses ?? []) as Record<string, unknown>[];
    }

    // Merge with legacy direct uses (deduplicate by id)
    const seenIds = new Set(allUses.map((u) => u.id as string));
    for (const u of (directUses ?? []) as Record<string, unknown>[]) {
      if (!seenIds.has(u.id as string)) {
        allUses.push(u);
        seenIds.add(u.id as string);
      }
    }

    // Sort by created_at desc
    allUses.sort((a, b) => {
      const da = new Date(a.created_at as string).getTime();
      const db2 = new Date(b.created_at as string).getTime();
      return db2 - da;
    });

    // Enrich with partner name and override commission with rep-specific value
    const couponCodes = [...new Set(allUses.map((u) => u.coupon_code as string).filter(Boolean))];
    let nameMap: Record<string, string> = {};
    if (couponCodes.length > 0) {
      const { data: partners } = await db
        .from("partners")
        .select("coupon_code, name")
        .in("coupon_code", couponCodes);
      (partners ?? []).forEach((p: { coupon_code: string; name: string }) => {
        nameMap[p.coupon_code] = p.name;
      });
    }

    return NextResponse.json(
      allUses.map((u) => ({
        ...u,
        partner_name: nameMap[u.coupon_code as string] || null,
        // Override with this rep's specific commission if available
        sales_rep_commission_owed:
          commissionByUseId[u.id as string] !== undefined
            ? commissionByUseId[u.id as string]
            : u.sales_rep_commission_owed,
      }))
    );
  }

  // No sales_rep_code filter — standard query
  let query = db.from("coupon_uses").select("*").order("created_at", { ascending: false });
  if (couponCode) query = query.eq("coupon_code", couponCode.toUpperCase());

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  // Create commission records for all reps linked to this partner
  if (data && body.partner_id) {
    try {
      const { data: linkedReps } = await db
        .from("partner_sales_reps")
        .select("sales_rep_id, sales_reps(id, referral_code, commission_type, commission_value, status)")
        .eq("partner_id", body.partner_id);

      if (linkedReps && linkedReps.length > 0) {
        const commissions = linkedReps
          .map((lr: Record<string, unknown>) => {
            const rep = lr.sales_reps as Record<string, unknown> | null;
            if (!rep || rep.status !== "active") return null;
            const commOwed =
              rep.commission_type === "percentage"
                ? ((body.material_discounted as number) ?? 0) * (rep.commission_value as number) / 100
                : (rep.commission_value as number);
            return {
              coupon_use_id: (data as Record<string, unknown>).id as string,
              sales_rep_id: rep.id as string,
              sales_rep_referral_code: rep.referral_code as string,
              commission_owed: commOwed,
            };
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

        if (commissions.length > 0) {
          await db.from("coupon_use_commissions").insert(commissions);
        }
      }
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json(data, { status: 201 });
}
