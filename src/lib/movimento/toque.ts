/**
 * Tocador de uma seção que anda sozinha, como um vídeo: o progresso vai de 0
 * a 1 em `duracaoMs` enquanto está tocando. É o mesmo progresso que o
 * useProgresso tira da rolagem; aqui ele vem do tempo. Sem navegador: quem
 * chama passa o dt de cada quadro (useToque, pelo relógio do site).
 */

export type EstadoToque = "parado" | "tocando" | "pausado" | "fim";

export interface Toque {
  /** Toca de onde parou; depois do fim, recomeça do zero. */
  tocar(): void;
  pausar(): void;
  /** Volta ao começo, parado (a seção saiu da tela). */
  zerar(): void;
  /** Vai direto ao fim (movimento reduzido). */
  terminar(): void;
  /** Vai a um ponto do progresso e pausa ali. */
  ir(p: number): void;
  /** Anda dtMs se estiver tocando e devolve o progresso. */
  avancar(dtMs: number): number;
  readonly p: number;
  readonly estado: EstadoToque;
}

export function criarToque(duracaoMs: number): Toque {
  let p = 0;
  let estado: EstadoToque = "parado";
  return {
    tocar() {
      if (estado === "fim") p = 0;
      estado = "tocando";
    },
    pausar() {
      if (estado === "tocando") estado = "pausado";
    },
    zerar() {
      p = 0;
      estado = "parado";
    },
    terminar() {
      p = 1;
      estado = "fim";
    },
    ir(alvo) {
      p = Math.min(1, Math.max(0, alvo));
      estado = "pausado";
    },
    avancar(dtMs) {
      if (estado !== "tocando") return p;
      p = Math.min(1, p + dtMs / duracaoMs);
      if (p >= 1) estado = "fim";
      return p;
    },
    get p() { return p; },
    get estado() { return estado; },
  };
}
