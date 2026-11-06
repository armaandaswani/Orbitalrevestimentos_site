"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  buildGalleryItems, filterGalleryItems, temAntesDepois,
  type GalleryFilter, type GalleryItem, type GalleryMediaRow, type MediaCategory,
} from "@/lib/project-gallery";
import { videoHost } from "@/lib/video-link";
import VideoThumb from "@/components/VideoThumb";
import VideoLinkPlayer from "@/components/VideoLinkPlayer";
import { autoriaTxt, modelosTxt } from "@/lib/projeto-modelos";
import { useDialogo } from "@/components/ds/useDialogo";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Galeria de um projeto em tela cheia: carrossel, grade e antes × depois lado a
 * lado. Usada pela página de Projetos e pela página de cada showroom — abre no
 * lugar, sem trocar de página.
 *
 * Quem usa monta com `key={projeto.id}` e só enquanto está aberta: o estado
 * (foto atual, filtro, modo) nasce limpo a cada projeto.
 *
 * Acessibilidade: diálogo modal com o foco preso dentro, Esc fecha, setas
 * navegam, o foco volta para onde estava ao fechar. No toque, arrastar para o
 * lado troca a foto.
 */

type Modo = "carrossel" | "grade" | "lado";

function Selo({ cat }: { cat: MediaCategory }) {
  if (cat === "geral") return null;
  return (
    <span className={`text-xs tracking-[0.12em] uppercase font-bold px-2 py-0.5 border ${
      cat === "antes" ? "bg-amber-500/20 text-amber-200 border-amber-400/40" : "bg-secondary/25 text-[#7fd49c] border-secondary/50"
    }`}>
      {cat === "antes" ? "Antes" : "Depois"}
    </span>
  );
}

const ROTULO_FILTRO: Record<GalleryFilter, string> = { all: "Todas", antes: "Antes", depois: "Depois", video: "Vídeos", geral: "Geral" };
const botaoIcone = "w-11 h-11 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white";

/** Projeto anterior/próximo na lista em que este foi aberto (linha, grade ou showroom). */
export interface VizinhosGaleria {
  anterior: Projeto;
  proximo: Projeto;
  /** "3 / 12" */
  posicao: string;
  onIr: (p: Projeto) => void;
}

