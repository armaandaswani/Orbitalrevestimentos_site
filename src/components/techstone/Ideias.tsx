"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { FORMATOS, MODELOS_TECHSTONE, cena, type FormatoTechStone } from "@/lib/techstone";

interface Ideia {
  src: string;
  alt: string;
  titulo: string;
  modelo: string;
}

/**
 * Ideias de projeto com a TechStone. Todas as imagens são geradas por IA a
 * partir da textura de cada modelo (o modelo e o tamanho vêm do cadastro,
 * em lib/techstone). Arquivo novo = nome novo (cache de 1 ano).
 */
const IDEIAS: Ideia[] = [
  { src: "/images/techstone/ideias/casa-v1.webp", titulo: "Fachada de casa", modelo: "travertino-romano-classico",
    alt: "Casa contemporânea com a fachada em travertino bege em placas de 1200 por 600, gerada por IA a partir da textura TechStone Travertino Romano Clássico" },
  { src: "/images/techstone/ideias/hall-v1.webp", titulo: "Hall de edifício", modelo: "travertino-navona-classico",
    alt: "Hall de pé-direito duplo com parede em travertino em placas grandes, gerado por IA a partir da textura TechStone Travertino Navona Clássico" },
  { src: "/images/techstone/ideias/cozinha-v1.webp", titulo: "Ilha de cozinha curva", modelo: "taj-mahal",
    alt: "Ilha de cozinha com as pontas arredondadas revestidas em pedra creme, gerada por IA a partir da textura TechStone Taj Mahal" },
  { src: "/images/techstone/ideias/escada-v1.webp", titulo: "Parede da escada", modelo: "travertino-bianco-trevi",
    alt: "Escada curva com a parede acompanhando a curva em travertino claro, gerada por IA a partir da textura TechStone Travertino Bianco Trevi" },
  { src: "/images/techstone/ideias/loja-v1.webp", titulo: "Loja de esquina", modelo: "nogueira-americana",
    alt: "Loja com a esquina arredondada revestida em madeira escura, gerada por IA a partir da textura TechStone Nogueira Americana" },
  { src: cena("interior").mobile, titulo: "Sala", modelo: "taj-mahal",
    alt: "Sala com parede de canto curvo gerada por IA a partir da textura TechStone Taj Mahal" },
  { src: cena("coluna").mobile, titulo: "Coluna redonda", modelo: "travertino-bianco-trevi",
    alt: "Coluna redonda em travertino claro gerada por IA a partir da textura TechStone Travertino Bianco Trevi" },
  { src: cena("fachada").mobile, titulo: "Fachada comercial", modelo: "travertino-romano-classico",
    alt: "Fachada de edifício em travertino bege gerada por IA a partir da textura TechStone Travertino Romano Clássico" },
];

const modeloDe = (slug: string) => MODELOS_TECHSTONE.find((m) => m.slug === slug)!;
const formatoDe = (i: Ideia) => modeloDe(i.modelo).formato;
const rotuloFormato = (f: FormatoTechStone) => FORMATOS.find((x) => x.value === f)!.rotulo;

/** Faixas ao lado da ideia ativa no computador (no celular o CSS deixa só a primeira). */
const FAIXAS_MAX = 4;
/** Ritmo do autoplay: devagar o bastante para a foto assentar e o zoom andar. */
const PASSO_MS = 6000;
/** Depois de uma ação do visitante, a galeria espera mais antes de seguir sozinha. */
const ESPERA_MANUAL_MS = 12000;
const LIMIAR_ARRASTE_PX = 40;
const ZOOM_MS = 7000;
/** Hora atual, só chamada em eventos do visitante (nunca durante a renderização). */
const agora = () => Date.now();

/**
 * Tamanho do anel virtual de camadas. Cada camada só mostra a sua região por
 * clip-path, e a troca fica limpa quando as regiões nunca se cruzam: quem sai
 * fecha na borda esquerda, quem entra abre da direita. Para isso o anel
 * precisa de k camadas fechadas à esquerda e k à direita além da ativa e das
 * k faixas; com poucas ideias (filtro de 4) as fotos se repetem no anel, mas
 * as visíveis são sempre ideias diferentes.
 */
function tamanhoAnel(n: number) {
  const k = Math.min(FAIXAS_MAX, n - 1);
  return n * Math.ceil((3 * k + 1) / n);
}

/** Papel da camada pelo deslocamento `o` em relação à ativa (o CSS lê em data-pos). */
function posicao(o: number, k: number, m: number) {
  if (o === 0) return "ativo";
  if (o <= k) return `f${o}`;
  if (o >= m - k) return "esq";
  return "dir";
}

