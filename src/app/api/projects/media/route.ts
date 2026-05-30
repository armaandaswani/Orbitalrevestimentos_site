import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";
function checkAuth(req: NextRequest) {
  return req.headers.get("x-admin-auth") === ADMIN_PW;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const sb = supabaseAdmin();
  let query = sb.from("project_media").select("*").order("sort_order", { ascending: true });
  if (slug) query = query.eq("project_slug", slug);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("project_media").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
