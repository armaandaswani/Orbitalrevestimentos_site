/**
 * Textos da página /onde-comprar, aprovados pelo dono na Fase 0
 * (checks/onde-comprar/fase0/textos.md, seções 1, 3, 4 e rótulos dos botões).
 * Não reescrever aqui: mudança de texto passa de novo pelo dono.
 *
 * Módulo puro (sem import de runtime): a lista (servidor) e a folha (cliente)
 * leem daqui.
 */

export const TITULO_PDV = "Onde comprar em Manaus";

/** Título da aba e dos buscadores (o layout raiz completa com " | Orbital Revestimentos"). */
export const TITULO_META_PDV = "Onde comprar o Painel Flexível em Fibra de Bambu em Manaus";

/** De 2 a 9 por extenso (lojas é feminino); de 10 em diante, o número. */
const POR_EXTENSO: Record<number, string> = {
  2: "Duas",
  3: "Três",
  4: "Quatro",
  5: "Cinco",
  6: "Seis",
  7: "Sete",
  8: "Oito",
  9: "Nove",
};

/** Linha abaixo do título; o número sai das lojas ativas. */
export function subtituloPdv(n: number): string {
  if (n === 1) return "Uma loja da cidade revende o Painel Flexível em Fibra de Bambu.";
  return `${POR_EXTENSO[n] ?? String(n)} lojas da cidade revendem o Painel Flexível em Fibra de Bambu.`;
}

export const SELO_PDV = "Revendedor autorizado";

export const HORARIO_ROTULO_PDV = "Horário habitual";

/** Nota abaixo do horário: não manda o cliente a um WhatsApp que a loja não tem. */
export function notaFeriadoPdv(temWhatsapp: boolean): string {
  return temWhatsapp ? "Em feriados, confirme pelo WhatsApp da loja." : "Em feriados, confirme com a loja.";
}

/** Na folha, o Instagram aparece com o usuário. */
export function rotuloInstagramFolha(usuario: string): string {
  return `@${usuario} no Instagram`;
}

export const FECHAR_PDV = "Fechar";

/**
 * Complemento só para o leitor de tela (sr-only) de cada link externo da lista
 * e da folha: o rótulo visível diz a ação, este diz de qual loja e que abre em
 * outra aba. "da loja" e "à loja" em vez de "da"/"do" com o nome, que não diz
 * o gênero ("Império do Piso", "Casa do Eletricista"). Texto novo, não visível.
 */
export function complementoLeitorPdv(tipo: "whatsapp" | "rota" | "waze" | "instagram", nomeCurto: string): string {
  const loja = tipo === "rota" ? `à loja ${nomeCurto}` : tipo === "waze" ? `até a loja ${nomeCurto}` : `da loja ${nomeCurto}`;
  // "WhatsApp da loja X, abre em nova aba"; "@x no Instagram, da loja X, abre em nova aba".
  return `${tipo === "instagram" ? "," : ""} ${loja}, abre em nova aba`;
}
