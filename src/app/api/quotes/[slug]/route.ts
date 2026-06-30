import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("saved_quotes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

  // Surface the referring partner's WhatsApp so a client who returns to this
  // link later (not just right after the quote was made) can still reach the
  // person handling their project/installation — not just generic Orbital
  // support. Best-effort: a missing/inactive partner just omits the contact.
  let partnerPhone: string | null = null;
  const partnerId = (data as { partner_id?: string | null }).partner_id;
  if (partnerId) {
    const { data: partner } = await db.from("partners").select("phone").eq("id", partnerId).maybeSingle();
    partnerPhone = (partner?.phone as string | null) ?? null;
  }

  return NextResponse.json({ ...data, partner_phone: partnerPhone });
}
