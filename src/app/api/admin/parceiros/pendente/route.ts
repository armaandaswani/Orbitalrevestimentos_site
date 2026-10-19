import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { gerarCupomParceiro } from "@/lib/partner-coupon";
import { CONVITE_COMISSAO_PADRAO, CONVITE_DESCONTO_PADRAO, linkCadastroWhatsapp, linkConvite, novoTokenConvite } from "@/lib/partner-invite";

/**
 * POST /api/admin/parceiros/pendente — arquiteto (ou outro profissional) que
 * ainda não tem cadastro, informado direto no pedido.
 *
 * Body: { name, phone?, profession? }
 * Cria o parceiro como "Cadastro pendente" (status pending, sem senha), com
 * cupom e comissão padrão, e devolve o link de cadastro: a pessoa só completa
 * e-mail, aniversário e senha. Sem representante — quem cadastrou foi a Orbital.
 * Se já existe parceiro com o mesmo nome, devolve 409 com o id para usar.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");
  const phone = String(body?.phone ?? "").trim() || null;
  const profession = String(body?.profession ?? "").trim() || "Arquiteto e Urbanista";
  if (name.length < 2) return NextResponse.json({ error: "Informe o nome do arquiteto." }, { status: 400 });

  const db = supabaseAdmin();
  const nomeLike = name.replace(/[\\%_]/g, "\\$&");
  const { data: mesmo } = await db.from("partners").select("id, name").ilike("name", nomeLike).limit(1).maybeSingle();
  if (mesmo) {
    return NextResponse.json({ error: `${mesmo.name} já está cadastrado — escolha na lista.`, partner_id: mesmo.id }, { status: 409 });
  }

  const { token, expiresAt } = novoTokenConvite();
  const couponCode = await gerarCupomParceiro(db, name);
  const { data: partner, error } = await db
    .from("partners")
    .insert({
      name,
      email: null,
      phone,
      profession,
      coupon_code: couponCode,
      status: "pending",
      is_self_registered: false,
      discount_type: "percentage",
      discount_value: CONVITE_DESCONTO_PADRAO,
      commission_type: "percentage",
      commission_value: CONVITE_COMISSAO_PADRAO,
      reset_token: token,
      reset_token_expires_at: expiresAt,
    })
    .select("id, name, coupon_code, commission_type, commission_value, status, phone")
    .single();
  if (error || !partner) {
    // partners.email ainda obrigatório no banco → migration 068.
    if (error?.code === "23502") {
      return NextResponse.json({ error: "Rode a migration 068 no Supabase (e-mail opcional para cadastro pendente)." }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || "Não foi possível cadastrar." }, { status: 500 });
  }

  const link = linkConvite(token);
  return NextResponse.json({
    partner: { ...partner, has_portal_password: false, partner_sales_reps: [] },
    link,
    whatsapp_text: linkCadastroWhatsapp(name, link),
  }, { status: 201 });
}
