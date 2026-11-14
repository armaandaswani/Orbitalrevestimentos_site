/**
 * Encaixe firme das telas da TechStone com mouse e trackpad (no toque quem
 * encaixa é o scroll-snap do navegador; veja components/techstone/Encaixe).
 * Só as seções do tamanho da tela encaixam; texto solto rola livre. Decide
 * para qual tela deslizar quando a rolagem para.
 */

export interface Tela {
  /** getBoundingClientRect().top, em px. */
  topo: number;
  altura: number;
  /** Seção de texto que nunca puxa o encaixe, tenha a altura que tiver (lista de espera, perguntas). */
  solta?: boolean;
}

/** Parte da janela que a tela vizinha da encaixada precisa ocupar: um toque de roda (100 px) já passa. */
const MINIMO_VIZINHA = 0.05;
/** Parte da janela que qualquer outra tela precisa ocupar: uma faixa dela não rouba quem lê o texto ao lado. */
const MINIMO = 0.35;

/**
 * Conta como tela a seção entre 0,8 e 1,6 altura de janela: faixas curtas e
 * seções longas de texto rolam soltas. A folga para baixo cobre o celular com
 * a barra do navegador recolhida, quando a janela fica maior que 100svh.
 */
export function ehTela(altura: number, vh: number): boolean {
  return altura >= vh * 0.8 && altura <= vh * 1.6;
}

/** A tela que está no topo ou cobre a janela inteira (rolando dentro de uma mais alta), ou null. */
export function telaAtual(telas: Tela[], vh: number): number | null {
  const i = telas.findIndex((t) => !t.solta && ehTela(t.altura, vh)
    && (Math.abs(t.topo) < 2 || (t.topo <= 2 && t.topo + t.altura >= vh - 2)));
  return i >= 0 ? i : null;
}

/**
 * Índice da tela para onde deslizar, ou null para deixar onde está.
 * `ultima`: tela em que a página estava (encaixada ou por dentro) antes desta rolagem, ou null.
 * `direcao`: sinal da rolagem que acabou (1 desceu, -1 subiu, 0 nada).
 */
export function escolherTela(telas: Tela[], vh: number, ultima: number | null, direcao: number): number | null {
  // Nada rolou (toque ou clique parado), ou a página já está numa tela: nada a fazer.
  if (direcao === 0 || telaAtual(telas, vh) !== null) return null;
  let melhor: number | null = null;
  let melhorParte = 0;
  telas.forEach((t, i) => {
    if (t.solta || !ehTela(t.altura, vh)) return;
    // A tela de onde a rolagem saiu não puxa de volta: um toque já leva à vizinha.
    if (i === ultima && ((direcao > 0 && t.topo < 0) || (direcao < 0 && t.topo > 0))) return;
    const visivel = Math.max(0, Math.min(vh, t.topo + t.altura) - Math.max(0, t.topo));
    const parte = visivel / vh;
    const vizinha = ultima !== null && i === ultima + direcao;
    if (parte >= (vizinha ? MINIMO_VIZINHA : MINIMO) && parte > melhorParte) {
      melhor = i;
      melhorParte = parte;
    }
  });
  return melhor;
}
