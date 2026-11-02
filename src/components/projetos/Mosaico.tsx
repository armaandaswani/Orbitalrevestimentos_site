"use client";

import Image from "next/image";
import { coverStyle } from "@/lib/cover-crop";
import { modelosTxt } from "@/lib/projeto-modelos";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Abertura da coleção: três obras reais, já com etiqueta, uma grande e duas
 * menores. A legenda fica numa faixa sólida abaixo da foto, nunca por cima.
 * Cada peça é um link (href) que, com JavaScript, abre a galeria no lugar.
 */
export default function Mosaico({ projetos, onAbrir, href }: { projetos: Projeto[]; onAbrir: (p: Projeto) => void; href: (p: Projeto) => string }) {
  const [a, b, c] = projetos;
  if (!a) return null;
  const tile = (p: Projeto, grande: boolean, prioridade: boolean) => (
    <a href={href(p)} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onAbrir(p); }}
      className={`group relative flex flex-col overflow-hidden bg-primary text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${grande ? "row-span-2" : ""}`}>
      <span className="relative block flex-1 min-h-0 overflow-hidden">
        <Image src={p.image_after} alt={p.title} fill priority={prioridade}
          sizes={grande ? "(max-width: 1023px) 56vw, (max-width: 1920px) 400px, 21vw" : "(max-width: 1023px) 44vw, (max-width: 1920px) 300px, 16vw"}
          className="mv-zoom"
          style={coverStyle(p.cover_focus_x, p.cover_focus_y, p.cover_zoom)} />
      </span>
      <span className="block flex-shrink-0 px-3 py-2.5 bg-[#00172d] border-t border-white/10">
        <span className="block text-secondary text-sobre tracking-[0.12em] uppercase font-semibold truncate">{modelosTxt(p) || "PFB"}</span>
        <span className="block text-white text-sm leading-snug truncate mt-0.5">{p.title}</span>
      </span>
    </a>
  );
  return (
    <div className={`grid gap-2 h-[380px] sm:h-[460px] lg:h-[520px] ${b ? "grid-cols-[1.15fr_1fr] grid-rows-2" : "grid-cols-1"}`}>
      {tile(a, true, true)}
      {b && <div className={`grid gap-2 ${c ? "row-span-2 grid-rows-2" : "row-span-2"}`}>{tile(b, false, false)}{c && tile(c, false, false)}</div>}
    </div>
  );
}
