import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId } = await params;
  const sb = supabaseAdmin();
  const { error } = await sb.from("product_images").delete().eq("id", imageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId } = await params;
  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("product_images")
    .update({ sort_order: body.sort_order })
    .eq("id", imageId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
