import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: allUses },
    { data: todayUses },
    { data: weekUses },
    { data: monthUses },
    { data: partners },
    { data: recentActivity },
  ] = await Promise.all([
    db.from("coupon_uses").select("material_total, material_discounted, sale_status, product_name, commission_owed, partner_commission_paid_at"),
    db.from("coupon_uses").select("id, material_discounted").gte("created_at", startOfToday),
    db.from("coupon_uses").select("id, material_discounted").gte("created_at", startOfWeek),
    db.from("coupon_uses").select("id, material_discounted, sale_status").gte("created_at", startOfMonth),
    db.from("partners").select("id, status"),
    db.from("coupon_uses")
      .select("id, architect_name, product_name, space, material_discounted, sale_status, created_at, coupon_code")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const uses = allUses ?? [];
  const totalOrcamentos = uses.length;
  const totalValor = uses.reduce((s, u) => s + (u.material_discounted ?? u.material_total ?? 0), 0);
  const concluidos = uses.filter((u) => u.sale_status === "concluido").length;
  const emOrcamento = uses.filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null).length;
  const cancelados = uses.filter((u) => u.sale_status === "cancelado").length;
  const conversionRate = totalOrcamentos > 0 ? Math.round((concluidos / totalOrcamentos) * 100) : 0;

  const comissaoPendente = uses
    .filter((u) => u.sale_status === "concluido" && !u.partner_commission_paid_at)
    .reduce((s, u) => s + (u.commission_owed ?? 0), 0);

  // Top products
  const productCounts: Record<string, number> = {};
  for (const u of uses) {
    if (u.product_name) productCounts[u.product_name] = (productCounts[u.product_name] ?? 0) + 1;
  }
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Monthly trend (last 6 months)
  const monthlyMap: Record<string, { count: number; valor: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { count: 0, valor: 0 };
  }
  for (const u of uses) {
    const key = (u as Record<string, unknown>).created_at
      ? String((u as Record<string, unknown>).created_at).slice(0, 7)
      : "";
    if (key && monthlyMap[key]) {
      monthlyMap[key].count++;
      monthlyMap[key].valor += ((u as Record<string, unknown>).material_discounted ?? (u as Record<string, unknown>).material_total ?? 0) as number;
    }
  }

  return NextResponse.json({
    totalOrcamentos,
    totalValor,
    concluidos,
    emOrcamento,
    cancelados,
    conversionRate,
    comissaoPendente,
    hoje: { count: (todayUses ?? []).length, valor: (todayUses ?? []).reduce((s, u) => s + (u.material_discounted ?? 0), 0) },
    semana: { count: (weekUses ?? []).length, valor: (weekUses ?? []).reduce((s, u) => s + (u.material_discounted ?? 0), 0) },
    mes: {
      count: (monthUses ?? []).length,
      valor: (monthUses ?? []).reduce((s, u) => s + (u.material_discounted ?? 0), 0),
      concluidos: (monthUses ?? []).filter((u) => u.sale_status === "concluido").length,
    },
    parceirosAtivos: (partners ?? []).filter((p) => p.status === "active").length,
    parceirosPendentes: (partners ?? []).filter((p) => p.status === "pending").length,
    topProducts,
    monthlyTrend: Object.entries(monthlyMap).map(([month, d]) => ({ month, ...d })),
    recentActivity: recentActivity ?? [],
  });
}
