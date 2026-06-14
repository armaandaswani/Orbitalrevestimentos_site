import { supabaseAdmin } from "@/lib/supabase";
import {
  smclickConfigured,
  createContact,
  extractContactId,
  normalizePhone,
  smclickDefaultTags,
} from "@/lib/smclick";

export type LeadSource = "website" | "partner" | "manual" | "whatsapp";

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
