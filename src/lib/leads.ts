import { supabaseAdmin } from "@/lib/supabase";
import {
  smclickConfigured,
  createContact,
  extractContactId,
  normalizePhone,
  smclickDefaultTags,
  sendText,
  assignTag,
} from "@/lib/smclick";
import { statusGanhoMessage, statusOrcamentoMessage } from "@/lib/smclick-messages";

export type LeadSource = "website" | "partner" | "manual" | "whatsapp";

/**
 * Record that we just had a WhatsApp touch with this lead (outbound send or
 * inbound message), powering the CRM's "Último contato" column. NEVER throws.
 */
export async function touchLeadContacted(leadId: string): Promise<void> {
  try {
    await supabaseAdmin()
      .from("leads")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", leadId);
  } catch {
    // non-fatal
  }
}

// Status → (SM Click tag env var, client message builder). Moving a lead into
// one of these stages fires the automation: tag the SM Click contact (so SM
// Click's own approved-template journeys can take over) and best-effort send a
// direct message (only lands inside WhatsApp's 24h window).
const STATUS_AUTOMATION: Record<
  string,
  { tagEnv: string; message: (name: string | null) => string }
> = {
  ganho: { tagEnv: "SMCLICK_TAG_GANHO", message: statusGanhoMessage },
  orcamento: { tagEnv: "SMCLICK_TAG_ORCAMENTO", message: statusOrcamentoMessage },
};

/**
 * Feature 5 — react to a CRM status change. Only acts on "ganho"/"orcamento".
 * Applies the mapped SM Click tag (when both a contact id and a configured tag
 * id exist) and sends a thank-you / next-steps WhatsApp. NEVER throws.
 */
export async function applyLeadStatusAutomation(leadId: string, newStatus: string): Promise<void> {
  try {
    if (!smclickConfigured()) return;
    const auto = STATUS_AUTOMATION[newStatus];
    if (!auto) return;

    const db = supabaseAdmin();
    const { data: lead } = await db
      .from("leads")
      .select("id, name, phone, smclick_contact_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return;

    // Tag the SM Click contact (drives their own journeys/templates).
    const tagId = process.env[auto.tagEnv];
    if (tagId && lead.smclick_contact_id) {
      await assignTag(lead.smclick_contact_id as string, tagId);
    }

    // Best-effort direct message (24h window applies; failure is non-fatal).
    const phone = normalizePhone(lead.phone as string | null);
    if (phone) {
      const res = await sendText(phone, auto.message((lead.name as string) || null));
      if (res.ok) await touchLeadContacted(leadId);
    }
  } catch {
    // non-fatal
  }
}

/**
 * Push a lead to SM Click as a WhatsApp contact, once. Re-reads the lead so it
 * has the latest phone, skips when SM Click isn't configured, the lead has no
 * usable phone, or it was already synced. Records the returned contact id so we
 * never create a duplicate. NEVER throws — purely best-effort.
 */
export async function syncLeadToSmClick(leadId: string): Promise<void> {
  try {
    if (!smclickConfigured()) return;
    const db = supabaseAdmin();
    const { data: lead } = await db
      .from("leads")
      .select("id, name, phone, smclick_contact_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead || lead.smclick_contact_id) return;

    const telephone = normalizePhone(lead.phone as string | null);
    if (!telephone) return;

    const res = await createContact({
      name: (lead.name as string) || "—",
      telephone,
      tags: smclickDefaultTags(),
    });
    if (!res.ok) return;

    const contactId = extractContactId(res.data);
    await db
      .from("leads")
      .update({
        smclick_contact_id: contactId,
        smclick_synced_at: new Date().toISOString(),
      })
      .eq("id", leadId);
  } catch {
    // non-fatal
  }
}

export interface UpsertLeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  source: LeadSource;
  partnerId?: string | null;
  partnerName?: string | null;
  couponUseId?: string | null;
  clientEmailSequenceId?: string | null;
  space?: string | null;
  productName?: string | null;
  estimatedValue?: number | null;
}

/**
 * Create a lead, or merge into an existing one matched by (lowercased) email so
 * the same person arriving through multiple channels stays a single lead.
 *
 * NEVER throws: lead capture is a side-effect of the primary flow (creating an
 * orçamento / recording a coupon use) and must never break it. Returns the lead
 * id on success, or null if anything went wrong.
 */
export async function upsertLeadFromSource(input: UpsertLeadInput): Promise<string | null> {
  try {
    const db = supabaseAdmin();
    const email = input.email?.trim().toLowerCase() || null;

    // Match an existing lead by email (dedup across channels).
    let existing: { id: string } | null = null;
    if (email) {
      const { data } = await db
        .from("leads")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      existing = data ?? null;
    }

    if (existing) {
      // Enrich an existing lead with any newly-known fields. Only set keys we
      // actually have so we never blank out previously-captured data, and never
      // overwrite the human-managed `name`/`status`.
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.phone) patch.phone = input.phone;
      if (input.partnerId) patch.partner_id = input.partnerId;
      if (input.partnerName) patch.partner_name = input.partnerName;
      if (input.couponUseId) patch.coupon_use_id = input.couponUseId;
      if (input.clientEmailSequenceId) patch.client_email_sequence_id = input.clientEmailSequenceId;
      if (input.space) patch.space = input.space;
      if (input.productName) patch.product_name = input.productName;
      if (input.estimatedValue != null) patch.estimated_value = input.estimatedValue;

      await db.from("leads").update(patch).eq("id", existing.id);
      await syncLeadToSmClick(existing.id);
      return existing.id;
    }

    const { data: created } = await db
      .from("leads")
      .insert({
        name: input.name || "—",
        email,
        phone: input.phone ?? null,
        source: input.source,
        partner_id: input.partnerId ?? null,
        partner_name: input.partnerName ?? null,
        coupon_use_id: input.couponUseId ?? null,
        client_email_sequence_id: input.clientEmailSequenceId ?? null,
        space: input.space ?? null,
        product_name: input.productName ?? null,
        estimated_value: input.estimatedValue ?? null,
      })
      .select("id")
      .single();

    if (created?.id) await syncLeadToSmClick(created.id);
    return created?.id ?? null;
  } catch {
    return null; // non-fatal
  }
}

