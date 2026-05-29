// Partner email templates for Orbital Revestimentos
// Two emails:
//   1. generatePartnerWelcomeEmail   — sent on partner registration/approval
//   2. generatePartnerSpecialTableEmail — sent when admin activates special pricing

const WA_PHONE = "5592988150149";
const PORTAL_URL = "https://orbitalrevestimentos.com.br/parceiro";

// ─── Shared helpers ──────────────────────────────────────────────────────────

function cta(label: string, url: string) {
  return `
<table cellpadding="0" cellspacing="0" style="margin:32px 0;">
  <tr>
    <td style="background:#002045;">
      <a href="${url}" style="display:inline-block;padding:17px 36px;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">${label}</a>
    </td>
  </tr>
</table>`;
}

function sectionLabel(text: string) {
  return `<p style="margin:36px 0 14px;color:#74777f;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-family:Arial,sans-serif;border-bottom:1px solid #e2e2e2;padding-bottom:12px;">${text}</p>`;
}

function wrap(preheader: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orbital Revestimentos</title>
</head>
<body style="margin:0;padding:0;background:#f0eeeb;">
<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f0eeeb;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eeeb;padding:40px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:580px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#002045;padding:30px 40px 28px;">
        <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">ORBITAL</p>
        <p style="margin:5px 0 0;color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-family:Arial,sans-serif;">Revestimentos · Manaus</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:44px 40px 40px;">${body}</td></tr>

      <!-- Logistics note -->
      <tr><td style="background:#002045;padding:14px 40px;">
        <p style="margin:0;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.04em;font-family:Arial,sans-serif;">
          <span style="color:rgba(255,255,255,0.3);margin-right:8px;">▸</span>Retirada em depósito · Sem opção de frete
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f5f5f3;padding:24px 40px;border-top:1px solid #e2e2e2;">
        <p style="margin:0;color:#74777f;font-size:11px;line-height:1.8;font-family:Arial,sans-serif;">
          Orbital Revestimentos · Manaus, Amazonas<br>
          Dúvidas? <a href="https://wa.me/${WA_PHONE}" style="color:#002045;text-decoration:underline;">WhatsApp (92) 98815-0149</a> · <a href="${PORTAL_URL}" style="color:#002045;text-decoration:underline;">Portal do parceiro</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─── Email 1 — Welcome ───────────────────────────────────────────────────────

export interface PartnerWelcomeParams {
  partnerName: string;
  couponCode: string;
  discountLabel: string;   // e.g. "10%" or "R$ 150"
  bonusLabel: string;      // e.g. "5% sobre o material" or "R$ 200 por venda"
  portalPassword?: string; // include initial credentials when set by admin
}

/** Format a commission/discount value into a human-readable label */
export function formatValueLabel(type: "percentage" | "fixed", value: number): string {
  if (type === "percentage") return `${value}%`;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function generatePartnerWelcomeEmail(p: PartnerWelcomeParams): { subject: string; html: string } {
  const first = p.partnerName.split(" ")[0];

  return {
    subject: `É um prazer tê-lo conosco, ${first}`,
    html: wrap(
      `Seu cadastro como parceiro Orbital foi aprovado. Veja tudo o que está disponível para você.`,
      `
<!-- Greeting -->
<p style="font-size:28px;color:#002045;font-weight:700;margin:0 0 4px;font-family:Georgia,serif;line-height:1.2;">É um prazer</p>
<p style="font-size:28px;color:#002045;font-weight:300;margin:0 0 28px;font-family:Georgia,serif;line-height:1.2;">tê-lo conosco, ${first}.</p>

<p style="color:#43474e;font-size:14px;line-height:1.85;margin:0 0 8px;font-family:Arial,sans-serif;">Seu cadastro como parceiro Orbital foi aprovado. A partir de agora, você tem acesso a todas as ferramentas do programa — e este e-mail reúne o essencial para começar.</p>

${sectionLabel("Seu cupom de desconto")}

<!-- Coupon block -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:0 0 12px;">
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-family:Arial,sans-serif;">Seu código exclusivo</p>
    <p style="margin:0 0 20px;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:0.28em;font-family:Arial,sans-serif;">${p.couponCode}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:50%;padding-right:12px;border-right:1px solid rgba(255,255,255,0.12);">
          <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Desconto para o cliente</p>
          <p style="margin:0;color:#a1d494;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${p.discountLabel}</p>
          <p style="margin:2px 0 0;color:rgba(255,255,255,0.35);font-size:10px;font-family:Arial,sans-serif;">sobre o material</p>
        </td>
        <td style="width:50%;padding-left:20px;">
          <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Sua bonificação prevista</p>
          <p style="margin:0;color:#a1d494;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${p.bonusLabel}</p>
          <p style="margin:2px 0 0;color:rgba(255,255,255,0.35);font-size:10px;font-family:Arial,sans-serif;">por venda concluída</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
${p.portalPassword ? `
<!-- Credentials block -->
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e2e2;margin:12px 0 16px;">
  <tr><td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
    <p style="margin:0 0 4px;color:#74777f;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Seu login</p>
    <p style="margin:0;color:#002045;font-size:14px;font-weight:700;letter-spacing:0.12em;font-family:Arial,sans-serif;">${p.couponCode}</p>
  </td></tr>
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 4px;color:#74777f;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">Senha inicial</p>
    <p style="margin:0;color:#002045;font-size:14px;font-weight:700;letter-spacing:0.08em;font-family:Arial,monospace;">${p.portalPassword}</p>
    <p style="margin:4px 0 0;color:#b0b0b0;font-size:10px;font-family:Arial,sans-serif;">Recomendamos alterar após o primeiro acesso.</p>
  </td></tr>
</table>
` : ""}
<p style="color:#74777f;font-size:12px;line-height:1.7;margin:0 0 8px;font-family:Arial,sans-serif;">Compartilhe seu cupom com clientes para aplicar o desconto automaticamente — ou use o simulador abaixo para gerar um link já configurado.</p>

${sectionLabel("O simulador de orçamento")}

<p style="color:#43474e;font-size:14px;line-height:1.85;margin:0 0 20px;font-family:Arial,sans-serif;">Acesse a aba <strong>Simular</strong> no seu portal para montar uma proposta visual completa em três passos: escolha o espaço, o acabamento e informe a área.</p>

<!-- Feature list -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  ${[
    ["Configure em 3 passos", "Espaço → Modelo → Dimensões. Nenhum detalhe dispensável, nenhum passo a mais."],
    ["Gere o link do cliente", "Ao final, um botão gera um link personalizado com todas as suas seleções. Envie por WhatsApp, e-mail ou mensagem — o cliente abre o link com tudo pré-configurado."],
    ["Cupom incluído automaticamente", `O cliente vê seu código ${p.couponCode} já aplicado. Ele só precisa preencher nome, e-mail e WhatsApp para receber o orçamento completo.`],
  ].map(([title, desc]) => `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="width:20px;padding-top:1px;vertical-align:top;">
          <div style="width:5px;height:5px;background:#3b6934;margin-top:5px;"></div>
        </td>
        <td>
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">${desc}</p>
        </td>
      </tr></table>
    </td>
  </tr>`).join("")}
</table>

${sectionLabel("Bonificação prevista")}

<p style="color:#43474e;font-size:14px;line-height:1.85;margin:0 0 20px;font-family:Arial,sans-serif;">Na aba <strong>Bonificações</strong> do portal, você acompanha em tempo real o histórico de simulações realizadas com seu cupom, o status de cada pedido e os valores de bonificação confirmados ou pendentes.</p>

<!-- Bonus info card -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;border-left:3px solid #3b6934;margin:0 0 20px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 6px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Como funciona</p>
    <p style="margin:0;color:#43474e;font-size:12px;line-height:1.75;font-family:Arial,sans-serif;">A bonificação é calculada sobre o valor do material com desconto, na venda de cada projeto. O status muda para <em>confirmado</em> quando a Orbital registra a venda como concluída. O pagamento é realizado conforme combinarmos diretamente.</p>
  </td></tr>
</table>

${sectionLabel("Acesse seu portal")}

<p style="color:#43474e;font-size:14px;line-height:1.85;margin:0 0 4px;font-family:Arial,sans-serif;">Tudo em um lugar: seu cupom, simulador, histórico de bonificações e configurações de conta.</p>

${cta("Acessar portal do parceiro", PORTAL_URL)}

<p style="color:#74777f;font-size:12px;line-height:1.7;margin:0;font-family:Arial,sans-serif;">Use o e-mail cadastrado e a senha definida no momento do registro. Em caso de dúvidas, o próprio portal oferece a opção de redefinir sua senha.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0 0;border-top:1px solid #e2e2e2;padding-top:28px;">
  <tr><td>
    <p style="margin:0 0 4px;color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Com apreço,</p>
    <p style="margin:0;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Orbital Revestimentos</p>
  </td></tr>
</table>
`
    ),
  };
}

// ─── Email 2 — Special Table Activation ─────────────────────────────────────

export interface PartnerSpecialTableParams {
  partnerName: string;
  couponCode: string;
}

export function generatePartnerSpecialTableEmail(p: PartnerSpecialTableParams): { subject: string; html: string } {
  const first = p.partnerName.split(" ")[0];

  const prices = [
    { linha: "Classic",    finish: "Mármore Fosco",       special: "R$ 399", public_: "R$ 559", savings: "R$ 160" },
    { linha: "Brilliance", finish: "Mármore Polido",      special: "R$ 429", public_: "R$ 589", savings: "R$ 160" },
    { linha: "Elegance",   finish: "Madeira Texturizada", special: "R$ 459", public_: "R$ 649", savings: "R$ 190" },
  ];

  return {
    subject: `${first}, sua tabela especial Orbital está ativa`,
    html: wrap(
      `Condições exclusivas de preço, disponíveis agora no seu portal.`,
      `
<!-- Badge -->
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
  <tr>
    <td style="background:#002045;padding:7px 14px;">
      <p style="margin:0;color:#a1d494;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">★ Acesso exclusivo</p>
    </td>
  </tr>
</table>

<!-- Greeting -->
<p style="font-size:28px;color:#002045;font-weight:700;margin:0 0 4px;font-family:Georgia,serif;line-height:1.2;">${first},</p>
<p style="font-size:28px;color:#002045;font-weight:300;margin:0 0 28px;font-family:Georgia,serif;line-height:1.2;">sua tabela especial está ativa.</p>

<p style="color:#43474e;font-size:14px;line-height:1.85;margin:0 0 8px;font-family:Arial,sans-serif;">A partir de agora, você tem acesso a condições de preço diferenciadas — reservadas para parceiros que trabalham com volume ou projetos recorrentes. Essas condições aparecem na nova aba <strong>Tabela Especial ★</strong> no seu portal.</p>

${sectionLabel("Preços exclusivos por linha")}

<!-- Price table -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #e2e2e2;">
  <tr style="background:#f5f5f3;">
    <td style="padding:12px 16px;color:#74777f;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">Linha</td>
    <td style="padding:12px 16px;color:#74777f;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;text-align:center;">Preço especial</td>
    <td style="padding:12px 16px;color:#74777f;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;text-align:center;">Preço público</td>
    <td style="padding:12px 16px;color:#74777f;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;text-align:right;">Diferença / placa</td>
  </tr>
  ${prices.map((row, i) => `
  <tr style="border-top:1px solid #e2e2e2;${i % 2 === 1 ? "background:#fafaf8;" : ""}">
    <td style="padding:16px 16px 14px;">
      <p style="margin:0 0 2px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${row.linha}</p>
      <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">${row.finish}</p>
    </td>
    <td style="padding:16px;text-align:center;">
      <p style="margin:0;color:#3b6934;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${row.special}</p>
      <p style="margin:2px 0 0;color:#74777f;font-size:10px;font-family:Arial,sans-serif;">por placa</p>
    </td>
    <td style="padding:16px;text-align:center;">
      <p style="margin:0;color:#b0b0b0;font-size:13px;text-decoration:line-through;font-family:Arial,sans-serif;">${row.public_}</p>
    </td>
    <td style="padding:16px;text-align:right;">
      <p style="margin:0;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${row.savings}</p>
    </td>
  </tr>`).join("")}
  <tr style="border-top:2px solid #e2e2e2;background:#f5f5f3;">
    <td colspan="4" style="padding:12px 16px;">
      <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">Cada placa cobre 3,48 m² · Dimensões: 2,9 m × 1,2 m × 5 mm</p>
    </td>
  </tr>
</table>

${sectionLabel("Como usar no portal")}

<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
  ${[
    ["Acesse a aba Tabela Especial ★", "Disponível no menu do seu portal logo após o login. A aba aparece apenas para parceiros com acesso especial."],
    ["Escolha a linha e o acabamento", "Selecione Classic, Brilliance ou Elegance e clique no acabamento desejado para a proposta."],
    ["Informe dimensões ou m²", "Insira largura × altura, a área em m² ou a quantidade de placas diretamente. O portal calcula o total com sua condição especial e mostra a diferença em relação ao preço público."],
    ["Formalize o pedido pelo WhatsApp", "Os preços especiais são para elaboração de propostas internas. Para confirmar um pedido com estas condições, entre em contato diretamente com a equipe Orbital. O material é retirado em depósito — sem opção de frete."],
  ].map(([title, desc], i) => `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="width:28px;padding-top:1px;vertical-align:top;">
          <div style="width:18px;height:18px;background:#002045;display:inline-block;">
            <p style="margin:0;text-align:center;color:#ffffff;font-size:10px;font-weight:700;line-height:18px;font-family:Arial,sans-serif;">${i + 1}</p>
          </div>
        </td>
        <td>
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">${desc}</p>
        </td>
      </tr></table>
    </td>
  </tr>`).join("")}
</table>

<!-- Important notice -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbea;border:1px solid #e6c84a;margin:0 0 28px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 6px;color:#7a5400;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">Uso interno</p>
    <p style="margin:0;color:#6b5000;font-size:12px;line-height:1.75;font-family:Arial,sans-serif;">Esta tabela destina-se à elaboração de propostas para os seus clientes. Os preços especiais são exclusivos para parceiros e não devem ser divulgados publicamente.</p>
  </td></tr>
</table>

${cta("Acessar portal do parceiro", PORTAL_URL)}

<table width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0 0;border-top:1px solid #e2e2e2;padding-top:28px;">
  <tr><td>
    <p style="margin:0 0 4px;color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Com apreço,</p>
    <p style="margin:0;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Orbital Revestimentos</p>
  </td></tr>
</table>
`
    ),
  };
}
