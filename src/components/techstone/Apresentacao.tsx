"use client";

import { ViewTransition, type CSSProperties } from "react";
import Link from "next/link";
import Cena from "./Cena";
import BotaoToque from "./BotaoToque";
import { useToque } from "@/components/ds/useToque";
import Profundidade, { type CamadaProfundidade } from "@/components/movimento/Profundidade";
import { CATALOGO_TECHSTONE, ESPESSURA_MM, MODELOS_TECHSTONE, cena } from "@/lib/techstone";

/**
 * As duas primeiras seções que tocam sozinhas: abertura e sequência de usos.
 * Cada uma ocupa uma tela; ao encaixar, o useToque leva o --p de 0 a 1 pelo
 * tempo e o CSS (globals.css › TechStone) faz o resto, como fazia com a rolagem.
 */

/** Duração de cada seção, em ms. */
const DURACAO_ABERTURA = 8500;
const DURACAO_SEQUENCIA = 14000;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** As frases da abertura, uma por vez. [início, fim] em fração da rolagem. */
const FRASES: { texto: string; a: number; b: number }[] = [
  { texto: `Pedra flexível de ${ESPESSURA_MM} mm.`, a: 0.2, b: 0.4 },
  { texto: "Em dois tamanhos.", a: 0.4, b: 0.58 },
  { texto: "Desenvolvida para a Amazônia.", a: 0.58, b: 0.76 },
];

/**
 * Planos da foto da abertura no computador. O fundo é a mesma cena escurecida
 * e desfocada: quando a parede recortada (Canva) se desloca alguns pixels
 * sobre ele, a borda que aparece atrás é uma sombra macia, nunca uma segunda
 * parede nítida. No celular o retrato não tem recorte limpo: fica a cena de
 * sempre, num plano só (fonte `mobile` do fundo, frente ausente).
 * Rolagem: o fundo encolhe 90% do que a parede encolhe e fica uns 23 px para
 * trás na descida (globals.css › Profundidade na abertura), o bastante para a
 * profundidade aparecer também sem mouse. Ponteiro: parede até 6 px contra o mouse, fundo
 * 2 px a favor; 8 px de diferença no máximo, menos que a sobra das camadas.
 */
const CAMADAS_ABERTURA: CamadaProfundidade[] = [
  {
    src: "/images/movimento/techstone-fundo-v1.webp",
    mobile: cena("curva").mobile,
    alt: "Parede curva em travertino gerada por IA a partir da textura TechStone Travertino Navona Clássico, com uma linha de luz no topo",
    fator: 0.9,
    ponteiro: 2,
  },
  { src: "/images/movimento/techstone-frente-v1.webp", mobile: null, alt: "", fator: 1, ponteiro: -6 },
];

/** Onde o banco encosta no chão, na caixa da cena: o pivô das escalas. */
const ANCORA_BANCO = "58% 85%";

/**
 * Abertura: a primeira tela é só a palavra "TechStone" sobre o escuro. Sozinha,
 * a foto acende por trás, o nome sobe e encolhe, e três frases passam uma de
 * cada vez, sempre no mesmo lugar (nunca duas juntas). No fim ficam o convite
 * para a lista de espera e o caminho para o catálogo.
 */
export function Abertura({ entrarNaLista }: { entrarNaLista: () => void }) {
  const { ref, estado, alternar } = useToque<HTMLElement>(DURACAO_ABERTURA);
  return (
    <section ref={ref} aria-labelledby="ts-titulo" className="ts-abertura ts-encaixe-ponto relative h-[100svh] bg-[#141210]">
      <div className="relative h-full overflow-hidden">
        {/* Destino do morph que sai da foto da TechStone no seletor de linhas
            (mesmo nome em linhas/SeletorLinhas). O nome fica neste invólucro:
            as camadas de profundidade moram DENTRO do único .ts-ab-foto,
            nunca como irmãs dele: o React põe o
            nome em cada filho DOM de primeiro nível do <ViewTransition>
            (linha-techstone, linha-techstone_1…), e camadas soltas virariam
            vários morphs separados em vez de uma foto só. */}
        <ViewTransition name="linha-techstone" share="mv-morph" default="none">
          <div className="ts-ab-foto absolute inset-0">
            <Profundidade prioridade rolagem="externa" ancora={ANCORA_BANCO} camadas={CAMADAS_ABERTURA} />
            <div aria-hidden className="absolute inset-0 bg-[#141210]/45" />
          </div>
        </ViewTransition>

        <h1 id="ts-titulo" className="ts-ab-titulo absolute inset-x-0 top-1/2 text-center font-serif text-white leading-none tracking-[-0.025em] text-[clamp(3.25rem,1.5rem+9vw,10rem)]">
          TechStone
        </h1>

        {FRASES.map((f) => (
          <p key={f.texto} className="ts-ab-frase absolute inset-x-0 top-1/2 px-6 text-center font-serif text-white text-[clamp(1.5rem,1rem+2.6vw,3.25rem)] leading-tight tracking-[-0.015em]"
            style={{ "--a": f.a, "--b": f.b } as Vars}>
            {f.texto}
          </p>
        ))}

        <div className="ts-ab-cta absolute inset-x-0 top-1/2 px-6 flex flex-col items-center text-center">
          <p className="font-serif text-white text-[clamp(1.5rem,1rem+2.6vw,3.25rem)] leading-tight tracking-[-0.015em] max-w-[18ch]">
            Chega em breve a Manaus.
          </p>
          <p className="mt-3 text-white/75 text-corpo">Primeira remessa em quantidade limitada.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <button type="button" onClick={entrarNaLista} className="ds-botao ds-botao-claro min-h-12">
              Entrar na lista de espera
            </button>
            <Link href={CATALOGO_TECHSTONE} data-teste="ver-modelos"
              className="inline-flex items-center min-h-11 text-corpo text-white underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Ver os modelos
            </Link>
          </div>
        </div>

        <BotaoToque estado={estado} alternar={alternar} nome="abertura da TechStone" />
      </div>
    </section>
  );
}

