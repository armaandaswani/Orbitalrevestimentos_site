import { NextRequest, NextResponse } from "next/server";
import { partnerIdFromRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

/**
 * POST /api/comissoes/baixa — o representante ou o parceiro confirma que
 * RECEBEU uma comissão ("dar baixa"), ou desfaz a confirmação.
 *
 * Body: { coupon_use_id, received: boolean, party?: "partner" | "rep" }
 *
 * Quem é a pessoa sai do cookie assinado do portal — nunca do corpo. Só a
 * própria comissão, de venda concluída e não cancelada. Se a Orbital ainda não
 * tinha marcado "Pago", a baixa marca (com o mesmo horário) e anota isso
 * (marked_paid), para que desfazer desfaça só o que ela mesma marcou.
 */

const MIGRATION_HINT = "Recurso indisponível — rode a migração 062 (commission_receipts) no Supabase.";

type Use = Record<string, unknown> & {
  id: string;
  coupon_code: string | null;
  partner_id: string | null;
  sale_status: string | null;
  sales_rep_referral_code: string | null;
  partner_commission_paid_at: string | null;
  rep_commission_paid_at: string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { coupon_use_id?: unknown; received?: unknown; party?: unknown } | null;
  const useId = typeof body?.coupon_use_id === "string" ? body.coupon_use_id : "";
  if (!useId || typeof body?.received !== "boolean") {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const received = body.received;

  const repId = repIdFromRequest(req);
  const partnerId = partnerIdFromRequest(req);
  // As duas sessões podem coexistir no mesmo navegador: o portal diz qual usar.
  const party: "partner" | "rep" | null =
    body.party === "rep" && repId ? "rep"
      : body.party === "partner" && partnerId ? "partner"
        : repId ? "rep" : partnerId ? "partner" : null;
  if (!party) return NextResponse.json({ error: "Sessão expirada. Entre de novo no portal." }, { status: 401 });

  const db = supabaseAdmin();
  const { data: useRow } = await db.from("coupon_uses").select("*").eq("id", useId).maybeSingle();
  const use = useRow as Use | null;
  if (!use) return NextResponse.json({ error: "Comissão não encontrada." }, { status: 404 });

  // ── Dono da comissão ────────────────────────────────────────────────────────
  let code = "";
  if (party === "partner") {
    const { data: p } = await db.from("partners").select("id, coupon_code").eq("id", partnerId!).maybeSingle();
    code = String(p?.coupon_code ?? "").toUpperCase();
    const own = !!p && (use.partner_id === p.id || (!!code && String(use.coupon_code ?? "").toUpperCase() === code));
    if (!own) return NextResponse.json({ error: "Esta comissão não é sua." }, { status: 403 });
    if (use.partner_commission_cancelled_at) return NextResponse.json({ error: "Comissão cancelada." }, { status: 409 });
  } else {
    const { data: r } = await db.from("sales_reps").select("id, referral_code").eq("id", repId!).maybeSingle();
    code = String(r?.referral_code ?? "").toUpperCase();
    let own = !!r && !!code && String(use.sales_rep_referral_code ?? "").toUpperCase() === code;
    if (!own && r) {
      const { data: rows } = await db
        .from("coupon_use_commissions")
        .select("id")
        .eq("coupon_use_id", useId)
        .eq("sales_rep_referral_code", code)
        .limit(1);
      own = (rows ?? []).length > 0;
    }
    if (!own) return NextResponse.json({ error: "Esta comissão não é sua." }, { status: 403 });
    if (use.rep_commission_cancelled_at) return NextResponse.json({ error: "Comissão cancelada." }, { status: 409 });
  }
  if (use.sale_status !== "concluido") {
    return NextResponse.json({ error: "Só dá para dar baixa em venda concluída." }, { status: 409 });
  }

  const paidField = party === "partner" ? "partner_commission_paid_at" : "rep_commission_paid_at";
  const pedidoPaidField = party === "partner" ? "partner_commission_paid_at" : "sales_rep_commission_paid_at";
  // O campo único de "Pago" do representante em coupon_uses é do representante
  // principal da venda; outros representantes só registram o próprio recebimento.
  const ownsPaidField = party === "partner" || String(use.sales_rep_referral_code ?? "").toUpperCase() === code;

  const { data: existing, error: exErr } = await db
    .from("commission_receipts")
    .select("id, received_at, marked_paid")
    .eq("coupon_use_id", useId)
    .eq("party", party)
    .eq("party_code", code)
    .maybeSingle();
  if (exErr && isMissingTable(exErr)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });

  if (received) {
    if (existing) return NextResponse.json({ ok: true, received_at: existing.received_at });
    const now = new Date().toISOString();
    let markedPaid = false;
    if (ownsPaidField && !use[paidField]) {
      const { error } = await db.from("coupon_uses").update({ [paidField]: now }).eq("id", useId).is(paidField, null);
      markedPaid = !error;
    }
    // Pedido vinculado (comissão nascida de um pedido): mesmo "Pago" lá.
    {
      let q = db.from("pedidos").update({ [pedidoPaidField]: now }).eq("coupon_use_id", useId).is(pedidoPaidField, null);
      if (party === "rep") q = q.eq("sales_rep_id", repId!);
      const { error } = await q;
      // Desfazer só limpa campos com exatamente este horário, então marcar aqui é seguro.
      if (!error) markedPaid = true;
    }
    const { error } = await db
      .from("commission_receipts")
      .insert({ coupon_use_id: useId, party, party_code: code, received_at: now, marked_paid: markedPaid });
    if (error && isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, received_at: now });
  }

  // Desfazer
  if (!existing) return NextResponse.json({ ok: true, received_at: null });
  if (existing.marked_paid) {
    // Só volta o "Pago" que a própria baixa marcou (mesmo horário exato).
    await db.from("coupon_uses").update({ [paidField]: null }).eq("id", useId).eq(paidField, existing.received_at);
    let q = db.from("pedidos").update({ [pedidoPaidField]: null }).eq("coupon_use_id", useId).eq(pedidoPaidField, existing.received_at);
    if (party === "rep") q = q.eq("sales_rep_id", repId!);
    await q;
  }
  const { error } = await db.from("commission_receipts").delete().eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, received_at: null });
}
