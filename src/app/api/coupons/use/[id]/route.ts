import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const updatePayload: Record<string, unknown> = { sale_status: body.sale_status };

  // When concluding a sale, lock in sales_rep commission if not yet set
  if (body.sale_status === "concluido") {
    const { data: existing } = await db
      .from("coupon_uses")
      .select("sales_rep_referral_code, sales_rep_commission_owed, material_discounted")
      .eq("id", id)
      .single();

    if (
      existing?.sales_rep_referral_code &&
      existing.sales_rep_commission_owed == null &&
      existing.material_discounted != null
    ) {
      const { data: salesRep } = await db
        .from("sales_reps")
        .select("commission_type, commission_value")
        .eq("referral_code", existing.sales_rep_referral_code as string)
        .eq("status", "active")
        .maybeSingle();

      if (salesRep) {
        updatePayload.sales_rep_commission_owed =
          salesRep.commission_type === "percentage"
            ? (existing.material_discounted as number) * (salesRep.commission_value as number) / 100
            : (salesRep.commission_value as number);
      }
    }
  }

  const { data, error } = await db
    .from("coupon_uses")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
