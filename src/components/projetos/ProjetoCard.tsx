"use client";

import Image from "next/image";
import { COVER_ASPECT, coverStyle } from "@/lib/cover-crop";
import { autoriaTxt, modelosTxt } from "@/lib/projeto-modelos";
import { temAntesDepois } from "@/lib/project-gallery";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Cartão de um projeto. Toda obra usa a mesma etiqueta, sempre na mesma ordem:
 * modelo(s) · título · autoria. É o que faz a grade ler como uma coleção.
 *
 * Com `href` é um link de verdade (sem JavaScript continua levando a algum
 * lugar; na home, leva à página de Projetos já com a galeria aberta). Com
 * `onAbrir`, o clique abre a galeria no lugar, sem trocar de página.
 *
 * Com `detalhe` é o cartão da grade de /projetos: foto, título e uma linha
 * discreta (modelo e lugar). Os selos ficam pequenos, em caixa normal.
 */
export default function ProjetoCard({
  projeto, onAbrir, href, sizes = "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw", prioridade = false, detalhe,
}: {
  projeto: Projeto;
  onAbrir?: (p: Projeto) => void;
  href?: string;
  sizes?: string;
  prioridade?: boolean;
  /** Linha discreta sob o título (ex.: "ORB-004 · Residencial"): liga o formato da grade. */
  detalhe?: string;
}) {
  // A mesma regra da galeria: com o selo, ela abre direto no lado a lado.
  const temAntes = temAntesDepois(projeto);
  const autoria = autoriaTxt(projeto.projeto_de);
  const grade = detalhe !== undefined;
  const classe = `group w-full text-left flex flex-col h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0] ${grade ? "" : "bg-white"}`;
  const selo = "bg-white/92 text-primary text-[11px] leading-none font-semibold px-1.5 py-1";
  const miolo = grade ? (
    <>
      <span className="relative block w-full overflow-hidden bg-surface-container" style={{ aspectRatio: COVER_ASPECT }}>
        {/* alt vazio: o título visível logo abaixo já dá nome ao link. */}
        <Image src={projeto.image_after} alt="" fill sizes={sizes} priority={prioridade}
          className="mv-zoom"
          style={coverStyle(projeto.cover_focus_x, projeto.cover_focus_y, projeto.cover_zoom)} />
        {(projeto.is_new || temAntes) && (
          <span className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
            {projeto.is_new && <span className={selo}>Novo</span>}
            {temAntes && <span className={selo}>Antes e depois</span>}
          </span>
        )}
      </span>
      <span className="font-serif text-primary text-[1.0625rem] sm:text-lg leading-snug mt-2.5 line-clamp-2">{projeto.title}</span>
      {detalhe && <span className="text-on-surface-variant text-[13px] leading-snug mt-1 truncate">{detalhe}</span>}
    </>
  ) : (
    <>
      {/* 4:5, a proporção do enquadrador do painel: o recorte (foco + zoom) vem do projeto. */}
      <span className="relative block w-full overflow-hidden bg-surface-container" style={{ aspectRatio: COVER_ASPECT }}>
        <Image src={projeto.image_after} alt={projeto.title} fill sizes={sizes} priority={prioridade}
          className="mv-zoom"
          style={coverStyle(projeto.cover_focus_x, projeto.cover_focus_y, projeto.cover_zoom)} />
        <span className="absolute top-2 left-2 flex flex-wrap gap-1">
          {projeto.is_new && <span className="bg-secondary text-primary text-sobre tracking-[0.12em] uppercase font-bold px-2 py-1">Novo</span>}
          {temAntes && <span className="bg-primary/85 text-white text-sobre tracking-[0.08em] uppercase font-bold px-2 py-1">Antes e depois</span>}
        </span>
      </span>
      <span className="flex flex-col flex-1 px-3 pt-3 pb-4 border-t border-surface-container">
        <span className="text-[#2347A0] text-sobre tracking-[0.12em] uppercase font-semibold">{modelosTxt(projeto) || "PFB"}</span>
        <span className="font-serif text-primary text-base leading-snug mt-1">{projeto.title}</span>
        {autoria && <span className="text-on-surface-variant text-legenda italic mt-1">{autoria}</span>}
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={classe} data-cursor="ver" onClick={(e) => { if (!onAbrir || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onAbrir(projeto); }}>
        {miolo}
      </a>
    );
  }
  return <button type="button" onClick={() => onAbrir?.(projeto)} className={classe} data-cursor="ver">{miolo}</button>;
}
