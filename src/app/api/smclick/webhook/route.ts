import { NextRequest, NextResponse } from "next/server";
import { upsertLeadFromWhatsApp, touchLeadContacted } from "@/lib/leads";

/**
 * Inbound SM Click webhook receiver.
 *
 * Register this URL in the SM Click panel (Webhooks), appending the shared
 * secret as a query param so only SM Click can post here:
 *   https://orbitalrevestimentos.com.br/api/smclick/webhook?secret=YOUR_SECRET
 * Configure SMCLICK_WEBHOOK_SECRET to the same value. If the env var is unset,
 * the endpoint accepts unauthenticated posts (dev only).
 *
 * Events that carry a contact (new-contact, new-chat, new-chat-message) create
 * or merge a `whatsapp`-source lead in the CRM, so people who message the
 * business on WhatsApp are captured automatically. Always returns 200 quickly
 * so SM Click doesn't retry on our processing errors.
 */

interface SmClickContact {
  id?: string;
  name?: string | null;
  telephone?: string | null;
}

function extractContact(body: Record<string, unknown>): SmClickContact | null {
  const infos = body.infos as Record<string, unknown> | undefined;
  if (!infos) return null;
  if (infos.contact && typeof infos.contact === "object") {
    return infos.contact as SmClickContact;
  }
  const chat = infos.chat as Record<string, unknown> | undefined;
  if (chat?.contact && typeof chat.contact === "object") {
    return chat.contact as SmClickContact;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SMCLICK_WEBHOOK_SECRET;
  if (secret) {
    const provided =
      new URL(req.url).searchParams.get("secret") ||
      req.headers.get("x-webhook-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: true, ignored: "invalid-body" });
  }

  const event = String((body as Record<string, unknown>).event || "");
  const CONTACT_EVENTS = new Set(["new-contact", "new-chat", "new-chat-message"]);

  if (CONTACT_EVENTS.has(event)) {
    const contact = extractContact(body as Record<string, unknown>);
    if (contact?.id) {
      const leadId = await upsertLeadFromWhatsApp({
        smclickContactId: String(contact.id),
        name: contact.name ?? null,
        phone: contact.telephone ?? null,
      });
      // Feature 7: an inbound message is a contact too — record it so the CRM's
      // "Último contato" reflects the latest conversation activity.
      if (leadId && event === "new-chat-message") await touchLeadContacted(leadId);
    }
  }

  // Acknowledge everything (including events we don't act on) so SM Click
  // considers delivery successful.
  return NextResponse.json({ ok: true, event });
}
