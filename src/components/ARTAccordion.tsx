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

          {/* CTA */}
          <a
            href="https://wa.me/5592988150149?text=Olá! Gostaria de solicitar a ficha técnica completa do PFB Orbital com ART/CREA."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#2d5228] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Solicitar ficha técnica completa (ART/CREA)
          </a>
        </div>
      )}
    </div>
  );
}
