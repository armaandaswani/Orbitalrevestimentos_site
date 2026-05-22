"use client";

import { useState } from "react";

const options = [
  { key: "mdf",   label: "MDF" },
  { key: "papel", label: "Papel de Parede" },
  { key: "forro", label: "Forro PVC" },
  { key: "tinta", label: "Tinta" },
];

type RowKey = "mdf" | "papel" | "forro" | "tinta";

const rows: { attr: string; pfb: string; mdf: string; papel: string; forro: string; tinta: string; highlight: boolean }[] = [
  {
    attr: "Resistência à umidade",
    pfb: "Impermeável (0,2%)",
    mdf: "Absorve até 35%",
    papel: "Descola, bolha e mofa",
    forro: "Impermeável, mas empena",
    tinta: "Descasca com umidade e mofa",
    highlight: true,
  },
  {
    attr: "Aspecto visual",
    pfb: "Fotorrealista & Textura Premium",
    mdf: "Liso ou revestido",
    papel: "Impresso em papel/vinil",
    forro: "Plástico brilhante ou opaco",
    tinta: "Liso, fosco ou brilhante",
    highlight: false,
  },
  {
    attr: "Durabilidade em Manaus",
    pfb: "10+ anos",
    mdf: "2–3 anos",
    papel: "1 a 2 anos",
    forro: "3–5 anos (amarela com UV)",
    tinta: "2–4 anos",
    highlight: true,
  },
  {
    attr: "Mofo",
    pfb: "Resistente por natureza",
    mdf: "Suscetível à umidade",
    papel: "Propenso por baixo",
    forro: "Acumula nas juntas",
    tinta: "Propenso em áreas úmidas",
    highlight: false,
  },
  {
    attr: "Uso como forro de teto",
    pfb: "Aprovado com ART/CREA",
    mdf: "Estrutura necessária",
    papel: "Não recomendado",
    forro: "Sim, mas visual básico",
    tinta: "Sim (sem textura)",
    highlight: false,
  },
  {
    attr: "Resistência ao fogo",
    pfb: "Não propaga chamas",
    mdf: "Classe C/D",
    papel: "Inflamável",
    forro: "Inflamável",
    tinta: "Varia",
    highlight: false,
  },
  {
    attr: "Tempo de instalação",
    pfb: "2–3h por cômodo",
    mdf: "Dias (obra pesada)",
    papel: "4–6h (secagem incluída)",
    forro: "Obra metálica necessária",
    tinta: "1–2 dias (secagem)",
    highlight: false,
  },
  {
    attr: "Adequado para áreas úmidas",
    pfb: "Sim",
    mdf: "Não",
    papel: "Não",
    forro: "Parcialmente",
    tinta: "Com tinta especial",
    highlight: true,
  },
  {
    attr: "Mão de obra",
    pfb: "Barato e Rápido",
    mdf: "Caro e Demorado",
    papel: "Barato e Rápido",
    forro: "Complexo",
    tinta: "Caro e Demorado",
    highlight: false,
  },
  {
    attr: "Matéria-prima",
    pfb: "Bambu renovável · sem formol",
    mdf: "Madeira + formol",
    papel: "Papel/vinil sintético",
    forro: "PVC",
    tinta: "Pigmentos + resinas",
    highlight: false,
  },
];

export default function MdfComparison() {
  const [selected, setSelected] = useState<RowKey>("mdf");
  const option = options.find((o) => o.key === selected)!;

  return (
    <div>
      {/* Selector */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <span className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)]">
          Comparar com:
        </span>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setSelected(o.key as RowKey)}
              className={`text-[11px] tracking-[0.06em] uppercase font-semibold font-[var(--font-inter)] px-4 py-2 border transition-colors duration-200 ${
                selected === o.key
                  ? "bg-[#002045] text-white border-[#002045]"
                  : "bg-white text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2-column table — always fits on screen */}
      <div className="w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#e2e2e2]">
              <th className="text-left py-4 px-3 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] w-[36%]">
                Critério
              </th>
              <th className="text-left py-4 px-3 font-[var(--font-noto-serif)] text-[#002045] text-base lg:text-lg font-normal w-[32%]">
                PFB Orbital
              </th>
              <th className="text-left py-4 px-3 font-[var(--font-noto-serif)] text-[#74777f] text-base lg:text-lg font-normal w-[32%]">
                {option.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const competitor = row[selected];
              return (
                <tr
                  key={row.attr}
                  className={`border-b border-[#eeeeee] transition-colors ${
                    row.highlight ? "bg-[#f3f9f3]" : "hover:bg-[#f3f3f3]"
                  }`}
                >
                  <td className="py-3 px-3 text-xs sm:text-sm font-medium font-[var(--font-inter)] text-[#1a1c1c]">
                    {row.attr}
                  </td>
                  <td className="py-3 px-3 text-xs sm:text-sm font-semibold text-[#002045] font-[var(--font-inter)]">
                    {row.pfb}
                  </td>
                  <td className="py-3 px-3 text-xs sm:text-sm text-[#74777f] font-[var(--font-inter)]">
                    {competitor}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic mt-5">
        ART nº AM20260593657 · Eng. Civil Werksson Sousa, CREA 042030134-8-D. Dados sujeitos a alteração sem aviso prévio.
      </p>
    </div>
  );
}
