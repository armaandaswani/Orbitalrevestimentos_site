import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";

function checkAuth(req: NextRequest): boolean {
  return isAdminRequest(req);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const sb = supabaseAdmin();

  // Auto sort_order: max existing + 1
  const { data: existing } = await sb
    .from("product_images")
    .select("sort_order")
    .eq("product_id", id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await sb
    .from("product_images")
    .insert({ product_id: id, image_path: body.image_path, sort_order: body.sort_order ?? nextOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
