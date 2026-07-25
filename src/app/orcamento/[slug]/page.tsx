"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import MdfComparison from "@/components/MdfComparison";

interface QuoteSpace {
  spaceName: string;
  productCode: string;
  productName: string;
  productImg: string;
  linha: "Classic" | "Brilliance" | "Elegance";
  plates: number;
  area: number;
  // Older quotes (saved before this field existed) won't have it — falls back
  // to just the area, same as before.
  dimLabel?: string | null;
  pricePerPlate: number;
  total: number;
  // Original measurement method + raw values (added later; older quotes lack them).
  measurementType?: "dimensions" | "square_meters" | null;
  width?: number | null;
  height?: number | null;
  squareMeters?: number | null;
}

interface SavedQuote {
  slug: string;
  partner_name: string | null;
  partner_phone: string | null;
  coupon_code: string | null;
  spaces: QuoteSpace[];
  total_plates: number | null;
  total_area_m2: number | null;
  material_total: number | null;
  material_discounted: number | null;
  expires_at: string;
  created_at: string;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtDec(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function LINE_COLOR(linha: string) {
  if (linha === "Classic") return { bg: "bg-[#f5f0e8]", text: "text-[#6b5030]", dot: "bg-[#c4a47c]" };
  if (linha === "Brilliance") return { bg: "bg-[#eef2f9]", text: "text-[#1a3a6b]", dot: "bg-[#4a7cc7]" };
  return { bg: "bg-[#edf5ee]", text: "text-[#2d5a36]", dot: "bg-[#5a9b63]" };
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Fixed installation partner (terceirizado) — same one offered on the
// simulador's own result step. Independent of quote.partner_name/phone, which
// is the referring SALES partner (e.g. an architect), not an installer.
const WERK_ENGENHARIA_WA_BASE = "https://wa.me/5592993974821?text=";

export default function OrcamentoPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [quote, setQuote] = useState<SavedQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMoInfo, setShowMoInfo] = useState(false);
  const [pricing, setPricing] = useState<import("@/lib/orcamento-pricing").OrcamentoBreakdown | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/quotes/${slug}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); setLoading(false); return; }
        const data: SavedQuote = await res.json();
        if (new Date(data.expires_at) < new Date()) { setExpired(true); setLoading(false); return; }
        setQuote(data);
        setLoading(false);
        // Composição autoritativa (placas + Cola PU + frete + pagamento) do motor.
        const plates = data.total_plates ?? (data.spaces ?? []).reduce((s: number, sp) => s + (sp.plates || 0), 0);
        const subtotal = data.material_discounted ?? data.material_total ?? 0;
        if (plates > 0) {
          fetch("/api/orcamento/pricing", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plates, pricePerPlate: subtotal / plates }),
          }).then((r) => (r.ok ? r.json() : null)).then((b) => { if (b) setPricing(b); }).catch(() => {});
        }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0efec] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#002045] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#74777f] text-xs tracking-[0.15em] uppercase font-[var(--font-inter)]">Carregando orçamento…</p>
        </div>
      </div>
    );
  }

  if (notFound || !quote) {
    return (
      <div className="min-h-screen bg-[#f0efec] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl mb-3">Orçamento não encontrado</p>
          <p className="text-[#74777f] text-sm font-[var(--font-inter)] leading-relaxed mb-6">Este link pode ter expirado ou ser inválido. Entre em contato com quem compartilhou o orçamento.</p>
          <a href="https://wa.me/559288150149" className="inline-block bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3">
            Falar com a Orbital
          </a>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-[#f0efec] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl mb-3">Orçamento expirado</p>
          <p className="text-[#74777f] text-sm font-[var(--font-inter)] leading-relaxed mb-6">Este orçamento tinha validade de 7 dias e já expirou. Peça um novo orçamento atualizado.</p>
          <a href="https://wa.me/559288150149" className="inline-block bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3">
            Solicitar novo orçamento
          </a>
        </div>
      </div>
    );
  }

  const days = daysUntil(quote.expires_at);
  const isDiscounted = quote.material_discounted != null && quote.material_total != null && quote.material_discounted < quote.material_total;
  const finalValue = quote.material_discounted ?? quote.material_total ?? 0;
  const savings = isDiscounted ? (quote.material_total ?? 0) - (quote.material_discounted ?? 0) : 0;

  const waMessage = encodeURIComponent(
    [
      `Olá! Vi o orçamento Orbital enviado por ${quote.partner_name ?? "um parceiro"} e tenho interesse em avançar com o projeto.`,
      ``,
      `Referência: orbitalrevestimentos.com.br/orcamento/${quote.slug}`,
      ``,
      `Ambientes:`,
      ...(quote.spaces ?? []).map((sp) => `• ${sp.spaceName} — ${sp.productName} (${sp.plates} ${sp.plates === 1 ? "placa" : "placas"})`),
      ``,
      `Total: ${fmt(finalValue)}`,
    ].join("\n")
  );
  // The referring partner often coordinates the project/installation directly
  // — a client returning to this saved link later (not just right after the
  // quote was made) should still be able to reach THEM, not just Orbital.
  const partnerWaDigits = quote.partner_phone ? quote.partner_phone.replace(/\D/g, "") : null;
  const partnerWaPhone = partnerWaDigits ? (partnerWaDigits.startsWith("55") ? partnerWaDigits : `55${partnerWaDigits}`) : null;
  const partnerWaMessage = encodeURIComponent(
    `Olá ${quote.partner_name ?? ""}! Vi nosso orçamento Orbital novamente e gostaria de falar sobre o projeto e a instalação.\n\nReferência: orbitalrevestimentos.com.br/orcamento/${quote.slug}`
  );
  // Message to the fixed installation partner (Werk Engenharia) — per-ambiente
  // breakdown only, never a price: the material value is closed with Orbital,
  // not something the installer needs to see.
  const werkssonMsg = encodeURIComponent(
    [
      "Olá Werk Engenharia! Sou cliente da Orbital Revestimentos e gostaria de um orçamento de instalação para os painéis PFB.",
      "",
      ...(quote.spaces ?? []).map(
        (sp) => `• ${sp.spaceName} — ${sp.productName} (${fmtDec(sp.area)} m², ${sp.plates} ${sp.plates === 1 ? "placa" : "placas"})`
      ),
      "",
      `Referência: orbitalrevestimentos.com.br/orcamento/${quote.slug}`,
    ].join("\n")
  );
  // "Editar este orçamento" — resumes the simulador prefilled with every saved
  // space (name, exact model, exact plate count), using the same ?ms=N&s{i}=…
  // &p{i}=…&pl{i}=… multi-space format the visualizador/partner-link handoffs
  // already use. src=quote (not viz/consultor) drives its own banner/copy in
  // the simulador rather than reusing the "configured by your consultor" one.
  const editUrlWith = (goto?: "modelo" | "dimensoes") => {
    const spaces = quote.spaces ?? [];
    if (spaces.length === 0) return null;
    const qp = new URLSearchParams({ src: "quote", ms: String(spaces.length) });
    spaces.forEach((sp, i) => {
      qp.set(`s${i}`, sp.spaceName);
      qp.set(`p${i}`, sp.productCode);
      // Carry the ORIGINAL measurement method so editing restores it exactly:
      // L×A → w/h (plates recompute); m² → a (area). Fall back to plates for
      // legacy quotes saved before the method was stored.
      const method = sp.measurementType ?? (sp.width != null && sp.height != null ? "dimensions" : null);
      if (method === "dimensions" && sp.width != null && sp.height != null) {
        qp.set(`mt${i}`, "dimensions");
        qp.set(`w${i}`, String(sp.width));
        qp.set(`h${i}`, String(sp.height));
      } else if (method === "square_meters" && (sp.squareMeters != null || sp.area != null)) {
        qp.set(`mt${i}`, "square_meters");
        qp.set(`a${i}`, String(sp.squareMeters ?? sp.area));
      } else {
        qp.set(`pl${i}`, String(sp.plates));
      }
    });
    if (quote.coupon_code) qp.set("cupom", quote.coupon_code);
    // edit=<slug> makes the simulador UPDATE this same quote in place (no new
    // orçamento); goto lands the client on the step they chose to change.
    if (quote.slug) qp.set("edit", quote.slug);
    if (goto) qp.set("goto", goto);
    return `/simulador?${qp.toString()}`;
  };
  const editUrl = editUrlWith();

  return (
    <div className="min-h-screen bg-[#f0efec]">

      {/* Header */}
      <header className="bg-[#002045] px-6 sm:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/images/logo.png" alt="Orbital" width={100} height={28} className="brightness-0 invert" />
        </div>
        <p className="text-[#86a0cd] text-[10px] tracking-[0.18em] uppercase font-[var(--font-inter)] hidden sm:block">
          Revestimentos Premium · Manaus
        </p>
      </header>

      {/* Hero */}
      <div ref={heroRef} className="bg-[#002045] px-6 sm:px-10 pb-12 pt-2">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#86a0cd] text-[10px] tracking-[0.2em] uppercase font-[var(--font-inter)] mb-2">Orçamento personalizado</p>
          <h1 className="font-[var(--font-noto-serif)] text-white text-3xl sm:text-4xl font-normal leading-tight mb-4">
            Seu projeto em PFB
          </h1>
          {quote.partner_name && (
            <p className="text-[#86a0cd] text-sm font-[var(--font-inter)]">
              Elaborado por <span className="text-white font-medium">{quote.partner_name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 pb-24">

        {/* Expiry + summary card */}
        <div className="bg-white border border-[#e2e2e2] p-5 sm:p-7 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${days <= 1 ? "bg-red-400" : days <= 3 ? "bg-yellow-400" : "bg-green-400"}`} />
            <p className="text-[#43474e] text-sm font-[var(--font-inter)]">
              {days === 0
                ? "Expira hoje"
                : days === 1
                ? "Expira amanhã"
                : `Válido por mais ${days} dias`}
              <span className="text-[#74777f] ml-1">
                · {new Date(quote.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs font-[var(--font-inter)] text-[#74777f]">
            <span><span className="text-[#002045] font-bold text-base">{(quote.total_plates ?? 0)}</span> placas</span>
            <span><span className="text-[#002045] font-bold text-base">{fmtDec(quote.total_area_m2 ?? 0)}</span> m²</span>
            <span><span className="text-[#002045] font-bold text-base">{quote.spaces?.length ?? 0}</span> {quote.spaces?.length === 1 ? "ambiente" : "ambientes"}</span>
          </div>
        </div>

        {/* Space cards */}
        <div className="space-y-4 mb-6">
          {(quote.spaces ?? []).map((sp, i) => {
            const lc = LINE_COLOR(sp.linha);
            return (
              <div key={i} className="bg-white border border-[#e2e2e2] overflow-hidden">
                <div className="flex">
                  {/* Product image */}
                  <div className="w-24 sm:w-32 flex-shrink-0 relative bg-[#f5f5f5]">
                    <Image
                      src={sp.productImg}
                      alt={sp.productName}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                  {/* Details */}
                  <div className="flex-1 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[#002045] font-[var(--font-noto-serif)] text-base sm:text-lg font-normal leading-snug">{sp.spaceName}</p>
                        <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{sp.productName}</p>
                      </div>
                      <span className={`text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] px-2 py-1 flex-shrink-0 ${lc.bg} ${lc.text}`}>
                        {sp.linha}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#74777f] font-[var(--font-inter)] flex-wrap">
                      {sp.dimLabel && sp.dimLabel.includes("×") && (
                        <>
                          <span>{sp.dimLabel}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{fmtDec(sp.area)} m²</span>
                      <span>·</span>
                      <span>{sp.plates} {sp.plates === 1 ? "placa" : "placas"}</span>
                      <span>·</span>
                      <span className="text-[#002045] font-semibold text-sm">{fmt(sp.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total + composição (placas · Cola PU · frete) */}
        <div className="bg-[#002045] p-6 sm:p-8 mb-6">
          {/* Composição do investimento */}
          {pricing && (
            <div className="mb-5 border-b border-white/15 pb-4 space-y-2">
              <div className="flex items-center justify-between text-[13px] font-[var(--font-inter)]">
                <span className="text-[#86a0cd]">Placas ({pricing.plates})</span>
                <span className="text-white font-semibold">{fmt(pricing.platesSubtotal)}</span>
              </div>
              {pricing.colaAvailable && pricing.colaTubos > 0 && (
                <div className="flex items-center justify-between text-[13px] font-[var(--font-inter)]">
                  <span className="text-[#86a0cd]">Cola PU ({pricing.colaTubos} tubo{pricing.colaTubos !== 1 ? "s" : ""})</span>
                  <span className="text-white font-semibold">{fmt(pricing.colaSubtotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[13px] font-[var(--font-inter)]">
                <span className="text-[#86a0cd]">Frete</span>
                <span className={`font-semibold ${pricing.frete.free ? "text-[#5eead4]" : "text-white"}`}>{pricing.frete.free ? "Grátis" : fmt(pricing.frete.value)}{pricing.frete.estimated && !pricing.frete.free ? "*" : ""}</span>
              </div>
            </div>
          )}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[#86a0cd] text-[10px] tracking-[0.2em] uppercase font-[var(--font-inter)] mb-1">
                {isDiscounted && quote.coupon_code ? `Com cupom ${quote.coupon_code}` : "Total do projeto"}
              </p>
              <p className="font-[var(--font-noto-serif)] text-white text-3xl sm:text-4xl font-normal">
                {fmt(pricing ? pricing.totalFull : finalValue)}
              </p>
              {isDiscounted && (
                <p className="text-[#86a0cd] text-xs font-[var(--font-inter)] mt-1 line-through">
                  {fmt(quote.material_total ?? 0)}
                </p>
              )}
            </div>
            {isDiscounted && savings > 0 && (
              <div className="text-right">
                <p className="text-[#5eead4] text-[10px] tracking-[0.15em] uppercase font-[var(--font-inter)] mb-0.5">Economia</p>
                <p className="text-[#5eead4] font-[var(--font-noto-serif)] text-xl font-normal">{fmt(savings)}</p>
              </div>
            )}
          </div>
          <div className="border-t border-white/15 mt-4 pt-3">
            <p className="text-white text-xs font-bold font-[var(--font-inter)]">
              {pricing ? "Inclui placas, Cola PU e frete estimado." : "⚠ Este valor é apenas do material."}
              {pricing?.frete.estimated && !pricing?.frete.free ? " (*frete estimado — confirmado pelo CEP na formalização)" : ""}
            </p>
            <p className="text-[#86a0cd] text-[10px] font-[var(--font-inter)] mt-1 leading-relaxed">
              A instalação não está incluída e é contratada separadamente, por conta do cliente (a Orbital pode indicar instaladores habilitados — veja abaixo).
            </p>
          </div>
        </div>

        {/* Mão de obra — same collapsible box as the simulador's own result
            step, so a client returning via this saved link later (not just
            right after the quote was made) can still see the installation
            explainer and reach the installation partner. Closed by default,
            no fixed price shown (varies per project). */}
        <div className="bg-[#a1d494] mb-6">
          <button
            type="button"
            onClick={() => setShowMoInfo((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-[#002045] text-sm font-bold font-[var(--font-inter)]">
              Precisa de instalação? <span className="font-normal">(opcional, não incluso)</span>
            </span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="2.5"
              className={`flex-shrink-0 transition-transform duration-200 ${showMoInfo ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showMoInfo && (
            <div className="bg-[#0a1f3d] px-4 py-4 space-y-3">
              <p className="text-white/70 text-[11px] font-[var(--font-inter)] leading-relaxed">
                Orbital é fornecedora do painel — não realizamos instalação e o valor acima é só do material.
                Quem indicamos para instalações é uma empresa terceirizada que detém equipes especializadas e
                que já aplicou os painéis Orbital em diversos projetos e conhece bem o produto. O custo da
                instalação varia por projeto, então não temos um preço fixo para mostrar aqui — fale direto
                com o responsável para um orçamento.
              </p>
              <a
                href={`${WERK_ENGENHARIA_WA_BASE}${werkssonMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25d366] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:brightness-95 transition"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Falar sobre instalação no WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="space-y-3 mb-8">
          <a
            href={`https://wa.me/559288150149?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-[#25d366] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#1ebe5d] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Quero avançar com este projeto
          </a>

          {partnerWaPhone && (
            <a
              href={`https://wa.me/${partnerWaPhone}?text=${partnerWaMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#002045] hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Falar com {quote.partner_name ?? "o parceiro"} sobre a instalação
            </a>
          )}

          {editUrl && (
            <div className="border border-[#e2e2e2] p-4">
              <p className="text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1">Editar este orçamento</p>
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-3">Seus dados já estão salvos — é só ajustar o que quiser. As alterações atualizam este mesmo orçamento.</p>
              <div className="grid gap-2">
                <a href={editUrlWith("dimensoes")!} className="flex items-center gap-2.5 w-full px-3 py-2.5 border border-[#e2e2e2] text-[#43474e] text-sm font-[var(--font-inter)] hover:border-[#002045] hover:text-[#002045] transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 3L3 21M9 3H3v6M21 15v6h-6"/></svg>
                  Ajustar dimensões (largura / altura)
                </a>
                <a href={editUrlWith("modelo")!} className="flex items-center gap-2.5 w-full px-3 py-2.5 border border-[#e2e2e2] text-[#43474e] text-sm font-[var(--font-inter)] hover:border-[#002045] hover:text-[#002045] transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  Trocar o modelo do revestimento
                </a>
                <a href={editUrl} className="flex items-center gap-2.5 w-full px-3 py-2.5 border border-[#e2e2e2] text-[#43474e] text-sm font-[var(--font-inter)] hover:border-[#002045] hover:text-[#002045] transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  Adicionar ambiente / revisar tudo
                </a>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="flex items-center justify-center gap-2 w-full py-3 border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#002045] hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Link copiado!
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copiar link deste orçamento
              </>
            )}
          </button>
        </div>

        {/* Product info strip */}
        <div className="border-t border-[#e2e2e2] pt-8">
          <p className="text-[#74777f] text-[10px] tracking-[0.2em] uppercase font-[var(--font-inter)] mb-4">Por que PFB Orbital?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "💧", label: "Absorção 0,2%", sub: "vs 35% do MDF" },
              { icon: "🛡️", label: "10+ anos", sub: "de durabilidade" },
              { icon: "✅", label: "ART/CREA", sub: "aprovado" },
              { icon: "⚡", label: "2–3 horas", sub: "por cômodo" },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-[#e2e2e2] p-3 text-center">
                <p className="text-lg mb-1">{item.icon}</p>
                <p className="text-[#002045] text-xs font-bold font-[var(--font-inter)]">{item.label}</p>
                <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical comparison — same table shown at the end of the simulador
            flow; a client returning via this saved link should still be able
            to see how PFB stacks up against MDF/papel/forro/tinta. */}
        <div className="bg-white border border-[#e2e2e2] mt-8">
          <div className="px-6 lg:px-8 pt-6 pb-2 border-b border-[#e2e2e2]">
            <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-0.5">
              PFB Orbital vs. outros materiais
            </p>
            <p className="text-[#74777f] text-xs font-[var(--font-inter)]">
              Selecione o material para comparar tecnicamente
            </p>
          </div>
          <div className="px-6 lg:px-8 py-6 lg:py-8">
            <MdfComparison />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-[#e2e2e2] text-center">
          <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">
            Orbital Revestimentos · Manaus, AM · WhatsApp (92) 98815-0149
          </p>
          <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-1">
            Orçamento gerado em {new Date(quote.created_at).toLocaleDateString("pt-BR")} · Ref. {quote.slug}
          </p>
        </div>
      </div>
    </div>
  );
}
