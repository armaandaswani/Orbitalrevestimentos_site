import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("client_email_sequences")
    .update({ sale_status: body.sale_status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
