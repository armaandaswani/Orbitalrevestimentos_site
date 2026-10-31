"use client";

import Image from "next/image";
import { COVER_ASPECT, coverStyle } from "@/lib/cover-crop";
import { autoriaTxt, modelosTxt } from "@/lib/projeto-modelos";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Cartão de um projeto. Toda obra usa a mesma etiqueta, sempre na mesma ordem:
 * modelo(s) · título · autoria. É o que faz a grade ler como uma coleção.
 * Clique (ou Enter) abre a galeria do projeto.
 */
export default function ProjetoCard({
  projeto, onAbrir, sizes = "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw", prioridade = false,
}: {
  projeto: Projeto;
  onAbrir: (p: Projeto) => void;
  sizes?: string;
  prioridade?: boolean;
}) {
  const temAntes = !!projeto.image_before && projeto.image_before !== projeto.image_after;
  const autoria = autoriaTxt(projeto.projeto_de);
  return (
    <button type="button" onClick={() => onAbrir(projeto)}
      className="group w-full text-left bg-white flex flex-col h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0]">
      {/* 4:5, a proporção do enquadrador do painel: o recorte (foco + zoom) vem do projeto. */}
      <span className="relative block w-full overflow-hidden bg-surface-container" style={{ aspectRatio: COVER_ASPECT }}>
        <Image src={projeto.image_after} alt={projeto.title} fill sizes={sizes} priority={prioridade}
          className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          style={coverStyle(projeto.cover_focus_x, projeto.cover_focus_y, projeto.cover_zoom)} />
        <span className="absolute top-2 left-2 flex flex-wrap gap-1">
          {projeto.is_new && <span className="bg-secondary text-primary text-xs tracking-[0.12em] uppercase font-bold px-2 py-1">Novo</span>}
          {temAntes && <span className="bg-primary/85 text-white text-xs tracking-[0.08em] uppercase font-bold px-2 py-1">Antes e depois</span>}
        </span>
      </span>
      <span className="flex flex-col flex-1 px-3 pt-3 pb-4 border-t border-surface-container">
        <span className="text-[#2347A0] text-xs tracking-[0.12em] uppercase font-semibold">{modelosTxt(projeto) || "PFB"}</span>
        <span className="font-serif text-primary text-base leading-snug mt-1">{projeto.title}</span>
        {autoria && <span className="text-on-surface-variant text-sm italic mt-1">{autoria}</span>}
      </span>
    </button>
  );
}
