import type { CSSProperties } from "react";
import { ALTURA_MAPA, LARGURA_MAPA } from "@/lib/pontos-de-venda";
import { AMERICA_LARGURA, MANAUS_AMERICA, PONTOS_AMAZONIA, PONTOS_AMERICA } from "./mapaAmerica";

/**
 * Moldura do continente na proporção da caixa do mapa de Manaus (400 × 480):
 * o continente (480 × 690 unidades) fica centrado no alto, com 24 unidades de
 * folga em cima e uma faixa de 150 embaixo para a linha de texto. Como a caixa
 * tem proporção fixa, o SVG a preenche sem sobra e as posições em % valem para
 * o SVG e para a caixa ao mesmo tempo.
 */
const MOLDURA_ALTURA = 864;
const MOLDURA_LARGURA = (MOLDURA_ALTURA * LARGURA_MAPA) / ALTURA_MAPA; // 720
const MARGEM_X = (MOLDURA_LARGURA - AMERICA_LARGURA) / 2; // 120
const MARGEM_TOPO = 24;
const VIEWBOX = `${-MARGEM_X} ${-MARGEM_TOPO} ${MOLDURA_LARGURA} ${MOLDURA_ALTURA}`;

/** Manaus em % da caixa: origem da câmera e lugar do marcador. */
const MANAUS_X = `${(((MANAUS_AMERICA[0] + MARGEM_X) / MOLDURA_LARGURA) * 100).toFixed(2)}%`;
const MANAUS_Y = `${(((MANAUS_AMERICA[1] + MARGEM_TOPO) / MOLDURA_ALTURA) * 100).toFixed(2)}%`;

/**
 * Um subcaminho de comprimento zero por ponto (desenhado com stroke-linecap
 * round), relativo dentro de cada linha da grade para o HTML ficar curto.
 */
function caminho(pontos: [number, number][]) {
  let d = "";
  let anterior: [number, number] | null = null;
  for (const [x, y] of pontos) {
    d += anterior && anterior[1] === y ? `m${x - anterior[0]} 0h0` : `M${x} ${y}h0`;
    anterior = [x, y];
  }
  return d;
}

const TERRA = caminho(PONTOS_AMERICA);
const AMAZONIA = caminho(PONTOS_AMAZONIA);

/**
 * Abertura do /onde-comprar (Server Component, nada de JS no cliente): a
 * América do Sul em pontos, a Amazônia acende em verde, a câmera aproxima em
 * Manaus e a camada some sobre o mapa real, onde os pinos caem um a um.
 *
 * Fica escondida por padrão. Só aparece sob `html[data-pdv-abertura="1"]`,
 * ligado antes da primeira pintura pelo SCRIPT_ABERTURA_PDV, e a sequência
 * inteira é CSS (bloco "Onde comprar: abertura" do globals.css). Ocupa a mesma
 * caixa do <MapaManaus> (camada absolute dentro do invólucro [data-pdv-mapa]),
 * então não muda a altura da página.
 *
 * A camada desenhada é `aria-hidden`; o "Pular" fica fora dela, como botão
 * real, com o próprio rótulo.
 */
export function AberturaPdv() {
  return (
    <>
      <div className="pdv-ab" aria-hidden="true" style={{ "--pdv-mx": MANAUS_X, "--pdv-my": MANAUS_Y } as CSSProperties}>
        <div className="pdv-ab__camera">
          <svg viewBox={VIEWBOX} focusable="false" className="pdv-ab__terra">
            <path d={TERRA} />
          </svg>
          <svg viewBox={VIEWBOX} focusable="false" className="pdv-ab__amazonia">
            <path d={AMAZONIA} />
          </svg>
        </div>
        <div className="pdv-ab__alvo">
          <span className="pdv-ab__manaus" style={{ left: MANAUS_X, top: MANAUS_Y }}>
            Manaus
          </span>
        </div>
        <p className="pdv-ab__linha">
          Feito para a Amazônia,
          <br /> vendido em Manaus.
        </p>
      </div>
      <button type="button" data-pdv-pular className="pdv-ab__pular">
        Pular
      </button>
    </>
  );
}

export default AberturaPdv;
