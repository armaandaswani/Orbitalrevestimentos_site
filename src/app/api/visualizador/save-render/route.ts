import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, normalizePhone, sendImage, sendText } from "@/lib/smclick";
import { visualizadorRenderMessage, productEducationMessage, type VisualizadorItem } from "@/lib/smclick-messages";

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

// Best-effort: deliver the saved render to the client's WhatsApp via SM Click,
// exactly once. Sends two messages — (1) the render image with a caption that
// lists what they visualized, and (2) a product-education / qualification
// message. Reads the row for the latest image URL, the stored caption and the
// dedup stamp; records whatsapp_sent_at after the first message lands so we
// never double-send. Never throws.
async function maybeSendRenderWhatsapp(
  db: SupabaseClient,
  id: string,
  phoneRaw: string | null
): Promise<void> {
  try {
    if (!phoneRaw || !smclickConfigured()) return;
    const tel = normalizePhone(phoneRaw);
    if (!tel) return;

    const { data } = await db
      .from("visualizador_renders")
      .select("images, summary, whatsapp_sent_at")
      .eq("id", id)
      .maybeSingle();
    const row = data as { images?: StoredRender[]; summary?: string | null; whatsapp_sent_at?: string | null } | null;
    if (!row || row.whatsapp_sent_at) return; // missing or already sent

    const imgs = Array.isArray(row.images) ? row.images : [];
    const url = imgs[imgs.length - 1]?.url;
    if (!url) return;

    const caption =
      (row.summary && row.summary.trim()) ||
      visualizadorRenderMessage(imgs.map((i) => ({ local: i.local, productName: i.productName, productCode: i.productCode })));

    // Message 1 — the render. Image with caption; fall back to text + link.
    let r = await sendImage(tel, url, caption);
    if (!r.ok) r = await sendText(tel, `${caption}\n\n${url}`);
    if (!r.ok) {
      console.error("[save-render] whatsapp render send failed", r.error);
      return; // don't stamp/send msg 2 if the render itself didn't go out
    }
    await db.from("visualizador_renders").update({ whatsapp_sent_at: new Date().toISOString() }).eq("id", id);

    // Message 2 — product education / qualification (non-fatal if it fails).
    const edu = await sendText(tel, productEducationMessage());
    if (!edu.ok) console.error("[save-render] whatsapp education send failed", edu.error);
  } catch (e) {
    console.error("[save-render] whatsapp send error", e instanceof Error ? e.message : e);
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
    // All zones the client visualized, for the WhatsApp caption (multi-zone).
    items?: VisualizadorItem[];
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
    // Phone just arrived (standalone lead capture) — deliver the render now.
    if (phoneVal) await maybeSendRenderWhatsapp(db, id, phoneVal);
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
  // Store the caption describing what was visualized, so it's available when
  // the phone arrives later (standalone flow captures the lead after the save).
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 0) upsertPayload.summary = visualizadorRenderMessage(items);

  const { error: writeErr } = await db
    .from("visualizador_renders")
    .upsert(upsertPayload, { onConflict: "id" });

  if (writeErr) {
    console.error("[save-render] upsert failed", writeErr.message);
    return NextResponse.json({ error: "Falha ao registrar o render." }, { status: 500 });
  }

  // If the phone is already known (embedded flow, or a regenerate after lead
  // capture), deliver the render now; the dedup guard prevents double-sends.
  if (phoneVal) await maybeSendRenderWhatsapp(db, id, phoneVal);

  return NextResponse.json({ id, count: images.length });
}
