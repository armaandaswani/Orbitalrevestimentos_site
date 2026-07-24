"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

interface HomeProject { slug: string; title: string; image_after: string; show_on_home?: boolean; feature_order?: number; }
interface Item { src: string; label: string; slug?: string }

// Grade de projetos da home. Mostra os projetos marcados como "Exibir na página
// inicial" (painel → Projetos). Sem nenhum marcado, cai nas imagens estáticas —
// então a home nunca fica vazia.
export default function HomeProjectsGrid({ fallback }: { fallback: Item[] }) {
  const [items, setItems] = useState<Item[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects/photos")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: HomeProject[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const featured = data
          .filter((p) => p.show_on_home && p.image_after)
          .sort((a, b) => (a.feature_order ?? 0) - (b.feature_order ?? 0))
          .slice(0, 4)
          .map((p) => ({ src: p.image_after, label: p.title, slug: p.slug }));
        if (featured.length > 0) setItems(featured);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ src, label, slug }, i) => {
        const inner = (
          <div className="relative aspect-square sm:aspect-[4/5] overflow-hidden group">
            <Image src={src} alt={label} fill className="object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
            <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/40 transition-all duration-500" />
            <div className="hidden sm:block absolute inset-x-0 bottom-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-400">
              <p className="text-white text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)]">{label}</p>
              <div className="h-px bg-white/50 mt-1.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </div>
          </div>
        );
        return (
          <ScrollReveal key={`${label}-${i}`} delay={i * 80} direction="up">
            {slug ? <Link href="/projetos" className="block">{inner}</Link> : inner}
            <p className="sm:hidden text-white/50 text-[9px] tracking-[0.1em] uppercase font-[var(--font-inter)] mt-1.5 leading-tight">{label}</p>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
