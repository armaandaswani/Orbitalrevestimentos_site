"use client";

import type { CSSProperties } from "react";
import Cena from "./Cena";
import { useProgresso } from "./useProgresso";
import { AVISO_CENAS, ESPESSURA_MM, MODELOS_TECHSTONE, texturaMiniatura } from "@/lib/techstone";

/**
 * As três seções de quadro fixo da TechStone: abertura, sequência de usos e
 * formatos. Cada uma é alta (várias telas) com um quadro sticky dentro; o
 * useProgresso passa a posição da rolagem para o CSS (globals.css › TechStone).
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export function Abertura({ entrarNaLista }: { entrarNaLista: () => void }) {
  const ref = useProgresso<HTMLElement>();
  return (
    <section ref={ref} aria-labelledby="ts-titulo" className="relative h-[190svh] bg-[#EFEBE4]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="ts-abertura-foto absolute inset-0 bg-[#22201C]">
          <Cena nome="curva" prioridade alt="Parede curva em travertino gerada por IA a partir da textura TechStone Travertino Navona Clássico, com uma linha de luz no topo" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        </div>

        <div className="ts-abertura-texto absolute inset-x-0 bottom-0 ds-wrap pb-[max(3.5rem,9svh)]">
          <h1 id="ts-titulo" className="font-serif text-white leading-[0.92] tracking-[-0.02em] text-[clamp(3rem,1.6rem+8vw,4rem)] sm:text-[clamp(4rem,2rem+10vw,11rem)]">
            TechStone
          </h1>
          <p className="mt-5 text-white/90 text-lead max-w-[44ch]">
            Pedra flexível de {ESPESSURA_MM}&nbsp;mm. Feita para o sol do Equador.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <button type="button" onClick={entrarNaLista} className="ds-botao ds-botao-claro min-h-12 self-start">Entrar na lista de espera</button>
            <p className="text-white/75 text-legenda">Chega em breve a Manaus, em quantidade limitada.</p>
          </div>
          <p className="mt-6 text-sobre text-white/55 max-w-[60ch]">{AVISO_CENAS}</p>
        </div>

        <p className="ts-abertura-depois absolute inset-x-0 bottom-[3%] text-center font-serif text-[#22201C] text-t3 px-4">
          Uma nova linha da Orbital.
        </p>
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
    texto: "A placa foi adaptada para o uso em fachada, sob o sol e a chuva de Manaus.",
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
    texto: `${MODELOS_TECHSTONE.filter((m) => m.aparencia === "pedra").length} pedras e ${MODELOS_TECHSTONE.filter((m) => m.aparencia === "madeira").length} madeiras, em dois formatos.`,
  },
];

export function Sequencia() {
  const ref = useProgresso<HTMLElement>();
  const n = QUADROS.length;
  return (
    <section ref={ref} aria-label="Onde a TechStone vai" className="relative bg-[#22201C]" style={{ height: `${n * 100 + 20}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
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
              <div className="ts-quadro-texto absolute inset-x-0 bottom-0 ds-wrap pb-[max(3.5rem,10svh)]">
                <h2 className="font-serif text-white text-display max-w-[14ch]">{q.titulo}</h2>
                <p className="mt-4 text-white/85 text-lead max-w-[38ch]">{q.texto}</p>
                <p className="mt-4 text-sobre text-white/55">Imagem gerada por IA.</p>
              </div>
            </div>
          );
        })}

        {/* Onde o visitante está na sequência: uma marca por quadro. */}
        <ol aria-hidden className="absolute right-[clamp(1rem,3vw,2.5rem)] top-1/2 -translate-y-1/2 flex flex-col gap-3">
          {QUADROS.map((q, i) => (
            <li key={q.cena} className="ts-trilho-marca block w-px h-10 bg-white"
              style={{ "--a": i / n, "--b": (i + 1) / n } as Vars} />
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Pessoa de 1,70 m em traço de planta, para dar escala à placa. */
function Pessoa() {
  return (
    <g fill="none" stroke="#22201C" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="420" cy="1012" r="102" />
      <path d="M420 1114 L420 1690 M300 1300 Q420 1180 540 1300 M420 1690 L340 2300 L330 2600 M420 1690 L500 2300 L510 2600 M300 1300 L270 1760 M540 1300 L570 1760" />
    </g>
  );
}

/** Cota de desenho técnico: linha com traços nas pontas e a medida no meio. */
function Cota({ x1, y1, x2, y2, texto, vertical = false, className = "" }: {
  x1: number; y1: number; x2: number; y2: number; texto: string; vertical?: boolean; className?: string;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g className={className} stroke="#8C7B63" strokeWidth="8" fill="#8C7B63">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - 40} y1={y1} x2={x1 + 40} y2={y1} />
          <line x1={x2 - 40} y1={y2} x2={x2 + 40} y2={y2} />
          <text x={mx - 70} y={my} stroke="none" fontSize="86" textAnchor="end" dominantBaseline="middle" fontFamily="var(--font-inter)">{texto}</text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 40} x2={x1} y2={y1 + 40} />
          <line x1={x2} y1={y2 - 40} x2={x2} y2={y2 + 40} />
          <text x={mx} y={my + 120} stroke="none" fontSize="86" textAnchor="middle" fontFamily="var(--font-inter)">{texto}</text>
        </>
      )}
    </g>
  );
}

