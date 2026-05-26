"use client";

import { useState } from "react";
import MdfComparison from "./MdfComparison";

export default function TecnologiaComparison() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Accordion trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white border border-[#e2e2e2] px-6 py-5 text-left group hover:border-[#002045] transition-colors"
        aria-expanded={open}
      >
        <div>
          <p className="text-[#002045] text-sm font-bold font-[var(--font-inter)] tracking-[0.04em] mb-0.5 group-hover:text-[#1a365d]">
            {open ? "Ocultar relatório técnico" : "Ver relatório técnico completo — PFB vs. concorrentes"}
          </p>
          <p className="text-[#74777f] text-xs font-[var(--font-inter)]">
            {open
              ? "ART nº AM20260593657 · Eng. Civil Werksson Sousa · CREA 042030134-8-D"
              : "10 critérios · umidade, durabilidade, mofo, fogo, instalação e mais"}
          </p>
        </div>
        <div className="flex-shrink-0 ml-6 w-8 h-8 border border-[#e2e2e2] group-hover:border-[#002045] flex items-center justify-center transition-colors">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#002045"
            strokeWidth="2.5"
            className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border border-t-0 border-[#e2e2e2] bg-white px-6 lg:px-8 py-8">
          <MdfComparison />
        </div>
      )}
    </div>
  );
}