/** prefers-reduced-motion como estado externo (sem setState dentro de efeito). */
const consultaReduzir = () => window.matchMedia("(prefers-reduced-motion: reduce)");
const assinarReduzir = (avisar: () => void) => {
  const mq = consultaReduzir();
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
};

type Motivo = "mouse" | "toque" | "foco" | "fora" | "oculta";

const SETA = "w-11 h-11 flex items-center justify-center border border-[#22201C]/25 text-[#22201C] transition-colors hover:bg-[#22201C] hover:text-white cursor-pointer";

/**
 * Galeria cinematográfica: a ideia ativa ocupa quase todo o palco e as
 * próximas ficam como faixas que se abrem ao tocar, arrastar ou pelas setas.
 * Avança sozinha a cada 6 s e cede ao visitante: para com o mouse em cima,
 * com o dedo na tela, com o foco do teclado dentro, fora da tela, com a aba
 * escondida e com movimento reduzido.
 */
function Galeria({ lista, verTamanho, parado, setParado, ultimaAcaoRef }: {
  lista: Ideia[];
  verTamanho: (t: FormatoTechStone) => void;
  /** Pausa pedida pelo botão; fica no pai para sobreviver à troca de filtro. */
  parado: boolean;
  setParado: (fn: (p: boolean) => boolean) => void;
  /** Hora da última ação do visitante (o filtro também conta). */
  ultimaAcaoRef: RefObject<number>;
}) {
  const n = lista.length;
  const m = tamanhoAnel(n);
  const k = Math.min(FAIXAS_MAX, n - 1);
  const [{ v, antes }, setEstado] = useState({ v: 0, antes: -1 });
  const [pausas, setPausas] = useState<Record<Motivo, boolean>>({ mouse: false, toque: false, foco: false, fora: true, oculta: false });
  const [anuncio, setAnuncio] = useState("");
  /** O primeiro zoom espera a galeria aparecer, para não terminar antes de alguém ver. */
  const [visto, setVisto] = useState(false);
  const reduzido = useSyncExternalStore(assinarReduzir, () => consultaReduzir().matches, () => false);

  const raiz = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const camadas = useRef<(HTMLButtonElement | null)[]>([]);
  const fotos = useRef<(HTMLImageElement | null)[]>([]);
  const arraste = useRef<{ x: number; y: number } | null>(null);
  const arrastou = useRef(false);
  const focarAtivo = useRef(false);
  const zoomAnterior = useRef(-1);

  const pausar = useCallback((motivo: Motivo, valor: boolean) =>
    setPausas((p) => (p[motivo] === valor ? p : { ...p, [motivo]: valor })), []);

  /** Troca por ação do visitante: anuncia o título e adia o autoplay. */
  const irPara = (novo: number, focar = false) => {
    const alvo = ((novo % m) + m) % m;
    ultimaAcaoRef.current = agora();
    setEstado((e) => (e.v === alvo ? e : { v: alvo, antes: e.v }));
    setAnuncio(lista[alvo % n].titulo);
    focarAtivo.current = focar;
  };

  // Aba escondida e menos de 60% do palco na tela também pausam.
  useEffect(() => {
    const aba = () => pausar("oculta", document.hidden);
    document.addEventListener("visibilitychange", aba);
    const io = new IntersectionObserver(([e]) => {
      const dentro = e.intersectionRatio >= 0.6;
      pausar("fora", !dentro);
      if (dentro) setVisto(true);
    }, { threshold: [0, 0.6] });
    if (palco.current) io.observe(palco.current);
    return () => { document.removeEventListener("visibilitychange", aba); io.disconnect(); };
  }, [pausar]);

  const pausado = parado || reduzido || n < 2 || Object.values(pausas).some(Boolean);

  // Autoplay: um passo por vez, reagendado a cada troca. Depois de uma ação,
  // o próximo passo só vem 12 s depois dela (e nunca antes de 6 s).
  useEffect(() => {
    if (pausado) return;
    const prazo = Math.max(PASSO_MS, ESPERA_MANUAL_MS - (Date.now() - ultimaAcaoRef.current));
    const t = window.setTimeout(() => setEstado((e) => ({ v: (e.v + 1) % m, antes: e.v })), prazo);
    return () => window.clearTimeout(t);
  }, [pausado, v, m, ultimaAcaoRef]);

  // Zoom lento só na foto ativa, recomeçando a cada troca. Web Animations em
  // vez de animação CSS: a foto que sai volta à escala 1 junto com o recorte,
  // sem salto. No nível leve e com movimento reduzido não há zoom (o CSS
  // também garante, com !important).
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const lento = parseFloat(css.getPropertyValue("--mv-lento")) || 900;
    const percurso = css.getPropertyValue("--mv-percurso").trim() || "ease-in-out";
    const antiga = zoomAnterior.current !== v ? fotos.current[zoomAnterior.current] : null;
    if (antiga) {
      const escala = getComputedStyle(antiga).transform;
      antiga.getAnimations().forEach((a) => a.cancel());
      if (!reduzido && escala !== "none") antiga.animate([{ transform: escala }, { transform: "none" }], { duration: lento, easing: percurso });
    }
    zoomAnterior.current = v;
    const foto = fotos.current[v];
    if (!foto) return;
    foto.getAnimations().forEach((a) => a.cancel());
    if (!visto || reduzido || document.documentElement.dataset.mvNivel === "leve") return;
    foto.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }], { duration: ZOOM_MS, easing: "linear", fill: "forwards" });
  }, [v, reduzido, visto]);

  // Pelo teclado, o foco acompanha a ideia ativa (a camada focada pode fechar).
  useEffect(() => {
    if (!focarAtivo.current) return;
    focarAtivo.current = false;
    camadas.current[v]?.focus({ preventScroll: true });
  }, [v]);

  const teclar = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const naCamada = camadas.current.includes(document.activeElement as HTMLButtonElement);
    irPara(v + (e.key === "ArrowRight" ? 1 : -1), naCamada);
  };

  // O dedo (ou o botão do mouse) apertado pausa até soltar, mesmo fora da galeria.
  const apertar = () => {
    pausar("toque", true);
    const soltar = () => {
      pausar("toque", false);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  };

  /** Arrastar de lado: 40 px na horizontal, mais que na vertical. Para a esquerda = próxima. */
  const soltarNoPalco = (e: React.PointerEvent) => {
    const ini = arraste.current;
    arraste.current = null;
    if (!ini) return;
    const dx = e.clientX - ini.x;
    const dy = e.clientY - ini.y;
    if (Math.abs(dx) < LIMIAR_ARRASTE_PX || Math.abs(dy) > Math.abs(dx)) return;
    // O clique que o navegador dispara logo depois do arraste não conta.
    arrastou.current = true;
    window.setTimeout(() => { arrastou.current = false; }, 0);
    irPara(v + (dx < 0 ? 1 : -1));
  };

  const atual = lista[v % n];
  const anterior = antes >= 0 && antes % n !== v % n ? lista[antes % n] : null;

  return (
    <div ref={raiz} role="group" aria-label="Ideias com TechStone" onKeyDown={teclar} className="mv-brilho-fonte"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") pausar("mouse", true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") pausar("mouse", false); }}
      onPointerDown={apertar}
      onFocus={(e) => { if ((e.target as HTMLElement).matches(":focus-visible")) pausar("foco", true); }}
      onBlur={(e) => { if (!raiz.current?.contains(e.relatedTarget as Node | null)) pausar("foco", false); }}>
      <div ref={palco} style={{ "--ts-k": Math.max(k, 1) } as CSSProperties}
        className="ts-galeria-palco aspect-[4/5] max-h-[78svh] md:aspect-auto md:h-[min(78svh,58vw)]"
        onPointerDown={(e) => { if (e.isPrimary) arraste.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={soltarNoPalco}
        onPointerCancel={() => { arraste.current = null; }}>
        {Array.from({ length: m }, (_, i) => {
          const ideia = lista[i % n];
          const o = (i - v + m) % m;
          return (
            <button key={i} type="button" ref={(el) => { camadas.current[i] = el; }}
              className="ts-galeria-camada mv-brilho" data-cursor="ver" data-pos={posicao(o, k, m)}
              data-vizinho={o === 1 || o === m - 1 ? "" : undefined}
              tabIndex={o === 0 ? 0 : -1} aria-current={o === 0 ? "true" : undefined}
              aria-label={`${ideia.titulo} em ${modeloDe(ideia.modelo).nome}, ${rotuloFormato(formatoDe(ideia))}`}
              onClick={() => {
                if (arrastou.current) return;
                if (o === 0) verTamanho(formatoDe(ideia));
                else irPara(v + o);
              }}>
              <span className="ts-galeria-quadro">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={(el) => { fotos.current[i] = el; }} src={ideia.src} alt={ideia.alt}
                  loading="lazy" decoding="async" draggable={false} className="ts-galeria-foto" />
              </span>
              <span aria-hidden className="ts-galeria-veu" />
              <span aria-hidden className="ts-galeria-anel" />
            </button>
          );
        })}
      </div>

      <div className="mt-5 md:mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 md:gap-x-6 gap-y-1">
        {/* Legenda em fusão: a anterior apaga enquanto a nova sobe 8 px. */}
        <div className="col-span-2 md:col-span-1 grid">
          {anterior && <Legenda key={`s${v}`} ideia={anterior} classe="ts-galeria-sai" oculta />}
          <Legenda key={`e${v}`} ideia={atual} classe={antes >= 0 ? "ts-galeria-entra" : ""} />
        </div>
        <button type="button" onClick={() => verTamanho(formatoDe(atual))}
          className="justify-self-start md:col-start-1 md:row-start-2 min-h-11 whitespace-nowrap inline-flex items-center gap-2 text-legenda font-semibold text-[#22201C] underline underline-offset-4 decoration-[#22201C]/30 hover:decoration-[#22201C] transition-colors cursor-pointer">
          Ver este tamanho
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className="mv-seta"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <div className="flex items-center gap-2 md:col-start-2 md:row-start-1 md:row-span-2 md:self-end">
          {!reduzido && n > 1 && (
            <button type="button" onClick={() => setParado((p) => !p)}
              className="min-h-11 min-w-[5.25rem] px-2 text-right text-legenda font-semibold text-[#22201C] underline-offset-4 decoration-[#22201C]/40 hover:underline cursor-pointer">
              {parado ? "Continuar" : "Pausar"}
            </button>
          )}
          <button type="button" className={SETA} onClick={() => irPara(v - 1)} aria-label="Ideia anterior">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" className={SETA} onClick={() => irPara(v + 1)} aria-label="Próxima ideia">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* Só fala depois de uma ação do visitante; o autoplay fica em silêncio. */}
      <p aria-live="polite" className="sr-only">{anuncio}</p>
    </div>
  );
}

