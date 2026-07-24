"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MdfComparison, { COMPARISON_OPTIONS } from "@/components/MdfComparison";
import VisualizadorWizard, { type SimPrefill } from "@/components/VisualizadorWizard";
import { panelGrid } from "@/lib/render-prompt";
import type { OrcamentoBreakdown } from "@/lib/orcamento-pricing";
import { trackFunnel } from "@/lib/funnel";

const WA_BASE = "https://wa.me/5592988150149?text=";
// Werk Engenharia — terceirizado de instalação. Mão de obra é apenas
// estimativa e não é cobrada/processada pela Orbital; o contato direto evita
// que o cliente pense que a Orbital realiza ou fatura a instalação.
const WERK_ENGENHARIA_WA_BASE = "https://wa.me/5592993974821?text=";
const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";
const PLATE_M2 = 3.48;
const PLATE_W = 1.2;
const PLATE_H = 2.9;

function orbitalPlatesForDimensions(widthM: number, heightM: number): number {
  if (!Number.isFinite(widthM) || !Number.isFinite(heightM) || widthM <= 0 || heightM <= 0) return 0;
  return panelGrid(widthM, heightM, PLATE_W, PLATE_H).count;
}

const MDF_SHEET_W = 1.85;
const MDF_SHEET_H = 2.75;
const MDF_SHEET_M2 = MDF_SHEET_W * MDF_SHEET_H;
// MDF — mercado Manaus 2025 (COMPLAC e fornecedores locais; chapa 15mm revestida 1,85×2,75m)
const MDF_SHEET_PRICE = 415;      // R$/chapa — preço Manaus (15–25% acima do Sul/SE por logística)
const MDF_MO_SIMPLE = 40;         // R$/m² MO simples — marceneiro Manaus ~R$150/h (GetNinjas AM)
const MDF_MO_COMPLEX = 60;        // R$/m² MO complexo
const MDF_ACABAMENTO = 28;        // R$/m² primer + tinta / acabamento local Manaus

// Forro PVC amadeirado boa qualidade — Manaus 2025 (painéis acima do padrão básico)
const FORRO_M2_MATERIAL = 55;     // R$/m² painéis amadeirados boa qualidade (acima do R$48 "a partir" local)
const FORRO_M2_STRUCTURE = 10;    // R$/m² metalon galvanizado (Metalúrgica Marlin Manaus)
const FORRO_MO_SIMPLE = 27;       // R$/m² MO (Habitissimo/Cronoshare Manaus)
const FORRO_MO_COMPLEX = 38;      // R$/m² MO complexo
const FORRO_ACABAMENTO = 5;       // R$/m² perfil roda-forro U (Casa da Madeira AM ~R$5,40/barra)
const FORRO_INSTALLS_10Y = 1;     // vida útil ~12 anos → 1 instalação em 10 anos

// Teto Laminado amadeirado — Mercatto Decor Manaus (a partir R$99/m², boa qualidade ~R$120/m²)
const TETO_M2_MATERIAL = 120;     // R$/m² teto laminado amadeirado boa qualidade (Mercatto Decor Manaus)
const TETO_M2_STRUCTURE = 12;     // R$/m² subestrutura metálica Manaus
const TETO_MO_SIMPLE = 45;        // R$/m² MO Manaus
const TETO_MO_COMPLEX = 62;       // R$/m² MO complexo
const TETO_ACABAMENTO = 13;       // R$/m² acabamento / moldura
const TETO_INSTALLS_10Y = 1;      // 1 ciclo em 10 anos (conforme instrução)
const MDF_INSTALLS_10Y = 3;

// Unidades de venda — para calcular por régua/prancha como PFB calcula por placa
const FORRO_PLANK_M2 = 1.2;       // régua PVC 20cm × 6m = 1,2m² por régua
const FORRO_WASTE = 1.10;         // 10% desperdício de corte
const TETO_BOARD_M2 = 0.6;        // prancha teto laminado 20cm × 3m = 0,6m²
const TETO_WASTE = 1.10;

function orbitalMOPerPlate(plates: number, complex: boolean) {
  return plates > 10 ? (complex ? 150 : 130) : (complex ? 175 : 150);
}

/**
 * Compute the number of MDF sheets needed for a given space.
 * When dimLabel contains explicit "Wm × Hm" dimensions, uses the exact
 * sheet-grid calculation (same logic as the active space with lxa mode).
 * Falls back to area-based rounding otherwise.
 */
function mdfSheetsForSpace(m2: number, dimLabel: string): number {
  // Try to parse "12.19m × 2.59m" (or "12,19m × 2,59m") from dimLabel
  const match = dimLabel.match(/^([\d.,]+)\s*m\s*[×x]\s*([\d.,]+)\s*m/i);
  if (match) {
    const wParsed = parseFloat(match[1].replace(",", "."));
    const hParsed = parseFloat(match[2].replace(",", "."));
    if (wParsed > 0 && hParsed > 0) {
      return Math.ceil(wParsed / MDF_SHEET_W) * Math.ceil(hParsed / MDF_SHEET_H);
    }
  }
  return m2 > 0 ? Math.ceil(m2 / MDF_SHEET_M2) : 0;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "decimal",
    maximumFractionDigits: 0,
  });
}

type ProductLine = "Classic" | "Brilliance" | "Elegance";
type SpaceViability = "simple" | "complex" | "no";

interface Product {
  id: string;
  code: string;
  name: string;
  linha: ProductLine;
  finish: string;
  price: number;
  price_per_m2: number;
  description: string;
  image_path: string;
  is_active: boolean;
  sort_order: number;
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
  source?: string;
}

interface SavedSpace {
  key: string;
  label: string;
  productName: string;
  productCode: string;
  imagePath: string;
  linha: string;
  dimLabel: string;
  m2: number;
  plates: number;
  pricePerPlate: number;
  materialTotal: number;
  materialDiscounted: number;
  moTotal: number;
  total: number;
  viability: "simple" | "complex";
  // How the client entered the measurement — preserved so editing a saved
  // quote restores the SAME method + values (never converts L×A into m²).
  measurementType: "dimensions" | "square_meters";
  width: number | null;
  height: number | null;
  squareMeters: number | null;
}

const LINE_INFO: Record<ProductLine, { finish: string; price: number; cover: string }> = {
  Classic:    { finish: "Mármore Fosco",       price: 559, cover: "/images/catalogue/classic-branco-calacatta-orb006.jpeg" },
  Brilliance: { finish: "Mármore Polido",      price: 589, cover: "/images/catalogue/brilliance-calacatta-oro-orb013.jpeg" },
  Elegance:   { finish: "Madeira Texturizada", price: 649, cover: "/images/catalogue/elegance-carvalho-natural-orb010.jpeg" },
};


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

// ── Custom-space classifier ──────────────────────────────────────────────────
type CustomClassification =
  | { viability: "simple" | "complex"; label: string }
  | { viability: "no"; label: string; msg: string; hint: string; redirect: string };

function classifyCustomSpace(raw: string): CustomClassification | null {
  if (!raw.trim()) return null;
  const t = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // — Forbidden: things we definitely don't do —
  if (/\b(piso|chao|chão|floor|pavimento|ceramica|ceramico|porcelanato|deck de piso)\b/.test(t)) {
    return { viability: "no", label: raw.trim(), msg: "O PFB Orbital não é indicado para pisos — não é projetado para suportar pisadas.", hint: "As paredes e o teto do mesmo ambiente ficam extraordinários. Quer simular para a parede?", redirect: "parede" };
  }
  if (/\b(fachada externa|exterior|area externa|parede externa|jardim|varanda externa|sacada externa|ao ar livre)\b/.test(t)) {
    return { viability: "no", label: raw.trim(), msg: "O PFB Orbital é exclusivo para interiores — não certificado para exposição direta à chuva.", hint: "Para hall de entrada, recepção ou sala de frente, o resultado é excepcional.", redirect: "sala" };
  }
  if (/\b(ripado|ripa|reglet|lamela|caixotao|caixotão)\b/.test(t)) {
    return { viability: "no", label: raw.trim(), msg: "O PFB Orbital é uma placa plana — não produzimos ripados ou perfis recortados.", hint: "Para um painel de parede ou forro liso com o mesmo efeito visual, o PFB fica excelente.", redirect: "parede" };
  }
  if (/\b(piscina|area molhada externa|spa externo|sauna externa)\b/.test(t)) {
    return { viability: "no", label: raw.trim(), msg: "O PFB Orbital não é indicado para áreas imersas ou de exposição direta à água.", hint: "Para o ambiente ao redor — vestiário, corredor ou sala de relaxamento — fica perfeito.", redirect: "parede" };
  }
  if (/\b(telhado|teto externo|cobertura)\b/.test(t)) {
    return { viability: "no", label: raw.trim(), msg: "O PFB Orbital é para ambientes internos — não é certificado para cobertura ou telhado externo.", hint: "Para o forro interno logo abaixo do telhado, o PFB é ótima opção.", redirect: "teto" };
  }

  // — Complex: muitos cortes, curvas, geometria irregular —
  if (/\b(curvo|curva|curvado|arco|abobada|abóbada|cilindrico|cilíndrico|esfera|ovalado)\b/.test(t) ||
      /\b(banheiro de barco|lavabo curvo|nicho curvo|coluna)\b/.test(t)) {
    return { viability: "complex", label: raw.trim() };
  }
  if (/\b(escada|degrau|espiral)\b/.test(t)) {
    return { viability: "complex", label: raw.trim() };
  }
  if (/\b(nicho|recuo|recesso|rebaixo|sanca|trapezio|trapezoidal|irregular|recortado)\b/.test(t)) {
    return { viability: "complex", label: raw.trim() };
  }
  if (/\b(pilar|pilastro|coluna|cantoneira)\b/.test(t)) {
    return { viability: "complex", label: raw.trim() };
  }
  // spaces known to be complex even without modifiers
  if (/\b(banheiro|lavabo|box|ducha|chuveiro|cozinha|roda.pia|roda.banca|porta|movel|marcenaria|balcao|bancada)\b/.test(t)) {
    return { viability: "complex", label: raw.trim() };
  }

  // — Simple: straight walls, regular rooms —
  return { viability: "simple", label: raw.trim() };
}

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

