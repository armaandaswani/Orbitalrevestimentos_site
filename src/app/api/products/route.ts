import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";

function checkAuth(req: NextRequest): boolean {
  return isAdminRequest(req);
}

export async function GET(req: NextRequest) {
  const sb = supabaseAdmin();
  // Public callers get only active products. The admin can pass ?all=true to
  // also see inactive ones (so they can manage/reactivate them) — gated on the
  // admin session so the public site never exposes inactive products.
  const includeInactive = new URL(req.url).searchParams.get("all") === "true" && isAdminRequest(req);

  let query = sb
    .from("products")
    .select("*, product_images(id, image_path, sort_order)")
    .order("sort_order", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("products")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
