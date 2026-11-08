import Image from "next/image";
import { ANATOMIA, LAMINAS, ancoraDosNomes, clipPath } from "@/lib/pfb-anatomia";
import { CAMADAS } from "@/lib/pfb-textos";
import EntradaPfb from "./EntradaPfb";

/** Altura (% da figura) de cada um dos cinco nomes, ao lado da sua lâmina. */
const ANCORAS = ancoraDosNomes();

/** Índice da primeira lâmina de cada nome (0, 1, 2, 3, 5: pvc-1 e pvc-2 dividem o 3). */
const PRIMEIRA_LAMINA = CAMADAS.nomes.map((_, k) => LAMINAS.findIndex((l) => l.nome === k));

/**
 * Capítulo 3 da página do PFB: a placa por dentro (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 3). Creme, título e frase, e a anatomia sem rótulos com os cinco
 * nomes ao lado, cada um à altura da sua lâmina (`ancoraDosNomes`).
 *
 * A figura é desenhada por seis cópias da mesma imagem (mesmas props: um download
 * só), cada uma recortada na sua lâmina por `clip-path`, a de cima por cima
 * (`z-index` 6 − i; a figura é `isolate`, então esse empilhamento fica dentro dela).
 *
 * O encaixe (globals.css, bloco do capítulo 3): na entrada da figura
 * (`.pfb-figura`), cada lâmina parte de `translateY(var(--fechado))` com opacidade 0
 * e chega ao lugar, uma depois da outra por `--i`, e cada nome (com a sua
 * linha-guia, que fica dentro do `h3`) entra pela esquerda por `--l` (a sua
 * primeira lâmina). Pela rolagem onde há `animation-timeline` (a linha do tempo é
 * da figura, vista pelos nomes por `timeline-scope` no palco); por tempo, pelas
 * classes do `EntradaPfb`, que observa a figura, onde não há. Sem JavaScript, com
 * movimento reduzido ou no nível `leve`, tudo fica no estado final, que é a imagem
 * original composta.
 *
 * Celular: título e frase em cima; embaixo, nomes à esquerda e figura à direita
 * (58% da largura, até 193 px). Computador (lg): três colunas na mesma faixa de
 * 600 px (título e frase; nomes alinhados à direita; figura de 600 px de altura),
 * e uma linha de 1 px do fim de cada nome até a lâmina (dentro do `h3`, que é
 * `relative`): o vão da grade (4rem) mais `X_ANCORA` (25%) da largura da figura
 * (252 px).
 */
export default function CamadasPfb() {
  return (
    <section
      id="tecnologia"
      data-capitulo="tecnologia"
      aria-labelledby="pfb-camadas-titulo"
      className="bg-[#F6F5F2] py-12 lg:py-24"
    >
      <div className="ds-wrap">
        <EntradaPfb observar=".pfb-figura" className="pfb-palco relative grid grid-cols-[minmax(0,1fr)_min(58%,193px)] gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1fr)_16rem_auto] lg:gap-x-16 lg:gap-y-0 lg:items-center">
          <div className="col-span-2 lg:col-span-1 lg:row-start-1">
            <h2 id="pfb-camadas-titulo" className="font-serif pfb-t1 text-[#0B1F45]">
              {CAMADAS.titulo}
            </h2>
            <p className="pfb-corpo text-[#43474e] mt-6 lg:mt-8">{CAMADAS.lead}</p>
          </div>
          <ol className="pfb-nomes relative lg:z-10 lg:col-span-1 lg:row-start-1 lg:h-[600px]">
            {CAMADAS.nomes.map((nome, k) => (
              <li
                key={nome}
                data-nome={k}
                className="absolute inset-x-0 -translate-y-1/2 lg:text-right"
                style={{ top: `${ANCORAS[k]}%` }}
              >
                <h3
                  className="pfb-nome relative font-serif pfb-t3 text-[#0B1F45]"
                  style={{ "--l": PRIMEIRA_LAMINA[k] } as React.CSSProperties}
                >
                  {nome}
                  <span
                    aria-hidden="true"
                    className="hidden lg:block absolute left-full top-1/2 h-px w-[calc(4rem+0.25*252px)] bg-[#43474e]"
                  />
                </h3>
              </li>
            ))}
          </ol>
          <figure
            aria-hidden="true"
            className="pfb-figura relative isolate aspect-[591/1410] w-full lg:col-span-1 lg:row-start-1 lg:w-auto lg:h-[600px]"
          >
            {LAMINAS.map((l, i) => (
              <div
                key={l.chave}
                data-lamina={i}
                className="pfb-lamina absolute inset-0"
                style={
                  {
                    clipPath: clipPath(l),
                    zIndex: 6 - i,
                    "--fechado": `-${l.fechadoY}%`,
                    "--i": i,
                  } as React.CSSProperties
                }
              >
                <Image
                  src={ANATOMIA.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 252px, 193px"
                />
              </div>
            ))}
          </figure>
        </EntradaPfb>
      </div>
    </section>
  );
}
