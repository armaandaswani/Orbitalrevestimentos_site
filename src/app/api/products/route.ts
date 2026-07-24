import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
import { isMissingColumn } from "@/lib/db-compat";

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
  //   - código de produtos de suporte (ORB-PU) — garante o comportamento MESMO
  //     sem a migração, filtrando em JS. Admins (?all=true) veem tudo.
  const SUPPORT_SKUS = ["ORB-PU"];
  const rows = !includeInactive && Array.isArray(data)
    ? (data as Array<{ show_in_catalog?: boolean; code?: string }>).filter(
        (p) => p.show_in_catalog !== false && !SUPPORT_SKUS.includes(String(p.code)))
    : data;
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
