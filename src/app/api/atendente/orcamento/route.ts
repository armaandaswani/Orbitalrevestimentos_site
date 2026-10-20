import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { computeOrcamento, QUOTE_VALIDITY_DAYS } from "@/lib/orcamento-pricing";
import { fetchColaPrice, fetchMaterialPrices, freteValueForCep, loadOrcamentoConfig } from "@/lib/orcamento-server";
import { panelGrid } from "@/lib/render-prompt";
import { isMissingColumn } from "@/lib/db-compat";

/**
 * Quotes drafted by the WhatsApp assistant (Ste), in TRAINING mode: they land in the Pedidos tab marked
 * ai_generated (hidden unless the "Gerados pela IA" filter is on), the owner approves them, and the AI
 * deletes them when the client loses interest. Numbers come from the SAME engine as the site/admin
 * (computeOrcamento + panelGrid), never re-implemented here.
 *
 * Auth: Authorization: Bearer <ATENDENTE_API_TOKEN> (the token the site already shares with the assistant).
 *   POST   { client_name, client_phone, ai_contact, product_code | product_name, spaces: [{ label, width, height, type }], cep?, city? }
 *   GET    → AI quotes (id, ai_contact, ai_status, created_at)
 *   DELETE ?id=…  → removes an AI quote (never a manual one)
 */

const PLATE_W = 1.2;
const PLATE_H = 2.9;
const PLATE_M2 = 3.48;

function authorized(req: NextRequest): boolean {
  const token = process.env.ATENDENTE_API_TOKEN;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !given || token.length !== given.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(given));
}

type SpaceIn = { label?: string; width?: number; height?: number; type?: string };

/**
 * Plates for one surface.
 * - Wall: by WIDTH (fewer seams) — the simulator's grid (panelGrid, 1,20 × 2,90 m).
 * - Ceiling/forro: by m² in general, but a small area goes by width (owner's rule): both are computed and the
 *   larger wins. Ex.: 3,88 × 1,80 → m² 2, width 3,2 → 3 placas.
 */
