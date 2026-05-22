"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import MdfComparison from "@/components/MdfComparison";

const WA_BASE = "https://wa.me/5592988150149?text=";
const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";
const PLATE_M2 = 3.48;
const PLATE_W = 1.2;
const PLATE_H = 2.9;

const MDF_SHEET_W = 1.85;
const MDF_SHEET_H = 2.75;
const MDF_SHEET_M2 = MDF_SHEET_W * MDF_SHEET_H;
const MDF_SHEET_PRICE = 415;
const MDF_MO_SIMPLE = 30;
const MDF_MO_COMPLEX = 50;
const MDF_ACABAMENTO = 25;
const MDF_INSTALLS_10Y = 3;

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

interface CouponData {
  id: string;
  partner_name: string;
  coupon_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  commission_type: "percentage" | "fixed";
  commission_value: number;
}

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

function WaIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ContatoPage() {
  const simulatorRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedLine, setSelectedLine] = useState<ProductLine | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dimMode, setDimMode] = useState<"lxa" | "m2">("lxa");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [sqmInput, setSqmInput] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showSavings, setShowSavings] = useState(false);
  const [mdfExpanded, setMdfExpanded] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

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

  const discountAmount = couponData
    ? couponData.discount_type === "percentage"
      ? Math.round(orbMaterialTotal * couponData.discount_value / 100)
      : Math.min(couponData.discount_value, orbMaterialTotal)
    : 0;
  const orbMaterialDiscounted = orbMaterialTotal - discountAmount;
  const orbTotal = orbMaterialDiscounted + orbMOTotal;

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

  const commissionOwed = couponData
    ? couponData.commission_type === "percentage"
      ? Math.round(orbMaterialDiscounted * couponData.commission_value / 100)
      : couponData.commission_value
    : 0;

  const waMsg =
    selectedProduct && selectedSpace && m2 > 0
      ? [
          "Olá! Gostaria de solicitar um orçamento do PFB Orbital.",
          "",
          `*Acabamento:* ${selectedProduct.name} (${selectedProduct.code} — ${selectedProduct.linha})`,
          `*Espaço:* ${selectedSpace.label}`,
          dimMode === "lxa" && width && height
            ? `*Dimensões:* ${width}m × ${height}m`
            : `*Área informada:* ${m2.toFixed(2)} m²`,
          `*Área total:* ${m2.toFixed(2)} m²`,
          `*Quantidade:* ${plates} placa${plates !== 1 ? "s" : ""} (cobre ~${(plates * PLATE_M2).toFixed(2)} m²)`,
          `*Preço estimado do material:* ${fmt(orbMaterialTotal)}`,
          couponData
            ? `*Cupom aplicado:* ${couponData.coupon_code} (desconto de ${couponData.discount_type === "percentage" ? couponData.discount_value + "%" : fmt(couponData.discount_value)})`
            : null,
          couponData ? `*Preço com desconto:* ${fmt(orbMaterialDiscounted)}` : null,
          clientName ? `*Cliente:* ${clientName}` : null,
          clientPhone ? `*WhatsApp do cliente:* ${clientPhone}` : null,
        ].filter(Boolean).join("\n")
      : "Olá! Tenho interesse no PFB Orbital e gostaria de fazer um orçamento.";

  function scrollToSimulator() {
    setTimeout(() => {
      simulatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function goToStep(n: 1 | 2 | 3 | 4 | 5) {
    setStep(n);
    setShowResult(false);
    scrollToSimulator();
  }

  function showResults() {
    setShowResult(true);
  }

  useEffect(() => {
    if (showResult) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [showResult]);

  function reset() {
    setStep(1);
    setSelectedSpace(null);
    setSelectedLine(null);
    setSelectedProduct(null);
    setWidth("");
    setHeight("");
    setSqmInput("");
    setClientName("");
    setClientPhone("");
    setCouponCode("");
    setCouponData(null);
    setCouponError("");
    setShowResult(false);
    setShowSavings(false);
    scrollToSimulator();
  }

  async function validateCoupon() {
    if (!couponCode.trim()) return;
    setCouponValidating(true);
    setCouponError("");
    setCouponData(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setCouponData(json);
      } else {
        setCouponError(json.error || "Cupom inválido.");
      }
    } catch {
      setCouponError("Erro ao validar cupom. Tente novamente.");
    } finally {
      setCouponValidating(false);
    }
  }

  async function handleCouponAndAdvance() {
    if (couponCode.trim() && !couponData) {
      await validateCoupon();
    }
    goToStep(5);
  }

  function logCouponUse() {
    if (!couponData || !selectedProduct || !selectedSpace) return;
    try {
      fetch("/api/coupons/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: couponData.id,
          coupon_code: couponData.coupon_code,
          space: selectedSpace.label,
          product_name: selectedProduct.name,
          product_code: selectedProduct.code,
          area_m2: m2,
          plates,
          material_total: orbMaterialTotal,
          material_discounted: orbMaterialDiscounted,
          discount_applied: discountAmount,
          commission_owed: commissionOwed,
          architect_name: clientName || null,
        }),
      });
    } catch {
      // fire and forget
    }
  }

  const canAdvance1 = selectedSpace !== null && selectedSpace.viability !== "no";
  const canAdvance2 = selectedProduct !== null;
  const canCalculate = m2 > 0;

  const STEPS = [
    { n: 1 as const, label: "Espaço" },
    { n: 2 as const, label: "Modelo" },
    { n: 3 as const, label: "Dimensões" },
    { n: 4 as const, label: "Cupom" },
    { n: 5 as const, label: "Cliente" },
  ];

  return (
    <div className="pt-20">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#002045] text-white py-10 lg:py-32 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,.5) 39px,rgba(255,255,255,.5) 40px)",
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="max-w-3xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Simulador · Orçamento
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-3xl lg:text-6xl font-normal tracking-[-0.02em] leading-tight mb-6">
              Comece o seu projeto.
            </h1>
            <p className="text-white/65 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl mb-8 lg:mb-10">
              Escolha o acabamento, informe a área e veja em segundos quanto você investe —
              e quanto economiza ao longo de 10 anos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a
                href="#simulador"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#f3f3f3] transition-colors"
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
                className="inline-flex items-center justify-center gap-2.5 border border-white/30 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:border-white transition-colors"
              >
                <WaIcon />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Simulator ────────────────────────────────────────────────────── */}
      <section id="simulador" ref={simulatorRef} className="py-12 lg:py-20 bg-[#f5f5f3] scroll-mt-20">
        <div className="max-w-[1060px] mx-auto px-4 sm:px-8 lg:px-16">

          {/* Header */}
          <div className="mb-8 lg:mb-12">
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
              Simulador de investimento
            </p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl lg:text-4xl font-normal mb-3">
              Quanto custa revestir o seu espaço?
            </h2>
            <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed max-w-2xl">
              Simule o custo do PFB Orbital e compare com o MDF ao longo de 10 anos.
              Valores de mão de obra são estimativas de mercado.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center mb-6 overflow-x-auto pb-1">
            {STEPS.map(({ n, label }, i) => (
              <React.Fragment key={n}>
                <button
                  onClick={() => { if (n < step) goToStep(n); }}
                  className={`flex-shrink-0 ${n < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-xs font-bold font-[var(--font-inter)] transition-colors ${
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
                      className={`text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] hidden sm:block whitespace-nowrap ${
                        step === n ? "text-[#002045]" : n < step ? "text-[#3b6934]" : "text-[#74777f]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </button>
                {i < 4 && (
                  <div
                    className={`flex-1 h-px mx-2 min-w-[12px] max-w-[60px] ${
                      n < step ? "bg-[#3b6934]" : "bg-[#d8d8d8]"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step 1: Space ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="bg-white border border-[#e2e2e2] p-6 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Qual espaço você quer revestir?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">
                Selecione o tipo de ambiente.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-6">
                {SPACES.filter((s) => s.viability !== "no").map((space) => (
                  <button
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    className={`text-left px-3 py-3 min-h-[44px] border text-xs font-semibold font-[var(--font-inter)] transition-all ${
                      selectedSpace?.id === space.id
                        ? "border-[#002045] bg-[#002045] text-white"
                        : "border-[#e2e2e2] text-[#43474e] hover:border-[#1a365d] hover:text-[#002045]"
                    }`}
                  >
                    {space.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {SPACES.filter((s) => s.viability === "no").map((space) => (
                  <button
                    key={space.id}
                    onClick={() => setSelectedSpace(space)}
                    className={`text-left px-3 py-3 min-h-[44px] border text-xs font-semibold font-[var(--font-inter)] transition-all ${
                      selectedSpace?.id === space.id
                        ? "border-[#c0392b] bg-[#fff5f5] text-[#c0392b]"
                        : "border-[#e2e2e2] text-[#b0b0b0] hover:border-[#e0b0b0]"
                    }`}
                  >
                    {space.label}
                  </button>
                ))}
              </div>

              {selectedSpace?.viability === "no" && (
                <div className="bg-[#fff8f0] border border-[#f0c060] px-5 py-4 mb-6">
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
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
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
            <div className="bg-white border border-[#e2e2e2] p-6 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Qual acabamento você prefere?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">
                Escolha a linha e o acabamento específico.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {(["Classic", "Brilliance", "Elegance"] as ProductLine[]).map((linha) => {
                  const info = LINE_INFO[linha];
                  const active = selectedLine === linha;
                  return (
                    <button
                      key={linha}
                      onClick={() => {
                        setSelectedLine(linha);
                        setSelectedProduct(null);
                        setTimeout(() => {
                          productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                      }}
                      className={`relative border text-left transition-all p-5 flex flex-col gap-3 ${
                        active
                          ? "border-[#002045] bg-[#f5f8ff]"
                          : "border-[#e2e2e2] hover:border-[#1a365d] bg-white"
                      }`}
                    >
                      {active && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-[#002045] flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-[#002045] text-base font-bold font-[var(--font-inter)] mb-1">{linha}</p>
                        <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#3b6934]">
                          {info.finish}
                        </p>
                      </div>
                      <div className="border-t border-[#e8e8e8] pt-3">
                        <p className="text-[#002045] text-sm font-bold font-[var(--font-inter)]">
                          R$ {info.price.toLocaleString("pt-BR")} / placa
                        </p>
                        <p className="text-[#9e9e9e] text-[10px] font-[var(--font-inter)] mt-0.5">
                          2,9m × 1,2m × 5mm · 3,48 m²
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedLine && (
                <div ref={productsRef} className="mb-6 scroll-mt-24">
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-4">
                    Acabamentos {selectedLine}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 min-[400px]:grid-cols-4">
                    {PRODUCTS.filter((p) => p.linha === selectedLine).map((product) => {
                      const active = selectedProduct?.code === product.code;
                      return (
                        <div
                          key={product.code}
                          className={`border overflow-hidden text-left transition-all ${
                            active ? "border-[#002045]" : "border-[#e2e2e2] hover:border-[#1a365d]"
                          }`}
                        >
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="relative w-full overflow-hidden bg-[#f7f7f5] block group"
                          >
                            <div className="relative w-full" style={{ aspectRatio: "812/988" }}>
                              <Image
                                src={product.img}
                                alt={product.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            {active && <div className="absolute inset-0 bg-[#002045]/10" />}
                            {active && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-white flex items-center justify-center shadow-sm">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="3">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </div>
                            )}
                            {/* Expand button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setLightboxImg(product.img); }}
                              className="absolute bottom-2 right-2 w-6 h-6 bg-white/90 hover:bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Ver imagem ampliada"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="2">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                              </svg>
                            </button>
                          </button>
                          <button onClick={() => setSelectedProduct(product)} className="p-2 w-full text-left">
                            <p className={`text-[10px] font-bold font-[var(--font-inter)] leading-tight ${active ? "text-[#002045]" : "text-[#43474e]"}`}>
                              {product.name}
                            </p>
                            <p className="text-[9px] text-[#9e9e9e] font-[var(--font-inter)] mt-0.5">{product.code}</p>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
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
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
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
            <div className="bg-white border border-[#e2e2e2] p-6 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Qual é a área a revestir?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">
                Informe as dimensões ou o m² total.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
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

              <div className="flex w-full sm:w-fit border border-[#e2e2e2] mb-6">
                {[
                  { mode: "lxa" as const, label: "Largura × Altura" },
                  { mode: "m2" as const, label: "Informar m²" },
                ].map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => setDimMode(mode)}
                    className={`flex-1 sm:flex-none px-5 py-3 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] transition-colors ${
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
                <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-end gap-4 mb-6">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Largura (m)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="ex: 3.5"
                      min="0"
                      step="0.1"
                      className="w-full sm:w-32 border border-[#e2e2e2] px-4 py-3 text-base font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Altura (m)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="ex: 2.8"
                      min="0"
                      step="0.1"
                      className="w-full sm:w-32 border border-[#e2e2e2] px-4 py-3 text-base font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                    />
                  </div>
                  {m2 > 0 && (
                    <span className="col-span-2 sm:col-span-1 text-[#43474e] text-sm font-[var(--font-inter)] sm:pb-3">
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
                    inputMode="decimal"
                    value={sqmInput}
                    onChange={(e) => setSqmInput(e.target.value)}
                    placeholder="ex: 12"
                    min="0"
                    step="0.1"
                    className="w-full sm:w-44 border border-[#e2e2e2] px-4 py-3 text-base font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                  />
                </div>
              )}

              {m2 > 0 && (
                <p className="text-[#43474e] text-sm font-[var(--font-inter)] mb-6">
                  Serão necessárias{" "}
                  <strong className="text-[#002045]">
                    {plates} placa{plates !== 1 ? "s" : ""}
                  </strong>{" "}
                  de 3,48 m² cada.
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                  onClick={() => canCalculate && goToStep(4)}
                  disabled={!canCalculate}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
                    canCalculate
                      ? "bg-[#002045] text-white hover:bg-[#1a365d]"
                      : "bg-[#e2e2e2] text-[#aaaaaa] cursor-not-allowed"
                  }`}
                >
                  Próximo: Cupom
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Coupon ────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="bg-white border border-[#e2e2e2] p-6 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Tem um código de parceiro?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-8">
                Opcional — insira o código recebido do seu arquiteto, designer ou indicador.
              </p>

              <div className="max-w-sm mb-6">
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                  Código do cupom
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponData(null);
                      setCouponError("");
                    }}
                    placeholder="ex: ARQLIMA10"
                    className="flex-1 border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] uppercase focus:outline-none focus:border-[#002045] transition-colors tracking-widest"
                  />
                  {couponCode && !couponData && (
                    <button
                      onClick={validateCoupon}
                      disabled={couponValidating}
                      className="px-4 py-3 bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] hover:bg-[#1a365d] transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {couponValidating ? "..." : "Validar"}
                    </button>
                  )}
                </div>

                {couponValidating && (
                  <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2">Validando cupom...</p>
                )}
                {couponError && (
                  <p className="text-red-600 text-xs font-[var(--font-inter)] mt-2">{couponError}</p>
                )}
                {couponData && (
                  <div className="mt-3 bg-[#f0f9eb] border border-[#3b6934]/30 px-4 py-3">
                    <p className="text-[#3b6934] text-xs font-bold font-[var(--font-inter)]">
                      ✓ Cupom <span className="tracking-widest">{couponData.coupon_code}</span> aplicado!
                    </p>
                    <p className="text-[#3b6934]/80 text-xs font-[var(--font-inter)] mt-0.5">
                      Desconto de{" "}
                      {couponData.discount_type === "percentage"
                        ? `${couponData.discount_value}%`
                        : fmt(couponData.discount_value)}{" "}
                      no material.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={() => goToStep(3)}
                  className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Voltar
                </button>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                  <button
                    onClick={() => goToStep(5)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 border border-[#e2e2e2] text-[#74777f] hover:border-[#74777f] hover:text-[#002045] transition-colors"
                  >
                    Pular
                  </button>
                  <button
                    onClick={handleCouponAndAdvance}
                    disabled={couponValidating}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 bg-[#002045] text-white hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                  >
                    Próximo: Cliente
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Client ────────────────────────────────────────────────── */}
          {step === 5 && (
            <div className="bg-white border border-[#e2e2e2] p-6 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Para quem é este projeto?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-8">
                Seus dados para envio do orçamento.
              </p>

              <div className="max-w-md space-y-5 mb-8">
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ex: João Silva"
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="ex: (92) 99999-9999"
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={() => goToStep(4)}
                  className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Voltar
                </button>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                  <button
                    onClick={() => { showResults(); logCouponUse(); }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 border border-[#e2e2e2] text-[#74777f] hover:border-[#74777f] hover:text-[#002045] transition-colors"
                  >
                    Pular
                  </button>
                  <button
                    onClick={() => { showResults(); logCouponUse(); }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 bg-[#002045] text-white hover:bg-[#1a365d] transition-colors"
                  >
                    Ver simulação
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Results panel ─────────────────────────────────────────────── */}
          {showResult && selectedProduct && selectedSpace && m2 > 0 && (
            <div className="mt-0" ref={resultsRef}>

              <div className="bg-[#fffbea] border border-[#e6c84a] px-5 py-4 flex gap-3 items-start">
                <svg className="flex-shrink-0 mt-0.5 text-[#a07a00]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                <p className="text-[#6b5000] text-xs font-[var(--font-inter)] leading-relaxed">
                  <strong>Simulação para referência apenas.</strong> Os valores abaixo são estimativas de custo.
                  A Orbital vende exclusivamente o material — não realizamos instalação.
                  O custo de mão de obra é uma estimativa de mercado.
                </p>
              </div>

              {/* Summary bar */}
              <div className="bg-[#002045] px-5 py-4 flex flex-wrap items-center gap-3 border border-[#2d4f7f] border-b-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden">
                    <Image src={selectedProduct.img} alt={selectedProduct.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-bold font-[var(--font-inter)] truncate">{selectedProduct.name}</p>
                    <p className="text-[#86a0cd] text-[10px] font-[var(--font-inter)] truncate">
                      {selectedProduct.code} · {selectedProduct.linha} · {selectedSpace.label}
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-4 flex-shrink-0">
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

              {/* Input summary */}
              <div className="bg-white border border-[#e2e2e2] border-t-0 px-5 sm:px-8 py-6">
                <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-4">
                  Resumo da sua simulação
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Espaço</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{selectedSpace.label}</p>
                  </div>
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Acabamento</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{selectedProduct.name}</p>
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{selectedProduct.code} · {selectedProduct.linha}</p>
                  </div>
                  {dimMode === "lxa" && width && height ? (
                    <>
                      <div>
                        <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Largura</p>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{width} m</p>
                      </div>
                      <div>
                        <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Altura</p>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{height} m</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Área informada</p>
                      <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{sqmInput} m²</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Área total</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{m2.toFixed(2)} m²</p>
                  </div>
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Qtd. recomendada</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{plates} placa{plates !== 1 ? "s" : ""}</p>
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">cobre ~{(plates * PLATE_M2).toFixed(2)} m²</p>
                  </div>
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Preço do material</p>
                    {discountAmount > 0 ? (
                      <>
                        <p className="text-[#74777f] text-sm line-through font-[var(--font-inter)]">{fmt(orbMaterialTotal)}</p>
                        <p className="text-[#3b6934] text-sm font-bold font-[var(--font-inter)]">{fmt(orbMaterialDiscounted)}</p>
                        <p className="text-[#3b6934] text-[10px] font-[var(--font-inter)]">cupom {couponData?.coupon_code}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{fmt(orbMaterialTotal)}</p>
                        <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">R$ {pricePerPlate.toLocaleString("pt-BR")}/placa</p>
                      </>
                    )}
                  </div>
                  {clientName && (
                    <div>
                      <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Cliente</p>
                      <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{clientName}</p>
                      {clientPhone && <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{clientPhone}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Cost comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="bg-[#002045] px-6 sm:px-8 py-8 border border-[#2d4f7f]">
                  <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-5">
                    PFB Orbital — Estimativa de custo
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-white/55">
                        Material ({plates} placa{plates !== 1 ? "s" : ""} × R$ {pricePerPlate.toLocaleString("pt-BR")})
                        {discountAmount > 0 && (
                          <span className="block text-[#a1d494] text-[10px] mt-0.5">
                            - {couponData?.discount_type === "percentage" ? couponData.discount_value + "%" : fmt(couponData?.discount_value ?? 0)} (cupom)
                          </span>
                        )}
                      </span>
                      <span className="text-white font-semibold flex-shrink-0">{fmt(orbMaterialDiscounted)}</span>
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
                    <p className="text-[#a1d494] text-xs font-semibold font-[var(--font-inter)]">10+ anos sem trocar.</p>
                    <p className="text-[#a1d494]/70 text-[11px] font-[var(--font-inter)] mt-0.5 leading-relaxed">
                      Instala uma vez. Impermeável, anti-mofo e resistente ao clima de Manaus.
                    </p>
                  </div>
                </div>

                {/* MDF card — collapsed on mobile, full on desktop */}
                <div className="bg-[#fafaf8] border border-[#e2e2e2]">

                  {/* Mobile toggle header */}
                  <button
                    className="md:hidden w-full flex items-center justify-between px-6 py-5 text-left"
                    onClick={() => setMdfExpanded(!mdfExpanded)}
                  >
                    <div>
                      <p className="text-[#74777f] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">
                        MDF — Estimativa por instalação
                      </p>
                      <p className="text-[#43474e] text-lg font-[var(--font-noto-serif)] mt-0.5">{fmt(mdfOnce)}</p>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#74777f" strokeWidth="2"
                      className={`flex-shrink-0 transition-transform duration-200 ${mdfExpanded ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {/* Expandable body on mobile / always visible on desktop */}
                  <div className={`${mdfExpanded ? "block" : "hidden"} md:block px-6 sm:px-8 pb-8 md:pt-8`}>
                    <p className="hidden md:block text-[#74777f] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-5">
                      MDF — Estimativa por instalação
                    </p>
                    <div className="space-y-3 mb-6 mt-2 md:mt-0">
                      <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                        <span className="text-[#74777f]">
                          Material ({mdfSheets} chapa{mdfSheets !== 1 ? "s" : ""} × R$ {MDF_SHEET_PRICE})
                        </span>
                        <span className="text-[#43474e] font-semibold flex-shrink-0">{fmt(mdfMaterialTotal)}</span>
                      </div>
                      <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                        <span className="text-[#74777f]">MO estimada (R$ {isComplex ? MDF_MO_COMPLEX : MDF_MO_SIMPLE}/m²)*</span>
                        <span className="text-[#43474e] font-semibold flex-shrink-0">{fmt(mdfMOTotal)}</span>
                      </div>
                      <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                        <span className="text-[#74777f]">Acabamentos (R$ {MDF_ACABAMENTO}/m²)</span>
                        <span className="text-[#43474e] font-semibold flex-shrink-0">{fmt(mdfAcabamentoTotal)}</span>
                      </div>
                      <div className="border-t border-[#e2e2e2] pt-3 flex items-center justify-between">
                        <span className="text-[#43474e] text-sm font-bold font-[var(--font-inter)]">Por instalação</span>
                        <span className="text-[#43474e] text-2xl font-[var(--font-noto-serif)]">{fmt(mdfOnce)}</span>
                      </div>
                    </div>
                    <div className="bg-[#fff3f3] border border-[#e8c0c0] px-4 py-3">
                      <p className="text-[#a03030] text-xs font-semibold font-[var(--font-inter)]">Repõe a cada 2–3 anos em Manaus.</p>
                      <p className="text-[#a03030]/70 text-[11px] font-[var(--font-inter)] mt-0.5 leading-relaxed">
                        A umidade amazônica faz o MDF inchar, empenar e deteriorar continuamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 10-year comparison */}
              <div className="bg-white border border-[#e2e2e2] border-t-0 px-6 sm:px-8 py-8">
                <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-6">
                  Custo acumulado em 10 anos
                </p>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-[var(--font-inter)] text-[#002045]">PFB Orbital — 1 instalação</span>
                    <span className="text-base font-[var(--font-noto-serif)] text-[#002045] font-normal">{fmt(orbTotal)}</span>
                  </div>
                  <div className="h-9 bg-[#e8edf5] overflow-hidden">
                    <div
                      className="h-full bg-[#002045] transition-all duration-700 flex items-center px-3"
                      style={{ width: `${Math.max(Math.min((orbTotal / mdfIn10y) * 100, 100), 8)}%` }}
                    >
                      <span className="text-white text-[10px] font-bold font-[var(--font-inter)] whitespace-nowrap">1×</span>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-[var(--font-inter)] text-[#74777f]">
                      MDF — {MDF_INSTALLS_10Y} instalações em 10 anos
                    </span>
                    <span className="text-base font-[var(--font-noto-serif)] text-[#a03030] font-normal">{fmt(mdfIn10y)}</span>
                  </div>
                  <div className="h-9 bg-[#f5e8e8] overflow-hidden">
                    <div className="h-full bg-[#c0392b]/55 flex items-center px-3" style={{ width: "100%" }}>
                      <span className="text-[#7a0000] text-[10px] font-bold font-[var(--font-inter)]">{MDF_INSTALLS_10Y}×</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <a
                    href={`${WA_BASE}${encodeURIComponent(waMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#1a365d] transition-colors"
                  >
                    <WaIcon />
                    Solicitar orçamento
                  </a>
                  {savings10y > 0 && (
                    <button
                      onClick={() => setShowSavings(!showSavings)}
                      className="inline-flex items-center gap-2 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#3b6934] hover:text-[#002045] transition-colors"
                    >
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`transition-transform duration-300 ${showSavings ? "rotate-180" : ""}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                      {showSavings ? "Ocultar" : "Ver"} economia estimada em 10 anos
                    </button>
                  )}
                </div>

                {savings10y > 0 && showSavings && (
                  <div className="bg-[#f0f9eb] border border-[#3b6934]/30 px-6 py-6 mb-4">
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
                )}

                <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-4 leading-relaxed">
                  * Todos os valores de mão de obra são estimativas de referência baseadas em preços de mercado em Manaus (2025).
                  A Orbital comercializa exclusivamente o material — não presta nem intermedia serviços de instalação.
                  Preços sujeitos a alteração.
                </p>
              </div>

              {/* Technical comparison */}
              <div className="bg-white border border-[#e2e2e2] border-t-0 px-6 sm:px-8 py-8">
                <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
                  Comparativo técnico
                </p>
                <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-6">
                  Desempenho em 10 critérios — condições reais do clima de Manaus.
                </p>
                <MdfComparison />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Pitch strip ──────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-16 bg-[#1a2a1a]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
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
      <section className="py-16 lg:py-20 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

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
                  className="flex items-start gap-5 p-5 sm:p-6 bg-white border border-[#e2e2e2] hover:border-[#1a365d] transition-colors group"
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
                  className="flex items-start gap-5 p-5 sm:p-6 bg-white border border-[#e2e2e2] hover:border-[#1a365d] transition-colors group"
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

                <div className="flex items-start gap-5 p-5 sm:p-6 bg-white border border-[#e2e2e2]">
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
                    <h3 className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] mb-2 leading-snug">{q}</h3>
                    <p className="text-[#74777f] text-sm font-[var(--font-inter)] leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[#f9f9f9] border-t border-[#eeeeee] py-5 text-center">
        <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic">
          Orbital · Manaus, AM · Fornecedores diretos — não realizamos instalação.
          Estimativas de custo para referência; valores sujeitos a alteração.
        </p>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 bg-white/10 hover:bg-white/25 flex items-center justify-center rounded-full transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="relative w-full" style={{ maxHeight: "85vh" }}>
              <Image
                src={lightboxImg}
                alt="Acabamento ampliado"
                width={1200}
                height={900}
                className="object-contain w-full h-auto max-h-[85vh]"
                style={{ maxHeight: "85vh" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