function SimuladorInner() {
  const searchParams = useSearchParams();
  const simulatorRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const stepCardRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [customSpaceText, setCustomSpaceText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ProductLine | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dimMode, setDimMode] = useState<"lxa" | "m2">("lxa");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [sqmInput, setSqmInput] = useState("");
  const [ambienteName, setAmbienteName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  // Abandoned-simulador recovery (Feature 6): stable id for this visit + the
  // last phone we captured, so we re-capture only when the number changes.
  const simSessionId = useRef<string>("");
  // Render-session id handed over by the Visualizador (?viz_render=…). Carried
  // into the orçamento submit so the saved renders get e-mailed/WhatsApp'd and
  // shown in admin.
  const vizRenderId = useRef<string>("");
  const lastCapturedPhoneRef = useRef("");
  // Guards the ?produto= pre-select effect below so it only ever applies once.
  // Without this, if the effect's deps (products/searchParams) get a new
  // reference for any reason after the client has manually picked a
  // different model, it silently overwrites that choice back to the URL's
  // original product — sending the wrong model through to the quote/email.
  const produtoParamAppliedRef = useRef(false);
  const [simSubmitting, setSimSubmitting] = useState(false);
  const [simSubmitted, setSimSubmitted] = useState(false);
  // Authoritative investment breakdown (placas + Cola PU + frete + pagamento)
  // from the central engine via /api/orcamento/pricing.
  const [pricing, setPricing] = useState<OrcamentoBreakdown | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "cartao" | null>(null);
  // Formalization flow (address + CEP → PDF via WhatsApp). Opened by the primary
  // CTA on the result page. See handleFormalize.
  const [formalizeOpen, setFormalizeOpen] = useState(false);
  const [savedQuoteSlug, setSavedQuoteSlug] = useState<string | null>(null);
  const [fzZip, setFzZip] = useState("");
  const [fzStreet, setFzStreet] = useState("");
  const [fzNumber, setFzNumber] = useState("");
  const [fzComplement, setFzComplement] = useState("");
  const [fzNeighborhood, setFzNeighborhood] = useState("");
  const [fzCity, setFzCity] = useState("");
  const [fzState, setFzState] = useState("");
  const [fzCondo, setFzCondo] = useState("");
  const [fzNotes, setFzNotes] = useState("");
  const [fzCepLoading, setFzCepLoading] = useState(false);
  const [fzCepError, setFzCepError] = useState("");
  const [fzSubmitting, setFzSubmitting] = useState(false);
  const [fzResult, setFzResult] = useState<{ formalNumber: string; pdfUrl: string; whatsappOk: boolean; emailOk: boolean } | null>(null);
  const [fzError, setFzError] = useState("");
  const [quoteShareUrl, setQuoteShareUrl] = useState<string | null>(null);
  const [quoteUrlCopied, setQuoteUrlCopied] = useState(false);
  const [partnerSimId, setPartnerSimId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  // Admin-set discount % for a rep direct-sale link (?desc=N). Applied to rep coupons only.
  const [repDiscountOverride, setRepDiscountOverride] = useState<number | null>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showAmbientsReview, setShowAmbientsReview] = useState(false);
  const [mdfExpanded, setMdfExpanded] = useState(false);
  const [forroExpanded, setForroExpanded] = useState(false);
  const [tetoExpanded, setTetoExpanded] = useState(false);
  const [savingsExpanded, setSavingsExpanded] = useState(false);
  const [showMoInfo, setShowMoInfo] = useState(false);
  const [savedSpaces, setSavedSpaces] = useState<SavedSpace[]>([]);
  // Inline editing of a saved space in the review list
  const [editingSpaceIdx, setEditingSpaceIdx] = useState<number | null>(null);
  const [editSpaceLabel, setEditSpaceLabel] = useState("");
  const [editSpaceWidth, setEditSpaceWidth] = useState("");
  const [editSpaceHeight, setEditSpaceHeight] = useState("");
  const [editSpaceM2, setEditSpaceM2] = useState("");
  const [editSpaceDimMode, setEditSpaceDimMode] = useState<"lxa" | "m2">("lxa");
  // Index of the space shown in the Resumo block; null = current active space
  const [resumeIdx, setResumeIdx] = useState<number | null>(null);

  // Raw multi-space params from URL — resolved into savedSpaces once products load.
  // plates comes from partner links (pl{i}); w/h come from Visualizador links (w{i}/h{i}).
  interface PendingMsSpace { spaceName: string; productCode: string; plates: number | null; w: number | null; h: number | null; measurementType?: "dimensions" | "square_meters" | null; sqm?: number | null; }
  const [pendingMsParams, setPendingMsParams] = useState<PendingMsSpace[] | null>(null);

  // ── Partner / client-link mode ───────────────────────────────────────────
  const [partnerMode, setPartnerMode] = useState(false);       // opened with ?mode=partner
  const [fromPartnerLink, setFromPartnerLink] = useState(false); // opened from a partner-generated link
  const [fromQuoteEdit, setFromQuoteEdit] = useState(false);     // opened to edit a saved orçamento (?src=quote)
  const [editSlug, setEditSlug] = useState<string | null>(null); // slug to UPDATE in place (?edit=…)
  const [vizPrefill, setVizPrefill] = useState(false);          // opened from the Visualizador (?src=viz)
  const [hasJumpedFromLink, setHasJumpedFromLink] = useState(false);
  const [partnerLinkCopied, setPartnerLinkCopied] = useState(false);
  const [partnerLinkGenerated, setPartnerLinkGenerated] = useState(false);
  const [platesOverride, setPlatesOverride] = useState<number | null>(null); // locked plate count from partner link
  const [measureAck, setMeasureAck] = useState(false); // user confirmed an unusual measurement

  // Sync custom space text → selectedSpace whenever text changes
  useEffect(() => {
    if (!showCustomInput) return;
    const custom = classifyCustomSpace(customSpaceText);
    if (!custom) { setSelectedSpace(null); return; }
    if (custom.viability === "no") {
      const c = custom as { viability: "no"; label: string; msg: string; hint: string; redirect: string };
      setSelectedSpace({ id: "__custom__", label: c.label, viability: "no", msg: c.msg, hint: c.hint, redirect: c.redirect });
    } else {
      setSelectedSpace({ id: "__custom__", label: custom.label, viability: custom.viability });
    }
  }, [customSpaceText, showCustomInput]); // eslint-disable-line react-hooks/exhaustive-deps
  const [comparisonMaterial, setComparisonMaterial] = useState<"mdf" | "papel" | "forro" | "teto" | "tinta">("mdf");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const m2 =
    dimMode === "lxa"
      ? (parseFloat(width) || 0) * (parseFloat(height) || 0)
      : parseFloat(sqmInput) || 0;

  const plates =
    platesOverride !== null
      ? platesOverride
      : dimMode === "lxa" && (parseFloat(width) || 0) > 0 && (parseFloat(height) || 0) > 0
      ? orbitalPlatesForDimensions(parseFloat(width) || 0, parseFloat(height) || 0)
      : m2 > 0
      ? Math.ceil(m2 / PLATE_M2)
      : 0;

  const isComplex = selectedSpace?.viability === "complex";

  // The client's measurement method + raw values as entered right now — stored on
  // the space/quote so a later edit restores exactly this (L×A stays L×A).
  const currentMeasurement = (): { measurementType: "dimensions" | "square_meters"; width: number | null; height: number | null; squareMeters: number | null } =>
    dimMode === "lxa"
      ? { measurementType: "dimensions", width: parseFloat(width) || null, height: parseFloat(height) || null, squareMeters: m2 > 0 ? parseFloat(m2.toFixed(2)) : null }
      : { measurementType: "square_meters", width: null, height: null, squareMeters: parseFloat(sqmInput) || null };

  const pricePerPlate = selectedProduct?.price ?? 559;

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

  // Grand totals (all saved spaces + current space)
  const grandMaterialTotal = savedSpaces.reduce((s, sp) => s + sp.materialTotal, 0) + orbMaterialTotal;
  const grandMaterialDiscounted = savedSpaces.reduce((s, sp) => s + sp.materialDiscounted, 0) + orbMaterialDiscounted;
  const grandMOTotal = savedSpaces.reduce((s, sp) => s + sp.moTotal, 0) + orbMOTotal;
  const grandTotal = savedSpaces.reduce((s, sp) => s + sp.total, 0) + orbTotal;
  const grandPlates = savedSpaces.reduce((s, sp) => s + sp.plates, 0) + plates;

  // pfbTotal10y: the full PFB investment for all spaces (used consistently in all comparisons)
  const pfbTotal10y = savedSpaces.length > 0 ? grandTotal : orbTotal;

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
  // mdfOnce: per-installation cost for the CURRENT space only (shown in the breakdown panel)
  const mdfOnce = mdfMaterialTotal + mdfMOTotal + mdfAcabamentoTotal;

  // mdfAllOnce: aggregate per-installation cost across ALL spaces (saved + current)
  // used for the 10-year bar chart comparison so it's apples-to-apples with pfbTotal10y.
  // Uses exact sheet-grid calculation from dimLabel dimensions when available.
  const mdfAllSheetsCount = savedSpaces.reduce((sum, sp) => sum + mdfSheetsForSpace(sp.m2, sp.dimLabel), 0) + mdfSheets;
  const mdfAllMaterialTotal = savedSpaces.reduce((sum, sp) => sum + mdfSheetsForSpace(sp.m2, sp.dimLabel) * MDF_SHEET_PRICE, 0) + mdfMaterialTotal;
  const mdfAllMOTotal = savedSpaces.reduce((sum, sp) => {
    const sheets = mdfSheetsForSpace(sp.m2, sp.dimLabel);
    const moRate = sp.viability === "complex" ? MDF_MO_COMPLEX : MDF_MO_SIMPLE;
    return sum + Math.round(moRate * MDF_SHEET_M2) * sheets;
  }, 0) + mdfMOTotal;
  const mdfAllAcabamentoTotal = savedSpaces.reduce((sum, sp) => sum + MDF_ACABAMENTO * sp.m2, 0) + mdfAcabamentoTotal;
  const mdfAllOnce = mdfAllMaterialTotal + mdfAllMOTotal + mdfAllAcabamentoTotal;

  const mdfIn10y = mdfAllOnce * MDF_INSTALLS_10Y;
  // savings10y: against full PFB investment (all spaces) — negative means PFB is more expensive
  const savings10y = mdfIn10y - pfbTotal10y;

  const forroMORate = isComplex ? FORRO_MO_COMPLEX : FORRO_MO_SIMPLE;
  const forroUnits = m2 > 0 ? Math.ceil(m2 * FORRO_WASTE / FORRO_PLANK_M2) : 0;
  const forroMaterialCost = forroUnits * (FORRO_M2_MATERIAL * FORRO_PLANK_M2);
  const forroOnce = forroMaterialCost + m2 * (FORRO_M2_STRUCTURE + forroMORate + FORRO_ACABAMENTO);
  const forroIn10y = forroOnce * FORRO_INSTALLS_10Y;

  const tetoMORate = isComplex ? TETO_MO_COMPLEX : TETO_MO_SIMPLE;
  const tetoUnits = m2 > 0 ? Math.ceil(m2 * TETO_WASTE / TETO_BOARD_M2) : 0;
  const tetoMaterialCost = tetoUnits * (TETO_M2_MATERIAL * TETO_BOARD_M2);
  const tetoOnce = tetoMaterialCost + m2 * (TETO_M2_STRUCTURE + tetoMORate + TETO_ACABAMENTO);
  const tetoIn10y = tetoOnce * TETO_INSTALLS_10Y;

  const savingsForro = forroIn10y - pfbTotal10y;
  const savingsTeto = tetoIn10y - pfbTotal10y;

  // Ceiling-space detection: forro/teto are ceiling products, only compare when relevant
  const isCeilingApp = (name: string) => /teto|forro|tecto|laje|plafon|ceiling/i.test(name);
  const anySpaceIsCeiling =
    savedSpaces.some((s) => isCeilingApp(s.label)) ||
    isCeilingApp(customSpaceText) ||
    isCeilingApp(selectedSpace?.label ?? "") ||
    selectedSpace?.id === "teto";
  // Show ceiling tabs only if the space is a ceiling app AND PFB is NOT >30% more expensive
  const showForroTab = anySpaceIsCeiling && pfbTotal10y <= forroIn10y * 1.30;
  const showTetoTab  = anySpaceIsCeiling && pfbTotal10y <= tetoIn10y  * 1.30;

  const commissionOwed = couponData
    ? couponData.commission_type === "percentage"
      ? Math.round(orbMaterialDiscounted * couponData.commission_value / 100)
      : couponData.commission_value
    : 0;

  const waMsg =
    selectedProduct && selectedSpace && m2 > 0
      ? savedSpaces.length > 0
        ? [
            "Olá! Gostaria de solicitar um orçamento para múltiplos ambientes com PFB Orbital.",
            "",
            ...savedSpaces.map((sp, i) => [
              `*${i + 1}. ${sp.label}*`,
              `Acabamento: ${sp.productName} (${sp.productCode} — ${sp.linha})`,
              `Dimensões: ${sp.dimLabel}`,
              `Placas: ${sp.plates} | Material: ${fmt(sp.materialDiscounted)}`,
            ].join("\n")),
            `*${savedSpaces.length + 1}. ${selectedSpace.label}*`,
            `Acabamento: ${selectedProduct.name} (${selectedProduct.code} — ${selectedProduct.linha})`,
            dimMode === "lxa" && width && height
              ? `Dimensões: ${width}m × ${height}m`
              : `Área: ${m2.toFixed(2)} m²`,
            `Placas: ${plates} | Material: ${fmt(orbMaterialDiscounted)}`,
            "",
            `*Total geral:* ${grandPlates} placa${grandPlates !== 1 ? "s" : ""}`,
            `*Material total:* ${fmt(grandMaterialDiscounted)}`,
            `*MO estimada:* ${fmt(grandMOTotal)}`,
            `*Total:* ${fmt(grandTotal)}`,
            couponData ? `*Cupom aplicado:* ${couponData.coupon_code}` : null,
            clientName ? `*Cliente:* ${clientName}` : null,
            clientEmail ? `*E-mail:* ${clientEmail}` : null,
          ].filter(Boolean).join("\n")
        : [
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
              ? `*Cupom aplicado:* ${couponData.coupon_code}`
              : null,
            couponData ? `*Preço com desconto:* ${fmt(orbMaterialDiscounted)}` : null,
            clientName ? `*Cliente:* ${clientName}` : null,
            clientEmail ? `*E-mail do cliente:* ${clientEmail}` : null,
          ].filter(Boolean).join("\n")
      : "Olá! Tenho interesse no PFB Orbital e gostaria de fazer um orçamento.";

  // Message for Werk Engenharia (terceirizado de instalação) — per-ambiente
  // breakdown only (space, dimensions, plate count, model). Never includes a
  // price: the material value is closed directly with Orbital, not something
  // the installer needs or should see.
  const werkssonGreeting =
    "Olá Werk Engenharia! Sou cliente da Orbital Revestimentos e gostaria de um orçamento de instalação para os painéis PFB.";
  const werkssonMsg =
    selectedProduct && selectedSpace && m2 > 0
      ? (() => {
          const ambientes = [
            ...savedSpaces.map((sp) => ({
              label: sp.label,
              dims: sp.dimLabel.includes("×") ? sp.dimLabel : "",
              plates: sp.plates,
              code: sp.productCode,
              name: sp.productName,
            })),
            {
              label: selectedSpace.label,
              dims: dimMode === "lxa" && width && height ? `${width}m × ${height}m` : "",
              plates,
              code: selectedProduct.code,
              name: selectedProduct.name,
            },
          ];
          const lines = [werkssonGreeting, ""];
          ambientes.forEach((a, i) => {
            lines.push(
              `Ambiente ${i + 1}: ${a.label}`,
              `Dimensões: ${a.dims}`,
              `Quantidade: ${a.plates} placa${a.plates !== 1 ? "s" : ""}`,
              `Modelo: ${a.code} | ${a.name.toUpperCase()}`,
              ""
            );
          });
          return lines.join("\n").trimEnd();
        })()
      : werkssonGreeting;

  function goToStep(n: 1 | 2 | 3 | 4 | 5) {
    setStep(n);
    setShowResult(false);
    setTimeout(() => {
      // Step 2 (models): start so the full product grid is visible from top
      // All other steps: center so the card sits comfortably in the viewport
      stepCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: n === 2 ? "start" : "center",
      });
    }, 50);
  }

  // ── Multi-space edit/remove (Resumo) ──────────────────────────────────────
  // The "current" (unsaved, live editor) ambiente and each saved ambiente must
  // offer the SAME actions. These helpers make the current space snapshot-able
  // and a saved space loadable back into the editor, so any row can be edited
  // or removed with identical controls.
  function currentSpaceToSaved(): SavedSpace {
    return {
      key: `space-${Date.now()}`,
      label: ambienteName.trim() || selectedSpace!.label,
      productName: selectedProduct!.name,
      productCode: selectedProduct!.code,
      imagePath: selectedProduct!.image_path ?? "",
      linha: selectedProduct!.linha,
      dimLabel: dimMode === "lxa" && width && height ? `${width}m × ${height}m` : `${m2.toFixed(2)} m²`,
      m2,
      plates,
      pricePerPlate,
      materialTotal: orbMaterialTotal,
      materialDiscounted: orbMaterialDiscounted,
      moTotal: orbMOTotal,
      total: orbTotal,
      viability: selectedSpace!.viability === "complex" ? "complex" : "simple",
      ...currentMeasurement(),
    };
  }

  function loadSavedIntoEditor(sp: SavedSpace) {
    const prod = products.find((p) => p.code === sp.productCode);
    if (prod) { setSelectedLine(prod.linha); setSelectedProduct(prod); }
    const canonical = SPACES.find((s) => s.label.toLowerCase() === sp.label.trim().toLowerCase());
    if (canonical) { setSelectedSpace(canonical); setShowCustomInput(false); setCustomSpaceText(""); }
    else { setSelectedSpace({ id: "__custom__", label: sp.label, viability: sp.viability }); setCustomSpaceText(sp.label); setShowCustomInput(true); }
    setAmbienteName(sp.label);
    setPlatesOverride(null);
    if (sp.measurementType === "dimensions" && sp.width != null && sp.height != null) {
      setWidth(String(sp.width)); setHeight(String(sp.height)); setSqmInput(""); setDimMode("lxa");
    } else if (sp.measurementType === "square_meters" && sp.squareMeters != null) {
      setSqmInput(String(sp.squareMeters)); setWidth(""); setHeight(""); setDimMode("m2");
    } else {
      setSqmInput(sp.m2 ? String(sp.m2) : ""); setWidth(""); setHeight(""); setDimMode("m2");
    }
  }

  // Edit a SAVED ambiente: park the current editor space into that saved slot so
  // it isn't lost, load the chosen ambiente into the editor, and return to the
  // dimensions step. Order is preserved (the edited one becomes the live space).
  function editSavedSpace(i: number) {
    const target = savedSpaces[i];
    if (!target) return;
    const parked = currentSpaceToSaved();
    setSavedSpaces((prev) => prev.map((s, idx) => (idx === i ? parked : s)));
    loadSavedIntoEditor(target);
    setResumeIdx(null);
    setShowResult(false);
    goToStep(3);
  }

  // Edit the CURRENT (live) ambiente — it's already loaded; just reopen dims.
  function editCurrentSpace() {
    setShowResult(false);
    goToStep(3);
  }

  function removeSavedSpace(i: number) {
    if (!confirm("Remover este ambiente da simulação?")) return;
    setSavedSpaces((prev) => prev.filter((_, idx) => idx !== i));
    setResumeIdx((prev) => (prev === null ? null : prev === i ? null : prev > i ? prev - 1 : prev));
  }

  // Remove the CURRENT (live) ambiente: promote the last saved ambiente into the
  // editor and drop it from the saved list, so the live row disappears and totals
  // recalc. (Only reachable when at least one saved ambiente exists.)
  function removeCurrentSpace() {
    if (savedSpaces.length === 0) return;
    if (!confirm("Remover este ambiente da simulação?")) return;
    const last = savedSpaces[savedSpaces.length - 1];
    loadSavedIntoEditor(last);
    setSavedSpaces((prev) => prev.slice(0, -1));
    setResumeIdx(null);
  }

  function showResults() {
    setShowResult(true);
    setStep(5); // stepper now ends at "Resultado" (Ver no ambiente is opt-in)
  }

  useEffect(() => {
    if (showResult) {
      trackFunnel("resultado_visualizado", { plates: grandPlates });
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult]);

  // Pull the authoritative composition (placas + Cola PU + frete + pagamento)
  // from the central engine whenever the result is shown / the project changes.
  useEffect(() => {
    if (!showResult) { setPricing(null); return; }
    const gPlates = savedSpaces.reduce((s, sp) => s + sp.plates, 0) + plates;
    const gSubtotal = savedSpaces.reduce((s, sp) => s + sp.materialDiscounted, 0) + orbMaterialDiscounted;
    if (gPlates <= 0) return;
    const blended = gSubtotal / gPlates; // effective per-placa (post partner-coupon)
    let cancelled = false;
    fetch("/api/orcamento/pricing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plates: gPlates, pricePerPlate: blended }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: OrcamentoBreakdown | null) => {
        if (cancelled || !b) return;
        setPricing(b);
        setSelectedPayment((prev) =>
          prev && b.paymentOptions.some((o) => o.id === prev)
            ? prev
            : (b.paymentOptions.find((o) => o.id === "pix") ? "pix" : (b.paymentOptions[0]?.id ?? null))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, plates, savedSpaces, orbMaterialDiscounted]);

  // CEP → endereço (ViaCEP). Preenche rua/bairro/cidade/UF sem apagar o que já
  // foi digitado manualmente; falha de rede nunca bloqueia o preenchimento manual.
  async function lookupCep(rawCep: string) {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setFzCepLoading(true);
    setFzCepError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json().catch(() => null);
      if (!data || data.erro) { setFzCepError("CEP não encontrado. Preencha manualmente."); return; }
      if (data.logradouro) setFzStreet((prev) => prev || data.logradouro);
      if (data.bairro) setFzNeighborhood((prev) => prev || data.bairro);
      if (data.localidade) setFzCity((prev) => prev || data.localidade);
      if (data.uf) setFzState((prev) => prev || data.uf);
    } catch {
      setFzCepError("Não foi possível consultar o CEP. Preencha manualmente.");
    } finally {
      setFzCepLoading(false);
    }
  }

  async function submitFormalize() {
    if (!savedQuoteSlug) { setFzError("Salve a simulação antes de formalizar."); return; }
    if (!fzStreet.trim() || !fzNumber.trim() || !fzCity.trim()) {
      setFzError("Informe rua, número e cidade.");
      return;
    }
    setFzSubmitting(true);
    setFzError("");
    try {
      const res = await fetch("/api/orcamento/formalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: savedQuoteSlug,
          payment_condition: selectedPayment ?? "pix",
          address: {
            zip: fzZip, street: fzStreet, number: fzNumber, complement: fzComplement,
            neighborhood: fzNeighborhood, city: fzCity, state: fzState, condo: fzCondo, notes: fzNotes,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) { setFzError(data?.error ?? "Falha ao gerar o orçamento."); return; }
      setFzResult({ formalNumber: data.formalNumber, pdfUrl: data.pdfUrl, whatsappOk: data.whatsappOk, emailOk: data.emailOk });
      trackFunnel("formalizacao_gerada", { plates: grandPlates });
    } catch (e) {
      setFzError(e instanceof Error ? e.message : "Erro de rede.");
    } finally {
      setFzSubmitting(false);
    }
  }

  useEffect(() => {
    if (selectedSpace && step === 1) {
      setTimeout(() => {
        nextBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpace]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const cupom = searchParams.get("cupom");

    if (mode === "partner") {
      setPartnerMode(true);
      if (cupom) setCouponCode(cupom.toUpperCase()); // keep partner's coupon for the generated link
      return;
    }

    if (cupom) setCouponCode(cupom.toUpperCase());

    // Admin-set discount % for a rep direct-sale link (?desc=N)
    const descParam = searchParams.get("desc");
    if (descParam) {
      const d = parseFloat(descParam);
      if (!isNaN(d) && d >= 0) setRepDiscountOverride(d);
    }

    // Capture partner simulation ID (added to URL when partner generates the link)
    const simId = searchParams.get("sim_id");
    if (simId) setPartnerSimId(simId);

    // Visualizador handoff link (?src=viz) — prefill without the partner banner/coupon UI
    const srcViz = searchParams.get("src") === "viz";
    if (srcViz) setVizPrefill(true);
    const vizRender = searchParams.get("viz_render");
    if (vizRender) vizRenderId.current = vizRender;

    // "Editar este orçamento" link from a saved /orcamento/[slug] page (?src=quote)
    // — same ms= multi-space format, but its own banner/copy: not a partner's
    // project, not a Visualizador handoff, just the client revisiting their own
    // saved quote to change it.
    const srcQuote = searchParams.get("src") === "quote";
    // The slug of the quote being edited — present when the client came from
    // "Editar este orçamento". Drives update-in-place (PATCH the same quote) and
    // pre-filling their dados, instead of creating a brand-new orçamento.
    const editParam = searchParams.get("edit");
    if (srcQuote && editParam) setEditSlug(editParam);

    // ── Multi-space link: ?ms=N&s0=…&p0=…&pl0=…  (partner/quote-edit: pl{i} plates) ──
    // ── or                ?ms=N&s0=…&p0=…&w0=…&h0=… (visualizador: dims) ──
    // N can be exactly 1 (a saved quote with a single ambiente) — the resolver
    // effect below already handles a length-1 array correctly (it becomes the
    // active space, nothing goes to savedSpaces).
    const msParam = searchParams.get("ms");
    if (msParam) {
      const count = parseInt(msParam, 10);
      if (!isNaN(count) && count >= 1) {
        const spaces: PendingMsSpace[] = [];
        for (let i = 0; i < count; i++) {
          const spaceName = searchParams.get(`s${i}`) ?? "";
          const productCode = searchParams.get(`p${i}`) ?? "";
          const pl = parseInt(searchParams.get(`pl${i}`) ?? "", 10);
          const wv = parseFloat(searchParams.get(`w${i}`) ?? "");
          const hv = parseFloat(searchParams.get(`h${i}`) ?? "");
          const av = parseFloat(searchParams.get(`a${i}`) ?? ""); // m² (quote edit, square_meters method)
          const mtRaw = searchParams.get(`mt${i}`);               // "dimensions" | "square_meters" (quote edit)
          const measurementType = mtRaw === "dimensions" || mtRaw === "square_meters" ? mtRaw : null;
          const hasPl = !isNaN(pl) && pl > 0;
          const hasDims = !isNaN(wv) && wv > 0 && !isNaN(hv) && hv > 0;
          const hasSqm = !isNaN(av) && av > 0;
          if (!spaceName || !productCode) continue;
          // Entries need plates, dims, or m² — except the LAST one from the
          // Visualizador, which may arrive dimensionless (user fills step 3).
          if (hasPl || hasDims || hasSqm || (srcViz && i === count - 1)) {
            spaces.push({
              spaceName,
              productCode,
              plates: hasPl ? pl : null,
              w: hasDims ? wv : null,
              h: hasDims ? hv : null,
              measurementType,
              sqm: hasSqm ? av : null,
            });
          }
        }
        if (spaces.length >= 1) {
          setPendingMsParams(spaces);
          if (srcQuote) setFromQuoteEdit(true);
          else if (!srcViz) setFromPartnerLink(true);
        }
      }
      return; // skip single-space param parsing
    }

    // Pre-fill space from ?space=ID (or ?space=custom&customSpace=TEXT)
    const spaceParam = searchParams.get("space");
    if (spaceParam) {
      if (spaceParam === "custom") {
        const txt = searchParams.get("customSpace");
        if (txt) { setCustomSpaceText(decodeURIComponent(txt)); setShowCustomInput(true); }
      } else {
        const sp = SPACES.find((s) => s.id === spaceParam);
        if (sp) setSelectedSpace(sp);
      }
    }

    // Pre-fill area from ?area=N.NN
    const areaParam = searchParams.get("area");
    if (areaParam) { setSqmInput(areaParam); setDimMode("m2"); }

    // Pre-fill real measurements from the Visualizador (?w=L&h=A, meters)
    const wParam = parseFloat(searchParams.get("w") ?? "");
    const hParam = parseFloat(searchParams.get("h") ?? "");
    if (!isNaN(wParam) && wParam > 0 && !isNaN(hParam) && hParam > 0) {
      setWidth(String(wParam));
      setHeight(String(hParam));
      setDimMode("lxa");
    }

    // Lock plate count from partner-calculated ?placas=N (prevents formula mismatch)
    const placasParam = searchParams.get("placas");
    if (placasParam) {
      const n = parseInt(placasParam, 10);
      if (!isNaN(n) && n > 0) setPlatesOverride(n);
    }

    // Mark as partner-generated link if admin-generated (from=consultor) OR all key params present
    const fromAdmin = searchParams.get("from") === "consultor";
    if (fromAdmin || (cupom && spaceParam && (areaParam || searchParams.get("produto")))) {
      setFromPartnerLink(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Editing a saved quote: pre-fill the client's dados from the quote so they
  // don't retype them (migration 042 stores them on the quote). Best-effort.
  useEffect(() => {
    if (!editSlug) return;
    let cancelled = false;
    fetch(`/api/quotes/${editSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => {
        if (cancelled || !q) return;
        if (typeof q.client_name === "string" && q.client_name) setClientName(q.client_name);
        if (typeof q.client_email === "string" && q.client_email) setClientEmail(q.client_email);
        if (typeof q.client_phone === "string" && q.client_phone) setClientPhone(q.client_phone);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [editSlug]);

  // A changed measurement invalidates any prior "yes it's correct" confirmation.
  useEffect(() => { setMeasureAck(false); }, [width, height, sqmInput, dimMode]);

  // Pre-select product from ?produto=CODE (set after products are loaded).
  // Applies at most once — see produtoParamAppliedRef above.
  useEffect(() => {
    if (loadingProducts || products.length === 0) return;
    if (produtoParamAppliedRef.current) return;
    const code = searchParams.get("produto");
    if (!code) return;
    const match = products.find((p) => p.code === code);
    if (match) {
      produtoParamAppliedRef.current = true;
      setSelectedLine(match.linha);
      setSelectedProduct(match);
    }
  }, [loadingProducts, products, searchParams]);

  // Resolve multi-space URL params → savedSpaces + active space (runs once products load)
  useEffect(() => {
    if (loadingProducts || products.length === 0) return;
    if (!pendingMsParams || pendingMsParams.length === 0) return;

    // All spaces except the last become savedSpaces; the last becomes the active space.
    const allButLast = pendingMsParams.slice(0, -1);
    const lastSpace = pendingMsParams[pendingMsParams.length - 1];

    const newSaved: SavedSpace[] = allButLast.map((sp, idx) => {
      const product = products.find((p) => p.code === sp.productCode);
      const ppp = product?.price ?? 559;
      const classification = classifyCustomSpace(sp.spaceName);
      const complex = classification?.viability === "complex";
      // Plate count: explicit (partner link) or derived from real dims (visualizador)
      const hasDims = sp.w !== null && sp.h !== null;
      // Measurement method is preserved from the quote; fall back to inferring it.
      const measurementType: "dimensions" | "square_meters" =
        sp.measurementType ?? (hasDims ? "dimensions" : "square_meters");
      const areaM2 = hasDims
        ? parseFloat(((sp.w as number) * (sp.h as number)).toFixed(2))
        : (sp.sqm != null && sp.sqm > 0 ? parseFloat(sp.sqm.toFixed(2)) : parseFloat(((sp.plates ?? 0) * PLATE_M2).toFixed(2)));
      // Plate count from real dims / m² (never a frozen override on an edit).
      const spPlates = hasDims
        ? orbitalPlatesForDimensions(sp.w as number, sp.h as number)
        : (sp.sqm != null && sp.sqm > 0 ? Math.ceil(sp.sqm / PLATE_M2) : (sp.plates ?? 0));
      const moRate = orbitalMOPerPlate(spPlates, complex);
      const materialTotal = spPlates * ppp;
      const moTotal = moRate * spPlates;
      return {
        key: `ms-space-${idx}`,
        label: sp.spaceName,
        productName: product?.name ?? sp.productCode,
        productCode: sp.productCode,
        imagePath: product?.image_path ?? "",
        linha: product?.linha ?? "Classic",
        dimLabel: hasDims ? `${sp.w}m × ${sp.h}m` : `${areaM2.toFixed(2)} m²`,
        m2: areaM2,
        plates: spPlates,
        pricePerPlate: ppp,
        materialTotal,
        materialDiscounted: materialTotal, // discount applied retroactively when coupon validates
        moTotal,
        total: materialTotal + moTotal,
        viability: complex ? "complex" : "simple",
        measurementType,
        width: hasDims ? (sp.w as number) : null,
        height: hasDims ? (sp.h as number) : null,
        squareMeters: measurementType === "square_meters" ? areaM2 : (hasDims ? areaM2 : null),
      };
    });

    setSavedSpaces(newSaved);

    // Pre-fill the last space as the active space
    const lastProduct = products.find((p) => p.code === lastSpace.productCode);
    if (lastProduct) {
      setSelectedLine(lastProduct.linha);
      setSelectedProduct(lastProduct);
    }
    // If the saved space name matches one of the canonical SPACES (e.g. the
    // client picked "Parede" rather than typing a custom room name — the
    // common case), select it properly so canAdvance1 and the auto-jump below
    // are satisfied and the client lands straight on step 4, not step 1.
    const canonicalSpace = SPACES.find((s) => s.label.toLowerCase() === lastSpace.spaceName.trim().toLowerCase());
    if (canonicalSpace) setSelectedSpace(canonicalSpace);
    setCustomSpaceText(lastSpace.spaceName);
    setShowCustomInput(true);
    // Restore the ACTIVE space using the client's ORIGINAL measurement method.
    // A quote edit carries measurementType; a partner "plates" link still locks
    // the plate count (setPlatesOverride) as before.
    const lastMethod = lastSpace.measurementType
      ?? (lastSpace.w !== null && lastSpace.h !== null ? "dimensions" : lastSpace.sqm != null ? "square_meters" : null);
    if (lastMethod === "dimensions" && lastSpace.w !== null && lastSpace.h !== null) {
      // Keep the real L×A so the client sees — and can directly edit — them.
      // No platesOverride: plates recompute from the dimensions.
      setWidth(String(lastSpace.w));
      setHeight(String(lastSpace.h));
      setDimMode("lxa");
    } else if (lastMethod === "square_meters" && lastSpace.sqm != null) {
      // Preserve the m² method + value; plates recompute from m² (no lock).
      setSqmInput(String(lastSpace.sqm));
      setDimMode("m2");
    } else if (lastSpace.w !== null && lastSpace.h !== null) {
      setWidth(String(lastSpace.w));
      setHeight(String(lastSpace.h));
      setDimMode("lxa");
    } else if (lastSpace.plates !== null) {
      // Partner link without a measurement method: lock the calculated plates.
      setPlatesOverride(lastSpace.plates);
      setSqmInput((lastSpace.plates * PLATE_M2).toFixed(2));
      setDimMode("m2");
    }
    // else: dimensionless visualizador entry — user fills dims in step 3

    setPendingMsParams(null); // mark as resolved
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProducts, products, pendingMsParams]);

  // Whenever couponData changes (applied, changed, or removed), recalculate materialDiscounted
  // for ALL saved spaces so every environment reflects the correct discounted price.
  useEffect(() => {
    setSavedSpaces((prev) =>
      prev.map((sp) => {
        if (!couponData) {
          // Coupon removed — reset to full price
          return { ...sp, materialDiscounted: sp.materialTotal, total: sp.materialTotal + sp.moTotal };
        }
        const discAmt =
          couponData.discount_type === "percentage"
            ? Math.round(sp.materialTotal * couponData.discount_value / 100)
            : Math.min(couponData.discount_value, sp.materialTotal);
        const materialDiscounted = sp.materialTotal - discAmt;
        return { ...sp, materialDiscounted, total: materialDiscounted + sp.moTotal };
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponData]);

  // Auto-jump once everything is pre-filled from a partner, Visualizador, or
  // saved-quote-edit link. With dims/area present → step 4 (client data);
  // Visualizador link missing dims for the active space → step 3 so the user
  // types only the measurements.
  useEffect(() => {
    if ((!fromPartnerLink && !vizPrefill && !fromQuoteEdit) || hasJumpedFromLink) return;
    if (!selectedSpace || !selectedProduct) return;
    if (m2 > 0) {
      setHasJumpedFromLink(true);
      // Editing a quote: land on the step the client chose to change (?goto=…),
      // otherwise the review/dados step as before.
      const goto = searchParams.get("goto");
      setStep(fromQuoteEdit && goto === "modelo" ? 2 : fromQuoteEdit && goto === "dimensoes" ? 3 : 4);
      setTimeout(() => stepCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } else if (vizPrefill) {
      setHasJumpedFromLink(true);
      setStep(3);
      setTimeout(() => stepCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPartnerLink, vizPrefill, fromQuoteEdit, hasJumpedFromLink, selectedSpace, selectedProduct, m2]);

  // Auto-validate coupon when arriving from a partner link or a saved-quote
  // edit that had a coupon applied (so step 5 shows it as locked/applied)
  useEffect(() => {
    if ((!fromPartnerLink && !fromQuoteEdit) || !couponCode.trim() || couponData || couponValidating) return;
    validateCoupon();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPartnerLink, fromQuoteEdit, couponCode]);

  // Auto-switch away from ceiling-only tabs when they become unavailable
  useEffect(() => {
    if (
      (comparisonMaterial === "forro" && !showForroTab) ||
      (comparisonMaterial === "teto" && !showTetoTab)
    ) {
      setComparisonMaterial("mdf");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForroTab, showTetoTab]);

  function reset() {
    setStep(1);
    setSelectedSpace(null);
    setAmbienteName("");
    setSelectedLine(null);
    setSelectedProduct(null);
    setWidth("");
    setHeight("");
    setSqmInput("");
    setClientName("");
    setClientEmail("");
    setSimSubmitted(false);
    setCouponCode("");
    setCouponData(null);
    setCouponError("");
    setShowResult(false);
    setShowAmbientsReview(false);
    setSavedSpaces([]);
    setQuoteShareUrl(null);
    setQuoteUrlCopied(false);
    setTimeout(() => stepCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function saveCurrentSpace() {
    if (!selectedSpace || !selectedProduct || plates === 0) return;
    setSavedSpaces(prev => [...prev, {
      key: `space-${Date.now()}`,
      label: ambienteName.trim() || selectedSpace.label,
      productName: selectedProduct.name,
      productCode: selectedProduct.code,
      imagePath: selectedProduct.image_path ?? "",
      linha: selectedProduct.linha,
      dimLabel: dimMode === "lxa" && width && height ? `${width}m × ${height}m` : `${m2.toFixed(2)} m²`,
      m2,
      plates,
      pricePerPlate,
      materialTotal: orbMaterialTotal,
      materialDiscounted: orbMaterialDiscounted,
      moTotal: orbMOTotal,
      total: orbTotal,
      viability: selectedSpace.viability === "complex" ? "complex" : "simple",
      ...currentMeasurement(),
    }]);
    // Reset space/product/dims but keep client info and coupon
    setSelectedSpace(null);
    setAmbienteName("");
    setCustomSpaceText("");
    setShowCustomInput(false);
    setSelectedLine(null);
    setSelectedProduct(null);
    setWidth("");
    setHeight("");
    setSqmInput("");
    setDimMode("lxa");
    setPlatesOverride(null);
    setShowResult(false);
    goToStep(1);
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
        // For rep direct-sale links, apply the admin-set discount % from ?desc
        if (json.source === "rep" && repDiscountOverride != null) {
          json.discount_type = "percentage";
          json.discount_value = repDiscountOverride;
        }
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

  // Feature 6 — capture a partial session as soon as a valid phone is entered,
  // before submission, so the recovery cron can nudge if they never finish.
  // Re-captures only when the phone changes; fully non-fatal.
  async function captureSession() {
    const phoneDigits = clientPhone.trim().replace(/\D/g, "");
    if (phoneDigits.length < 10) return;
    const phone = clientPhone.trim();
    if (phone === lastCapturedPhoneRef.current) return;
    if (!simSessionId.current) {
      simSessionId.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    lastCapturedPhoneRef.current = phone;
    try {
      await fetch("/api/simulador/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: simSessionId.current,
          name: clientName.trim() || null,
          email: clientEmail.trim() || null,
          phone,
          space: selectedSpace?.label ?? null,
          product_name: selectedProduct?.name ?? null,
          estimated_total: grandMaterialDiscounted || orbMaterialDiscounted || orbMaterialTotal || null,
        }),
      });
    } catch { /* non-fatal */ }
  }

  async function handleSubmitAndShow() {
    // Step 5 can now reach this two ways — the visualization auto-advancing
    // on its first successful render, or the always-visible "Pular etapa"
    // button — so guard against submitting (and re-emailing) twice.
    if (simSubmitted || simSubmitting) return;
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) return;
    if (couponCode.trim() && !couponData) await validateCoupon();

    setSimSubmitting(true);
    try {
      // Log coupon use if a coupon was applied — capture the ID for the drip sequence
      // For multi-space: send aggregate totals + full breakdown so partner/rep emails are complete
      let couponUseId: string | null = null;
      if (couponData && selectedProduct && selectedSpace) {
        try {
          const isMultiSpace = savedSpaces.length > 0;
          const allSpacesLabel = isMultiSpace
            ? [...savedSpaces.map((sp) => sp.label), selectedSpace.label].join(", ")
            : selectedSpace.label;
          const currentDimLabelForCoupon = dimMode === "lxa" && width && height
            ? `${width}m × ${height}m`
            : `${m2.toFixed(2)} m²`;
          const couponSpaceBreakdown = isMultiSpace ? [
            ...savedSpaces.map((sp) => ({
              spaceName: sp.label,
              productName: sp.productName,
              dimLabel: sp.dimLabel,
              plates: sp.plates,
              area_m2: parseFloat(sp.m2.toFixed(2)),
              total: sp.materialDiscounted,
            })),
            {
              spaceName: ambienteName.trim() || selectedSpace.label,
              productName: selectedProduct.name,
              dimLabel: currentDimLabelForCoupon,
              plates,
              area_m2: parseFloat(m2.toFixed(2)),
              total: orbMaterialDiscounted || orbMaterialTotal,
            },
          ] : null;
          const res = await fetch("/api/coupons/use", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // For rep direct sales there is no partner — attribute to the rep instead.
              partner_id: couponData.source === "rep" ? null : couponData.id,
              source: couponData.source ?? "partner",
              sales_rep_referral_code: couponData.source === "rep" ? couponData.coupon_code : null,
              coupon_code: couponData.coupon_code,
              space: allSpacesLabel,
              product_name: isMultiSpace ? `${savedSpaces.length + 1} ambientes` : selectedProduct.name,
              product_code: selectedProduct.code,
              area_m2: isMultiSpace ? parseFloat((savedSpaces.reduce((s, sp) => s + sp.m2, 0) + m2).toFixed(2)) : m2,
              plates: isMultiSpace ? grandPlates : plates,
              material_total: isMultiSpace ? grandMaterialTotal : orbMaterialTotal,
              material_discounted: isMultiSpace ? grandMaterialDiscounted : orbMaterialDiscounted,
              discount_applied: isMultiSpace
                ? grandMaterialTotal - grandMaterialDiscounted
                : discountAmount,
              commission_owed: commissionOwed,
              architect_name: clientName.trim(),
              client_email: clientEmail.trim(),
              client_phone: clientPhone.trim(),
              space_breakdown: couponSpaceBreakdown,
            }),
          });
          if (res.ok) {
            const d = await res.json();
            couponUseId = d.id ?? null;
          }
        } catch { /* non-fatal */ }
      }

      const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://orbitalrevestimentos.com.br";

      // Save a permanent quote (valid 7 days) and get its slug for the email
      let quoteSlug: string | null = null;
      try {
        const cur = currentMeasurement();
        const allSpaces = [
          ...savedSpaces.map((sp) => ({
            spaceName: sp.label,
            productCode: sp.productCode,
            productName: sp.productName,
            productImg: (products.find((p) => p.code === sp.productCode)?.image_path) ?? "",
            linha: sp.linha,
            plates: sp.plates,
            area: sp.m2,
            dimLabel: sp.dimLabel,
            pricePerPlate: sp.pricePerPlate,
            total: sp.materialDiscounted,
            // Preserve the original measurement method + raw values (for editing).
            measurementType: sp.measurementType ?? (sp.width != null && sp.height != null ? "dimensions" : "square_meters"),
            width: sp.width ?? null,
            height: sp.height ?? null,
            squareMeters: sp.squareMeters ?? sp.m2 ?? null,
          })),
          ...(selectedProduct && selectedSpace ? [{
            spaceName: selectedSpace.label,
            productCode: selectedProduct.code,
            productName: selectedProduct.name,
            productImg: selectedProduct.image_path,
            linha: selectedProduct.linha,
            plates,
            area: m2,
            dimLabel: dimMode === "lxa" && width && height ? `${width}m × ${height}m` : `${m2.toFixed(2)} m²`,
            pricePerPlate: selectedProduct.price,
            total: orbMaterialDiscounted,
            measurementType: cur.measurementType,
            width: cur.width,
            height: cur.height,
            squareMeters: cur.squareMeters,
          }] : []),
        ];
        const quoteBody = JSON.stringify({
          partner_id: couponData?.id ?? null,
          partner_name: couponData?.partner_name ?? null,
          coupon_code: couponData?.coupon_code ?? null,
          spaces: allSpaces,
          total_plates: grandPlates,
          total_area_m2: parseFloat((savedSpaces.reduce((s, sp) => s + sp.m2, 0) + m2).toFixed(2)),
          material_total: grandMaterialTotal,
          material_discounted: grandMaterialDiscounted,
          client_name: clientName || null,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
        });
        // Editing a saved quote → PATCH the SAME slug in place, so the client's
        // existing link reflects the changes (instead of minting a new orçamento
        // the client never sees). Otherwise create a new one.
        const qRes = editSlug
          ? await fetch(`/api/quotes/${editSlug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: quoteBody })
          : await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: quoteBody });
        if (qRes.ok) {
          const qData = await qRes.json();
          quoteSlug = qData.slug ?? editSlug ?? null;
          if (quoteSlug) {
            setQuoteShareUrl(`${siteUrl}/orcamento/${quoteSlug}`);
            setSavedQuoteSlug(quoteSlug);
          }
        }
      } catch { /* non-fatal */ }

      // Start the 7-email drip sequence (include quote link if available)
      const hasMultipleSpaces = savedSpaces.length > 0;
      const seqSpace = hasMultipleSpaces
        ? savedSpaces.map((sp) => sp.label).concat(selectedSpace?.label ?? []).join(", ")
        : (selectedSpace?.label ?? null);
      // The exact model the client chose — product name + code, NOT the line.
      const seqModel = selectedProduct
        ? `${selectedProduct.name} (${selectedProduct.code})`
        : savedSpaces[0]
        ? `${savedSpaces[0].productName} (${savedSpaces[0].productCode})`
        : "—";
      const seqPlates = hasMultipleSpaces ? grandPlates : plates;
      const seqArea = hasMultipleSpaces ? parseFloat((savedSpaces.reduce((s, sp) => s + sp.m2, 0) + m2).toFixed(2)) : parseFloat(m2.toFixed(2));
      const seqTotal = hasMultipleSpaces ? grandMaterialDiscounted : (orbMaterialDiscounted || orbMaterialTotal);
      // Build dimension label for admin notification
      const currentDimLabel = dimMode === "lxa" && width && height
        ? `${width}m × ${height}m`
        : `${m2.toFixed(2).replace(".", ",")} m²`;
      const seqDimLabel = hasMultipleSpaces
        ? [...savedSpaces.map((sp) => `${sp.label}: ${sp.dimLabel}`), `${selectedSpace?.label ?? ""}: ${currentDimLabel}`].join(" | ")
        : currentDimLabel;
      // Build per-space product images array (deduped by imageUrl)
      const allSpaceImages = [
        ...savedSpaces.map((sp) => ({
          imageUrl: sp.imagePath ? `${siteUrl}${sp.imagePath}` : "",
          productName: sp.productName,
          spaceName: sp.label,
        })),
        ...(selectedProduct && selectedProduct.image_path ? [{
          imageUrl: `${siteUrl}${selectedProduct.image_path}`,
          productName: selectedProduct.name,
          spaceName: ambienteName.trim() || selectedSpace?.label || "",
        }] : []),
      ].filter((img) => img.imageUrl);
      // Deduplicate by imageUrl
      const seenImgUrls = new Set<string>();
      const seqProductImages = allSpaceImages.filter((img) => {
        if (seenImgUrls.has(img.imageUrl)) return false;
        seenImgUrls.add(img.imageUrl);
        return true;
      });
      // Per-space breakdown for admin notification (one row per space)
      const seqSpaceBreakdown = [
        ...savedSpaces.map((sp) => ({
          spaceName: sp.label,
          productName: sp.productName,
          dimLabel: sp.dimLabel,
          plates: sp.plates,
          area_m2: parseFloat(sp.m2.toFixed(2)),
          total: sp.materialDiscounted,
          imageUrl: sp.imagePath ? `${siteUrl}${sp.imagePath}` : "",
        })),
        ...(selectedProduct && selectedSpace ? [{
          spaceName: ambienteName.trim() || selectedSpace.label,
          productName: selectedProduct.name,
          dimLabel: currentDimLabel,
          plates,
          area_m2: parseFloat(m2.toFixed(2)),
          total: orbMaterialDiscounted || orbMaterialTotal,
          imageUrl: selectedProduct.image_path ? `${siteUrl}${selectedProduct.image_path}` : "",
        }] : []),
      ];
      // Only on a NEW quote: enrol the e-mail drip + fire the client/owner
      // WhatsApp+e-mail. Editing an existing quote must NOT re-blast the client
      // and owner (same "one action, one message" discipline as the pedidos send).
      if (!editSlug) {
        try {
          const seqRes = await fetch("/api/client-email-sequences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              coupon_use_id: couponUseId,
              client_name: clientName.trim(),
              client_email: clientEmail.trim(),
              client_phone: clientPhone.trim(),
              space: seqSpace,
              model: seqModel,
              plates: seqPlates,
              area_m2: seqArea,
              total: seqTotal,
              dim_label: seqDimLabel,
              product_images: seqProductImages,
              space_breakdown: seqSpaceBreakdown,
              partner_name: couponData?.partner_name ?? "Orbital",
              quote_url: quoteSlug ? `${siteUrl}/orcamento/${quoteSlug}` : null,
              sim_id: partnerSimId ?? undefined,
              sim_session_id: simSessionId.current || undefined,
              viz_render_id: vizRenderId.current || undefined,
            }),
          });
          if (!seqRes.ok) {
            const errBody = await seqRes.json().catch(() => ({}));
            console.error("[sequence] insert failed", seqRes.status, errBody);
          }
        } catch (err) {
          console.error("[sequence] fetch error", err);
        }
      }

      setSimSubmitted(true);
    } finally {
      setSimSubmitting(false);
    }

    trackFunnel("lead_capturado", { plates: grandPlates, product: selectedProduct?.code ?? null });
    showResults();
  }

  const canAdvance1 = selectedSpace !== null && selectedSpace.viability !== "no";
  const canAdvance2 = selectedProduct !== null;
  const canCalculate = m2 > 0;
  // Flag measurements that are almost certainly typos (a decimal slip like 240
  // instead of 2,40, an impossibly large wall, or an area meant for a whole
  // building). We warn and require a confirmation instead of silently accepting.
  const measurementWarning: string | null = (() => {
    if (dimMode === "lxa") {
      const w = parseFloat(width) || 0, h = parseFloat(height) || 0;
      if (w >= 100 || h >= 100) return "Um valor parece 100× maior que o esperado — talvez 240 em vez de 2,40 m. Confira largura e altura em metros.";
      if (w > 25 || h > 25) return "Largura ou altura acima de 25 m é incomum para um ambiente. Confirme se está em metros.";
    } else {
      const a = parseFloat(sqmInput) || 0;
      if (a >= 1000) return "Área acima de 1.000 m² é muito alta para um ambiente — confira o valor.";
    }
    return null;
  })();
  const canProceedMeasure = canCalculate && (!measurementWarning || measureAck);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clientEmail.trim());
  const validPhone = (() => {
    const digits = clientPhone.trim().replace(/\D/g, "").length;
    return digits >= 8 && digits <= 13;
  })();
  const canAdvance4 = clientName.trim().length > 0 && validEmail && validPhone;

  // In partner mode only show 3 steps (no client data / coupon steps)
  const STEPS = partnerMode
    ? [
        { n: 1 as const, label: "Espaço" },
        { n: 2 as const, label: "Modelo" },
        { n: 3 as const, label: "Dimensões" },
      ]
    : [
        { n: 1 as const, label: "Espaço" },
        { n: 2 as const, label: "Modelo" },
        { n: 3 as const, label: "Dimensões" },
        { n: 4 as const, label: "Seus dados" },
        { n: 5 as const, label: "Resultado" },
      ];

  // Build the link to open the full Visualizador with the current selection pre-filled.
  // Single space → ?src=sim&produto=CODE&space=ID[&w=W&h=H]
  // Multi-space  → ?src=sim&ms=N&p0=…&s0=…[&w0=…&h0=…]…
  function buildVizUrl(): string {
    if (!selectedProduct) return "/visualizador";
    const params = new URLSearchParams({ src: "sim" });

    const parseDimLabel = (label: string) => {
      const m = label.match(/([\d.]+)m\s*[×x]\s*([\d.]+)m/);
      return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]) } : { w: undefined, h: undefined };
    };

    const currentEntry = {
      productCode: selectedProduct.code,
      spaceId: showCustomInput ? (customSpaceText.trim() || "parede") : (selectedSpace?.id ?? "parede"),
      w: dimMode === "lxa" && parseFloat(width) > 0 ? parseFloat(width) : undefined,
      h: dimMode === "lxa" && parseFloat(height) > 0 ? parseFloat(height) : undefined,
    };

    if (savedSpaces.length === 0) {
      params.set("produto", currentEntry.productCode);
      params.set("space", currentEntry.spaceId);
      if (currentEntry.w && currentEntry.h) {
        params.set("w", String(currentEntry.w));
        params.set("h", String(currentEntry.h));
      }
    } else {
      const allEntries = [
        ...savedSpaces.map((sp) => {
          const spEntry = SPACES.find((s) => s.label === sp.label);
          const { w, h } = parseDimLabel(sp.dimLabel);
          return { productCode: sp.productCode, spaceId: spEntry?.id ?? sp.label, w, h };
        }),
        currentEntry,
      ];
      params.set("ms", String(allEntries.length));
      allEntries.forEach((e, i) => {
        params.set(`p${i}`, e.productCode);
        params.set(`s${i}`, e.spaceId);
        if (e.w && e.h) { params.set(`w${i}`, String(e.w)); params.set(`h${i}`, String(e.h)); }
      });
    }

    return `/visualizador?${params.toString()}`;
  }

  // Build SimPrefill[] for the embedded VisualizadorWizard in step 5
  function buildVizPrefills(): SimPrefill[] {
    const parseDimLabel = (label: string) => {
      const m = label.match(/([\d.]+)m\s*[×x]\s*([\d.]+)m/);
      return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]) } : { w: undefined, h: undefined };
    };
    const result: SimPrefill[] = [
      ...savedSpaces.map((sp) => {
        const spEntry = SPACES.find((s) => s.label === sp.label);
        const { w, h } = parseDimLabel(sp.dimLabel);
        return { productCode: sp.productCode, spaceId: spEntry?.id ?? sp.label, w, h };
      }),
    ];
    if (selectedProduct && selectedSpace && selectedSpace.viability !== "no") {
      result.push({
        productCode: selectedProduct.code,
        spaceId: showCustomInput ? (customSpaceText.trim() || "parede") : selectedSpace.id,
        w: dimMode === "lxa" && parseFloat(width) > 0 ? parseFloat(width) : undefined,
        h: dimMode === "lxa" && parseFloat(height) > 0 ? parseFloat(height) : undefined,
      });
    }
    return result;
  }

  // Build the partner-shareable client link
  function buildPartnerLink(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://orbitalrevestimentos.com.br";
    const params = new URLSearchParams();
    if (showCustomInput && customSpaceText.trim()) {
      params.set("space", "custom");
      params.set("customSpace", customSpaceText.trim());
    } else if (selectedSpace) {
      params.set("space", selectedSpace.id);
    }
    if (selectedProduct) params.set("produto", selectedProduct.code);
    params.set("area", m2.toFixed(2));
    params.set("placas", plates.toString());
    if (couponCode) params.set("cupom", couponCode);
    return `${origin}/simulador?${params.toString()}`;
  }

  return (
    <div className="pt-20">

      {/* Full-screen "generating" overlay — the submit sends the WhatsApp/e-mail
          before showing the result, which can take a couple of seconds. Without
          this, the only signal was a tiny "Enviando…" in the corner and the page
          looked frozen. This makes it obvious the site responded and is working. */}
      {simSubmitting && (
        <div className="fixed inset-0 z-[70] bg-[#002045]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 text-center px-6">
          <div className="w-12 h-12 border-2 border-white/25 border-t-[#a1d494] rounded-full animate-spin" />
          <div>
            <p className="text-white font-[var(--font-noto-serif)] text-2xl lg:text-3xl">Gerando seu orçamento…</p>
            <p className="text-white/70 font-[var(--font-inter)] text-sm mt-2">Estamos preparando os detalhes do seu investimento.</p>
          </div>
        </div>
      )}

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
              <button
                onClick={() => stepCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#f3f3f3] transition-colors"
              >
                Iniciar simulação
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
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
              Veja o investimento necessário para transformar o seu espaço.
            </h2>
            <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed max-w-2xl">
              Simule o investimento no PFB Orbital e compare com o MDF ao longo de 10 anos.
              Valores de mão de obra são estimativas de mercado.
            </p>
          </div>

          {/* Step indicator */}
          <div ref={stepRef} className="flex items-center mb-6 overflow-x-auto pb-1 scroll-mt-6">
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
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-2 min-w-[12px] max-w-[60px] ${
                      n < step ? "bg-[#3b6934]" : "bg-[#d8d8d8]"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step content wrapper — used for scroll-into-view centering */}
          <div ref={stepCardRef} className="scroll-mt-6">

          {/* ── Step 1: Space ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="bg-white border border-[#e2e2e2] p-6 lg:p-10">
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Qual espaço você quer revestir?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">
                Selecione o tipo de ambiente.
              </p>

              {/* Viable spaces */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-2">
                {SPACES.filter((s) => s.viability !== "no").map((space) => (
                  <button
                    key={space.id}
                    onClick={() => { setSelectedSpace(space); setShowCustomInput(false); setCustomSpaceText(""); setAmbienteName(""); }}
                    className={`text-left px-3 py-3 min-h-[44px] border text-xs font-semibold font-[var(--font-inter)] transition-all ${
                      selectedSpace?.id === space.id && !showCustomInput
                        ? "border-[#002045] bg-[#002045] text-white"
                        : "border-[#e2e2e2] text-[#43474e] hover:border-[#1a365d] hover:text-[#002045]"
                    }`}
                  >
                    {space.label}
                  </button>
                ))}
                {/* Outro button */}
                <button
                  onClick={() => { setShowCustomInput(true); setSelectedSpace(null); setAmbienteName(""); }}
                  className={`text-left px-3 py-3 min-h-[44px] border text-xs font-semibold font-[var(--font-inter)] transition-all ${
                    showCustomInput
                      ? "border-[#002045] bg-[#002045] text-white"
                      : "border-dashed border-[#c8c8c8] text-[#74777f] hover:border-[#1a365d] hover:text-[#002045]"
                  }`}
                >
                  + Outro
                </button>
              </div>

              {/* Custom space input */}
              {showCustomInput && (() => {
                const custom = classifyCustomSpace(customSpaceText);
                return (
                  <div className="mt-3 mb-4">
                    <input
                      autoFocus
                      type="text"
                      value={customSpaceText}
                      onChange={(e) => setCustomSpaceText(e.target.value)}
                      placeholder="Descreva o espaço — ex: varanda interna, hall de entrada, iate…"
                      className="w-full border border-[#002045] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none placeholder-[#b0b4bc]"
                    />
                    {/* internal: custom.viability used silently for pricing */}
                    {custom && null}
                  </div>
                );
              })()}

              {/* Not-viable grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 mt-4">
                {SPACES.filter((s) => s.viability === "no").map((space) => (
                  <button
                    key={space.id}
                    onClick={() => { setSelectedSpace(space); setShowCustomInput(false); setCustomSpaceText(""); setAmbienteName(""); }}
                    className={`text-left px-3 py-3 min-h-[44px] border text-xs font-semibold font-[var(--font-inter)] transition-all ${
                      selectedSpace?.id === space.id && !showCustomInput
                        ? "border-[#c0392b] bg-[#fff5f5] text-[#c0392b]"
                        : "border-[#e2e2e2] text-[#b0b0b0] hover:border-[#e0b0b0]"
                    }`}
                  >
                    {space.label}
                  </button>
                ))}
              </div>

              {/* Warning for not-viable spaces (preset or custom) */}
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
                      if (r) { setSelectedSpace(r); setShowCustomInput(false); setCustomSpaceText(""); }
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

              {/* Optional ambiente name — shown when a viable space is selected */}
              {selectedSpace && selectedSpace.viability !== "no" && (
                <div className="mb-6">
                  <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                    Nome do ambiente <span className="normal-case tracking-normal font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={ambienteName}
                    onChange={(e) => setAmbienteName(e.target.value)}
                    placeholder={`Ex: Sala de Estar, Banheiro do Casal, Escritório…`}
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] placeholder-[#b0b4bc]"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  ref={nextBtnRef}
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
                  const inactiveBg =
                    linha === "Classic"    ? "bg-[#f7f6f3]" :
                    linha === "Brilliance" ? "bg-[#f4f6f9]" :
                                            "bg-[#f8f4ef]";
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
                          ? "border-[#002045] bg-[#eef2fb]"
                          : `border-[#e2e2e2] hover:border-[#1a365d] ${inactiveBg}`
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
                          {info.price.toLocaleString("pt-BR")} / placa
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
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-[#002045] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 min-[400px]:grid-cols-4">
                    {products.filter((p) => p.linha === selectedLine).map((product) => {
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
                            className="relative w-full overflow-hidden bg-[#f7f7f5] block"
                          >
                            <div className="relative w-full" style={{ aspectRatio: "812/988" }}>
                              <img
                                src={product.image_path}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-contain"
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
                  )}
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

          {/* ── Ambientes Review ── shown between step 3 and step 4 */}
          {showAmbientsReview && step === 3 && selectedSpace && selectedProduct && (
            <div ref={stepCardRef} className="bg-white border border-[#e2e2e2] p-6 lg:p-10">
              <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
                {savedSpaces.length + 1} ambiente{savedSpaces.length + 1 !== 1 ? "s" : ""} no seu projeto
              </p>
              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Revisar ambientes
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">
                Adicione mais ambientes ou continue para preencher seus dados.
              </p>

              <div className="border border-[#e2e2e2] mb-6 divide-y divide-[#f0f0f0]">
                {savedSpaces.map((sp, i) => {
                  const isEditing = editingSpaceIdx === i;
                  // derive edit plate count for preview
                  const editPlates = isEditing
                    ? editSpaceDimMode === "lxa" && parseFloat(editSpaceWidth) > 0 && parseFloat(editSpaceHeight) > 0
                      ? orbitalPlatesForDimensions(parseFloat(editSpaceWidth), parseFloat(editSpaceHeight))
                      : parseFloat(editSpaceM2) > 0
                      ? Math.ceil(parseFloat(editSpaceM2) / PLATE_M2)
                      : 0
                    : sp.plates;

                  function startEdit() {
                    // detect dim mode from stored dimLabel
                    const isLxa = /×/.test(sp.dimLabel);
                    setEditSpaceDimMode(isLxa ? "lxa" : "m2");
                    if (isLxa) {
                      const parts = sp.dimLabel.replace(/m/g, "").split("×").map((s) => s.trim());
                      setEditSpaceWidth(parts[0] ?? "");
                      setEditSpaceHeight(parts[1] ?? "");
                      setEditSpaceM2("");
                    } else {
                      setEditSpaceWidth("");
                      setEditSpaceHeight("");
                      setEditSpaceM2(sp.dimLabel.replace(/\s*m²/, "").trim());
                    }
                    setEditSpaceLabel(sp.label);
                    setEditingSpaceIdx(i);
                  }

                  function saveEdit() {
                    const newLabel = editSpaceLabel.trim() || sp.label;
                    let newM2 = 0;
                    let newDimLabel = sp.dimLabel;
                    if (editSpaceDimMode === "lxa" && parseFloat(editSpaceWidth) > 0 && parseFloat(editSpaceHeight) > 0) {
                      newM2 = parseFloat(editSpaceWidth) * parseFloat(editSpaceHeight);
                      newDimLabel = `${editSpaceWidth}m × ${editSpaceHeight}m`;
                    } else if (parseFloat(editSpaceM2) > 0) {
                      newM2 = parseFloat(editSpaceM2);
                      newDimLabel = `${newM2.toFixed(2)} m²`;
                    } else {
                      // no valid dims entered — just update label
                      setSavedSpaces(prev => prev.map((s, idx) => idx === i ? { ...s, label: newLabel } : s));
                      setEditingSpaceIdx(null);
                      return;
                    }
                    const newPlates = editSpaceDimMode === "lxa" && parseFloat(editSpaceWidth) > 0 && parseFloat(editSpaceHeight) > 0
                      ? orbitalPlatesForDimensions(parseFloat(editSpaceWidth), parseFloat(editSpaceHeight))
                      : Math.ceil(newM2 / PLATE_M2);
                    const moRate = orbitalMOPerPlate(newPlates, sp.viability === "complex");
                    const newMaterialTotal = newPlates * sp.pricePerPlate;
                    const newMOTotal = moRate * newPlates;
                    const discAmt = couponData
                      ? couponData.discount_type === "percentage"
                        ? Math.round(newMaterialTotal * couponData.discount_value / 100)
                        : Math.min(couponData.discount_value, newMaterialTotal)
                      : 0;
                    const newMaterialDiscounted = newMaterialTotal - discAmt;
                    setSavedSpaces(prev => prev.map((s, idx) =>
                      idx === i
                        ? { ...s, label: newLabel, dimLabel: newDimLabel, m2: newM2, plates: newPlates, materialTotal: newMaterialTotal, materialDiscounted: newMaterialDiscounted, moTotal: newMOTotal, total: newMaterialDiscounted + newMOTotal }
                        : s
                    ));
                    setEditingSpaceIdx(null);
                  }

                  return (
                  <div key={sp.key} className="divide-y divide-[#f0f0f0]">
                    {!isEditing ? (
                      <div className="flex items-center gap-4 px-4 py-4">
                        <span className="w-6 h-6 rounded-full bg-[#3b6934] text-white text-[10px] font-bold font-[var(--font-inter)] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{sp.label}</p>
                          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                            {sp.productName} · {sp.productCode} · {sp.dimLabel} · <strong>{sp.plates} placa{sp.plates !== 1 ? "s" : ""}</strong>
                          </p>
                        </div>
                        <button onClick={startEdit} className="text-[#002045] hover:text-[#3b6934] flex-shrink-0 p-1" title="Editar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => setSavedSpaces(prev => prev.filter((_, idx) => idx !== i))} className="text-[#cc0000] hover:text-[#ff0000] text-sm flex-shrink-0 p-1" title="Remover">✕</button>
                      </div>
                    ) : (
                      <div className="px-4 py-4 bg-[#f9fbff]">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-full bg-[#3b6934] text-white text-[10px] font-bold font-[var(--font-inter)] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="text-[#002045] text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)]">Editar ambiente</span>
                        </div>
                        {/* Name */}
                        <div className="mb-3">
                          <label className="block text-[10px] text-[#74777f] uppercase tracking-wider font-[var(--font-inter)] mb-1">Nome do ambiente</label>
                          <input
                            type="text"
                            value={editSpaceLabel}
                            onChange={(e) => setEditSpaceLabel(e.target.value)}
                            className="w-full border border-[#c8cdd5] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          />
                        </div>
                        {/* Dim mode toggle */}
                        <div className="mb-3">
                          <label className="block text-[10px] text-[#74777f] uppercase tracking-wider font-[var(--font-inter)] mb-1">Dimensões</label>
                          <div className="flex gap-2 mb-2">
                            <button type="button" onClick={() => setEditSpaceDimMode("lxa")} className={`px-3 py-1 text-[11px] font-bold font-[var(--font-inter)] border ${editSpaceDimMode === "lxa" ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#002045] border-[#c8cdd5] hover:border-[#002045]"}`}>Larg × Alt</button>
                            <button type="button" onClick={() => setEditSpaceDimMode("m2")} className={`px-3 py-1 text-[11px] font-bold font-[var(--font-inter)] border ${editSpaceDimMode === "m2" ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#002045] border-[#c8cdd5] hover:border-[#002045]"}`}>m²</button>
                          </div>
                          {editSpaceDimMode === "lxa" ? (
                            <div className="flex gap-2 items-center">
                              <input type="number" min="0" step="0.1" value={editSpaceWidth} onChange={(e) => setEditSpaceWidth(e.target.value)} placeholder="Largura (m)" className="flex-1 border border-[#c8cdd5] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                              <span className="text-[#74777f] text-sm">×</span>
                              <input type="number" min="0" step="0.1" value={editSpaceHeight} onChange={(e) => setEditSpaceHeight(e.target.value)} placeholder="Altura (m)" className="flex-1 border border-[#c8cdd5] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                            </div>
                          ) : (
                            <input type="number" min="0" step="0.1" value={editSpaceM2} onChange={(e) => setEditSpaceM2(e.target.value)} placeholder="Área total (m²)" className="w-full border border-[#c8cdd5] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                          )}
                          {editPlates > 0 && (
                            <p className="text-[10px] text-[#3b6934] mt-1.5 font-[var(--font-inter)]">{editPlates} placa{editPlates !== 1 ? "s" : ""}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="bg-[#002045] text-white text-[11px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d]">Salvar</button>
                          <button onClick={() => setEditingSpaceIdx(null)} className="border border-[#c8cdd5] text-[#43474e] text-[11px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:border-[#002045]">Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* Current (pending) space */}
                <div className="flex items-center gap-4 px-4 py-4 bg-[#f9fbff]">
                  <span className="w-6 h-6 rounded-full bg-[#002045] text-white text-[10px] font-bold font-[var(--font-inter)] flex items-center justify-center flex-shrink-0">{savedSpaces.length + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{ambienteName.trim() || selectedSpace.label}</p>
                    <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                      {selectedProduct.name} · {selectedProduct.code}
                      {dimMode === "lxa" && width && height ? ` · ${width}m × ${height}m` : m2 > 0 ? ` · ${m2.toFixed(2)} m²` : ""}
                      {plates > 0 && ` · ${plates} placa${plates !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <button
                  onClick={() => {
                    setSavedSpaces(prev => [...prev, {
                      key: `space-${Date.now()}`,
                      label: ambienteName.trim() || selectedSpace!.label,
                      productName: selectedProduct!.name,
                      productCode: selectedProduct!.code,
                      imagePath: selectedProduct!.image_path ?? "",
                      linha: selectedProduct!.linha,
                      dimLabel: dimMode === "lxa" && width && height ? `${width}m × ${height}m` : `${m2.toFixed(2)} m²`,
                      m2,
                      plates,
                      pricePerPlate,
                      materialTotal: orbMaterialTotal,
                      materialDiscounted: orbMaterialDiscounted,
                      moTotal: orbMOTotal,
                      total: orbTotal,
                      viability: selectedSpace!.viability === "complex" ? "complex" : "simple",
                      ...currentMeasurement(),
                    }]);
                    setSelectedSpace(null);
                    setAmbienteName("");
                    setCustomSpaceText("");
                    setShowCustomInput(false);
                    setSelectedLine(null);
                    setSelectedProduct(null);
                    setWidth("");
                    setHeight("");
                    setSqmInput("");
                    setDimMode("lxa");
                    setPlatesOverride(null);
                    setShowAmbientsReview(false);
                    goToStep(1);
                  }}
                  className="inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] px-5 py-3 hover:bg-[#002045] hover:text-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Adicionar outro ambiente
                </button>

                <button
                  onClick={() => { setShowAmbientsReview(false); goToStep(4); }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 bg-[#002045] text-white hover:bg-[#1a365d] transition-colors"
                >
                  Continuar com meus dados
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Dimensions ────────────────────────────────────────── */}
          {step === 3 && !showAmbientsReview && (
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
                      <img src={selectedProduct.image_path} alt={selectedProduct.name} className="absolute inset-0 w-full h-full object-cover" />
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
                      type="text"
                      inputMode="decimal"
                      value={width}
                      onChange={(e) => setWidth(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                      placeholder="ex: 3.5"
                      className="w-full sm:w-32 border border-[#e2e2e2] px-4 py-3 text-base font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Altura (m)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={height}
                      onChange={(e) => setHeight(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                      placeholder="ex: 2.8"
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
                    type="text"
                    inputMode="decimal"
                    value={sqmInput}
                    onChange={(e) => setSqmInput(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                    placeholder="ex: 12"
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

              {/* Sanity check: warn on likely typos before letting the client proceed */}
              {measurementWarning && (
                <div className="mb-5 border border-[#e0b23c] bg-[#fdf6e3] px-4 py-3">
                  <p className="text-[#8a5a12] text-sm font-[var(--font-inter)] font-semibold">⚠ Confira a medida</p>
                  <p className="text-[#8a5a12] text-xs font-[var(--font-inter)] mt-0.5">{measurementWarning}</p>
                  <label className="flex items-center gap-2 mt-2.5 text-[#43474e] text-xs font-[var(--font-inter)] cursor-pointer">
                    <input type="checkbox" checked={measureAck} onChange={(e) => setMeasureAck(e.target.checked)} />
                    Confirmo que a medida está correta
                  </label>
                </div>
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
                {partnerMode ? (
                  <button
                    onClick={() => { if (canProceedMeasure) setPartnerLinkGenerated(true); }}
                    disabled={!canProceedMeasure}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
                      canProceedMeasure
                        ? "bg-[#3b6934] text-white hover:bg-[#2d5228]"
                        : "bg-[#e2e2e2] text-[#aaaaaa] cursor-not-allowed"
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    Gerar link para cliente
                  </button>
                ) : (
                  <button
                    onClick={() => { if (canProceedMeasure) setShowAmbientsReview(true); }}
                    disabled={!canProceedMeasure}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
                      canProceedMeasure
                        ? "bg-[#002045] text-white hover:bg-[#1a365d]"
                        : "bg-[#e2e2e2] text-[#aaaaaa] cursor-not-allowed"
                    }`}
                  >
                    Próximo
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* ── Partner link panel ── shown after "Gerar link" is clicked */}
              {partnerMode && partnerLinkGenerated && canCalculate && selectedProduct && selectedSpace && (
                <div className="mt-6 border border-[#3b6934]/40 bg-[#f2faf0]">
                  <div className="px-5 py-4 border-b border-[#3b6934]/20">
                    <p className="text-[#3b6934] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-0.5">
                      Link gerado com sucesso
                    </p>
                    <p className="text-[#2d5228] text-sm font-[var(--font-inter)]">
                      Envie este link ao cliente. Ele verá a simulação configurada por você e só precisará preencher os dados.
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="px-5 py-4 border-b border-[#3b6934]/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[#74777f] text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-0.5">Espaço</p>
                      <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{selectedSpace.label}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-0.5">Modelo</p>
                      <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{selectedProduct.name}</p>
                      <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{selectedProduct.code}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-0.5">Área</p>
                      <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{m2.toFixed(2)} m²</p>
                      <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{plates} placa{plates !== 1 ? "s" : ""}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-0.5">Estimativa material</p>
                      {discountAmount > 0 ? (
                        <>
                          <p className="text-[#3b6934] text-sm font-bold font-[var(--font-inter)]">{fmt(orbMaterialDiscounted)}</p>
                          <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] line-through">{fmt(orbMaterialTotal)}</p>
                        </>
                      ) : (
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{fmt(orbMaterialTotal)}</p>
                      )}
                    </div>
                  </div>

                  {/* Link copy */}
                  <div className="px-5 py-4">
                    <p className="text-[#74777f] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-2">Link do cliente</p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={buildPartnerLink()}
                        className="flex-1 min-w-0 border border-[#3b6934]/30 bg-white px-3 py-2.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none select-all truncate"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(buildPartnerLink());
                          setPartnerLinkCopied(true);
                          setTimeout(() => setPartnerLinkCopied(false), 2500);
                        }}
                        className={`flex-shrink-0 px-4 py-2.5 text-xs tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] transition-colors ${
                          partnerLinkCopied
                            ? "bg-[#3b6934] text-white"
                            : "bg-[#002045] text-white hover:bg-[#1a365d]"
                        }`}
                      >
                        {partnerLinkCopied ? "✓ Copiado!" : "Copiar link"}
                      </button>
                    </div>
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-2">
                      {couponCode ? `Cupom ${couponCode} já incluído no link. O cliente não precisa digitar nada.` : "Selecione mais opções ou copie o link acima."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Seus dados (required) ──────────────────────────────── */}
          {step === 4 && (
            <div className="bg-white border border-[#e2e2e2] p-6 lg:p-10">

              {/* Banner shown when client arrives via a partner-generated link,
                  or is editing a previously saved orçamento */}
              {(fromPartnerLink || fromQuoteEdit) && (
                <div className="flex items-start gap-3 bg-[#eef6ff] border border-[#b3d4f5] px-4 py-3 mb-6">
                  <svg className="flex-shrink-0 mt-0.5 text-[#1a5fa8]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                  </svg>
                  <p className="text-[#1a3c6e] text-xs font-[var(--font-inter)] leading-relaxed">
                    {fromQuoteEdit ? (
                      <>
                        <strong>Editando seu orçamento salvo.</strong>{" "}
                        Ajuste o que precisar e confirme seus dados para gerar uma versão atualizada.
                      </>
                    ) : (
                      <>
                        <strong>Projeto configurado pelo seu consultor Orbital.</strong>{" "}
                        Preencha seus dados abaixo para receber a simulação detalhada por e-mail.
                      </>
                    )}
                  </p>
                </div>
              )}

              <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">
                Para quem é este projeto?
              </h3>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-6">
                Preencha seus dados para receber o orçamento detalhado por e-mail.
              </p>

              <div className="max-w-md space-y-5 mb-8">
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Nome completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.getElementById("contato-email-input") as HTMLInputElement)?.focus(); } }}
                    placeholder="ex: João Silva"
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contato-email-input"
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.getElementById("contato-phone-input") as HTMLInputElement)?.focus(); } }}
                    placeholder="ex: joao@email.com"
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                  />
                  {clientEmail.trim().length > 0 && !validEmail ? (
                    <p className="text-red-500 text-[10px] font-[var(--font-inter)] mt-1.5">
                      Insira um e-mail válido (ex: joao@email.com)
                    </p>
                  ) : (
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1.5">
                      Você receberá o orçamento detalhado e acompanhamento por e-mail.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contato-phone-input"
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    onBlur={() => { void captureSession(); }}
                    placeholder="ex: 92988150149"
                    maxLength={20}
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
                  />
                  <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1.5">
                    Um consultor poderá entrar em contato pelo WhatsApp.
                  </p>
                </div>
              </div>

              {/* Coupon — moved from step 5 */}
              <div className="max-w-md mt-6 pt-6 border-t border-[#e2e2e2]">
                <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                  {fromPartnerLink ? "Cupom do consultor" : "Código de parceiro (opcional)"}
                </p>
                {fromPartnerLink ? (
                  <div className="flex items-center gap-3 bg-[#f0f9eb] border border-[#3b6934]/40 px-4 py-3">
                    <svg className="flex-shrink-0 text-[#3b6934]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    <div>
                      <p className="text-[#3b6934] text-sm font-bold font-[var(--font-inter)] tracking-widest">{couponCode}</p>
                      <p className="text-[#3b6934]/80 text-[10px] font-[var(--font-inter)] mt-0.5">
                        {couponData ? "Desconto aplicado no material" : couponValidating ? "Validando cupom..." : "Cupom aplicado pelo consultor"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(""); }}
                        placeholder="ex: ARQLIMA10"
                        className="flex-1 border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] uppercase focus:outline-none focus:border-[#002045] transition-colors tracking-widest"
                      />
                      {couponCode && !couponData && (
                        <button onClick={validateCoupon} disabled={couponValidating}
                          className="px-4 py-2.5 bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] hover:bg-[#1a365d] transition-colors disabled:opacity-50 whitespace-nowrap">
                          {couponValidating ? "..." : "Validar"}
                        </button>
                      )}
                    </div>
                    {couponError && <p className="text-red-600 text-xs font-[var(--font-inter)] mt-1.5">{couponError}</p>}
                    {couponData && (
                      <div className="mt-2 bg-[#f0f9eb] border border-[#3b6934]/30 px-3 py-2.5">
                        <p className="text-[#3b6934] text-xs font-bold font-[var(--font-inter)]">
                          ✓ Cupom <span className="tracking-widest">{couponData.coupon_code}</span> aplicado!
                        </p>
                      </div>
                    )}
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1.5">Não tem código? Sem problema — avance sem ele.</p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8">
                <button
                  onClick={() => goToStep(3)}
                  className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Voltar
                </button>
                <button
                  onClick={() => { if (canAdvance4 && !simSubmitting) void handleSubmitAndShow(); }}
                  disabled={!canAdvance4 || simSubmitting}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 transition-colors ${
                    canAdvance4 && !simSubmitting
                      ? "bg-[#002045] text-white hover:bg-[#1a365d]"
                      : "bg-[#e2e2e2] text-[#aaaaaa] cursor-not-allowed"
                  }`}
                >
                  {simSubmitting ? "Calculando…" : "Ver meu investimento"}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5 (legacy "Ver no ambiente") — now opt-in only; the result
                section renders instead once the client submits. Kept for any
                direct navigation but hidden when the result is shown. ───────── */}
          {step === 5 && !showResult && (
            <div className="bg-white border border-[#e2e2e2]">
              <div className="px-6 pt-6 lg:px-10 lg:pt-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[#f0f0ee] pb-5">
                <div>
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-1">
                    Visualize no seu ambiente
                  </h3>
                  <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
                    Opcional — envie uma foto e a IA aplica os acabamentos antes de ver a simulação.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => goToStep(4)}
                    className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Voltar
                  </button>
                  <button
                    onClick={handleSubmitAndShow}
                    disabled={simSubmitting}
                    className="inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#002045] hover:underline transition-colors disabled:opacity-50"
                  >
                    {simSubmitting ? "Enviando..." : "Pular etapa →"}
                  </button>
                </div>
              </div>
              <div className="px-4 sm:px-6 lg:px-10 pb-8">
                <VisualizadorWizard
                  products={products}
                  loadingProducts={loadingProducts}
                  simPrefills={buildVizPrefills()}
                  embeddedMode
                  prefilledLeadName={clientName}
                  prefilledLeadPhone={clientPhone}
                  onComplete={(rid) => {
                    if (rid) vizRenderId.current = rid;
                    void handleSubmitAndShow();
                  }}
                  onSkip={handleSubmitAndShow}
                />
              </div>
            </div>
          )}

          </div>{/* end stepCardRef wrapper */}

          {/* ── Results panel ─────────────────────────────────────────────── */}
          {showResult && selectedProduct && selectedSpace && m2 > 0 && (
            <div className="mt-0" ref={resultsRef}>

              {simSubmitted && clientEmail && (
                <div className="bg-[#f0f9eb] border border-[#3b6934]/40 px-5 py-4 flex flex-col gap-3">
                  <div className="flex gap-3 items-center">
                    <svg className="flex-shrink-0 text-[#3b6934]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <p className="text-[#3b6934] text-xs font-[var(--font-inter)]">
                      <strong>Sua simulação foi salva.</strong> Enviamos uma confirmação para <strong>{clientEmail}</strong> e você poderá continuar este orçamento depois. Para receber o orçamento formalizado em PDF, use o botão abaixo.
                    </p>
                  </div>
                  {quoteShareUrl && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-1 border-t border-[#3b6934]/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#3b6934] text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] mb-1">Link para compartilhar</p>
                        <p className="text-[#3b6934]/70 text-[11px] font-[var(--font-inter)] truncate">{quoteShareUrl}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(quoteShareUrl);
                          trackFunnel("link_copiado");
                          setQuoteUrlCopied(true);
                          setTimeout(() => setQuoteUrlCopied(false), 2500);
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#3b6934] text-white text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#2e5229] transition-colors"
                      >
                        {quoteUrlCopied ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            Copiado!
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copiar link
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-[#fffbea] border border-[#e6c84a] px-5 py-4 flex gap-3 items-start">
                <svg className="flex-shrink-0 mt-0.5 text-[#a07a00]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                <p className="text-[#6b5000] text-xs font-[var(--font-inter)] leading-relaxed">
                  <strong>Simulação para referência apenas.</strong> Os valores abaixo são estimativas de investimento.
                  A Orbital vende exclusivamente o material — não realizamos instalação.
                  O valor de mão de obra é uma estimativa de mercado.
                </p>
              </div>

              {/* Summary bar */}
              <div className="bg-[#002045] px-5 py-4 flex flex-wrap items-center gap-3 border border-[#2d4f7f] border-b-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden">
                    <img src={selectedProduct.image_path} alt={selectedProduct.name} className="absolute inset-0 w-full h-full object-cover" />
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

              {/* Multi-space summary */}
              {savedSpaces.length > 0 && (
                <div className="bg-white border border-[#e2e2e2] border-t-0 px-5 sm:px-8 py-6">
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-4">
                    Todos os ambientes simulados
                  </p>
                  <div className="space-y-0 border border-[#e2e2e2]">
                    {savedSpaces.map((sp, i) => {
                      const isSelected = resumeIdx === i;
                      return (
                        <div key={sp.key}
                          onClick={() => setResumeIdx(isSelected ? null : i)}
                          className={`flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0] last:border-b-0 cursor-pointer transition-colors ${isSelected ? "bg-[#eef2fb] border-l-2 border-l-[#002045]" : "hover:bg-[#fafafa]"}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[#86a0cd] text-[10px] font-bold font-[var(--font-inter)] w-5 flex-shrink-0">{i + 1}</span>
                            {sp.imagePath && (
                              <img src={sp.imagePath} alt={sp.productName} className="w-9 h-9 object-cover flex-shrink-0 border border-[#e2e2e2]" />
                            )}
                            <div className="min-w-0">
                              <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] truncate">{sp.label}</p>
                              <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{sp.productName} · {sp.dimLabel} · {sp.plates} placas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              {couponData && sp.materialDiscounted < sp.materialTotal && (
                                <p className="text-[#74777f] text-[9px] line-through font-[var(--font-inter)]">{fmt(sp.materialTotal)}</p>
                              )}
                              <span className={`text-sm font-semibold font-[var(--font-inter)] ${couponData && sp.materialDiscounted < sp.materialTotal ? "text-[#3b6934]" : "text-[#002045]"}`}>{fmt(sp.materialDiscounted)}</span>
                            </div>
                            {isSelected
                              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                            }
                            <button
                              onClick={e => { e.stopPropagation(); editSavedSpace(i); }}
                              className="w-8 h-8 flex items-center justify-center text-[#43474e] hover:text-[#002045] hover:bg-[#eef2fb] transition-colors"
                              title="Editar ambiente"
                              aria-label={`Editar ${sp.label}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); removeSavedSpace(i); }}
                              className="w-8 h-8 flex items-center justify-center text-[#cc0000] hover:text-white hover:bg-[#cc0000] text-sm font-bold font-[var(--font-inter)] transition-colors"
                              title="Remover ambiente"
                              aria-label={`Remover ${sp.label}`}
                            >✕</button>
                          </div>
                        </div>
                      );
                    })}
                    {/* Current space row */}
                    {(() => {
                      const isSelected = resumeIdx === null;
                      return (
                        <div onClick={() => setResumeIdx(null)}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${isSelected ? "bg-[#eef2fb] border-l-2 border-l-[#002045]" : "bg-[#f9fbff] hover:bg-[#f0f4fa]"}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[#86a0cd] text-[10px] font-bold font-[var(--font-inter)] w-5 flex-shrink-0">{savedSpaces.length + 1}</span>
                            {selectedProduct.image_path && (
                              <img src={selectedProduct.image_path} alt={selectedProduct.name} className="w-9 h-9 object-cover flex-shrink-0 border border-[#e2e2e2]" />
                            )}
                            <div className="min-w-0">
                              <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] truncate">{selectedSpace.label}</p>
                              <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{selectedProduct.name} · {dimMode === "lxa" && width && height ? `${width}m × ${height}m` : `${m2.toFixed(2)} m²`} · {plates} placas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{fmt(orbMaterialDiscounted)}</span>
                            {isSelected
                              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                            }
                            <button
                              onClick={e => { e.stopPropagation(); editCurrentSpace(); }}
                              className="w-8 h-8 flex items-center justify-center text-[#43474e] hover:text-[#002045] hover:bg-[#eef2fb] transition-colors"
                              title="Editar ambiente"
                              aria-label={`Editar ${selectedSpace.label}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); removeCurrentSpace(); }}
                              className="w-8 h-8 flex items-center justify-center text-[#cc0000] hover:text-white hover:bg-[#cc0000] text-sm font-bold font-[var(--font-inter)] transition-colors"
                              title="Remover ambiente"
                              aria-label={`Remover ${selectedSpace.label}`}
                            >✕</button>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Grand total row */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#002045]">
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-[10px] font-bold font-[var(--font-inter)] uppercase tracking-wider">Total — material</span>
                      </div>
                      <span className="text-white text-base font-bold font-[var(--font-noto-serif)]">{fmt(grandMaterialDiscounted)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Input summary — switches between saved spaces and current space */}
              {(() => {
                const isSaved = resumeIdx !== null && resumeIdx < savedSpaces.length;
                const sp = isSaved ? savedSpaces[resumeIdx!] : null;
                const resumeLabel = sp ? sp.label : selectedSpace.label;
                const resumeProductName = sp ? sp.productName : selectedProduct.name;
                const resumeProductCode = sp ? sp.productCode : selectedProduct.code;
                const resumeLinha = sp ? sp.linha : selectedProduct.linha;
                const resumeDimLabel = sp ? sp.dimLabel : (dimMode === "lxa" && width && height ? `${width}m × ${height}m` : `${m2.toFixed(2)} m²`);
                const resumeM2 = sp ? sp.m2 : m2;
                const resumePlates = sp ? sp.plates : plates;
                const resumeTotal = sp ? sp.materialDiscounted : orbMaterialDiscounted;
                const resumeTotalFull = sp ? sp.materialTotal : orbMaterialTotal;
                const resumeImg = sp ? sp.imagePath : (selectedProduct.image_path ?? "");
                const hasDiscount = sp
                  ? sp.materialDiscounted < sp.materialTotal
                  : discountAmount > 0;
                return (
              <div className="bg-white border border-[#e2e2e2] border-t-0 px-5 sm:px-8 py-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)]">
                    Resumo — {resumeLabel}
                  </p>
                  {resumeImg && (
                    <img src={resumeImg} alt={resumeProductName} className="w-10 h-10 object-cover border border-[#e2e2e2]" />
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Espaço</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{resumeLabel}</p>
                  </div>
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Acabamento</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{resumeProductName}</p>
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{resumeProductCode} · {resumeLinha}</p>
                  </div>
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Dimensões / Área</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{resumeDimLabel}</p>
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{resumeM2.toFixed(2)} m²</p>
                  </div>
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Qtd. recomendada</p>
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{resumePlates} placa{resumePlates !== 1 ? "s" : ""}</p>
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">cobre ~{(resumePlates * PLATE_M2).toFixed(2)} m²</p>
                  </div>
                  <div>
                    <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Investimento em material</p>
                    {hasDiscount ? (
                      <>
                        <p className="text-[#74777f] text-sm line-through font-[var(--font-inter)]">{fmt(resumeTotalFull)}</p>
                        <p className="text-[#3b6934] text-sm font-bold font-[var(--font-inter)]">{fmt(resumeTotal)}</p>
                        <p className="text-[#3b6934] text-[10px] font-[var(--font-inter)]">cupom {couponData?.coupon_code}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{fmt(resumeTotal)}</p>
                        <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{resumeTotalFull > 0 ? Math.round(resumeTotalFull / resumePlates).toLocaleString("pt-BR") : "—"}/placa</p>
                      </>
                    )}
                  </div>
                  {clientName && (
                    <div>
                      <p className="text-[#74777f] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">Cliente</p>
                      <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{clientName}</p>
                      {clientEmail && <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{clientEmail}</p>}
                    </div>
                  )}
                </div>
              </div>
              );
              })()}

              {/* ── Composição do investimento (motor central) ─────────────────
                  Placas / Cola PU / Frete / Desconto / Total em linhas separadas,
                  seguido de cards de condição de pagamento selecionáveis. Tudo vem
                  de `pricing` (POST /api/orcamento/pricing) — fonte única. */}
              {pricing && (
                <div className="bg-white border border-[#e2e2e2] border-t-0 px-5 sm:px-8 py-6">
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-4">
                    Composição do investimento
                  </p>

                  {pricing.warnings.length > 0 && (
                    <div className="mb-4 bg-[#fffbea] border border-[#e6c84a] px-4 py-2.5">
                      {pricing.warnings.map((w, i) => (
                        <p key={i} className="text-[#6b5000] text-[11px] font-[var(--font-inter)]">{w}</p>
                      ))}
                    </div>
                  )}

                  <div className="border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
                    {/* Placas */}
                    <div className="flex items-start justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">Placas PFB</p>
                        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                          {pricing.plates} × {fmt(pricing.pricePerPlate)}
                        </p>
                      </div>
                      <span className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] flex-shrink-0">{fmt(pricing.platesSubtotal)}</span>
                    </div>

                    {/* Cola PU */}
                    {pricing.colaAvailable && pricing.colaTubos > 0 && (
                      <div className="flex items-start justify-between px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">Cola PU recomendada</p>
                          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                            {pricing.colaTubos} tubo{pricing.colaTubos !== 1 ? "s" : ""} × {fmt(pricing.colaUnitPrice)}
                          </p>
                          <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-0.5 leading-snug">
                            ~1,5 tubo por placa para uma fixação mais segura e durável no clima de Manaus.
                          </p>
                        </div>
                        <span className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] flex-shrink-0">{fmt(pricing.colaSubtotal)}</span>
                      </div>
                    )}

                    {/* Frete */}
                    <div className="flex items-start justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">Frete</p>
                        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                          {pricing.frete.free
                            ? "Grátis para este orçamento (≥ 5 placas)"
                            : pricing.frete.estimated
                              ? "Estimado — confirmado pelo CEP na formalização"
                              : "Confirmado pelo CEP"}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold font-[var(--font-inter)] flex-shrink-0 ${pricing.frete.free ? "text-[#3b6934]" : "text-[#002045]"}`}>
                        {pricing.frete.free ? "Grátis" : fmt(pricing.frete.value)}
                      </span>
                    </div>

                    {/* Desconto à vista (só quando aplicável) */}
                    {pricing.discount.eligible && pricing.discount.amount > 0 && (
                      <div className="flex items-start justify-between px-4 py-3 bg-[#f0f9eb]">
                        <div className="min-w-0">
                          <p className="text-[#3b6934] text-sm font-semibold font-[var(--font-inter)]">Desconto à vista</p>
                          <p className="text-[#3b6934]/80 text-[11px] font-[var(--font-inter)]">
                            {pricing.discount.pct}% no PIX ou espécie (sobre as placas)
                          </p>
                        </div>
                        <span className="text-[#3b6934] text-sm font-semibold font-[var(--font-inter)] flex-shrink-0">− {fmt(pricing.discount.amount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Condições de pagamento — cards selecionáveis */}
                  {pricing.paymentOptions.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">
                        Condições de pagamento
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {pricing.paymentOptions.map((opt) => {
                          const active = selectedPayment === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => { setSelectedPayment(opt.id); trackFunnel("pagamento_selecionado", { id: opt.id }); }}
                              aria-pressed={active}
                              className={`text-left px-4 py-3 border transition-colors ${active ? "border-[#002045] bg-[#eef2fb] ring-1 ring-[#002045]" : "border-[#e2e2e2] bg-white hover:border-[#86a0cd]"}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[#002045] text-sm font-bold font-[var(--font-inter)]">{opt.label}</span>
                                <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? "border-[#002045] bg-[#002045]" : "border-[#c4c4c4]"}`}>
                                  {active && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                                </span>
                              </div>
                              {opt.id === "pix" ? (
                                <p className="text-[#3b6934] text-[11px] font-semibold font-[var(--font-inter)] mt-1">
                                  {opt.discountPct}% de desconto · economize {fmt(opt.discountAmount ?? 0)}
                                </p>
                              ) : (
                                <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-1">
                                  até {opt.installments}x de {fmt(opt.installmentValue ?? 0)} sem juros
                                </p>
                              )}
                              <p className="text-[#002045] text-base font-bold font-[var(--font-noto-serif)] mt-1">{fmt(opt.total)}</p>
                            </button>
                          );
                        })}
                      </div>
                      {grandPlates < 2 && (
                        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-2">
                          Condições especiais de pagamento disponíveis a partir de 2 placas.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Total conforme condição selecionada */}
                  {(() => {
                    const sel = pricing.paymentOptions.find((o) => o.id === selectedPayment) ?? pricing.paymentOptions[0];
                    const total = sel?.total ?? pricing.totalFull;
                    return (
                      <div className="mt-5 flex items-center justify-between gap-3 bg-[#002045] px-4 sm:px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-white/60 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)]">
                            Total {sel ? `· ${sel.label}` : ""}
                          </p>
                          {sel?.id === "cartao" && sel.installments && (
                            <p className="text-[#86a0cd] text-[11px] font-[var(--font-inter)] mt-0.5">{sel.installments}x de {fmt(sel.installmentValue ?? 0)} sem juros</p>
                          )}
                        </div>
                        <span className="text-white text-xl sm:text-2xl font-bold font-[var(--font-noto-serif)] whitespace-nowrap flex-shrink-0">{fmt(total)}</span>
                      </div>
                    );
                  })()}

                  {/* CTA principal — formalização */}
                  <button
                    type="button"
                    onClick={() => { setFormalizeOpen(true); trackFunnel("cta_formalizacao_clicado"); trackFunnel("formalizacao_iniciada"); }}
                    className="mt-4 w-full bg-[#3b6934] hover:bg-[#2e5229] text-white text-sm tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    Receber orçamento formalizado em PDF
                  </button>
                  <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] text-center mt-2">
                    Informe o endereço de entrega e receba o documento completo pelo WhatsApp.
                  </p>
                </div>
              )}

              {/* PFB Attribute strip — 4 cards on mobile (2×2), 6 cards on desktop */}
              <div className="bg-white border border-[#e2e2e2] border-t-0 px-5 sm:px-8 py-5">
                {/* Mobile: 4 combined cards in 2×2 grid */}
                <div className="grid grid-cols-2 gap-2 md:hidden">
                  {[
                    {
                      label: "Resistente à:",
                      desc: "Água, Umidade & Mofo",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Anti-cupim &",
                      desc: "Não propaga Chamas",
                      labelDesc: true,
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                      ),
                    },
                    {
                      label: "Pronta-entrega",
                      desc: "em Manaus",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      ),
                    },
                    {
                      label: "Instalação",
                      desc: "Rápida & Limpa",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      ),
                    },
                  ].map(({ label, icon, desc, labelDesc }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-1.5 p-2.5 bg-[#f9f9f9] border border-[#e2e2e2]">
                      <div className="w-6 h-6 bg-[#f0f4f8] flex items-center justify-center text-[#002045] flex-shrink-0">
                        {icon}
                      </div>
                      <div>
                        <p className="text-[#002045] text-[8px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] leading-tight">{label}</p>
                        <p className={labelDesc ? "text-[#002045] text-[8px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] leading-tight" : "text-[#74777f] text-[8px] font-[var(--font-inter)] leading-snug"}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: 6 cards in a row */}
                <div className="hidden md:grid md:grid-cols-6 gap-2">
                  {[
                    {
                      label: "Anti-mofo",
                      desc: "Resistente a fungos",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                      ),
                    },
                    {
                      label: "Anti-cupim",
                      desc: "Bambu não atrai pragas",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      ),
                    },
                    {
                      label: "Pronta-entrega",
                      desc: "Estoque em Manaus",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      ),
                    },
                    {
                      label: "Resistente à umidade",
                      desc: "0,2% absorção em 48h",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Não propaga chamas",
                      desc: "Sem materiais inflamáveis",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="M12 9c0 1.5-1 2.5-1.5 3.5.5.5 1 1 1.5 1s1-.5 1.5-1C13 11.5 12 10.5 12 9z" />
                        </svg>
                      ),
                    },
                    {
                      label: "Instalação rápida",
                      desc: "2–3h por cômodo",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      ),
                    },
                  ].map(({ label, icon, desc }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-1.5 p-2.5 bg-[#f9f9f9] border border-[#e2e2e2]">
                      <div className="w-6 h-6 bg-[#f0f4f8] flex items-center justify-center text-[#002045] flex-shrink-0">
                        {icon}
                      </div>
                      <div>
                        <p className="text-[#002045] text-[8px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] leading-tight">{label}</p>
                        <p className="text-[#74777f] text-[8px] font-[var(--font-inter)] leading-snug">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost breakdown */}
              <div>
                <div className="bg-[#002045] px-6 sm:px-8 py-8 border border-[#2d4f7f]">
                  <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-5">
                    PFB Orbital — Estimativa de investimento
                  </p>
                  <div className="space-y-3 mb-6">
                    {savedSpaces.length > 0 && (
                      <>
                        {savedSpaces.map((sp, i) => (
                          <div key={sp.key} className="flex items-center justify-between text-sm font-[var(--font-inter)] gap-4 pb-2 border-b border-white/10">
                            <span className="text-white/55">
                              <span className="block text-white/80 text-xs font-semibold">{sp.label}</span>
                              {sp.plates} placa{sp.plates !== 1 ? "s" : ""} · {sp.productCode}
                              {couponData && sp.materialDiscounted < sp.materialTotal && (
                                <span className="block text-[#a1d494] text-[10px] mt-0.5">- desconto (cupom)</span>
                              )}
                            </span>
                            <span className="text-white font-semibold flex-shrink-0">{fmt(sp.materialDiscounted)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm font-[var(--font-inter)] gap-4 pb-2 border-b border-white/10">
                          <span className="text-white/55">
                            <span className="block text-white/80 text-xs font-semibold">{selectedSpace.label}</span>
                            {plates} placa{plates !== 1 ? "s" : ""} · {selectedProduct.code}
                            {discountAmount > 0 && <span className="block text-[#a1d494] text-[10px] mt-0.5">- desconto (cupom)</span>}
                          </span>
                          <span className="text-white font-semibold flex-shrink-0">{fmt(orbMaterialDiscounted)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-[var(--font-inter)] gap-4">
                          <span className="text-white/55">Subtotal material — {grandPlates} placas</span>
                          <span className="text-white font-semibold flex-shrink-0">{fmt(grandMaterialDiscounted)}</span>
                        </div>
                      </>
                    )}
                    {savedSpaces.length === 0 && (
                      <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                        <span className="text-white/55">
                          Material ({plates} placa{plates !== 1 ? "s" : ""} × {pricePerPlate.toLocaleString("pt-BR")})
                          <span className="block text-white/30 text-[10px] mt-0.5">2,9m × 1,2m × 5mm por placa</span>
                          {discountAmount > 0 && (
                            <span className="block text-[#a1d494] text-[10px] mt-0.5">
                              - desconto (cupom)
                            </span>
                          )}
                        </span>
                        <span className="text-white font-semibold flex-shrink-0">{fmt(orbMaterialDiscounted)}</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between text-sm font-[var(--font-inter)] gap-4">
                      <span className="text-white/55">Acabamento / pintura</span>
                      <span className="text-[#a1d494] font-semibold flex-shrink-0">Não necessário</span>
                    </div>
                    <div className="border-t border-white/15 pt-3 flex items-center justify-between">
                      <span className="text-white text-sm font-bold font-[var(--font-inter)]">Total — material</span>
                      <span className="text-white text-2xl font-[var(--font-noto-serif)]">{fmt(savedSpaces.length > 0 ? grandMaterialDiscounted : orbMaterialDiscounted)}</span>
                    </div>
                  </div>

                  {/* Mão de obra — not part of the price above; the Orbital quote is
                      material only. Closed by default, no price shown: it's only an
                      estimate that can change, and showing a fixed number here is what
                      led clients to think Orbital charges for installation. Styled to
                      stand out (bright card on the dark panel) since a low-contrast
                      row was getting missed entirely. */}
                  <div className="bg-[#a1d494] mb-3">
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
                          href={`${WERK_ENGENHARIA_WA_BASE}${encodeURIComponent(werkssonMsg)}`}
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
                  <div className="bg-[#3b6934]/30 border border-[#3b6934]/50 px-4 py-3 mb-3">
                    <p className="text-[#a1d494] text-xs font-semibold font-[var(--font-inter)]">10+ anos sem trocar.</p>
                    <p className="text-[#a1d494]/70 text-[11px] font-[var(--font-inter)] mt-0.5 leading-relaxed">
                      Instala uma vez. Impermeável, anti-mofo e resistente ao clima de Manaus.
                    </p>
                  </div>
                  <div className="border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-white/70 text-[10px] font-semibold font-[var(--font-inter)] mb-0.5">A Orbital não realiza instalação.</p>
                    <p className="text-white/45 text-[10px] font-[var(--font-inter)] leading-relaxed">
                      Trabalhamos apenas com o fornecimento das placas. Quando necessário, podemos indicar empresas terceirizadas que já têm conhecimento sobre a aplicação do material.
                    </p>
                  </div>
                </div>
              </div>
              {/* Technical comparison — always visible */}
              {(() => {
                const allowedKeys: ("mdf" | "papel" | "forro" | "teto" | "tinta")[] = [
                  "mdf",
                  ...(showForroTab ? ["forro" as const] : []),
                  ...(showTetoTab  ? ["teto"  as const] : []),
                  "papel",
                  "tinta",
                ];
                return (
                  <div className="bg-white border border-[#e2e2e2] mt-4">
                    <div className="px-6 lg:px-8 pt-6 pb-2 border-b border-[#e2e2e2]">
                      <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-0.5">
                        PFB Orbital vs. {COMPARISON_OPTIONS.find(o => o.key === comparisonMaterial)?.label ?? "MDF"}
                      </p>
                      <p className="text-[#74777f] text-xs font-[var(--font-inter)]">
                        Selecione o material para comparar tecnicamente
                      </p>
                    </div>
                    <div className="px-6 lg:px-8 py-6 lg:py-8">
                      <MdfComparison selected={comparisonMaterial} onSelect={setComparisonMaterial} allowedKeys={allowedKeys} />
                    </div>
                  </div>
                );
              })()}
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
          Estimativas de investimento para referência; valores sujeitos a alteração.
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

      {/* ── Formalização do orçamento ─────────────────────────────────────────
          Confirmação de dados + endereço (CEP autofill) → PDF via WhatsApp. */}
      {formalizeOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { if (!fzSubmitting) setFormalizeOpen(false); }}
        >
          <div
            className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#002045] px-5 py-4 flex items-center justify-between z-10">
              <p className="text-white font-[var(--font-noto-serif)] text-base">
                {fzResult ? "Orçamento formalizado" : "Receber orçamento formalizado"}
              </p>
              <button
                onClick={() => { if (!fzSubmitting) setFormalizeOpen(false); }}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Fechar"
              >
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
                  {fzResult.whatsappOk
                    ? `Enviamos o PDF para o seu WhatsApp${clientPhone ? ` final ${clientPhone.replace(/\D/g, "").slice(-4)}` : ""}.`
                    : "Seu orçamento foi gerado. O PDF está disponível no botão abaixo."}
                  {fzResult.emailOk && clientEmail ? ` Também enviamos uma cópia para ${clientEmail}.` : ""}
                </p>
                <div className="flex flex-col gap-2">
                  <a
                    href={fzResult.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center bg-[#002045] hover:bg-[#1a365d] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 transition-colors"
                  >
                    Visualizar / baixar PDF
                  </a>
                  <button
                    onClick={() => { setFzResult(null); void submitFormalize(); }}
                    disabled={fzSubmitting}
                    className="w-full text-center border border-[#e2e2e2] text-[#002045] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] px-5 py-3 hover:border-[#002045] transition-colors disabled:opacity-50"
                  >
                    {fzSubmitting ? "Reenviando…" : "Reenviar"}
                  </button>
                </div>
                <div className="bg-[#f7f8fa] border border-[#e2e2e2] px-4 py-3">
                  <p className="text-[#43474e] text-[11px] font-[var(--font-inter)] leading-relaxed">
                    A Orbital não realiza instalação. Caso precise, fale diretamente com a empresa especializada indicada.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-5">
                {/* Parte 1 — confirmação dos dados */}
                <div>
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">Confirme seus dados</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome completo" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="WhatsApp" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="E-mail" className="sm:col-span-2 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                  </div>
                  {pricing && pricing.paymentOptions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mb-1.5">Condição de pagamento</p>
                      <div className="flex flex-wrap gap-2">
                        {pricing.paymentOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => { setSelectedPayment(opt.id); trackFunnel("pagamento_selecionado", { id: opt.id }); }}
                            className={`px-3 py-1.5 text-[12px] font-semibold font-[var(--font-inter)] border transition-colors ${selectedPayment === opt.id ? "border-[#002045] bg-[#eef2fb] text-[#002045]" : "border-[#e2e2e2] text-[#74777f] hover:border-[#86a0cd]"}`}
                          >
                            {opt.label} · {fmt(opt.total)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Parte 2 — endereço de entrega */}
                <div>
                  <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">Endereço de entrega</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <input
                        value={fzZip}
                        onChange={(e) => { setFzZip(e.target.value); }}
                        onBlur={(e) => void lookupCep(e.target.value)}
                        placeholder="CEP"
                        inputMode="numeric"
                        className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                      {fzCepLoading && <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1">Consultando CEP…</p>}
                      {fzCepError && <p className="text-[#a07a00] text-[10px] font-[var(--font-inter)] mt-1">{fzCepError}</p>}
                    </div>
                    <input value={fzStreet} onChange={(e) => setFzStreet(e.target.value)} placeholder="Rua / Avenida" className="sm:col-span-2 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzNumber} onChange={(e) => setFzNumber(e.target.value)} placeholder="Número *" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzComplement} onChange={(e) => setFzComplement(e.target.value)} placeholder="Complemento" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzNeighborhood} onChange={(e) => setFzNeighborhood(e.target.value)} placeholder="Bairro" className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzCity} onChange={(e) => setFzCity(e.target.value)} placeholder="Cidade" className="sm:col-span-2 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzState} onChange={(e) => setFzState(e.target.value)} placeholder="UF" maxLength={2} className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] uppercase focus:outline-none focus:border-[#002045]" />
                    <input value={fzCondo} onChange={(e) => setFzCondo(e.target.value)} placeholder="Condomínio (opcional)" className="sm:col-span-3 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <input value={fzNotes} onChange={(e) => setFzNotes(e.target.value)} placeholder="Observações de entrega (opcional)" className="sm:col-span-3 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                  </div>
                </div>

                {pricing && (
                  <div className="bg-[#f7f8fa] border border-[#e2e2e2] px-4 py-3 text-[12px] font-[var(--font-inter)] text-[#43474e] space-y-0.5">
                    <div className="flex justify-between"><span>{pricing.plates} placa{pricing.plates !== 1 ? "s" : ""}{pricing.colaAvailable && pricing.colaTubos > 0 ? ` · ${pricing.colaTubos} tubos Cola PU` : ""}</span><span>{fmt(pricing.platesSubtotal + pricing.colaSubtotal)}</span></div>
                    <div className="flex justify-between"><span>Frete</span><span>{pricing.frete.free ? "Grátis" : fmt(pricing.frete.value)}</span></div>
                    {(() => { const s = pricing.paymentOptions.find((o) => o.id === selectedPayment) ?? pricing.paymentOptions[0]; return (
                      <div className="flex justify-between pt-1 mt-1 border-t border-[#e2e2e2] font-bold text-[#002045]"><span>Total {s ? `· ${s.label}` : ""}</span><span>{fmt(s?.total ?? pricing.totalFull)}</span></div>
                    ); })()}
                  </div>
                )}

                <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] leading-relaxed">
                  A instalação não está incluída neste orçamento — a Orbital fornece apenas o material.
                </p>

                {fzError && <p className="text-[#cc0000] text-[12px] font-[var(--font-inter)]">{fzError}</p>}

                <button
                  type="button"
                  onClick={() => void submitFormalize()}
                  disabled={fzSubmitting}
                  className="w-full bg-[#3b6934] hover:bg-[#2e5229] text-white text-sm tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 transition-colors disabled:opacity-60"
                >
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


export default function SimuladorPage() {
  return (
    <Suspense>
      <SimuladorInner />
    </Suspense>
  );
}