function platesFor(s: SpaceIn): { plates: number; how: string } {
  const w = Number(s.width) || 0;
  const h = Number(s.height) || 0;
  const type = String(s.type ?? "parede").toLowerCase();
  if (w <= 0 || h <= 0) return { plates: 0, how: "medidas incompletas" };
  if (type === "teto" || type === "forro") {
    const byArea = Math.max(1, Math.round((w * h) / PLATE_M2));
    const byWidth = Math.max(1, Math.round(w / PLATE_W));
    const plates = Math.max(byArea, byWidth);
    return { plates, how: `teto ${w} × ${h} m: por m² ${((w * h) / PLATE_M2).toFixed(1)} → ${byArea}; por largura ${(w / PLATE_W).toFixed(1)} → ${byWidth}; usado ${plates}` };
  }
  const g = panelGrid(w, h, PLATE_W, PLATE_H);
  return { plates: g.count, how: `parede ${w} × ${h} m: ${g.cols} colunas por largura${g.extraPanels ? ` + ${g.extraPanels} para a altura` : ""} = ${g.count}` };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  const db = supabaseAdmin();

  // The model, by code (ORB-010) or name ("Carvalho Natural").
  const code = String(body.product_code ?? "").trim().toUpperCase();
  const name = String(body.product_name ?? "").trim();
  let q = db.from("products").select("id, code, name, price, linha, is_active").eq("is_active", true);
  q = code ? q.eq("code", code) : q.ilike("name", name);
  const { data: product } = await q.maybeSingle();
  if (!product) return NextResponse.json({ error: `Modelo não encontrado: ${code || name}` }, { status: 404 });

  const spacesIn = (Array.isArray(body.spaces) ? body.spaces : []) as SpaceIn[];
  const spaces = spacesIn.map((s) => ({ ...s, ...platesFor(s) })).filter((s) => s.plates > 0);
  if (!spaces.length) return NextResponse.json({ error: "Sem medidas válidas." }, { status: 400 });
  const plates = spaces.reduce((a, s) => a + s.plates, 0);
  const pricePerPlate = Number(product.price) || 0;

  const { colaUnitPrice, colaAvailable } = await fetchColaPrice(db);
  const { config, materialsConfig } = await loadOrcamentoConfig(db);
  const { prices, stock, names, units } = await fetchMaterialPrices(db);
  const freteZoneValue = await freteValueForCep(db, (body.cep as string | undefined) ?? null);
  const breakdown = computeOrcamento(
    {
      plates, pricePerPlate, colaUnitPrice, colaAvailable, freteZoneValue,
      spaces: spaces.map((s) => ({ applicationType: (["teto", "forro"].includes(String(s.type)) ? s.type : "parede") as "parede" | "teto" | "forro", panels: s.plates })),
      materialPrices: prices, materialStock: stock, materialNames: names, materialUnits: units, materialsConfig,
    },
    config,
  );

  const validUntil = new Date(Date.now() + QUOTE_VALIDITY_DAYS * 86400_000).toISOString().slice(0, 10);
  const pix = breakdown.paymentOptions.find((o) => o.id === "pix");
  const card = breakdown.paymentOptions.find((o) => o.id === "cartao");
  const payload: Record<string, unknown> = {
    client_name: String(body.client_name ?? "").trim() || "Cliente do WhatsApp",
    client_phone: body.client_phone ? String(body.client_phone) : null,
    client_city: body.city ? String(body.city) : null,
    client_zip: body.cep ? String(body.cep) : null,
    product_name: product.name,
    space: spaces.map((s) => `${s.label || s.type || "parede"} ${s.width}×${s.height} m`).join("; "),
    area_m2: Math.round(spaces.reduce((a, s) => a + (Number(s.width) || 0) * (Number(s.height) || 0), 0) * 100) / 100,
    total: breakdown.totalFull,
    freight_amount: breakdown.frete.value,
    status: "em_producao",
    payment_status: "pendente",
    payment_methods: ["Pix", "Cartão"],
    payment_terms: [
      pix ? `Pix: R$ ${pix.total.toFixed(2)}${pix.discountPct ? ` (${pix.discountPct}% de desconto)` : ""}` : null,
      card?.installments ? `Cartão: até ${card.installments}x de R$ ${card.installmentValue?.toFixed(2)} sem juros` : null,
    ].filter(Boolean).join(" · ") || null,
    quote_valid_until: validUntil,
    notes: `Gerado pela IA (Ste) para aprovação.\n${spaces.map((s) => s.how).join("\n")}`,
    price_tier: "varejo",
    ai_generated: true,
    ai_contact: body.ai_contact ? String(body.ai_contact) : null,
    ai_status: "aguardando_aprovacao",
  };

  const { data: pedido, error } = await db.from("pedidos").insert(payload).select("id").single();
  if (error) {
    if (isMissingColumn(error))
      return NextResponse.json({ error: "Rode a migração 069 (pedidos.ai_generated) antes de usar os orçamentos da IA." }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Lines: the model's plates + installation materials, so the quote sheet shows everything.
  try {
    const rows: Record<string, unknown>[] = [
      { pedido_id: pedido.id, product_id: product.id, product_name: product.name, plates, unit_price: pricePerPlate, unit_label: "placa" },
    ];
    const codes = breakdown.materials.filter((m) => m.quantity > 0).map((m) => m.code);
    if (codes.length) {
      const { data: mats } = await db.from("products").select("id, code, name").in("code", codes);
      for (const m of breakdown.materials.filter((x) => x.quantity > 0)) {
        const p = (mats ?? []).find((x) => x.code === m.code);
        if (p) rows.push({ pedido_id: pedido.id, product_id: p.id, product_name: m.name, plates: m.quantity, unit_price: m.unitPrice, unit_label: m.unit });
      }
    }
    await db.from("pedido_items").insert(rows);
  } catch { /* items table missing: the order still has its total */ }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://orbitalrevestimentos.com.br").replace(/\/+$/, "");
  return NextResponse.json({
    id: pedido.id,
    product: { code: product.code, name: product.name, pricePerPlate },
    spaces: spaces.map((s) => ({ label: s.label, width: s.width, height: s.height, type: s.type ?? "parede", plates: s.plates, how: s.how })),
    plates,
    breakdown: {
      platesSubtotal: breakdown.platesSubtotal,
      materials: breakdown.materials.map((m) => ({ name: m.name, quantity: m.quantity, unit: m.unit, total: m.total })),
      frete: breakdown.frete,
      totalFull: breakdown.totalFull,
      totalAVista: breakdown.totalAVista,
      paymentOptions: breakdown.paymentOptions,
      warnings: [...breakdown.warnings, ...breakdown.adminWarnings],
    },
    validUntil,
    documentUrl: `${site}/admin/pedidos/${pedido.id}/documento?tipo=orcamento`,
  });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("pedidos")
    .select("id, ai_contact, ai_status, client_name, created_at")
    .eq("ai_generated", true)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const db = supabaseAdmin();
  // Only AI quotes, never a manual order.
  const { data } = await db.from("pedidos").select("id").eq("id", id).eq("ai_generated", true).maybeSingle();
  if (!data) return NextResponse.json({ error: "não é um orçamento da IA" }, { status: 404 });
  await db.from("pedido_items").delete().eq("pedido_id", id);
  const { error } = await db.from("pedidos").delete().eq("id", id).eq("ai_generated", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
