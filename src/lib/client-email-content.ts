// Client drip email sequence for Orbital Revestimentos
// 7 emails over 3 weeks + 2 conclusion emails
//
// Schedule:
//   Step 1 → immediate
//   Step 2 → Day 3
//   Step 3 → Day 5
//   Step 4 → Day 9
//   Step 5 → Day 12
//   Step 6 → Day 16
//   Step 7 → Day 19
//
// Special steps:
//   Step 99 → sent when sale_status = 'concluido'
//   Step 98 → sent when sale_status = 'cancelado'

const WA_PHONE = "5592988150149";

// Days to wait before sending the NEXT step (indexed by current step)
export const STEP_DELAYS_DAYS: Record<number, number> = {
  1: 3,  // after step 1, wait 3 days → step 2 on Day 3
  2: 2,  // after step 2, wait 2 days → step 3 on Day 5
  3: 4,  // after step 3, wait 4 days → step 4 on Day 9
  4: 3,  // after step 4, wait 3 days → step 5 on Day 12
  5: 4,  // after step 5, wait 4 days → step 6 on Day 16
  6: 3,  // after step 6, wait 3 days → step 7 on Day 19
};

export const TOTAL_STEPS = 7;

export interface EmailParams {
  clientName: string;
  space: string | null;
  model: string;        // Classic | Brilliance | Elegance
  plates: number;
  area: number;         // m²
  total: number;        // BRL
  partnerName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtArea(n: number) {
  return n.toFixed(2).replace(".", ",");
}

const FINISH: Record<string, string> = {
  Classic: "Mármore Fosco",
  Brilliance: "Mármore Polido",
  Elegance: "Madeira Texturizada",
};

function waLink(clientName: string, partnerName: string, model: string, plates: number) {
  const msg = `Olá! Sou ${clientName.split(" ")[0]}, recebi um orçamento Orbital pelo parceiro ${partnerName} e tenho interesse. Modelo: ${model}, ${plates} placas.`;
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
}

function cta(label: string, url: string) {
  return `
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="${url}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">${label}</a>
    </td>
  </tr>
</table>`;
}

function quoteCard(p: EmailParams) {
  const finish = FINISH[p.model] || p.model;
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">SEU ORÇAMENTO</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${p.space ? `<tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:8px;font-family:Arial,sans-serif;">Ambiente</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:8px;font-family:Arial,sans-serif;">${p.space}</td></tr>` : ""}
      <tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:8px;font-family:Arial,sans-serif;">Modelo</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:8px;font-family:Arial,sans-serif;">${p.model} · ${finish}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:8px;font-family:Arial,sans-serif;">Quantidade</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:8px;font-family:Arial,sans-serif;">${p.plates} placa${p.plates !== 1 ? "s" : ""}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:16px;font-family:Arial,sans-serif;">Área coberta</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:16px;font-family:Arial,sans-serif;">${fmtArea(p.area)} m²</td></tr>
      <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.12);padding-top:16px;"></td></tr>
      <tr><td style="color:#ffffff;font-size:15px;font-weight:700;font-family:Arial,sans-serif;padding-top:4px;">Total do material</td><td style="color:#ffffff;font-size:22px;font-weight:700;text-align:right;font-family:Arial,sans-serif;padding-top:4px;">${fmtBRL(p.total)}</td></tr>
    </table>
  </td></tr>
</table>`;
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
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f0eeeb;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eeeb;padding:40px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:580px;width:100%;">
      <!-- Header -->
      <tr><td style="background:#002045;padding:28px 36px;">
        <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">ORBITAL</p>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Revestimentos · Manaus</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:40px 36px;">${body}</td></tr>
      <!-- Footer -->
      <tr><td style="background:#f5f5f3;padding:24px 36px;border-top:1px solid #e2e2e2;">
        <p style="margin:0;color:#74777f;font-size:11px;line-height:1.7;font-family:Arial,sans-serif;">
          Orbital Revestimentos · Manaus, Amazonas<br>
          Dúvidas? <a href="https://wa.me/${WA_PHONE}" style="color:#002045;text-decoration:underline;">WhatsApp (92) 98815-0149</a><br>
          <span style="color:#b0b0b0;">Você recebe esta mensagem porque solicitou um orçamento Orbital.</span>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─── Email generators ────────────────────────────────────────────────────────

export function generateClientEmail(
  step: number,
  p: EmailParams
): { subject: string; html: string } {
  const first = p.clientName.split(" ")[0];
  const spaceLabel = p.space || "seu espaço";
  const finish = FINISH[p.model] || p.model;
  const wa = waLink(p.clientName, p.partnerName, p.model, p.plates);
  const partnerFirst = p.partnerName.split(" ")[0];

  // ── STEP 1 — Immediate confirmation ────────────────────────────────────────
  if (step === 1) {
    return {
      subject: `Seu orçamento Orbital está pronto, ${first}`,
      html: wrap(
        `${first}, aqui estão todos os detalhes da sua simulação com os painéis Orbital.`,
        `
<p style="font-size:26px;color:#002045;font-weight:700;margin:0 0 6px;font-family:Arial,sans-serif;">${first},</p>
<p style="font-size:26px;color:#002045;font-weight:300;margin:0 0 24px;font-family:Arial,sans-serif;">seu orçamento está pronto.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">${partnerFirst} preparou esta simulação especialmente para ${spaceLabel}. Abaixo estão todos os detalhes do seu projeto com os painéis <strong>${p.model}</strong> em acabamento ${finish}:</p>
${quoteCard(p)}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:20px 0 12px;font-family:Arial,sans-serif;">Nos próximos dias vamos te enviar mais informações sobre o que torna a Orbital diferente de tudo o que você já viu em revestimentos — incluindo os detalhes técnicos que fazem toda a diferença em um projeto.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Qualquer dúvida, fale diretamente com ${partnerFirst}:</p>
${cta(`Falar com ${partnerFirst}`, wa)}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Este orçamento foi preparado com base na sua simulação e pode ser ajustado a qualquer momento. Os preços são válidos conforme disponibilidade de estoque.</p>
`
      ),
    };
  }

  // ── STEP 2 — Day 3: O que há por trás de cada painel ──────────────────────
  if (step === 2) {
    return {
      subject: `${first}, o que ninguém te conta sobre revestimentos`,
      html: wrap(
        `Por que os painéis Orbital são radicalmente diferentes do que você já viu.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Existe um motivo pelo qual arquitetos escolhem Orbital.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Olá, ${first}. Há alguns dias você simulou um orçamento para ${spaceLabel}. Antes de você decidir — queremos que você entenda exatamente o que está comprando.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">A maioria dos revestimentos no mercado mede entre 60×60cm e 90×90cm. Os painéis Orbital medem <strong>2,9m × 1,2m</strong>. Isso não é apenas um número diferente — é uma experiência completamente diferente.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  ${[
    ["Muito menos emendas", `Cada painel Orbital cobre ${fmtArea(3.48)} m². Um painel convencional de 60×60 cobre 0,36 m². Isso significa até 10× menos rejuntamento — e um visual infinitamente mais limpo.`],
    ["Acabamento " + finish, `O modelo ${p.model} foi desenvolvido para ambientes que recusam o ordinário. Resistente a impactos, fácil de limpar, e com uma estética que não envelhece com tendências.`],
    ["5mm de espessura", "Calculada para fixação perfeita e resistência ao uso intenso ao longo de décadas — sem o risco de fissuras e descolamentos comuns em materiais mais finos."],
    ["Instalação mais rápida", "Menos peças para assentar = menos tempo de obra, menos argamassa, menos desgaste no seu projeto. O que levaria semanas pode ser feito em dias."],
  ].map(([title, desc]) => `
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${desc}</p>
  </td></tr>`).join("")}
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">O modelo <strong>${p.model}</strong> que você simulou cobre <strong>${fmtArea(p.area)} m²</strong> de ${spaceLabel} com apenas ${p.plates} painel${p.plates !== 1 ? "is" : ""}. Isso é um ambiente inteiro, transformado.</p>
${cta("Ver catálogo completo", "https://orbitalrevestimentos.com.br/produtos")}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Tem alguma dúvida técnica? <a href="${wa}" style="color:#002045;text-decoration:underline;">Fale com ${partnerFirst} pelo WhatsApp.</a></p>
`
      ),
    };
  }

  // ── STEP 3 — Day 5: Visualização do espaço ────────────────────────────────
  if (step === 3) {
    return {
      subject: `Imagine ${spaceLabel} assim, ${first}`,
      html: wrap(
        `Fechou os olhos e visualizou? É mais poderoso do que você imagina.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Feche os olhos por um segundo, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Imagine entrar em ${spaceLabel} e se deparar com ${fmtArea(p.area)} m² de painéis ${p.model} no acabamento ${finish}. Superfícies amplas sem interrupção. Um visual que faz o ambiente parecer maior, mais sofisticado, mais <em>intencional</em>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#002045;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">O que muda visualmente em ${spaceLabel}:</p>
    ${[
      ["Continuidade visual", "Sem quebras a cada 60cm. O olho percorre o ambiente sem interrupção — é a diferença entre um espaço comum e um espaço projetado."],
      ["Percepção de amplitude", "Painéis grandes criam a ilusão óptica de mais espaço. Mesmo ambientes menores parecem maiores com esse formato."],
      ["Personalidade própria", "O acabamento " + finish + " traz profundidade e textura que revestimentos convencionais simplesmente não conseguem replicar."],
      ["Facilidade de limpeza", "Menos rejunte significa muito menos acúmulo de umidade, mofo e sujeira. Manutenção de minutos, não de horas."],
    ].map(([title, desc]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="4" style="background:#002045;"></td>
        <td style="padding:0 0 0 16px;">
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">${desc}</p>
        </td>
      </tr>
    </table>`).join("")}
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Quer ver esses painéis ao vivo antes de decidir? Nosso showroom em Manaus está disponível — ${partnerFirst} pode agendar um horário conveniente para você.</p>
${cta(`Agendar visita com ${partnerFirst}`, wa)}
`
      ),
    };
  }

  // ── STEP 4 — Day 9: O investimento que se justifica ───────────────────────
  if (step === 4) {
    const perM2 = p.area > 0 ? p.total / p.area : 0;
    const per20years = p.total / (20 * 12 * 30); // cost per day over 20 years
    return {
      subject: `${first}, veja o que ${fmtBRL(p.total)} realmente compra`,
      html: wrap(
        `Um número diferente quando você muda a perspectiva.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">${first}, vamos falar sobre o investimento.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Seu orçamento ficou em <strong>${fmtBRL(p.total)}</strong>. Antes de tomar uma decisão, vale colocar esse número em perspectiva — porque quando você faz a conta certa, o número muda completamente.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td width="48%" style="background:#f0f9eb;border-left:3px solid #3b6934;padding:20px 20px;">
      <p style="margin:0 0 4px;color:#3b6934;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Custo por m²</p>
      <p style="margin:0;color:#002045;font-size:26px;font-weight:700;font-family:Arial,sans-serif;">${fmtBRL(perM2)}</p>
      <p style="margin:4px 0 0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">Para ${fmtArea(p.area)} m² de ${spaceLabel}</p>
    </td>
    <td width="4%"></td>
    <td width="48%" style="background:#eef2f8;border-left:3px solid #002045;padding:20px 20px;">
      <p style="margin:0 0 4px;color:#002045;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Custo por dia*</p>
      <p style="margin:0;color:#002045;font-size:26px;font-weight:700;font-family:Arial,sans-serif;">${fmtBRL(Math.ceil(per20years))}</p>
      <p style="margin:4px 0 0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">*Dividido por 20 anos de uso</p>
    </td>
  </tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">Revestimentos convencionais de qualidade custam entre R$ 80 e R$ 250/m² — e exigem trocas em 8 a 12 anos. Os painéis Orbital, com a manutenção adequada, duram a vida útil do imóvel.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Essa não é uma despesa de decoração. É uma decisão de infraestrutura — que você vai olhar todos os dias por décadas.</p>
${quoteCard(p)}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Pronto para garantir este orçamento? ${partnerFirst} está disponível:</p>
${cta(`Confirmar com ${partnerFirst}`, wa)}
`
      ),
    };
  }

  // ── STEP 5 — Day 12: Excelência técnica + durabilidade ────────────────────
  if (step === 5) {
    return {
      subject: `${first}, o que acontece com os painéis Orbital em 10 anos?`,
      html: wrap(
        `A resposta vai mudar como você pensa em revestimentos.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">O teste do tempo, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Existe uma pergunta que poucos fazem antes de reformar: <em>"Como isso vai parecer em 10 anos?"</em></p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Com revestimentos convencionais, a resposta costuma ser: rejunte escurecido, peças descoladas, padrão fora de moda. Com os painéis Orbital — a resposta é diferente.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  ${[
    ["Superfície sem rejunte excessivo", "Menos rejunte = menos ponto de entrada para umidade, mofo e deterioração. A superfície se mantém limpa e intacta por muito mais tempo."],
    ["Acabamento " + finish + " que não oxida", "O processo de fabricação garante que a textura e a cor do modelo " + p.model + " se mantenham estáveis — sem amarelamento, sem desbotamento, sem perda de brilho."],
    ["Resistência a impactos cotidianos", "5mm de espessura com material de alta densidade. Os painéis suportam o uso intenso de ambientes residenciais e comerciais sem fissurar."],
    ["Instalação que não faz concessões", "Quando instalado corretamente, o sistema de fixação dos painéis Orbital é permanente. Não há recalque, não há ondulação, não há descolamento com o tempo."],
  ].map(([title, desc]) => `
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${desc}</p>
  </td></tr>`).join("")}
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbea;border:1px solid #e6c84a;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 8px;color:#6b5000;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Manutenção simples que preserva tudo:</p>
    ${["Pano úmido com detergente neutro — semanal", "Evitar produtos abrasivos e ácidos", "Nenhuma selagem periódica necessária", "Sem retoques, pintura ou rejuntamento no futuro"].map(i => `<p style="margin:0 0 6px;color:#6b5000;font-size:13px;font-family:Arial,sans-serif;">· ${i}</p>`).join("")}
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Seu orçamento de <strong>${fmtBRL(p.total)}</strong> para ${spaceLabel} ainda está disponível. Fale com ${partnerFirst}:</p>
${cta(`Falar com ${partnerFirst}`, wa)}
`
      ),
    };
  }

  // ── STEP 6 — Day 16: O custo de não agir ──────────────────────────────────
  if (step === 6) {
    return {
      subject: `${first}, uma pergunta honesta sobre ${spaceLabel}`,
      html: wrap(
        `Às vezes o maior custo é não fazer nada — e ninguém fala sobre isso.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Uma pergunta honesta, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Já faz mais de duas semanas desde que você simulou o orçamento para ${spaceLabel}. E queremos te fazer uma pergunta direta:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:300;line-height:1.6;font-family:Arial,sans-serif;text-align:center;font-style:italic;">"Se eu não fizer isso agora, quando vou fazer?"</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">Reformas e projetos de revestimento são daquelas decisões que ficam na gaveta por meses — às vezes anos. E cada mês que passa, ${spaceLabel} continua como está. Não transformado. Não do jeito que você imaginou.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Não estamos aqui para criar pressão artificial. Estamos aqui para lembrar que você já tomou 80% da decisão quando fez a simulação. Você escolheu o modelo. Você calculou a área. Você viu o número.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">O que fica para trás se você adiar mais:</p>
    ${[
      "Cada mês que passa, " + spaceLabel + " permanece como está — não do jeito que você quer",
      "Disponibilidade de estoque não é garantida indefinidamente",
      "Projetos de obra têm janelas de oportunidade — coordenar agora é mais fácil",
      "A transformação que você imaginou continua sendo apenas imaginação",
    ].map(i => `<p style="margin:0 0 8px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">→ ${i}</p>`).join("")}
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Se estiver pronto para dar o próximo passo — ou se ainda tiver alguma dúvida — fale com ${partnerFirst}. Sem pressão, só clareza.</p>
${cta(`Falar com ${partnerFirst} agora`, wa)}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Seu orçamento: <strong>${fmtBRL(p.total)}</strong> · ${p.plates} painel${p.plates !== 1 ? "is" : ""} ${p.model} · ${fmtArea(p.area)} m²</p>
`
      ),
    };
  }

  // ── STEP 7 — Day 19: Última mensagem ──────────────────────────────────────
  if (step === 7) {
    return {
      subject: `Esta é nossa última mensagem, ${first}`,
      html: wrap(
        `Respeitamos o seu tempo e a sua decisão. Esta é a última mensagem sobre este orçamento.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">${first}, esta é a nossa última mensagem.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Nas últimas três semanas, compartilhamos tudo que achamos importante sobre os painéis Orbital — o produto, o investimento, a durabilidade, a transformação que ${spaceLabel} poderia ter.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Agora a decisão é completamente sua. E qualquer que seja, nós respeitamos.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td width="48%" style="background:#f0f9eb;padding:20px;vertical-align:top;">
      <p style="margin:0 0 12px;color:#3b6934;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Se você disser sim:</p>
      ${[
        fmtArea(p.area) + " m² de " + spaceLabel + " transformados",
        "Visual único que dura décadas",
        "Decisão que você vai se orgulhar",
        "Suporte completo de " + partnerFirst,
      ].map(i => `<p style="margin:0 0 6px;color:#43474e;font-size:12px;font-family:Arial,sans-serif;">✓ ${i}</p>`).join("")}
    </td>
    <td width="4%"></td>
    <td width="48%" style="background:#fff5f5;padding:20px;vertical-align:top;">
      <p style="margin:0 0 12px;color:#c0392b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Se você disser não agora:</p>
      ${[
        spaceLabel + " continua como está",
        "A transformação fica para outra hora",
        "O orçamento pode mudar com o estoque",
        "Mas a porta Orbital nunca fecha",
      ].map(i => `<p style="margin:0 0 6px;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">· ${i}</p>`).join("")}
    </td>
  </tr>
</table>
${quoteCard(p)}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:24px 0 4px;font-family:Arial,sans-serif;">Se este for o momento certo, ${partnerFirst} está à disposição:</p>
${cta(`Fechar com ${partnerFirst}`, wa)}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Não enviaremos mais mensagens sobre este orçamento após hoje. Quando estiver pronto — seja em dias ou meses — é só entrar em contato. Obrigado pela atenção, ${first}.</p>
`
      ),
    };
  }

  // ── STEP 99 — Concluído ────────────────────────────────────────────────────
  if (step === 99) {
    return {
      subject: `Bem-vindo à família Orbital, ${first}! 🎉`,
      html: wrap(
        `Você fez a escolha certa. Estamos muito felizes em recebê-lo como cliente Orbital.`,
        `
<p style="font-size:26px;color:#002045;font-weight:700;margin:0 0 6px;font-family:Arial,sans-serif;">${first},</p>
<p style="font-size:26px;color:#002045;font-weight:300;margin:0 0 24px;font-family:Arial,sans-serif;">você fez a escolha certa.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Estamos muito felizes em recebê-lo como cliente Orbital. Seu projeto para ${spaceLabel} com os painéis <strong>${p.model} · ${finish}</strong> vai ficar extraordinário — e você vai entender exatamente o porquê quando vir o resultado final.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9eb;border-left:3px solid #3b6934;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#3b6934;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">O que acontece agora:</p>
    ${[
      partnerFirst + " vai confirmar todos os detalhes do pedido com você",
      "Verificação de disponibilidade de estoque e prazo estimado",
      "Agendamento da retirada ou logística no depósito Orbital",
      "Instalação — podemos indicar profissionais parceiros em Manaus",
    ].map((item, i) => `<p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">${i + 1}.</strong> ${item}</p>`).join("")}
  </td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 12px;color:#002045;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">Cuidado simples que preserva seus painéis por décadas:</p>
    ${["Pano úmido com detergente neutro — semanal", "Sem produtos abrasivos, ácidos ou solventes", "Nenhuma manutenção especial necessária além da limpeza regular"].map(i => `<p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· ${i}</p>`).join("")}
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Qualquer dúvida durante o processo — instalação, logística, especificações — fale com ${partnerFirst}:</p>
${cta(`Falar com ${partnerFirst}`, wa)}
<p style="color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;font-style:italic;">Obrigado por escolher a Orbital, ${first}. Cada painel que instalamos é um projeto em que acreditamos.</p>
`
      ),
    };
  }

  // ── STEP 98 — Cancelado ────────────────────────────────────────────────────
  if (step === 98) {
    return {
      subject: `Obrigado por considerar a Orbital, ${first}`,
      html: wrap(
        `O momento certo para um projeto nem sempre é agora — e isso é completamente válido.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Obrigado, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Sabemos que o momento certo para um projeto nem sempre é agora — e isso é completamente válido. Ficamos felizes que você tenha dedicado tempo para conhecer os painéis Orbital e simular um orçamento para ${spaceLabel}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Não vamos te mandar mais mensagens sobre este projeto. Mas queremos deixar uma coisa registrada:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">O que fica guardado para você:</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· Modelo ${p.model} · ${finish}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· ${p.plates} painel${p.plates !== 1 ? "is" : ""} · ${fmtArea(p.area)} m² de ${spaceLabel}</p>
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· Referência: ${fmtBRL(p.total)}</p>
    <p style="margin:0;color:rgba(255,255,255,0.55);font-size:12px;font-family:Arial,sans-serif;line-height:1.6;">Quando o momento chegar — seja em semanas ou meses — ${partnerFirst} estará disponível para retomar exatamente de onde paramos. Sem precisar recalcular tudo do zero.</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Nenhuma pressão, nenhum julgamento. Quando estiver pronto, é só falar.</p>
${cta(`Falar com ${partnerFirst} quando estiver pronto`, wa)}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Esta é a última mensagem que enviaremos sobre este orçamento. Obrigado pela atenção — foi um prazer.</p>
`
      ),
    };
  }

  return { subject: "", html: "" };
}

// ─── Template interpolation ──────────────────────────────────────────────────

/**
 * Replace all {{key}} occurrences in template with the corresponding value.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`;
  });
}

