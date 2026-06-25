import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

const MIGRATION_HINT = "Recurso indisponível — rode a migração 019 (rep_partner_crm) no Supabase.";

/**
 * GET /api/representante/crm?sales_rep_id= — every tracked partner for this
 * rep: the CRM pipeline row + partner info + live revenue stats (same
 * coupon_uses aggregation as /api/representante/partners).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salesRepId = searchParams.get("sales_rep_id");
  if (!salesRepId) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });

  if (!isAdminRequest(req) && repIdFromRequest(req) !== salesRepId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: crmRows, error: crmErr } = await db
    .from("rep_partner_crm")
    .select("*")
    .eq("sales_rep_id", salesRepId)
    .order("updated_at", { ascending: false });

  if (crmErr && isMissingTable(crmErr)) return NextResponse.json([]);
  if (crmErr) return NextResponse.json({ error: crmErr.message }, { status: 500 });
  if (!crmRows || crmRows.length === 0) return NextResponse.json([]);

  const partnerIds = crmRows.map((r) => r.partner_id).filter(Boolean) as string[];
  const { data: partners, error: partnersErr } = partnerIds.length
    ? await db
        .from("partners")
        .select("id, name, profession, status, coupon_code, phone, email")
        .in("id", partnerIds)
    : { data: [], error: null };
  if (partnersErr) return NextResponse.json({ error: partnersErr.message }, { status: 500 });

  const partnerById = new Map((partners ?? []).map((p) => [p.id as string, p]));
  const couponCodes = (partners ?? []).map((p) => p.coupon_code as string).filter(Boolean);

  const statsByCode: Record<string, { total: number; count: number; lastDate: string | null }> = {};
  if (couponCodes.length > 0) {
    const { data: uses } = await db
      .from("coupon_uses")
      .select("coupon_code, material_discounted, sale_status, created_at")
      .in("coupon_code", couponCodes)
      .neq("sale_status", "cancelado");

    for (const u of (uses ?? []) as Array<{
      coupon_code: string;
      material_discounted: number | null;
      created_at: string;
    }>) {
      const code = u.coupon_code;
      if (!statsByCode[code]) statsByCode[code] = { total: 0, count: 0, lastDate: null };
      statsByCode[code].count++;
      statsByCode[code].total += u.material_discounted ?? 0;
      if (!statsByCode[code].lastDate || u.created_at > statsByCode[code].lastDate!) {
        statsByCode[code].lastDate = u.created_at;
      }
    }
  }

  const result = crmRows
    .map((row) => {
      // Registered partner, or an inline prospect (no partners row yet).
      const partner = row.partner_id
        ? partnerById.get(row.partner_id as string)
        : {
            id: null,
            name: (row.prospect_name as string) || "Prospecto",
            profession: (row.prospect_profession as string) ?? null,
            status: "prospect",
            coupon_code: null,
            phone: (row.prospect_phone as string) ?? null,
            email: (row.prospect_email as string) ?? null,
          };
      if (!partner) return null; // partner_id set but partner was deleted
      const stats = partner.coupon_code
        ? statsByCode[partner.coupon_code as string] ?? { total: 0, count: 0, lastDate: null }
        : { total: 0, count: 0, lastDate: null };
      return {
        ...row,
        is_prospect: !row.partner_id,
        partner,
        total_generated: stats.total,
        projects_count: stats.count,
        last_sale_at: stats.lastDate,
      };
    })
    .filter(Boolean);

  return NextResponse.json(result);
}

/** POST /api/representante/crm — start tracking a partner. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const salesRepId = body.sales_rep_id;
  const partnerId = body.partner_id || null;
  const prospectName = typeof body.prospect_name === "string" ? body.prospect_name.trim() : "";
  // Either track a registered partner, or create an inline prospect by name.
  if (!salesRepId || (!partnerId && !prospectName)) {
    return NextResponse.json(
      { error: "Informe um parceiro ou o nome de um prospecto." },
      { status: 400 }
    );
  }
  if (!isAdminRequest(req) && repIdFromRequest(req) !== salesRepId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const insertRow: Record<string, unknown> = {
    sales_rep_id: salesRepId,
    partner_id: partnerId,
    first_contact_at: body.first_contact_at || new Date().toISOString(),
  };
  if (!partnerId) {
    insertRow.prospect_name = prospectName;
    if (typeof body.prospect_phone === "string") insertRow.prospect_phone = body.prospect_phone.trim() || null;
    if (typeof body.prospect_email === "string") insertRow.prospect_email = body.prospect_email.trim() || null;
    if (typeof body.prospect_profession === "string") insertRow.prospect_profession = body.prospect_profession.trim() || null;
  }

  const { data, error } = await db.from("rep_partner_crm").insert(insertRow).select().single();

  if (error && isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  // Already tracking this registered partner — return the existing row.
  if (error?.code === "23505" && partnerId) {
    const { data: existing } = await db
      .from("rep_partner_crm")
      .select("*")
      .eq("sales_rep_id", salesRepId)
      .eq("partner_id", partnerId)
      .single();
    return NextResponse.json(existing);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
