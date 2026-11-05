"use client";

import React from "react";
import Link from "next/link";
import VisualizadorWizard from "@/components/VisualizadorWizard";
import ContatoCta from "@/components/ContatoCta";

const COMO_FUNCIONA = [
  { t: "Envie a foto", d: "Use uma foto bem iluminada e de frente para o ambiente." },
  { t: "Toque nas superfícies", d: "Toque numa parede, teto ou móvel e a IA marca a área. Depois escolha o acabamento de cada uma." },
  { t: "Gere e veja", d: "A IA aplica cada modelo na sua área, e tudo vai pronto para o orçamento." },
];

export default function VisualizadorPage() {
  return (
    <main className="bg-white">
      {/* Hero curto: o título e uma linha. A ferramenta começa logo abaixo. */}
      <section className="bg-[#0B1F45] px-4 sm:px-6 pt-24 pb-6 sm:pt-28 sm:pb-8">
        <div className="mx-auto max-w-[1280px] sm:text-center">
          <h1 className="text-white font-serif text-[1.75rem] leading-[1.15] sm:text-4xl [text-wrap:balance]">
            Veja os acabamentos no <span className="text-[#36A35C]">seu ambiente</span>
          </h1>
          <p className="mt-2 text-white/75 text-[15px] sm:text-base leading-relaxed">
            Envie uma foto, marque as paredes e veja o acabamento aplicado.
          </p>
        </div>
      </section>

      <VisualizadorWizard />

      <section aria-labelledby="como-funciona" className="border-t border-[#ececea] bg-[#F6F5F2] px-4 sm:px-6 py-14 sm:py-16">
        <div className="mx-auto max-w-[1100px]">
          <h2 id="como-funciona" className="font-serif text-[#0B1F45] text-2xl sm:text-3xl mb-8">Como funciona</h2>
          <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10">
            {COMO_FUNCIONA.map((s, i) => (
              <li key={s.t} className="flex gap-4 sm:flex-col sm:gap-3">
                <span aria-hidden className="font-serif text-[#36A35C] text-2xl leading-none w-6 shrink-0">{i + 1}</span>
                <div>
                  <p className="font-semibold text-[#0B1F45] text-[15px]">{s.t}</p>
                  <p className="mt-1 text-[#5b5f66] text-sm leading-relaxed max-w-[34ch]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#0B1F45] px-6 py-16">
        <div className="max-w-[820px] mx-auto text-center">
          <h2 className="text-white font-serif text-3xl mb-4">Gostou do resultado?</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            Fale com a Orbital e transforme a simulação em projeto real. Pronta-entrega em Manaus,
            instalação sem obra em poucas horas.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <ContatoCta
              className="bg-[#25d366] text-white text-xs tracking-[0.12em] uppercase font-bold px-7 py-3.5 hover:brightness-95 transition"
            >
              Falar no WhatsApp
            </ContatoCta>
            <Link
              href="/produtos/pfb"
              className="border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold px-7 py-3.5 hover:bg-white hover:text-[#0B1F45] transition-colors"
            >
              Ver acabamentos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
