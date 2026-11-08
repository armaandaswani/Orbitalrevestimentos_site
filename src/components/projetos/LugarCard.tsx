"use client";

import Image from "next/image";
import { coverStyle } from "@/lib/cover-crop";
import { CARTAO_PDV } from "@/lib/cartao-pdv";
import { contaAmbientes, linkComoChegar, lugarNovo, nomeLugar, type Showroom } from "@/lib/projetos-tipos";

/**
 * Cartão de um lugar para ver o PFB ao vivo: showroom parceiro ou ponto de
 * revenda. O que o visitante precisa para ir até lá fica no próprio cartão:
 * endereço, quantos ambientes tem e "Como chegar".
 *
 * A foto e o botão principal levam aos ambientes: com `onAbrir`, abrem a folha
 * do showroom por cima da página (um toque e as fotos estão na tela); sem
 * JavaScript, ou pela home, o `href` leva à página do showroom.
 *
 * Revenda sem ambientes não tem página própria: leva à /onde-comprar. O cartão
 * sintético `CARTAO_PDV` ("Pontos de venda") abre a página inteira e mostra
 * "Lojas em Manaus" no corpo, onde os outros mostram o endereço; uma loja real
 * abre a página já na loja (?loja=<slug>).
 */

const botao = "inline-flex items-center justify-center gap-2 min-h-11 px-3 text-xs tracking-[0.08em] whitespace-nowrap uppercase font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0]";
const seta = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>;

export default function LugarCard({ lugar, agora, href, onAbrir, compacto = false }: {
  lugar: Showroom; agora: number; href?: string; onAbrir?: (s: Showroom) => void;
  /** Cartão estreito (5 numa linha): ações em texto, nome no tom da marca. */
  compacto?: boolean;
}) {
  const revenda = lugar.kind === "revenda";
  const temPagina = !revenda || lugar.ambient_count > 0;
  const cartaoPdv = lugar.id === CARTAO_PDV.id;
  const capa = lugar.display_cover;
  const destino = href ?? (temPagina ? `/projetos/showroom/${lugar.slug}` : cartaoPdv ? "/onde-comprar" : `/onde-comprar?loja=${encodeURIComponent(lugar.slug)}`);
  const abrir = (e: React.MouseEvent) => {
    if (!onAbrir || !temPagina || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onAbrir(lugar);
  };
  const rotuloAcao = temPagina ? (revenda ? "Projetos" : "Ambientes") : "Onde comprar";
  const foto = (
    <a href={destino} onClick={abrir} aria-label={`${lugar.name}: ${temPagina ? (revenda ? "ver os projetos" : "ver os ambientes") : "onde comprar"}`}
      className="group relative block w-full overflow-hidden bg-primary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2347A0]" style={{ aspectRatio: "4 / 3" }}>
      {capa ? (
        <Image src={capa} alt={`${lugar.name}: ambiente com PFB`} fill
          sizes={compacto ? "(max-width: 639px) 46vw, (max-width: 1023px) 30vw, 240px" : "(max-width: 639px) 84vw, (max-width: 1023px) 46vw, 31vw"}
          className="mv-zoom" style={coverStyle(lugar.display_focus_x, lugar.display_focus_y, lugar.display_zoom)} />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <svg width={compacto ? 32 : 40} height={compacto ? 32 : 40} viewBox="0 0 24 24" fill="none" stroke="#36A35C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 9l1.5-5h15L21 9" /><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z" /><path d="M5 13v7h14v-7" /><path d="M10 20v-4h4v4" />
          </svg>
          {!revenda && <span className="text-white/80 text-sm mt-3">Fotos em breve</span>}
        </span>
      )}
      {/* Selos só no cartão grande; no compacto, os 5 lado a lado ficam limpos. */}
      {!compacto && (
        <span className="absolute top-3 left-3 flex gap-1">
          <span className="bg-white text-primary text-sobre tracking-[0.12em] uppercase font-bold px-2 py-1">{revenda ? "Revenda" : "Showroom"}</span>
          {lugarNovo(lugar.created_at, agora) && <span className="bg-secondary text-primary text-sobre tracking-[0.12em] uppercase font-bold px-2 py-1">Novo</span>}
        </span>
      )}
    </a>
  );

  if (compacto) {
    // O endereço já é o "Como chegar" (abre o mapa); fica uma ação só, em texto.
    return (
      <article className="h-full bg-white border border-surface-variant flex flex-col">
        {foto}
        <div className="px-4 pt-3.5 pb-1.5 flex-1 flex flex-col">
          <h3 className="font-serif text-primary text-[1.0625rem] leading-snug">{nomeLugar(lugar.name)}</h3>
          {lugar.address && (
            <a href={linkComoChegar(lugar)} target="_blank" rel="noopener noreferrer" aria-label={`Como chegar: ${lugar.address}`}
              className="group/mapa mt-1 flex gap-1.5 text-on-surface-variant text-[13px] leading-snug hover:text-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-[3px] flex-shrink-0">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" />
              </svg>
              <span className="line-clamp-2 underline-offset-4 decoration-primary/30 group-hover/mapa:underline">{lugar.address}</span>
            </a>
          )}
          {/* Sem endereço (o cartão "Pontos de venda" e a revenda sem endereço), a linha do lugar vai onde os outros mostram o endereço. */}
          {!lugar.address && revenda && lugar.description && <p className="text-on-surface-variant text-[13px] mt-1 leading-snug line-clamp-2">{lugar.description}</p>}
          {lugar.ambient_count > 0 && <p className="text-on-surface-variant text-[13px] mt-1.5">{contaAmbientes(lugar.ambient_count)} com PFB</p>}
          <a href={destino} onClick={abrir} className="mt-auto pt-1 inline-flex items-center gap-1.5 min-h-11 text-primary text-xs tracking-[0.1em] uppercase font-semibold hover:text-[#2347A0]">
            {temPagina ? `Ver ${rotuloAcao.toLowerCase()}` : rotuloAcao} <span className="mv-seta inline-flex">{seta}</span>
          </a>
        </div>
      </article>
    );
  }

  return (
    <article className="h-full bg-white border border-surface-variant flex flex-col">
      {foto}
      <div className="px-5 pt-4 pb-5 flex-1 flex flex-col">
        <h3 className="font-serif text-primary text-xl leading-tight">{lugar.name}</h3>
        {lugar.address && <p className="text-on-surface-variant text-legenda mt-2 leading-snug">{lugar.address}</p>}
        {revenda && lugar.description && <p className="text-on-surface-variant text-corpo mt-2 leading-snug">{lugar.description}</p>}
        {lugar.ambient_count > 0 && <p className="text-on-surface-variant text-legenda mt-2 font-semibold">{contaAmbientes(lugar.ambient_count)} com PFB</p>}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-5">
          <a href={destino} onClick={abrir} className={`${botao} bg-primary text-white hover:bg-[#2347A0]`}>
            {rotuloAcao} {seta}
          </a>
          <a href={linkComoChegar(lugar)} target="_blank" rel="noopener noreferrer"
            className={`${botao} border border-primary text-primary hover:bg-primary hover:text-white`}>
            Como chegar
          </a>
        </div>
      </div>
    </article>
  );
}
