"use client";

import { useState } from "react";

export default function ARTAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 border border-[#1a365d] overflow-hidden">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#1a365d]/40 transition-colors group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {/* Shield / ART icon */}
          <div className="flex-shrink-0 w-8 h-8 bg-[#1a365d] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1d494" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">
              Certificação Técnica
            </p>
            <p className="text-white text-sm font-semibold font-[var(--font-inter)] mt-0.5">
              ART &mdash; Anotação de Responsabilidade Técnica
            </p>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86a0cd" strokeWidth="2"
          className={`flex-shrink-0 ml-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-[#1a365d] px-5 py-6 bg-[#0a1628]">
          {/* What is ART */}
          <div className="mb-6">
            <p className="text-[#86a0cd] text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-2">
              O que é a ART?
            </p>
            <p className="text-white/75 text-sm font-[var(--font-inter)] leading-relaxed">
              A <strong className="text-white">Anotação de Responsabilidade Técnica</strong> é um documento
              obrigatório emitido pelo CREA que vincula um engenheiro habilitado
              às responsabilidades técnicas de um produto ou projeto. É a garantia
              de que o PFB Orbital foi avaliado, testado e aprovado por um profissional
              de engenharia — não é um simples laudo comercial.
            </p>
          </div>

          {/* ART details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {[
              { label: "Número da ART",          value: "AM20260593657" },
              { label: "Responsável Técnico",     value: "Eng. Civil Werksson Sousa" },
              { label: "Registro CREA",           value: "042030134-8-D" },
              { label: "Escopo de aplicação",     value: "Revestimento de parede e forro de teto" },
              { label: "Ensaios realizados",      value: "Resistência à flexão, inchamento, densidade, umidade, ciclos térmicos" },
              { label: "Validade",                value: "Documentação ativa — disponível mediante solicitação" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#002045]/60 border border-[#1a365d] px-4 py-3">
                <p className="text-[#86a0cd] text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1">
                  {label}
                </p>
                <p className="text-white text-xs font-[var(--font-inter)] leading-snug">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Why it matters */}
          <div className="bg-[#1a365d]/50 border-l-2 border-[#a1d494] px-4 py-3 mb-5">
            <p className="text-[#a1d494] text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1">
              Por que isso importa?
            </p>
            <p className="text-white/70 text-xs font-[var(--font-inter)] leading-relaxed">
              Com a ART, o PFB Orbital pode ser especificado em projetos de arquitetura e engenharia com
              respaldo técnico formal — exigido em obras comerciais, clínicas, condomínios e projetos
              públicos. É o único revestimento laminado de bambu com essa certificação no Amazonas.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
