import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { generateClientEmail, STEP_DELAYS_DAYS } from "@/lib/client-email-content";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    coupon_use_id, client_name, client_email,
    space, model, plates, area_m2, total, partner_name,
  } = body;

  if (!coupon_use_id || !client_name || !client_email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Next email at: step 2 scheduled in STEP_DELAYS_DAYS[1] days
  const delayDays = STEP_DELAYS_DAYS[1] ?? 3;
  const nextEmailAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: seq, error } = await db
    .from("client_email_sequences")
    .insert({
      coupon_use_id,
      client_name,
      client_email,
      space: space || null,
      model,
      plates,
      area_m2,
      total,
      partner_name,
      current_step: 1,
      next_email_at: nextEmailAt,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send step 1 immediately (non-fatal)
  try {
    const resend = getResend();
    const { subject, html } = generateClientEmail(1, {
      clientName: client_name as string,
      space: space as string | null,
      model: model as string,
      plates: plates as number,
      area: area_m2 as number,
      total: total as number,
      partnerName: partner_name as string,
    });
    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: client_email as string,
      subject,
      html,
    });
  } catch {
    // email failure is non-fatal — sequence record already created
  }

  return NextResponse.json(seq, { status: 201 });
}