const QUADROS = [
  {
    cena: "coluna",
    alt: "Coluna redonda em travertino claro, gerada por IA a partir da textura TechStone Travertino Bianco Trevi, sob luz zenital",
    titulo: "Faz curva.",
    texto: "Dobra com facilidade e acompanha colunas e paredes curvas.",
  },
  {
    cena: "fachada",
    alt: "Fachada de edifício em travertino bege, gerada por IA a partir da textura TechStone Travertino Romano Clássico, sob sol a pino com jardim tropical",
    titulo: "Vai para a fachada.",
    texto: "A placa foi adaptada para o uso em fachada, sob o sol e o calor da Amazônia.",
  },
  {
    cena: "interior",
    alt: "Sala com parede de canto curvo gerada por IA a partir da textura TechStone Taj Mahal, com luz quente de abajur",
    titulo: "E para o interior.",
    texto: "Quartos, salas, halls e lojas.",
  },
  {
    cena: "madeira",
    alt: "Recepção com parede curva em madeira gerada por IA a partir da textura TechStone Nogueira Americana",
    titulo: "Pedra e madeira.",
    texto: `${MODELOS_TECHSTONE.filter((m) => m.aparencia === "pedra").length} pedras e ${MODELOS_TECHSTONE.filter((m) => m.aparencia === "madeira").length} madeiras.`,
  },
];

/** Ponto do --p em que o quadro i já está inteiro, com o texto assentado. */
const inicioQuadro = (i: number, n: number) => (i === 0 ? 0 : i / n + 0.07);

export function Sequencia() {
  const { ref, estado, alternar, ir } = useToque<HTMLElement>(DURACAO_SEQUENCIA);
  const n = QUADROS.length;
  return (
    <section ref={ref} aria-label="Onde a TechStone vai" className="ts-encaixe-ponto relative h-[100svh] bg-[#141210]">
      <div className="relative h-full overflow-hidden">
        {QUADROS.map((q, i) => {
          const vars: Vars = {
            "--a": i === 0 ? -1 : i / n,
            "--b": i === n - 1 ? 2 : (i + 1) / n,
            "--ia": i / n,
          };
          return (
            <div key={q.cena} className="ts-quadro absolute inset-0" style={vars}>
              {/* Carrega já: quadros invisíveis (opacidade 0) atrasariam no lazy. */}
              <Cena nome={q.cena} alt={q.alt} carregar="eager" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="ts-quadro-texto absolute inset-x-0 bottom-0 ds-wrap pb-[max(5.5rem,10svh)]">
                <h2 className="font-serif text-white text-display max-w-[14ch]">{q.titulo}</h2>
                <p className="mt-4 text-white/85 text-lead max-w-[38ch]">{q.texto}</p>              </div>
            </div>
          );
        })}

        {/* Onde o visitante está na sequência: uma marca por quadro. Tocar numa marca
            leva àquele quadro e pausa ali. */}
        <ol className="absolute right-[clamp(0.25rem,2vw,1.75rem)] top-1/2 -translate-y-1/2 flex flex-col">
          {QUADROS.map((q, i) => (
            <li key={q.cena}>
              <button type="button" onClick={() => ir(inicioQuadro(i, n))} aria-label={`Ver o quadro: ${q.titulo}`}
                className="grid place-items-center w-11 h-[3.25rem] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white">
                <span aria-hidden className="ts-trilho-marca block w-px h-10 bg-white"
                  style={{ "--a": i / n, "--b": (i + 1) / n } as Vars} />
              </button>
            </li>
          ))}
        </ol>

        <BotaoToque estado={estado} alternar={alternar} nome="onde a TechStone vai" />
      </div>
    </section>
  );
}
