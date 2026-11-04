/**
 * Tempos da intro da órbita (ms desde a primeira pintura), num lugar só para o
 * controle da intro (components/movimento/IntroOrbitaControle) e o assentar do
 * hero (components/home/HeroAssenta) não se desencontrarem do CSS. O CSS
 * (globals.css, bloco "Intro da órbita") repete estes números como literais:
 * introTempo.test.mjs confere que batem.
 *
 * Sequência: as faixas se constroem no centro da tela até 1,6 s; a esfera
 * desliza para o lugar dela no logo enquanto o logotipo chega; o logo inteiro
 * fica parado pelo menos 0,4 s; a cortina sobe e termina em ~3,15 s.
 */

/** A esfera começa a deslizar do centro da tela para o lugar no logo. */
export const INICIO_DESLIZE = 1450;
export const DURACAO_DESLIZE = 600;

/** O logotipo ORBITAL REVESTIMENTOS sobe e se revela. */
export const INICIO_ASSINATURA = 1750;
export const DURACAO_ASSINATURA = 500;

/** A cortina começa a subir (e o clique é liberado). */
export const INICIO_CORTINA = 2650;
export const DURACAO_CORTINA = 500;

/** Fim da cortina: fim da intro na sequência normal. */
export const FIM_INTRO = INICIO_CORTINA + DURACAO_CORTINA;

/** Trava CSS: mesmo sem JavaScript, nada fica na tela depois disto. */
export const TRAVA_SEGURANCA = 3750;

/** Folga do hero: se o fim da intro nunca avisar, a foto se acomoda mesmo assim. */
export const ESPERA_MAXIMA_HERO = FIM_INTRO + 400;
