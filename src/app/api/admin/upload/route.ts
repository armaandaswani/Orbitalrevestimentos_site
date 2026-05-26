import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-auth") !== ADMIN_PW) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const folder = (formData.get("folder") as string) || "uploads";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Sanitize filename: remove accents, replace spaces/special chars with hyphens
  const safeName = file.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-zA-Z0-9._-]/g, "-") // replace anything else with hyphen
    .replace(/-+/g, "-") // collapse consecutive hyphens
    .toLowerCase();

  const path = `${folder}/${Date.now()}-${safeName}`;

  const sb = supabaseAdmin();
  const { error } = await sb.storage
    .from("site-images")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from("site-images").getPublicUrl(path);
  return NextResponse.json({ url: urlData.publicUrl });
}
