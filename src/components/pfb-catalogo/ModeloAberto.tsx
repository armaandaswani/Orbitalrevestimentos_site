"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import ContatoCta from "@/components/ContatoCta";
import Lupa from "@/components/movimento/Lupa";
import { urlOtimizada } from "@/lib/movimento/lente";
import { productQrUrl, productUrl } from "@/lib/product-link";

export interface ModeloCatalogo {
  code: string;
  name: string;
  linha: "Classic" | "Brilliance" | "Elegance";
  description: string;
  image_path: string;
  // Textura plana (subida no painel): o arquivo que o arquiteto baixa para o 3D.
  render_texture_path?: string | null;
}

const FICHA = [
  { label: "Espessura", value: "5 mm" },
  { label: "Dimensão", value: "1,20 × 2,90 m" },
  { label: "Área/placa", value: "3,48 m²" },
];

const ATRIBUTOS = [
  {
    texto: "Resistente a mofo e cupim",
    icone: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  },
  {
    texto: "Sem formaldeído",
    icone: <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>,
  },
  {
    texto: "Não propaga chamas",
    icone: <path d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z" />,
  },
  {
    texto: "Pronta-entrega em Manaus",
    icone: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>,
  },
];

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([tabindex="-1"]), textarea, select, [tabindex]:not([tabindex="-1"])';

/** Gesto mais longo que isso sem andar é o "segurar" da Lupa, não um deslize. */
const SEGURAR_MS = 240;