export default function ProjetoGaleria({ projeto, inicio, onFechar, vizinhos }: { projeto: Projeto; inicio?: string; onFechar: () => void; vizinhos?: VizinhosGaleria }) {
  const base = buildGalleryItems(projeto, []);
  const [itens, setItens] = useState<GalleryItem[]>(base);
  const [carregando, setCarregando] = useState(true);
  const [idx, setIdx] = useState(() => Math.max(0, inicio ? base.findIndex((i) => i.url === inicio) : 0));
  // Projeto com antes e depois (o cartão mostra o selo) abre direto no lado a lado.
  const [modo, setModo] = useState<Modo>(() => (!inicio && temAntesDepois(projeto) ? "lado" : "carrossel"));
  const [filtro, setFiltro] = useState<GalleryFilter>("all");
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);

  // Fotos e vídeos além da capa.
  useEffect(() => {
    let vivo = true;
    fetch(`/api/projects/media?slug=${encodeURIComponent(projeto.slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((extra: GalleryMediaRow[]) => {
        if (!vivo) return;
        const todos = buildGalleryItems(projeto, Array.isArray(extra) ? extra : []);
        setItens(todos);
        if (inicio) { const at = todos.findIndex((i) => i.url === inicio); if (at >= 0) setIdx(at); }
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [projeto, inicio]);

  // Fundo parado, foco preso dentro do diálogo, Esc fecha; ao fechar, o foco volta.
  useDialogo(caixa, onFechar, true, caixa);

  const temAntes = itens.some((i) => i.category === "antes");
  const temDepois = itens.some((i) => i.category === "depois");
  const temVideo = itens.some((i) => i.kind === "video");
  const ladoALado = temAntes && temDepois;
  const visiveis = filterGalleryItems(itens, filtro);
  const total = visiveis.length;
  const atual = Math.min(idx, Math.max(total - 1, 0));
  const item = visiveis[atual];
  const anterior = () => { if (total) setIdx((atual - 1 + total) % total); };
  const proxima = () => { if (total) setIdx((atual + 1) % total); };

  const filtros: GalleryFilter[] = ["all", ...(temAntes ? ["antes" as const] : []), ...(temDepois ? ["depois" as const] : []), ...(temVideo ? ["video" as const] : [])];
  // Trocar de filtro tenta manter a MESMA foto aberta.
  const mudarFiltro = (f: GalleryFilter) => {
    const url = item?.url;
    const nova = filterGalleryItems(itens, f);
    const manter = url ? nova.findIndex((i) => i.url === url) : -1;
    setFiltro(f);
    setModo("carrossel");
    setIdx(manter >= 0 ? manter : 0);
  };

  const teclado = (e: React.KeyboardEvent) => {
    if (modo !== "carrossel") return;
    if (e.key === "ArrowLeft") { e.preventDefault(); anterior(); }
    if (e.key === "ArrowRight") { e.preventDefault(); proxima(); }
  };

  const antesImg = itens.find((i) => i.category === "antes" && i.kind === "image");
  const depoisImg = itens.find((i) => i.category === "depois" && i.kind === "image");
  const modelos = modelosTxt(projeto);
  const autoria = autoriaTxt(projeto.projeto_de);

  return (
    <div ref={caixa} role="dialog" aria-modal="true" tabIndex={-1} aria-label={`Galeria: ${projeto.title}`} onKeyDown={teclado}
      className="outline-none mv-folha fixed inset-0 z-[60] bg-primary flex flex-col text-white" style={{ height: "100dvh" }}>

      <div className="flex items-start justify-between gap-3 pl-4 sm:pl-6 pr-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 border-b border-white/10 flex-shrink-0">
        <div className="min-w-0 py-1.5">
          {modelos && <p className="text-secondary text-xs tracking-[0.14em] uppercase font-bold">{modelos}</p>}
          <h2 className="font-serif text-lg leading-snug mt-0.5 truncate">{projeto.title}</h2>
          {autoria && <p className="text-white/70 text-sm italic">{autoria}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!carregando && itens.length > 1 && (
            <div className="flex items-center" role="group" aria-label="Modo de exibição">
              <button type="button" aria-pressed={modo === "carrossel"} aria-label="Uma foto por vez" onClick={() => setModo("carrossel")}
                className={`${botaoIcone} ${modo === "carrossel" ? "bg-white text-primary" : "text-white/70 hover:text-white"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="5" width="18" height="14" rx="1" /></svg>
              </button>
              <button type="button" aria-pressed={modo === "grade"} aria-label="Todas as fotos em grade" onClick={() => setModo("grade")}
                className={`${botaoIcone} ${modo === "grade" ? "bg-white text-primary" : "text-white/70 hover:text-white"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              {ladoALado && (
                <button type="button" aria-pressed={modo === "lado"} aria-label="Antes e depois lado a lado" onClick={() => setModo("lado")}
                  className={`${botaoIcone} ${modo === "lado" ? "bg-white text-primary" : "text-white/70 hover:text-white"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="2" y="4" width="9" height="16" rx="1" /><rect x="13" y="4" width="9" height="16" rx="1" /></svg>
                </button>
              )}
            </div>
          )}
          <button ref={fechar} type="button" onClick={onFechar} aria-label="Fechar galeria" className={`${botaoIcone} text-white/80 hover:text-white`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      {filtros.length > 1 && (
        <div role="group" aria-label="Filtrar fotos" className="flex flex-wrap items-center gap-1.5 px-4 sm:px-6 py-2 border-b border-white/10 flex-shrink-0">
          {filtros.map((f) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => mudarFiltro(f)}
              className={`flex-shrink-0 min-h-11 px-4 text-xs tracking-[0.1em] uppercase font-bold border transition-colors ${
                filtro === f ? "bg-white text-primary border-white" : "border-white/25 text-white/75 hover:text-white"
              }`}>
              {ROTULO_FILTRO[f]}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 relative">
        {carregando && itens.length === 0 && (
          <div className="h-full flex items-center justify-center" aria-live="polite">
            <span className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" aria-label="Carregando" />
          </div>
        )}

        {modo === "lado" && ladoALado && (
          <div className="h-full grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10">
            {[{ it: antesImg, cat: "antes" as const }, { it: depoisImg, cat: "depois" as const }].map(({ it, cat }) => it && (
              <figure key={cat} className="relative bg-black min-h-0">
                <Image src={it.url} alt={`${projeto.title}, ${cat}`} fill sizes="(max-width: 639px) 100vw, 50vw" className="object-contain" />
                <figcaption className="absolute left-3 bottom-3 flex items-center gap-2"><Selo cat={cat} /></figcaption>
              </figure>
            ))}
          </div>
        )}

        {modo === "grade" && (
          <div className="h-full overflow-y-auto p-3 sm:p-4">
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-w-5xl mx-auto">
              {visiveis.map((it, i) => (
                <li key={it.url}>
                  <button type="button" onClick={() => { setIdx(i); setModo("carrossel"); }} aria-label={`Abrir foto ${i + 1}`}
                    className="relative block w-full aspect-square overflow-hidden bg-black/30 focus-visible:outline-2 focus-visible:outline-white">
                    {it.kind === "image"
                      ? <Image src={it.url} alt="" fill sizes="(max-width: 639px) 50vw, 25vw" className="object-cover" />
                      : <VideoThumb url={it.url} className="absolute inset-0 w-full h-full object-cover opacity-80" />}
                    {it.kind === "video" && (
                      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    )}
                    <span className="absolute left-2 bottom-2"><Selo cat={it.category} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {modo === "carrossel" && item && (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 relative select-none"
              onPointerDown={(e) => { if (e.pointerType !== "mouse") toque.current = { x: e.clientX, y: e.clientY }; }}
              onPointerUp={(e) => {
                const t = toque.current; toque.current = null;
                if (!t) return;
                const dx = e.clientX - t.x;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - t.y)) { if (dx < 0) proxima(); else anterior(); }
              }}>
              {item.kind === "image" ? (
                <Image key={item.url} src={item.url} alt={item.label ?? projeto.title} fill sizes="100vw" className="object-contain" draggable={false} />
              ) : videoHost(item.url) === "arquivo" ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <video key={item.url} src={item.url} controls playsInline preload="metadata" className="max-h-full max-w-full bg-black" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <VideoLinkPlayer key={item.url} url={item.url} description={item.description} />
                </div>
              )}
              {total > 1 && (
                <>
                  <button type="button" onClick={anterior} aria-label="Foto anterior"
                    className={`${botaoIcone} absolute left-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/70`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <button type="button" onClick={proxima} aria-label="Próxima foto"
                    className={`${botaoIcone} absolute right-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/70`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </>
              )}
            </div>
            <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-t border-white/10">
              <Selo cat={item.category} />
              {item.description && <p className="text-white/80 text-sm leading-snug flex-1 min-w-0">{item.description}</p>}
              {total > 1 && <p className="text-white/70 text-sm ml-auto tabular-nums" aria-live="polite">{atual + 1} / {total}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Projeto anterior / próximo, sem fechar a galeria. */}
      {vizinhos && (
        <nav aria-label="Outros projetos" className="flex-shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-4 py-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)] border-t border-white/15 bg-black/30">
          <button type="button" onClick={() => vizinhos.onIr(vizinhos.anterior)} className="group flex items-center gap-2 min-h-11 px-2 text-left text-white/85 hover:text-white min-w-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="flex-shrink-0"><path d="M15 18l-6-6 6-6" /></svg>
            <span className="min-w-0">
              <span className="block text-sobre tracking-[0.14em] uppercase font-semibold text-white/60">Anterior</span>
              <span className="block text-sm truncate">{vizinhos.anterior.title}</span>
            </span>
          </button>
          <p className="text-white/70 text-sm tabular-nums"><span className="sr-only">Projeto </span>{vizinhos.posicao}</p>
          <button type="button" onClick={() => vizinhos.onIr(vizinhos.proximo)} className="group flex items-center justify-end gap-2 min-h-11 px-2 text-right text-white/85 hover:text-white min-w-0">
            <span className="min-w-0">
              <span className="block text-sobre tracking-[0.14em] uppercase font-semibold text-white/60">Próximo</span>
              <span className="block text-sm truncate">{vizinhos.proximo.title}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </nav>
      )}
    </div>
  );
}
