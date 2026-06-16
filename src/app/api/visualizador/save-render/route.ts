import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/visualizador/save-render — public.
//
// Called from the Visualizador the moment the client clicks "Prosseguir para o
// simulador". Persists ONE generated render per request (Vercel caps request
// bodies at ~4.5MB and a render is ~2MB, so the client uploads them one at a
// time, threading the returned `id`). The renders are later e-mailed +
// WhatsApp'd to the client and the Orbital team when the orçamento is submitted
// in the Simulador, and shown in the admin Clientes tab.
//
// Best-effort: the Visualizador navigates to the Simulador regardless of the
// result, so a failure here only means the renders won't be attached.

export const maxDuration = 30;

const BUCKET = "site-images";
const FOLDER = "visualizador-renders";

interface StoredRender {
  url: string;
  local: string | null;
  productName: string | null;
  productCode: string | null;
}

// Parse a data URL into a Buffer + extension. Returns null for anything that
// isn't an inline base64 image we can store.
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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!body.image) {
    return NextResponse.json({ error: "Nenhuma imagem para salvar." }, { status: 400 });
  }
  const parsed = parseDataUrl(body.image);
  if (!parsed) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }

  // Reuse the id the client already holds (so multiple renders land in one row),
  // or mint a new session id on the first upload.
  const id = typeof body.id === "string" && body.id.length > 0 ? body.id : randomUUID();
  const db = supabaseAdmin();

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

  // Append to the existing session row, or create it. Read-modify-write is safe
  // here because the client uploads renders sequentially.
  const { data: existing } = await db
    .from("visualizador_renders")
    .select("images")
    .eq("id", id)
    .maybeSingle();

  const prior = Array.isArray((existing as { images?: unknown } | null)?.images)
    ? ((existing as { images: StoredRender[] }).images)
    : [];
  const images = [...prior, entry];

  const { error: writeErr } = await db
    .from("visualizador_renders")
    .upsert({ id, images }, { onConflict: "id" });

  if (writeErr) {
    console.error("[save-render] upsert failed", writeErr.message);
    return NextResponse.json({ error: "Falha ao registrar o render." }, { status: 500 });
  }

  return NextResponse.json({ id, count: images.length });
}
