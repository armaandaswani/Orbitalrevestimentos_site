import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();

  // Quotes that are still open, created 7+ days ago, and not snoozed past now
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("coupon_uses")
    .select("id, coupon_code, space, product_name, material_discounted, created_at, next_followup_at, sale_status")
    .in("sale_status", ["em_orcamento"])
    .lte("created_at", sevenDaysAgo)
    .or("next_followup_at.is.null,next_followup_at.lte." + new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with partner name
  const codes = [...new Set((data ?? []).map((u: Record<string, unknown>) => u.coupon_code as string).filter(Boolean))];
  let nameMap: Record<string, string> = {};
  if (codes.length > 0) {
    const { data: partners } = await db
      .from("partners")
      .select("coupon_code, name")
      .in("coupon_code", codes);
    (partners ?? []).forEach((p: { coupon_code: string; name: string }) => {
      nameMap[p.coupon_code] = p.name;
    });
  }

  return NextResponse.json(
    (data ?? []).map((u: Record<string, unknown>) => ({
      ...u,
      partner_name: nameMap[u.coupon_code as string] || null,
    }))
  );
}
