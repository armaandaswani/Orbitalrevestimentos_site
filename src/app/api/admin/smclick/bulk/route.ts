import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  smclickConfigured,
  createContact,
  extractContactId,
  normalizePhone,
  smclickDefaultTags,
} from "@/lib/smclick";

/**
 * POST /api/admin/smclick/bulk — push CRM leads into SM Click as WhatsApp
 * contacts so SM Click can start each contact's journey.
 *
 * Body (all optional):
 *   { leadIds?: string[],        // specific leads; omitted = all leads
 *     onlyUnsynced?: boolean,    // default true — skip leads already pushed
 *     tagIds?: string[] }        // tags to apply (defaults to SMCLICK_DEFAULT_TAGS)
 *
 * Leads without a usable phone are skipped. Each successful push records the
 * returned SM Click contact id so re-running is idempotent. Capped per call to
 * stay within the serverless time budget.
 */

const MAX_PER_CALL = 250;

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!smclickConfigured()) {
    return NextResponse.json(
      { error: "SM Click não configurado. Defina SMCLICK_API_URL e SMCLICK_API_KEY." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    leadIds?: unknown;
    onlyUnsynced?: unknown;
    tagIds?: unknown;
  };
  const leadIds = Array.isArray(body.leadIds) ? body.leadIds.map(String) : null;
  const onlyUnsynced = body.onlyUnsynced !== false; // default true
  const tagIds = Array.isArray(body.tagIds) ? body.tagIds.map(String) : smclickDefaultTags();

  const db = supabaseAdmin();
  let query = db
    .from("leads")
    .select("id, name, phone, smclick_contact_id")
    .not("phone", "is", null)
    .order("created_at", { ascending: false })
    .limit(MAX_PER_CALL);
  if (leadIds && leadIds.length > 0) query = query.in("id", leadIds);
  if (onlyUnsynced) query = query.is("smclick_contact_id", null);

  const { data: leads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let pushed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    if (lead.smclick_contact_id && onlyUnsynced) {
      skipped++;
      continue;
    }
    const telephone = normalizePhone(lead.phone as string | null);
    if (!telephone) {
      skipped++;
      continue;
    }
    const res = await createContact({
      name: (lead.name as string) || "—",
      telephone,
      tags: tagIds,
    });
    if (!res.ok) {
      failed++;
      if (errors.length < 5) errors.push(`${lead.name}: [HTTP ${res.status}] ${res.error ?? "erro"}`);
      continue;
    }
    const contactId = extractContactId(res.data);
    await db
      .from("leads")
      .update({ smclick_contact_id: contactId, smclick_synced_at: new Date().toISOString() })
      .eq("id", lead.id);
    pushed++;
  }

  const total = (leads ?? []).length;
  return NextResponse.json({
    ok: true,
    total,
    pushed,
    skipped,
    failed,
    capped: total >= MAX_PER_CALL,
    errors,
  });
}
