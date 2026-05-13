"use client";

import Image from "next/image";
import { useState } from "react";

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";

type Linha = "todos" | "Classic" | "Brilliance" | "Elegance";

const products = [
  // Classic — Fosco finish, marble look
  {
    code: "ORB-003",
    name: "Bege Travertino",
    linha: "Classic" as const,
    finish: "Fosco",
    price: "R$ 559",
    priceM2: "R$ 160/m²",
    img: "/images/catalogue/classic-bege-travertino-orb001.jpeg",
    desc: "Tom bege quente com textura travertino. Aconchego e sofisticação atemporal.",
  },
  {
    code: "ORB-001",
    name: "Terracota",
    linha: "Classic" as const,
    finish: "Fosco",
    price: "R$ 559",
    priceM2: "R$ 160/m²",
    img: "/images/catalogue/classic-terracota-orb003.jpeg",
    desc: "Tons terrosos intensos com acabamento fosco. Calor mediterrâneo para qualquer ambiente.",
  },
  {
    code: "ORB-006",
    name: "Branco Calacatta",
    linha: "Classic" as const,
    finish: "Fosco",
    price: "R$ 559",
    priceM2: "R$ 160/m²",
    img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg",
    desc: "Branco puro com veios sutis. O clássico que nunca sai de moda.",
  },
  // Brilliance — Polido finish, marble look
  {
    code: "ORB-005",
    name: "Bronze Armani",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-bronze-armani-orb005.jpeg",
    desc: "Fundo escuro com veios dourados e bronzeados. Dramaticidade e sofisticação.",
  },
  {
    code: "ORB-007",
    name: "Bianco Statuario Venato",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-bianco-statuario-venato-orb007.jpeg",
    desc: "Branco estaturário com veios cinza naturais. Imponência clássica italiana.",
  },
  {
    code: "ORB-008",
    name: "Bianco Oro Supremo",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-bianco-oro-supremo-orb008.jpeg",
    desc: "Branco supremo com reflexos dourados sutis. O ápice do refinamento.",
  },
  {
    code: "ORB-009",
    name: "Gris Pietra",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg",
    desc: "Cinza profundo com veios brancos. Modernidade e contraste com elegância.",
  },
  {
    code: "ORB-012",
    name: "Arabescato Orobico Bianco",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-arabescato-orobico-bianco-orb012.jpeg",
    desc: "Veios dramáticos em movimento sobre fundo branco. Alta costura para paredes.",
  },
  {
    code: "ORB-013",
    name: "Calacatta Oro",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-calacatta-oro-orb013.jpeg",
    desc: "Fundo branco com veios dourados. Luxo e luminosidade em cada detalhe.",
  },
  {
    code: "ORB-014",
    name: "Calacatta Michelangelo",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-calacatta-michelangelo-orb014.jpeg",
    desc: "Inspirado no mármore dos grandes mestres renascentistas. Presença absoluta.",
  },
  {
    code: "ORB-015",
    name: "Carrara Gioia",
    linha: "Brilliance" as const,
    finish: "Polido",
    price: "R$ 589",
    priceM2: "R$ 169/m²",
    img: "/images/catalogue/brilliance-carrara-gioia-orb015.jpeg",
    desc: "O mármore Carrara clássico com acabamento polido espelhado. Atemporal.",
  },
  // Elegance — Madeira Texturizada finish
  {
    code: "ORB-002",
    name: "Imbuia",
    linha: "Elegance" as const,
    finish: "Madeira Texturizada",
    price: "R$ 649",
    priceM2: "R$ 186/m²",
    img: "/images/catalogue/elegance-imbuia-orb002.jpeg",
    desc: "Madeira escura com grãos expressivos. Calor e profundidade amazônica.",
  },
  {
    code: "ORB-004",
    name: "Louro Freijó",
    linha: "Elegance" as const,
    finish: "Madeira Texturizada",
    price: "R$ 649",
    priceM2: "R$ 186/m²",
    img: "/images/catalogue/elegance-louro-freijo-orb004.jpeg",
    desc: "Tom amadeirado médio com textura natural expressiva. Equilíbrio perfeito.",
  },
  {
    code: "ORB-010",
    name: "Carvalho Natural",
    linha: "Elegance" as const,
    finish: "Madeira Texturizada",
    price: "R$ 649",
    priceM2: "R$ 186/m²",
    img: "/images/catalogue/elegance-carvalho-natural-orb010.jpeg",
    desc: "Carvalho claro com grão natural. Frescor nórdico e elegância contemporânea.",
  },
  {
    code: "ORB-011",
    name: "Carvalho Branco",
    linha: "Elegance" as const,
    finish: "Madeira Texturizada",
    price: "R$ 649",
    priceM2: "R$ 186/m²",
    img: "/images/catalogue/elegance-carvalho-branco-orb011.jpeg",
    desc: "Carvalho branco com grão fino e sutil. Leveza e modernidade escandinava.",
  },
];

