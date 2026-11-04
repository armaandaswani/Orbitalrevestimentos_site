"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useProgresso } from "@/components/ds/useProgresso";
import { relogio } from "@/lib/movimento/relogio";
import Revelar from "@/components/projetos/Revelar";
import { MAPA_ALTURA, MAPA_LARGURA, MAPA_PONTOS } from "./mapaPontos";
import { FRACOES, PARADAS, ROTA, TOTAL_ETAPAS, chegada, distancia } from "./jornadaRota";

/**
 * O que a Orbital faz, na ordem em que acontece: da pesquisa até a obra.
 * Texto aprovado pelo dono (04/11/2026), palavra por palavra.
 */
const ETAPAS = [
  { titulo: "Pesquisa", texto: "Acompanhamos o que surge de novo em revestimentos no mundo e escolhemos o que resolve um problema real do nosso mercado." },
  { titulo: "Adaptação à Amazônia", texto: "Ajustamos a composição de cada material para a umidade, o calor e o sol da nossa região." },
  { titulo: "Fabricação Orbital", texto: "Fabricamos com o nosso padrão de qualidade, com matéria-prima certificada e controle de cada lote. Cada produto leva a nossa assinatura." },
  { titulo: "Importação própria", texto: "Somos nós que importamos e trazemos até Manaus." },
  { titulo: "Estoque em Manaus", texto: "O material fica aqui, em pronta-entrega." },
  { titulo: "Validação e formação", texto: "Testamos na região, com ensaios, relatórios e ART, e formamos os profissionais que aplicam." },
];
const TOTAL = TOTAL_ETAPAS;

const ROTULOS = [
  // Abaixo da fábrica e das paradas 1 a 3, terminando na fábrica.
  { nome: "Fabricação Orbital", x: 790, y: 206, ancora: "fim" as const },
  // À direita de Manaus: abaixo e à esquerda ficam o estoque e a obra.
  { nome: "Manaus", x: 117, y: 294, ancora: "inicio" as const },
];

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Frações da rota no estilo da seção: o CSS calcula o traço e o ponto com elas. */
const VARS_SECAO = Object.fromEntries(FRACOES.map((f, k) => [`--jr-l${k}`, f.toFixed(5)])) as Vars;

/**
 * Layout estático para quem não roda JavaScript: o --p nunca anda, então o
 * quadro preso mostraria só a primeira etapa. Mesmas regras do bloco
 * `@media (scripting: none)` em globals.css (Home: jornada); o <noscript> cobre
 * os motores que ainda não conhecem `scripting`. O padrão continua sendo o
 * quadro preso, então quem tem JS não vê o layout trocar na hidratação. Os dois
 * blocos precisam ficar iguais.
 */
const CSS_SEM_JS = `
.jr{height:auto}
.jr .jr-quadro{position:static;height:auto;padding-block:clamp(3.5rem,2rem + 4.5vw,7rem)}
.jr .jr-palco{display:none}
.jr .jr-lista{position:static;width:auto;height:auto;margin:0;overflow:visible;clip-path:none;white-space:normal;display:grid}
.jr .jr-traco{stroke-dashoffset:0}
.jr .jr-ponto{offset-distance:100%}
.jr .jr-parada-cheia{opacity:1}
.jr .jr-parada-halo{opacity:0}
`;

