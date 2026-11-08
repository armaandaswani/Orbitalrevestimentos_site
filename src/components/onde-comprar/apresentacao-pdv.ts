import type { Acao, PontoDeVenda } from "@/lib/pontos-de-venda";

/**
 * Peças comuns à lista (servidor) e à folha (cliente) da página /onde-comprar:
 * os atributos de medição de cada ação e o endereço curto.
 */

/** Evento de saída que cada ação dispara (rota e Waze são o mesmo evento, com o app). */
const EVENTO_DA_ACAO: Record<Acao["tipo"], "pdv_whatsapp" | "pdv_rota" | "pdv_instagram"> = {
  whatsapp: "pdv_whatsapp",
  rota: "pdv_rota",
  waze: "pdv_rota",
  instagram: "pdv_instagram",
};

export const EVENTOS_DE_SAIDA: readonly string[] = ["pdv_whatsapp", "pdv_rota", "pdv_instagram"];

/** `data-pdv-*` que o ouvinte único da ilha lê para medir o clique. */
export function atributosDeMedicao(acao: Acao, slug: string): Record<string, string> {
  const attrs: Record<string, string> = { "data-pdv-evento": EVENTO_DA_ACAO[acao.tipo], "data-pdv-loja": slug };
  if (acao.tipo === "rota") attrs["data-pdv-app"] = "maps";
  if (acao.tipo === "waze") attrs["data-pdv-app"] = "waze";
  return attrs;
}

/** "Parque 10 · R. Alexandre Magno, 1332": o bairro na frente, sem repeti-lo no endereço. */
export function ondeFica(p: Pick<PontoDeVenda, "bairro" | "address">): string {
  const bairro = p.bairro?.trim() || null;
  const endereco = p.address
    ? p.address
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "" && (!bairro || s.toLowerCase() !== bairro.toLowerCase()))
        .join(", ")
    : null;
  return [bairro, endereco].filter(Boolean).join(" · ");
}

/** Endereço inteiro para a folha; sem endereço, o bairro. */
export function enderecoCompleto(p: Pick<PontoDeVenda, "bairro" | "address">): string | null {
  return p.address?.trim() || p.bairro?.trim() || null;
}

/**
 * Símbolo da Orbital no selo "Revendedor autorizado". É o mesmo caminho do
 * PINO_PDV (MapaManaus.tsx), repetido de propósito: importar do MapaManaus
 * levaria o módulo do mapa (Server Component) para o chunk da folha, que é
 * cliente. Se o pino trocar de imagem (Pergunta 4), o selo continua o símbolo.
 */
export const SIMBOLO_SELO = "/images/brand/orbital-simbolo.svg";
