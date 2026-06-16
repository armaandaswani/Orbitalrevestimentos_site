import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/visualizador/save-render — public, best-effort.
//
// Two modes:
//   1. Image upload (body.image present): upload to Storage, append to images[]
//      in visualizador_renders, optionally store name+phone.
//   2. Contact-only update (no body.image): update name+phone on an existing
//      row identified by body.id. Used when the render was already auto-saved
//      and the client just collected lead info.

export const maxDuration = 30;

const BUCKET = "site-images";
const FOLDER = "visualizador-renders";

interface StoredRender {
  url: string;
  local: string | null;
  productName: string | null;
  productCode: string | null;
}

function parseDataUrl(input: string): { buf: Buffer; ext: string; mime: string } | null {
  const m = input.match(/^data:(image\/([a-zA-Z0-9.+-]+));base64,([\s\S]+)$/);
  if (!m) return null;
  const mime = m[1];
  const ext = (m[2] || "png").toLowerCase().replace("jpeg", "jpg");
  try {
    return { buf: Buffer.from(m[3], "base64"), ext, mime };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: {
    id?: string;
    image?: string;
    local?: string;
    productName?: string;
    productCode?: string;
    name?: string;
    phone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const nameVal = body.name?.trim() || null;
  const phoneVal = body.phone?.trim() || null;

  // ── Contact-only update (no image) ─────────────────────────────────────────
  if (!body.image) {
    const id = body.id?.trim();
    if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
    if (!nameVal && !phoneVal) return NextResponse.json({ error: "Nenhum dado." }, { status: 400 });

    const patch: Record<string, string | null> = {};
    if (nameVal) patch.name = nameVal;
    if (phoneVal) patch.phone = phoneVal;

    const { error } = await db.from("visualizador_renders").update(patch).eq("id", id);
    if (error) console.error("[save-render] contact update failed", error.message);
    return NextResponse.json({ id });
  }

  // ── Image upload ────────────────────────────────────────────────────────────
  const parsed = parseDataUrl(body.image);
  if (!parsed) return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });

  const id = typeof body.id === "string" && body.id.length > 0 ? body.id : randomUUID();

  const path = `${FOLDER}/${id}/${Date.now()}.${parsed.ext}`;
  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(path, parsed.buf, { contentType: parsed.mime, upsert: true });
  if (upErr) {
    console.error("[save-render] upload failed", { path, error: upErr.message });
    return NextResponse.json({ error: "Falha ao salvar a imagem." }, { status: 502 });
  }
  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);

  const entry: StoredRender = {
    url: urlData.publicUrl,
    local: body.local?.trim() || null,
    productName: body.productName?.trim() || null,
    productCode: body.productCode?.trim() || null,
  };

  const { data: existing } = await db
    .from("visualizador_renders")
    .select("images")
    .eq("id", id)
    .maybeSingle();

  const prior = Array.isArray((existing as { images?: unknown } | null)?.images)
    ? (existing as { images: StoredRender[] }).images
    : [];
  const images = [...prior, entry];

  const upsertPayload: Record<string, unknown> = { id, images };
  if (nameVal) upsertPayload.name = nameVal;
  if (phoneVal) upsertPayload.phone = phoneVal;

  const { error: writeErr } = await db
    .from("visualizador_renders")
    .upsert(upsertPayload, { onConflict: "id" });

  if (writeErr) {
    console.error("[save-render] upsert failed", writeErr.message);
    return NextResponse.json({ error: "Falha ao registrar o render." }, { status: 500 });
  }

  return NextResponse.json({ id, count: images.length });
}
