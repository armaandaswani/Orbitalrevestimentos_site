"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useProgresso } from "@/components/ds/useProgresso";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Frase da página Nossa história (aprovada pelo dono). */
const FRASE = "Somos uma marca amazônica. Nascemos dos problemas que conhecemos de perto e fomos atrás das soluções que faltavam.";

/**
 * Quem somos, numa frase que acende palavra por palavra conforme a rolagem
 * (a tela fica parada enquanto isso). É o momento de movimento da home; o
 * resto entra só com o Revelar. Com movimento reduzido a frase aparece inteira.
 */
export default function Manifesto() {
  const ref = useProgresso<HTMLElement>();
  const palavras = FRASE.split(" ");
  return (
    <section ref={ref} aria-labelledby="quem-somos" className="hm-manifesto relative h-[220svh] bg-[#F6F5F2]">
      <div className="sticky top-0 h-[100svh] flex items-center">
        <div className="ds-wrap">
          <h2 id="quem-somos" className="sr-only">Quem somos</h2>
          <p className="font-serif text-[#0B1F45] text-[clamp(1.75rem,0.9rem+3.8vw,4.25rem)] leading-[1.14] tracking-[-0.02em] max-w-[22ch]">
            {palavras.map((p, i) => (
              <span key={i} className="hm-palavra" style={{ "--i": i / palavras.length } as Vars}>{p}{i < palavras.length - 1 ? " " : ""}</span>
            ))}
          </p>
          <Link href="/nossa-historia" className="hm-manifesto-link mt-10 inline-flex items-center gap-2 min-h-11 text-[#0B1F45] font-semibold border-b border-[#0B1F45]/30 hover:border-[#0B1F45]">
            Conhecer a nossa história
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