export interface WhatsAppLeadInput {
  smclickContactId: string;
  name?: string | null;
  phone?: string | null;
}

/**
 * Capture (or merge) a lead that originated from an inbound WhatsApp contact in
 * SM Click. WhatsApp contacts have no email, so dedup is by SM Click contact id
 * first, then by normalized phone — avoiding duplicates against a lead we may
 * have already pushed outbound. NEVER throws. Returns the lead id or null.
 */
export async function upsertLeadFromWhatsApp(input: WhatsAppLeadInput): Promise<string | null> {
  try {
    const db = supabaseAdmin();
    const phone = normalizePhone(input.phone) ?? (input.phone?.trim() || null);

    // 1) match by SM Click contact id (most reliable)
    let existing: { id: string } | null = null;
    if (input.smclickContactId) {
      const { data } = await db
        .from("leads")
        .select("id")
        .eq("smclick_contact_id", input.smclickContactId)
        .maybeSingle();
      existing = data ?? null;
    }
    // 2) fall back to phone match (links an inbound WA chat to an existing lead)
    if (!existing && phone) {
      const { data } = await db
        .from("leads")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      existing = data ?? null;
    }

    if (existing) {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        smclick_contact_id: input.smclickContactId,
        smclick_synced_at: new Date().toISOString(),
      };
      if (phone) patch.phone = phone;
      await db.from("leads").update(patch).eq("id", existing.id);
      return existing.id;
    }

    const { data: created } = await db
      .from("leads")
      .insert({
        name: input.name?.trim() || phone || "Contato WhatsApp",
        phone,
        source: "whatsapp",
        smclick_contact_id: input.smclickContactId,
        smclick_synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    return created?.id ?? null;
  } catch {
    return null; // non-fatal
  }
}