const Seta = ({ lado }: { lado: "esq" | "dir" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d={lado === "esq" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
  </svg>
);

const Xis = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

/**
 * Modelo do catálogo aberto em tela cheia.
 *
 * A foto ocupa a altura inteira; atrás, a mesma foto desfocada preenche o resto
 * da tela. As outras fotos passam ao deslizar (a foto acompanha o dedo), pelas
 * setas ou pela fileira de miniaturas. Sobre a foto ficam só a linha, o nome,
 * "Falar com um consultor" e "Detalhes". A ficha, a textura, o QR e o
 * compartilhar estão no painel "Detalhes", que sobe por cima da foto.
 *
 * Quem abre, fecha e troca de modelo é a página (a URL ?modelo= é dela). Aqui
 * ficam o teclado (Esc fecha primeiro o painel, depois o modelo; setas trocam a
 * foto e, no fim das fotos, o modelo) e o foco preso dentro do diálogo.
 *
 * O painel fica sempre montado (inerte quando fechado): assim o texto da ficha
 * existe no diálogo para o leitor de tela e para o verificador do PFB.
 */
export default function ModeloAberto({
  modelo, fotos, foto, setFoto, material, posicao, total, anterior, proximo, fechar, quebrou,
}: {
  modelo: ModeloCatalogo;
  /** Fotos que carregam, capa primeiro (as quebradas já saíram). */
  fotos: string[];
  foto: number;
  setFoto: (i: number) => void;
  /** "1,20 × 2,90 m × 5 mm · Mármore fosco" */
  material: string;
  /** Posição do modelo na lista filtrada (base 0) e o tamanho dela. */
  posicao: number;
  total: number;
  anterior?: () => void;
  proximo?: () => void;
  fechar: () => void;
  quebrou: (url: string) => void;
}) {
  const raizRef = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const detalhesRef = useRef<HTMLButtonElement>(null);
  const tiraRef = useRef<HTMLDivElement>(null);

  const [detalhes, setDetalhes] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // Deslocamento do dedo, em px, enquanto arrasta a foto.
  const [arrasto, setArrasto] = useState(0);
  const toque = useRef<{ x: number; y: number; t: number; eixo: null | "x" | "y" | "lupa" } | null>(null);

  // Outro modelo: o painel fecha e o QR some (ajuste durante o render, sem efeito).
  const [codigoAntes, setCodigoAntes] = useState(modelo.code);
  if (codigoAntes !== modelo.code) {
    setCodigoAntes(modelo.code);
    setDetalhes(false);
    setMostrarQr(false);
    setCopiado(false);
  }

  const n = fotos.length;
  const atual = fotos[foto] ?? fotos[0];

  /**
   * Como cada foto ocupa a tela. A regra é a altura inteira: foto mais estreita
   * que a tela fica inteira, com o fundo desfocado nos lados (contain). Foto mais
   * larga que a tela preenche a altura e perde as bordas (cover), desde que
   * sobre pelo menos 55% da largura dela; mais larga que isso (um ambiente
   * deitado no celular), fica inteira na largura, com o fundo em cima e embaixo.
   * Até a foto carregar a proporção é desconhecida e ela fica transparente.
   */
  const [proporcoes, setProporcoes] = useState<Record<string, number>>({});
  const [tela, setTela] = useState(() => window.innerWidth / window.innerHeight);
  useEffect(() => {
    const medirTela = () => setTela(window.innerWidth / window.innerHeight);
    window.addEventListener("resize", medirTela);
    return () => window.removeEventListener("resize", medirTela);
  }, []);
  const medir = useCallback((url: string, img: HTMLImageElement) => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const p = img.naturalWidth / img.naturalHeight;
    setProporcoes((m) => (m[url] === p ? m : { ...m, [url]: p }));
  }, []);
  const ajuste = (url: string): "cobrir" | "conter" | null => {
    const p = proporcoes[url];
    if (!p) return null;
    return p > tela && tela / p >= 0.55 ? "cobrir" : "conter";
  };

  const abrirDetalhes = useCallback(() => {
    setDetalhes(true);
    requestAnimationFrame(() => painelRef.current?.querySelector<HTMLElement>("[data-foco-inicial]")?.focus({ preventScroll: true }));
  }, []);
  const fecharDetalhes = useCallback(() => {
    setDetalhes(false);
    requestAnimationFrame(() => detalhesRef.current?.focus({ preventScroll: true }));
  }, []);

  // Ao abrir, o foco vai para o "Fechar" (o leitor de tela anuncia o diálogo pelo título).
  useEffect(() => {
    fecharRef.current?.focus({ preventScroll: true });
  }, []);

  /**
   * Teclado. Se outro diálogo modal está por cima (a folha do consultor), ele
   * é quem responde: este não fecha nem prende o Tab enquanto isso.
   */
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const raiz = raizRef.current;
      if (!raiz) return;
      const outro = [...document.querySelectorAll('[aria-modal="true"]')].some((d) => d !== raiz && !raiz.contains(d));
      if (outro) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (detalhes) fecharDetalhes();
        else fechar();
        return;
      }
      if (e.key === "Tab") {
        const area = detalhes ? painelRef.current ?? raiz : raiz;
        const alvos = [...area.querySelectorAll<HTMLElement>(FOCAVEIS)]
          .filter((el) => el.getClientRects().length > 0 && !el.closest("[inert]") && getComputedStyle(el).visibility !== "hidden");
        if (!alvos.length) return;
        const ativo = document.activeElement as HTMLElement | null;
        const primeiro = alvos[0];
        const ultimo = alvos[alvos.length - 1];
        if (!ativo || !area.contains(ativo)) { e.preventDefault(); primeiro.focus(); }
        else if (e.shiftKey && ativo === primeiro) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus(); }
        return;
      }
      if (detalhes) return;
      if (e.key === "ArrowRight") {
        if (foto < n - 1) setFoto(foto + 1);
        else proximo?.();
      }
      if (e.key === "ArrowLeft") {
        if (foto > 0) setFoto(foto - 1);
        else anterior?.();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [detalhes, fecharDetalhes, fechar, foto, n, setFoto, proximo, anterior]);

  // A miniatura da foto atual fica visível na fileira (rola só a fileira, nunca a página).
  useEffect(() => {
    const tira = tiraRef.current;
    const mini = tira?.querySelector<HTMLElement>(`[data-indice="${foto}"]`);
    if (!tira || !mini) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alvo = mini.offsetLeft - tira.clientWidth / 2 + mini.offsetWidth / 2;
    tira.scrollTo({ left: Math.max(0, alvo), behavior: reduzido ? "auto" : "smooth" });
  }, [foto, n]);

  // Deslize: só conta um gesto claramente horizontal; parado no começo é a Lupa.
  const aoTocar = (e: TouchEvent) => {
    if (e.touches.length > 1) { toque.current = null; return; }
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), eixo: null };
  };
  const aoMover = (e: TouchEvent) => {
    const t = toque.current;
    if (!t || t.eixo === "y" || t.eixo === "lupa") return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (t.eixo === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        if (Date.now() - t.t > SEGURAR_MS) t.eixo = "lupa";
        return;
      }
      t.eixo = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
    }
    if (t.eixo !== "x") return;
    // Nas pontas a foto resiste: anda um terço do dedo.
    const ponta = (dx > 0 && foto === 0) || (dx < 0 && foto === n - 1);
    setArrasto(ponta ? dx / 3 : dx);
  };
  const aoSoltar = (e: TouchEvent) => {
    const t = toque.current;
    toque.current = null;
    setArrasto(0);
    if (!t || t.eixo === "y" || t.eixo === "lupa") return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && foto < n - 1) setFoto(foto + 1);
      else if (dx > 0 && foto > 0) setFoto(foto - 1);
    }
  };

  const baixarTextura = async () => {
    // A textura plana é o que o arquiteto quer; sem ela, vai a foto mostrada.
    const url = modelo.render_texture_path?.trim() || atual || modelo.image_path;
    const base = `Orbital_${modelo.code}_${modelo.name}_textura`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
    // Baixa o arquivo para o download funcionar fora do domínio (o atributo
    // `download` é ignorado em outra origem); se falhar, abre o arquivo.
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const a = document.createElement("a");
      a.href = obj; a.download = `${base}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(obj), 1000);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  };

  const compartilhar = async () => {
    const link = productUrl(modelo.code);
    // No celular, o menu nativo; no computador, a área de transferência.
    if (navigator.share) {
      try { await navigator.share({ title: `${modelo.name}, Orbital Revestimentos`, url: link }); return; } catch { /* cancelado */ }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { window.prompt("Copie o link do modelo:", link); }
  };

  const botaoRedondo =
    "pointer-events-auto inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/55 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      ref={raizRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-modelo-titulo"
      data-teste="modal-modelo"
      className="fixed inset-0 z-[100] h-[100dvh] overflow-hidden overscroll-none bg-[#0d0d0d] text-white"
    >
      {/* Fundo: a própria foto desfocada. 64 px bastam, está borrada e escurecida. */}
      {atual && (
        <div aria-hidden className="absolute inset-0 overflow-clip">
          <Image
            key={"fundo-" + atual}
            src={atual}
            alt=""
            fill
            sizes="64px"
            quality={30}
            className="object-cover scale-125 blur-2xl opacity-60 select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>
      )}

      {/* Palco: a fileira de fotos anda de uma em uma. Só a atual e as vizinhas
          carregam. overflow-clip: a fileira larga não vira rolagem do diálogo. */}
      <div
        data-teste="foto-modelo"
        inert={detalhes}
        className="absolute inset-0 h-[100dvh] overflow-clip touch-pan-y select-none"
        onTouchStart={aoTocar}
        onTouchMove={aoMover}
        onTouchEnd={aoSoltar}
        onTouchCancel={() => { toque.current = null; setArrasto(0); }}
      >
        <div
          className={`flex h-full w-full ${arrasto ? "" : "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"}`}
          style={{ transform: `translate3d(calc(${-foto * 100}% + ${arrasto}px), 0, 0)` }}
        >
          {fotos.map((url, i) => (
            <div key={url} className="relative h-full w-full flex-none" aria-hidden={i !== foto}>
              {Math.abs(i - foto) <= 1 && (
                // Lupa: a foto 2,5× maior sob o mouse ou ao segurar o dedo, na versão
                // de 1920 px do next/image (o original pesa vários MB).
                <Lupa fonte={urlOtimizada(url)} ajuste={ajuste(url) === "cobrir" ? "cobrir" : "conter"} className="absolute inset-0 block">
                  <Image
                    src={url}
                    alt={i === foto ? `${modelo.name}, foto ${i + 1} de ${n}` : ""}
                    data-texto-banco
                    fill
                    sizes="100vw"
                    quality={85}
                    priority={i === foto}
                    className={`${ajuste(url) === "cobrir" ? "object-cover" : "object-contain"} transition-opacity duration-300 motion-reduce:transition-none ${
                      ajuste(url) ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={(e) => medir(url, e.currentTarget)}
                    onError={() => quebrou(url)}
                  />
                </Lupa>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Faixa de cima: trocar de modelo e fechar. */}
      <div inert={detalhes} className="absolute inset-x-0 top-0 z-20 pointer-events-none bg-gradient-to-b from-black/45 to-transparent">
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-6">
          <div className="flex items-center gap-1">
            <button type="button" onClick={anterior} disabled={!anterior} aria-label="Modelo anterior"
              className={`${botaoRedondo} disabled:opacity-30 disabled:pointer-events-none`}>
              <Seta lado="esq" />
            </button>
            <span className="min-w-[4.5rem] text-center text-legenda text-white/85 tabular-nums">
              {posicao + 1} de {total}
            </span>
            <button type="button" onClick={proximo} disabled={!proximo} aria-label="Próximo modelo"
              className={`${botaoRedondo} disabled:opacity-30 disabled:pointer-events-none`}>
              <Seta lado="dir" />
            </button>
          </div>
          <button ref={fecharRef} type="button" onClick={() => fechar()} aria-label="Fechar" className={botaoRedondo}>
            <Xis />
          </button>
        </div>
      </div>

      {/* Setas das fotos, no meio da altura. */}
      {n > 1 && (
        <div inert={detalhes} className="absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 flex justify-between px-2 sm:px-6 pointer-events-none">
          <button type="button" onClick={() => setFoto(foto - 1)} disabled={foto === 0} aria-label="Foto anterior"
            className={`${botaoRedondo} disabled:opacity-0`}>
            <Seta lado="esq" />
          </button>
          <button type="button" onClick={() => setFoto(foto + 1)} disabled={foto >= n - 1} aria-label="Próxima foto"
            className={`${botaoRedondo} disabled:opacity-0`}>
            <Seta lado="dir" />
          </button>
        </div>
      )}

      {/* Base: linha, nome, consultor e Detalhes sobre um véu; embaixo, as miniaturas. */}
      <div inert={detalhes} className="absolute inset-x-0 bottom-0 z-20 pointer-events-none bg-gradient-to-t from-black/80 via-black/45 to-transparent pt-28">
        <div className="px-4 sm:px-8 lg:px-12 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div data-teste="linha-consultor" className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-3 max-w-2xl">
            <p className="basis-full text-legenda text-white/80">
              Linha {modelo.linha} · <span data-texto-banco>{modelo.code}</span>
            </p>
            <h2 id="modal-modelo-titulo" data-texto-banco
              className="basis-full -mt-1 font-serif font-normal text-white text-[clamp(1.75rem,1.25rem+2.2vw,3rem)] leading-[1.08] tracking-[-0.01em] text-balance">
              {modelo.name}
            </h2>
            {/* SEM PREÇO no site público (decisão do dono, out/2026): o cliente fala
                com o consultor pelo WhatsApp já dizendo qual revestimento quer. */}
            <ContatoCta
              origem="catalogo-modelo"
              produtos={[{ code: modelo.code, name: modelo.name, linha: modelo.linha, image: modelo.image_path }]}
              className="ds-botao ds-botao-claro min-h-12 px-5 gap-2 grow sm:grow-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              Falar com um consultor
            </ContatoCta>
            <button ref={detalhesRef} type="button" onClick={abrirDetalhes}
              aria-expanded={detalhes} aria-controls="modelo-detalhes"
              className="ds-botao ds-botao-linha min-h-12 px-5 grow sm:grow-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Detalhes
            </button>
          </div>

          {n > 1 && (
            <div ref={tiraRef} data-teste="miniaturas-modal"
              className="pointer-events-auto relative mt-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-1.5 py-0.5">
                {fotos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    data-indice={i}
                    onClick={() => setFoto(i)}
                    aria-label={`Foto ${i + 1} de ${n}`}
                    aria-current={i === foto ? "true" : undefined}
                    // relative: a Image com fill precisa deste botão como caixa.
                    className={`relative flex-none w-10 h-10 lg:w-12 lg:h-12 overflow-hidden border transition-opacity motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white ${
                      i === foto ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    <Image src={url} alt="" fill sizes="48px" className="object-cover" onError={() => quebrou(url)} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{n > 1 ? `Foto ${foto + 1} de ${n}` : ""}</p>

      {/* Véu do painel: tocar fora fecha os detalhes. */}
      <div
        aria-hidden
        onClick={fecharDetalhes}
        className={`absolute inset-0 z-30 bg-black/45 transition-opacity duration-300 motion-reduce:transition-none ${detalhes ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Painel "Detalhes": sobe por cima da foto. Fechado, fica inerte e fora da tela. */}
      <div
        ref={painelRef}
        id="modelo-detalhes"
        role="region"
        aria-labelledby="modelo-detalhes-titulo"
        data-teste="painel-detalhes"
        inert={!detalhes}
        className={`absolute inset-x-0 bottom-0 z-40 flex max-h-[88dvh] flex-col bg-[#F6F5F2] text-[#0B1F45] lg:left-auto lg:w-[460px] lg:max-h-[min(88dvh,820px)] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          // Abrindo, fica visível no mesmo quadro (para receber o foco); fechando,
          // a visibilidade espera o fim da descida.
          detalhes ? "translate-y-0 visible transition-transform" : "translate-y-full invisible transition-[transform,visibility]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e2e0da] px-5 pt-5 pb-4 lg:px-7">
          <div className="min-w-0">
            <p id="modelo-detalhes-titulo" tabIndex={-1} data-foco-inicial className="text-sobre tracking-[0.14em] uppercase font-semibold text-[#74777f] focus:outline-none">
              Detalhes
            </p>
            <h3 data-texto-banco className="mt-1 font-serif font-normal text-t3 leading-snug">{modelo.name}</h3>
          </div>
          <button type="button" onClick={fecharDetalhes} aria-label="Fechar detalhes"
            className="-mr-2 -mt-1 inline-flex flex-none items-center justify-center w-11 h-11 text-[#0B1F45] hover:bg-[#ebe9e3] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
            <Xis />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-7">
          <p className="text-legenda text-[#43474e]">
            Linha {modelo.linha} · <span data-texto-banco>{modelo.code}</span>
          </p>
          <p className="mt-1 text-legenda text-[#43474e]">{material}</p>

          {modelo.description && (
            <p data-texto-banco className="mt-4 text-[0.9375rem] leading-relaxed text-[#43474e] text-pretty">{modelo.description}</p>
          )}

          {/* Ficha em linhas (rótulo e valor): cabe em 320 px sem quebrar a medida. */}
          <dl className="mt-5 border-t border-[#e2e0da]">
            {FICHA.map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-4 border-b border-[#e2e0da] py-2.5">
                <dt className="text-legenda text-[#74777f]">{label}</dt>
                <dd className="text-[0.9375rem] tabular-nums whitespace-nowrap">{value}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            {ATRIBUTOS.map(({ texto, icone }) => (
              <li key={texto} className="flex items-start gap-2 text-legenda text-[#0B1F45]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="mt-0.5 flex-none">
                  {icone}
                </svg>
                <span>{texto}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-legenda text-[#43474e]">Valores e condições com o nosso consultor.</p>

          <button type="button" onClick={baixarTextura}
            className="ds-botao ds-botao-vazado mt-5 w-full min-h-12 gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar textura
          </button>

          <div className="mt-2 flex items-center justify-center gap-2">
            <button type="button" onClick={() => setMostrarQr((v) => !v)} aria-expanded={mostrarQr}
              className="min-h-11 inline-flex items-center gap-1.5 px-2 text-legenda text-[#43474e] hover:text-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
              </svg>
              {mostrarQr ? "Ocultar QR Code" : "Ver QR Code"}
            </button>
            <span aria-hidden className="text-[#d5d3cd]">|</span>
            <button type="button" onClick={compartilhar}
              className="min-h-11 inline-flex items-center gap-1.5 px-2 text-legenda text-[#43474e] hover:text-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
              </svg>
              {copiado ? "Link copiado" : "Compartilhar modelo"}
            </button>
          </div>

          {mostrarQr && (
            <div data-teste="qr-modelo" className="mt-3 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productQrUrl(modelo.code, "svg", 512)}
                alt={`QR Code do modelo ${modelo.name} (${modelo.code})`}
                data-texto-banco
                className="w-40 h-40 border border-[#e2e0da] bg-white"
              />
              <p className="mt-2 text-sobre text-[#74777f] text-center">
                Aponte a câmera para abrir este modelo · <span data-texto-banco>{modelo.code}</span>
              </p>
            </div>
          )}

          <p className="mt-5 text-sobre text-[#8a8d93]">
            {posicao + 1} de {total} modelos{n > 1 && ` · ${n} fotos`}
          </p>
        </div>
      </div>
    </div>
  );
}
