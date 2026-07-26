"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import MdfComparison from "@/components/MdfComparison";
import { firstName } from "@/lib/name";

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
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  expires_at: string;
  created_at: string;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
// Parcela com centavos exatos (R$ 512,67, nunca arredondar para 513).
function fmtParcela(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "cartao" | null>(null);
  // Fluxo de formalização (mesma ideia do simulador): confere dados + endereço → PDF.
  const [fzOpen, setFzOpen] = useState(false);
  const [fzName, setFzName] = useState("");
  const [fzPhone, setFzPhone] = useState("");
  const [fzEmail, setFzEmail] = useState("");
  const [fzZip, setFzZip] = useState("");
  const [fzStreet, setFzStreet] = useState("");
  const [fzNumber, setFzNumber] = useState("");
  const [fzComplement, setFzComplement] = useState("");
  const [fzNeighborhood, setFzNeighborhood] = useState("");
  const [fzCity, setFzCity] = useState("");
  const [fzState, setFzState] = useState("");
  const [fzCepLoading, setFzCepLoading] = useState(false);
  const [fzCepError, setFzCepError] = useState("");
  const [fzSubmitting, setFzSubmitting] = useState(false);
  const [fzResult, setFzResult] = useState<{ formalNumber: string; pdfUrl: string; whatsappOk: boolean; emailOk: boolean } | null>(null);
  const [fzError, setFzError] = useState("");
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
        setFzName(data.client_name ?? "");
        setFzPhone(data.client_phone ?? "");
        setFzEmail(data.client_email ?? "");
        // Composição autoritativa (placas + Cola PU + frete + pagamento) do motor.
        const plates = data.total_plates ?? (data.spaces ?? []).reduce((s: number, sp) => s + (sp.plates || 0), 0);
        const subtotal = data.material_discounted ?? data.material_total ?? 0;
        if (plates > 0) {
          fetch("/api/orcamento/pricing", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plates, pricePerPlate: subtotal / plates }),
          }).then((r) => (r.ok ? r.json() : null)).then((b) => {
            if (b) { setPricing(b); setSelectedPayment(b.paymentOptions.find((o: { id: string }) => o.id === "pix") ? "pix" : (b.paymentOptions[0]?.id ?? null)); }
          }).catch(() => {});
        }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setFzCepLoading(true); setFzCepError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json().catch(() => null);
      if (!data || data.erro) { setFzCepError("CEP não encontrado. Preencha manualmente."); return; }
      if (data.logradouro) setFzStreet((p) => p || data.logradouro);
      if (data.bairro) setFzNeighborhood((p) => p || data.bairro);
      if (data.localidade) setFzCity((p) => p || data.localidade);
      if (data.uf) setFzState((p) => p || data.uf);
    } catch { setFzCepError("Não foi possível consultar o CEP. Preencha manualmente."); }
    finally { setFzCepLoading(false); }
  }

  async function submitFormalize() {
    if (!slug) return;
    if (!fzStreet.trim() || !fzNumber.trim() || !fzCity.trim()) { setFzError("Informe rua, número e cidade."); return; }
    setFzSubmitting(true); setFzError("");
    try {
      // Persiste dados do cliente se editados (o formalize lê do banco por slug).
      if (quote && (fzName !== (quote.client_name ?? "") || fzPhone !== (quote.client_phone ?? "") || fzEmail !== (quote.client_email ?? ""))) {
        await fetch(`/api/quotes/${slug}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_name: fzName || null, client_phone: fzPhone || null, client_email: fzEmail || null }),
        }).catch(() => {});
      }
      const res = await fetch("/api/orcamento/formalize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, payment_condition: selectedPayment ?? "pix",
          address: { zip: fzZip, street: fzStreet, number: fzNumber, complement: fzComplement, neighborhood: fzNeighborhood, city: fzCity, state: fzState },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setFzError(data?.error ?? "Falha ao gerar o orçamento."); return; }
      setFzResult({ formalNumber: data.formalNumber, pdfUrl: data.pdfUrl, whatsappOk: data.whatsappOk, emailOk: data.emailOk });
    } catch (e) { setFzError(e instanceof Error ? e.message : "Erro de rede."); }
    finally { setFzSubmitting(false); }
  }

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
      `Olá! Tenho interesse em avançar com o meu orçamento Orbital.`,
      ``,
      `Referência: orbitalrevestimentos.com.br/orcamento/${quote.slug}`,
      ``,
      `Ambientes:`,
      ...(quote.spaces ?? []).map((sp) => `• ${sp.spaceName} — ${sp.productName} (${sp.plates} ${sp.plates === 1 ? "placa" : "placas"})`),
      ``,
      `Total: ${fmt(pricing ? pricing.totalFull : finalValue)}`,
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
            {firstName(quote.client_name) ? `${firstName(quote.client_name)}, seu projeto em Fibra de Bambu:` : "Seu projeto em Fibra de Bambu:"}
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

        {/* Condições de pagamento — calculadas pela quantidade de placas */}
        {pricing && (
          <div className="mb-6">
            <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">Condições de pagamento</p>
            {pricing.paymentOptions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pricing.paymentOptions.map((opt) => {
                    const active = selectedPayment === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedPayment(opt.id)}
                        aria-pressed={active}
                        className={`text-left px-4 py-3.5 border transition-colors ${active ? "border-[#002045] bg-[#eef2fb] ring-1 ring-[#002045]" : "border-[#e2e2e2] bg-white hover:border-[#86a0cd]"}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[#43474e] text-[11px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)]">{opt.label}</span>
                          <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? "border-[#002045] bg-[#002045]" : "border-[#c4c4c4]"}`}>
                            {active && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                          </span>
                        </div>
                        {opt.id === "cartao" ? (
                          <>
                            <p className="text-[#002045] text-xl sm:text-2xl font-bold font-[var(--font-noto-serif)] leading-none">{opt.installments}x de {fmtParcela(opt.installmentValue ?? 0)}</p>
                            <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-1.5">sem juros · total {fmt(opt.total)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[#002045] text-xl sm:text-2xl font-bold font-[var(--font-noto-serif)] leading-none">{fmt(opt.total)}</p>
                            <p className="text-[#3b6934] text-[11px] font-semibold font-[var(--font-inter)] mt-1.5">à vista · {opt.discountPct}% off (economize {fmt(opt.discountAmount ?? 0)})</p>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[#74777f] text-[13px] font-[var(--font-inter)]">Condições especiais de pagamento disponíveis a partir de 2 placas. Fale com a gente para as condições desta compra.</p>
            )}

            {/* Botão secundário — solicitar PDF formalizado */}
            <button
              type="button"
              onClick={() => { setFzResult(null); setFzError(""); setFzOpen(true); }}
              className="mt-4 w-full border-2 border-[#002045] text-[#002045] text-xs tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-6 py-3.5 hover:bg-[#002045] hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
              Solicitar orçamento formal em PDF
            </button>
            <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] text-center mt-1.5">Receba o orçamento formal completo pelo WhatsApp.</p>
          </div>
        )}

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

        {/* Por que escolher a Fibra de Bambu — mobile-first, foco em benefício */}
        <div className="border-t border-[#e2e2e2] pt-8">
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl sm:text-2xl font-normal leading-snug mb-2">
            Por que escolher a Fibra de Bambu da Orbital?
          </h2>
          <p className="text-[#5b5f68] text-[13px] sm:text-sm font-[var(--font-inter)] leading-relaxed mb-5 max-w-xl">
            Um revestimento desenvolvido para unir resistência, instalação rápida e acabamento premium — inclusive no clima quente e úmido de Manaus.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                title: "Resistente à água e à umidade",
                benefit: "Não estufa nem deforma",
                desc: "Pode ser usada em cozinhas, lavabos e banheiros, seguindo a instalação correta.",
                icon: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
              },
              {
                title: "Instalação rápida, sem quebra-quebra",
                benefit: "Ambientes renovados em poucas horas",
                desc: "Aplicada sobre diversas superfícies, reduz sujeira, entulho e tempo de obra.",
                icon: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
              },
              {
                title: "Acabamento premium, menos emendas",
                benefit: "Placas de 1,20 × 2,90 m",
                desc: "O grande formato cobre quase toda a parede — resultado contínuo e sofisticado.",
                icon: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18M9 3v18" /></>,
              },
              {
                title: "Ideal para o clima de Manaus",
                benefit: "Resistente à umidade, mofo e cupins",
                desc: "Mais adequada a regiões quentes e úmidas do que materiais que absorvem água.",
                icon: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
              },
            ].map((b) => (
              <div key={b.title} className="bg-white border border-[#e2e2e2] p-3.5 sm:p-4 flex flex-col">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mb-2.5 flex-shrink-0">{b.icon}</svg>
                <p className="text-[#002045] text-[13px] sm:text-sm font-bold font-[var(--font-inter)] leading-tight">{b.title}</p>
                <p className="text-[#3b6934] text-[11px] sm:text-xs font-semibold font-[var(--font-inter)] mt-1">{b.benefit}</p>
                <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] leading-snug mt-1.5">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Benefícios complementares — lista compacta expansível (sem cards pesados) */}
          <details className="mt-4 group">
            <summary className="cursor-pointer list-none flex items-center gap-1.5 text-[#002045] text-[11px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-open:rotate-90"><path d="M9 18l6-6-6-6" /></svg>
              Mais benefícios
            </summary>
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                "Não propaga chamas",
                "Leve e fácil de transportar",
                "Instalação com pouca sujeira",
                "Recorte simples",
                "Aplicação em paredes, tetos e portas",
                "Acabamento fotorrealista",
                "Menor necessidade de manutenção",
                "Transformação rápida, sem reforma convencional",
                "Pronta entrega em Manaus",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[#43474e] text-[12px] font-[var(--font-inter)]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b6934" strokeWidth="2.5" className="mt-0.5 flex-shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
                  {t}
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* Technical comparison — same table shown at the end of the simulador
            flow; a client returning via this saved link should still be able
            to see how PFB stacks up against MDF/papel/forro/tinta. */}
        <div className="bg-white border border-[#e2e2e2] mt-8">
          <div className="px-6 lg:px-8 pt-6 pb-2 border-b border-[#e2e2e2]">
            <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-0.5">
              Fibra de Bambu Orbital vs. outros materiais
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

      {/* Formalização — confere dados + endereço → PDF via WhatsApp */}
      {fzOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { if (!fzSubmitting) setFzOpen(false); }}>
          <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#002045] px-5 py-4 flex items-center justify-between z-10">
              <p className="text-white font-[var(--font-noto-serif)] text-base">{fzResult ? "Orçamento formalizado" : "Solicitar orçamento formal"}</p>
              <button onClick={() => { if (!fzSubmitting) setFzOpen(false); }} className="text-white/70 hover:text-white" aria-label="Fechar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {fzResult ? (
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[#f0f9eb] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b6934" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  </span>
                  <div>
                    <p className="text-[#002045] text-sm font-bold font-[var(--font-inter)]">Orçamento enviado com sucesso.</p>
                    <p className="text-[#74777f] text-[12px] font-[var(--font-inter)]">Nº {fzResult.formalNumber}</p>
                  </div>
                </div>
                <p className="text-[#43474e] text-[13px] font-[var(--font-inter)] leading-relaxed">
                  {fzResult.whatsappOk ? `Enviamos o PDF para o seu WhatsApp${fzPhone ? ` final ${fzPhone.replace(/\D/g, "").slice(-4)}` : ""}.` : "Seu orçamento foi gerado. O PDF está disponível abaixo."}
                  {fzResult.emailOk && fzEmail ? ` Também enviamos uma cópia para ${fzEmail}.` : ""}
                </p>
                <a href={fzResult.pdfUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-[#002045] hover:bg-[#1a365d] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 transition-colors">Visualizar / baixar PDF</a>
                <button onClick={() => { setFzResult(null); void submitFormalize(); }} disabled={fzSubmitting} className="w-full text-center border border-[#e2e2e2] text-[#002045] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] px-5 py-3 hover:border-[#002045] transition-colors disabled:opacity-50">{fzSubmitting ? "Reenviando…" : "Reenviar"}</button>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-5">
                <div>
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">Confirme seus dados</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={fzName} onChange={(e) => setFzName(e.target.value)} placeholder="Nome completo" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzPhone} onChange={(e) => setFzPhone(e.target.value)} placeholder="WhatsApp" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzEmail} onChange={(e) => setFzEmail(e.target.value)} placeholder="E-mail" className="sm:col-span-2 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                  </div>
                  {pricing && pricing.paymentOptions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mb-1.5">Condição de pagamento</p>
                      <div className="flex flex-wrap gap-2">
                        {pricing.paymentOptions.map((opt) => (
                          <button key={opt.id} type="button" onClick={() => setSelectedPayment(opt.id)} className={`px-3 py-1.5 text-[12px] font-semibold font-[var(--font-inter)] border transition-colors ${selectedPayment === opt.id ? "border-[#002045] bg-[#eef2fb] text-[#002045]" : "border-[#e2e2e2] text-[#74777f] hover:border-[#86a0cd]"}`}>
                            {opt.label} · {fmt(opt.total)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">Endereço de entrega</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <input value={fzZip} onChange={(e) => setFzZip(e.target.value)} onBlur={(e) => void lookupCep(e.target.value)} placeholder="CEP" inputMode="numeric" className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      {fzCepLoading && <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1">Consultando…</p>}
                      {fzCepError && <p className="text-[#a07a00] text-[10px] font-[var(--font-inter)] mt-1">{fzCepError}</p>}
                    </div>
                    <input value={fzStreet} onChange={(e) => setFzStreet(e.target.value)} placeholder="Rua / Avenida" className="sm:col-span-2 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzNumber} onChange={(e) => setFzNumber(e.target.value)} placeholder="Número *" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzComplement} onChange={(e) => setFzComplement(e.target.value)} placeholder="Complemento" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzNeighborhood} onChange={(e) => setFzNeighborhood(e.target.value)} placeholder="Bairro" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzCity} onChange={(e) => setFzCity(e.target.value)} placeholder="Cidade" className="sm:col-span-2 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzState} onChange={(e) => setFzState(e.target.value)} placeholder="UF" maxLength={2} className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] uppercase focus:outline-none focus:border-[#002045]" />
                  </div>
                </div>
                {fzError && <p className="text-[#cc0000] text-[12px] font-[var(--font-inter)]">{fzError}</p>}
                <button type="button" onClick={() => void submitFormalize()} disabled={fzSubmitting} className="w-full bg-[#3b6934] hover:bg-[#2e5229] text-white text-sm tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 transition-colors disabled:opacity-60">
                  {fzSubmitting ? "Gerando…" : "Gerar e enviar orçamento"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
