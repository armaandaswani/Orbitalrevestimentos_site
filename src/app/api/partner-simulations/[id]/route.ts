import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// DELETE /api/partner-simulations/[id]?partner_id=<uuid>
// partner_id is required so a partner can only delete their own simulations.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const partnerId = req.nextUrl.searchParams.get("partner_id");

  if (!partnerId) return NextResponse.json({ error: "partner_id required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("partner_simulations")
    .delete()
    .eq("id", id)
    .eq("partner_id", partnerId); // scoped to this partner only

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
