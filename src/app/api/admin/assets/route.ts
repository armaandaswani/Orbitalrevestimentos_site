import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { MANIFEST_PATH, MANIFEST_PUBLIC_URL } from "@/lib/assets";

const BUCKET = "site-images";

/** GET  /api/admin/assets — returns { [key]: url } manifest */
export async function GET() {
  try {
    const res = await fetch(MANIFEST_PUBLIC_URL, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({});
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({});
  }
}

/** POST /api/admin/assets — body: { key, url } — upserts one entry */
export async function POST(req: NextRequest) {
  try {
    const { key, url } = await req.json();
    if (!key || !url) return NextResponse.json({ error: "key and url required" }, { status: 400 });

    // Fetch existing manifest (or start empty)
    let manifest: Record<string, string> = {};
    try {
      const existing = await fetch(MANIFEST_PUBLIC_URL, { cache: "no-store" });
      if (existing.ok) manifest = await existing.json();
    } catch { /* first time — empty */ }

    manifest[key] = url;

    const sb = supabaseAdmin();
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    // Upload with upsert:true overwrites the existing manifest
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(MANIFEST_PATH, blob, { upsert: true, contentType: "application/json" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, manifest });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** DELETE /api/admin/assets — body: { key } — removes one entry (restores original) */
export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

    let manifest: Record<string, string> = {};
    try {
      const existing = await fetch(MANIFEST_PUBLIC_URL, { cache: "no-store" });
      if (existing.ok) manifest = await existing.json();
    } catch { /* empty */ }

    delete manifest[key];

    const sb = supabaseAdmin();
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(MANIFEST_PATH, blob, { upsert: true, contentType: "application/json" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, manifest });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
