import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("coupon_uses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const updatePayload: Record<string, unknown> = {};
  if (body.sale_status !== undefined) updatePayload.sale_status = body.sale_status;
  if (body.next_followup_at !== undefined) updatePayload.next_followup_at = body.next_followup_at;
  if (body.partner_commission_paid_at !== undefined) updatePayload.partner_commission_paid_at = body.partner_commission_paid_at;
  if (body.rep_commission_paid_at !== undefined) updatePayload.rep_commission_paid_at = body.rep_commission_paid_at;

  // When concluding a sale, lock in sales_rep commission if not yet set
  if (body.sale_status === "concluido") {
    const { data: existing } = await db
      .from("coupon_uses")
      .select("sales_rep_referral_code, sales_rep_commission_owed, material_discounted")
      .eq("id", id)
      .single();

    if (
      existing?.sales_rep_referral_code &&
      existing.sales_rep_commission_owed == null &&
      existing.material_discounted != null
    ) {
      const { data: salesRep } = await db
        .from("sales_reps")
        .select("commission_type, commission_value")
        .eq("referral_code", existing.sales_rep_referral_code as string)
        .eq("status", "active")
        .maybeSingle();

      if (salesRep) {
        updatePayload.sales_rep_commission_owed =
          salesRep.commission_type === "percentage"
            ? (existing.material_discounted as number) * (salesRep.commission_value as number) / 100
            : (salesRep.commission_value as number);
      }
    }
  }

  const { data, error } = await db
    .from("coupon_uses")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send conclusion email to client and close their drip sequence
  if (body.sale_status === "concluido" || body.sale_status === "cancelado") {
    try {
      const db2 = supabaseAdmin();
      const { data: seq } = await db2
        .from("client_email_sequences")
        .select("*")
        .eq("coupon_use_id", id)
        .eq("status", "active")
        .maybeSingle();

      if (seq) {
        const { getResend } = await import("@/lib/resend");
        const { generateClientEmail } = await import("@/lib/client-email-content");
        const resend = getResend();
        const emailStep = body.sale_status === "concluido" ? 99 : 98;
        const { subject, html } = generateClientEmail(emailStep, {
          clientName: seq.client_name as string,
          space: seq.space as string | null,
          model: seq.model as string,
          plates: seq.plates as number,
          area: seq.area_m2 as number,
          total: seq.total as number,
          partnerName: seq.partner_name as string,
        });
        await resend.emails.send({
          from: "Orbital Revestimentos <orbitalrevestimentos@gmail.com>",
          to: seq.client_email as string,
          subject,
          html,
        });
        await db2
          .from("client_email_sequences")
          .update({
            status: body.sale_status === "concluido" ? "completed" : "cancelled",
            next_email_at: null,
          })
          .eq("id", seq.id as string);
      }
    } catch {
      // email failure is non-fatal
    }
  }

  return NextResponse.json(data);
}
