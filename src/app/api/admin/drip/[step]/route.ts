import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ step: string }> }
) {
  const { step } = await params;
  const stepNumber = parseInt(step, 10);
  if (isNaN(stepNumber)) {
    return NextResponse.json({ error: "Invalid step number" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.subject !== undefined) update.subject = body.subject;
  if (body.body_html !== undefined) update.body_html = body.body_html;
  if ("delay_days" in body) update.delay_days = body.delay_days;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("email_campaign_steps")
    .update(update)
    .eq("step_number", stepNumber)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
