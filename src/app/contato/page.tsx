"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────
const WA_BASE = "https://wa.me/5592988150149?text=";
const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";
const PLATE_M2 = 3.48;
const PLATE_W = 1.2;  // m — plate width
const PLATE_H = 2.9;  // m — plate height

// MDF cost breakdown (Manaus, cotado 2025)
const MDF_SHEET_W = 1.85;          // m — chapa width
const MDF_SHEET_H = 2.75;          // m — chapa height
const MDF_SHEET_M2 = MDF_SHEET_W * MDF_SHEET_H; // 5.0875 m²
const MDF_SHEET_PRICE = 415;       // R$/chapa
const MDF_MO_SIMPLE = 30;          // R$/m² — ambientes simples
const MDF_MO_COMPLEX = 50;         // R$/m² — ambientes complexos
const MDF_ACABAMENTO = 25;         // R$/m² — acabamentos
const MDF_INSTALLS_10Y = 3;        // trocas em 10 anos (estimativa conservadora)

// Returns R$/placa — divide by PLATE_M2 for per-m² rate
function orbitalMOPerPlate(plates: number, complex: boolean) {
  return plates > 6 ? (complex ? 150 : 130) : (complex ? 175 : 150);
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductLine = "Classic" | "Brilliance" | "Elegance";
type SpaceViability = "simple" | "complex" | "no";

interface Product {
  code: string;
  name: string;
  linha: ProductLine;
  img: string;
}

interface Space {
  id: string;
  label: string;
  viability: SpaceViability;
  redirect?: string;
  msg?: string;
  hint?: string;
}

// ─── Product data ─────────────────────────────────────────────────────────────
const LINE_INFO: Record<ProductLine, { finish: string; price: number; cover: string }> = {
  Classic:    { finish: "Mármore Fosco",       price: 559, cover: "/images/catalogue/classic-branco-calacatta-orb006.jpeg" },
  Brilliance: { finish: "Mármore Polido",      price: 589, cover: "/images/catalogue/brilliance-calacatta-oro-orb013.jpeg" },
  Elegance:   { finish: "Madeira Texturizada", price: 649, cover: "/images/catalogue/elegance-carvalho-natural-orb010.jpeg" },
};

const PRODUCTS: Product[] = [
  { code: "ORB-003", name: "Bege Travertino",           linha: "Classic",    img: "/images/catalogue/classic-bege-travertino-orb001.jpeg" },
  { code: "ORB-001", name: "Terracota",                 linha: "Classic",    img: "/images/catalogue/classic-terracota-orb003.jpeg" },
  { code: "ORB-006", name: "Branco Calacatta",          linha: "Classic",    img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg" },
  { code: "ORB-005", name: "Bronze Armani",             linha: "Brilliance", img: "/images/catalogue/brilliance-bronze-armani-orb005.jpeg" },
  { code: "ORB-007", name: "Bianco Statuario Venato",   linha: "Brilliance", img: "/images/catalogue/brilliance-bianco-statuario-venato-orb007.jpeg" },
  { code: "ORB-008", name: "Bianco Oro Supremo",        linha: "Brilliance", img: "/images/catalogue/brilliance-bianco-oro-supremo-orb008.jpeg" },
  { code: "ORB-009", name: "Gris Pietra",               linha: "Brilliance", img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg" },
  { code: "ORB-012", name: "Arabescato Orobico Bianco", linha: "Brilliance", img: "/images/catalogue/brilliance-arabescato-orobico-bianco-orb012.jpeg" },
  { code: "ORB-013", name: "Calacatta Oro",             linha: "Brilliance", img: "/images/catalogue/brilliance-calacatta-oro-orb013.jpeg" },
  { code: "ORB-014", name: "Calacatta Michelangelo",    linha: "Brilliance", img: "/images/catalogue/brilliance-calacatta-michelangelo-orb014.jpeg" },
  { code: "ORB-015", name: "Carrara Gioia",             linha: "Brilliance", img: "/images/catalogue/brilliance-carrara-gioia-orb015.jpeg" },
  { code: "ORB-002", name: "Imbuia",                    linha: "Elegance",   img: "/images/catalogue/elegance-imbuia-orb002.jpeg" },
  { code: "ORB-004", name: "Louro Freijó",              linha: "Elegance",   img: "/images/catalogue/elegance-louro-freijo-orb004.jpeg" },
  { code: "ORB-010", name: "Carvalho Natural",          linha: "Elegance",   img: "/images/catalogue/elegance-carvalho-natural-orb010.jpeg" },
  { code: "ORB-011", name: "Carvalho Branco",           linha: "Elegance",   img: "/images/catalogue/elegance-carvalho-branco-orb011.jpeg" },
];

// ─── Space types ──────────────────────────────────────────────────────────────
const SPACES: Space[] = [
  { id: "parede",     label: "Parede",             viability: "simple" },
  { id: "teto",       label: "Teto",               viability: "simple" },
  { id: "sala",       label: "Sala",               viability: "simple" },
  { id: "quarto",     label: "Quarto",             viability: "simple" },
  { id: "escritorio", label: "Escritório",         viability: "simple" },
  { id: "corredor",   label: "Corredor",           viability: "simple" },
  { id: "banheiro",   label: "Banheiro",           viability: "complex" },
  { id: "lavabo",     label: "Lavabo",             viability: "complex" },
  { id: "cozinha",    label: "Cozinha",            viability: "complex" },
  { id: "rodapia",    label: "Roda-pia",           viability: "complex" },
  { id: "rodabanca",  label: "Roda-banca",         viability: "complex" },
  { id: "movel",      label: "Móvel / Marcenaria", viability: "complex" },
  { id: "porta",      label: "Porta",              viability: "complex" },
  {
    id: "chao", label: "Piso / Chão", viability: "no", redirect: "parede",
    msg: "O PFB Orbital não é indicado para pisos — a placa não é projetada para suportar pisadas.",
    hint: "Mas as paredes e o teto do mesmo ambiente ficam extraordinários. Quer simular para a parede?",
  },
  {
    id: "fachada", label: "Fachada externa", viability: "no", redirect: "sala",
    msg: "O PFB Orbital é exclusivo para interiores — não certificado para uso externo.",
    hint: "Para o hall de entrada, recepção ou sala de frente, o resultado é excepcional.",
  },
  { id: "box", label: "Box / Ducha", viability: "complex" },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "Como funciona a instalação?",
    a: "Cola PU 40 de alta aderência para paredes, cola de contato para tetos. Sem obra pesada, sem poeira, sem serra circular. Um cômodo padrão é instalado em 2 a 3 horas.",
  },
  {
    q: "Funciona em banheiros e ambientes úmidos?",
    a: "Sim. O PFB Orbital absorve apenas 0,2% em 48h de imersão (contra 35% do MDF). Indicado para banheiros, lavabos e box / ducha.",
  },
  {
    q: "E em tetos?",
    a: "Sim. A placa pesa apenas 3,5 kg/m², facilitando a fixação. Recomendamos cola de contato de alta aderência.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "Pronta-entrega em Manaus. Todos os 15 acabamentos disponíveis imediatamente.",
  },
  {
    q: "Vocês fazem instalação?",
    a: "Não. Somos fornecedores diretos. Podemos indicar instaladores parceiros de confiança na região.",
  },
  {
    q: "Quais certificações o produto possui?",
    a: "ART nº AM20260593657, assinada pelo Eng. Civil Werksson Sousa (CREA 042030134-8-D), com ficha técnica completa para aprovação em projetos de engenharia.",
  },
];

// ─── WA icon ──────────────────────────────────────────────────────────────────
function WaIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContatoPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedLine, setSelectedLine] = useState<ProductLine | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dimMode, setDimMode] = useState<"lxa" | "m2">("lxa");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [sqmInput, setSqmInput] = useState("");
  const [showResult, setShowResult] = useState(false);

  const m2 =
    dimMode === "lxa"
      ? (parseFloat(width) || 0) * (parseFloat(height) || 0)
      : parseFloat(sqmInput) || 0;

  const plates =
    dimMode === "lxa" && (parseFloat(width) || 0) > 0 && (parseFloat(height) || 0) > 0
      ? Math.ceil((parseFloat(width) || 0) / PLATE_W) * Math.ceil((parseFloat(height) || 0) / PLATE_H)
      : m2 > 0
      ? Math.ceil(m2 / PLATE_M2)
      : 0;
  const isComplex = selectedSpace?.viability === "complex";

  const pricePerPlate =
    !selectedProduct ? 559
    : selectedProduct.linha === "Classic" ? 559
    : selectedProduct.linha === "Brilliance" ? 589
    : 649;

  const orbMaterialTotal = plates * pricePerPlate;
  const moRatePerPlate = plates > 0 ? orbitalMOPerPlate(plates, isComplex) : 0;
  const orbMOTotal = moRatePerPlate * plates;
  const orbTotal = orbMaterialTotal + orbMOTotal;

  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 0;
  const mdfSheets =
    dimMode === "lxa" && w > 0 && h > 0
      ? Math.ceil(w / MDF_SHEET_W) * Math.ceil(h / MDF_SHEET_H)
      : m2 > 0 ? Math.ceil(m2 / MDF_SHEET_M2) : 0;
  const mdfMaterialTotal = mdfSheets * MDF_SHEET_PRICE;
  const mdfMOPerSheet = Math.round((isComplex ? MDF_MO_COMPLEX : MDF_MO_SIMPLE) * MDF_SHEET_M2);
  const mdfMOTotal = mdfMOPerSheet * mdfSheets;
  const mdfAcabamentoTotal = MDF_ACABAMENTO * m2;
  const mdfOnce = mdfMaterialTotal + mdfMOTotal + mdfAcabamentoTotal;
  const mdfIn10y = mdfOnce * MDF_INSTALLS_10Y;
  const savings10y = mdfIn10y - orbTotal;

  const waMsg =
    selectedProduct && selectedSpace && m2 > 0
      ? `Olá! Simulei no site da Orbital. Acabamento: ${selectedProduct.name} (${selectedProduct.code} — ${selectedProduct.linha}). Espaço: ${selectedSpace.label}. Área: ${m2.toFixed(1)} m² (${plates} placa${plates !== 1 ? "s" : ""}). Gostaria de receber um orçamento.`
      : "Olá! Tenho interesse no PFB Orbital e gostaria de fazer um orçamento.";

  function goToStep(n: 1 | 2 | 3) {
    setStep(n);
    setShowResult(false);
  }

  function reset() {
    setStep(1);
    setSelectedSpace(null);
    setSelectedLine(null);
    setSelectedProduct(null);
    setWidth("");
    setHeight("");
    setSqmInput("");
    setShowResult(false);
  }

  const canAdvance1 = selectedSpace !== null && selectedSpace.viability !== "no";
  const canAdvance2 = selectedProduct !== null;
  const canCalculate = m2 > 0;

  return (
    <div className="pt-20">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#002045] text-white py-24 lg:py-32 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)",
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="max-w-3xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Simulador · Orçamento
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-5xl lg:text-6xl font-normal tracking-[-0.02em] leading-tight mb-6">
              Comece o seu projeto.
            </h1>
            <p className="text-white/65 text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl mb-10">
              Escolha o acabamento, informe a área e veja em segundos quanto você investe —
              e quanto economiza em relação ao MDF ao longo de 10 anos.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#simulador"
                className="inline-flex items-center gap-2 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#f3f3f3] transition-colors"
              >
                Iniciar simulação
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href={`${WA_BASE}${encodeURIComponent("Olá! Tenho interesse no PFB Orbital e gostaria de fazer um orçamento.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 border border-white/30 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:border-white transition-colors"
              >
                <WaIcon />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Simulator ────────────────────────────────────────────────────── */}
      <section id="simulador" className="py-20 bg-[#f5f5f3]">
        <div className="max-w-[1060px] mx-auto px-8 lg:px-16">

          {/* Header */}
          <div className="mb-12">
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
              Simulador de investimento
            </p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal mb-3">
              Quanto custa revestir o seu espaço?
            </h2>
            <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed max-w-2xl">
              Simule o custo do PFB Orbital e compare com o MDF ao longo de 10 anos.
              Valores de mão de obra são estimativas de mercado — o valor final depende do acordo direto com o prestador de serviço.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0 mb-8">
            {([
              { n: 1 as const, label: "Espaço" },
              { n: 2 as const, label: "Modelo" },
              { n: 3 as const, label: "Dimensões" },
            ]).map(({ n, label }, i) => (
              <React.Fragment key={n}>
                <button
                  onClick={() => { if (n < step) goToStep(n); }}
                  className={n < step ? "cursor-pointer" : "cursor-default"}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold font-[var(--font-inter)] transition-colors ${
                        step === n
                          ? "bg-[#002045] text-white"
                          : n < step
                          ? "bg-[#3b6934] text-white"
                          : "bg-[#e2e2e2] text-[#74777f]"
                      }`}
                    >
                      {n < step ? "✓" : n}
                    </div>
                    <span
                      className={`text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] hidden sm:block ${
                        step === n
                          ? "text-[#002045]"
                          : n < step
                          ? "text-[#3b6934]"
                          : "text-[#74777f]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </button>
                {i < 2 && (
                  <div
                    className={`flex-1 h-px mx-3 max-w-[80px] ${
                      n < step ? "bg-[#3b6934]" : "bg-[#d8d8d8]"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step 1: Space ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="bg-white border border-[#e2e2e2] p-8 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Qual espaço você quer revestir?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-8">
                Selecione o tipo de ambiente.
              </p>

              {/* Viable spaces */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-8">
                {SPACES.filter((s) => s.viability !== "no").map((space) => (
                  <button
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    className={`text-left px-4 py-3 border text-xs font-semibold font-[var(--font-inter)] transition-all ${
                      selectedSpace?.id === space.id
                        ? "border-[#002045] bg-[#002045] text-white"
                        : "border-[#e2e2e2] text-[#43474e] hover:border-[#1a365d] hover:text-[#002045]"
                    }`}
                  >
                    {space.label}
                  </button>
                ))}
              </div>

              {/* Non-viable spaces */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
                {SPACES.filter((s) => s.viability === "no").map((space) => (
                  <button
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    className={`text-left px-4 py-3 border text-xs font-semibold font-[var(--font-inter)] transition-all ${
                      selectedSpace?.id === space.id
                        ? "border-[#c0392b] bg-[#fff5f5] text-[#c0392b]"
                        : "border-[#e2e2e2] text-[#b0b0b0] hover:border-[#e0b0b0]"
                    }`}
                  >
                    {space.label}
                  </button>
                ))}
              </div>

              {/* Not-viable redirect message */}
              {selectedSpace?.viability === "no" && (
                <div className="bg-[#fff8f0] border border-[#f0c060] px-6 py-5 mb-8">
                  <p className="text-[#7a4000] text-sm font-semibold font-[var(--font-inter)] mb-1">
                    {selectedSpace.msg}
                  </p>
                  <p className="text-[#7a4000] text-sm font-[var(--font-inter)] mb-4">
                    {selectedSpace.hint}
                  </p>
                  <button
                    onClick={() => {
                      const r = SPACES.find((s) => s.id === selectedSpace.redirect);
                      if (r) setSelectedSpace(r);
                    }}
                    className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
                  >
                    Simular para {SPACES.find((s) => s.id === selectedSpace.redirect)?.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => canAdvance1 && goToStep(2)}
                  disabled={!canAdvance1}
                  className={`inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
                    canAdvance1
                      ? "bg-[#002045] text-white hover:bg-[#1a365d]"
                      : "bg-[#e2e2e2] text-[#aaaaaa] cursor-not-allowed"
                  }`}
                >
                  Próximo: Escolher Modelo
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Model ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="bg-white border border-[#e2e2e2] p-8 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Qual acabamento você prefere?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-8">
                Escolha a linha e o acabamento específico.
              </p>

              {/* Line cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {(["Classic", "Brilliance", "Elegance"] as ProductLine[]).map((linha) => {
                  const info = LINE_INFO[linha];
                  const active = selectedLine === linha;
                  return (
                    <button
                      key={linha}
                      onClick={() => {
                        setSelectedLine(linha);
                        setSelectedProduct(null);
                      }}
                      className={`relative overflow-hidden border text-left transition-all ${
                        active ? "border-[#002045]" : "border-[#e2e2e2] hover:border-[#1a365d]"
                      }`}
                    >
                      <div className="relative h-36 w-full">
                        <Image src={info.cover} alt={linha} fill className="object-cover" />
                        {active && <div className="absolute inset-0 bg-[#002045]/25" />}
                        {active && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-white flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-[#002045] text-sm font-bold font-[var(--font-inter)] mb-0.5">{linha}</p>
                        <p className="text-[#74777f] text-xs font-[var(--font-inter)]">{info.finish}</p>
                        <p className="text-[#002045] text-xs font-bold font-[var(--font-inter)] mt-2">
                          R$ {info.price.toLocaleString("pt-BR")} / placa (3,48 m²)
                        </p>
                        <p className="text-[#9e9e9e] text-[10px] font-[var(--font-inter)] mt-0.5">
                          2,9m × 1,2m × 5mm
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Product thumbnails */}
              {selectedLine && (
                <div className="mb-8">
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-4">
                    Acabamentos {selectedLine}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {PRODUCTS.filter((p) => p.linha === selectedLine).map((product) => {
                      const active = selectedProduct?.code === product.code;
                      return (
                        <button
                          key={product.code}
                          onClick={() => setSelectedProduct(product)}
                          className={`border overflow-hidden text-left transition-all ${
                            active ? "border-[#002045]" : "border-[#e2e2e2] hover:border-[#1a365d]"
                          }`}
                        >
                          <div className="relative h-24 w-full overflow-hidden">
                            <Image
                              src={product.img}
                              alt={product.name}
                              fill
                              className="object-cover hover:scale-105 transition-transform duration-300"
                            />
                            {active && <div className="absolute inset-0 bg-[#002045]/20" />}
                            {active && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-white flex items-center justify-center">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className={`text-[10px] font-bold font-[var(--font-inter)] leading-tight ${active ? "text-[#002045]" : "text-[#43474e]"}`}>
                              {product.name}
                            </p>
                            <p className="text-[9px] text-[#9e9e9e] font-[var(--font-inter)] mt-0.5">{product.code}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => goToStep(1)}
                  className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Voltar
                </button>
                <button
                  onClick={() => canAdvance2 && goToStep(3)}
                  disabled={!canAdvance2}
                  className={`inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
                    canAdvance2
                      ? "bg-[#002045] text-white hover:bg-[#1a365d]"
                      : "bg-[#e2e2e2] text-[#aaaaaa] cursor-not-allowed"
                  }`}
                >
                  Próximo: Informar Área
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Dimensions ────────────────────────────────────────── */}
          {step === 3 && (
            <div className="bg-white border border-[#e2e2e2] p-8 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Qual é a área a revestir?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">
                Informe as dimensões ou o m² total.
              </p>

              {/* Selection summary chips */}
              <div className="flex flex-wrap gap-2 mb-8">
                {selectedSpace && (
                  <span className="bg-[#eef2f8] text-[#1a365d] text-xs font-semibold font-[var(--font-inter)] px-3 py-1.5">
                    {selectedSpace.label}
                  </span>
                )}
                {selectedProduct && (
                  <span className="flex items-center gap-2 bg-[#eef2f8] text-[#1a365d] text-xs font-semibold font-[var(--font-inter)] px-3 py-1.5">
                    <span className="relative w-4 h-4 inline-block overflow-hidden flex-shrink-0">
                      <Image src={selectedProduct.img} alt={selectedProduct.name} fill className="object-cover" />
                    </span>
                    {selectedProduct.name} · {selectedProduct.code}
                  </span>
                )}
              </div>

              {/* Mode toggle */}
              <div className="flex w-fit border border-[#e2e2e2] mb-6">
                {[
                  { mode: "lxa" as const, label: "Largura × Altura" },
                  { mode: "m2" as const, label: "Informar m²" },
                ].map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => setDimMode(mode)}
                    className={`px-6 py-3 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] transition-colors ${
                      dimMode === mode
                        ? "bg-[#002045] text-white"
                        : "text-[#74777f] hover:text-[#002045]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {dimMode === "lxa" ? (
                <div className="flex flex-wrap items-end gap-4 mb-6">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Largura (m)
                    </label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="ex: 3.5"
                      min="0"
                      step="0.1"
                      className="w-32 border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                    />
                  </div>
                  <span className="text-[#74777f] font-bold pb-3">×</span>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Altura (m)
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="ex: 2.8"
                      min="0"
                      step="0.1"
                      className="w-32 border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                    />
                  </div>
                  {m2 > 0 && (
                    <span className="text-[#43474e] text-sm font-[var(--font-inter)] pb-3">
                      = <strong className="text-[#002045]">{m2.toFixed(2)} m²</strong>
                    </span>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Área total (m²)
                  </label>
                  <input
                    type="number"
                    value={sqmInput}
                    onChange={(e) => setSqmInput(e.target.value)}
                    placeholder="ex: 12"
                    min="0"
                    step="0.1"
                    className="w-40 border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                  />
                </div>
              )}

              {m2 > 0 && (
                <p className="text-[#43474e] text-sm font-[var(--font-inter)] mb-8">
                  Serão necessárias{" "}
                  <strong className="text-[#002045]">
                    {plates} placa{plates !== 1 ? "s" : ""}
                  </strong>{" "}
                  de 3,48 m² cada.
                </p>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => goToStep(2)}
                  className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Voltar
                </button>
                <button
                  onClick={() => canCalculate && setShowResult(true)}
                  disabled={!canCalculate}
                  className={`inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
                    canCalculate
                      ? "bg-[#002045] text-white hover:bg-[#1a365d]"
                      : "bg-[#e2e2e2] text-[#aaaaaa] cursor-not-allowed"
                  }`}
                >
                  Ver simulação
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Results panel ─────────────────────────────────────────────── */}
          {showResult && selectedProduct && selectedSpace && m2 > 0 && (
            <div className="mt-0 animate-fade-in">

              {/* Disclaimer banner */}
              <div className="bg-[#fffbea] border border-[#e6c84a] px-5 py-4 flex gap-3 items-start">
                <svg className="flex-shrink-0 mt-0.5 text-[#a07a00]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                <p className="text-[#6b5000] text-xs font-[var(--font-inter)] leading-relaxed">
                  <strong>Simulação para referência apenas.</strong> Os valores abaixo são estimativas de custo usadas para fins de comparação.
                  A Orbital vende exclusivamente o material — não realizamos instalação.
                  O custo de mão de obra é uma estimativa de mercado; o valor real depende do profissional contratado diretamente pelo cliente.
                </p>
              </div>

              {/* Summary bar */}
              <div className="bg-[#002045] px-6 py-4 flex flex-wrap items-center gap-4 border border-[#2d4f7f] border-b-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden">
                    <Image src={selectedProduct.img} alt={selectedProduct.name} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold font-[var(--font-inter)]">{selectedProduct.name}</p>
                    <p className="text-[#86a0cd] text-[10px] font-[var(--font-inter)]">
                      {selectedProduct.code} · {selectedProduct.linha} · {selectedSpace.label}
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-[#86a0cd] text-[9px] tracking-[0.1em] uppercase font-[var(--font-inter)]">Área</p>
                    <p className="text-white text-sm font-bold font-[var(--font-inter)]">{m2.toFixed(2)} m²</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#86a0cd] text-[9px] tracking-[0.1em] uppercase font-[var(--font-inter)]">Placas</p>
                    <p className="text-white text-sm font-bold font-[var(--font-inter)]">{plates}</p>
                  </div>
                  <button
                    onClick={reset}
                    className="text-[#86a0cd] hover:text-white text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] transition-colors border border-white/20 px-3 py-1.5 hover:border-white"
                  >
                    Refazer
                  </button>
                </div>
              </div>

              {/* Cost comparison columns */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Orbital */}
                <div className="bg-[#002045] px-8 py-8 border border-[#2d4f7f]">
                  <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-5">
                    PFB Orbital — Estimativa de custo
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-white/55">
                        Material ({plates} placa{plates !== 1 ? "s" : ""} × R$ {pricePerPlate.toLocaleString("pt-BR")})
                      </span>
                      <span className="text-white font-semibold flex-shrink-0">{fmt(orbMaterialTotal)}</span>
                    </div>
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-white/55">
                        MO estimada (R$ {Math.round(moRatePerPlate / PLATE_M2)}/m²)*
                      </span>
                      <span className="text-white font-semibold flex-shrink-0">{fmt(orbMOTotal)}</span>
                    </div>
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-white/55">Acabamento / pintura</span>
                      <span className="text-[#a1d494] font-semibold flex-shrink-0">Não necessário</span>
                    </div>
                    <div className="border-t border-white/15 pt-3 flex items-center justify-between">
                      <span className="text-white text-sm font-bold font-[var(--font-inter)]">Total</span>
                      <span className="text-white text-2xl font-[var(--font-noto-serif)]">{fmt(orbTotal)}</span>
                    </div>
                  </div>
                  <div className="bg-[#3b6934]/30 border border-[#3b6934]/50 px-4 py-3">
                    <p className="text-[#a1d494] text-xs font-semibold font-[var(--font-inter)]">
                      10+ anos sem trocar.
                    </p>
                    <p className="text-[#a1d494]/70 text-[11px] font-[var(--font-inter)] mt-0.5 leading-relaxed">
                      Instala uma vez. Impermeável, anti-mofo e resistente ao clima de Manaus.
                    </p>
                  </div>
                </div>

                {/* MDF */}
                <div className="bg-[#fafaf8] px-8 py-8 border border-[#e2e2e2]">
                  <p className="text-[#74777f] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-5">
                    MDF — Estimativa por instalação
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-[#74777f]">
                        Material ({mdfSheets} chapa{mdfSheets !== 1 ? "s" : ""} × R$ {MDF_SHEET_PRICE})
                      </span>
                      <span className="text-[#43474e] font-semibold flex-shrink-0">{fmt(mdfMaterialTotal)}</span>
                    </div>
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-[#74777f]">
                        MO estimada (R$ {isComplex ? MDF_MO_COMPLEX : MDF_MO_SIMPLE}/m²)*
                      </span>
                      <span className="text-[#43474e] font-semibold flex-shrink-0">{fmt(mdfMOTotal)}</span>
                    </div>
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-[#74777f]">
                        Acabamentos (R$ {MDF_ACABAMENTO}/m²)
                      </span>
                      <span className="text-[#43474e] font-semibold flex-shrink-0">{fmt(mdfAcabamentoTotal)}</span>
                    </div>
                    <div className="border-t border-[#e2e2e2] pt-3 flex items-center justify-between">
                      <span className="text-[#43474e] text-sm font-bold font-[var(--font-inter)]">Por instalação</span>
                      <span className="text-[#43474e] text-2xl font-[var(--font-noto-serif)]">{fmt(mdfOnce)}</span>
                    </div>
                  </div>
                  <div className="bg-[#fff3f3] border border-[#e8c0c0] px-4 py-3">
                    <p className="text-[#a03030] text-xs font-semibold font-[var(--font-inter)]">
                      Repõe a cada 2–3 anos em Manaus.
                    </p>
                    <p className="text-[#a03030]/70 text-[11px] font-[var(--font-inter)] mt-0.5 leading-relaxed">
                      A umidade amazônica faz o MDF inchar, empenar e deteriorar continuamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* 10-year comparison */}
              <div className="bg-white border border-[#e2e2e2] border-t-0 px-8 py-8">
                <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-6">
                  Custo acumulado em 10 anos
                </p>

                {/* Orbital bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-[var(--font-inter)] text-[#002045]">
                      PFB Orbital — 1 instalação
                    </span>
                    <span className="text-base font-[var(--font-noto-serif)] text-[#002045] font-normal">
                      {fmt(orbTotal)}
                    </span>
                  </div>
                  <div className="h-9 bg-[#e8edf5] overflow-hidden">
                    <div
                      className="h-full bg-[#002045] transition-all duration-700 flex items-center px-3"
                      style={{ width: `${Math.max(Math.min((orbTotal / mdfIn10y) * 100, 100), 8)}%` }}
                    >
                      <span className="text-white text-[10px] font-bold font-[var(--font-inter)] whitespace-nowrap">
                        1×
                      </span>
                    </div>
                  </div>
                </div>

                {/* MDF bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-[var(--font-inter)] text-[#74777f]">
                      MDF — {MDF_INSTALLS_10Y} instalações em 10 anos
                    </span>
                    <span className="text-base font-[var(--font-noto-serif)] text-[#a03030] font-normal">
                      {fmt(mdfIn10y)}
                    </span>
                  </div>
                  <div className="h-9 bg-[#f5e8e8] overflow-hidden">
                    <div
                      className="h-full bg-[#c0392b]/55 flex items-center px-3"
                      style={{ width: "100%" }}
                    >
                      <span className="text-[#7a0000] text-[10px] font-bold font-[var(--font-inter)]">
                        {MDF_INSTALLS_10Y}×
                      </span>
                    </div>
                  </div>
                </div>

                {/* Savings callout */}
                {savings10y > 0 ? (
                  <div className="bg-[#f0f9eb] border border-[#3b6934]/30 px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex-1">
                      <p className="text-[#3b6934] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-2">
                        Economia estimada em 10 anos com PFB Orbital
                      </p>
                      <p className="font-[var(--font-noto-serif)] text-[#002045] text-4xl font-normal mb-2">
                        {fmt(savings10y)}
                      </p>
                      <p className="text-[#43474e] text-xs font-[var(--font-inter)] leading-relaxed">
                        Sem contar o custo de transtorno, reforma e substituição de material ao longo dos anos.
                      </p>
                    </div>
                    <a
                      href={`${WA_BASE}${encodeURIComponent(waMsg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-2.5 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#1a365d] transition-colors"
                    >
                      <WaIcon />
                      Solicitar orçamento
                    </a>
                  </div>
                ) : (
                  <div className="bg-[#eef2f8] border border-[#1a365d]/20 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[#002045] text-xs font-bold font-[var(--font-inter)] mb-1">
                        O PFB Orbital é um investimento inicial maior — mas é a instalação definitiva.
                      </p>
                      <p className="text-[#43474e] text-xs font-[var(--font-inter)]">
                        Sem reformas recorrentes, sem deterioração, sem custo de substituição.
                      </p>
                    </div>
                    <a
                      href={`${WA_BASE}${encodeURIComponent(waMsg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-2.5 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#1a365d] transition-colors"
                    >
                      <WaIcon />
                      Solicitar orçamento
                    </a>
                  </div>
                )}

                <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-4 leading-relaxed">
                  * Todos os valores de mão de obra são estimativas de referência baseadas em preços de mercado em Manaus (2025).
                  A Orbital comercializa exclusivamente o material — não presta nem intermedia serviços de instalação.
                  O contrato e o preço final da instalação são acordados diretamente entre o cliente e o profissional escolhido.
                  Preços de material e mão de obra estão sujeitos a alteração.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Pitch strip ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#1a2a1a]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
                title: "Pronta entrega em Manaus",
                desc: "15 acabamentos em estoque. Sem esperar frete nacional — sua obra começa essa semana.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3s9 4.03 9 9z"/></svg>,
                title: "ART de Engenharia Civil",
                desc: "Documentação técnica assinada por Eng. Civil com CREA. Aprovação garantida em qualquer projeto.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: "Zero manutenção",
                desc: "Sem pintar, sem lixar, sem trocar. O ambiente que saiu da obra continua impecável anos depois.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-5">
                <div className="flex-shrink-0 w-10 h-10 border border-white/20 flex items-center justify-center text-[#a1d494]">
                  {icon}
                </div>
                <div>
                  <p className="text-white text-sm font-bold font-[var(--font-inter)] mb-1.5">{title}</p>
                  <p className="text-white/50 text-sm font-[var(--font-inter)] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact + FAQ ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* Left: channels */}
            <div className="lg:col-span-5">
              <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                Canais de atendimento
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-8">
                Fale com a Orbital.
              </h2>
              <div className="space-y-3">
                <a
                  href={`${WA_BASE}${encodeURIComponent("Olá! Tenho interesse no PFB Orbital e gostaria de fazer um orçamento.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-5 p-6 bg-white border border-[#e2e2e2] hover:border-[#1a365d] transition-colors group"
                >
                  <div className="w-12 h-12 bg-[#3b6934] flex items-center justify-center flex-shrink-0">
                    <WaIcon size={22} />
                  </div>
                  <div>
                    <p className="text-[#002045] font-semibold text-base font-[var(--font-inter)] mb-1 group-hover:text-[#1a365d] transition-colors">
                      WhatsApp
                    </p>
                    <p className="text-[#43474e] text-sm font-[var(--font-inter)]">(92) 98815-0149</p>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">
                      Resposta rápida · Orçamentos e dúvidas técnicas
                    </p>
                  </div>
                </a>

                <a
                  href="https://instagram.com/orbitalrevestimentos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-5 p-6 bg-white border border-[#e2e2e2] hover:border-[#1a365d] transition-colors group"
                >
                  <div className="w-12 h-12 bg-[#1a365d] flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[#002045] font-semibold text-base font-[var(--font-inter)] mb-1 group-hover:text-[#1a365d] transition-colors">
                      Instagram
                    </p>
                    <p className="text-[#43474e] text-sm font-[var(--font-inter)]">@orbitalrevestimentos</p>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">
                      Projetos, acabamentos e novidades
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-5 p-6 bg-white border border-[#e2e2e2]">
                  <div className="w-12 h-12 bg-[#e8e8e8] flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="1.5">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[#002045] font-semibold text-base font-[var(--font-inter)] mb-1">Showroom</p>
                    <p className="text-[#43474e] text-sm font-[var(--font-inter)]">Manaus, Amazonas</p>
                    <a
                      href={`${WA_BASE}${encodeURIComponent("Olá! Vi o site da Orbital e gostaria de agendar uma visita ao showroom.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#1a365d] text-xs font-semibold font-[var(--font-inter)] mt-1 hover:text-[#002045] transition-colors"
                    >
                      Agendar visita pelo WhatsApp
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <a
                    href={CATALOGUE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#1a365d] hover:text-[#002045] transition-colors border-b border-[#1a365d]/40 pb-0.5 hover:border-[#002045]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Baixar Catálogo PDF
                  </a>
                  <Link
                    href="/produtos"
                    className="inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#1a365d] hover:text-[#002045] transition-colors border-b border-[#1a365d]/40 pb-0.5 hover:border-[#002045]"
                  >
                    Ver catálogo online
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: FAQ */}
            <div className="lg:col-span-7">
              <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                Dúvidas frequentes
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-8">
                Perguntas respondidas.
              </h2>
              <div className="divide-y divide-[#eeeeee]">
                {faqs.map(({ q, a }) => (
                  <div key={q} className="py-5">
                    <h3 className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] mb-2 leading-snug">
                      {q}
                    </h3>
                    <p className="text-[#74777f] text-sm font-[var(--font-inter)] leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom note */}
      <div className="bg-[#f9f9f9] border-t border-[#eeeeee] py-5 text-center">
        <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic">
          Orbital · Manaus, AM · Fornecedores diretos — não realizamos instalação.
          Estimativas de custo para referência; valores sujeitos a alteração.
        </p>
      </div>
    </div>
  );
}
