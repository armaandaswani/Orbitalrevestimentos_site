"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { relogio } from "@/lib/movimento/relogio";
import { aproximar } from "@/lib/movimento/suavizar";
import Revelar from "@/components/projetos/Revelar";
import {
  TOTAL_PASSOS,
  brilhoDaRota,
  estadoInicial,
  pausada,
  percurso,
  progresso,
  reduzirJornada,
  rotaDesenhada,
  type AcaoJornada,
  type EstadoJornada,
} from "./jornadaEstado";

/**
 * O que a Orbital faz, na ordem em que acontece: da fábrica até a obra. Os
 * números contam a sequência. Fonte: vault › Quem somos e História e símbolo.
 */
const ETAPAS = [
  { titulo: "Curadoria", texto: "Percorremos fábricas e fornecedores pelo mundo atrás de materiais que resolvem um problema real do nosso mercado." },
  { titulo: "Fabricação com padrão Orbital", texto: "Produzimos em fábricas parceiras certificadas, com matéria-prima certificada, e só vendemos materiais originais Orbital." },
  { titulo: "Importação e logística própria", texto: "Somos nós que importamos. Trazemos até Manaus e levamos até a porta do cliente." },
  { titulo: "Estoque em Manaus", texto: "O material fica em Manaus, em pronta-entrega, sem espera de frete de fora." },
  { titulo: "Validação na região", texto: "Testamos aqui e fazemos estudos em laboratório na região, com ensaios, relatórios e ART." },
  { titulo: "Formação", texto: "A Academia Orbital forma profissionais para aplicar os nossos materiais no padrão Orbital." },
];

/*
 * Mapa esquemático, em unidades do viewBox (1000 × 560). Geometria, não
 * desenho: o oceano vem centrado no Pacífico (Ásia à esquerda, América do Sul
 * à direita) para a viagem correr no sentido da leitura. Fora de escala, com
 * as costas muito simplificadas e só dois nomes reais, China e Manaus.
 */
const LARGURA = 1000;
/** Janela vertical do viewBox: corta as faixas vazias acima do arco e abaixo da obra. */
const TOPO = 50;
const ALTURA = 460;

/** Costa leste da Ásia (terra à esquerda). */
const COSTA_ASIA =
  "M96 0C128 52 176 64 190 104C202 138 168 150 176 178C186 214 232 232 238 272C244 312 214 336 196 364C178 392 150 400 156 436C162 472 196 500 184 560";
/** Norte e oeste da América do Sul (terra à direita e abaixo). */
const COSTA_AMERICA =
  "M720 560C700 480 664 420 660 360C656 300 640 220 664 168C700 150 740 140 780 146C830 154 860 176 900 184C930 190 944 200 952 206C966 216 984 214 1000 222";

/** Pontos da rota: partida e as seis paradas, uma por etapa. */
const PONTOS: [number, number][] = [
  [48, 150], // partida, no interior
  [112, 214], // curadoria: um fornecedor
  [200, 292], // fabricação: a fábrica parceira, perto da costa
  [952, 206], // importação: a chegada pelo mar
  [806, 252], // estoque em Manaus
  [842, 318], // validação na região
  [900, 372], // formação: a obra
];

/** Controles de cada trecho (curva cúbica do ponto n ao n + 1). */
const CONTROLES: [number, number, number, number][] = [
  [70, 180, 84, 206],
  [140, 222, 170, 262],
  [360, 30, 800, 20],
  [918, 222, 860, 226],
  [830, 268, 846, 292],
  [840, 344, 872, 368],
];

const TRECHOS = CONTROLES.map((c, i) => {
  const [x0, y0] = PONTOS[i];
  const [x1, y1] = PONTOS[i + 1];
  return { inicio: `M${x0} ${y0}`, curva: `C${c[0]} ${c[1]} ${c[2]} ${c[3]} ${x1} ${y1}` };
});
const ROTA = TRECHOS[0].inicio + TRECHOS.map((t) => t.curva).join("");

