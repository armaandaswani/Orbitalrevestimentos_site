"use client";

import { useState } from "react";

const SECTIONS = [
  {
    heading: "Dimensões e Formato",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="0" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    ),
    rows: [
      { label: "Comprimento",       value: "2,90 m" },
      { label: "Largura",           value: "1,20 m" },
      { label: "Espessura",         value: "5 mm" },
      { label: "Área por placa",    value: "3,48 m²" },
      { label: "Peso por placa",    value: "≈ 12,2 kg" },
      { label: "Número de camadas", value: "5 camadas" },
    ],
  },
  {
    heading: "Propriedades Mecânicas",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
    rows: [
      { label: "Resistência à flexão",  value: "72,3 MPa" },
      { label: "Densidade",             value: "682 kg/m³" },
      { label: "Peso por m²",           value: "3,5 kg/m²" },
      { label: "Módulo de elasticidade",value: "Alta rigidez longitudinal" },
    ],
  },
  {
    heading: "Comportamento Hídrico",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      </svg>
    ),
    rows: [
      { label: "Inchamento (48h imerso)",   value: "0,2%" },
      { label: "Teor de umidade interno",   value: "0,5%" },
      { label: "Absorção superficial",      value: "Mínima — film PVC impermeável" },
      { label: "Comportamento em chuva",    value: "Não recomendado para exterior direto" },
    ],
  },
  {
    heading: "Resistência e Durabilidade",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    rows: [
      { label: "Vida útil estimada",     value: "10+ anos no clima amazônico" },
      { label: "Ciclos térmicos",        value: "Testado de –10°C a +80°C sem deformação" },
      { label: "Resistência a fungos",   value: "Anti-mofo — bambu não é substrato fúngico" },
      { label: "Resistência a pragas",   value: "Anti-cupim — fibra processada sem atração" },
      { label: "Resistência UV",         value: "Film protetora UV na camada superficial" },
    ],
  },
  {
    heading: "Composição e Segurança",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    rows: [
      { label: "Substrato",            value: "Fibra de bambu laminada" },
      { label: "Camada estrutural",    value: "PVC estrutural de alta densidade" },
      { label: "Acabamento visual",    value: "Film PVC com impressão fotorrealista" },
      { label: "Proteção superficial", value: "Film UV anti-risco" },
      { label: "Formaldeído (VOC)",    value: "Ausente — formulação sem formol" },
      { label: "Odor",                 value: "Inodoro — seguro em ambientes habitados" },
    ],
  },
  {
    heading: "Aplicação e Restrições",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    rows: [
      { label: "Parede interna",         value: "✓ Recomendado" },
      { label: "Forro de teto interno",  value: "✓ Recomendado" },
      { label: "Fachada interna",        value: "✓ Permitido (sem exposição direta à chuva)" },
      { label: "Fachada externa",        value: "✗ Não recomendado" },
      { label: "Piso",                   value: "✗ Não indicado" },
      { label: "Ambientes úmidos",       value: "✓ Banheiros, cozinhas, áreas de serviço" },
      { label: "Instalação",             value: "Cola PU (paredes) · Cola de contato (tetos)" },
      { label: "Tempo por cômodo",       value: "2–3 horas" },
    ],
  },
];

export default function FichaTecnicaAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border border-[#1a365d] overflow-hidden">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#1a365d]/40 transition-colors group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {/* Doc icon */}
          <div className="flex-shrink-0 w-8 h-8 bg-[#1a365d] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86a0cd" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <p className="text-[#86a0cd] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">
              Especificações Completas
            </p>
            <p className="text-white text-sm font-semibold font-[var(--font-inter)] mt-0.5">
              Ficha Técnica Detalhada — PFB Orbital
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
        <div className="border-t border-[#1a365d] bg-[#0a1628]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1a365d]">
            {SECTIONS.map((section) => (
              <div key={section.heading} className="px-5 py-5">
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-[#1a365d] flex items-center justify-center text-[#86a0cd] flex-shrink-0">
                    {section.icon}
                  </div>
                  <p className="text-[#86a0cd] text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)]">
                    {section.heading}
                  </p>
                </div>
                {/* Rows */}
                <div className="space-y-2">
                  {section.rows.map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <span className="text-white/50 text-[10px] font-[var(--font-inter)] leading-snug shrink-0 max-w-[48%]">
                        {label}
                      </span>
                      <span
                        className={`text-[10px] font-[var(--font-inter)] leading-snug text-right font-medium ${
                          value.startsWith("✓")
                            ? "text-[#a1d494]"
                            : value.startsWith("✗")
                            ? "text-[#f08080]"
                            : "text-white"
                        }`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="border-t border-[#1a365d] px-5 py-3 flex items-center gap-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#86a0cd" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[#86a0cd] text-[9px] font-[var(--font-inter)]">
              Dados extraídos de ficha técnica laboratorial e ART nº AM20260593657 · CREA 042030134-8-D
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
