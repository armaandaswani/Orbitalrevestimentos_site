"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";

type Linha = "todos" | "Classic" | "Brilliance" | "Elegance";

interface ProductImage {
  id: string;
  image_path: string;
  sort_order: number;
}

interface Product {
  id: string;
  code: string;
  name: string;
  linha: "Classic" | "Brilliance" | "Elegance";
  finish: string;
  price: number;
  price_per_m2: number;
  description: string;
  image_path: string;
  is_active: boolean;
  sort_order: number;
  product_images?: ProductImage[];
}

const linhas: { key: Linha; label: string; desc: string }[] = [
  { key: "todos", label: "Todos", desc: "15 acabamentos" },
  { key: "Classic", label: "Classic", desc: "Mármore Fosco · 559/placa" },
  { key: "Brilliance", label: "Brilliance", desc: "Mármore Polido · 589/placa" },
  { key: "Elegance", label: "Elegance", desc: "Madeira Texturizada · 649/placa" },
];

const LINHA_INFO: Record<"Classic" | "Brilliance" | "Elegance", {
  material: string;
  tagline: string;
  differentials: { icon: string; text: string }[];
  color: string;
}> = {
  Classic: {
    material: "Polímero de Alta Densidade · Acabamento Fosco",
    tagline: "Sofisticação atemporal com textura fosca anti-reflexo. A escolha mais versátil do catálogo.",
    differentials: [
      { icon: "◼", text: "Acabamento fosco anti-reflexo — elegância discreta em qualquer iluminação" },
      { icon: "◼", text: "Absorção de apenas 0,2% em 48h — indicado para banheiros, lavabos e áreas úmidas" },
      { icon: "◼", text: "Formato maxiplatê 1,2 × 2,9m — menos emendas, visual mais limpo" },
      { icon: "◼", text: "Instalação em 2 a 3 horas por cômodo, sem obra, sem poeira" },
    ],
    color: "bg-blue-50 text-blue-800 border-blue-100",
  },
  Brilliance: {
    material: "Polímero de Alta Densidade · Acabamento Polido",
    tagline: "Superfície espelhada que replica mármore importado. Presença visual máxima.",
    differentials: [
      { icon: "◆", text: "Acabamento polido espelhado — efeito mármore de luxo sem o custo" },
      { icon: "◆", text: "Reflexo de luz natural amplifica ambientes e cria sensação de amplitude" },
      { icon: "◆", text: "Alta impermeabilidade — perfeito para banheiros e ambientes de alto padrão" },
      { icon: "◆", text: "Mesma resistência técnica da linha Classic com visual premium" },
    ],
    color: "bg-purple-50 text-purple-800 border-purple-100",
  },
  Elegance: {
    material: "Polímero de Alta Densidade · Textura Madeira",
    tagline: "Calor e naturalidade da madeira sem nenhuma de suas desvantagens.",
    differentials: [
      { icon: "▲", text: "Textura tátil realista — aparência e sensação de madeira natural" },
      { icon: "▲", text: "Zero manutenção — sem verniz, sem lixamento, sem deterioração" },
      { icon: "▲", text: "Resistente à umidade — aplicável em banheiros, lavabos e cozinhas" },
      { icon: "▲", text: "Calor visual com durabilidade industrial: vida útil superior a 20 anos" },
    ],
    color: "bg-green-50 text-green-800 border-green-100",
  },
};

// All images for a product: cover first, then gallery sorted
function allImages(product: Product): string[] {
  const gallery = (product.product_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => img.image_path);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of [product.image_path, ...gallery]) {
    if (url && !seen.has(url)) { seen.add(url); result.push(url); }
  }
  return result;
}

