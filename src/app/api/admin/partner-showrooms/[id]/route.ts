import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizarInstagram, normalizarWhatsapp } from "@/lib/pontos-de-venda";
import { revalidarLugares } from "@/lib/revalidar-lugares";

export const runtime = "nodejs";

const TEXT_FIELDS = ["name", "address", "maps_url", "description", "logo_url", "cover_url"] as const;

// Migração 076: campos da página /onde-comprar (só fazem sentido nas revendas).
const NOVOS_TEXTOS = ["bairro", "horario"] as const;

/** Texto aparado; vazio ou qualquer outra coisa vira null. */
function textoOuNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** Número finito, ou null (também para texto vazio); `undefined` = inválido. */
function coordenada(v: unknown, limite: number): number | null | undefined {
  if (v === null || (typeof v === "string" && v.trim() === "")) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > limite) return undefined;
  return v;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    if (f in body) patch[f] = typeof body[f] === "string" && body[f] !== "" ? body[f] : f === "name" ? undefined : null;
  }
  if (patch.name === undefined) delete patch.name;
  if ("active" in body) patch.active = body.active !== false;
  // Migração 063: showroom parceiro ou ponto de revenda.
  if (body.kind === "showroom" || body.kind === "revenda") patch.kind = body.kind;
  if ("sort_order" in body) patch.sort_order = Number(body.sort_order) || 0;

  for (const f of NOVOS_TEXTOS) {
    if (f in body) patch[f] = textoOuNull(body[f]);
  }
  if ("whatsapp" in body) {
    const r = normalizarWhatsapp(typeof body.whatsapp === "string" ? body.whatsapp : "");
    if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: 400 });
    patch.whatsapp = r.valor;
  }
  if ("instagram" in body) {
    const bruto = typeof body.instagram === "string" ? body.instagram.trim() : "";
    const usuario = normalizarInstagram(bruto);
    if (bruto !== "" && usuario === null) {
      return NextResponse.json(
        { error: "Instagram inválido: use @usuario ou o link do perfil, por exemplo @orbital.revestimentos." },
        { status: 400 },
      );
    }
    patch.instagram = usuario;
  }
  for (const [campo, limite, rotulo] of [["lat", 90, "Latitude"], ["lng", 180, "Longitude"]] as const) {
    if (!(campo in body)) continue;
    const n = coordenada(body[campo], limite);
    if (n === undefined) {
      return NextResponse.json({ error: `${rotulo} inválida: use um número, por exemplo -3.0893.` }, { status: 400 });
    }
    patch[campo] = n;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const db = supabaseAdmin();
  const { data, error } = await db.from("partner_showrooms").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidarLugares();
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();

  // Apagar um parceiro não pode levar junto os ambientes cadastrados nele. Eles
  // voltam a ficar sem parceiro e entram para revisão — visíveis, não perdidos.
  const { data: orphans } = await db.from("project_photos").select("id").eq("showroom_id", id);
  const n = (orphans ?? []).length;
  if (n > 0) {
    await db.from("project_photos")
      .update({ showroom_id: null, needs_review: true, review_reason: "O showroom parceiro deste ambiente foi removido." })
      .eq("showroom_id", id);
  }

  const { error } = await db.from("partner_showrooms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidarLugares();
  return NextResponse.json({ ok: true, released: n });
}
