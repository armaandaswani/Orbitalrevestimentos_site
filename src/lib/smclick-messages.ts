/**
 * PT-BR WhatsApp message builders for the SM Click automations.
 *
 * Kept in one place so the wording stays consistent across the simulador flow,
 * the CRM status automations, and the recovery cron. Pure functions — no I/O.
 */

function fmtBRL(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "tudo bem";
}

export interface VisualizadorItem {
  local?: string | null;
  productName?: string | null;
  productCode?: string | null;
}

/**
 * Visualizador — Message 1. Sent with the generated render image when the
 * client finishes the Visualizador. Names the product line and lists exactly
 * the finishes/areas they picked, then points them to the instant orçamento.
 * The render image itself is attached separately (sent as a media message, or
 * appended as a link in the text fallback) — this is just the caption text.
 */
export function visualizadorRenderMessage(items: VisualizadorItem[]): string {
  const parts = items.filter((it) => it && (it.productName || it.local));
  const lines: string[] = [];
  if (parts.length === 0) {
    lines.push("Olá! 🎨 Aqui está a sua visualização das *placas flexíveis de bambu* da Orbital.");
  } else {
    lines.push(
      "Olá! 🎨 Aqui está a sua visualização das *placas flexíveis de bambu* da Orbital — veja os acabamentos que você escolheu:",
      ""
    );
    for (const it of parts) {
      const code = it.productCode ? ` (${it.productCode})` : "";
      const prod = it.productName ? `*${it.productName}*${code}` : "Acabamento escolhido";
      const local = it.local ? ` — ${it.local}` : "";
      lines.push(`• ${prod}${local}`);
    }
  }
  lines.push(
    "",
    "Gostou do resultado? No nosso site você também consegue gerar uma simulação de orçamento instantânea! ✨"
  );
  return lines.join("\n");
}

/**
 * Message 2 — product education / lead qualification. Sent right after the
 * Visualizador render AND after a Simulador orçamento, to teach the lead what
 * the product actually is and why it holds up to the Amazonian climate.
 */
export function productEducationMessage(): string {
  return [
    "Os painéis Fibra de Bambu são uma forma prática de transformar o ambiente com acabamento sofisticado, sem obra pesada. E tem durabilidade comprovada no clima amazônico! 🌳",
    "",
    "💧 Resistente à água, mofo e umidade",
    "🔥 Não propaga chamas",
    "⚡ Aplicação rápida e limpa",
    "🚚 Pronta entrega em Manaus",
  ].join("\n");
}

export function clientOrcamentoCtaMessage(): string {
  return "Quer que eu revise com você as medidas e lhe ajude a seguir com o pedido?";
}

export interface MeetingInviteInput {
  inviteeName?: string | null;
  title: string;
  whenLabel: string; // pre-formatted date/time, e.g. "12/07/2026 14:30"
  location?: string | null;
  repName?: string | null;
}

/**
 * Sent to each invitee (WhatsApp and/or email) when a rep schedules a meeting
 * from the CRM. Plain text so it works for both channels.
 */
export function meetingInviteMessage(i: MeetingInviteInput): string {
  const lines: string[] = [
    `Olá${i.inviteeName ? `, ${i.inviteeName.trim().split(/\s+/)[0]}` : ""}! 👋`,
    "",
    `Você tem uma reunião agendada com a Orbital Revestimentos${i.repName ? ` (${i.repName})` : ""}:`,
    "",
    `📅 ${i.whenLabel}`,
    `📌 ${i.title}`,
  ];
  if (i.location && i.location.trim()) lines.push(`📍 ${i.location.trim()}`);
  lines.push("", "Qualquer dúvida, é só responder esta mensagem. Até lá! 🙌");
  return lines.join("\n");
}

