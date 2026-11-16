"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  buildGalleryItems, filterGalleryItems, temAntesDepois,
  type GalleryFilter, type GalleryMediaRow, type MediaCategory,
} from "@/lib/project-gallery";
import { isUsableVideoUrl, videoHost } from "@/lib/video-link";
import VideoThumb from "@/components/VideoThumb";
import VideoLinkPlayer from "@/components/VideoLinkPlayer";
import { autoriaTxt, modelosTxt } from "@/lib/projeto-modelos";
import { useDialogo } from "@/components/ds/useDialogo";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Galeria de um projeto em tela cheia: uma foto por vez, grade e antes × depois
 * lado a lado. Usada pela página de Projetos e pela página de cada showroom —
 * abre no lugar, sem trocar de página.
 *
 * A foto ocupa a altura inteira da tela, inteira (sem corte); atrás dela, a
 * mesma foto desfocada preenche o resto. Título, modos e fechar ficam numa
 * faixa fina sobre a foto, em cima; legenda, contador e anterior/próximo
 * projeto, embaixo. O filtro de fotos só aparece quando há de fato mais de um
 * tipo (antes, depois, vídeo).
 *
 * Mídia que não carrega (foto que dá erro, link de vídeo malformado) sai da
 * galeria em silêncio: o visitante não vê um quadro quebrado. O dado continua
 * no painel para o dono corrigir.
 *
 * Quem usa monta com `key={projeto.id}` e só enquanto está aberta: o estado
 * (foto atual, filtro, modo) nasce limpo a cada projeto.
 *
 * Acessibilidade: diálogo modal com o foco preso dentro, Esc fecha, setas
 * navegam, o foco volta para onde estava ao fechar. No toque, arrastar para o
 * lado troca a foto.
 */

type Modo = "carrossel" | "grade" | "lado";

