import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

const MIGRATION_HINT = "Recurso indisponível — rode a migração 028 (partner_sales_reps) no Supabase.";

async function syncCrmLink(db: ReturnType<typeof supabaseAdmin>, partnerId: string, salesRepId: string) {
  const { error } = await db
    .from("rep_partner_crm")
    .insert({
      partner_id: partnerId,
      sales_rep_id: salesRepId,
      first_contact_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  return error;
}

// GET /api/partners/[id]/reps — return all reps linked to this partner
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(_req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("partner_sales_reps")
    .select("id, sales_rep_id, sales_reps(id, name, referral_code, commission_type, commission_value, status)")
    .eq("partner_id", id)
    .order("created_at", { ascending: true });

  if (error && isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/partners/[id]/reps — link a rep to this partner
// body: { sales_rep_id: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { sales_rep_id } = await req.json();
  if (!sales_rep_id) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("partner_sales_reps")
    .insert({ partner_id: id, sales_rep_id });

  if (error) {
    if (error.code === "23505") {
      try { await syncCrmLink(db, id, sales_rep_id); } catch { /* non-fatal */ }
      return NextResponse.json({ ok: true, already_linked: true });
    }
    if (isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const syncErr = await syncCrmLink(db, id, sales_rep_id);
    if (syncErr && syncErr.code !== "23505") {
      // CRM sync is useful for agenda/kanban, but the canonical link was saved.
      console.warn("[partner-reps] CRM sync failed", syncErr.message);
    }
  } catch { /* CRM sync is non-fatal */ }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/partners/[id]/reps — unlink a rep from this partner
// body: { sales_rep_id: string }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { sales_rep_id } = await req.json();
  if (!sales_rep_id) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("partner_sales_reps")
    .delete()
    .eq("partner_id", id)
    .eq("sales_rep_id", sales_rep_id);

  if (error && isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep the representative CRM consistent with the admin ownership link.
  try {
    await db
      .from("rep_partner_crm")
      .delete()
      .eq("partner_id", id)
      .eq("sales_rep_id", sales_rep_id);
  } catch { /* CRM sync is non-fatal */ }
  return NextResponse.json({ ok: true });
}
