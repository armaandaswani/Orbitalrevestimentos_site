import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { repIdFromRequest } from "@/lib/admin-auth";
import { gerarCupomParceiro } from "@/lib/partner-coupon";
import {
  CONVITE_COMISSAO_PADRAO,
  CONVITE_DESCONTO_PADRAO,
  CONVITE_VALIDADE_DIAS,
  enviarConvite,
} from "@/lib/partner-invite";

/**
 * POST /api/representante/partners/convite — a representante cadastra um
 * parceiro novo (nome, e-mail, WhatsApp) e o sistema manda o convite.
 *
 * Body: { name, email, phone, profession? }
 * Se o e-mail já é de um convite pendente desta representante, reenvia.
 */
export async function POST(req: NextRequest) {
  const repId = repIdFromRequest(req);
  if (!repId) return NextResponse.json({ error: "Sessão expirada. Entre de novo no portal." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = String(body?.phone ?? "").trim();
  const profession = String(body?.profession ?? "").trim() || null;

  if (name.length < 2) return NextResponse.json({ error: "Informe o nome do parceiro." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Informe o WhatsApp com DDD." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: rep } = await db
    .from("sales_reps")
    .select("id, name, referral_code, status")
    .eq("id", repId)
    .maybeSingle();
  if (!rep || rep.status !== "active") return NextResponse.json({ error: "Representante inativo." }, { status: 403 });
  const repCode = String(rep.referral_code ?? "").toUpperCase() || null;

  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + CONVITE_VALIDADE_DIAS * 24 * 60 * 60 * 1000).toISOString();

  // E-mail já cadastrado?
  // ilike para ignorar maiúsculas; "_" e "%" escapados (são curingas no ilike).
  const emailLike = email.replace(/[\\%_]/g, "\\$&");
  const [{ data: existing }, { data: existingRep }] = await Promise.all([
    db.from("partners").select("id, name, status, is_self_registered, sales_rep_referral_code").ilike("email", emailLike).limit(1).maybeSingle(),
    db.from("sales_reps").select("id").ilike("email", emailLike).limit(1).maybeSingle(),
  ]);
  if (existingRep) return NextResponse.json({ error: "Este e-mail é de um representante." }, { status: 409 });

  let partnerId: string;
  let reenviado = false;
  if (existing) {
    const meu = String(existing.sales_rep_referral_code ?? "").toUpperCase() === repCode;
    if (existing.status === "pending" && !existing.is_self_registered && meu) {
      // Convite pendente desta representante → reenvia com link novo.
      await db.from("partners").update({ reset_token: token, reset_token_expires_at: expiresAt }).eq("id", existing.id);
      partnerId = existing.id as string;
      reenviado = true;
    } else {
      return NextResponse.json(
        {
          error: meu
            ? `${existing.name} já é seu parceiro — escolha na lista.`
            : "Este e-mail já está cadastrado como parceiro. Fale com a Orbital para vincular.",
          partner_id: meu ? existing.id : undefined,
        },
        { status: 409 }
      );
    }
  } else {
    const couponCode = await gerarCupomParceiro(db, name);
    const { data: partner, error } = await db
      .from("partners")
      .insert({
        name,
        email,
        phone,
        profession,
        coupon_code: couponCode,
        status: "pending",
        is_self_registered: false,
        discount_type: "percentage",
        discount_value: CONVITE_DESCONTO_PADRAO,
        commission_type: "percentage",
        commission_value: CONVITE_COMISSAO_PADRAO,
        sales_rep_referral_code: repCode,
        reset_token: token,
        reset_token_expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error || !partner) return NextResponse.json({ error: error?.message || "Erro ao cadastrar." }, { status: 500 });
    partnerId = partner.id as string;

    // Vínculo com a representante (comissão e "Meus parceiros").
    const { error: linkError } = await db.from("partner_sales_reps").insert({ partner_id: partnerId, sales_rep_id: repId });
    if (!linkError || linkError.code === "23505") {
      await db
        .from("rep_partner_crm")
        .insert({ partner_id: partnerId, sales_rep_id: repId, first_contact_at: new Date().toISOString() })
        .then(() => {}, () => {});
    }
  }

  const enviado = await enviarConvite({ nome: name, email, phone, repNome: (rep.name as string) || null, token });
  return NextResponse.json({ ok: true, partner_id: partnerId, name, reenviado, enviado });
}