export interface OrcamentoMessageInput {
  name: string | null;
  total: number | null;
  space?: string | null;
  model?: string | null;
  // Exact dimensions the client entered, e.g. "3m × 2,7m" or "8,10 m²".
  dimLabel?: string | null;
  quoteUrl?: string | null;
  // Public URLs of the renders the client generated in the Visualizador.
  renderUrls?: string[] | null;
}

/**
 * Feature 1 — sent to the customer the moment they finish the simulador. Safe
 * inside WhatsApp's 24h window because they just engaged. Confirms the orçamento
 * and drops the shareable quote link.
 */
export function clientOrcamentoMessage(i: OrcamentoMessageInput): string {
  const lines: string[] = [
    `Olá, ${firstName(i.name)}! 👋 Aqui é a Orbital Revestimentos.`,
    ``,
    `Recebemos sua simulação e já deixamos tudo pronto para você revisar com calma:`,
  ];
  const renders = (i.renderUrls ?? []).filter(Boolean);
  if (renders.length > 0) {
    lines.push(``);
    lines.push(renders.length === 1 ? `🖼️ Veja como ficou no seu ambiente:` : `🖼️ Veja como ficou nos seus ambientes:`);
    renders.forEach((u) => lines.push(u));
  }
  if (i.quoteUrl) {
    lines.push(``);
    lines.push(`📄 Acesse seu orçamento completo:`);
    lines.push(i.quoteUrl);
  }
  lines.push(
    ``,
    `A Orbital fornece somente o material. A instalação é contratada à parte, mas temos uma empresa parceira especializada nesse tipo de aplicação. O contato dela aparece dentro do link do orçamento.`
  );
  return lines.join("\n");
}

export interface OwnerAlertInput extends OrcamentoMessageInput {
  phone?: string | null;
}

/**
 * Feature 4 — real-time ping to the owner when a high-value orçamento lands,
 * complementing the daily reminder digest.
 */
export function ownerHighValueMessage(i: OwnerAlertInput): string {
  const lines: string[] = [
    `🔥 Orçamento de alto valor recebido!`,
    ``,
    `👤 ${i.name ?? "—"}${i.phone ? ` (${i.phone})` : ""}`,
    `💰 ${fmtBRL(i.total)}`,
  ];
  const detail = [i.space, i.model].filter(Boolean).join(" · ");
  if (detail) lines.push(`📦 ${detail}`);
  if (i.quoteUrl) lines.push(i.quoteUrl);
  lines.push(``);
  lines.push(`Vale um follow-up rápido. 🚀`);
  return lines.join("\n");
}

/**
 * Feature 6 — gentle nudge to someone who entered a phone in the simulador but
 * never submitted. Sent by the recovery cron within the 24h window.
 */
export function abandonedNudgeMessage(name: string | null, space?: string | null): string {
  return [
    `Olá, ${firstName(name)}! 👋`,
    ``,
    `Vi que você começou a montar um orçamento aqui na Orbital Revestimentos${space ? ` para ${space}` : ""}, mas não chegou a finalizar.`,
    ``,
    `Posso te ajudar a concluir? É rapidinho e sem compromisso. 😊`,
  ].join("\n");
}

/**
 * Feature 5 — fired when a lead moves to "ganho" in the CRM.
 */
export function statusGanhoMessage(name: string | null): string {
  return [
    `Olá, ${firstName(name)}! 🎉`,
    ``,
    `Que ótimo ter você com a Orbital Revestimentos! Vamos cuidar de cada detalhe do seu pedido e em breve entramos em contato com os próximos passos.`,
    ``,
    `Obrigado pela confiança! 🙌`,
  ].join("\n");
}

/**
 * Feature 5 — fired when a lead moves to "orçamento" in the CRM.
 */
export function statusOrcamentoMessage(name: string | null): string {
  return [
    `Olá, ${firstName(name)}!`,
    ``,
    `Seu orçamento na Orbital Revestimentos está em andamento. Qualquer dúvida sobre valores, produtos ou prazos, é só chamar por aqui. 🙌`,
  ].join("\n");
}