const ROTULOS = [
  { nome: "China", x: 58, y: 330, ancora: "inicio" as const },
  { nome: "Manaus", x: 806, y: 252, ancora: "fim" as const },
];

/** Suavização do traço e do brilho: um salto pedido pelo visitante desliza em vez de pular. */
const TAU_ROTA_MS = 200;
/** Deslize de um salto: dura o mesmo de qualquer distância, com a curva --mv-percurso. */
const DESLIZE_MS = 650;
/** Mudança de alvo num quadro acima disto é um salto (o autoplay anda ~0,005 por quadro no máximo). */
const SALTO_MINIMO = 0.02;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export default function Jornada() {
  const secaoRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const estadoRef = useRef<EstadoJornada>(estadoInicial());
  /** Liga o laço do relógio de novo quando algo muda com ele dormindo. */
  const acordarRef = useRef<() => void>(() => {});
  const [vista, setVista] = useState({ passo: 0, usuario: false });
  /**
   * Texto da região viva. Muda só quando o visitante troca de etapa (segmento,
   * setas, deslizar, próximo/anterior); o autoplay nunca mexe nele, então o
   * leitor de tela não ouve um anúncio a cada 4 s (padrão de carrossel da
   * WAI-ARIA). Fica "polite" sempre: desligar enquanto roda calaria o
   * deslizar, que solta a pausa do dedo no mesmo gesto.
   */
  const [anuncio, setAnuncio] = useState("");
  const gesto = useRef<{ x: number; y: number; id: number } | null>(null);

  /** Toda mudança passa por aqui: redutor, re-render só quando o passo ou o botão mudam. */
  const aplicar = (acao: AcaoJornada) => {
    const antes = estadoRef.current;
    const depois = reduzirJornada(antes, acao);
    if (depois === antes) return;
    estadoRef.current = depois;
    if (depois.passo !== antes.passo || depois.pausas.usuario !== antes.pausas.usuario) {
      setVista({ passo: depois.passo, usuario: depois.pausas.usuario });
    }
    if (acao.tipo !== "tick" && acao.tipo !== "pausa" && depois.passo !== antes.passo) {
      setAnuncio(ETAPAS[depois.passo].titulo);
    }
    acordarRef.current();
  };

  useEffect(() => {
    const secao = secaoRef.current;
    const svg = svgRef.current;
    if (!secao || !svg) return;

    // Escala inversa: pontos e paradas ficam com o mesmo tamanho em px em
    // qualquer largura, mesmo o mapa encolhendo no celular.
    const ro = new ResizeObserver(() => {
      const w = svg.getBoundingClientRect().width;
      if (w > 0) secao.style.setProperty("--jr-inv", (LARGURA / w).toFixed(4));
    });
    ro.observe(svg);

    const rota = svg.querySelector<SVGPathElement>(".jr-prevista")!;
    const ponto = svg.querySelector<SVGGElement>(".jr-ponto")!;
    const totalRota = rota.getTotalLength();

    // Prova real do offset-path em elemento SVG: um navegador pode aceitar a
    // propriedade (CSS.supports) e não aplicá-la ao <g>. Põe o ponto no meio da
    // rota e confere onde ele foi parar; se não estiver lá, o ponto passa a
    // andar por transform calculado aqui (getPointAtLength). Roda também com
    // movimento reduzido, para o ponto nunca ficar no canto (0, 0) do mapa.
    let pontoSemOffset = false;
    if (CSS.supports("offset-path", 'path("M 0 0")')) {
      ponto.style.offsetDistance = "50%";
      const esperado = rota.getPointAtLength(totalRota / 2);
      const m = svg.getScreenCTM();
      const caixa = ponto.getBoundingClientRect();
      if (m && caixa.width > 0) {
        const x = m.a * esperado.x + m.c * esperado.y + m.e;
        const y = m.b * esperado.x + m.d * esperado.y + m.f;
        pontoSemOffset = Math.hypot(caixa.x + caixa.width / 2 - x, caixa.y + caixa.height / 2 - y) > 6;
      }
      ponto.style.offsetDistance = "";
    } else {
      pontoSemOffset = true;
    }
    if (pontoSemOffset) {
      ponto.style.offsetPath = "none";
      ponto.style.display = "inline"; // vence o @supports que esconde o ponto sem offset-path
    }
    const colocarPonto = (fracao: number) => {
      const pt = rota.getPointAtLength(fracao * totalRota);
      return `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`;
    };

    // Movimento reduzido: rota inteira e lista estática, pelo CSS. Sem relógio.
    // O ponto fica na obra (no modo reserva, posto aqui).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (pontoSemOffset) ponto.setAttribute("transform", colocarPonto(1));
      return () => ro.disconnect();
    }

    // As costas se desenham na primeira vez que a seção entra. Só arma isso se
    // ela ainda não está na tela: quem recarrega no meio da página não vê o
    // mapa sumir e voltar. Sem JavaScript, nada fica escondido.
    const r0 = secao.getBoundingClientRect();
    if (r0.top >= window.innerHeight || r0.bottom <= 0) secao.setAttribute("data-jr-pronto", "");

    // Comprimento de cada trecho, para o ponto andar na mesma fração que o traço.
    const trechos = [...svg.querySelectorAll<SVGPathElement>("[data-jr-trecho]")];
    const comp = trechos.map((p) => p.getTotalLength());
    const total = comp.reduce((a, b) => a + b, 0) || 1;
    const acumulado = comp.map((_, i) => comp.slice(0, i).reduce((a, b) => a + b, 0));
    const paradas = [...svg.querySelectorAll<SVGGElement>("[data-jr-parada]")];

    let passoPintado = estadoRef.current.passo;
    let vis = rotaDesenhada(estadoRef.current);
    let alvoAnterior = vis;
    let deslize: { de: number; t: number } | null = null;
    let brilho = brilhoDaRota(estadoRef.current);
    const escritos: Record<string, string> = {};
    const escrever = (nome: string, valor: string) => {
      if (escritos[nome] !== valor) {
        secao.style.setProperty(nome, valor);
        escritos[nome] = valor;
      }
    };

    const pintar = () => {
      const e = estadoRef.current;
      escrever("--jr-passo", String(e.passo));
      escrever("--jr-p", progresso(e).toFixed(4));
      escrever("--jr-rota", vis.toFixed(5));
      escrever("--jr-brilho", brilho.toFixed(3));
      const pos = vis * TOTAL_PASSOS;
      const k = Math.min(Math.floor(pos), TOTAL_PASSOS - 1);
      const d = Math.min(Math.max((acumulado[k] + (pos - k) * comp[k]) / total, 0), 1);
      escrever("--jr-d", (d * 100).toFixed(3) + "%");
      if (pontoSemOffset) {
        const t = colocarPonto(d);
        if (escritos.ponto !== t) { ponto.setAttribute("transform", t); escritos.ponto = t; }
      }
      paradas.forEach((g, i) => {
        const chegou = pos >= i + 1 - 0.002;
        if (chegou !== g.hasAttribute("data-alcancado")) g.toggleAttribute("data-alcancado", chegou);
      });
    };

    const assinante = {
      tick(dt: number) {
        const antes = estadoRef.current;
        const e = reduzirJornada(antes, { tipo: "tick", dtMs: dt });
        if (e !== antes) {
          estadoRef.current = e;
          if (e.passo !== antes.passo) setVista((v) => ({ ...v, passo: e.passo }));
        }
        // Deu a volta (último → primeiro), pelo autoplay ou por "próximo" / um
        // segmento: a rota recomeça apagada e acende de novo, sem recolher à
        // vista. Compara com o último passo pintado, porque o salto do
        // visitante muda o estado fora do tick.
        const deuAVolta = passoPintado === TOTAL_PASSOS - 1 && e.passo === 0;
        passoPintado = e.passo;
        const alvo = rotaDesenhada(e);
        const alvoBrilho = brilhoDaRota(e);
        brilho = deuAVolta ? 0 : aproximar(brilho, alvoBrilho, dt, TAU_ROTA_MS, 0.002);
        // Alvo que pula (salto do visitante, ou a pausa assentando a etapa): um
        // deslize de duração fixa que pousa exato na parada, para o anel acender.
        // O autoplay muda o alvo aos poucos e segue na suavização exponencial.
        if (Math.abs(alvo - alvoAnterior) > SALTO_MINIMO) deslize = { de: vis, t: 0 };
        alvoAnterior = alvo;
        if (brilho < 0.02) {
          // Com o traço apagado, a rota pula direto ao alvo (a volta ao começo).
          vis = alvo;
          deslize = null;
        } else if (deslize) {
          deslize.t += dt;
          const k = Math.min(deslize.t / DESLIZE_MS, 1);
          vis = deslize.de + (alvo - deslize.de) * percurso(k);
          if (k >= 1) deslize = null;
        } else {
          vis = aproximar(vis, alvo, dt, TAU_ROTA_MS, 0.00005);
        }
        pintar();
        return !pausada(e) || vis !== alvo || brilho !== alvoBrilho || deslize !== null;
      },
    };

    pintar();
    const sair = relogio.assinar(assinante);
    acordarRef.current = () => relogio.acordar();

    // Só anda com 60% da seção na tela (ou com ela cobrindo 60% da tela, se for mais alta).
    const io = new IntersectionObserver(
      (entradas) => {
        const en = entradas[entradas.length - 1];
        const raiz = en.rootBounds?.height || window.innerHeight;
        const dentro = en.isIntersecting && (en.intersectionRatio >= 0.6 || en.intersectionRect.height >= raiz * 0.6);
        if (dentro) secao.setAttribute("data-jr-visto", "");
        aplicar({ tipo: "pausa", motivo: "foraDaTela", ativa: !dentro });
        // A página rolou com o cursor parado: não há pointerleave, então a
        // pausa de ponteiro sai aqui, junto com a seção.
        if (!dentro) aplicar({ tipo: "pausa", motivo: "ponteiro", ativa: false });
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    );
    io.observe(secao);

    return () => {
      sair();
      io.disconnect();
      ro.disconnect();
      acordarRef.current = () => {};
    };
  }, []);

  // ── Controles ────────────────────────────────────────────────────────────
  const aoTeclar = (ev: KeyboardEvent) => {
    if (ev.key === "ArrowRight") { ev.preventDefault(); aplicar({ tipo: "proximo" }); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); aplicar({ tipo: "anterior" }); }
  };
  /** Pausa de foco só para o teclado: um toque no botão não deixa a jornada parada para sempre. */
  const aoFocar = (ev: React.FocusEvent) => {
    aplicar({ tipo: "pausa", motivo: "foco", ativa: (ev.target as HTMLElement).matches(":focus-visible") });
  };
  const aoDesfocar = (ev: React.FocusEvent) => {
    if (!secaoRef.current?.contains(ev.relatedTarget as Node | null)) aplicar({ tipo: "pausa", motivo: "foco", ativa: false });
  };
  // Mouse: pausa em cima do texto e dos controles (o mapa ocupa meia tela e
  // pararia a jornada só por o cursor estar ali). Toque: pausa enquanto o dedo
  // está na seção. Arrastar de lado troca de etapa: com o dedo em qualquer
  // ponto fora dos botões; com o mouse, só sobre o mapa (no texto, arrastar é
  // selecionar).
  const mouseEntra = (ev: PointerEvent) => { if (ev.pointerType === "mouse") aplicar({ tipo: "pausa", motivo: "ponteiro", ativa: true }); };
  const mouseSai = (ev: PointerEvent) => { if (ev.pointerType === "mouse") aplicar({ tipo: "pausa", motivo: "ponteiro", ativa: false }); };
  const dedoDesce = (ev: PointerEvent) => {
    const alvo = ev.target as HTMLElement;
    if (alvo.closest("button")) return;
    if (ev.pointerType === "mouse" && !alvo.closest(".jr-mapa")) return;
    gesto.current = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    if (ev.pointerType !== "mouse") aplicar({ tipo: "pausa", motivo: "ponteiro", ativa: true });
  };
  const dedoSobe = (ev: PointerEvent) => {
    const g = gesto.current;
    gesto.current = null;
    if (ev.pointerType !== "mouse") aplicar({ tipo: "pausa", motivo: "ponteiro", ativa: false });
    if (!g || g.id !== ev.pointerId || ev.type === "pointercancel") return;
    const dx = ev.clientX - g.x;
    const dy = ev.clientY - g.y;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) aplicar({ tipo: dx < 0 ? "proximo" : "anterior" });
  };

  return (
    <section
      ref={secaoRef}
      aria-labelledby="jornada-titulo"
      className="jr relative bg-[#0B1F45] text-white ds-escuro overflow-hidden min-h-[100svh] flex items-center"
      onKeyDown={aoTeclar}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
    >
      {/*
        Grade com áreas: no celular e no tablet, título → mapa → palco; no
        computador, título e palco na coluna da esquerda e o mapa ocupando a
        altura toda à direita. O palco existe uma vez só no DOM.
      */}
      <div
        className="jr-grade ds-wrap w-full py-[clamp(2.25rem,7vh,6.5rem)] grid gap-y-8 sm:gap-y-10 [grid-template-areas:'cabeca'_'mapa'_'palco'] lg:[grid-template-areas:'cabeca_mapa'_'palco_mapa'] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16"
        onPointerDown={dedoDesce}
        onPointerUp={dedoSobe}
        onPointerCancel={dedoSobe}
      >
        <Revelar className="[grid-area:cabeca] max-w-2xl">
          <h2 id="jornada-titulo" className="font-serif text-t1 font-normal tracking-[-0.02em] text-balance">Da fábrica até a sua obra.</h2>
          <p className="mt-4 text-lead text-white/75 text-pretty">
            Fábrica, importação, estoque, testes e formação: cuidamos de cada etapa até o material chegar à obra.
          </p>
        </Revelar>

        {/* Palco: uma etapa por vez, com os controles. Some com movimento reduzido. */}
        <div className="jr-palco [grid-area:palco] lg:self-end" onPointerEnter={mouseEntra} onPointerLeave={mouseSai}>
          <Palco passo={vista.passo} usuario={vista.usuario} aplicar={aplicar} />
        </div>

        {/* A lista de verdade: lida por leitores de tela; visível com movimento reduzido. */}
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

        <div className="[grid-area:mapa] lg:self-center">
          <figure className="jr-mapa relative -mx-[clamp(1rem,4.2vw,4rem)] sm:mx-0" style={{ aspectRatio: `${LARGURA} / ${ALTURA}` }}>
            <svg ref={svgRef} viewBox={`0 ${TOPO} ${LARGURA} ${ALTURA}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden focusable="false">
              <defs>
                {/* Terra some nas bordas: o mapa é um recorte, não uma caixa. */}
                <radialGradient id="jr-borda" cx="50%" cy="50%" r="50%">
                  <stop offset="0.5" stopColor="#fff" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <mask id="jr-mascara" maskUnits="userSpaceOnUse" x="0" y={TOPO} width={LARGURA} height={ALTURA}>
                  <rect y={TOPO} width={LARGURA} height={ALTURA} fill="url(#jr-borda)" />
                </mask>
              </defs>

              <g mask="url(#jr-mascara)">
                <path d={`${COSTA_ASIA}L0 560L0 0Z`} className="jr-terra" />
                <path d={`${COSTA_AMERICA}L1000 560Z`} className="jr-terra" />
                <path d={COSTA_ASIA} pathLength={1} className="jr-costa" />
                <path d={COSTA_AMERICA} pathLength={1} className="jr-costa" />
              </g>

              {/* Rota prevista: pontilhado fino, sempre visível. */}
              <path d={ROTA} className="jr-prevista" />

              {/* Rota percorrida: um traço por trecho, cada um de 0 a 1. */}
              <g className="jr-viagem">
                {TRECHOS.map((t, i) => (
                  <path key={i} data-jr-trecho="" d={t.inicio + t.curva} pathLength={1} className="jr-traco" style={{ "--k": i } as Vars} />
                ))}
              </g>

              {PONTOS.slice(1).map(([x, y], i) => (
                <g key={i} data-jr-parada="" className="jr-parada" data-atual={vista.passo === i ? "" : undefined}>
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
                className={`jr-rotulo absolute text-sobre uppercase tracking-[0.18em] text-white/60 whitespace-nowrap ${r.ancora === "fim" ? "-translate-x-[calc(100%+0.875rem)] -translate-y-1/2" : "-translate-y-1/2"}`}
                style={{ left: `${(r.x / LARGURA) * 100}%`, top: `${((r.y - TOPO) / ALTURA) * 100}%` }}
              >
                {r.nome}
              </span>
            ))}
            <figcaption className="sr-only">Mapa esquemático, fora de escala, da rota da China até Manaus e até a obra.</figcaption>
          </figure>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{anuncio}</p>
    </section>
  );
}

/**
 * A etapa da vez e os controles. As seis etapas ficam empilhadas na mesma
 * célula da grade: a altura é a da maior, então a troca nunca empurra nada
 * (CLS zero), e a ativa entra em fusão sobre --mv-base.
 */
function Palco({ passo, usuario, aplicar }: { passo: number; usuario: boolean; aplicar: (a: AcaoJornada) => void }) {
  return (
    <>
      <div className="grid" aria-hidden>
        {ETAPAS.map((e, i) => (
          <div key={e.titulo} className="jr-etapa [grid-area:1/1]" data-ativa={i === passo ? "" : undefined}>
            <h3 className="font-serif text-t2 font-normal tracking-[-0.015em] text-white text-balance">{e.titulo}</h3>
            <p className="mt-3 text-corpo text-white/75 text-pretty max-w-[42ch]">{e.texto}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4 sm:gap-6">
        <div role="group" aria-label="Etapas da jornada" className="flex flex-1 gap-1.5">
          {ETAPAS.map((e, i) => (
            <button
              key={e.titulo}
              type="button"
              aria-label={`Passo ${i + 1} de ${TOTAL_PASSOS}: ${e.titulo}`}
              aria-current={i === passo ? "step" : undefined}
              onClick={() => aplicar({ tipo: "ir", passo: i })}
              className="jr-segmento group relative flex-1 min-h-11 cursor-pointer"
              style={{ "--i": i } as Vars}
            >
              <span className="jr-trilho absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white opacity-40 transition-opacity group-hover:opacity-65" />
              <span className="jr-enche absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white origin-left" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => aplicar({ tipo: "pausa", motivo: "usuario", ativa: !usuario })}
          className="inline-flex items-center gap-2 min-h-11 -mr-2 px-2 text-sobre uppercase tracking-[0.14em] font-semibold text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
        >
          {usuario ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M2 1.2v7.6L8.6 5z" fill="currentColor" /></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M2.25 1.5v7M7.75 1.5v7" stroke="currentColor" strokeWidth="1.5" /></svg>
          )}
          {usuario ? "Continuar" : "Pausar"}
        </button>
      </div>
    </>
  );
}
