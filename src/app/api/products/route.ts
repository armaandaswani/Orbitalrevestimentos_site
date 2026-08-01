import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
import { isMissingColumn } from "@/lib/db-compat";
import { SUPPORT_PRODUCT_SKUS } from "@/lib/orcamento-materials";

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
  // Public callers only see catalog-visible products. A support SKU (Cola PU /
  // ORB-PU) stays is_active=true so the orçamento engine still prices it (o motor
  // adiciona a cola automaticamente: ceil(1,5 × placas) tubos), mas NUNCA aparece
  // no catálogo público nem como "modelo" no simulador. Excluímos por:
  //   - show_in_catalog=false (mecanismo geral, quando a migração 046 rodar), e
  //   - código de produtos de suporte (ORB-PU, colas de contato, espuma) —
  //     garante o comportamento MESMO sem a migração, filtrando em JS.
  //     Admins (?all=true) veem tudo.
  if (includeInactive || !Array.isArray(data)) return NextResponse.json(data);

  const visible = (data as Array<Record<string, unknown>>).filter(
    (p) => p.show_in_catalog !== false && !(SUPPORT_PRODUCT_SKUS as readonly string[]).includes(String(p.code)));

  // Campos que NUNCA podem sair para o público: custo de compra e composição de
  // importação. O select "*" os trazia junto, e qualquer visitante conseguia ler
  // a margem de cada modelo. Em vez de lista de bloqueio, devolvemos só o que a
  // vitrine precisa — assim uma coluna nova de custo não vaza por esquecimento.
  const rows = visible.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    linha: p.linha,
    finish: p.finish,
    price: p.price,
    price_per_m2: p.price_per_m2,
    description: p.description,
    image_path: p.image_path,
    is_active: p.is_active,
    sort_order: p.sort_order,
    product_images: p.product_images,
    render_texture_path: p.render_texture_path,
    render_panel_width_m: p.render_panel_width_m,
    render_panel_height_m: p.render_panel_height_m,
    // Disponível para venda = em mãos menos o já reservado. É o número que o
    // simulador usa para avisar o cliente quando o pedido passa do estoque;
    // stock_on_hand/stock_reserved crus ficam de fora.
    available: Math.max(0, (Number(p.stock_on_hand) || 0) - (Number(p.stock_reserved) || 0)),
  }));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const sb = supabaseAdmin();
  let { data, error } = await sb.from("products").insert(body).select().single();
  // Retrocompat: coluna show_in_catalog (migração 046) ausente → retenta sem ela.
  if (isMissingColumn(error) && body && typeof body === "object" && "show_in_catalog" in body) {
    const { show_in_catalog: _omit, ...rest } = body as Record<string, unknown>;
    ({ data, error } = await sb.from("products").insert(rest).select().single());
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
