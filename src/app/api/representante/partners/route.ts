import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { isMissingTable } from "@/lib/db-compat";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salesRepId = searchParams.get("sales_rep_id");

  if (!salesRepId) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });

  // Only the rep themselves (via portal session cookie) or an admin may read this.
  if (!isAdminRequest(req) && repIdFromRequest(req) !== salesRepId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  // 1. Get partner IDs linked to this rep
  let { data: links, error: linksErr } = await db
    .from("partner_sales_reps")
    .select("partner_id")
    .eq("sales_rep_id", salesRepId);

  if (linksErr && isMissingTable(linksErr)) {
    const fallback = await db
      .from("rep_partner_crm")
      .select("partner_id")
      .eq("sales_rep_id", salesRepId)
      .not("partner_id", "is", null);
    links = fallback.data;
    linksErr = fallback.error;
  }

  if (linksErr && isMissingTable(linksErr)) return NextResponse.json([]);
  if (linksErr) return NextResponse.json({ error: linksErr.message }, { status: 500 });
  if (!links || links.length === 0) return NextResponse.json([]);

  const partnerIds = links.map((l: { partner_id: string }) => l.partner_id);

  // 2. Fetch partner records
  const { data: partners, error: partnersErr } = await db
    .from("partners")
    .select("id, name, profession, status, coupon_code, created_at")
    .in("id", partnerIds)
    .order("name", { ascending: true });

  if (partnersErr) return NextResponse.json({ error: partnersErr.message }, { status: 500 });
  if (!partners || partners.length === 0) return NextResponse.json([]);

  // 3. Fetch all coupon_uses for these partners to compute stats
  const couponCodes = partners
    .map((p: { coupon_code: string }) => p.coupon_code)
    .filter(Boolean);

  let usesByCode: Record<string, { total: number; count: number; lastDate: string | null }> = {};

  if (couponCodes.length > 0) {
    const { data: uses } = await db
      .from("coupon_uses")
      .select("coupon_code, material_discounted, sale_status, created_at")
      .in("coupon_code", couponCodes)
      .neq("sale_status", "cancelado");

    for (const u of (uses ?? []) as Array<{
      coupon_code: string;
      material_discounted: number | null;
      sale_status: string | null;
      created_at: string;
    }>) {
      const code = u.coupon_code;
      if (!usesByCode[code]) usesByCode[code] = { total: 0, count: 0, lastDate: null };
      usesByCode[code].count++;
      usesByCode[code].total += u.material_discounted ?? 0;
      if (!usesByCode[code].lastDate || u.created_at > usesByCode[code].lastDate!) {
        usesByCode[code].lastDate = u.created_at;
      }
    }
  }

  // 4. Merge and return
  return NextResponse.json(
    partners.map((p: {
      id: string; name: string; profession: string | null;
      status: string; coupon_code: string; created_at: string;
    }) => ({
      ...p,
      total_sales: usesByCode[p.coupon_code]?.total ?? 0,
      sales_count: usesByCode[p.coupon_code]?.count ?? 0,
      last_sale_at: usesByCode[p.coupon_code]?.lastDate ?? null,
    }))
  );
}
