"use client";

import { useSyncExternalStore } from "react";
import { useProgresso } from "@/components/ds/useProgresso";
import Revelar from "@/components/projetos/Revelar";
import {
  CAMADAS_DESENHO,
  CONTORNO,
  FIBRAS,
  TRACO_FIBRAS,
  TRACO_VEIOS,
  VEIOS,
  VIEWBOX,
  deslocamentoFechado,
  inicioDoPasso,
  poligonos,
} from "@/lib/movimento/camadas";
import { CAMADAS } from "@/lib/pfb-textos";

/**
 * Cena presa: a mesma consulta do bloco "PFB: a placa por dentro" de
 * globals.css (D5), mais o nível. Estado externo, sem setState em efeito
 * (padrão de Ideias.tsx e SeletorLinhas.tsx). O nível não tem assinatura
 * própria: o SCRIPT_NIVEL o marca antes da pintura e lerCena o relê a cada
 * renderização.
 */
const CONSULTA_CENA = "(min-width: 64rem) and (min-height: 45rem) and (prefers-reduced-motion: no-preference) and (scripting: enabled)";
const assinarCena = (avisar: () => void) => {
  const mq = window.matchMedia(CONSULTA_CENA);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
};
const lerCena = () => window.matchMedia(CONSULTA_CENA).matches && document.documentElement.dataset.mvNivel !== "leve";

/** Desenhadas de baixo para cima, para a camada de cima ficar por cima. */
const ORDEM_DESENHO = [4, 3, 2, 1, 0] as const;

/**
 * "A placa por dentro": as cinco camadas do PFB.
 *
 * Uma figura só (SVG desenhado à mão, geometria em lib/movimento/camadas) e
 * uma lista com o nome de cada camada, de cima para baixo. No computador (a
 * consulta acima), a seção tem 400svh e o quadro fica preso: com a rolagem a
 * placa se abre, cada camada tem a sua vez (desliza, ganha o contorno verde e
 * o item da lista acende) e no fim a placa fecha de novo em 5 mm. Quem anima é
 * o CSS (globals.css › PFB: a placa por dentro), lendo o --p que o
 * useProgresso escreve na seção; aqui só há marcação. Fora da cena (celular,
 * nível leve, janela baixa, movimento reduzido, sem JavaScript) a figura fica
 * aberta e parada, o hook fica desligado e no celular os itens entram um a um
 * com o Revelar.
 *
 * Acessibilidade: a figura é aria-hidden; o texto de verdade é a lista, uma vez
 * só no DOM. Nada focável dentro da seção.
 */
export default function CamadasPfb() {
  const cena = useSyncExternalStore(assinarCena, lerCena, () => false);
  const ref = useProgresso<HTMLElement>({ margem: "50% 0px 50% 0px", ligado: cena });

  return (
    <section ref={ref} id="tecnologia" aria-labelledby="pfb-camadas-titulo" className="pfb-cam scroll-mt-20 bg-[#0B1F45] text-white">
      <div className="pfb-cam-quadro">
        <div className="pfb-cam-palco ds-wrap lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-center">
          <div className="lg:col-span-7">
            <svg
              viewBox={VIEWBOX}
              aria-hidden="true"
              focusable="false"
              className="pfb-cam-svg mx-auto w-full max-w-[28rem] lg:max-w-none h-auto max-h-[70svh]"
            >
              {ORDEM_DESENHO.map((i) => {
                const c = CAMADAS_DESENHO[i];
                const p = poligonos(i);
                return (
                  <g
                    key={i}
                    className="pfb-cam-g"
                    data-indice={i}
                    style={{ "--a": inicioDoPasso(i), "--k": 4 - i } as React.CSSProperties}
                  >
                    <g transform={`translate(0 ${deslocamentoFechado(i)})`}>
                      <polygon
                        points={p.topo}
                        fill={c.topo.cor}
                        fillOpacity={c.topo.opacidade < 1 ? c.topo.opacidade : undefined}
                        stroke={c.bordaTopo?.cor}
                        strokeOpacity={c.bordaTopo?.opacidade}
                        strokeWidth={c.bordaTopo?.largura}
                      />
                      <polygon points={p.frente} fill={c.frente.cor} fillOpacity={c.frente.opacidade < 1 ? c.frente.opacidade : undefined} />
                      <polygon points={p.lado} fill={c.lado.cor} fillOpacity={c.lado.opacidade < 1 ? c.lado.opacidade : undefined} />
                      {c.extras === "veios" &&
                        VEIOS.map((d) => (
                          <path
                            key={d}
                            d={d}
                            fill="none"
                            stroke={TRACO_VEIOS.cor}
                            strokeOpacity={TRACO_VEIOS.opacidade}
                            strokeWidth={TRACO_VEIOS.largura}
                          />
                        ))}
                      {c.extras === "fibras" &&
                        FIBRAS.map(([[x1, y1], [x2, y2]]) => (
                          <line
                            key={y1}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={TRACO_FIBRAS.cor}
                            strokeOpacity={TRACO_FIBRAS.opacidade}
                            strokeWidth={TRACO_FIBRAS.largura}
                          />
                        ))}
                      <polygon
                        className="pfb-cam-contorno"
                        points={p.topo}
                        fill="none"
                        stroke={CONTORNO.cor}
                        strokeWidth={CONTORNO.largura}
                      />
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="lg:col-span-5">
            <h2 id="pfb-camadas-titulo" className="font-serif text-t2 text-white">{CAMADAS.titulo}</h2>
            <p className="text-lead text-white/85 mt-4">{CAMADAS.lead}</p>
            <ol className="pfb-cam-lista mt-8 space-y-8 lg:space-y-4">
              {CAMADAS.nomes.map((nome, i) => (
                <Revelar key={nome} como="li" ordem={i}>
                  <div className="pfb-cam-item" style={{ "--a": inicioDoPasso(i) } as React.CSSProperties}>
                    <h3 className="font-serif text-t3">{nome}</h3>
                  </div>
                </Revelar>
              ))}
            </ol>
            <p className="pfb-cam-legenda mt-6 text-legenda">{CAMADAS.legenda}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