/** Link de vídeo que não dá para tocar: sem http(s), ou colado duas vezes (resto de markdown, "](https://…"). */
function videoMalformado(url: string): boolean {
  const u = (url ?? "").trim();
  return !isUsableVideoUrl(u) || /\s/.test(u) || (u.match(/https?:\/\//gi) ?? []).length > 1;
}

function Selo({ cat }: { cat: MediaCategory }) {
  if (cat === "geral") return null;
  return (
    <span className="inline-flex items-center gap-1.5 bg-black/55 text-white text-[13px] leading-none font-medium px-2 py-1.5">
      <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${cat === "antes" ? "bg-amber-300" : "bg-[#7fd49c]"}`} />
      {cat === "antes" ? "Antes" : "Depois"}
    </span>
  );
}

/**
 * A foto inteira sobre ela mesma desfocada. O fundo pede a menor variante
 * (o desfoque apaga a resolução); só a foto da frente vem nítida.
 */
function Foto({ url, alt, sizes, prioridade, onErro }: { url: string; alt: string; sizes: string; prioridade?: boolean; onErro: () => void }) {
  return (
    <>
      <Image src={url} alt="" aria-hidden fill sizes="96px" className="object-cover scale-125 blur-2xl opacity-70" onError={onErro} />
      <span aria-hidden className="absolute inset-0 bg-[#07122A]/50" />
      <Image src={url} alt={alt} fill sizes={sizes} priority={prioridade} className="object-contain" draggable={false} onError={onErro} data-foto-principal />
    </>
  );
}

const ROTULO_FILTRO: Record<GalleryFilter, string> = { all: "Todas", antes: "Antes", depois: "Depois", video: "Vídeos", geral: "Geral" };
const botaoIcone = "w-11 h-11 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white";
const seta = `${botaoIcone} absolute top-1/2 -translate-y-1/2 z-10 bg-black/35 text-white hover:bg-black/60 active:bg-black/70`;

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
  // Mídias além da capa, como vieram do painel.
  const [midias, setMidias] = useState<GalleryMediaRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [idx, setIdx] = useState(() => Math.max(0, inicio ? base.findIndex((i) => i.url === inicio) : 0));
  // Projeto com antes e depois (o cartão mostra o selo) abre direto no lado a lado.
  const [modo, setModo] = useState<Modo>(() => (!inicio && temAntesDepois(projeto) ? "lado" : "carrossel"));
  const [filtro, setFiltro] = useState<GalleryFilter>("all");
  // Fotos que deram erro ao carregar: saem da galeria.
  const [quebradas, setQuebradas] = useState<ReadonlySet<string>>(() => new Set());
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
        const lista = Array.isArray(extra) ? extra : [];
        setMidias(lista);
        if (inicio) { const at = buildGalleryItems(projeto, lista).findIndex((i) => i.url === inicio); if (at >= 0) setIdx(at); }
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [projeto, inicio]);

  // Fundo parado, foco preso dentro do diálogo, Esc fecha; ao fechar, o foco volta.
  useDialogo(caixa, onFechar, true, caixa);

  const quebrou = (url: string) => setQuebradas((q) => (q.has(url) ? q : new Set(q).add(url)));
  // A galeria é montada só com a mídia que carrega: assim a regra da capa recortada
  // (sai quando há outra foto da mesma categoria) não a tira por causa de uma foto quebrada.
  const boas = useMemo(() => buildGalleryItems(projeto, midias.filter((m) => !quebradas.has(m.url) && !(m.type === "video" && videoMalformado(m.url))))
    .filter((i) => !quebradas.has(i.url)), [projeto, midias, quebradas]);

  const temAntes = boas.some((i) => i.category === "antes");
  const temDepois = boas.some((i) => i.category === "depois");
  const temVideo = boas.some((i) => i.kind === "video");
  const antesImg = boas.find((i) => i.category === "antes" && i.kind === "image");
  const depoisImg = boas.find((i) => i.category === "depois" && i.kind === "image");
  const ladoALado = !!antesImg && !!depoisImg;
  const visiveis = filterGalleryItems(boas, filtro);
  const total = visiveis.length;
  const atual = Math.min(idx, Math.max(total - 1, 0));
  const item = visiveis[atual];
  // Lado a lado pedido, mas uma das duas fotos não carregou: uma por vez.
  const modoEfetivo: Modo = modo === "lado" && !ladoALado ? "carrossel" : modo;
  const anterior = () => { if (total) setIdx((atual - 1 + total) % total); };
  const proxima = () => { if (total) setIdx((atual + 1) % total); };

  // Filtro só quando separa algo: com um tipo só, "Todas" e ele mostrariam o mesmo.
  const tipos: GalleryFilter[] = [...(temAntes ? ["antes" as const] : []), ...(temDepois ? ["depois" as const] : []), ...(temVideo ? ["video" as const] : [])];
  const filtros: GalleryFilter[] = tipos.length > 1 ? ["all", ...tipos] : [];
  // Trocar de filtro tenta manter a MESMA foto aberta.
  const mudarFiltro = (f: GalleryFilter) => {
    const url = item?.url;
    const nova = filterGalleryItems(boas, f);
    const manter = url ? nova.findIndex((i) => i.url === url) : -1;
    setFiltro(f);
    setModo("carrossel");
    setIdx(manter >= 0 ? manter : 0);
  };

  // No lado a lado, seta ou deslize passa para o carrossel já na foto anterior/seguinte.
  const passar = (sentido: -1 | 1) => {
    if (modoEfetivo === "grade") return;
    if (modoEfetivo === "lado") {
      setModo("carrossel");
      // O antes e o depois já estavam na tela: vai para a primeira (ou a última) foto que não é nenhum dos dois.
      const outras = visiveis.flatMap((v, i) => (v.url !== antesImg?.url && v.url !== depoisImg?.url ? [i] : []));
      if (outras.length > 0) { setIdx(sentido > 0 ? outras[0] : outras[outras.length - 1]); return; }
    }
    if (sentido < 0) anterior(); else proxima();
  };
  const teclado = (e: React.KeyboardEvent) => {
    if (modoEfetivo === "grade") return;
    if (e.key === "ArrowLeft") { e.preventDefault(); passar(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); passar(1); }
  };
  // Arrastar para o lado troca a foto (toque e caneta). touch-pan-y + pinch-zoom: o navegador não toma
  // o gesto horizontal de um dedo para si; o vertical e o zoom de pinça continuam dele.
  const deslize = {
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType !== "mouse") toque.current = { x: e.clientX, y: e.clientY }; },
    onPointerCancel: () => { toque.current = null; },
    onPointerUp: (e: React.PointerEvent) => {
      const t = toque.current; toque.current = null;
      if (!t) return;
      const dx = e.clientX - t.x;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - t.y)) passar(dx < 0 ? 1 : -1);
    },
  };

  const linha = [modelosTxt(projeto), autoriaTxt(projeto.projeto_de)].filter(Boolean).join(" · ");
  // Grade de fotos: até 4 colunas, nunca mais do que há fotos (duas fotos não somem num canto).
  const colunas = (max: number) => Math.max(1, Math.min(total, max));

  return (
    <div ref={caixa} role="dialog" aria-modal="true" tabIndex={-1} aria-label={`Galeria: ${projeto.title}`} onKeyDown={teclado}
      className="outline-none mv-folha fixed inset-0 z-[60] overflow-hidden bg-[#07122A] text-white" style={{ height: "100dvh" }}>

      {/* ── Palco: a foto na tela inteira, por baixo das faixas ─────────────── */}
      <div className="absolute inset-0">
        {carregando && boas.length === 0 && (
          <div className="h-full flex items-center justify-center" aria-live="polite">
            <span className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full motion-safe:animate-spin" aria-label="Carregando" />
          </div>
        )}

        {modoEfetivo === "lado" && antesImg && depoisImg && (
          <div data-lado className="absolute inset-0 grid grid-rows-2 sm:grid-rows-1 sm:grid-cols-2 gap-px bg-white/10 select-none touch-pan-y touch-pinch-zoom" {...deslize}>
            {[{ it: antesImg, cat: "antes" as const }, { it: depoisImg, cat: "depois" as const }].map(({ it, cat }) => (
              <figure key={cat} className="relative overflow-hidden min-h-0">
                <Foto url={it.url} alt={`${projeto.title}, ${cat}`} sizes="(max-width: 639px) 100vw, 50vw" prioridade onErro={() => quebrou(it.url)} />
                {/* Selo longe das faixas e das setas: no celular (uma sobre a outra), no meio, embaixo da de
                    cima e em cima da de baixo; lado a lado, à esquerda, logo acima da faixa de baixo. */}
                <figcaption className={`absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-4 sm:top-auto sm:bottom-[5.25rem] ${cat === "antes" ? "bottom-3" : "top-3"}`}><Selo cat={cat} /></figcaption>
              </figure>
            ))}
          </div>
        )}

        {modoEfetivo === "grade" && (
          <div className="absolute inset-0 overflow-y-auto overscroll-contain ds-folha-rola">
            <div className="min-h-full flex items-center justify-center px-3 sm:px-6 pt-20 pb-28">
              <ul className="w-full grid gap-2 sm:gap-3 grid-cols-[repeat(var(--c1),minmax(0,1fr))] sm:grid-cols-[repeat(var(--c2),minmax(0,1fr))] lg:grid-cols-[repeat(var(--c3),minmax(0,1fr))]"
                style={{ "--c1": colunas(2), "--c2": colunas(3), "--c3": colunas(4), maxWidth: `${colunas(4) * 20}rem` } as React.CSSProperties}>
                {visiveis.map((it, i) => (
                  <li key={it.url}>
                    <button type="button" onClick={() => { setIdx(i); setModo("carrossel"); }} aria-label={`Abrir foto ${i + 1}`}
                      className="relative block w-full aspect-[4/5] overflow-hidden bg-black/30 focus-visible:outline-2 focus-visible:outline-white">
                      {it.kind === "image"
                        ? <Image src={it.url} alt="" fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20rem" className="object-cover" onError={() => quebrou(it.url)} />
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
          </div>
        )}

        {modoEfetivo === "carrossel" && item && (
          <div className="absolute inset-0 select-none touch-pan-y touch-pinch-zoom" {...deslize}>
            {item.kind === "image" ? (
              <Foto key={item.url} url={item.url} alt={item.label ?? projeto.title} sizes="100vw" prioridade onErro={() => quebrou(item.url)} />
            ) : videoHost(item.url) === "arquivo" ? (
              <div className="absolute inset-0 flex items-center justify-center pt-16 pb-28">
                <video key={item.url} src={item.url} controls playsInline preload="metadata" onError={() => quebrou(item.url)} className="max-h-full max-w-full bg-black" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-4 pt-16 pb-28">
                <VideoLinkPlayer key={item.url} url={item.url} description={item.description} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Foto anterior / próxima, no meio da altura. */}
      {modoEfetivo !== "grade" && total > 1 && (
        <>
          <button type="button" onClick={() => passar(-1)} aria-label="Foto anterior" className={`${seta} left-2 sm:left-4`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" onClick={() => passar(1)} aria-label="Próxima foto" className={`${seta} right-2 sm:right-4`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}

      {/* ── Faixa de cima: título, modos e fechar ───────────────────────────── */}
      <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-[#07122A]/85 via-[#07122A]/45 to-transparent pt-[env(safe-area-inset-top)] pb-6 pointer-events-none">
        <div className="flex items-center justify-between gap-3 pl-4 sm:pl-6 pr-1.5 sm:pr-3 pt-1.5 pointer-events-auto">
          <div className="min-w-0 py-1">
            <h2 className="font-serif text-lg sm:text-xl leading-snug truncate">{projeto.title}</h2>
            {linha && <p className="text-white/70 text-[13px] leading-snug truncate">{linha}</p>}
          </div>
          <div className="flex items-center flex-shrink-0">
            {!carregando && boas.length > 1 && (
              <div className="flex items-center" role="group" aria-label="Modo de exibição">
                <button type="button" aria-pressed={modoEfetivo === "carrossel"} aria-label="Uma foto por vez" onClick={() => setModo("carrossel")}
                  className={`${botaoIcone} ${modoEfetivo === "carrossel" ? "bg-white text-primary" : "text-white/75 hover:text-white"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="5" width="18" height="14" rx="1" /></svg>
                </button>
                <button type="button" aria-pressed={modoEfetivo === "grade"} aria-label="Todas as fotos em grade" onClick={() => setModo("grade")}
                  className={`${botaoIcone} ${modoEfetivo === "grade" ? "bg-white text-primary" : "text-white/75 hover:text-white"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                </button>
                {ladoALado && (
                  <button type="button" aria-pressed={modoEfetivo === "lado"} aria-label="Antes e depois lado a lado" onClick={() => setModo("lado")}
                    className={`${botaoIcone} ${modoEfetivo === "lado" ? "bg-white text-primary" : "text-white/75 hover:text-white"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="2" y="4" width="9" height="16" rx="1" /><rect x="13" y="4" width="9" height="16" rx="1" /></svg>
                  </button>
                )}
              </div>
            )}
            <button ref={fechar} type="button" onClick={onFechar} aria-label="Fechar galeria" className={`${botaoIcone} ml-1 text-white hover:bg-white/10`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
        {filtros.length > 0 && (
          <div role="group" aria-label="Filtrar fotos" className="flex flex-wrap items-center gap-1.5 px-4 sm:px-6 pt-1 pointer-events-auto">
            {filtros.map((f) => {
              // No lado a lado nenhum filtro vale: nenhum aparece pressionado.
              const ativo = filtro === f && modoEfetivo !== "lado";
              return (
                <button key={f} type="button" aria-pressed={ativo} onClick={() => mudarFiltro(f)}
                  className={`relative h-8 px-3 text-[13px] font-medium border transition-colors after:absolute after:inset-x-0 after:-inset-y-1.5 ${
                    ativo ? "bg-white text-primary border-white" : "border-white/30 text-white/85 hover:text-white hover:border-white/60"
                  }`}>
                  {ROTULO_FILTRO[f]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Faixa de baixo: legenda, contador e outros projetos ─────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#07122A]/90 via-[#07122A]/55 to-transparent pt-10 pb-[max(env(safe-area-inset-bottom),0.375rem)] pointer-events-none">
        {modoEfetivo === "carrossel" && item && (item.category !== "geral" || item.description || total > 1) && (
          <div className="flex items-center gap-3 px-4 sm:px-6 pb-1.5 pointer-events-auto">
            <Selo cat={item.category} />
            {item.description && <p className="text-white/85 text-sm leading-snug flex-1 min-w-0 line-clamp-2">{item.description}</p>}
            {total > 1 && <p data-contador className="text-white/80 text-sm ml-auto tabular-nums" aria-live="polite">{atual + 1} / {total}</p>}
          </div>
        )}
        {/* Projeto anterior / próximo, sem fechar a galeria. */}
        {vizinhos && (
          <nav aria-label="Outros projetos" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1.5 sm:px-4 pointer-events-auto">
            <button type="button" onClick={() => vizinhos.onIr(vizinhos.anterior)} className="flex items-center gap-2 min-h-11 px-2 text-left text-white/85 hover:text-white min-w-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="flex-shrink-0"><path d="M15 18l-6-6 6-6" /></svg>
              <span className="min-w-0">
                <span className="block text-[12px] leading-tight text-white/60">Anterior</span>
                <span className="block text-sm truncate">{vizinhos.anterior.title}</span>
              </span>
            </button>
            <p className="text-white/60 text-[13px] tabular-nums"><span className="sr-only">Projeto </span>{vizinhos.posicao}</p>
            <button type="button" onClick={() => vizinhos.onIr(vizinhos.proximo)} className="flex items-center justify-end gap-2 min-h-11 px-2 text-right text-white/85 hover:text-white min-w-0">
              <span className="min-w-0">
                <span className="block text-[12px] leading-tight text-white/60">Próximo</span>
                <span className="block text-sm truncate">{vizinhos.proximo.title}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
