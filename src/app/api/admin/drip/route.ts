import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { DRIP_STEPS } from "@/lib/drip-steps";

// ─── Default templates ───────────────────────────────────────────────────────

/** E-mails transacionais — disparados por mudança de status, fora da régua. */
const TRANSACTIONAL_STEPS = [
  {
    step_number: 99,
    delay_days: null,
    description: "Enviado ao concluir (venda fechada)",
    subject: "Bem-vindo à família Orbital, {{firstName}}!",
    body_html: `
<p style="font-size:26px;color:#002045;font-weight:700;margin:0 0 6px;font-family:Arial,sans-serif;">{{firstName}},</p>
<p style="font-size:26px;color:#002045;font-weight:300;margin:0 0 24px;font-family:Arial,sans-serif;">você fez a escolha certa.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Estamos muito felizes em recebê-lo como cliente Orbital. Seu projeto para {{spaceLabel}} com os painéis <strong>{{model}} · {{finish}}</strong> vai ficar extraordinário — e você vai entender exatamente o porquê quando vir o resultado final.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9eb;border-left:3px solid #3b6934;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#3b6934;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">O que acontece agora:</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">1.</strong> Um consultor Orbital vai confirmar todos os detalhes do pedido com você</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">2.</strong> Verificação de disponibilidade de estoque e prazo estimado</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">3.</strong> Agendamento da retirada ou logística no depósito Orbital</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">4.</strong> Instalação — podemos indicar profissionais parceiros em Manaus</p>
  </td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 12px;color:#002045;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">Cuidado simples que preserva seus painéis por décadas:</p>
    <p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· Pano úmido com detergente neutro — semanal</p>
    <p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· Sem produtos abrasivos, ácidos ou solventes</p>
    <p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· Nenhuma manutenção especial necessária além da limpeza regular</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Qualquer dúvida durante o processo — instalação, logística, especificações — fale com um consultor Orbital:</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Falar com um consultor</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;font-style:italic;">Obrigado por escolher a Orbital, {{firstName}}. Cada painel que instalamos é um projeto em que acreditamos.</p>
`,
  },
  {
    step_number: 98,
    delay_days: null,
    description: "Enviado ao cancelar",
    subject: "Obrigado por considerar a Orbital, {{firstName}}",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Obrigado, {{firstName}}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Sabemos que o momento certo para um projeto nem sempre é agora — e isso é completamente válido. Ficamos felizes que você tenha dedicado tempo para conhecer os painéis Orbital e simular um orçamento para {{spaceLabel}}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Não vamos te mandar mais mensagens sobre este projeto. Mas queremos deixar uma coisa registrada:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">O que fica guardado para você:</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· Modelo {{model}} · {{finish}}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· {{plates}} painel(is) · {{area}} de {{spaceLabel}}</p>
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· Referência: {{total}}</p>
    <p style="margin:0;color:rgba(255,255,255,0.55);font-size:12px;font-family:Arial,sans-serif;line-height:1.6;">Quando o momento chegar — seja em semanas ou meses — nossa equipe estará disponível para retomar exatamente de onde paramos. Sem precisar recalcular tudo do zero.</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Nenhuma pressão, nenhum julgamento. Quando estiver pronto, é só falar.</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Falar com um consultor quando estiver pronto</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Esta é a última mensagem que enviaremos sobre este orçamento. Obrigado pela atenção — foi um prazer.</p>
`,
  },
];

// O conteúdo dos 7 passos vive em @/lib/drip-steps — mesma fonte que o envio
// usa. Aqui ficam só os dois e-mails transacionais (venda concluída/encerrada),
// que não fazem parte da régua.
const DEFAULT_STEPS = [...DRIP_STEPS, ...TRANSACTIONAL_STEPS];

// ─── Route handlers ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("email_campaign_steps")
    .select("*")
    .order("step_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== "seed") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("email_campaign_steps")
    .upsert(
      DEFAULT_STEPS.map((s) => ({ ...s, updated_at: new Date().toISOString() })),
      { onConflict: "step_number" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ seeded: DEFAULT_STEPS.length });
}
