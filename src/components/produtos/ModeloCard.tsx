"use client";

import Image from "next/image";
import { fotosDoProduto, type Produto } from "@/lib/produtos-dados";

/**
 * Cartão de um modelo do catálogo, no mesmo desenho dos cartões de projeto
 * (etiqueta: linha · nome · acabamento). É um link de verdade para
 * /produtos?modelo=<código>; com JavaScript, o clique abre a ficha no lugar.
 */
export default function ModeloCard({
  produto, href, onAbrir, sizes = "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw", prioridade = false,
}: {
  produto: Produto;
  href: string;
  onAbrir?: (p: Produto) => void;
  sizes?: string;
  prioridade?: boolean;
}) {
  const fotos = fotosDoProduto(produto).length;
  return (
    <a href={href} onClick={(e) => { if (!onAbrir || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onAbrir(produto); }}
      className="group w-full text-left bg-white flex flex-col h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0]">
      <span className="relative block w-full overflow-hidden bg-surface-container" style={{ aspectRatio: "4 / 5" }}>
        <Image src={produto.image_path} alt={`${produto.name} — Linha ${produto.linha}`} fill sizes={sizes} priority={prioridade} className="object-cover mv-zoom" />
        <span className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className="bg-white/95 text-primary text-sobre tracking-[0.12em] uppercase font-bold px-2 py-1">{produto.finish}</span>
          {fotos > 1 && <span className="bg-primary/85 text-white text-sobre tracking-[0.08em] uppercase font-bold px-2 py-1">{fotos} fotos</span>}
        </span>
      </span>
      <span className="flex flex-col flex-1 px-3 pt-3 pb-4 border-t border-surface-container">
        <span className="text-[#2347A0] text-sobre tracking-[0.12em] uppercase font-semibold">{produto.code} · {produto.linha}</span>
        <span className="font-serif text-primary text-base leading-snug mt-1">{produto.name}</span>
        <span className="text-on-surface-variant text-legenda mt-1">2,90 × 1,20 m · 5 mm</span>
      </span>
    </a>
  );
}
