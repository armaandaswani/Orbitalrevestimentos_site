/**
 * Encaixe firme das telas da TechStone, sem o scroll-snap do CSS: o
 * `mandatory` do navegador prende a rolagem em seção um pouco mais alta que a
 * tela (no celular, quase todas as de texto). Aqui só as seções do tamanho da
 * tela encaixam; texto solto rola livre. Decide para qual tela deslizar quando
 * a rolagem para (components/techstone/Encaixe).
 */

export interface Tela {
  /** getBoundingClientRect().top, em px. */
  topo: number;
  altura: number;
}

/** Fração mínima visível para uma tela puxar o encaixe. */
const MINIMO = 0.05;

/**
 * Conta como tela a seção entre 0,8 e 1,6 altura de janela: faixas curtas e
 * seções longas de texto rolam soltas. A folga para baixo cobre o celular com
 * a barra do navegador recolhida, quando a janela fica maior que 100svh.
 */
export function ehTela(altura: number, vh: number): boolean {
  return altura >= vh * 0.8 && altura <= vh * 1.6;
}

/**
 * Índice da tela para onde deslizar, ou null para deixar onde está.
 * `ultima`: tela em que a página estava encaixada antes desta rolagem (ou null).
 * `direcao`: sinal da rolagem que acabou (1 desceu, -1 subiu, 0 nada).
 */
export function escolherTela(telas: Tela[], vh: number, ultima: number | null, direcao: number): number | null {
  // Uma tela já está no topo ou cobre a vista inteira (rolando dentro de uma mais alta): nada a fazer.
  if (telas.some((t) => ehTela(t.altura, vh) && (Math.abs(t.topo) < 2 || (t.topo <= 2 && t.topo + t.altura >= vh - 2)))) return null;
  let melhor: number | null = null;
  let melhorFracao = 0;
  telas.forEach((t, i) => {
    if (!ehTela(t.altura, vh)) return;
    // A tela de onde a rolagem saiu não puxa de volta: um toque já leva à vizinha.
    if (i === ultima && ((direcao > 0 && t.topo < 0) || (direcao < 0 && t.topo > 0))) return;
    const visivel = Math.max(0, Math.min(vh, t.topo + t.altura) - Math.max(0, t.topo));
    const fracao = visivel / t.altura;
    if (fracao >= MINIMO && fracao > melhorFracao) {
      melhor = i;
      melhorFracao = fracao;
    }
  });
  return melhor;
}
