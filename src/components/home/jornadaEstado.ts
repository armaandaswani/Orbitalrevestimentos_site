/**
 * Estado da jornada "Da fábrica até a sua obra": em que passo está, quanto do
 * passo já correu e por que está parada. É puro e sem importações para o
 * teste de Node carregar o arquivo direto (node --test com o .ts).
 *
 * As pausas são motivos separados porque cada um tem dono diferente: o botão
 * (usuario), o teclado dentro da seção (foco), o mouse ou o dedo em cima
 * (ponteiro) e a seção sair da tela (foraDaTela). Soltar um não pode
 * destravar o outro: quem apertou "Pausar" continua pausado ao tirar o foco.
 */

export const DURACAO_PASSO_MS = 4000;
export const TOTAL_PASSOS = 6;

export type MotivoPausa = "usuario" | "foco" | "ponteiro" | "foraDaTela";

export interface EstadoJornada {
  passo: number;
  /** ms já corridos dentro do passo atual (0 a DURACAO_PASSO_MS). */
  decorrido: number;
  pausas: Record<MotivoPausa, boolean>;
}

export type AcaoJornada =
  | { tipo: "tick"; dtMs: number }
  | { tipo: "ir"; passo: number }
  | { tipo: "proximo" }
  | { tipo: "anterior" }
  | { tipo: "pausa"; motivo: MotivoPausa; ativa: boolean };

/** Começa fora da tela: só anda quando o IntersectionObserver disser que entrou. */
export function estadoInicial(): EstadoJornada {
  return {
    passo: 0,
    decorrido: 0,
    pausas: { usuario: false, foco: false, ponteiro: false, foraDaTela: true },
  };
}

export function pausada(e: EstadoJornada): boolean {
  const p = e.pausas;
  return p.usuario || p.foco || p.ponteiro || p.foraDaTela;
}

/** Fração do passo atual já corrida, de 0 a 1. */
export function progresso(e: EstadoJornada): number {
  return Math.min(Math.max(e.decorrido / DURACAO_PASSO_MS, 0), 1);
}

function prender(passo: number): number {
  if (!Number.isFinite(passo)) return 0;
  return Math.min(Math.max(Math.floor(passo), 0), TOTAL_PASSOS - 1);
}

/** Vai a um passo do começo. Mesmo passo e já no zero: devolve o mesmo objeto. */
function irPara(e: EstadoJornada, passo: number): EstadoJornada {
  if (passo === e.passo && e.decorrido === 0) return e;
  return { ...e, passo, decorrido: 0 };
}

export function reduzirJornada(e: EstadoJornada, a: AcaoJornada): EstadoJornada {
  switch (a.tipo) {
    case "tick": {
      if (pausada(e) || !(a.dtMs > 0)) return e;
      const total = e.decorrido + a.dtMs;
      if (total < DURACAO_PASSO_MS) return { ...e, decorrido: total };
      // Um quadro muito longo (aba que voltou) anda no máximo um passo: a
      // sobra fica dentro do passo seguinte, nunca pula etapa sem ser vista.
      const sobra = Math.min(total - DURACAO_PASSO_MS, DURACAO_PASSO_MS - 1);
      return { ...e, passo: (e.passo + 1) % TOTAL_PASSOS, decorrido: sobra };
    }
    case "ir":
      return irPara(e, prender(a.passo));
    case "proximo":
      return irPara(e, (e.passo + 1) % TOTAL_PASSOS);
    case "anterior":
      return irPara(e, (e.passo + TOTAL_PASSOS - 1) % TOTAL_PASSOS);
    case "pausa":
      if (e.pausas[a.motivo] === a.ativa) return e;
      return { ...e, pausas: { ...e.pausas, [a.motivo]: a.ativa } };
  }
}

/**
 * Parte do passo em que o ponto viaja; no resto ele descansa na parada
 * enquanto o texto é lido. Ninguém lê andando.
 */
export const FRACAO_VIAGEM = 0.7;

/** cubic-bezier(0.65, 0, 0.35, 1), a mesma curva de --mv-percurso. */
function percurso(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Quanto da rota (0 a 1) está desenhado: o passo `n` leva o ponto da parada
 * `n` à `n + 1` com a curva de percurso, então ele sai e chega com peso, sem
 * trocar de velocidade de um trecho para outro.
 */
export function rotaDesenhada(e: EstadoJornada): number {
  const viagem = Math.min(progresso(e) / FRACAO_VIAGEM, 1);
  return (e.passo + percurso(viagem)) / TOTAL_PASSOS;
}

/**
 * Opacidade do traço e do ponto. Some entre 75% e 92% do último passo e
 * volta nos primeiros 10% do primeiro: a volta ao começo acontece com o
 * traço apagado, sem a linha recolher de uma vez na frente de quem olha. Acaba
 * em 92% e não em 100% porque o componente suaviza o brilho (~200 ms de
 * atraso): assim ele já está em zero quando a virada acontece.
 */
export function brilhoDaRota(e: EstadoJornada): number {
  const q = progresso(e);
  if (e.passo === TOTAL_PASSOS - 1) return Math.min(Math.max((0.92 - q) / 0.17, 0), 1);
  if (e.passo === 0) return Math.min(q / 0.1, 1);
  return 1;
}
