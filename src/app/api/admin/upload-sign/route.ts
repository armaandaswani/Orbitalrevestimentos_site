import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

// Sanitize a filename: strip accents, replace unsafe chars with hyphens
function safeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/**
 * POST /api/admin/upload-sign
 * Body: { folder: string, filename: string, contentType: string }
 * Returns: { signedUrl, token, path, publicUrl }
 *
 * The client then uploads the raw file directly to Supabase via PUT signedUrl,
 * completely bypassing Next.js — no 4 MB limit.
 */
export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-auth") !== ADMIN_PW) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folder = "uploads", filename, contentType } = await req.json();

  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const path = `${folder}/${Date.now()}-${safeName(filename)}`;
  const sb = supabaseAdmin();

  const { data, error } = await sb.storage
    .from("site-images")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create signed URL" }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from("site-images").getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl: urlData.publicUrl,
  });
}
