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

export interface OrcamentoMessageInput {
  name: string | null;
  total: number | null;
  space?: string | null;
  model?: string | null;
  quoteUrl?: string | null;
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
    `Recebemos o seu orçamento e está tudo pronto:`,
  ];
  if (i.space) lines.push(`📍 Ambiente: ${i.space}`);
  if (i.model) lines.push(`🎨 Modelo: ${i.model}`);
  lines.push(`💰 Total estimado: ${fmtBRL(i.total)}`);
  lines.push(``);
  if (i.quoteUrl) {
    lines.push(`Veja o orçamento completo aqui:`);
    lines.push(i.quoteUrl);
    lines.push(``);
  }
  lines.push(`Qualquer dúvida, é só responder esta mensagem. Estamos à disposição! 🙌`);
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
