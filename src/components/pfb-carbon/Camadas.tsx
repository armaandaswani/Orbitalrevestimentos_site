"use client";

import type { CSSProperties } from "react";
import BotaoToque from "@/components/techstone/BotaoToque";
import { useToque } from "@/components/ds/useToque";
import { CAMADAS_CARBON, FOTO_MIOLO, MODELOS_CARBON, TEXTOS, textura } from "@/lib/pfb-carbon";

/** Duração da seção, em ms. */
const DURACAO = 10000;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Espessura de cada lâmina no desenho, em fração do lado (--s). Não é escala
 * real: o filme e o adesivo seriam invisíveis. É um diagrama, e a tela diz isso.
 */
const ESPESSURA = [0.008, 0.008, 0.03, 0.11, 0.03];
/** Cara de cada lâmina (globals.css › .cbn-lam[data-tipo]). */
const TIPO = ["filme", "adesivo", "spc", "miolo", "spc"] as const;

/** Altura da base de cada lâmina com a placa fechada: a soma das de baixo. */
const BASE = ESPESSURA.map((_, k) => ESPESSURA.slice(k + 1).reduce((s, t) => s + t, 0));

/**
 * "A placa por dentro": a placa de 5 mm se abre em cinco lâminas.
 *
 * Toca sozinha (useToque). A placa aparece fechada, as lâminas se afastam e os
 * nomes acendem um por vez, de cima para baixo, junto com a lâmina de cada um;
 * no fim ficam todos acesos. As lâminas são caixas em 3D sem perspectiva
 * (vista isométrica), só com transform; o --p vira tudo isso no CSS
 * (globals.css › PFB Carbon: camadas).
 *
 * A face de cima do filme é a textura real do Louro Freijó e as faces do
 * substrato são o grão da foto real do corte. O resto é cor chapada: desenho,
 * não foto.
 *
 * Acessibilidade: a lista de nomes é o conteúdo; o desenho é aria-hidden.
 */
export default function Camadas() {
  const { ref, estado, alternar } = useToque<HTMLElement>(DURACAO);
  const madeira = textura(MODELOS_CARBON[0]);
  const grao = { backgroundImage: `url(${FOTO_MIOLO.grao.src})` };
  return (
    <section ref={ref} aria-labelledby="cbn-camadas-titulo" className="cbn-camadas cbn-toca ts-encaixe-ponto relative min-h-[100svh] bg-[#131211]">
      <div className="ds-wrap flex min-h-[100svh] flex-col justify-center pt-20 pb-20 lg:pt-24">
        <h2 id="cbn-camadas-titulo" className="font-serif font-normal text-t1 text-[#F2EEE6]">{TEXTOS.camadas.titulo}</h2>

        <div className="cbn-cam-palco mt-8 lg:mt-10">
          <div aria-hidden className="cbn-pilha">
            <div className="cbn-eixo">
              {TIPO.map((tipo, k) => (
                <div key={k} className="cbn-lam" data-tipo={tipo} style={{ "--k": k, "--t": ESPESSURA[k], "--z0": BASE[k] } as Vars}>
                  <span className="cbn-face cbn-face-topo" style={tipo === "filme" ? { backgroundImage: `url(${madeira})` } : tipo === "miolo" ? grao : undefined} />
                  <span className="cbn-face cbn-face-frente" style={tipo === "miolo" ? grao : undefined} />
                  <span className="cbn-face cbn-face-lado" style={tipo === "miolo" ? grao : undefined} />
                </div>
              ))}
            </div>
          </div>

          <ol className="cbn-cam-nomes">
            {CAMADAS_CARBON.map((nome, k) => (
              <li key={k} className="cbn-cam-nome" style={{ "--k": k, "--zc": BASE[k] + ESPESSURA[k] / 2 } as Vars}>
                <span aria-hidden className="cbn-cam-fio" />
                <span className="cbn-cam-num tabular-nums">{String(k + 1).padStart(2, "0")}</span>
                <span className="font-serif text-[1.0625rem] leading-snug lg:text-t3">{nome}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-sobre text-[#F2EEE6]/45 lg:mt-10">{TEXTOS.camadas.nota}</p>
      </div>
      <BotaoToque estado={estado} alternar={alternar} nome="as camadas do PFB Carbon" />
    </section>
  );
}
