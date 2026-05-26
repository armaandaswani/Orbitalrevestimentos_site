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
  { key: "Classic", label: "Classic", desc: "Mármore Fosco · R$ 559" },
  { key: "Brilliance", label: "Brilliance", desc: "Mármore Polido · R$ 589" },
  { key: "Elegance", label: "Elegance", desc: "Madeira Texturizada · R$ 649" },
];

export default function ProdutosPage() {
  const [activeLinha, setActiveLinha] = useState<Linha>("todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [lightbox, setLightbox] = useState<Product | null>(null);
  const [lightboxImgIdx, setLightboxImgIdx] = useState(0);

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

  // All images for a product: cover image first, then gallery sorted by sort_order
  function allImages(product: Product): string[] {
    const gallery = (product.product_images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => img.image_path);
    // Deduplicate: if cover is already in gallery, don't repeat it
    const seen = new Set<string>();
    const result: string[] = [];
    for (const url of [product.image_path, ...gallery]) {
      if (url && !seen.has(url)) { seen.add(url); result.push(url); }
    }
    return result;
  }

  // Lightbox navigation
  const lightboxIndex = lightbox ? filtered.findIndex((p) => p.code === lightbox.code) : -1;
  const lightboxImages = lightbox ? allImages(lightbox) : [];

  const goNext = useCallback(() => {
    if (!lightbox) return;
    const imgs = allImages(lightbox);
    if (lightboxImgIdx < imgs.length - 1) {
      setLightboxImgIdx(lightboxImgIdx + 1);
    } else if (lightboxIndex < filtered.length - 1) {
      setLightbox(filtered[lightboxIndex + 1]);
      setLightboxImgIdx(0);
    }
  }, [lightbox, lightboxImgIdx, lightboxIndex, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const goPrev = useCallback(() => {
    if (!lightbox) return;
    if (lightboxImgIdx > 0) {
      setLightboxImgIdx(lightboxImgIdx - 1);
    } else if (lightboxIndex > 0) {
      const prevProduct = filtered[lightboxIndex - 1];
      const prevImgs = allImages(prevProduct);
      setLightbox(prevProduct);
      setLightboxImgIdx(prevImgs.length - 1);
    }
  }, [lightbox, lightboxImgIdx, lightboxIndex, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPrev = lightboxImgIdx > 0 || lightboxIndex > 0;
  const hasNext = lightbox ? (lightboxImgIdx < lightboxImages.length - 1 || lightboxIndex < filtered.length - 1) : false;

  // Keyboard navigation + ESC
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightbox(null); setLightboxImgIdx(0); }
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightbox, goNext, goPrev]);

  return (
    <div className="pt-20">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => { setLightbox(null); setLightboxImgIdx(0); }}
        >
          {/* Close */}
          <button
            onClick={() => { setLightbox(null); setLightboxImgIdx(0); }}
            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Prev arrow */}
          {hasPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-3 lg:left-6 z-10 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              aria-label="Anterior"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* Next arrow */}
          {hasNext && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-3 lg:right-6 z-10 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              aria-label="Próximo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div
            className="flex flex-col lg:flex-row w-full max-w-5xl mx-4 lg:mx-8 max-h-[90dvh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative flex-shrink-0 w-full lg:w-[55%] aspect-[4/5] lg:aspect-auto lg:h-[80dvh] bg-[#111] flex flex-col">
              <div className="relative flex-1 min-h-0">
                <img
                  key={lightboxImages[lightboxImgIdx]}
                  src={lightboxImages[lightboxImgIdx] ?? lightbox.image_path}
                  alt={lightbox.name}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
              {/* Thumbnail strip */}
              {lightboxImages.length > 1 && (
                <div className="flex gap-1.5 p-2 bg-black/60 overflow-x-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {lightboxImages.map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setLightboxImgIdx(i)}
                      className={`flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 border-2 overflow-hidden transition-all ${
                        i === lightboxImgIdx ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="bg-white lg:flex-1 flex flex-col justify-between p-6 lg:p-10">
              <div>
                <span className="text-[#74777f] text-[10px] tracking-[0.18em] uppercase font-semibold font-[var(--font-inter)]">
                  {lightbox.code} · Linha {lightbox.linha}
                </span>
                <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl lg:text-3xl font-normal mt-2 mb-4 leading-snug">
                  {lightbox.name}
                </h2>
                <span className="inline-block bg-[#f3f3f3] text-[#002045] text-[10px] tracking-[0.12em] uppercase font-semibold font-[var(--font-inter)] px-3 py-1.5 mb-5">
                  {lightbox.finish}
                </span>
                <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed mb-6">
                  {lightbox.description}
                </p>
                <div className="border-t border-[#e2e2e2] pt-5 space-y-1.5">
                  <p className="text-[#1a365d] text-xl font-semibold font-[var(--font-inter)]">
                    R$ {lightbox.price.toLocaleString("pt-BR")}
                    <span className="text-sm text-[#74777f] font-normal ml-1">/placa</span>
                  </p>
                  <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
                    R$ {lightbox.price_per_m2}/m² · 3,48 m² por placa
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/5592988150149?text=${encodeURIComponent(`Olá! Tenho interesse no acabamento ${lightbox.name} (${lightbox.code}). Gostaria de saber mais.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3.5 hover:bg-[#003070] transition-colors"
                >
                  Saber mais →
                </a>
                <Link
                  href="/simulador"
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3.5 hover:bg-[#002045] hover:text-white transition-colors"
                  onClick={() => { setLightbox(null); setLightboxImgIdx(0); }}
                >
                  Simular orçamento
                </Link>
              </div>
            </div>
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-[var(--font-inter)] tracking-[0.1em]">
            Produto {lightboxIndex + 1}/{filtered.length}
            {lightboxImages.length > 1 && ` · Foto ${lightboxImgIdx + 1}/${lightboxImages.length}`}
          </div>
        </div>
      )}
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
                  "Mármore Fosco · 5mm · 1,2m × 2,9m = 3,48m² · R$ 559/placa · R$ 160/m²"}
                {activeLinha === "Brilliance" &&
                  "Mármore Polido · 5mm · 1,2m × 2,9m = 3,48m² · R$ 589/placa · R$ 169/m²"}
                {activeLinha === "Elegance" &&
                  "Madeira Texturizada · 5mm · 1,2m × 2,9m = 3,48m² · R$ 649/placa · R$ 186/m²"}
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
                    <div className="h-3 bg-[#e2e2e2] rounded w-4/5 hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 lg:gap-x-8 lg:gap-y-14">
              {filtered.map((product) => (
                <article key={product.code} className="group cursor-pointer">
                  <div
                    className="relative aspect-[4/5] overflow-hidden bg-[#eeeeee] mb-3 lg:mb-5 shadow-sm group-hover:shadow-lg transition-shadow duration-500 cursor-zoom-in"
                    onClick={() => { setLightbox(product); setLightboxImgIdx(0); }}
                  >
                    <img
                      src={product.image_path}
                      alt={`${product.name} — Linha ${product.linha}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                    {/* Zoom icon overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                        </svg>
                      </div>
                    </div>
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
                  <div className="space-y-1 lg:space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#74777f] text-[9px] lg:text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">
                        {product.code} · {product.linha}
                      </span>
                    </div>
                    <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-base lg:text-xl font-medium leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[#43474e] text-xs lg:text-sm font-[var(--font-inter)] leading-relaxed hidden sm:block">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between pt-1 lg:pt-2">
                      <div>
                        <span className="text-[#1a365d] text-sm lg:text-base font-semibold font-[var(--font-inter)]">
                          R$ {product.price.toLocaleString("pt-BR")}
                          <span className="text-xs text-[#74777f] font-normal ml-1">
                            /placa
                          </span>
                        </span>
                        <span className="text-[#74777f] text-xs font-[var(--font-inter)] ml-1 lg:ml-2 hidden sm:inline">
                          (R$ {product.price_per_m2}/m²)
                        </span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <a
                        href={`https://wa.me/5592988150149?text=${encodeURIComponent(`Olá! Tenho interesse no acabamento ${product.name} (${product.code}). Gostaria de saber mais.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] px-4 py-2 lg:px-5 hover:bg-[#002045] hover:text-white transition-colors"
                      >
                        Saber mais →
                      </a>
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