export default function ProdutosPage() {
  const [activeLinha, setActiveLinha] = useState<Linha>("todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const filtered =
    activeLinha === "todos"
      ? products
      : products.filter((p) => p.linha === activeLinha);

  const selectedIndex = selected ? filtered.findIndex((p) => p.code === selected.code) : -1;
  const images = selected ? allImages(selected) : [];

  function open(product: Product) {
    setSelected(product);
    setImgIdx(0);
  }
  function close() {
    setSelected(null);
    setImgIdx(0);
  }

  const goNextProduct = useCallback(() => {
    if (selectedIndex < filtered.length - 1) open(filtered[selectedIndex + 1]);
  }, [selectedIndex, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const goPrevProduct = useCallback(() => {
    if (selectedIndex > 0) open(filtered[selectedIndex - 1]);
  }, [selectedIndex, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") {
        const imgs = allImages(selected);
        if (imgIdx < imgs.length - 1) setImgIdx(imgIdx + 1);
        else goNextProduct();
      }
      if (e.key === "ArrowLeft") {
        if (imgIdx > 0) setImgIdx(imgIdx - 1);
        else goPrevProduct();
      }
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [selected, imgIdx, goNextProduct, goPrevProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pt-20">

      {/* ── Product Detail Modal ── */}
      {selected && (() => {
        const info = LINHA_INFO[selected.linha];
        const simulatorUrl = `/simulador?produto=${encodeURIComponent(selected.code)}`;
        return (
          <div
            className="fixed inset-0 z-[100] flex items-stretch lg:items-center bg-black/80 backdrop-blur-sm"
            onClick={close}
          >
            {/* Prev product arrow — desktop only */}
            {selectedIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPrevProduct(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 items-center justify-center transition-colors hidden lg:flex"
                aria-label="Produto anterior"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {selectedIndex < filtered.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goNextProduct(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 items-center justify-center transition-colors hidden lg:flex"
                aria-label="Próximo produto"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}

            {/* Modal card — full screen on mobile, centered card on desktop */}
            <div
              className="relative w-full h-[100dvh] lg:h-auto lg:m-auto lg:max-w-5xl lg:max-h-[96dvh] flex flex-col lg:flex-row overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={close}
                className="absolute top-3 right-3 z-30 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                aria-label="Fechar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>

              {/* ── Top / Left: Image gallery ── */}
              <div className="flex-shrink-0 w-full lg:w-[52%] flex flex-col bg-[#0d0d0d]">
                {/* Main image — 44dvh on mobile, flex-1 on desktop */}
                <div
                  className="relative h-[44dvh] lg:h-auto lg:flex-1 overflow-hidden"
                  onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                  onTouchEnd={(e) => {
                    if (touchStartX === null) return;
                    const delta = e.changedTouches[0].clientX - touchStartX;
                    if (Math.abs(delta) > 45) {
                      if (delta < 0 && imgIdx < images.length - 1) setImgIdx(i => i + 1);
                      else if (delta > 0 && imgIdx > 0) setImgIdx(i => i - 1);
                    }
                    setTouchStartX(null);
                  }}
                >
                  {/* Blurred background fill */}
                  <img
                    key={"bg-" + images[imgIdx]}
                    src={images[imgIdx] ?? selected.image_path}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40 select-none pointer-events-none"
                  />
                  {/* Sharp foreground image */}
                  <img
                    key={images[imgIdx]}
                    src={images[imgIdx] ?? selected.image_path}
                    alt={selected.name}
                    className="absolute inset-0 w-full h-full object-contain z-10"
                  />
                  {/* Swipe hint on mobile — fades in only when there are multiple images */}
                  {images.length > 1 && (
                    <div className="absolute inset-x-0 bottom-8 flex items-center justify-between px-3 z-20 pointer-events-none lg:hidden">
                      <div className={`w-8 h-8 rounded-full bg-black/40 flex items-center justify-center transition-opacity ${imgIdx === 0 ? "opacity-0" : "opacity-70"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                      </div>
                      <div className={`w-8 h-8 rounded-full bg-black/40 flex items-center justify-center transition-opacity ${imgIdx === images.length - 1 ? "opacity-0" : "opacity-70"}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </div>
                  )}
                  {/* Arrow buttons — desktop only (mobile uses swipe) */}
                  {imgIdx > 0 && (
                    <button
                      onClick={() => setImgIdx(imgIdx - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 items-center justify-center transition-colors hidden lg:flex"
                      aria-label="Foto anterior"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                  )}
                  {imgIdx < images.length - 1 && (
                    <button
                      onClick={() => setImgIdx(imgIdx + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 items-center justify-center transition-colors hidden lg:flex"
                      aria-label="Próxima foto"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  )}
                  {/* Dot indicator */}
                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={`rounded-full transition-all ${i === imgIdx ? "bg-white w-4 h-1.5" : "bg-white/40 w-1.5 h-1.5 hover:bg-white/70"}`}
                          aria-label={`Foto ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-1.5 px-2 py-1.5 bg-black/80 overflow-x-auto flex-shrink-0 scrollbar-none">
                    {images.map((url, i) => (
                      <button
                        key={url + i}
                        onClick={() => setImgIdx(i)}
                        className={`flex-shrink-0 w-10 h-10 lg:w-14 lg:h-14 border-2 overflow-hidden transition-all ${
                          i === imgIdx ? "border-white opacity-100" : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Bottom / Right: Product info ── */}
              <div className="flex-1 min-h-0 bg-white flex flex-col overflow-y-auto">
                <div className="p-6 lg:p-8 flex flex-col gap-5 flex-1">

                  {/* Breadcrumb + badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-1 border ${info.color}`}>
                      Linha {selected.linha}
                    </span>
                    <span className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)]">/</span>
                    <span className="text-[#74777f] text-[10px] tracking-[0.12em] uppercase font-semibold font-[var(--font-inter)]">
                      {selected.code}
                    </span>
                  </div>

                  {/* Name */}
                  <div>
                    <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl lg:text-3xl font-normal leading-tight mb-1">
                      {selected.name}
                    </h2>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)]">{info.material}</p>
                  </div>

                  {/* Tagline */}
                  <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed italic border-l-2 border-[#002045]/20 pl-3">
                    {info.tagline}
                  </p>

                  {/* Description */}
                  {selected.description && (
                    <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">
                      {selected.description}
                    </p>
                  )}

                  {/* Specs bar */}
                  <div className="grid grid-cols-3 gap-0 border border-[#e8e8e8]">
                    {[
                      { label: "Espessura", value: "5 mm" },
                      { label: "Dimensão", value: "1,2 × 2,9m" },
                      { label: "Área/placa", value: "3,48 m²" },
                    ].map(({ label, value }, i) => (
                      <div key={label} className={`px-3 py-2.5 text-center ${i < 2 ? "border-r border-[#e8e8e8]" : ""}`}>
                        <p className="font-[var(--font-noto-serif)] text-[#002045] text-sm font-normal">{value}</p>
                        <p className="text-[#74777f] text-[9px] tracking-[0.12em] uppercase font-semibold font-[var(--font-inter)] mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Attribute cards — same style as simulator strip */}
                  <div>
                    {/* Mobile: 2×2 combined */}
                    {/* 4 cards: 2×2 on small mobile, 4-in-a-row on sm+ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        {
                          label: "Resistente à:",
                          desc: "Água, Umidade & Mofo",
                          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
                        },
                        {
                          label: "Anti-cupim &",
                          desc: "Não propaga Chamas",
                          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
                        },
                        {
                          label: "Pronta-entrega",
                          desc: "em Manaus",
                          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                        },
                        {
                          label: "Instalação",
                          desc: "Rápida & Limpa",
                          icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                        },
                      ].map(({ label, icon, desc }) => (
                        <div key={label} className="flex flex-col items-center text-center gap-1.5 p-2.5 bg-[#f9f9f9] border border-[#e2e2e2]">
                          <div className="w-6 h-6 bg-[#f0f4f8] flex items-center justify-center text-[#002045] flex-shrink-0">{icon}</div>
                          <div>
                            <p className="text-[#002045] text-[8px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] leading-tight">{label}</p>
                            <p className="text-[#002045] text-[8px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] leading-tight">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="border-t border-[#e8e8e8] pt-4">
                    <p className="text-[#1a365d] text-2xl font-semibold font-[var(--font-inter)]">
                      {selected.price.toLocaleString("pt-BR")}
                      <span className="text-sm text-[#74777f] font-normal ml-1">/placa</span>
                    </p>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">
                      {selected.price_per_m2}/m² · {selectedIndex + 1} de {filtered.length} modelos
                      {images.length > 1 && ` · ${images.length} fotos`}
                    </p>
                  </div>
                </div>

                {/* CTA — pinned to bottom */}
                <div className="sticky bottom-0 p-4 lg:p-6 bg-white border-t border-[#e8e8e8]">
                  <Link
                    href={simulatorUrl}
                    onClick={close}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 hover:bg-[#003070] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M13 3h8m0 0v8m0-8L11 13"/>
                    </svg>
                    Simular investimento
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Page Header */}
      <section className="bg-[#002045] text-white py-10 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Catálogo · 2026
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-3xl lg:text-6xl font-normal tracking-[-0.02em] leading-tight mb-5">
            Catálogo de Acabamentos
          </h1>
          <p className="text-white/70 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl mb-8">
            3 linhas exclusivas. 15 acabamentos em estoque. Precisão técnica e
            estética arquitetônica para projetos exigentes.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4">
            <Link
              href="/simulador"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#f3f3f3] transition-colors"
            >
              Simulação de Orçamento
            </Link>
            <a
              href={CATALOGUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-white/10 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Baixar Catálogo
            </a>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-20 z-40 bg-[#ffffff] border-b border-[#e2e2e2] shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="flex gap-0 overflow-x-auto">
            {linhas.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setActiveLinha(key)}
                className={`flex-shrink-0 flex flex-col items-start px-3 py-3 sm:px-6 sm:py-5 border-b-2 transition-all duration-200 ${
                  activeLinha === key
                    ? "border-[#002045] text-[#002045]"
                    : "border-transparent text-[#74777f] hover:text-[#002045]"
                }`}
              >
                <span className="text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)]">
                  {label}
                </span>
                <span className="text-[10px] font-[var(--font-inter)] mt-0.5 opacity-70 hidden sm:block">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <section className="py-12 lg:py-20 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          {activeLinha !== "todos" && (
            <div className="mb-10 pb-8 border-b border-[#e2e2e2]">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-2">
                Linha {activeLinha}
              </h2>
              <p className="text-[#43474e] text-sm font-[var(--font-inter)]">
                {activeLinha === "Classic" &&
                  "Mármore Fosco · 5mm · 1,2m × 2,9m = 3,48m² · 559/placa · 160/m²"}
                {activeLinha === "Brilliance" &&
                  "Mármore Polido · 5mm · 1,2m × 2,9m = 3,48m² · 589/placa · 169/m²"}
                {activeLinha === "Elegance" &&
                  "Madeira Texturizada · 5mm · 1,2m × 2,9m = 3,48m² · 649/placa · 186/m²"}
              </p>
            </div>
          )}

          {loadingProducts ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-8 lg:gap-y-14">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] bg-[#e2e2e2] mb-3 lg:mb-5" />
                  <div className="space-y-2">
                    <div className="h-3 bg-[#e2e2e2] rounded w-1/3" />
                    <div className="h-5 bg-[#e2e2e2] rounded w-2/3" />
                    <div className="h-3 bg-[#e2e2e2] rounded w-full hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-8 lg:gap-y-14">
              {filtered.map((product) => (
                <article
                  key={product.code}
                  className="group cursor-pointer"
                  onClick={() => open(product)}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#eeeeee] mb-3 lg:mb-5 shadow-sm group-hover:shadow-lg transition-shadow duration-500">
                    <img
                      src={product.image_path}
                      alt={`${product.name} — Linha ${product.linha}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="2.5">
                          <path d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7"/>
                        </svg>
                      </div>
                    </div>
                    {/* Badges */}
                    <div className="absolute top-2 right-2 lg:top-4 lg:right-4 flex flex-col items-end gap-1.5">
                      <span className="bg-white/95 text-[#002045] text-[9px] lg:text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] px-2 py-1 lg:px-2.5 lg:py-1.5">
                        {product.finish}
                      </span>
                      {allImages(product).length > 1 && (
                        <span className="bg-black/60 text-white text-[9px] font-semibold font-[var(--font-inter)] px-1.5 py-0.5 flex items-center gap-1">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                          {allImages(product).length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1 lg:space-y-1.5">
                    <span className="text-[#74777f] text-[9px] lg:text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">
                      {product.code} · {product.linha}
                    </span>
                    <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-base lg:text-xl font-medium leading-snug group-hover:underline underline-offset-2 decoration-[#002045]/30">
                      {product.name}
                    </h3>
                    <p className="text-[#43474e] text-xs lg:text-sm font-[var(--font-inter)] leading-relaxed hidden sm:block line-clamp-2">
                      {product.description}
                    </p>
                    <div className="pt-1 lg:pt-2 flex items-center justify-between">
                      <div>
                        <span className="text-[#1a365d] text-sm lg:text-base font-semibold font-[var(--font-inter)]">
                          {product.price.toLocaleString("pt-BR")}
                          <span className="text-xs text-[#74777f] font-normal ml-1">/placa</span>
                        </span>
                        <span className="text-[#74777f] text-xs font-[var(--font-inter)] ml-1 lg:ml-2 hidden sm:inline">
                          ({product.price_per_m2}/m²)
                        </span>
                      </div>
                    </div>
                    <p className="text-[#b0b4bb] text-[10px] tracking-[0.08em] font-[var(--font-inter)] pt-0.5">
                      2,9m × 1,2m × 5mm
                    </p>
                    <div className="pt-1.5">
                      <button className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] px-4 py-2 lg:px-5 group-hover:bg-[#002045] group-hover:text-white transition-colors">
                        Ver detalhes →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Specs Bar */}
      <section className="bg-[#002045] py-12">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
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
