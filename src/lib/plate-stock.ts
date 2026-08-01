/**
 * Disponibilidade de estoque das PLACAS num orçamento.
 *
 * Vale só para os modelos de revestimento. Os materiais de instalação calculados
 * automaticamente (PU-40, cola de contato, espuma) NÃO entram aqui de propósito:
 * eles têm controle de estoque no painel, mas isso é assunto da operação — o
 * cliente não deve receber alerta nem bloqueio por causa deles.
 *
 * A quantidade pedida NUNCA é reduzida. A função só compara e informa, para a
 * equipe comercial confirmar prazo de reposição ou atendimento parcial.
 */

/**
 * SKUs de instalação, repetidos aqui de propósito.
 *
 * A lista canônica é SUPPORT_PRODUCT_SKUS em @/lib/orcamento-materials. Este
 * arquivo não a importa porque precisa rodar sob o Node puro no verificador, que
 * não resolve o alias "@/". A divergência entre as duas listas é checada por
 * scripts/verify-plate-stock.ts — se alguém acrescentar uma embalagem lá e
 * esquecer aqui, o verificador falha.
 */
const SUPPORT_SKUS: readonly string[] = ["ORB-PU", "ORB-CC26", "ORB-CC14", "ORB-ESP"];

export interface PlateRequest {
  /** Código do modelo (ORB-003). */
  code: string;
  /** Nome comercial, para a mensagem não mostrar código cru. */
  name?: string;
  /** Placas pedidas deste modelo. */
  requested: number;
}

export interface PlateShortage {
  code: string;
  name: string;
  requested: number;
  available: number;
  missing: number;
}

/** True quando o SKU é material de instalação, não placa de revestimento. */
export function isSupportSku(code: string): boolean {
  return SUPPORT_SKUS.includes((code ?? "").trim().toUpperCase());
}

/**
 * Compara o pedido com o disponível, modelo a modelo.
 *
 * Vários ambientes podem usar o MESMO modelo — as quantidades são somadas antes
 * de comparar, senão dois ambientes de 6 placas passariam num estoque de 8.
 *
 * `availableByCode` sem o modelo significa disponibilidade desconhecida (produto
 * fora do catálogo carregado): nesse caso não inventamos falta.
 */
export function findPlateShortages(
  requests: PlateRequest[],
  availableByCode: Record<string, number>,
): PlateShortage[] {
  const totals = new Map<string, { name: string; requested: number }>();

  for (const r of requests ?? []) {
    const code = (r?.code ?? "").trim().toUpperCase();
    const qty = Math.max(0, Math.floor(r?.requested ?? 0));
    if (!code || qty <= 0 || isSupportSku(code)) continue;
    const cur = totals.get(code);
    if (cur) cur.requested += qty;
    else totals.set(code, { name: r.name?.trim() || code, requested: qty });
  }

  const out: PlateShortage[] = [];
  for (const [code, { name, requested }] of totals) {
    const raw = availableByCode[code];
    if (raw === undefined || raw === null) continue; // disponibilidade desconhecida
    const available = Math.max(0, Math.floor(raw));
    if (requested > available) {
      out.push({ code, name, requested, available, missing: requested - available });
    }
  }
  return out.sort((a, b) => b.missing - a.missing);
}

/** Mensagem que o cliente lê. Uma por modelo, com o número real disponível. */
export function shortageMessage(s: PlateShortage): string {
  const placas = s.available === 1 ? "placa disponível" : "placas disponíveis";
  return `A quantidade solicitada é maior do que o estoque disponível no momento. Atualmente temos ${s.available} ${placas} deste modelo.`;
}