const linhas: { key: Linha; label: string; desc: string }[] = [
  { key: "todos", label: "Todos", desc: "15 acabamentos" },
  { key: "Classic", label: "Classic", desc: "Mármore Fosco · R$ 559" },
  { key: "Brilliance", label: "Brilliance", desc: "Mármore Polido · R$ 589" },
  { key: "Elegance", label: "Elegance", desc: "Madeira Texturizada · R$ 649" },
];

export default function ProdutosPage() {
  const [activeLinha, setActiveLinha] = useState<Linha>("todos");

  const filtered =
    activeLinha === "todos"
      ? products
      : products.filter((p) => p.linha === activeLinha);

  return (
    <div className="pt-20">
      {/* Page Header */}
      <section className="bg-[#002045] text-white py-20 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Catálogo · 2026
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-5xl lg:text-6xl font-normal tracking-[-0.02em] leading-tight mb-5">
            Catálogo de Acabamentos
          </h1>
          <p className="text-white/70 text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl mb-8">
            3 linhas exclusivas. 15 acabamentos em estoque. Precisão técnica e
            estética arquitetônica para projetos exigentes.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={CATALOGUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#f3f3f3] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Baixar Catálogo PDF
            </a>
            <a
              href={`https://wa.me/5592988150149?text=${encodeURIComponent("Olá! Estou vendo o catálogo no site e gostaria de tirar algumas dúvidas sobre os revestimentos Orbital.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-white/10 transition-colors"
            >
              Tirar Dúvidas no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-20 z-40 bg-[#ffffff] border-b border-[#e2e2e2] shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="flex gap-0 overflow-x-auto">
            {linhas.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setActiveLinha(key)}
                className={`flex-shrink-0 flex flex-col items-start px-6 py-5 border-b-2 transition-all duration-200 ${
                  activeLinha === key
                    ? "border-[#002045] text-[#002045]"
                    : "border-transparent text-[#74777f] hover:text-[#002045]"
                }`}
              >
                <span className="text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)]">
                  {label}
                </span>
                <span className="text-[10px] font-[var(--font-inter)] mt-0.5 opacity-70">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <section className="py-16 lg:py-20 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          {activeLinha !== "todos" && (
            <div className="mb-10 pb-8 border-b border-[#e2e2e2]">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-2">
                Linha {activeLinha}
              </h2>
              <p className="text-[#43474e] text-sm font-[var(--font-inter)]">
                {activeLinha === "Classic" &&
                  "Mármore Fosco · 5mm · 1,2m × 2,9m = 3,48m² · R$ 559/placa · R$ 160/m²"}
                {activeLinha === "Brilliance" &&
                  "Mármore Polido · 5mm · 1,2m × 2,9m = 3,48m² · R$ 589/placa · R$ 169/m²"}
                {activeLinha === "Elegance" &&
                  "Madeira Texturizada · 5mm · 1,2m × 2,9m = 3,48m² · R$ 649/placa · R$ 186/m²"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {filtered.map(({ code, name, linha, finish, price, priceM2, img, desc }) => (
              <article key={code} className="group cursor-pointer">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#eeeeee] mb-5 shadow-sm group-hover:shadow-lg transition-shadow duration-500">
                  <Image
                    src={img}
                    alt={`${name} — Linha ${linha}`}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-white/95 text-[#002045] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] px-2.5 py-1.5">
                      {finish}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">
                      {code} · {linha}
                    </span>
                  </div>
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-medium leading-snug">
                    {name}
                  </h3>
                  <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">
                    {desc}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-[#1a365d] text-base font-semibold font-[var(--font-inter)]">
                        {price}
                        <span className="text-xs text-[#74777f] font-normal ml-1">
                          /placa
                        </span>
                      </span>
                      <span className="text-[#74777f] text-xs font-[var(--font-inter)] ml-2">
                        ({priceM2})
                      </span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <a
                      href={`https://wa.me/5592988150149?text=${encodeURIComponent(`Olá! Tenho interesse no acabamento ${name} (${code}). Gostaria de saber mais.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] px-5 py-2 hover:bg-[#002045] hover:text-white transition-colors"
                    >
                      Saber mais →
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Specs Bar */}
      <section className="bg-[#002045] py-12">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Dimensão", value: "1,2m × 2,9m" },
              { label: "Área por placa", value: "3,48 m²" },
              { label: "Espessura", value: "5 mm" },
              { label: "Peso", value: "3,5 kg/m²" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-white font-[var(--font-noto-serif)] text-2xl font-normal mb-1">
                  {value}
                </p>
                <p className="text-[#86a0cd] text-xs tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="bg-[#f9f9f9] border-t border-[#eeeeee] py-5 px-8 text-center">
        <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic">
          Imagens ilustrativas — cores podem variar. Recomendamos uma visita ao nosso showroom.
          Somos fornecedores diretos — não fazemos instalação.
        </p>
      </div>
    </div>
  );
}
