import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { generateClientEmailFromTemplate, DISABLED_STEPS, STEP_DELAYS_DAYS, TOTAL_STEPS } from "@/lib/client-email-content";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  // Fetch sequences that are active, due, and haven't completed all steps
  const { data: seqs, error } = await db
    .from("client_email_sequences")
    .select("*")
    .eq("status", "active")
    .lte("next_email_at", now);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pre-fetch all DB drip templates so we use admin-customised content when available
  const { data: dripTemplates } = await db
    .from("email_campaign_steps")
    .select("step_number, subject, body_html");
  const templateByStep: Record<number, { subject: string; body_html: string }> = {};
  for (const t of dripTemplates ?? []) templateByStep[t.step_number] = t;

  let sent = 0;
  let skipped = 0;
  const resend = getResend();

  for (const seq of seqs ?? []) {
    const nextStep = (seq.current_step as number) + 1;

    // If already past the last step, just mark complete
    if (nextStep > TOTAL_STEPS) {
      await db
        .from("client_email_sequences")
        .update({ status: "completed", next_email_at: null })
        .eq("id", seq.id);
      continue;
    }

    // Passo desligado: avança sem enviar nada. Fica ANTES de montar o e-mail
    // para não haver caminho em que ele seja gerado e disparado por engano.
    if (DISABLED_STEPS.has(nextStep)) {
      const skipDelay = STEP_DELAYS_DAYS[nextStep + 1];
      const isLastAfterSkip = nextStep >= TOTAL_STEPS;
      await db
        .from("client_email_sequences")
        .update({
          current_step: nextStep,
          next_email_at: !isLastAfterSkip && skipDelay
            ? new Date(Date.now() + skipDelay * 24 * 60 * 60 * 1000).toISOString()
            : null,
          status: isLastAfterSkip ? "completed" : "active",
        })
        .eq("id", seq.id);
      skipped++;
      continue;
    }

    try {
      const dbRow = templateByStep[nextStep] ?? null;
      const { subject, html } = await generateClientEmailFromTemplate(nextStep, {
        clientName: seq.client_name as string,
        space: seq.space as string | null,
        model: seq.model as string,
        plates: seq.plates as number,
        area: seq.area_m2 as number,
        total: seq.total as number,
        partnerName: seq.partner_name as string,
        hasCoupon: Boolean(seq.coupon_use_id),
      }, dbRow);

      await resend.emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: seq.client_email as string,
        subject,
        html,
      });

      // Schedule the step after this one
      const isLast = nextStep >= TOTAL_STEPS;
      const delayDays = STEP_DELAYS_DAYS[nextStep];
      const nextAt = !isLast && delayDays
        ? new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await db
        .from("client_email_sequences")
        .update({
          current_step: nextStep,
          next_email_at: nextAt,
          status: isLast ? "completed" : "active",
        })
        .eq("id", seq.id);

      sent++;
    } catch {
      // Log failure but continue with other sequences
    }
  }

  return NextResponse.json({ sent, skipped, checked: (seqs ?? []).length });
}
