import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { generateClientEmailFromTemplate } from "@/lib/client-email-content";

// sale_status → (conclusion email step, terminal drip status)
const TERMINAL: Record<string, { step: number; dripStatus: string }> = {
  concluido: { step: 99, dripStatus: "completed" },
  cancelado: { step: 98, dripStatus: "cancelled" },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();

  // Read the current row first so we can detect a *transition* into a terminal
  // sale_status (and stay idempotent against repeated PATCHes).
  const { data: prev } = await db
    .from("client_email_sequences")
    .select("*")
    .eq("id", id)
    .single();

  const newStatus: string | null = body.sale_status ?? null;
  const terminal = newStatus ? TERMINAL[newStatus] : undefined;
  const isNewTransition = !!terminal && prev?.sale_status !== newStatus;

  // Build the update. When entering concluido/cancelado we also stop the drip
  // so the cron no longer fires steps 2–7.
  const updatePayload: Record<string, unknown> = { sale_status: newStatus };
  if (isNewTransition) {
    updatePayload.status = terminal!.dripStatus;
    updatePayload.next_email_at = null;
  }

  const { data, error } = await db
    .from("client_email_sequences")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send the conclusion email (step 99 = concluído, step 98 = cancelado).
  // Non-fatal: the status change already persisted above.
  if (isNewTransition && data?.client_email) {
    try {
      const { data: tpl } = await db
        .from("email_campaign_steps")
        .select("subject, body_html")
        .eq("step_number", terminal!.step)
        .maybeSingle();

      const { subject, html } = await generateClientEmailFromTemplate(
        terminal!.step,
        {
          clientName: data.client_name as string,
          space: data.space as string | null,
          model: data.model as string,
          plates: data.plates as number,
          area: data.area_m2 as number,
          total: data.total as number,
          partnerName: data.partner_name as string,
        },
        tpl ?? null
      );

      await getResend().emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: data.client_email as string,
        subject,
        html,
      });
    } catch {
      // email failure is non-fatal — the sale_status change is already saved
    }
  }

  return NextResponse.json(data);
}
