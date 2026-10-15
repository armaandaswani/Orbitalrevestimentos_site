/**
 * Formação da Academia Orbital — regras das turmas (decisões do dono, out/2026).
 *
 * - 1ª turma: gratuita (só a 1ª edição), 20 profissionais. O número NUNCA
 *   aparece no site nem nas mensagens: o público lê "vagas limitadíssimas".
 * - Folga: pelo menos 5–6 de quem se pré-inscreve não comparece, então a 1ª
 *   turma aceita 20 + FOLGA pré-inscrições antes de fechar.
 * - Toda inscrição ocupa vaga, inclusive quem já estava na lista de espera.
 *   Quem responde "não vou" ao pedido de confirmação libera a vaga.
 * - O site mostra quantos profissionais estão pré-inscritos; perto do limite,
 *   mostra a contagem regressiva das vagas.
 * - Lotou: "1ª turma preenchida" e o formulário passa a inscrever na lista de
 *   espera da 2ª turma. Vaga liberada por desistência vai para quem está nessa
 *   fila, pela ordem de inscrição (o admin chama) — por isso, havendo fila, a
 *   1ª turma continua fechada para inscrições novas.
 *
 * Sem import nenhum: roda no navegador e no servidor.
 */

export const VAGAS_TURMA_1 = 20;
export const FOLGA_DESISTENCIAS = 6;
/** Pré-inscrições aceitas na 1ª turma antes de fechar. */
export const LIMITE_TURMA_1 = VAGAS_TURMA_1 + FOLGA_DESISTENCIAS;
/** A partir de quantos pré-inscritos o número aparece no site (1 ou 2 não convencem ninguém). */
export const MOSTRAR_INSCRITOS_A_PARTIR = 5;
/** Contagem regressiva das vagas: aparece quando passa de 15 pré-inscritos. */
export const CONTADOR_A_PARTIR = 16;

/**
 * Data da 1ª turma (definida pelo dono em out/2026). O formulário pergunta se a
 * pessoa pode nesse dia; quem não pode vai para a lista da 2ª turma. O local
 * ainda não foi divulgado: vai para os inscritos pelo WhatsApp.
 */
export const DATA_TURMA_1 = "sábado, 31/10";
export const HORA_TURMA_1 = "7h30";
export const QUANDO_TURMA_1 = `${DATA_TURMA_1}, às ${HORA_TURMA_1}`;
/** Começo de frase: "Sábado, 31/10, às 7h30". */
export const QUANDO_TURMA_1_INICIO = QUANDO_TURMA_1.charAt(0).toUpperCase() + QUANDO_TURMA_1.slice(1);

export type Turma = 1 | 2;

export interface StatusTurma {
  /** Pré-inscritos ocupando vaga na 1ª turma (sem quem respondeu "não vou"). */
  inscritos: number;
  /** Vagas restantes contra o LIMITE (com a folga). */
  restantes: number;
  /** Pessoas na lista de espera da 2ª turma. */
  fila2: number;
  fechada: boolean;
  mostrarInscritos: boolean;
  mostrarContador: boolean;
}

export function calcularStatus(inscritos: number, fila2: number): StatusTurma {
  const restantes = Math.max(0, LIMITE_TURMA_1 - inscritos);
  const fechada = restantes === 0 || fila2 > 0;
  return {
    inscritos,
    restantes,
    fila2,
    fechada,
    mostrarInscritos: inscritos >= MOSTRAR_INSCRITOS_A_PARTIR,
    mostrarContador: !fechada && inscritos >= CONTADOR_A_PARTIR,
  };
}

/** Página no ar antes da migration 065 ou sem banco: turma aberta, sem números. */
export const STATUS_PADRAO: StatusTurma = calcularStatus(0, 0);

/** "1 vaga" / "3 vagas". */
export function vagasTxt(n: number): string {
  return `${n} ${n === 1 ? "vaga" : "vagas"}`;
}