export default function Jornada() {
  const secaoRef = useProgresso<HTMLElement>();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const secao = secaoRef.current;
    const svg = svgRef.current;
    if (!secao || !svg) return;

    // Escala inversa: ponto e paradas ficam com o mesmo tamanho em px em
    // qualquer largura, mesmo com o mapa encolhendo no celular.
    const ro = new ResizeObserver(() => {
      const w = svg.getBoundingClientRect().width;
      if (w > 0) secao.style.setProperty("--jr-inv", (MAPA_LARGURA / w).toFixed(4));
    });
    ro.observe(svg);

    // Prova real do offset-path em elemento SVG: um navegador pode aceitar a
    // propriedade (CSS.supports) e não aplicá-la ao <g>. Põe o ponto no meio da
    // rota e confere onde ele foi parar; se não estiver lá, o ponto passa a
    // andar por transform calculado aqui (getPointAtLength), a partir do mesmo
    // --p que o useProgresso escreve na seção.
    const rota = svg.querySelector<SVGPathElement>(".jr-prevista")!;
    const ponto = svg.querySelector<SVGGElement>(".jr-ponto")!;
    const totalRota = rota.getTotalLength();
    let semOffset = false;
    if (CSS.supports("offset-path", 'path("M 0 0")')) {
      ponto.style.offsetDistance = "50%";
      const esperado = rota.getPointAtLength(totalRota / 2);
      const m = svg.getScreenCTM();
      const caixa = ponto.getBoundingClientRect();
      if (m && caixa.width > 0) {
        const x = m.a * esperado.x + m.c * esperado.y + m.e;
        const y = m.b * esperado.x + m.d * esperado.y + m.f;
        semOffset = Math.hypot(caixa.x + caixa.width / 2 - x, caixa.y + caixa.height / 2 - y) > 6;
      }
      ponto.style.offsetDistance = "";
    } else {
      semOffset = true;
    }
    if (!semOffset) return () => ro.disconnect();

    ponto.style.offsetPath = "none";
    ponto.style.display = "inline"; // vence o @supports que esconde o ponto sem offset-path
    const colocar = (d: number) => {
      const pt = rota.getPointAtLength(d * totalRota);
      ponto.setAttribute("transform", `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`);
    };
    // Movimento reduzido ou tela baixa demais para o quadro preso: rota inteira, ponto na obra.
    if (window.matchMedia("(prefers-reduced-motion: reduce), (max-height: 480px)").matches) {
      colocar(1);
      return () => ro.disconnect();
    }
    // Assina depois do useProgresso (o efeito dele é declarado antes), então lê
    // o --p que ele acabou de escrever no mesmo quadro. Nunca segura o laço acordado.
    let ultimo = "";
    const ler = () => {
      const p = secao.style.getPropertyValue("--p");
      if (p !== ultimo) {
        ultimo = p;
        colocar(distancia(Number(p) || 0));
      }
    };
    ler();
    const sair = relogio.assinar({
      tick() {
        ler();
        return false;
      },
    });
    return () => {
      sair();
      ro.disconnect();
    };
  }, [secaoRef]);

  return (
    <section
      ref={secaoRef}
      aria-labelledby="jornada-titulo"
      className="jr relative h-[420svh] bg-[#0B1F45] text-white ds-escuro"
      style={VARS_SECAO}
    >
      {/* Sem JavaScript: só em motor sem `scripting: none` (veja o CSS_SEM_JS). Inerte com JS. */}
      <noscript><style dangerouslySetInnerHTML={{ __html: CSS_SEM_JS }} /></noscript>
      <div className="jr-quadro sticky top-0 h-[100svh] overflow-hidden flex items-center pt-20 lg:pt-0">
        {/*
          Grade com áreas: no celular e no tablet, título → mapa → palco; no
          computador, título e palco numa coluna à esquerda (globals.css) e o
          mapa fora do fluxo, preso à direita do quadro. No celular o quadro
          centra o conteúdo abaixo do cabeçalho (pt-20), que volta ao subir.
        */}
        <div className="jr-grade ds-wrap-largo w-full grid gap-y-6 sm:gap-y-8 [grid-template-areas:'cabeca'_'mapa'_'palco']">
          <Revelar className="[grid-area:cabeca] max-w-2xl">
            <h2 id="jornada-titulo" className="font-serif text-t1 font-normal tracking-[-0.02em] text-balance">Da fábrica até a sua obra.</h2>
            <p className="mt-4 text-lead text-white/75 text-pretty">
              Somos fabricantes. Cada material sai com a nossa assinatura e com a composição pensada para a Amazônia.
            </p>
          </Revelar>

          {/* Palco: a etapa da vez, escolhida pela rolagem. É encenação; a versão lida é a lista. */}
          <div className="jr-palco [grid-area:palco] lg:self-end" aria-hidden>
            <div className="grid">
              {ETAPAS.map((e, i) => (
                <div
                  key={e.titulo}
                  className="jr-etapa [grid-area:1/1]"
                  style={{ "--a": i === 0 ? -1 : (i / TOTAL).toFixed(4), "--b": i === TOTAL - 1 ? 2 : ((i + 1) / TOTAL).toFixed(4) } as Vars}
                >
                  <h3 className="font-serif text-t2 font-normal tracking-[-0.015em] text-white text-balance">{e.titulo}</h3>
                  <p className="mt-3 text-corpo text-white/75 text-pretty max-w-[42ch]">{e.texto}</p>
                </div>
              ))}
            </div>
            {/* Onde a rolagem está: seis traços que enchem, sem número nem clique. */}
            <div className="jr-progresso mt-6 flex gap-1.5">
              {ETAPAS.map((e, i) => (
                <span key={e.titulo} className="relative h-px flex-1">
                  <span className="absolute inset-0 bg-white opacity-30" />
                  <span className="jr-enche absolute inset-0 bg-white origin-left" style={{ "--i": i } as Vars} />
                </span>
              ))}
            </div>
          </div>

          {/* A lista de verdade: lida por leitores de tela; visível com movimento reduzido e sem JS. */}
          <ol className="jr-lista [grid-area:palco] gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 lg:self-end">
            {ETAPAS.map((e, i) => (
              <li key={e.titulo} className="grid grid-cols-[1.75rem_minmax(0,1fr)] border-t border-white/15 pt-3">
                <span aria-hidden className="font-serif text-white/55 tabular-nums">{i + 1}</span>
                <span>
                  <span className="block font-serif text-[1.0625rem] text-white">{e.titulo}</span>
                  <span className="mt-1 block text-legenda text-white/70 text-pretty">{e.texto}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="jr-mapa-caixa [grid-area:mapa]">
            {/*
              Celular e tablet: o quadro corta a faixa da rota e a tela do mapa
              fica maior que ele (globals.css › Home: jornada). Computador: o
              mapa inteiro, 65% da largura, encostado à direita. A terra fica
              numa caixa com máscara nas bordas; rota e rótulos por cima, sem
              máscara, na mesma geometria.
            */}
            <figure className="jr-mapa relative overflow-hidden -mx-[clamp(1rem,4.2vw,4rem)] sm:mx-0 lg:mx-0">
              <div className="jr-terra-caixa" aria-hidden>
                <div className="jr-tela">
                  {/* Terra em pontos: camada própria, que não repinta quando a rota anda. */}
                  <svg viewBox={`0 0 ${MAPA_LARGURA} ${MAPA_ALTURA}`} className="jr-terra absolute inset-0 h-full w-full" aria-hidden focusable="false">
                    <path d={MAPA_PONTOS} />
                  </svg>
                </div>
              </div>

              <div className="jr-tela">
                <svg ref={svgRef} viewBox={`0 0 ${MAPA_LARGURA} ${MAPA_ALTURA}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden focusable="false">
                  {/* Rota prevista: fio apagado, sempre visível. */}
                  <path d={ROTA} className="jr-prevista" />
                  {/* Rota percorrida: o traço se desenha com a rolagem. */}
                  <path d={ROTA} pathLength={1} className="jr-traco" />

                  {PARADAS.map(([x, y], i) => (
                    <g
                      key={i}
                      className="jr-parada"
                      style={{ "--c": chegada(i).toFixed(4), "--f": i === TOTAL - 1 ? 2 : ((i + 1) / TOTAL).toFixed(4) } as Vars}
                    >
                      <circle cx={x} cy={y} r="11" className="jr-parada-halo" />
                      <circle cx={x} cy={y} r="3.25" className="jr-parada-ponto" />
                      <circle cx={x} cy={y} r="3.25" className="jr-parada-cheia" />
                    </g>
                  ))}

                  <g className="jr-ponto" style={{ offsetPath: `path("${ROTA}")` }}>
                    <circle r="10" className="jr-ponto-luz" />
                    <circle r="3.5" className="jr-ponto-nucleo" />
                  </g>
                </svg>

                {ROTULOS.map((r) => (
                  <span
                    key={r.nome}
                    aria-hidden
                    className={`jr-rotulo absolute text-sobre uppercase tracking-[0.18em] text-white/70 whitespace-nowrap ${r.ancora === "fim" ? "-translate-x-full" : ""}`}
                    style={{ left: `${(r.x / MAPA_LARGURA) * 100}%`, top: `${(r.y / MAPA_ALTURA) * 100}%` }}
                  >
                    {r.nome}
                  </span>
                ))}
              </div>
              <figcaption className="sr-only">Mapa-múndi com a rota da Fabricação Orbital até Manaus e até a obra.</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