/**
 * Generate a client email from a DB template row, or fall back to the
 * built-in generateClientEmail if no DB row is provided.
 */
export async function generateClientEmailFromTemplate(
  step: number,
  p: EmailParams,
  dbRow: { subject: string; body_html: string } | null
): Promise<{ subject: string; html: string }> {
  if (!dbRow) {
    return generateClientEmail(step, p);
  }

  const first = p.clientName.split(" ")[0];
  const spaceLabel = p.space || "seu espaço";
  const finish = FINISH[p.model] || p.model;
  const wa = waLink(p.clientName, p.partnerName, p.model, p.plates);
  const partnerFirst = p.partnerName.split(" ")[0];
  const perM2 = p.area > 0 ? p.total / p.area : 0;
  const perDay = p.total / (20 * 12 * 30);

  const vars: Record<string, string> = {
    firstName: first,
    clientName: p.clientName,
    spaceLabel,
    model: p.model,
    finish,
    plates: String(p.plates),
    area: `${fmtArea(p.area)} m²`,
    total: fmtBRL(p.total),
    partnerFirst,
    partnerName: p.partnerName,
    waLink: wa,
    quoteCard: quoteCard(p),
    perM2: fmtBRL(perM2),
    perDay: fmtBRL(Math.ceil(perDay)),
  };

  const subject = interpolate(dbRow.subject, vars);
  const bodyHtml = interpolate(dbRow.body_html, vars);

  // Use the first line of the subject as a preheader approximation
  const html = wrap(subject, bodyHtml);

  return { subject, html };
}