/** Título, modelo e tamanho de uma ideia. A que sai fica escondida dos leitores de tela. */
function Legenda({ ideia, classe, oculta = false }: { ideia: Ideia; classe: string; oculta?: boolean }) {
  return (
    <div className={`[grid-area:1/1] ${classe}`} aria-hidden={oculta || undefined}>
      <p className="font-serif text-t3 text-[#22201C]">{ideia.titulo}</p>
      <p className="mt-1 text-legenda text-[#6B6158]">
        {modeloDe(ideia.modelo).nome} · <span className="tabular-nums">{rotuloFormato(formatoDe(ideia))}</span>
      </p>
    </div>
  );
}

export default function Ideias({ verTamanho }: {
  /** Leva o visitante à seção de tamanhos já no tamanho da ideia. */
  verTamanho: (t: FormatoTechStone) => void;
}) {
  const [filtro, setFiltro] = useState<FormatoTechStone | "todos">("todos");
  const [parado, setParado] = useState(false);
  const ultimaAcaoRef = useRef(0);
  const lista = IDEIAS.filter((i) => filtro === "todos" || modeloDe(i.modelo).formato === filtro);
  const opcoes: { value: FormatoTechStone | "todos"; rotulo: string }[] = [
    { value: "todos", rotulo: "Todas" },
    ...FORMATOS.map((f) => ({ value: f.value, rotulo: f.rotulo })),
  ];

  return (
    <section aria-labelledby="ts-ideias" className="bg-[#F6F3EE] ds-secao overflow-clip">
      <div className="ds-wrap">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 id="ts-ideias" className="font-serif text-t1 text-[#22201C]">Ideias para o seu projeto.</h2>
            <p className="mt-3 text-corpo text-[#4A4540] max-w-[46ch]">
              Toque numa ideia para ver o tamanho e os modelos.
            </p>
          </div>
          <div role="group" aria-label="Filtrar por tamanho" className="flex gap-2 overflow-x-auto scrollbar-none -mx-[clamp(1rem,4.2vw,4rem)] px-[clamp(1rem,4.2vw,4rem)] md:mx-0 md:px-0">
            {opcoes.map((o) => (
              <button key={o.value} type="button" aria-pressed={filtro === o.value}
                onClick={() => { ultimaAcaoRef.current = agora(); setFiltro(o.value); }}
                className={`shrink-0 min-h-11 px-4 rounded-full border text-legenda font-semibold transition-colors ${
                  filtro === o.value ? "bg-[#22201C] border-[#22201C] text-white" : "border-[#22201C]/20 text-[#22201C] hover:border-[#22201C]/50"
                }`}>
                {o.rotulo}
              </button>
            ))}
          </div>
        </div>

        {/* Trocar o filtro remonta a galeria: volta à primeira ideia sem varrer as camadas. */}
        {lista.length > 0 && (
          <Galeria key={filtro} lista={lista} verTamanho={verTamanho} parado={parado} setParado={setParado} ultimaAcaoRef={ultimaAcaoRef} />
        )}
      </div>
    </section>
  );
}
