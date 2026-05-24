import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { generateClientEmail, STEP_DELAYS_DAYS, TOTAL_STEPS } from "@/lib/client-email-content";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  let sent = 0;
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

    try {
      const { subject, html } = generateClientEmail(nextStep, {
        clientName: seq.client_name as string,
        space: seq.space as string | null,
        model: seq.model as string,
        plates: seq.plates as number,
        area: seq.area_m2 as number,
        total: seq.total as number,
        partnerName: seq.partner_name as string,
      });

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

  return NextResponse.json({ sent, checked: (seqs ?? []).length });
}
