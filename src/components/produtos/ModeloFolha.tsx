"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Botao from "@/components/ds/Botao";
import { useDialogo } from "@/components/ds/useDialogo";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import Trilho from "@/components/projetos/Trilho";
import { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import { productQrUrl, productUrl } from "@/lib/product-link";
import { fotosDoProduto, type Produto } from "@/lib/produtos-dados";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Ficha de um modelo, numa folha por cima do catálogo: fotos, dados da placa,
 * os ambientes reais em que o modelo foi aplicado (cada um leva à
 * apresentação de Projetos já com a galeria aberta) e o próximo passo pelo
 * pré-contato. Sem preço em lugar nenhum (decisão do dono).
 *
 * Barra fixa: voltar ao catálogo, anterior/próximo modelo e a posição.
 * Diálogo modal (useDialogo). A ampliação da foto é uma segunda folha.
 */
const LINHA_TXT: Record<Produto["linha"], { material: string; texto: string }> = {
  Classic: { material: "Mármore fosco", texto: "Acabamento fosco, sem reflexo: elegância discreta em qualquer luz. Indicado para lavabos, banheiros e áreas úmidas." },
  Brilliance: { material: "Mármore polido", texto: "Acabamento polido, com veios marcados: a luz reflete e o ambiente ganha amplitude. Para projetos de impacto visual." },
  Elegance: { material: "Madeira texturizada", texto: "Textura tátil que lembra a madeira natural, sem verniz nem lixamento: calor visual com a durabilidade do painel." },
};

const SELOS = [
  { t: "Resistente à água", d: "Umidade e mofo" },
  { t: "Protegido contra pragas", d: "Cupins" },
  { t: "Não propaga chamas", d: "Retardante" },
  { t: "Instalação rápida", d: "Cola PU, sem obra" },
];

export default function ModeloFolha({
  produto, projetos, posicao, anterior, proximo, onFechar, onIr,
}: {
  produto: Produto;
  /** Projetos em que este modelo foi aplicado. */
  projetos: Projeto[];
  posicao: string;
  anterior: Produto | null;
  proximo: Produto | null;
  onFechar: () => void;
  onIr: (p: Produto) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [qr, setQr] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const fotos = fotosDoProduto(produto);
  const foto = fotos[Math.min(idx, fotos.length - 1)] ?? produto.image_path;
  const linha = LINHA_TXT[produto.linha];
  useDialogo(caixa, onFechar, !zoom, caixa);

  // Trocar de modelo: a folha volta ao topo e a galeria à primeira foto.
  useEffect(() => { corpo.current?.scrollTo({ top: 0 }); setIdx(0); setQr(false); }, [produto.id]);

  const anteriorFoto = () => setIdx((i) => Math.max(0, i - 1));
  const proximaFoto = () => setIdx((i) => Math.min(fotos.length - 1, i + 1));
  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); anteriorFoto(); }
    if (e.key === "ArrowRight") { e.preventDefault(); proximaFoto(); }
  };

  const baixarTextura = async () => {
    const url = produto.render_texture_path?.trim() || foto;
    const base = `Orbital_${produto.code}_${produto.name}_textura`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
    try {
      const blob = await (await fetch(url)).blob();
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
    const link = productUrl(produto.code);
    if (navigator.share) {
      try { await navigator.share({ title: `${produto.name} — Orbital`, url: link }); return; } catch { /* cancelado */ }
    }
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { window.prompt("Copie o link do modelo:", link); }
  };

  const botaoIcone = "w-11 h-11 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-primary";
  const contatoProduto = [{ code: produto.code, name: produto.name, linha: produto.linha, image: produto.image_path }];

  return (
    <div className="fixed inset-0 z-[56]">
      <div className="mv-veu absolute inset-0 bg-primary/60" onClick={onFechar} aria-hidden />
      <div ref={caixa} role="dialog" aria-modal="true" tabIndex={-1} aria-label={`Modelo ${produto.code}: ${produto.name}`} onKeyDown={teclado}
        className="outline-none mv-folha lg:mv-folha-lado absolute inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[min(100%,72rem)] bg-background flex flex-col shadow-2xl"
        style={{ height: "100dvh" }}>
        <div className="flex items-center justify-between gap-3 px-[clamp(1rem,4.2vw,4rem)] pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 border-b border-surface-variant bg-background flex-shrink-0">
          <button type="button" onClick={onFechar}
            className="inline-flex items-center gap-2 min-h-11 -ml-2 pl-2 pr-3 text-xs tracking-[0.14em] uppercase font-bold text-primary hover:text-[#2347A0] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            <span className="hidden sm:inline">Voltar ao catálogo</span><span className="sm:hidden">Catálogo</span>
          </button>
          <div className="flex items-center gap-2" role="group" aria-label="Trocar de modelo">
            <p className="text-legenda text-on-surface-variant tabular-nums mr-1" aria-live="polite"><span className="sr-only">Modelo </span>{posicao}</p>
            <button type="button" className={botaoIcone} disabled={!anterior} onClick={() => anterior && onIr(anterior)} aria-label={anterior ? `Modelo anterior: ${anterior.name}` : "Modelo anterior"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" className={botaoIcone} disabled={!proximo} onClick={() => proximo && onIr(proximo)} aria-label={proximo ? `Próximo modelo: ${proximo.name}` : "Próximo modelo"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>

        <div ref={corpo} className="ds-folha-rola flex-1 min-h-0 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="ds-wrap pt-5 lg:pt-8">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 md:gap-10 lg:gap-14 items-start">
              {/* Fotos */}
              <div>
                <div className="relative overflow-hidden bg-surface-container aspect-[4/5] max-h-[70svh]">
                  <button type="button" onClick={() => setZoom(true)} aria-label="Ampliar foto" className="absolute inset-0 w-full h-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2347A0]">
                    <Image key={foto} src={foto} alt={`${produto.name}, foto ${idx + 1} de ${fotos.length}`} fill priority sizes="(max-width: 767px) 92vw, 520px" className="object-cover" />
                  </button>
                  {fotos.length > 1 && (
                    <>
                      <button type="button" onClick={anteriorFoto} disabled={idx === 0} aria-label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/45 text-white hover:bg-black/70 disabled:opacity-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
                      </button>
                      <button type="button" onClick={proximaFoto} disabled={idx === fotos.length - 1} aria-label="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-black/45 text-white hover:bg-black/70 disabled:opacity-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                      <p className="absolute bottom-2 right-2 bg-black/55 text-white text-sobre tabular-nums px-2 py-1" aria-live="polite">{idx + 1} / {fotos.length}</p>
                    </>
                  )}
                </div>
                {fotos.length > 1 && (
                  <ul className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none" aria-label="Fotos do modelo">
                    {fotos.map((u, i) => (
                      <li key={u}>
                        <button type="button" onClick={() => setIdx(i)} aria-label={`Foto ${i + 1}`} aria-current={i === idx ? "true" : undefined}
                          className={`relative block w-14 h-14 overflow-hidden border-2 transition-colors ${i === idx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                          <Image src={u} alt="" fill sizes="56px" className="object-cover" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Dados */}
              <div className="min-w-0">
                <Sobretitulo>Linha {produto.linha} · {produto.code}</Sobretitulo>
                <h2 className="font-serif text-primary text-t1 font-normal tracking-[-0.02em] mt-3 text-balance">{produto.name}</h2>
                <p className="text-on-surface-variant text-corpo mt-2">{linha.material} · {produto.finish}</p>
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 border-y border-surface-variant py-4">
                  <p className="text-on-surface-variant text-legenda flex-1">Valores e condições com o nosso consultor. Frete grátis a partir de 6 placas.</p>
                  <Botao contato produtos={contatoProduto} seta>Falar com um consultor</Botao>
                </div>
                {produto.description && <p className="text-on-surface-variant text-corpo mt-5 text-pretty">{produto.description}</p>}
                <p className="text-on-surface-variant text-corpo mt-3 text-pretty">{linha.texto}</p>

                <dl className="grid grid-cols-3 border border-surface-variant mt-6 bg-white">
                  {[["5 mm", "Espessura"], ["2,90 × 1,20 m", "Placa"], ["3,48 m²", "Por placa"]].map(([v, l], i) => (
                    <div key={l} className={`px-3 py-3 text-center ${i < 2 ? "border-r border-surface-variant" : ""}`}>
                      <dd className="text-primary text-base font-medium">{v}</dd>
                      <dt className="text-on-surface-variant text-sobre tracking-[0.12em] uppercase font-semibold mt-0.5">{l}</dt>
                    </div>
                  ))}
                </dl>
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {SELOS.map((s) => (
                    <li key={s.t} className="bg-white border border-surface-variant px-3 py-3 text-center">
                      <span className="block text-primary text-sobre tracking-[0.06em] uppercase font-bold leading-tight">{s.t}</span>
                      <span className="block text-on-surface-variant text-sobre mt-0.5">{s.d}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6">
                  <button type="button" onClick={baixarTextura} className="inline-flex items-center gap-1.5 min-h-11 text-primary text-xs tracking-[0.12em] uppercase font-bold hover:text-[#2347A0]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    Baixar textura
                  </button>
                  <button type="button" onClick={compartilhar} className="inline-flex items-center gap-1.5 min-h-11 text-on-surface-variant text-xs tracking-[0.12em] uppercase font-bold hover:text-primary">
                    {copiado ? "Link copiado" : "Compartilhar"}
                  </button>
                  <button type="button" onClick={() => setQr((v) => !v)} aria-expanded={qr} className="inline-flex items-center gap-1.5 min-h-11 text-on-surface-variant text-xs tracking-[0.12em] uppercase font-bold hover:text-primary">
                    {qr ? "Ocultar QR Code" : "QR Code"}
                  </button>
                </div>
                {qr && (
                  <figure className="mt-3 flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={productQrUrl(produto.code, "svg", 512)} alt={`QR Code do modelo ${produto.name} (${produto.code})`} width={128} height={128} className="w-32 h-32 border border-surface-variant bg-white" />
                    <figcaption className="text-on-surface-variant text-legenda">Aponte a câmera para abrir este modelo · {produto.code}</figcaption>
                  </figure>
                )}
              </div>
            </div>

            {/* Em projetos */}
            <section aria-labelledby={`projetos-${produto.code}`} className="mt-10 lg:mt-14 pb-10 border-t border-surface-variant pt-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
                <div>
                  <Sobretitulo>Ver em projetos</Sobretitulo>
                  <h3 id={`projetos-${produto.code}`} className="font-serif text-primary text-t3 font-normal mt-3">
                    {projetos.length > 0 ? `${produto.name} em ambientes reais` : "Ambientes com este modelo"}
                  </h3>
                </div>
                <Link href={projetos[0] ? `/projetos?projeto=${encodeURIComponent(projetos[0].slug)}` : "/projetos"} className="inline-flex items-center gap-2 min-h-11 text-primary text-xs tracking-[0.12em] uppercase font-bold">
                  Ver na apresentação de projetos
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
              {projetos.length > 0 ? (
                <Trilho rotulo={`Projetos com ${produto.name}`} largura="w-[62%] sm:w-[38%] lg:w-[23.5%]">
                  {projetos.slice(0, 8).map((p) => (
                    <ProjetoCard key={p.id} projeto={p} href={`/projetos?projeto=${encodeURIComponent(p.slug)}`} sizes="(max-width: 639px) 62vw, (max-width: 1023px) 38vw, 260px" />
                  ))}
                </Trilho>
              ) : (
                <p className="text-on-surface-variant text-corpo">Este modelo ainda não tem fotos de obra publicadas. Veja o acabamento ao vivo nos showrooms parceiros ou peça uma amostra ao consultor.</p>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Foto ampliada */}
      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={`Foto ampliada: ${produto.name}`} className="mv-veu fixed inset-0 z-[70] bg-black flex items-center justify-center" onClick={() => setZoom(false)}
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setZoom(false); } }}>
          <div className="relative w-full h-[100dvh]">
            <Image src={foto} alt={produto.name} fill sizes="100vw" quality={90} className="object-contain" />
          </div>
          <button type="button" onClick={() => setZoom(false)} aria-label="Fechar foto ampliada" autoFocus
            className="absolute top-[max(env(safe-area-inset-top),0.75rem)] right-3 w-11 h-11 flex items-center justify-center bg-white/15 text-white hover:bg-white/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
