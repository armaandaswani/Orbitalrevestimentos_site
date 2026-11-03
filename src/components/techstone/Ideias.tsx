"use client";

import { useState } from "react";
import Trilho from "@/components/projetos/Trilho";
import { FORMATOS, MODELOS_TECHSTONE, cena, type FormatoTechStone } from "@/lib/techstone";

interface Ideia {
  src: string;
  alt: string;
  titulo: string;
  modelo: string;
}

/**
 * Ideias de projeto com a TechStone. Todas as imagens são geradas por IA a
 * partir da textura de cada modelo (o modelo e o tamanho vêm do cadastro,
 * em lib/techstone). Arquivo novo = nome novo (cache de 1 ano).
 */
const IDEIAS: Ideia[] = [
  { src: "/images/techstone/ideias/casa-v1.webp", titulo: "Fachada de casa", modelo: "travertino-romano-classico",
    alt: "Casa contemporânea com a fachada em travertino bege em placas de 1200 por 600, gerada por IA a partir da textura TechStone Travertino Romano Clássico" },
  { src: "/images/techstone/ideias/hall-v1.webp", titulo: "Hall de edifício", modelo: "travertino-navona-classico",
    alt: "Hall de pé-direito duplo com parede em travertino em placas grandes, gerado por IA a partir da textura TechStone Travertino Navona Clássico" },
  { src: "/images/techstone/ideias/cozinha-v1.webp", titulo: "Ilha de cozinha curva", modelo: "taj-mahal",
    alt: "Ilha de cozinha com as pontas arredondadas revestidas em pedra creme, gerada por IA a partir da textura TechStone Taj Mahal" },
  { src: "/images/techstone/ideias/escada-v1.webp", titulo: "Parede da escada", modelo: "travertino-bianco-trevi",
    alt: "Escada curva com a parede acompanhando a curva em travertino claro, gerada por IA a partir da textura TechStone Travertino Bianco Trevi" },
  { src: "/images/techstone/ideias/loja-v1.webp", titulo: "Loja de esquina", modelo: "nogueira-americana",
    alt: "Loja com a esquina arredondada revestida em madeira escura, gerada por IA a partir da textura TechStone Nogueira Americana" },
  { src: cena("interior").mobile, titulo: "Sala", modelo: "taj-mahal",
    alt: "Sala com parede de canto curvo gerada por IA a partir da textura TechStone Taj Mahal" },
  { src: cena("coluna").mobile, titulo: "Coluna redonda", modelo: "travertino-bianco-trevi",
    alt: "Coluna redonda em travertino claro gerada por IA a partir da textura TechStone Travertino Bianco Trevi" },
  { src: cena("fachada").mobile, titulo: "Fachada comercial", modelo: "travertino-romano-classico",
    alt: "Fachada de edifício em travertino bege gerada por IA a partir da textura TechStone Travertino Romano Clássico" },
];

const modeloDe = (slug: string) => MODELOS_TECHSTONE.find((m) => m.slug === slug)!;

export default function Ideias({ verTamanho }: {
  /** Leva o visitante à seção de tamanhos já no tamanho da ideia. */
  verTamanho: (t: FormatoTechStone) => void;
}) {
  const [filtro, setFiltro] = useState<FormatoTechStone | "todos">("todos");
  const lista = IDEIAS.filter((i) => filtro === "todos" || modeloDe(i.modelo).formato === filtro);
  const opcoes: { value: FormatoTechStone | "todos"; rotulo: string }[] = [
    { value: "todos", rotulo: "Todas" },
    ...FORMATOS.map((f) => ({ value: f.value, rotulo: f.rotulo })),
  ];

  return (
    <section aria-labelledby="ts-ideias" className="bg-[#F6F3EE] ds-secao overflow-hidden">
      <div className="ds-wrap">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h2 id="ts-ideias" className="font-serif text-t1 text-[#22201C]">Ideias para o seu projeto.</h2>
            <p className="mt-3 text-corpo text-[#4A4540] max-w-[46ch]">
              Cada imagem foi gerada por IA a partir da textura do modelo. Toque numa ideia para ver o tamanho e os modelos.
            </p>
          </div>
          <div role="group" aria-label="Filtrar por tamanho" className="flex gap-2 overflow-x-auto scrollbar-none -mx-[clamp(1rem,4.2vw,4rem)] px-[clamp(1rem,4.2vw,4rem)] md:mx-0 md:px-0">
            {opcoes.map((o) => (
              <button key={o.value} type="button" aria-pressed={filtro === o.value} onClick={() => setFiltro(o.value)}
                className={`shrink-0 min-h-11 px-4 rounded-full border text-legenda font-semibold transition-colors ${
                  filtro === o.value ? "bg-[#22201C] border-[#22201C] text-white" : "border-[#22201C]/20 text-[#22201C] hover:border-[#22201C]/50"
                }`}>
                {o.rotulo}
              </button>
            ))}
          </div>
        </div>

        <Trilho key={filtro} rotulo="Ideias com TechStone" largura="w-[76%] sm:w-[42%] lg:w-[28%]">
          {lista.map((i) => {
            const m = modeloDe(i.modelo);
            const f = FORMATOS.find((x) => x.value === m.formato)!;
            return (
              <button key={i.src} type="button" onClick={() => verTamanho(m.formato)} className="group block w-full text-left"
                aria-label={`${i.titulo} em ${m.nome}, ${f.rotulo}. Ver este tamanho`}>
                <span className="relative block aspect-[4/5] overflow-hidden bg-[#D9D1C4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.src} alt={i.alt} loading="lazy" decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.03]" />
                  <span className="absolute left-3 bottom-3 bg-[#141210]/70 text-white text-[11px] tracking-[0.02em] px-2 py-1">Gerada por IA</span>
                </span>
                <span className="mt-3 block font-serif text-[1.0625rem] text-[#22201C]">{i.titulo}</span>
                <span className="mt-0.5 block text-legenda text-[#6B6158]">{m.nome} · <span className="tabular-nums">{f.rotulo}</span></span>
              </button>
            );
          })}
        </Trilho>
      </div>
    </section>
  );
}