export function Formatos() {
  const ref = useProgresso<HTMLElement>();
  const textura = texturaMiniatura(MODELOS_TECHSTONE.find((m) => m.slug === "travertino-navona-classico")!);
  // Unidades do desenho em milímetros. Chão em y = 2600; placa encostada nele.
  const X = 1000, CHAO = 2600;
  return (
    <section ref={ref} aria-labelledby="ts-formatos" className="ts-formatos relative h-[230svh] bg-[#EFEBE4]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="ds-wrap h-full grid content-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <div className="pt-20 lg:pt-0">
            <h2 id="ts-formatos" className="font-serif text-t1 text-[#22201C]">Dois formatos.</h2>
            <p className="mt-4 text-corpo text-[#4A4540] max-w-[40ch]">
              <strong className="font-semibold text-[#22201C]">1200 × 600 mm</strong> para detalhes, nichos e paginações.{" "}
              <strong className="font-semibold text-[#22201C]">2400 × 1200 mm</strong> para panos contínuos, com menos juntas.
              Os dois com {ESPESSURA_MM}&nbsp;mm de espessura.
            </p>
          </div>

          <svg viewBox="-260 0 3460 2900" className="w-full max-h-[62svh] lg:max-h-[78svh]" role="img"
            aria-label="Placa de 1200 por 600 milímetros e placa de 2400 por 1200 milímetros, lado a lado com uma pessoa de 1,70 metro">
            <line x1="80" y1={CHAO} x2="3120" y2={CHAO} stroke="#22201C" strokeWidth="8" />
            <Pessoa />
            <Cota x1={190} y1={2600} x2={190} y2={910} vertical texto="1,70 m" />
            <g className="ts-folha">
              <image href={textura} x={X} y={CHAO - 1200} width="600" height="1200" preserveAspectRatio="xMidYMid slice" />
              <rect x={X} y={CHAO - 1200} width="600" height="1200" fill="none" stroke="#22201C" strokeWidth="6" vectorEffect="non-scaling-stroke" />
            </g>
            <g className="ts-rotulo-pequeno">
              <Cota x1={X} y1={CHAO + 60} x2={X + 600} y2={CHAO + 60} texto="600" />
              <Cota x1={X + 700} y1={CHAO} x2={X + 700} y2={CHAO - 1200} texto="" />
              <text x={X + 760} y={CHAO - 600} fontSize="86" fill="#8C7B63" dominantBaseline="middle" fontFamily="var(--font-inter)">1200</text>
            </g>
            <g className="ts-rotulo-grande">
              <Cota x1={X} y1={CHAO + 60} x2={X + 1200} y2={CHAO + 60} texto="1200" />
              <Cota x1={X + 1300} y1={CHAO} x2={X + 1300} y2={CHAO - 2400} texto="" />
              <text x={X + 1360} y={CHAO - 1200} fontSize="86" fill="#8C7B63" dominantBaseline="middle" fontFamily="var(--font-inter)">2400</text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
