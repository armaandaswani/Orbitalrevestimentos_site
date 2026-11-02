"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Narrativa com quadro fixo (sticky storytelling). No computador, a foto
 * fica parada à esquerda enquanto os passos sobem à direita; cada passo que
 * chega ao meio da tela troca a foto (cruzamento só de opacidade) e acende o
 * próprio texto. No celular, cada passo traz a sua foto logo acima do texto:
 * leitura linear, sem nada preso na tela pequena.
 *
 * Sem JavaScript: todos os passos aparecem acesos e o quadro mostra a
 * primeira foto. Com movimento reduzido, a troca é instantânea.
 */
export interface Passo {
  titulo: string;
  texto: React.ReactNode;
  imagem: { src: string; alt: string };
  /** Detalhe curto em destaque (ex.: "~11 kg por placa"). */
  destaque?: string;
}

export default function HistoriaFixa({ passos, sizesQuadro = "(max-width: 1023px) 100vw, 45vw" }: { passos: Passo[]; sizesQuadro?: string }) {
  const [ativo, setAtivo] = useState(0);
  const [js, setJs] = useState(false);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setJs(true), 0);
    if (typeof IntersectionObserver === "undefined") return () => clearTimeout(t);
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) setAtivo(Number((e.target as HTMLElement).dataset.passo));
    }, { rootMargin: "-48% 0px -48% 0px" });
    refs.current.forEach((el) => el && obs.observe(el));
    return () => { clearTimeout(t); obs.disconnect(); };
  }, []);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-[clamp(3rem,6vw,7rem)]">
      {/* Quadro fixo (só computador). Decorativo: cada passo tem a sua foto com texto alternativo no celular. */}
      <div className="hidden lg:block">
        <div className="sticky top-24 h-[min(calc(100svh-9rem),40rem)] overflow-hidden bg-primary">
          {passos.map((p, i) => (
            <div key={p.imagem.src} aria-hidden={i !== ativo}
              className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${i === ativo ? "opacity-100" : "opacity-0"}`}>
              <Image src={p.imagem.src} alt={i === ativo ? p.imagem.alt : ""} fill sizes={sizesQuadro} className="object-cover" />
            </div>
          ))}
          {/* Contador do quadro */}
          <p aria-hidden className="absolute left-5 bottom-5 bg-white/90 text-primary font-serif text-sm px-3 py-1.5 tabular-nums">
            {String(ativo + 1).padStart(2, "0")} <span className="text-primary/50">/ {String(passos.length).padStart(2, "0")}</span>
          </p>
        </div>
      </div>

      <ol className="space-y-14 lg:space-y-0">
        {passos.map((p, i) => (
          <li key={p.titulo} ref={(el) => { refs.current[i] = el; }} data-passo={i}
            className="lg:min-h-[52svh] lg:flex lg:flex-col lg:justify-center">
            <div className="lg:hidden relative overflow-hidden bg-primary mb-6" style={{ aspectRatio: "4 / 3" }}>
              <Image src={p.imagem.src} alt={p.imagem.alt} fill sizes="(max-width: 1023px) 92vw, 1px" className="object-cover mv-desvela" />
            </div>
            <div className={`transition-opacity duration-500 motion-reduce:transition-none ${js && i !== ativo ? "lg:opacity-35" : "opacity-100"}`}>
              <p className="font-serif text-primary/50 text-lg tabular-nums">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="font-serif text-primary text-t2 font-normal tracking-[-0.02em] mt-2 text-balance">{p.titulo}</h3>
              {p.destaque && <p className="mt-3 text-[#1F7A44] text-sobre tracking-[0.14em] uppercase font-semibold">{p.destaque}</p>}
              <div className="text-corpo text-on-surface-variant mt-3 max-w-lg text-pretty">{p.texto}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
