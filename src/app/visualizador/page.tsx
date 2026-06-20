"use client";

import React from "react";
import Link from "next/link";
import VisualizadorWizard from "@/components/VisualizadorWizard";

const WA_BASE = "https://wa.me/5592988150149?text=";

export default function VisualizadorPage() {
  return (
    <main className="bg-white">
      <section className="relative bg-[#002045] pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative max-w-[1100px] mx-auto text-center">
          <p className="text-[#86a0cd] text-[11px] tracking-[0.25em] uppercase font-bold font-[var(--font-inter)] mb-4">
            Visualizador Orbital
          </p>
          <h1 className="text-white font-[var(--font-noto-serif)] text-4xl sm:text-5xl leading-tight mb-5">
            Veja os acabamentos no <span className="text-[#a1d494]">seu ambiente</span>
          </h1>
          <p className="text-white/70 font-[var(--font-inter)] text-base sm:text-lg max-w-[640px] mx-auto leading-relaxed">
            Envie uma foto, toque nas superfícies (parede, teto, móvel…) e escolha um
            acabamento para cada uma. A IA aplica cada modelo na área certa,
            respeitando o tamanho real das placas.
          </p>
        </div>
      </section>

      <VisualizadorWizard />

      <section className="bg-[#002045] px-6 py-16">
        <div className="max-w-[820px] mx-auto text-center">
          <h2 className="text-white font-[var(--font-noto-serif)] text-3xl mb-4">Gostou do resultado?</h2>
          <p className="text-white/70 font-[var(--font-inter)] mb-8 leading-relaxed">
            Fale com a Orbital e transforme a simulação em projeto real. Pronta-entrega em Manaus,
            instalação sem obra em poucas horas.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={`${WA_BASE}${encodeURIComponent("Olá! Usei o Visualizador de revestimentos e gostaria de um orçamento.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25d366] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:brightness-95 transition"
            >
              Falar no WhatsApp
            </a>
            <Link
              href="/produtos"
              className="border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-white hover:text-[#002045] transition-colors"
            >
              Ver acabamentos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
