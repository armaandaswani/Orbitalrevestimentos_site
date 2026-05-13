"use client";

import { useState } from "react";

const mdfRows = [
  { attr: "Absorção de água (48h)",              pfb: "0,2%",                       mdf: "Até 35%",               highlight: true  },
  { attr: "Resistência ao fogo",                 pfb: "Não propaga chamas",          mdf: "Classe C/D",            highlight: false },
  { attr: "Resistência à flexão",                pfb: "72,3 MPa",                    mdf: "17–22 MPa",             highlight: true  },
  { attr: "Flexibilidade / instalação em curvas",pfb: "Possível (curvável)",          mdf: "Não recomendado",       highlight: false },
  { attr: "Vida útil (clima úmido)",             pfb: "10+ anos",                    mdf: "2–3 anos em Manaus",    highlight: true  },
  { attr: "Anti-mofo · Anti-cupim",              pfb: "Resistente por natureza",     mdf: "Suscetível à umidade",  highlight: false },
  { attr: "Poeira / Resíduo na instalação",      pfb: "Mínimo",                      mdf: "Poeira tóxica de MDF",  highlight: false },
  { attr: "Tempo de instalação",                 pfb: "2–3 horas por cômodo",        mdf: "Dias (obra pesada)",    highlight: false },
  { attr: "Custo de mão de obra",                pfb: "~ R$ 32/m²",                  mdf: "R$ 60–90/m²",           highlight: true  },
  { attr: "Peso",                                pfb: "3,5 kg/m²",                   mdf: "11 kg/m²",              highlight: false },
  { attr: "Matéria-prima",                       pfb: "Bambu renovável · sem formol",mdf: "Madeira + formol",      highlight: false },
];

export default function MdfComparison() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-12 border-t border-white/15 pt-10">
      <div className="mb-5">
        <p className="text-[#a1d494] text-[10px] tracking-[0.25em] uppercase font-bold font-[var(--font-inter)] mb-2">
          Dados técnicos · ART de Eng. Civil
        </p>
        <p className="text-white/60 text-sm font-[var(--font-inter)]">
          11 critérios avaliados com base em ficha técnica e condições reais de uso no clima do Amazonas.
        </p>
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-3 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] bg-white/10 border border-white/40 text-white px-8 py-4 hover:bg-white hover:text-[#1a365d] transition-colors duration-200"
      >
        {open ? "Ocultar" : "Ver"} comparativo técnico detalhado PFB vs MDF
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-white/20">
                <th className="text-left py-5 px-4 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-white/40">
                  Critério
                </th>
                <th className="text-left py-5 px-4 font-[var(--font-noto-serif)] text-white text-xl font-normal">
                  PFB Orbital
                </th>
                <th className="text-left py-5 px-4 font-[var(--font-noto-serif)] text-white/50 text-xl font-normal">
                  MDF Convencional
                </th>
              </tr>
            </thead>
            <tbody>
              {mdfRows.map(({ attr, pfb, mdf, highlight }) => (
                <tr
                  key={attr}
                  className={`border-b border-white/10 transition-colors ${
                    highlight ? "bg-white/8" : "hover:bg-white/5"
                  }`}
                >
                  <td className="py-4 px-4 text-sm font-medium font-[var(--font-inter)] text-white/70">
                    {attr}
                    {highlight && (
                      <span className="ml-2 text-[9px] tracking-[0.08em] uppercase font-bold text-[#a1d494] font-[var(--font-inter)]">
                        destaque
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm font-semibold text-white font-[var(--font-inter)]">
                    {pfb}
                  </td>
                  <td className="py-4 px-4 text-sm text-white/45 font-[var(--font-inter)]">
                    {mdf}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-white/30 text-xs font-[var(--font-inter)] italic mt-6">
            ART nº AM20260593657 · Eng. Civil Werksson Sousa, CREA 042030134-8-D. Dados sujeitos a alteração sem aviso prévio.
          </p>
        </div>
      )}
    </div>
  );
}
