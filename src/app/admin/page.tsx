"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { SITE_ASSET_MANIFEST } from "@/lib/assets";
import { productQrUrl, productUrl } from "@/lib/product-link";
import { compressImage } from "@/lib/image-compress";
import LeadsTab, { type Lead } from "./LeadsTab";
import RemindersTab from "./RemindersTab";
import PedidosTab, { type QuoteOption } from "./PedidosTab";
import RepOversightTab from "./RepOversightTab";
import EstoqueTab from "./EstoqueTab";
import SquareCropper from "@/components/SquareCropper";
import FinanceiroTab from "./FinanceiroTab";
import DashboardTab, { type OverviewData } from "./DashboardTab";
import CustosTab from "./CustosTab";
import ComprasTab from "./ComprasTab";
import RelatoriosTab from "./RelatoriosTab";
import { inputCls, labelCls, NavIcon, NAV_GROUPS, NAV_LABELS, type AdminTab } from "./ui";
import {
  composePrompt,
  finishDescription,
  DEFAULT_PANEL_WIDTH_M,
  DEFAULT_PANEL_HEIGHT_M,
  panelGrid,
} from "@/lib/render-prompt";

// ─── Sidebar IA ───────────────────────────────────────────────────────────────
// Ordered as the business actually flows, top to bottom: what needs attention
// → the client's journey (lead → quote → order) → the sales network that
// feeds it → the product/order journey (product → stock → purchase) →
// management dashboards → marketing content → working tools → set-and-forget
// configuration. `custos`/`compras`/`relatorios` are new modules (built in
// the redesign's later phases; they mount as placeholders until then).
// NAV_LABELS/NAV_GROUPS vivem em ui.tsx desde que o módulo de Projetos ganhou
// rotas próprias (/admin/projetos/...): a barra lateral precisa ser a mesma
// dentro e fora desta página.

interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  coupon_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  commission_pool_pct?: number | null;
  commission_updated_at?: string | null;
  commission_updated_by?: string | null;
  has_portal_password?: boolean;
  status: "active" | "inactive" | "pending";
  is_self_registered: boolean | null;
  sales_rep_referral_code: string | null;
  created_at: string;
  birthday: string | null;
  profession: string | null;
  has_special_table: boolean | null;
  partner_sales_reps?: Array<{ sales_reps: { id: string; name: string; referral_code: string } | null }>;
}

interface SalesRep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  referral_code: string;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  has_portal_password?: boolean;
  status: "active" | "inactive";
  created_at: string;
  birthday: string | null;
}

interface ProductImage { id:string; product_id:string; image_path:string; sort_order:number; }
interface DbProduct { id:string; code:string; name:string; linha:"Classic"|"Brilliance"|"Elegance"; finish:string; price:number; price_per_m2:number; description:string; image_path:string; is_active:boolean; show_in_catalog?:boolean; sort_order:number; created_at:string; product_images?: ProductImage[]; render_finish_description?: string | null; render_panel_width_m?: number | null; render_panel_height_m?: number | null; render_context_image_path?: string | null; render_texture_path?: string | null; render_extra_notes?: string | null; }
interface DbPhotoProject { id:string; slug:string; title:string; product_code:string; short_description?:string; categories:string[]; image_after:string; image_before:string; note:string; is_active:boolean; is_featured?:boolean; show_on_home?:boolean; is_new?:boolean; feature_order?:number; content_type?:string|null; cover_category?:string|null; sort_order:number; }
interface DbRenderProject { id:string; slug:string; title:string; product_code:string; image_path:string; is_active:boolean; sort_order:number; }
interface ProjectMedia { id:string; project_slug:string; type:"image"|"video"; url:string; caption:string|null; description:string|null; category:"antes"|"depois"|"geral"; is_cover?:boolean; sort_order:number; }

// Slug técnico gerado a partir do nome do projeto ("Showroom Parque 10" →
// "showroom-parque-10"). Acentos removidos, minúsculas, hífens.
function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface SpaceBreakdownItem {
  spaceName?: string;
  productName?: string;
  productCode?: string | null;
  dimLabel?: string;
  plates?: number;
  area_m2?: number;
  total?: number;
}

interface CouponUse {
  id: string;
  partner_id: string;
  coupon_code: string;
  space_breakdown?: SpaceBreakdownItem[] | null;
  space: string | null;
  product_name: string | null;
  product_code: string | null;
  area_m2: number | null;
  plates: number | null;
  material_total: number | null;
  material_discounted: number | null;
  discount_applied: number | null;
  commission_owed: number | null;
  architect_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  sale_status: "em_orcamento" | "concluido" | "cancelado" | null;
  sales_rep_referral_code: string | null;
  sales_rep_commission_owed: number | null;
  created_at: string;
  partner_commission_paid_at: string | null;
  rep_commission_paid_at: string | null;
  source_pedido_id?: string | null;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Convert YYYY-MM-DD → DD/MM/AAAA for display */
function isoToDMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Convert DD/MM/AAAA → YYYY-MM-DD for storage */
function dmyToISO(dmy: string): string {
  if (!dmy || dmy.length < 10) return dmy;
  const [d, m, y] = dmy.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Auto-mask typed input into DD/MM/AAAA */
function maskBday(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
  if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

const PROFESSIONS = [
  "Arquiteto e Urbanista",
  "Designer de interiores",
  "Construtor",
  "Engenheiro civil",
  "Corretor de imóveis",
  "Lojista / revendedor",
];

const emptyPartnerForm = {
  name: "", email: "", phone: "", coupon_code: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: 0,
  commission_type: "percentage" as "percentage" | "fixed",
  commission_value: 0,
  portal_password: "",
  status: "active" as "active" | "inactive" | "pending",
  sales_rep_referral_code: "",
  birthday: "",
  profession: "",
  has_special_table: false,
  commission_pool_pct: 7,
};

const emptyRepForm = {
  name: "", email: "", phone: "", referral_code: "",
  commission_type: "percentage" as "percentage" | "fixed",
  commission_value: 5,
  portal_password: "",
  status: "active" as "active" | "inactive",
  birthday: "",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  em_orcamento: { label: "Em orçamento", cls: "bg-yellow-100 text-yellow-800" },
  concluido:    { label: "Concluído",    cls: "bg-green-100 text-green-800"  },
  cancelado:    { label: "Cancelado",    cls: "bg-red-100 text-red-700"      },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [tab, setTab] = useState<AdminTab>("dashboard");

  // Voltar de uma rota própria (ex.: /admin/projetos/organizacao) precisa cair
  // na aba certa — a barra lateral de lá aponta para /admin?tab=<aba>.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && (NAV_GROUPS.some((g) => g.items.includes(t as AdminTab)))) setTab(t as AdminTab);
  }, []);
  // Mobile nav drawer (hamburger). Desktop sidebar is always visible.
  const [navOpen, setNavOpen] = useState(false);
  const [commissionFilter, setCommissionFilter] = useState<"a_pagar" | "pago" | "tudo">("a_pagar");
  // Cancelamento de comissão A pagar
  const [cancelCommTarget, setCancelCommTarget] = useState<{ id: string; source: "coupon" | "pedido"; partnerName: string; repName: string; partnerAmount: number; repAmount: number; partnerEligible: boolean; repEligible: boolean } | null>(null);
  const [cancelWhich, setCancelWhich] = useState<{ partner: boolean; rep: boolean }>({ partner: false, rep: false });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Cross-tab handoff for the Lead → Order conversion flow: no context/store,
  // just parent-owned prefill/focus state passed as props (same shape as the
  // existing simPrefills pattern in the Simulador), consumed once by the
  // receiving tab and then cleared.
  const [pedidoLeadPrefill, setPedidoLeadPrefill] = useState<Lead | null>(null);
  const [leadFocusId, setLeadFocusId] = useState<string | null>(null);
  const [pedidoFocusId, setPedidoFocusId] = useState<string | null>(null);
  // Same pattern, Phase 2: converting a QUOTE (Orçamentos tab) into a pedido.
  const [pedidoQuotePrefill, setPedidoQuotePrefill] = useState<QuoteOption | null>(null);

  // Dashboard
  interface DashboardData {
    totalOrcamentos: number; totalValor: number;
    concluidos: number; emOrcamento: number; cancelados: number;
    conversionRate: number; comissaoPendente: number;
    hoje: { count: number; valor: number };
    semana: { count: number; valor: number };
    mes: { count: number; valor: number; concluidos: number };
    parceirosAtivos: number; parceirosPendentes: number;
    topProducts: { name: string; count: number }[];
    monthlyTrend: { month: string; count: number; valor: number }[];
    recentActivity: { id: string; architect_name: string | null; product_name: string | null; space: string | null; material_discounted: number | null; sale_status: string | null; created_at: string; coupon_code: string }[];
  }
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  // "Atenção agora" feed — owned here (not in DashboardTab) because the
  // sidebar badges (lembretes atrasados, estoque baixo) read from it too.
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      const j = await res.json().catch(() => null);
      if (res.ok && j && typeof j === "object" && "followupsOverdue" in j) setOverview(j as OverviewData);
    } catch { /* best-effort */ }
    setOverviewLoading(false);
  }, []);

  // Partners
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState({ ...emptyPartnerForm });
  const [partnerFormError, setPartnerFormError] = useState("");
  const [partnerFormLoading, setPartnerFormLoading] = useState(false);
  const [newlyCreatedPartner, setNewlyCreatedPartner] = useState<Partner | null>(null);
  // Approval form for pending partners
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 10,
    commission_type: "percentage" as "percentage" | "fixed",
    commission_value: 5,
    portal_password: "",
  });
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Multi-rep management for partner edit
  const [partnerLinkedReps, setPartnerLinkedReps] = useState<Array<{ id: string; sales_rep_id: string; sales_reps: { id: string; name: string; referral_code: string; commission_type: string; commission_value: number } }>>([]);
  const [partnerRepsLoading, setPartnerRepsLoading] = useState(false);
  const [addingRepId, setAddingRepId] = useState("");
  const [repLinkError, setRepLinkError] = useState("");

  // Sales reps
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loadingReps, setLoadingReps] = useState(false);
  const [showRepForm, setShowRepForm] = useState(false);
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [repForm, setRepForm] = useState({ ...emptyRepForm });
  const [repFormError, setRepFormError] = useState("");
  const [repFormLoading, setRepFormLoading] = useState(false);
  const [junctionPartnerCounts, setJunctionPartnerCounts] = useState<Record<string, number>>({});
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);

  // History
  const [uses, setUses] = useState<CouponUse[]>([]);
  const [loadingUses, setLoadingUses] = useState(false);
  // Surfaces real HTTP/data errors for the Orçamentos tab so a failed fetch
  // (401/500/empty-from-anon-key) is no longer indistinguishable from "no orders".
  // Tracked per source so a failure in one (e.g. /api/admin/clients 401) no longer
  // hides rows that loaded fine from the other (/api/coupons/use), and vice-versa.
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [usesError, setUsesError] = useState<string | null>(null);
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const [filterRep, setFilterRep] = useState<string>("all");

  // Partner profession "Outro" free-text in admin form
  const [partnerProfOther, setPartnerProfOther] = useState("");

  // Change admin password
  const [cpOpen, setCpOpen] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  // ── Password visibility state ──────────────────────────────────────────────
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [showCpCurrent, setShowCpCurrent] = useState(false);
  const [showCpNew, setShowCpNew] = useState(false);
  const [showCpConfirm, setShowCpConfirm] = useState(false);
  const [showPartnerPw, setShowPartnerPw] = useState(false);
  const [showRepPw, setShowRepPw] = useState(false);
  const [showApprovalPw, setShowApprovalPw] = useState(false);

  // ── Email Campaigns ─────────────────────
  interface EmailCampaign {
    id: string;
    campaign_type: 'product' | 'educational';
    campaign_subtype: string;
    subject: string;
    preview_text: string | null;
    html_body: string;
    status: 'pending_approval' | 'approved' | 'sent';
    approve_token: string;
    created_at: string;
    approved_at: string | null;
    sent_at: string | null;
    recipient_count: number | null;
  }

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignGenerating, setCampaignGenerating] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignEditSubject, setCampaignEditSubject] = useState("");
  const [campaignEditBody, setCampaignEditBody] = useState("");
  const [campaignEditSaving, setCampaignEditSaving] = useState(false);
  const [campaignTestSending, setCampaignTestSending] = useState<string | null>(null);
  const [campaignApproving, setCampaignApproving] = useState<string | null>(null);
  const [campaignEditMode, setCampaignEditMode] = useState<"visual" | "html">("visual");
  const [campaignVisualHeadline, setCampaignVisualHeadline] = useState("");
  const [campaignVisualSubheadline, setCampaignVisualSubheadline] = useState("");
  const [campaignVisualBody, setCampaignVisualBody] = useState("");
  const [campaignVisualImageUrl, setCampaignVisualImageUrl] = useState("");
  const [campaignVisualCtaText, setCampaignVisualCtaText] = useState("Ver no site");
  const [campaignVisualCtaUrl, setCampaignVisualCtaUrl] = useState("https://orbitalrevestimentos.com.br");
  const [campaignImageUploading, setCampaignImageUploading] = useState(false);
  const [campaignDeleting, setCampaignDeleting] = useState<string | null>(null);
  const [campaignAiInstruction, setCampaignAiInstruction] = useState("");
  const [campaignAiEditing, setCampaignAiEditing] = useState(false);

  // ── Drip campaign editor ────────────────────────────────────────────────────
  interface DripStep {
    step_number: number;
    delay_days: number | null;
    subject: string;
    body_html: string;
    description: string;
    updated_at: string;
  }

  interface ClientSeq {
    id: string;
    client_name: string;
    client_email: string;
    client_phone?: string | null;
    space: string | null;
    model: string;
    plates: number;
    area_m2: number;
    total: number;
    partner_name: string;
    current_step: number;
    status: string;
    next_email_at: string | null;
    created_at: string;
    coupon_use_id: string | null;
    sale_status: string | null;
    render_images?: Array<{ url: string; local: string | null; productName: string | null; productCode: string | null }> | null;
  }

  // Orders from the Pedidos table, surfaced in the Orçamentos tab alongside
  // simulador-coupon quotes, and (commission fields) in the Commissions tab.
  interface PedidoLite {
    id: string;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    space: string | null;
    product_name: string | null;
    area_m2: number | null;
    total: number | null;
    status: string | null;
    partner_name: string | null;
    created_at: string;
    partner_id: string | null;
    sales_rep_id: string | null;
    partner_commission_amount: number | null;
    sales_rep_commission_amount: number | null;
    partner_commission_paid_at: string | null;
    sales_rep_commission_paid_at: string | null;
  }
  const [pedidos, setPedidos] = useState<PedidoLite[]>([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [pedidosError, setPedidosError] = useState<string | null>(null);

  const DRIP_TOTAL_STEPS = 7;

  const [dripSteps, setDripSteps] = useState<DripStep[]>([]);
  const [dripLoading, setDripLoading] = useState(false);
  const [dripSeeding, setDripSeeding] = useState(false);
  const [expandedDripStep, setExpandedDripStep] = useState<number | null>(null);
  const [editingDripStep, setEditingDripStep] = useState<number | null>(null);
  const [dripEditSubject, setDripEditSubject] = useState("");
  const [dripEditDelayDays, setDripEditDelayDays] = useState("");
  const [dripEditBodyHtml, setDripEditBodyHtml] = useState("");
  const [dripEditSaving, setDripEditSaving] = useState(false);
  const [dripPreviewStep, setDripPreviewStep] = useState<number | null>(null);

  interface VizRender {
    id: string;
    name: string | null;
    phone: string | null;
    images: Array<{ url: string; local: string | null; productName: string | null; productCode: string | null }>;
    created_at: string;
  }
  const [vizRenders, setVizRenders] = useState<VizRender[]>([]);
  const [vizRendersLoading, setVizRendersLoading] = useState(false);

  const fetchVizRenders = useCallback(async () => {
    setVizRendersLoading(true);
    try {
      const res = await fetch("/api/admin/visualizacoes");
      if (res.ok) setVizRenders((await res.json()) as VizRender[]);
    } catch {}
    setVizRendersLoading(false);
  }, []);

  const [clients, setClients] = useState<ClientSeq[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsExporting, setClientsExporting] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [clientSortKey, setClientSortKey] = useState<"data" | "cliente" | "valor">("data");
  const [clientSortDir, setClientSortDir] = useState<"asc" | "desc">("desc");
  const [clientGroupMode, setClientGroupMode] = useState<"situacao" | "semana" | "mes" | "ano">("situacao");
  // Concluídos e cancelados nascem recolhidos: são histórico, não fila de trabalho.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({ concluido: true, cancelado: true });
  const [clientPartnerFilter, setClientPartnerFilter] = useState<string>("all");
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  // Orçamentos formais gerados pelo site público (saved_quotes) + conversão.
  interface FormalQuote {
    slug: string; formal_number: string; stage: string | null; pedido_id: string | null;
    client_name: string | null; client_phone: string | null; total_plates: number | null;
    total_amount: number | null; payment_condition: string | null; frete_free: boolean | null;
    frete_amount: number | null; formalized_at: string | null;
  }
  const [formalQuotes, setFormalQuotes] = useState<FormalQuote[]>([]);
  const [convertingSlug, setConvertingSlug] = useState<string | null>(null);

  // Follow-up
  interface FollowUp {
    id: string;
    coupon_code: string;
    partner_name: string | null;
    space: string | null;
    product_name: string | null;
    material_discounted: number | null;
    created_at: string;
    next_followup_at: string | null;
    sale_status: string | null;
  }
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [snoozeInputId, setSnoozeInputId] = useState<string | null>(null);
  const [snoozeDays, setSnoozeDays] = useState("2");

  // DB Products
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [loadingDbProducts, setLoadingDbProducts] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string|null>(null);
  const [productForm, setProductForm] = useState({ code:"", name:"", linha:"Classic" as "Classic"|"Brilliance"|"Elegance", finish:"Fosco", price:559, price_per_m2:161, description:"", image_path:"", is_active:true, show_in_catalog:true, sort_order:0, render_finish_description:"", render_panel_width_m:1.2, render_panel_height_m:2.9, render_context_image_path:"", render_texture_path:"", render_extra_notes:"" });
  const [productFormError, setProductFormError] = useState("");
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [productImageSubstituting, setProductImageSubstituting] = useState<string | null>(null); // product id being substituted from list
  const [productImageDims, setProductImageDims] = useState<Record<string, {w: number, h: number}>>({});
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [dragGalleryId, setDragGalleryId] = useState<string | null>(null);
  const [dragOverGalleryId, setDragOverGalleryId] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [galleryZipping, setGalleryZipping] = useState(false);
  const [galleryZipError, setGalleryZipError] = useState<string | null>(null);
  const [galleryUploadProgress, setGalleryUploadProgress] = useState<{done: number; total: number} | null>(null);
  const productTabFormRef = useRef<HTMLDivElement>(null);

  // Media / Site Assets
  const [assetManifest, setAssetManifest] = useState<Record<string, string>>({});
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetUploading, setAssetUploading] = useState<string | null>(null); // key currently uploading
  const [assetRestoring, setAssetRestoring] = useState<string | null>(null);

  // DB Projects
  const [dbPhotoProjects, setDbPhotoProjects] = useState<DbPhotoProject[]>([]);
  const [dbRenderProjects, setDbRenderProjects] = useState<DbRenderProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [showRenderForm, setShowRenderForm] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string|null>(null);
  const [editingRenderId, setEditingRenderId] = useState<string|null>(null);
  const [renderImporting, setRenderImporting] = useState<string | null>(null); // slug being imported
  const [renderImportingAll, setRenderImportingAll] = useState(false);
  const [photoForm, setPhotoForm] = useState({ slug:"", title:"", product_code:"", short_description:"", categories:[] as string[], image_after:"", image_before:"", note:"", is_active:true, is_featured:false, show_on_home:false, is_new:false, feature_order:0, content_type:"", cover_category:"depois", sort_order:0 });
  const [slugTouched, setSlugTouched] = useState(false);
  const [photoAdvancedOpen, setPhotoAdvancedOpen] = useState(false);
  const [productPickerQuery, setProductPickerQuery] = useState("");
  // Recorte 1:1 da imagem de capa/antes do projeto (SquareCropper).
  const [coverCrop, setCoverCrop] = useState<{ file: File; target: "image_after" | "image_before" } | null>(null);
  const [renderForm, setRenderForm] = useState({ slug:"", title:"", product_code:"", image_path:"", is_active:true, sort_order:0 });
  const [projectMediaMap, setProjectMediaMap] = useState<Record<string, ProjectMedia[]>>({});
  const [expandedMediaSlug, setExpandedMediaSlug] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [mediaMigrated, setMediaMigrated] = useState<boolean | null>(null);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editMediaDraft, setEditMediaDraft] = useState<{ description: string; category: "antes" | "depois" | "geral" }>({ description: "", category: "geral" });
  const [aiDescGenerating, setAiDescGenerating] = useState(false);
  const [aiDescHint, setAiDescHint] = useState("");
  const [dragMediaId, setDragMediaId] = useState<string | null>(null);
  const [dragOverMediaId, setDragOverMediaId] = useState<string | null>(null);
  const [mediaToast, setMediaToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null);
  // Classificação aplicada às próximas fotos enviadas para a galeria.
  const [uploadCategory, setUploadCategory] = useState<"antes" | "depois">("depois");
  const [aiTextGenerating, setAiTextGenerating] = useState<string | null>(null); // field key being generated

  // ── Admin simulator ──────────────────────────────────────────────────────
  interface SimSpace { key: string; spaceName: string; productCode: string; w: string; h: string; }
  const [simSpaces, setSimSpaces] = useState<SimSpace[]>([]);
  const [simSpaceName, setSimSpaceName] = useState("");
  const [simProductCode, setSimProductCode] = useState("");
  const [simW, setSimW] = useState("");
  const [simH, setSimH] = useState("");
  const [simCoupon, setSimCoupon] = useState("");
  // Direct-sale: a sales rep's referral code + optional admin-set discount % for the link
  const [simRepCode, setSimRepCode] = useState("");
  const [simRepDiscount, setSimRepDiscount] = useState("");
  const [simLink, setSimLink] = useState("");
  const [simLinkCopied, setSimLinkCopied] = useState(false);
  // Extended UI state for full-featured simulator
  const [simSelectedLine, setSimSelectedLine] = useState<"Classic" | "Brilliance" | "Elegance" | null>(null);
  const [simShowCustom, setSimShowCustom] = useState(false);
  const [simCustomText, setSimCustomText] = useState("");

  // ── Admin coupon creator ────────────────────────────────────────────────
  interface AdminCoupon { id: string; code: string; discount_pct: number; payment_type: string; usage_type: string; expires_at: string | null; used: boolean; created_at: string; }
  const [adminCoupons, setAdminCoupons] = useState<AdminCoupon[]>([]);
  const [showCouponCreator, setShowCouponCreator] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponPct, setNewCouponPct] = useState("5");
  const [newCouponPayment, setNewCouponPayment] = useState<"a_vista" | "parcelado" | "qualquer">("a_vista");
  const [newCouponUsage, setNewCouponUsage] = useState<"single_use" | "temporary">("single_use");
  const [newCouponExpiry, setNewCouponExpiry] = useState("");
  const [couponCreating, setCouponCreating] = useState(false);
  const [couponCreatedMsg, setCouponCreatedMsg] = useState("");

  // Chat IA prompt editor
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatPromptLoaded, setChatPromptLoaded] = useState(false);
  const [chatPromptSaving, setChatPromptSaving] = useState(false);
  const [chatPromptMsg, setChatPromptMsg] = useState("");

  // ── Pricing tab state ───────────────────────────────────────────────────────
  interface PricingRow { linha: string; special_price: number; public_price: number; updated_at?: string; }
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [pricingEdits, setPricingEdits] = useState<Record<string, { special: string; public_: string }>>({});
  const [pricingSaving, setPricingSaving] = useState<Record<string, boolean>>({});
  const [pricingMsg, setPricingMsg] = useState<Record<string, string>>({});
  // Regras comerciais do fluxo público de orçamento (Cola PU, frete, desconto,
  // parcelamento, instalação, validade) — /api/admin/orcamento-config.
  const [orcCfg, setOrcCfg] = useState<Record<string, unknown> | null>(null);
  const [orcCfgSaving, setOrcCfgSaving] = useState(false);
  const [orcCfgMsg, setOrcCfgMsg] = useState("");
  // Zonas de frete por CEP (frete_zones).
  interface FreteZone { id:string; name:string; neighborhoods:string|null; cep_start:string|null; cep_end:string|null; cep_list:string|null; value:number; priority:number; active:boolean; notes:string|null; }
  const [freteZones, setFreteZones] = useState<FreteZone[]>([]);
  const [newZone, setNewZone] = useState({ name:"", cep_start:"", cep_end:"", cep_list:"", value:"150", neighborhoods:"" });
  const [zoneSaving, setZoneSaving] = useState(false);
  const [cepTest, setCepTest] = useState("");

  // Same static list as the public projetos page — kept in sync manually
  const STATIC_RENDERS = [
    { slug: "orb001-consultorio-odonto", title: "Consultório Odontológico",  product_code: "ORB-001", image_path: "/images/renders/orb001-consultorio-odonto.png" },
    { slug: "orb001-sala",               title: "Sala de Estar",              product_code: "ORB-001", image_path: "/images/renders/orb001-sala.png" },
    { slug: "orb002-mesa-estudos",        title: "Mesa de Estudos",            product_code: "ORB-002", image_path: "/images/renders/orb002-mesa-estudos.jpg" },
    { slug: "orb002-restaurante",         title: "Restaurante",                product_code: "ORB-002", image_path: "/images/renders/orb002-restaurante.png" },
    { slug: "orb003-restaurante",         title: "Restaurante",                product_code: "ORB-003", image_path: "/images/renders/orb003-restaurante.png" },
    { slug: "orb003-sala-conf",           title: "Sala de Conferências",       product_code: "ORB-003", image_path: "/images/renders/orb003-sala-conf.png" },
    { slug: "orb004-comercio-teto",       title: "Comércio",                   product_code: "ORB-004", image_path: "/images/renders/orb004-comercio-teto.png" },
    { slug: "orb005-consultorio-oftalmo", title: "Consultório Oftalmológico",  product_code: "ORB-005", image_path: "/images/renders/orb005-consultorio-oftalmo.png" },
    { slug: "orb006-banheiro",            title: "Banheiro",                   product_code: "ORB-006", image_path: "/images/renders/orb006-banheiro.png" },
    { slug: "orb007-banheiro",            title: "Banheiro",                   product_code: "ORB-007", image_path: "/images/renders/orb007-banheiro.png" },
    { slug: "orb007-pediatria",           title: "Clínica Pediátrica",         product_code: "ORB-007", image_path: "/images/renders/orb007-pediatria.png" },
    { slug: "orb008-sala",                title: "Sala de Estar",              product_code: "ORB-008", image_path: "/images/renders/orb008-sala.png" },
    { slug: "orb009-banheiro",            title: "Banheiro",                   product_code: "ORB-009", image_path: "/images/renders/orb009-banheiro.png" },
    { slug: "orb012-cozinha",             title: "Cozinha",                    product_code: "ORB-012", image_path: "/images/renders/orb012-cozinha.png" },
    { slug: "orb012-sala",                title: "Sala de Estar",              product_code: "ORB-012", image_path: "/images/renders/orb012-sala.png" },
    { slug: "orb013-quarto",              title: "Quarto",                     product_code: "ORB-013", image_path: "/images/renders/orb013-quarto.png" },
    { slug: "orb013-restaurante",         title: "Restaurante",                product_code: "ORB-013", image_path: "/images/renders/orb013-restaurante.png" },
    { slug: "orb014-escritorio",          title: "Escritório",                 product_code: "ORB-014", image_path: "/images/renders/orb014-escritorio.png" },
    { slug: "orb015-banheiro",            title: "Banheiro",                   product_code: "ORB-015", image_path: "/images/renders/orb015-banheiro.png" },
  ] as const;
  const photoTabFormRef = useRef<HTMLDivElement>(null);
  const renderTabFormRef = useRef<HTMLDivElement>(null);
  const [projectImageUploading, setProjectImageUploading] = useState(false);

  // Categorias de projeto. A fonte de verdade é a tabela project_categories
  // (migração 049) — BASE_CATEGORIES é só o fallback de quando a tabela ainda
  // não existe. Nada de localStorage: era isso que fazia uma categoria criada
  // no gerenciador nunca chegar ao editor de projetos.
  const BASE_CATEGORIES = ["residencial", "comercial", "umido", "nautico"];
  const [newCatInput, setNewCatInput] = useState("");
  // Metadados de categorias (ordem, subcategoria, showroom/endereço) — tabela project_categories.
  interface ProjCat { id:string; slug:string; label:string; description:string|null; parent_slug:string|null; sort_order:number; is_showroom:boolean; address:string|null; maps_url:string|null; invite_enabled:boolean; active:boolean; }
  const [projCats, setProjCats] = useState<ProjCat[]>([]);
  const [catsSeeded, setCatsSeeded] = useState(false);

  // Categorias oferecidas no editor de projetos.
  //
  // BUG CORRIGIDO: esta lista era montada de BASE_CATEGORIES (hardcoded) +
  // localStorage + categorias já em uso — nunca lia a tabela project_categories.
  // Por isso uma categoria criada no gerenciador (que grava no banco) aparecia
  // na lista de categorias mas NÃO no editor do projeto.
  //
  // Agora a tabela é a fonte de verdade: categorias ATIVAS ficam disponíveis, e
  // qualquer slug legado já vinculado a um projeto continua aparecendo (marcado)
  // para que nenhum vínculo se perca silenciosamente.
  const allCategories = useMemo(() => {
    const active = projCats.filter((c) => c.active !== false).map((c) => c.slug);
    const fromProjects = (dbPhotoProjects ?? []).flatMap((p) => p.categories ?? []);
    const base = projCats.length > 0 ? [] : BASE_CATEGORIES; // fallback pré-migração 049
    return Array.from(new Set([...base, ...active, ...fromProjects]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbPhotoProjects, projCats]);

  /** Rótulo legível de uma categoria (usa o label do banco quando existir). */
  const catLabel = useCallback((slug: string) => {
    const meta = projCats.find((c) => c.slug === slug);
    return meta?.label || humanizeCat(slug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projCats]);

  /** Categorias inativas que um projeto ainda usa — mostradas com aviso. */
  const isInactiveCat = useCallback((slug: string) => {
    const meta = projCats.find((c) => c.slug === slug);
    return !!meta && meta.active === false;
  }, [projCats]);

  function humanizeCat(slug: string): string {
    return slug.replace(/---|--/g, " · ").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async function fetchProjCats() {
    const res = await fetch("/api/admin/project-categories");
    if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setProjCats(d); }
  }

  // Semeia a tabela com os slugs em uso (base + projetos) que ainda não têm metadados.
  async function seedProjCats(slugsInUse: string[], existing: ProjCat[]) {
    const have = new Set(existing.map((c) => c.slug));
    const seed = slugsInUse.filter((s) => !have.has(s)).map((s) => ({ slug: s, label: humanizeCat(s) }));
    if (seed.length === 0) return;
    const res = await fetch("/api/admin/project-categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed }),
    });
    if (res.ok) { const d = await res.json(); if (Array.isArray(d)) setProjCats(d); }
  }

  async function patchProjCat(id: string, patch: Partial<ProjCat>) {
    setProjCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await fetch(`/api/admin/project-categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => {});
  }

  async function moveProjCat(id: string, dir: -1 | 1) {
    const ordered = [...projCats].sort((a, b) => a.sort_order - b.sort_order);
    const i = ordered.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    const reindexed = ordered.map((c, idx) => ({ ...c, sort_order: idx }));
    setProjCats(reindexed);
    await fetch("/api/admin/project-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: reindexed.map((c) => ({ id: c.id, sort_order: c.sort_order })) }),
    }).catch(() => {});
  }

  async function deleteProjCat(id: string) {
    if (!confirm("Remover esta categoria dos metadados? (os projetos não são alterados)")) return;
    setProjCats((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/admin/project-categories/${id}`, { method: "DELETE" }).catch(() => {});
  }

  /** Cria a categoria no banco e devolve o slug — disponível NA HORA em todo o
   *  painel (gerenciador e editor de projetos leem o mesmo estado projCats). */
  async function addProjCatFromInput(raw: string): Promise<string | null> {
    const slug = slugify(raw);
    if (!slug) return null;
    if (projCats.some((c) => c.slug === slug)) return slug; // já existe
    const res = await fetch("/api/admin/project-categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, label: raw.trim() || humanizeCat(slug) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      alert(d?.error ?? "Falha ao criar a categoria.");
      return null;
    }
    const c = await res.json();
    setProjCats((prev) => [...prev, c]);
    return slug;
  }

  /** Cria a categoria digitada no editor e já a marca neste projeto. */
  async function createAndSelectCategory() {
    const slug = await addProjCatFromInput(newCatInput);
    setNewCatInput("");
    if (!slug) return;
    setPhotoForm((prev) => prev.categories.includes(slug) ? prev : { ...prev, categories: [...prev.categories, slug] });
  }

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d) => {
        if (d?.authed) setAuthed(true);
      })
      .catch(() => {});
  }, []);

  const fetchPartners = useCallback(async () => {
    setLoadingPartners(true);
    const res = await fetch("/api/partners");
    if (res.ok) setPartners(await res.json());
    setLoadingPartners(false);
  }, []);

  const fetchReps = useCallback(async () => {
    setLoadingReps(true);
    const [repsRes, countsRes] = await Promise.all([
      fetch("/api/sales-reps"),
      fetch("/api/sales-reps/partner-counts"),
    ]);
    if (repsRes.ok) setSalesReps(await repsRes.json());
    if (countsRes.ok) setJunctionPartnerCounts(await countsRes.json());
    setLoadingReps(false);
  }, []);

  const fetchUses = useCallback(async () => {
    setLoadingUses(true);
    try {
      const res = await fetch("/api/coupons/use");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setUses(data);
        setUsesError(null);
      } else {
        const msg = (data && typeof data === "object" && "error" in data) ? String(data.error) : `HTTP ${res.status}`;
        setUsesError(`Falha ao carregar cupons (/api/coupons/use): ${msg}`);
      }
    } catch (e) {
      setUsesError(`Falha ao carregar cupons (/api/coupons/use): ${e instanceof Error ? e.message : "erro de rede"}`);
    }
    setLoadingUses(false);
  }, []);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    const res = await fetch("/api/email-campaigns");
    if (res.ok) setCampaigns(await res.json());
    setCampaignsLoading(false);
  }, []);

  const fetchDripSteps = useCallback(async () => {
    setDripLoading(true);
    const res = await fetch("/api/admin/drip");
    if (res.ok) setDripSteps(await res.json());
    setDripLoading(false);
  }, []);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setClients(data);
        setClientsError(null);
      } else {
        const msg = res.status === 401
          ? "sessão de admin expirada ou inválida (401) — faça login novamente"
          : (data && typeof data === "object" && "error" in data) ? String(data.error) : `HTTP ${res.status}`;
        setClientsError(`Falha ao carregar orçamentos (/api/admin/clients): ${msg}`);
      }
    } catch (e) {
      setClientsError(`Falha ao carregar orçamentos (/api/admin/clients): ${e instanceof Error ? e.message : "erro de rede"}`);
    }
    setClientsLoading(false);
  }, []);

  const fetchPedidos = useCallback(async () => {
    setPedidosLoading(true);
    try {
      const res = await fetch("/api/admin/pedidos");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setPedidos(data as PedidoLite[]);
        setPedidosError(null);
      } else {
        const msg = res.status === 401
          ? "sessão de admin expirada ou inválida (401) — faça login novamente"
          : (data && typeof data === "object" && "error" in data) ? String(data.error) : `HTTP ${res.status}`;
        setPedidosError(`Falha ao carregar pedidos (/api/admin/pedidos): ${msg}`);
      }
    } catch (e) {
      setPedidosError(`Falha ao carregar pedidos (/api/admin/pedidos): ${e instanceof Error ? e.message : "erro de rede"}`);
    }
    setPedidosLoading(false);
  }, []);

  const fetchFollowUps = useCallback(async () => {
    setFollowUpLoading(true);
    const res = await fetch("/api/admin/followups");
    if (res.ok) {
      const data = await res.json();
      setFollowUps(data);
      if (data.length > 0) setFollowUpModalOpen(true);
    }
    setFollowUpLoading(false);
  }, []);

  const fetchDbProducts = useCallback(async () => {
    setLoadingDbProducts(true);
    // Admin sees ALL products (incl. inactive) so they can manage/reactivate.
    const res = await fetch("/api/products?all=true");
    if (res.ok) setDbProducts(await res.json());
    setLoadingDbProducts(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    const [pRes, rRes] = await Promise.all([fetch("/api/projects/photos"), fetch("/api/projects/renders")]);
    if (pRes.ok) setDbPhotoProjects(await pRes.json());
    if (rRes.ok) setDbRenderProjects(await rRes.json());
    setLoadingProjects(false);
  }, []);

  async function resolveFollowUp(id: string, sale_status: string) {
    await fetch(`/api/coupons/use/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sale_status }),
    });
    const remaining = followUps.filter((f) => f.id !== id);
    setFollowUps(remaining);
    if (remaining.length === 0) setFollowUpModalOpen(false);
    fetchUses(); // refresh history tab
  }

  async function snoozeFollowUp(id: string, days: number) {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`/api/coupons/use/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next_followup_at: until }),
    });
    const remaining = followUps.filter((f) => f.id !== id);
    setFollowUps(remaining);
    setSnoozeInputId(null);
    if (remaining.length === 0) setFollowUpModalOpen(false);
  }

  useEffect(() => {
    if (!authed || !supabaseConfigured) return;
    fetchPartners();
    fetchReps();
    fetchUses();
    fetchFollowUps();
  }, [authed, tab, supabaseConfigured, fetchPartners, fetchReps, fetchUses, fetchFollowUps]);

  // Auto-refresh the Parceiros tab so a partner moving their commission slider
  // shows up here without a manual reload (poll — no realtime socket needed).
  useEffect(() => {
    if (!authed || tab !== "partners") return;
    const t = setInterval(() => { fetchPartners(); }, 20000);
    return () => clearInterval(t);
  }, [authed, tab, fetchPartners]);

  useEffect(() => {
    if (tab === "dashboard" && authed && !dashData && !dashLoading) {
      setDashLoading(true);
      fetch("/api/admin/dashboard")
        .then((r) => r.json())
        .then((d) => {
          // Only store if it looks like a valid response (not an error payload)
          if (d && d.totalOrcamentos !== undefined) setDashData(d);
          setDashLoading(false);
        })
        .catch(() => setDashLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed]);

  // "Atenção agora" + sidebar badges: fetch once on login.
  useEffect(() => {
    if (authed && supabaseConfigured && !overview && !overviewLoading) fetchOverview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, supabaseConfigured]);

  useEffect(() => {
    if (tab === "campaigns" && authed) loadCampaigns();
  }, [tab, authed, loadCampaigns]);

  useEffect(() => {
    if (tab === "drip" && authed) fetchDripSteps();
  }, [tab, authed, fetchDripSteps]);

  useEffect(() => {
    if (tab === "chat" && authed && !chatPromptLoaded) fetchChatPrompt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed, chatPromptLoaded]);

  useEffect(() => {
    if (tab === "precos" && authed && !pricingLoaded) {
      fetch("/api/admin/pricing")
        .then((r) => r.json())
        .then((rows: PricingRow[]) => {
          setPricingRows(rows);
          const edits: Record<string, { special: string; public_: string }> = {};
          rows.forEach((r) => { edits[r.linha] = { special: String(r.special_price), public_: String(r.public_price) }; });
          setPricingEdits(edits);
          setPricingLoaded(true);
        })
        .catch(() => {});
    }
    if (tab === "precos" && authed && !orcCfg) {
      fetch("/api/admin/orcamento-config")
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => { if (c) setOrcCfg(c); })
        .catch(() => {});
      fetch("/api/admin/frete-zones")
        .then((r) => (r.ok ? r.json() : []))
        .then((z) => { if (Array.isArray(z)) setFreteZones(z); })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed, pricingLoaded]);

  useEffect(() => {
    if (tab === "orcamentos" && authed) {
      setClientsError(null); setUsesError(null); setPedidosError(null);
      fetchClients(); fetchUses(); fetchPedidos();
      fetch("/api/admin/orcamentos-formalizados")
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => { if (Array.isArray(rows)) setFormalQuotes(rows); })
        .catch(() => {});
    }
  }, [tab, authed, fetchClients, fetchUses, fetchPedidos]);

  useEffect(() => { if ((tab === "produtos" || tab === "simulador" || tab === "projetos") && authed) fetchDbProducts(); }, [tab, authed, fetchDbProducts]);
  useEffect(() => { if (tab === "projetos" && authed) fetchProjects(); }, [tab, authed, fetchProjects]);
  useEffect(() => { if (tab === "projetos" && authed) fetchProjCats(); }, [tab, authed]);
  // Semeia os metadados de categoria assim que os projetos carregam (uma vez).
  useEffect(() => {
    if (tab === "projetos" && authed && !catsSeeded && (dbPhotoProjects?.length ?? 0) >= 0) {
      const slugs = Array.from(new Set([...BASE_CATEGORIES, ...((dbPhotoProjects ?? []).flatMap((p) => p.categories ?? []))]));
      if (slugs.length > 0) { setCatsSeeded(true); seedProjCats(slugs, projCats); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed, dbPhotoProjects, catsSeeded]);
  useEffect(() => { if (tab === "visualizacoes" && authed) fetchVizRenders(); }, [tab, authed, fetchVizRenders]);
  useEffect(() => {
    if (tab === "projetos" && authed && mediaMigrated === null) {
      fetch("/api/admin/migrate-media")
        .then(r => r.json())
        .then(d => setMediaMigrated(d.migrated === true))
        .catch(() => setMediaMigrated(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed]);
  useEffect(() => {
    if (tab === "midia" && authed) {
      setAssetLoading(true);
      fetch("/api/admin/assets").then(r => r.json()).then(setAssetManifest).finally(() => setAssetLoading(false));
    }
  }, [tab, authed]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partnerFormRef = useRef<HTMLDivElement>(null);
  const repFormRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!authed) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollingRef.current = setInterval(() => {
      fetchPartners();
      fetchReps();
      fetchUses();
    }, 30000);
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [authed, fetchPartners, fetchReps, fetchUses]);

  async function generateCampaign() {
    setCampaignGenerating(true);
    await fetch("/api/email-campaigns", { method: "POST" });
    await loadCampaigns();
    setCampaignGenerating(false);
  }

  async function sendCampaignTest(id: string) {
    setCampaignTestSending(id);
    await fetch(`/api/email-campaigns/${id}/test`, { method: "POST" });
    setCampaignTestSending(null);
  }

  async function approveCampaign(id: string, token: string) {
    setCampaignApproving(id);
    await fetch(`/api/email-campaigns/${id}/approve?token=${token}`);
    await loadCampaigns();
    setCampaignApproving(null);
  }

  interface EmailBlocks {
    headline: string;
    subheadline: string;
    body: string;
    imageUrl: string;
    ctaText: string;
    ctaUrl: string;
  }

  function extractEmailBlocks(html: string): EmailBlocks | null {
    const m = html.match(/<!--ORBITAL_BLOCKS:([\s\S]*?)-->/);
    if (!m) return null;
    try { return JSON.parse(m[1]) as EmailBlocks; } catch { return null; }
  }

  // Best-effort parse of a campaign's HTML into editable blocks, used when the
  // campaign has no embedded ORBITAL_BLOCKS comment (e.g. system-generated
  // templates). Without this the Visual editor would open with empty fields.
  function htmlToBlocks(html: string): EmailBlocks {
    const decode = (s: string) =>
      s
        .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&nbsp;/g, " ")
        .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
        .replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘")
        .replace(/&#8594;/g, "").replace(/&rarr;/g, "")
        .replace(/&#10003;/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
    const strip = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

    let headline = "";
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) headline = strip(h1[1]);
    else {
      const big = html.match(/<p[^>]*font-size:2\dpx[^>]*>([\s\S]*?)<\/p>/i);
      if (big) headline = strip(big[1]);
    }

    let subheadline = "";
    const sub = html.match(/<p[^>]*color:#74777f;[^>]*text-transform:uppercase[^>]*>([\s\S]*?)<\/p>/i);
    if (sub) subheadline = strip(sub[1]);

    const imgs = [...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi)].map((m) => m[1]);
    const imageUrl = imgs.find((u) => u && !/logo/i.test(u)) ?? "";

    let ctaText = "";
    let ctaUrl = "";
    const anchors = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const btn = anchors.find((a) => /→|&#8594;|&rarr;/.test(a[2]) || /padding:1\d/.test(a[0]));
    if (btn) {
      ctaUrl = btn[1];
      ctaText = strip(btn[2]).replace(/\s*→\s*$/, "");
    }

    const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter(Boolean);
    const body = paras
      .filter(
        (t) =>
          t !== headline &&
          t !== subheadline &&
          !/PARTNER_NAME|COUPON_CODE|Descadastrar|cancelar|contato@|Portal do Parceiro|ORBITAL REVESTIMENTOS/i.test(t),
      )
      .join("\n");

    return { headline, subheadline, body, imageUrl, ctaText, ctaUrl };
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Excluir esta campanha permanentemente? Esta ação não pode ser desfeita.")) return;
    setCampaignDeleting(id);
    const res = await fetch(`/api/email-campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (expandedCampaignId === id) setExpandedCampaignId(null);
      if (editingCampaignId === id) setEditingCampaignId(null);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } else {
      const json = await res.json().catch(() => null);
      alert((json && json.error) || "Falha ao excluir a campanha.");
    }
    setCampaignDeleting(null);
  }

  async function runCampaignAiEdit() {
    if (!campaignAiInstruction.trim()) return;
    setCampaignAiEditing(true);
    try {
      const res = await fetch("/api/email-campaigns/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: campaignAiInstruction.trim(),
          current: {
            subject: campaignEditSubject,
            subheadline: campaignVisualSubheadline,
            headline: campaignVisualHeadline,
            body: campaignVisualBody,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        alert((json && json.error) || "Erro ao gerar com IA.");
        return;
      }
      if (typeof json.subject === "string" && json.subject.trim()) setCampaignEditSubject(json.subject.trim());
      if (typeof json.subheadline === "string") setCampaignVisualSubheadline(json.subheadline);
      if (typeof json.headline === "string" && json.headline.trim()) setCampaignVisualHeadline(json.headline);
      if (typeof json.body === "string" && json.body.trim()) setCampaignVisualBody(json.body);
      setCampaignAiInstruction("");
    } finally {
      setCampaignAiEditing(false);
    }
  }

  function embedEmailBlocks(html: string, blocks: EmailBlocks): string {
    // Remove any existing blocks comment first
    const clean = html.replace(/<!--ORBITAL_BLOCKS:[\s\S]*?-->\n?/, "");
    return `<!--ORBITAL_BLOCKS:${JSON.stringify(blocks)}-->\n${clean}`;
  }

  function generateEmailHtml(b: EmailBlocks): string {
    const bodyHtml = b.body
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => `<p style="margin:0 0 16px 0;color:#43474e;font-size:15px;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">${l}</p>`)
      .join("");

    const imageSection = b.imageUrl
      ? `<tr><td style="padding:0;line-height:0;"><img src="${b.imageUrl}" alt="" width="580" style="display:block;width:100%;max-width:580px;height:auto;"></td></tr>`
      : "";

    const subheadlineHtml = b.subheadline
      ? `<p style="margin:0 0 10px 0;color:#74777f;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;font-family:Arial,Helvetica,sans-serif;">${b.subheadline}</p>`
      : "";

    const ctaHtml = b.ctaText
      ? `<table cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="background:#002045;"><a href="${b.ctaUrl}" style="display:block;padding:14px 32px;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${b.ctaText} →</a></td></tr></table>`
      : "";

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${b.headline}</title>
</head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0efec;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;">
        <tr><td style="background:#002045;padding:24px 36px;">
          <p style="margin:0;color:#ffffff;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;font-weight:700;font-family:Arial,Helvetica,sans-serif;">ORBITAL REVESTIMENTOS</p>
        </td></tr>
        ${imageSection}
        <tr><td style="padding:40px 36px 32px;">
          ${subheadlineHtml}
          <h1 style="margin:0 0 24px 0;color:#002045;font-size:26px;font-weight:400;line-height:1.3;font-family:Georgia,'Times New Roman',serif;">${b.headline}</h1>
          ${bodyHtml}
          ${ctaHtml}
        </td></tr>
        <tr><td style="background:#f0efec;border-top:1px solid #e2e2e2;padding:20px 36px;text-align:center;">
          <p style="margin:0;color:#9e9e9e;font-size:10px;font-family:Arial,Helvetica,sans-serif;">Orbital Revestimentos · São Paulo, SP · <a href="{{unsubscribeUrl}}" style="color:#9e9e9e;text-decoration:underline;">Descadastrar</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  async function handleCampaignImageUpload(file: File) {
    setCampaignImageUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
    const json = await res.json();
    if (res.ok) setCampaignVisualImageUrl(json.url);
    setCampaignImageUploading(false);
  }

  async function saveCampaignEdit(id: string) {
    setCampaignEditSaving(true);
    let finalHtml = campaignEditBody;
    if (campaignEditMode === "visual") {
      const blocks: EmailBlocks = {
        headline: campaignVisualHeadline,
        subheadline: campaignVisualSubheadline,
        body: campaignVisualBody,
        imageUrl: campaignVisualImageUrl,
        ctaText: campaignVisualCtaText,
        ctaUrl: campaignVisualCtaUrl,
      };
      finalHtml = embedEmailBlocks(generateEmailHtml(blocks), blocks);
    }
    const res = await fetch(`/api/email-campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: campaignEditSubject, html_body: finalHtml }),
    });
    if (res.ok) {
      await loadCampaigns();
      setEditingCampaignId(null);
    }
    setCampaignEditSaving(false);
  }

  async function seedDripSteps() {
    setDripSeeding(true);
    await fetch("/api/admin/drip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    await fetchDripSteps();
    setDripSeeding(false);
  }

  async function saveDripEdit(stepNumber: number) {
    setDripEditSaving(true);
    const body: Record<string, unknown> = {
      subject: dripEditSubject,
      body_html: dripEditBodyHtml,
    };
    const step = dripSteps.find((s) => s.step_number === stepNumber);
    if (step && step.delay_days !== null) {
      body.delay_days = dripEditDelayDays === "" ? null : parseInt(dripEditDelayDays, 10);
    } else if (stepNumber !== 98 && stepNumber !== 99) {
      body.delay_days = dripEditDelayDays === "" ? null : parseInt(dripEditDelayDays, 10);
    }
    const res = await fetch(`/api/admin/drip/${stepNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await fetchDripSteps();
      setEditingDripStep(null);
    }
    setDripEditSaving(false);
  }

  async function deleteClient(id: string, isStandalone?: boolean, isPedido?: boolean) {
    if (!confirm(isPedido ? "Excluir este pedido permanentemente?" : isStandalone ? "Excluir este orçamento permanentemente?" : "Excluir este cliente e toda a sua sequência de emails?")) return;
    setDeletingClientId(id);
    if (isPedido) {
      const res = await fetch(`/api/admin/pedidos/${id}`, { method: "DELETE" });
      if (res.ok) setPedidos((prev) => prev.filter((p) => p.id !== id));
      setDeletingClientId(null);
      return;
    }
    if (isStandalone) {
      // Standalone coupon_use row — delete from coupon_uses
      const res = await fetch(`/api/coupons/use/${id}`, { method: "DELETE" });
      if (res.ok) setUses((prev) => prev.filter((u) => u.id !== id));
    } else {
      const res = await fetch("/api/admin/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setClients((prev) => prev.filter((c) => c.id !== id));
    }
    setDeletingClientId(null);
  }

  async function exportClients() {
    setClientsExporting(true);
    const res = await fetch("/api/admin/clients/export");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `clientes-orbital-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setClientsExporting(false);
  }

  const DRIP_SAMPLE_VARS: Record<string, string> = {
    firstName: "João",
    clientName: "João Silva",
    spaceLabel: "Sala de estar",
    model: "Classic",
    finish: "Mármore Fosco",
    plates: "8",
    area: "27,84 m²",
    total: "R$ 4.472",
    partnerFirst: "Ana",
    partnerName: "Ana Lima",
    waLink: "#",
    quoteCard: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;"><tr><td style="padding:24px 28px;"><p style="margin:0 0 8px;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">SEU ORÇAMENTO</p><p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;font-family:Arial,sans-serif;">R$ 4.472</p></td></tr></table>`,
    quoteLink: "[link do orçamento]",
    productImages: "[fotos do modelo]",
  };

  function interpolateSample(template: string): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return Object.prototype.hasOwnProperty.call(DRIP_SAMPLE_VARS, key)
        ? DRIP_SAMPLE_VARS[key]
        : `{{${key}}}`;
    });
  }

  function dripDelayLabel(step: DripStep): string {
    if (step.step_number === 1) return "Enviado imediatamente";
    if (step.step_number === 99) return "Enviado ao concluir";
    if (step.step_number === 98) return "Enviado ao cancelar";
    if (step.delay_days != null) return `+${step.delay_days} dia${step.delay_days !== 1 ? "s" : ""} após o anterior`;
    return "—";
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        setPw("");
        setAuthed(true);
      } else {
        const data = await res.json().catch(() => null);
        setPwError(data?.error || "Senha incorreta.");
      }
    } catch {
      setPwError("Erro ao conectar. Tente novamente.");
    }
  }

  async function handleAdminChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) { setCpError("As senhas não coincidem."); return; }
    if (cpNew.length < 8) { setCpError("A nova senha deve ter pelo menos 8 caracteres."); return; }
    setCpLoading(true);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: cpCurrent, new_password: cpNew }),
    });
    const json = await res.json();
    setCpLoading(false);
    if (!res.ok) { setCpError(json.error || "Erro ao alterar senha."); return; }
    setCpSuccess(true);
    setCpCurrent(""); setCpNew(""); setCpConfirm("");
    setTimeout(() => { setCpOpen(false); setCpSuccess(false); }, 2000);
  }

  // ── Image upload helper ──────────────────
  /** Upload a single file directly to Supabase (no Next.js size limit). */
  async function uploadDirect(original: File, folder: string): Promise<string | null> {
    // Comprime ANTES de subir. Foto de câmera (8064×6048, até 14 MB) era enviada
    // e servida crua ao visitante — 287 arquivos assim consumiram 15,9 GB de
    // banda num mês. 2400px/q82 mantém a nitidez e corta ~96% do peso.
    const file = await compressImage(original);

    // Step 1: get a signed upload URL from our API (tiny JSON request, no file bytes)
    const signRes = await fetch("/api/admin/upload-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, filename: file.name, contentType: file.type }),
    });
    if (!signRes.ok) {
      const err = await signRes.text();
      console.error("[uploadDirect] sign failed:", err);
      alert(`Erro ao assinar upload: ${err}`);
      return null;
    }
    const { signedUrl, publicUrl } = await signRes.json();

    // Step 2: PUT the raw file bytes directly to Supabase — bypasses Next.js entirely
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("[uploadDirect] PUT failed:", uploadRes.status, err);
      alert(`Erro no upload (${uploadRes.status}): ${err}`);
      return null;
    }
    return publicUrl;
  }

  async function uploadImage(file: File, folder: string): Promise<string|null> {
    setProductImageUploading(true);
    const url = await uploadDirect(file, folder);
    setProductImageUploading(false);
    return url;
  }

  async function substituteProductCoverImage(product: DbProduct, file: File) {
    setProductImageSubstituting(product.id);
    const url = await uploadDirect(file, "products");
    if (url) {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: product.code, name: product.name, linha: product.linha,
          finish: product.finish, price: product.price, price_per_m2: product.price_per_m2,
          description: product.description, image_path: url,
          is_active: product.is_active, sort_order: product.sort_order,
        }),
      });
      if (res.ok) {
        setDbProducts(prev => prev.map(p => p.id === product.id ? { ...p, image_path: url } : p));
        // Also update the form if this product is currently being edited
        if (editingProductId === product.id) {
          setProductForm(prev => ({ ...prev, image_path: url }));
        }
      }
    }
    setProductImageSubstituting(null);
  }

  // ── Product CRUD ─────────────────────────
  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProductFormError("");
    setProductFormLoading(true);
    let res: Response;
    if (editingProductId) {
      res = await fetch(`/api/products/${editingProductId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
    } else {
      res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
    }
    const json = await res.json();
    setProductFormLoading(false);
    if (!res.ok) { setProductFormError(json.error || "Erro desconhecido."); return; }
    setShowProductForm(false);
    setEditingProductId(null);
    setProductForm({ code:"", name:"", linha:"Classic", finish:"Fosco", price:559, price_per_m2:161, description:"", image_path:"", is_active:true, show_in_catalog:true, sort_order:0, render_finish_description:"", render_panel_width_m:1.2, render_panel_height_m:2.9, render_context_image_path:"", render_texture_path:"", render_extra_notes:"" });
    fetchDbProducts();
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Excluir produto "${name}"?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchDbProducts();
  }

  function startEditProduct(p: DbProduct) {
    setEditingProductId(p.id);
    setProductForm({ code: p.code, name: p.name, linha: p.linha, finish: p.finish, price: p.price, price_per_m2: p.price_per_m2, description: p.description, image_path: p.image_path, is_active: p.is_active, show_in_catalog: p.show_in_catalog !== false, sort_order: p.sort_order, render_finish_description: p.render_finish_description ?? "", render_panel_width_m: Number(p.render_panel_width_m) || 1.2, render_panel_height_m: Number(p.render_panel_height_m) || 2.9, render_context_image_path: p.render_context_image_path ?? "", render_texture_path: p.render_texture_path ?? "", render_extra_notes: p.render_extra_notes ?? "" });
    setProductFormError("");
    setGalleryImages(p.product_images ?? []);
    setShowProductForm(true);
    setTimeout(() => productTabFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  /**
   * Abre a etiqueta pronta para impressão numa janela própria.
   *
   * Uma janela dedicada em vez de imprimir a página: o painel inteiro sairia na
   * folha. Aqui sai só o QR, o código e o nome — o que vai colado na amostra.
   */
  function printProductQr(code: string, name: string) {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return; // bloqueador de pop-up — os botões de download seguem valendo
    const safe = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>QR ${safe(code)}</title>
<style>
  @page { margin: 12mm; }
  body { font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 24px; color: #002045; }
  img { width: 62mm; height: 62mm; display: block; margin: 0 auto 10px; }
  .code { font-size: 15px; font-weight: 700; letter-spacing: .12em; }
  .name { font-size: 13px; color: #43474e; margin-top: 2px; }
  .brand { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: #74777f; margin-top: 12px; }
</style></head><body>
<img src="${productQrUrl(code, "png", 1024)}" alt="QR ${safe(code)}">
<div class="code">${safe(code.toUpperCase())}</div>
<div class="name">${safe(name || "")}</div>
<div class="brand">Orbital Revestimentos</div>
<script>
  // Só imprime depois que a imagem carrega — senão a folha sai em branco.
  var i = document.images[0];
  if (i.complete) window.print();
  else { i.onload = function () { window.print(); }; i.onerror = function () { document.body.innerHTML = '<p>Não foi possível carregar o QR Code.</p>'; }; }
<\/script>
</body></html>`);
    w.document.close();
  }

  /**
   * Baixa todas as fotos do modelo num único .zip.
   *
   * O servidor monta o pacote (o navegador não pode ler o storage direto sem
   * CORS, e disparar 17 downloads seguidos é bloqueado como pop-up). Aqui só
   * recebemos o blob e o entregamos com o nome que o servidor definiu.
   */
  async function downloadAllProductImages() {
    if (!editingProductId) return;
    setGalleryZipping(true);
    setGalleryZipError(null);
    try {
      const res = await fetch(`/api/admin/products/${editingProductId}/images-zip`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setGalleryZipError(
          res.status === 401 ? "Sessão de admin expirada — entre novamente."
            : j?.error ?? `Não foi possível gerar o pacote (HTTP ${res.status}).`
        );
        return;
      }
      // O servidor informa se alguma foto ficou de fora, para não entregar um
      // pacote incompleto em silêncio.
      const falhas = Number(res.headers.get("X-Orbital-Falhas") ?? 0);
      const total = Number(res.headers.get("X-Orbital-Total") ?? 0);

      const nameFromServer = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1];
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nameFromServer || "fotos.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (falhas > 0) {
        setGalleryZipError(`${total} foto(s) baixada(s); ${falhas} não puderam ser lidas do storage e ficaram de fora.`);
      }
    } catch {
      setGalleryZipError("Falha de rede ao gerar o pacote.");
    } finally {
      setGalleryZipping(false);
    }
  }

  async function addGalleryImages(files: FileList) {
    if (!editingProductId || files.length === 0) return;
    setGalleryUploading(true);
    setGalleryUploadProgress({ done: 0, total: files.length });
    setProductFormError("");
    const added: ProductImage[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      // Upload directly to Supabase — no Next.js size limit
      const url = await uploadDirect(files[i], "products");

      if (!url) {
        errors.push(`Arquivo ${i + 1}: erro no upload`);
        setGalleryUploadProgress({ done: i + 1, total: files.length });
        continue;
      }

      // Step 2: save URL to product_images table
      const res = await fetch(`/api/products/${editingProductId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_path: url }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        errors.push(`Arquivo ${i + 1}: imagem enviada mas não salva — ${json.error || res.status}`);
      } else {
        added.push(await res.json());
      }

      setGalleryUploadProgress({ done: i + 1, total: files.length });
    }

    if (added.length > 0) {
      setGalleryImages((prev) => [...prev, ...added]);
      fetchDbProducts();
    }
    if (errors.length > 0) {
      setProductFormError(errors.join(" | "));
    }
    setGalleryUploading(false);
    setGalleryUploadProgress(null);
  }

  async function deleteGalleryImage(imageId: string) {
    if (!confirm("Remover esta imagem da galeria?")) return;
    const res = await fetch(`/api/products/images/${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
      fetchDbProducts();
    }
  }

  function setImageAsCover(url: string) {
    setProductForm((prev) => ({ ...prev, image_path: url }));
  }

  async function moveGalleryImage(imageId: string, direction: "left" | "right") {
    const idx = galleryImages.findIndex((img) => img.id === imageId);
    if (idx === -1) return;
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= galleryImages.length) return;

    // Swap in local state immediately for snappy UI
    const updated = [...galleryImages];
    const aOrder = updated[idx].sort_order;
    const bOrder = updated[newIdx].sort_order;
    updated[idx] = { ...updated[idx], sort_order: bOrder };
    updated[newIdx] = { ...updated[newIdx], sort_order: aOrder };
    // Sort by new sort_order
    updated.sort((a, b) => a.sort_order - b.sort_order);
    setGalleryImages(updated);

    // Persist both swapped items
    await Promise.all([
      fetch(`/api/products/images/${updated.find(i => i.id === imageId)!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: bOrder }),
      }),
      fetch(`/api/products/images/${galleryImages[newIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: aOrder }),
      }),
    ]);
  }

  // Drag-and-drop da galeria de produto: move a imagem `fromId` para a posição de
  // `toId`, reindexa e persiste todas as sort_order alteradas. (As setas seguem
  // disponíveis como acessibilidade.)
  async function reorderGalleryImages(fromId: string, toId: string) {
    if (fromId === toId) return;
    const items = [...galleryImages].sort((a, b) => a.sort_order - b.sort_order);
    const fromIdx = items.findIndex((i) => i.id === fromId);
    const toIdx = items.findIndex((i) => i.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const reindexed = items.map((img, i) => ({ ...img, sort_order: i }));
    const before = new Map(galleryImages.map((i) => [i.id, i.sort_order]));
    setGalleryImages(reindexed);
    await Promise.all(
      reindexed
        .filter((img) => before.get(img.id) !== img.sort_order)
        .map((img) =>
          fetch(`/api/products/images/${img.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: img.sort_order }),
          })
        )
    );
  }

  // ── Photo Project CRUD ───────────────────
  async function handlePhotoSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Slug é técnico e agora fica em "avançado" — garanta que sempre exista,
    // derivando do nome quando o usuário não editou manualmente.
    const ensuredSlug = photoForm.slug.trim() || slugify(photoForm.title);
    if (ensuredSlug !== photoForm.slug) setPhotoForm((prev) => ({ ...prev, slug: ensuredSlug }));
    const formToSend = { ...photoForm, slug: ensuredSlug };
    let res: Response;
    if (editingPhotoId) {
      res = await fetch(`/api/projects/photos/${editingPhotoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToSend),
      });
    } else {
      res = await fetch("/api/projects/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToSend),
      });
    }
    if (res.ok) {
      setShowPhotoForm(false);
      setEditingPhotoId(null);
      setPhotoForm({ slug:"", title:"", product_code:"", short_description:"", categories:[], image_after:"", image_before:"", note:"", is_active:true, is_featured:false, show_on_home:false, is_new:false, feature_order:0, content_type:"", cover_category:"depois", sort_order:0 });
      setSlugTouched(false); setProductPickerQuery(""); setPhotoAdvancedOpen(false);
      fetchProjects();
    }
  }

  async function deletePhoto(id: string, title: string) {
    if (!confirm(`Excluir projeto "${title}"?`)) return;
    await fetch(`/api/projects/photos/${id}`, { method: "DELETE" });
    fetchProjects();
  }

  // Recebe o blob 1:1 do cropper, envia ao storage e grava na capa/antes.
  async function handleCroppedCover(blob: Blob) {
    if (!coverCrop) return;
    const target = coverCrop.target;
    const file = new File([blob], `projeto-${Date.now()}.jpg`, { type: "image/jpeg" });
    const url = await uploadDirect(file, "projetos");
    if (url) setPhotoForm((prev) => ({ ...prev, [target]: url }));
    setCoverCrop(null);
  }

  async function duplicatePhoto(id: string, title: string) {
    if (!confirm(`Duplicar "${title}"? A cópia é criada como rascunho (inativa).`)) return;
    const res = await fetch(`/api/projects/photos/${id}/duplicate`, { method: "POST" });
    if (res.ok) { await fetchProjects(); alert("Projeto duplicado como rascunho."); }
    else { const d = await res.json().catch(() => null); alert(d?.error ?? "Falha ao duplicar."); }
  }

  async function togglePhotoActive(p: DbPhotoProject) {
    const next = !p.is_active;
    setDbPhotoProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)));
    const res = await fetch(`/api/projects/photos/${p.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, is_active: next }),
    });
    if (!res.ok) { setDbPhotoProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: p.is_active } : x))); }
  }

  function startEditPhoto(p: DbPhotoProject) {
    setEditingPhotoId(p.id);
    setPhotoForm({ slug: p.slug, title: p.title, product_code: p.product_code, short_description: p.short_description ?? "", categories: p.categories, image_after: p.image_after, image_before: p.image_before, note: p.note, is_active: p.is_active, is_featured: p.is_featured ?? false, show_on_home: p.show_on_home ?? false, is_new: p.is_new ?? false, feature_order: p.feature_order ?? 0, content_type: p.content_type ?? "", cover_category: p.cover_category === "antes" ? "antes" : "depois", sort_order: p.sort_order });
    setSlugTouched(true); setProductPickerQuery(""); setPhotoAdvancedOpen(false);
    setShowPhotoForm(true);
    setTimeout(() => photoTabFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // ── Render Project CRUD ──────────────────
  async function handleRenderSubmit(e: React.FormEvent) {
    e.preventDefault();
    let res: Response;
    if (editingRenderId) {
      res = await fetch(`/api/projects/renders/${editingRenderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renderForm),
      });
    } else {
      res = await fetch("/api/projects/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renderForm),
      });
    }
    if (res.ok) {
      setShowRenderForm(false);
      setEditingRenderId(null);
      setRenderForm({ slug:"", title:"", product_code:"", image_path:"", is_active:true, sort_order:0 });
      fetchProjects();
    }
  }

  async function deleteRender(id: string, title: string) {
    if (!confirm(`Excluir render "${title}"?`)) return;
    await fetch(`/api/projects/renders/${id}`, { method: "DELETE" });
    fetchProjects();
  }

  function startEditRender(r: DbRenderProject) {
    setEditingRenderId(r.id);
    setRenderForm({ slug: r.slug, title: r.title, product_code: r.product_code, image_path: r.image_path, is_active: r.is_active, sort_order: r.sort_order });
    setShowRenderForm(true);
    setTimeout(() => renderTabFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // ── Project Media CRUD ──────────────────
  async function fetchProjectMedia(slug: string) {
    const res = await fetch(`/api/projects/media?slug=${slug}`);
    if (res.ok) {
      const data = await res.json();
      setProjectMediaMap((prev) => ({ ...prev, [slug]: data }));
    }
  }

  // As fotos entram já classificadas com o que estiver selecionado ao lado do
  // botão "+ Fotos" — evita a galeria encher de mídia "sem classificação".
  async function addProjectMediaImage(slug: string, file: File) {
    setMediaUploading(true);
    const url = await uploadDirect(file, "projetos");
    if (url) {
      const existing = projectMediaMap[slug] ?? [];
      await fetch("/api/projects/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_slug: slug, type: "image", url, category: uploadCategory, sort_order: existing.length }),
      });
      await fetchProjectMedia(slug);
    }
    setMediaUploading(false);
  }

  async function addProjectMediaVideo(slug: string, url: string) {
    if (!url.trim()) return;
    const existing = projectMediaMap[slug] ?? [];
    await fetch("/api/projects/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_slug: slug, type: "video", url: url.trim(), sort_order: existing.length }),
    });
    await fetchProjectMedia(slug);
    setVideoUrlInput("");
  }

  async function addProjectMediaVideoFile(slug: string, file: File) {
    setMediaUploading(true);
    const url = await uploadDirect(file, "projetos");
    if (url) {
      const existing = projectMediaMap[slug] ?? [];
      await fetch("/api/projects/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_slug: slug, type: "video", url, sort_order: existing.length }),
      });
      await fetchProjectMedia(slug);
    }
    setMediaUploading(false);
  }

  async function deleteProjectMedia(id: string, slug: string) {
    await fetch(`/api/projects/media/${id}`, { method: "DELETE" });
    await fetchProjectMedia(slug);
  }

  async function patchProjectMedia(id: string, slug: string, body: Partial<ProjectMedia>) {
    await fetch(`/api/projects/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await fetchProjectMedia(slug);
  }

  // Autosave da categoria — muda no clique, sem exigir "Salvar". Atualização
  // otimista + confirmação discreta; reverte e avisa se o PATCH falhar.
  async function setMediaCategory(id: string, slug: string, category: "geral" | "antes" | "depois") {
    const prevList = projectMediaMap[slug] ?? [];
    const before = prevList.find((m) => m.id === id)?.category ?? "geral";
    if (before === category) return;
    setProjectMediaMap((prev) => ({ ...prev, [slug]: (prev[slug] ?? []).map((m) => (m.id === id ? { ...m, category } : m)) }));
    setEditMediaDraft((d) => ({ ...d, category }));
    try {
      const res = await fetch(`/api/projects/media/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error();
      setMediaToast({ text: "Categoria atualizada" });
    } catch {
      setProjectMediaMap((prev) => ({ ...prev, [slug]: (prev[slug] ?? []).map((m) => (m.id === id ? { ...m, category: before } : m)) }));
      setMediaToast({ text: "Falha ao atualizar categoria", error: true });
    }
    setTimeout(() => setMediaToast(null), 2500);
  }

  // "Usar como capa" — troca segura: a mídia escolhida vira a capa (image_after)
  // e a capa anterior desce para a galeria de mídias, preservando o arquivo.
  // Nenhuma imagem é apagada; se algo falhar, a capa anterior é mantida.
  async function useMediaAsCover(m: ProjectMedia, project: { id: string; slug: string; image_after?: string | null }) {
    if (m.type !== "image") { setMediaToast({ text: "Apenas imagens podem ser capa", error: true }); setTimeout(() => setMediaToast(null), 2500); return; }
    if (!confirm("Definir esta imagem como capa? A capa atual continua na galeria.")) return;
    setSettingCoverId(m.id);
    const oldCover = project.image_after ?? null;
    const list = projectMediaMap[project.slug] ?? [];
    // A classificação da mídia vira a classificação da capa — nada é inferido.
    const newCoverCategory = m.category === "antes" ? "antes" : "depois";
    try {
      // 1) libera a marca de capa da mídia antiga (índice único: uma capa por
      //    projeto). Ela CONTINUA na galeria — nenhum arquivo é apagado.
      const prevCoverRow = list.find((x) => x.is_cover && x.id !== m.id);
      if (prevCoverRow) {
        await fetch(`/api/projects/media/${prevCoverRow.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_cover: false }),
        });
      }
      // 2) a mídia escolhida passa a ser a capa (continua na galeria)
      await fetch(`/api/projects/media/${m.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_cover: true, category: newCoverCategory, sort_order: -1000 }),
      });
      // 3) espelha a capa em project_photos (o que cards, home e PDF leem)
      const up = await fetch(`/api/projects/photos/${project.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_after: m.url, cover_category: newCoverCategory }),
      });
      if (!up.ok) throw new Error();
      // 4) rede de segurança: se a capa anterior não tinha linha na galeria
      //    (base ainda sem a migração 051), cria uma agora para não se perder.
      if (oldCover && oldCover !== m.url && !list.some((x) => x.url === oldCover)) {
        await fetch("/api/projects/media", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_slug: project.slug, type: "image", url: oldCover, category: "depois", sort_order: -999 }),
        });
      }
      await fetchProjectMedia(project.slug);
      await fetchProjects();
      setMediaToast({ text: "Capa atualizada" });
    } catch {
      setMediaToast({ text: "Falha ao trocar a capa — nada foi perdido", error: true });
    } finally {
      setSettingCoverId(null);
      setTimeout(() => setMediaToast(null), 2500);
    }
  }

  async function reorderMedia(slug: string, fromId: string, toId: string) {
    const items = [...(projectMediaMap[slug] ?? [])];
    const fromIdx = items.findIndex((m) => m.id === fromId);
    const toIdx = items.findIndex((m) => m.id === toId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    // Reorder array
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    // Reassign sort_order sequentially
    const reindexed = items.map((m, i) => ({ ...m, sort_order: i }));
    // Optimistic update
    setProjectMediaMap((prev) => ({ ...prev, [slug]: reindexed }));
    // Persist only changed items
    await Promise.all(
      reindexed
        .filter((m, i) => (projectMediaMap[slug] ?? [])[i]?.id !== m.id || (projectMediaMap[slug] ?? [])[i]?.sort_order !== m.sort_order)
        .map((m) =>
          fetch(`/api/projects/media/${m.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: m.sort_order }),
          })
        )
    );
  }

  async function generateAiDescription(imageUrl: string) {
    setAiDescGenerating(true);
    try {
      const res = await fetch("/api/admin/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          category: editMediaDraft.category,
          hint: aiDescHint,
        }),
      });
      const json = await res.json();
      if (json.description) {
        setEditMediaDraft(d => ({ ...d, description: json.description }));
      } else {
        alert(json.error || "Erro ao gerar descrição.");
      }
    } finally {
      setAiDescGenerating(false);
    }
  }

  async function generateAiText(fieldKey: string, systemPrompt: string, userPrompt: string, setter: (text: string) => void) {
    setAiTextGenerating(fieldKey);
    try {
      const res = await fetch("/api/admin/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userPrompt, maxTokens: 500 }),
      });
      const json = await res.json();
      if (json.text) setter(json.text);
      else alert(json.error || "Erro ao gerar texto.");
    } finally {
      setAiTextGenerating(null);
    }
  }

  async function fetchAdminCoupons() {
    const res = await fetch("/api/admin/coupons");
    if (res.ok) setAdminCoupons(await res.json());
  }

  async function createAdminCoupon() {
    if (!newCouponCode.trim() || !newCouponPct) return;
    setCouponCreating(true);
    setCouponCreatedMsg("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCouponCode.trim().toUpperCase(),
        discount_pct: parseFloat(newCouponPct),
        payment_type: newCouponPayment,
        usage_type: newCouponUsage,
        expires_at: newCouponUsage === "temporary" && newCouponExpiry ? new Date(newCouponExpiry).toISOString() : null,
      }),
    });
    const json = await res.json();
    if (json.error) {
      alert("Erro: " + json.error);
    } else {
      setCouponCreatedMsg(`Cupom ${json.code} criado!`);
      setNewCouponCode("");
      setSimCoupon(json.code);
      await fetchAdminCoupons();
    }
    setCouponCreating(false);
  }

  async function deleteAdminCoupon(id: string) {
    await fetch("/api/admin/coupons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchAdminCoupons();
  }

  async function fetchChatPrompt() {
    const res = await fetch("/api/admin/chat-settings");
    if (res.ok) {
      const json = await res.json();
      // If no custom prompt saved yet, load the default from the API
      if (json.prompt) {
        setChatPrompt(json.prompt);
      } else {
        const defRes = await fetch("/api/admin/chat-settings/default");
        if (defRes.ok) {
          const defJson = await defRes.json();
          setChatPrompt(defJson.prompt ?? "");
        }
      }
    }
    setChatPromptLoaded(true);
  }

  async function saveChatPrompt() {
    if (!chatPrompt.trim()) return;
    setChatPromptSaving(true);
    setChatPromptMsg("");
    const res = await fetch("/api/admin/chat-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: chatPrompt }),
    });
    if (res.ok) {
      setChatPromptMsg("Salvo com sucesso! O assistente já usa o novo prompt.");
    } else {
      const json = await res.json();
      setChatPromptMsg("Erro: " + (json.error || "desconhecido"));
    }
    setChatPromptSaving(false);
    setTimeout(() => setChatPromptMsg(""), 4000);
  }

  async function resetChatPrompt() {
    const res = await fetch("/api/admin/chat-settings/default");
    if (res.ok) {
      const json = await res.json();
      setChatPrompt(json.prompt ?? "");
    }
  }

  async function savePricing(linha: string) {
    const edit = pricingEdits[linha];
    if (!edit) return;
    const special_price = parseInt(edit.special);
    const public_price = parseInt(edit.public_);
    if (!special_price || !public_price || special_price <= 0 || public_price <= 0) {
      setPricingMsg((prev) => ({ ...prev, [linha]: "Valores inválidos." }));
      return;
    }
    setPricingSaving((prev) => ({ ...prev, [linha]: true }));
    setPricingMsg((prev) => ({ ...prev, [linha]: "" }));
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linha, special_price, public_price }),
    });
    setPricingSaving((prev) => ({ ...prev, [linha]: false }));
    if (res.ok) {
      setPricingMsg((prev) => ({ ...prev, [linha]: "Salvo ✓" }));
      setPricingRows((prev) => prev.map((r) => r.linha === linha ? { ...r, special_price, public_price } : r));
    } else {
      setPricingMsg((prev) => ({ ...prev, [linha]: "Erro ao salvar." }));
    }
    setTimeout(() => setPricingMsg((prev) => ({ ...prev, [linha]: "" })), 4000);
  }

  function setOrcCfgField(key: string, value: unknown) {
    setOrcCfg((prev) => ({ ...(prev ?? {}), [key]: value }));
  }

  async function saveOrcCfg() {
    if (!orcCfg) return;
    setOrcCfgSaving(true);
    setOrcCfgMsg("");
    try {
      const res = await fetch("/api/admin/orcamento-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orcCfg),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) { setOrcCfg(data); setOrcCfgMsg("Salvo ✓"); }
      else setOrcCfgMsg(data?.error ?? "Erro ao salvar.");
    } catch {
      setOrcCfgMsg("Erro de rede.");
    } finally {
      setOrcCfgSaving(false);
      setTimeout(() => setOrcCfgMsg(""), 4000);
    }
  }

  async function addFreteZone() {
    if (!newZone.name.trim()) return;
    setZoneSaving(true);
    try {
      const res = await fetch("/api/admin/frete-zones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newZone, value: parseFloat(newZone.value) || 0 }),
      });
      if (res.ok) {
        const z = await res.json();
        setFreteZones((prev) => [...prev, z].sort((a, b) => a.priority - b.priority));
        setNewZone({ name:"", cep_start:"", cep_end:"", cep_list:"", value:"150", neighborhoods:"" });
      }
    } finally { setZoneSaving(false); }
  }

  async function patchFreteZone(id: string, patch: Partial<FreteZone>) {
    setFreteZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
    await fetch(`/api/admin/frete-zones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => {});
  }

  async function deleteFreteZone(id: string) {
    if (!confirm("Remover esta zona de frete?")) return;
    setFreteZones((prev) => prev.filter((z) => z.id !== id));
    await fetch(`/api/admin/frete-zones/${id}`, { method: "DELETE" }).catch(() => {});
  }

  // Testa qual zona um CEP casaria (mesma lógica do servidor, no cliente).
  function zoneForCep(cep: string): FreteZone | null {
    const d = cep.replace(/\D/g, "");
    if (d.length < 8) return null;
    for (const z of [...freteZones].filter((z) => z.active).sort((a, b) => a.priority - b.priority)) {
      const s = (z.cep_start ?? "").replace(/\D/g, ""), e = (z.cep_end ?? "").replace(/\D/g, "");
      if (s && e && d >= s && d <= e) return z;
      const list = (z.cep_list ?? "").split(/[\s,;\n]+/).map((c) => c.replace(/\D/g, "")).filter(Boolean);
      if (list.includes(d)) return z;
    }
    return null;
  }

  async function convertFormalQuote(slug: string) {
    if (!confirm("Converter este orçamento formalizado em pedido? Os dados do cliente, endereço, produtos, Cola PU, frete e condição serão reaproveitados.")) return;
    setConvertingSlug(slug);
    try {
      const res = await fetch(`/api/admin/orcamento/${slug}/convert`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.pedidoId) {
        setFormalQuotes((prev) => prev.map((q) => (q.slug === slug ? { ...q, stage: "pedido", pedido_id: data.pedidoId } : q)));
        fetchPedidos();
        // O estoque é revalidado na conversão: o orçamento pode ser antigo e as
        // placas já terem saído. O pedido é criado de qualquer forma — quem
        // decide vender com reposição é a equipe — mas a falta é dita na hora.
        const falta = Array.isArray(data.stockShortages) ? data.stockShortages : [];
        if (falta.length > 0) {
          const linhas = falta
            .map((f: { name: string; code: string; requested: number; available: number }) =>
              `• ${f.name} (${f.code}): ${f.requested} no pedido, ${f.available} disponível(is)`)
            .join("\n");
          alert(`Pedido criado — mas o estoque mudou desde o orçamento:\n\n${linhas}\n\nAs quantidades foram mantidas. Confirme a reposição com o cliente.`);
        } else {
          alert("Pedido criado com sucesso a partir do orçamento.");
        }
      } else {
        alert(data?.error ?? "Falha ao converter em pedido.");
      }
    } catch {
      alert("Erro de rede ao converter.");
    } finally {
      setConvertingSlug(null);
    }
  }

  async function importStaticRender(render: { slug: string; title: string; product_code: string; image_path: string }, idx: number) {
    setRenderImporting(render.slug);
    await fetch("/api/projects/renders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...render, is_active: true, sort_order: idx }),
    });
    setRenderImporting(null);
    fetchProjects();
  }

  async function importAllStaticRenders() {
    const dbSlugs = new Set(dbRenderProjects.map((r) => r.slug));
    const toImport = STATIC_RENDERS.filter((r) => !dbSlugs.has(r.slug));
    if (toImport.length === 0) return;
    setRenderImportingAll(true);
    for (let i = 0; i < toImport.length; i++) {
      await fetch("/api/projects/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...toImport[i], is_active: true, sort_order: i }),
      });
    }
    setRenderImportingAll(false);
    fetchProjects();
  }

  // ── Partners ─────────────────────────────
  function startCreatePartner() {
    setEditingPartnerId(null);
    setNewlyCreatedPartner(null);
    setPartnerForm({ ...emptyPartnerForm });
    setPartnerFormError("");
    setPartnerProfOther("");
    setShowPartnerForm(true);
    setTimeout(() => partnerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startEditPartner(p: Partner) {
    setEditingPartnerId(p.id);
    setNewlyCreatedPartner(null);
    setPartnerForm({
      name: p.name, email: p.email || "", phone: p.phone || "",
      coupon_code: p.coupon_code,
      discount_type: p.discount_type, discount_value: p.discount_value,
      commission_type: p.commission_type, commission_value: p.commission_value,
      portal_password: "",
      status: p.status,
      sales_rep_referral_code: p.sales_rep_referral_code || "",
      birthday: p.birthday ? p.birthday.split("T")[0] : "",
      profession: PROFESSIONS.includes(p.profession || "") ? (p.profession || "") : (p.profession ? "Outro" : ""),
      has_special_table: p.has_special_table ?? false,
      // Default the pool to the current discount+commission for legacy partners
      // (so the cap matches what they already have) or 7% when both are zero.
      commission_pool_pct: p.commission_pool_pct ?? ((p.discount_value || 0) + (p.commission_value || 0) || 7),
    });
    setPartnerProfOther(PROFESSIONS.includes(p.profession || "") || !p.profession ? "" : p.profession);
    setPartnerFormError("");
    setPartnerLinkedReps([]);
    setAddingRepId("");
    setRepLinkError("");
    setShowPartnerForm(true);
    loadPartnerReps(p.id);
    setTimeout(() => partnerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handlePartnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPartnerFormError("");
    setPartnerFormLoading(true);
    const resolvedProfession = partnerForm.profession === "Outro" ? (partnerProfOther || null) : (partnerForm.profession || null);
    const payload: Record<string, unknown> = { ...partnerForm, coupon_code: partnerForm.coupon_code.toUpperCase(), sales_rep_referral_code: partnerForm.sales_rep_referral_code || null, profession: resolvedProfession };
    if (!partnerForm.portal_password) delete payload.portal_password; // empty = keep current password
    let res: Response;
    if (editingPartnerId) {
      res = await fetch(`/api/partners/${editingPartnerId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    const json = await res.json();
    setPartnerFormLoading(false);
    if (!res.ok) { setPartnerFormError(json.error || "Erro desconhecido."); return; }
    setShowPartnerForm(false);
    if (!editingPartnerId) setNewlyCreatedPartner(json as Partner);
    fetchPartners();
  }

  async function approvePartner(p: Partner) {
    setApprovalLoading(true);
    await fetch(`/api/partners/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...approvalForm, ...(approvalForm.portal_password ? {} : { portal_password: undefined }), status: "active" }),
    });
    setApprovalLoading(false);
    setApprovingId(null);
    fetchPartners();
  }

  async function rejectPartner(p: Partner) {
    if (!confirm(`Rejeitar cadastro de ${p.name}? O parceiro será removido.`)) return;
    await fetch(`/api/partners/${p.id}`, { method: "DELETE" });
    fetchPartners();
  }

  async function togglePartnerStatus(p: Partner) {
    await fetch(`/api/partners/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: p.status === "active" ? "inactive" : "active" }) });
    fetchPartners();
  }

  async function toggleSpecialTable(p: Partner) {
    await fetch(`/api/partners/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ has_special_table: !p.has_special_table }) });
    fetchPartners();
  }

  async function deletePartner(p: Partner) {
    if (!confirm(`Excluir parceiro ${p.name}? Isso também remove o histórico de usos.`)) return;
    await fetch(`/api/partners/${p.id}`, { method: "DELETE" });
    setNewlyCreatedPartner(null);
    fetchPartners();
  }

  async function loadPartnerReps(partnerId: string) {
    setPartnerRepsLoading(true);
    const res = await fetch(`/api/partners/${partnerId}/reps`);
    if (res.ok) {
      const data = await res.json();
      setPartnerLinkedReps(data);
    }
    setPartnerRepsLoading(false);
  }

  async function addRepToPartner() {
    if (!addingRepId || !editingPartnerId) return;
    setRepLinkError("");
    const res = await fetch(`/api/partners/${editingPartnerId}/reps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales_rep_id: addingRepId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setRepLinkError(json.error || "Erro ao vincular representante.");
      return;
    }
    setAddingRepId("");
    loadPartnerReps(editingPartnerId);
    fetchPartners();
  }

  async function removeRepFromPartner(salesRepId: string) {
    if (!editingPartnerId) return;
    await fetch(`/api/partners/${editingPartnerId}/reps`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales_rep_id: salesRepId }),
    });
    loadPartnerReps(editingPartnerId);
    fetchPartners();
  }

  function buildWALink(p: Partner) {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://orbitalrevestimentos.com.br";
    const discountLabel = p.discount_type === "percentage" ? `${p.discount_value}% de desconto` : `R$ ${p.discount_value} de desconto`;
    const lines = [`Olá ${p.name}! 👋`, ``, `Seu cupom Orbital foi aprovado:`, ``, `🎟 Código: *${p.coupon_code}*`, `💰 ${discountLabel} para seus clientes`, ``, `Acesse seu painel em:`, `${siteUrl}/parceiro`];
    const text = encodeURIComponent(lines.join("\n"));
    if (p.phone) {
      const digits = p.phone.replace(/\D/g, "");
      const phoneWithCountry = digits.startsWith("55") ? digits : `55${digits}`;
      return `https://wa.me/${phoneWithCountry}?text=${text}`;
    }
    return `https://wa.me/?text=${text}`;
  }

  // ── Sales Reps ───────────────────────────
  function startCreateRep() {
    setEditingRepId(null);
    setRepForm({ ...emptyRepForm });
    setRepFormError("");
    setShowRepForm(true);
    setTimeout(() => repFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startEditRep(r: SalesRep) {
    setEditingRepId(r.id);
    setRepForm({
      name: r.name, email: r.email || "", phone: r.phone || "",
      referral_code: r.referral_code,
      commission_type: r.commission_type, commission_value: r.commission_value,
      portal_password: "",
      status: r.status,
      birthday: r.birthday ? r.birthday.split("T")[0] : "",
    });
    setRepFormError("");
    setShowRepForm(true);
    setTimeout(() => repFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handleRepSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRepFormError("");
    setRepFormLoading(true);
    const payload: Record<string, unknown> = { ...repForm, referral_code: repForm.referral_code.toUpperCase() };
    if (!repForm.portal_password) delete payload.portal_password; // empty = keep current password
    let res: Response;
    if (editingRepId) {
      res = await fetch(`/api/sales-reps/${editingRepId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/sales-reps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    const json = await res.json();
    setRepFormLoading(false);
    if (!res.ok) { setRepFormError(json.error || "Erro desconhecido."); return; }
    setShowRepForm(false);
    fetchReps();
  }

  async function toggleRepStatus(r: SalesRep) {
    await fetch(`/api/sales-reps/${r.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: r.status === "active" ? "inactive" : "active" }) });
    fetchReps();
  }

  async function deleteRep(r: SalesRep) {
    if (!confirm(`Excluir representante ${r.name}?`)) return;
    await fetch(`/api/sales-reps/${r.id}`, { method: "DELETE" });
    fetchReps();
  }

  // ── History ──────────────────────────────
  async function updateSaleStatus(clientId: string, useId: string | null, sale_status: string, isStandalone?: boolean, isPedido?: boolean) {
    if (isPedido) {
      // Pedido row — map the sale stage back to a production status and PATCH the
      // order (this also drives the stock state machine server-side).
      const statusMap: Record<string, string> = { concluido: "entregue", cancelado: "cancelado", em_orcamento: "em_producao" };
      const newStatus = statusMap[sale_status] ?? "em_producao";
      const res = await fetch(`/api/admin/pedidos/${clientId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) setPedidos((prev) => prev.map((p) => (p.id === clientId ? { ...p, status: newStatus } : p)));
      return;
    }
    if (!isStandalone) {
      // Update client_email_sequences.sale_status (drives drip)
      const seqRes = await fetch(`/api/admin/clients/${clientId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sale_status }) });
      if (seqRes.ok) {
        setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, sale_status } : c)));
      }
    }
    // Update coupon_use.sale_status when present (drives commission tracking)
    if (useId) {
      const useRes = await fetch(`/api/coupons/use/${useId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sale_status }) });
      if (useRes.ok) {
        const updated = await useRes.json();
        setUses((prev) => prev.map((u) => (u.id === useId ? { ...u, ...updated } : u)));
      }
    }
  }

  async function deleteCouponUse(useId: string) {
    if (!confirm("Excluir este orçamento permanentemente? Esta ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/coupons/use/${useId}`, { method: "DELETE" });
    if (res.ok) {
      setUses((prev) => prev.filter((u) => u.id !== useId));
    }
  }

  async function markCommissionPaid(useId: string, type: "partner" | "rep") {
    const field = type === "partner" ? "partner_commission_paid_at" : "rep_commission_paid_at";
    const value = new Date().toISOString();
    const res = await fetch(`/api/coupons/use/${useId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      setUses((prev) => prev.map((u) => u.id === useId ? { ...u, [field]: value } : u));
    }
  }

  const pendingPartners = partners.filter((p) => p.status === "pending");
  const activePartners = partners.filter((p) => p.status !== "pending").filter((p) => {
    if (!partnerSearch.trim()) return true;
    const q = partnerSearch.toLowerCase();
    return (
      (p.name?.toLowerCase().includes(q) ?? false) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.coupon_code?.toLowerCase().includes(q) ?? false)
    );
  });

  // Partner rankings (from completed coupon uses)
  const partnerRanking = useMemo(() => {
    const byCode: Record<string, { total: number; count: number; values: number[] }> = {};
    for (const u of uses) {
      if (u.sale_status !== "concluido" || !u.coupon_code) continue;
      if (!byCode[u.coupon_code]) byCode[u.coupon_code] = { total: 0, count: 0, values: [] };
      const v = u.material_discounted || 0;
      byCode[u.coupon_code].total += v;
      byCode[u.coupon_code].count++;
      if (v > 0) byCode[u.coupon_code].values.push(v);
    }
    return Object.entries(byCode).map(([code, s]) => {
      const p = activePartners.find((p) => p.coupon_code === code);
      const sorted = [...s.values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return { code, name: p?.name || code, total: s.total, count: s.count, median };
    }).sort((a, b) => b.total - a.total);
  }, [uses, activePartners]);

  const [repRankSort, setRepRankSort] = useState<"total" | "count" | "median">("total");
  const [rankSortPartner, setRankSortPartner] = useState<"total" | "count" | "median">("total");
  const [rankRepPartner, setRankRepPartner] = useState<string>("all");

  const repRanking = useMemo(() => {
    const byCode: Record<string, { total: number; count: number; values: number[] }> = {};
    for (const u of uses) {
      if (u.sale_status !== "concluido" || !u.sales_rep_referral_code) continue;
      const code = u.sales_rep_referral_code;
      if (!byCode[code]) byCode[code] = { total: 0, count: 0, values: [] };
      const v = u.material_discounted || 0;
      byCode[code].total += v;
      byCode[code].count++;
      if (v > 0) byCode[code].values.push(v);
    }
    const rows = Object.entries(byCode).map(([code, s]) => {
      const r = salesReps.find((r) => r.referral_code === code);
      const sorted = [...s.values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2);
      const legacyCount = partners.filter((p) => p.sales_rep_referral_code === code).length;
      const junctionCount = r?.id ? (junctionPartnerCounts[r.id] || 0) : 0;
      const partnerCount = Math.max(legacyCount, junctionCount);
      return { code, name: r?.name || code, total: s.total, count: s.count, median, partnerCount };
    });
    if (repRankSort === "count") rows.sort((a, b) => b.count - a.count);
    else if (repRankSort === "median") rows.sort((a, b) => b.median - a.median);
    else rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [uses, salesReps, partners, repRankSort, junctionPartnerCounts]);

  // Upcoming birthdays this month
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    return activePartners
      .filter((p) => {
        if (!p.birthday) return false;
        return new Date(p.birthday).getUTCMonth() + 1 === thisMonth;
      })
      .sort((a, b) => new Date(a.birthday!).getUTCDate() - new Date(b.birthday!).getUTCDate());
  }, [activePartners]);

  // Upcoming rep birthdays this month
  const upcomingRepBirthdays = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    return salesReps
      .filter((r) => {
        if (!r.birthday) return false;
        return new Date(r.birthday).getUTCMonth() + 1 === thisMonth;
      })
      .sort((a, b) => new Date(a.birthday!).getUTCDate() - new Date(b.birthday!).getUTCDate());
  }, [salesReps]);

  const filteredUses = uses.filter((u) => {
    if (filterPartner !== "all" && u.coupon_code !== filterPartner) return false;
    if (filterRep !== "all" && u.sales_rep_referral_code !== filterRep) return false;
    return true;
  });
  const concludedUses = filteredUses.filter((u) => u.sale_status === "concluido");
  const totalSales = concludedUses.reduce((a, u) => a + (u.material_discounted || 0), 0);
  const totalCommission = concludedUses.reduce((a, u) => a + (u.commission_owed || 0), 0);
  const totalRepCommission = concludedUses.reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);
  const pendingCommission = filteredUses.filter((u) => !u.sale_status || u.sale_status === "em_orcamento").reduce((a, u) => a + (u.commission_owed || 0), 0);

  // ── Merged Orçamentos view ────────────────────────────────────────────────
  // Build a lookup of coupon_use by id for quick join
  const useById = useMemo(() => {
    const map: Record<string, CouponUse> = {};
    for (const u of uses) map[u.id] = u;
    return map;
  }, [uses]);

  const enrichedClients = useMemo(() => {
    // Rows from client_email_sequences (have contact info + drip data)
    const fromSeqs = clients.map((c) => ({
      ...c,
      couponUse: c.coupon_use_id ? (useById[c.coupon_use_id] ?? null) : null,
      _isStandaloneUse: false as const,
      _isPedido: false as const,
    }));

    // coupon_uses that have NO linked client_email_sequences entry yet
    const linkedUseIds = new Set(clients.map((c) => c.coupon_use_id).filter(Boolean) as string[]);
    const standaloneUses = uses
      .filter((u) => !linkedUseIds.has(u.id))
      .map((u) => {
        const partnerName = partners.find((p) => p.coupon_code === u.coupon_code)?.name ?? u.coupon_code ?? "Orbital";
        return {
          id: u.id,
          client_name: u.architect_name ?? "—",
          client_email: u.client_email ?? "",
          client_phone: u.client_phone ?? null,
          space: u.space,
          model: u.product_name ?? "",
          plates: u.plates ?? 0,
          area_m2: u.area_m2 ?? 0,
          total: u.material_discounted ?? u.material_total ?? 0,
          partner_name: partnerName,
          current_step: 0,
          status: "inactive",
          next_email_at: null as string | null,
          created_at: u.created_at,
          coupon_use_id: u.id,
          sale_status: u.sale_status,
          couponUse: u,
          _isStandaloneUse: true as const,
          _isPedido: false as const,
        };
      });

    // Orders from the Pedidos table. A pedido that carries a partner/rep already
    // produced a coupon_use (source_pedido_id = pedido.id) and thus shows up via
    // standaloneUses above — skip those here to avoid double-counting.
    const pedidoIdsViaUse = new Set(
      uses.map((u) => u.source_pedido_id).filter(Boolean) as string[]
    );
    const fromPedidos = pedidos
      .filter((p) => !pedidoIdsViaUse.has(p.id))
      .map((p) => {
        const saleStatus =
          p.status === "entregue" ? "concluido" : p.status === "cancelado" ? "cancelado" : "em_orcamento";
        return {
          id: p.id,
          client_name: p.client_name,
          client_email: p.client_email ?? "",
          client_phone: p.client_phone ?? null,
          space: p.space,
          model: p.product_name ?? "",
          plates: 0,
          area_m2: p.area_m2 ?? 0,
          total: p.total ?? 0,
          partner_name: p.partner_name ?? "Orbital",
          current_step: 0,
          status: "inactive",
          next_email_at: null as string | null,
          created_at: p.created_at,
          coupon_use_id: null as string | null,
          sale_status: saleStatus,
          couponUse: null,
          _isStandaloneUse: false as const,
          _isPedido: true as const,
        };
      });

    // Merge, sort by created_at descending
    return [...fromSeqs, ...standaloneUses, ...fromPedidos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [clients, useById, uses, partners, pedidos]);

  // Builds a PedidosTab-ready QuoteOption from an Orçamentos row — reuses the
  // exact shape PedidosTab's own "Importar orçamento" picker already produces,
  // so startDraftFromQuote needs no changes to accept it.
  function quoteOptionFromRow(c: (typeof enrichedClients)[number]): QuoteOption {
    const cu = c.couponUse;
    return {
      id: `row:${c.id}`,
      source: c._isStandaloneUse ? "coupon" : "client",
      client_name: c.client_name,
      client_email: c.client_email || null,
      client_phone: c.client_phone ?? null,
      space: c.space,
      product_name: c.model,
      product_code: cu?.product_code ?? null,
      area_m2: c.area_m2,
      plates: c.plates,
      total: c.total,
      coupon_code: cu?.coupon_code ?? null,
      partner_name: c.partner_name,
      coupon_use_id: c.coupon_use_id,
      sales_rep_referral_code: cu?.sales_rep_referral_code ?? null,
      created_at: c.created_at,
      // Per-ambiente breakdown from the simulador — lets the conversion create
      // one order line item per ambiente instead of collapsing to one.
      space_breakdown: Array.isArray(cu?.space_breakdown) ? cu!.space_breakdown : null,
    };
  }

  // Phase 3 — unified commission view. Coupon-based commissions (coupon_uses)
  // already had payment tracking; order-based commissions (pedidos) had the
  // amounts but no paid-at tracking at all until migration 036. This merges
  // both into one row shape, same "concluded sales only" semantics each side
  // already used ("concluido" for coupons, "entregue" for pedidos).
  interface CommissionRow {
    id: string;
    source: "coupon" | "pedido";
    created_at: string;
    couponCode: string | null;
    clientName: string | null;
    productName: string | null;
    partnerName: string;
    partnerAmount: number;
    partnerPaidAt: string | null;
    partnerCancelledAt: string | null;
    partnerCancelReason: string | null;
    repName: string;
    repAmount: number;
    repPaidAt: string | null;
    repCancelledAt: string | null;
    repCancelReason: string | null;
  }

  const commissionRows = useMemo<CommissionRow[]>(() => {
    const fromCoupons: CommissionRow[] = uses
      .filter((u) => u.sale_status === "concluido")
      .map((u) => ({
        id: u.id,
        source: "coupon" as const,
        created_at: u.created_at,
        couponCode: u.coupon_code,
        clientName: u.architect_name,
        productName: u.product_name,
        partnerName: partners.find((p) => p.coupon_code === u.coupon_code)?.name ?? u.coupon_code ?? "Orbital",
        partnerAmount: u.commission_owed ?? 0,
        partnerPaidAt: u.partner_commission_paid_at,
        partnerCancelledAt: (u as { partner_commission_cancelled_at?: string | null }).partner_commission_cancelled_at ?? null,
        partnerCancelReason: (u as { partner_commission_cancel_reason?: string | null }).partner_commission_cancel_reason ?? null,
        repName:
          (u.sales_rep_referral_code ? salesReps.find((r) => r.referral_code === u.sales_rep_referral_code)?.name : null) ??
          u.sales_rep_referral_code ??
          "—",
        repAmount: u.sales_rep_commission_owed ?? 0,
        repPaidAt: u.rep_commission_paid_at,
        repCancelledAt: (u as { rep_commission_cancelled_at?: string | null }).rep_commission_cancelled_at ?? null,
        repCancelReason: (u as { rep_commission_cancel_reason?: string | null }).rep_commission_cancel_reason ?? null,
      }));

    const fromPedidos: CommissionRow[] = pedidos
      .filter((p) => p.status === "entregue" && (p.partner_commission_amount || p.sales_rep_commission_amount))
      .map((p) => ({
        id: p.id,
        source: "pedido" as const,
        created_at: p.created_at,
        couponCode: null,
        clientName: p.client_name,
        productName: p.product_name,
        partnerName: (p.partner_id ? partners.find((p2) => p2.id === p.partner_id)?.name : null) ?? p.partner_name ?? "Orbital",
        partnerAmount: p.partner_commission_amount ?? 0,
        partnerPaidAt: p.partner_commission_paid_at,
        partnerCancelledAt: (p as { partner_commission_cancelled_at?: string | null }).partner_commission_cancelled_at ?? null,
        partnerCancelReason: (p as { partner_commission_cancel_reason?: string | null }).partner_commission_cancel_reason ?? null,
        repName: (p.sales_rep_id ? salesReps.find((r) => r.id === p.sales_rep_id)?.name : null) ?? "—",
        repAmount: p.sales_rep_commission_amount ?? 0,
        repPaidAt: p.sales_rep_commission_paid_at,
        repCancelledAt: (p as { sales_rep_commission_cancelled_at?: string | null }).sales_rep_commission_cancelled_at ?? null,
        repCancelReason: (p as { sales_rep_commission_cancel_reason?: string | null }).sales_rep_commission_cancel_reason ?? null,
      }));

    return [...fromCoupons, ...fromPedidos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [uses, pedidos, partners, salesReps]);

  async function markPedidoCommissionPaid(pedidoId: string, type: "partner" | "rep") {
    const field = type === "partner" ? "partner_commission_paid_at" : "sales_rep_commission_paid_at";
    const value = new Date().toISOString();
    const res = await fetch(`/api/admin/pedidos/${pedidoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, [field]: value } : p)));
  }

  function openCancelCommission(r: CommissionRow) {
    // Só o que está A PAGAR (não pago, não cancelado) pode ser cancelado.
    const partnerEligible = !!r.partnerAmount && !r.partnerPaidAt && !r.partnerCancelledAt;
    const repEligible = !!r.repAmount && !r.repPaidAt && !r.repCancelledAt;
    if (!partnerEligible && !repEligible) return;
    setCancelCommTarget({ id: r.id, source: r.source, partnerName: r.partnerName, repName: r.repName, partnerAmount: r.partnerAmount, repAmount: r.repAmount, partnerEligible, repEligible });
    setCancelWhich({ partner: partnerEligible, rep: repEligible });
    setCancelReason("");
  }

  async function submitCancelCommission() {
    const t = cancelCommTarget;
    if (!t) return;
    const doPartner = t.partnerEligible && cancelWhich.partner;
    const doRep = t.repEligible && cancelWhich.rep;
    if (!doPartner && !doRep) return;
    const now = new Date().toISOString();
    const reason = cancelReason.trim() || null;
    setCancelSubmitting(true);
    try {
      if (t.source === "coupon") {
        const body: Record<string, unknown> = {};
        if (doPartner) { body.partner_commission_cancelled_at = now; body.partner_commission_cancel_reason = reason; }
        if (doRep) { body.rep_commission_cancelled_at = now; body.rep_commission_cancel_reason = reason; }
        const res = await fetch(`/api/coupons/use/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        setUses((prev) => prev.map((u) => (u.id === t.id ? { ...u, ...body } : u)));
      } else {
        const body: Record<string, unknown> = {};
        if (doPartner) { body.partner_commission_cancelled_at = now; body.partner_commission_cancel_reason = reason; }
        if (doRep) { body.sales_rep_commission_cancelled_at = now; body.sales_rep_commission_cancel_reason = reason; }
        const res = await fetch(`/api/admin/pedidos/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        setPedidos((prev) => prev.map((p) => (p.id === t.id ? { ...p, ...body } : p)));
      }
      setCancelCommTarget(null);
    } catch {
      alert("Falha ao cancelar a comissão. Verifique se a migração 050 foi aplicada.");
    } finally {
      setCancelSubmitting(false);
    }
  }

  const filteredClients = useMemo(() => {
    return enrichedClients.filter((c) => {
      const search = clientSearch.trim().toLowerCase();
      if (search) {
        const name = c.client_name?.toLowerCase() ?? "";
        const email = c.client_email?.toLowerCase() ?? "";
        if (!name.includes(search) && !email.includes(search)) return false;
      }
      if (clientPartnerFilter !== "all") {
        const coupon = c.couponUse?.coupon_code;
        if (coupon !== clientPartnerFilter) return false;
      }
      if (clientStatusFilter !== "all") {
        if (clientStatusFilter === "sem_cupom") {
          if (c.coupon_use_id) return false;
        } else {
          const saleStatus = c.sale_status ?? c.couponUse?.sale_status ?? "em_orcamento";
          if (saleStatus !== clientStatusFilter) return false;
        }
      }
      return true;
    })
    // Ordenação — a lista chega do banco por data desc; daqui em diante quem
    // manda é o seletor. Ordenar por valor é o que responde "quais são os
    // orçamentos grandes", que a ordem cronológica esconde.
    .slice()
    .sort((a, b) => {
      const dir = clientSortDir === "asc" ? 1 : -1;
      if (clientSortKey === "valor") return ((a.total ?? 0) - (b.total ?? 0)) * dir;
      if (clientSortKey === "cliente") {
        return (a.client_name ?? "").localeCompare(b.client_name ?? "", "pt-BR") * dir;
      }
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return (ta - tb) * dir;
    });
  }, [enrichedClients, clientSearch, clientPartnerFilter, clientStatusFilter, clientSortKey, clientSortDir]);

  const orcamentosStats = useMemo(() => {
    const getStatus = (c: typeof filteredClients[0]) => c.sale_status ?? c.couponUse?.sale_status ?? "em_orcamento";
    const emAberto = filteredClients.filter((c) => getStatus(c) === "em_orcamento").length;
    const concluidos = filteredClients.filter((c) => getStatus(c) === "concluido").length;
    // Receita POTENCIAL é o que ainda pode entrar: concluído já entrou e
    // cancelado não entra mais. Somar tudo inflava o número e tirava dele
    // qualquer utilidade para decidir onde investir esforço.
    const totalReceita = filteredClients
      .filter((c) => getStatus(c) === "em_orcamento")
      .reduce((sum, c) => sum + (c.total ?? 0), 0);
    const comParceiro = filteredClients.filter((c) => !!c.couponUse).length;
    const dripAtivos = filteredClients.filter((c) => c.status === "active").length;
    return { emAberto, concluidos, totalReceita, comParceiro, dripAtivos };
  }, [filteredClients]);

  /**
   * Agrupamento da lista de orçamentos.
   *
   * Mostrar 105 linhas seguidas não é gerenciável: o que está em aberto com a
   * régua rodando exige ação hoje; o que esfriou exige outra; concluído e
   * cancelado são histórico. Separar por situação (ou por período) é o que
   * permite olhar um grupo de cada vez.
   */
  const orcamentoGroups = useMemo(() => {
    const statusOf = (c: typeof filteredClients[0]) => c.sale_status ?? c.couponUse?.sale_status ?? "em_orcamento";

    if (clientGroupMode === "situacao") {
      const buckets: Array<{ key: string; label: string; hint: string; rows: typeof filteredClients }> = [
        { key: "aberto_drip", label: "Em aberto · régua ativa", hint: "recebendo e-mails da régua — acompanhe", rows: [] },
        { key: "frios", label: "Frios", hint: "em aberto, mas a régua já terminou", rows: [] },
        { key: "concluido", label: "Concluídos", hint: "viraram venda", rows: [] },
        { key: "cancelado", label: "Cancelados", hint: "encerrados sem venda", rows: [] },
      ];
      const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
      for (const c of filteredClients) {
        const st = statusOf(c);
        if (st === "concluido") byKey.concluido.rows.push(c);
        else if (st === "cancelado") byKey.cancelado.rows.push(c);
        else if (c.status === "active") byKey.aberto_drip.rows.push(c);
        else byKey.frios.rows.push(c);
      }
      return buckets.filter((b) => b.rows.length > 0);
    }

    // Período — rotula pela data de criação.
    const label = (iso: string): { key: string; label: string } => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return { key: "sem-data", label: "Sem data" };
      const y = d.getFullYear();
      if (clientGroupMode === "ano") return { key: `${y}`, label: `${y}` };
      if (clientGroupMode === "mes") {
        const m = String(d.getMonth() + 1).padStart(2, "0");
        return { key: `${y}-${m}`, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
      }
      // Semana começando na segunda-feira.
      const monday = new Date(d);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const fmtD = (x: Date) => x.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return { key: monday.toISOString().slice(0, 10), label: `Semana de ${fmtD(monday)} a ${fmtD(sunday)}` };
    };

    const map = new Map<string, { key: string; label: string; hint: string; rows: typeof filteredClients }>();
    for (const c of filteredClients) {
      const { key, label: lbl } = label(c.created_at);
      if (!map.has(key)) map.set(key, { key, label: lbl, hint: "", rows: [] });
      map.get(key)!.rows.push(c);
    }
    // Mais recente primeiro; "sem-data" por último.
    return [...map.values()].sort((a, b) => (a.key === "sem-data" ? 1 : b.key === "sem-data" ? -1 : b.key.localeCompare(a.key)));
  }, [filteredClients, clientGroupMode]);

  const toggleGroup = (key: string) =>
    setCollapsedGroups((cur) => ({ ...cur, [key]: !cur[key] }));

  function nextEmailLabel(next_email_at: string): string {
    const ms = new Date(next_email_at).getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Enviando em breve";
    if (days === 1) return "Próx. amanhã";
    return `Próx. em ${days}d`;
  }

  function ageBadge(created_at: string, status: string) {
    const days = Math.floor((Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return { label: "hoje", cls: "text-green-700 font-bold" };
    if (days === 1) return { label: "ontem", cls: "text-[#74777f]" };
    if (days >= 14 && status === "active") return { label: `${days}d — frio`, cls: "text-red-500 font-bold" };
    return { label: `${days}d atrás`, cls: "text-[#b0b0b0]" };
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-6">Orbital Admin</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelCls}>Senha</label>
              <div className="relative">
                <input type={showAdminPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls + " pr-10"} autoFocus />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showAdminPw ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowAdminPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
                >
                  {showAdminPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            {pwError && <p className="text-red-600 text-sm font-[var(--font-inter)]">{pwError}</p>}
            <button type="submit" className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      {/* Follow-up modal */}
      {followUpModalOpen && followUps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="bg-[#002045] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-[var(--font-noto-serif)] text-lg">Acompanhamento de orçamentos</p>
                <p className="text-white/60 text-xs font-[var(--font-inter)] mt-0.5">{followUps.length} orçamento{followUps.length !== 1 ? "s" : ""} aguardando retorno</p>
              </div>
              <button onClick={() => setFollowUpModalOpen(false)} className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest">
                Adiar tudo
              </button>
            </div>
            <div className="divide-y divide-[#f0f0f0]">
              {followUps.map((f) => (
                <div key={f.id} className="px-6 py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[#002045] text-sm font-[var(--font-inter)]">{f.partner_name || f.coupon_code}</p>
                      <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">
                        {f.space || f.product_name || "—"} · {new Date(f.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      {f.material_discounted != null && (
                        <p className="text-[#002045] text-xs font-semibold font-[var(--font-inter)] mt-0.5">
                          {f.material_discounted.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-[#74777f] font-[var(--font-inter)] bg-yellow-50 px-2 py-0.5 border border-yellow-200 ml-2 flex-shrink-0">
                      {Math.floor((Date.now() - new Date(f.created_at).getTime()) / 86400000)}d atrás
                    </span>
                  </div>
                  {snoozeInputId === f.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-[#74777f] font-[var(--font-inter)]">Lembrar em</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={snoozeDays}
                        onChange={(e) => setSnoozeDays(e.target.value)}
                        className="w-14 border border-[#e2e2e2] px-2 py-1 text-sm text-center font-[var(--font-inter)] focus:outline-none focus:border-[#002045]"
                      />
                      <span className="text-xs text-[#74777f] font-[var(--font-inter)]">dias</span>
                      <button
                        onClick={() => snoozeFollowUp(f.id, parseInt(snoozeDays) || 2)}
                        className="bg-[#002045] text-white text-[10px] tracking-wider uppercase font-bold font-[var(--font-inter)] px-3 py-1.5"
                      >
                        OK
                      </button>
                      <button onClick={() => setSnoozeInputId(null)} className="text-[#74777f] text-xs font-[var(--font-inter)] underline">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => resolveFollowUp(f.id, "concluido")}
                        className="bg-green-600 text-white text-[10px] tracking-wider uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:bg-green-700"
                      >
                        Concluído
                      </button>
                      <button
                        onClick={() => resolveFollowUp(f.id, "cancelado")}
                        className="bg-red-100 text-red-700 text-[10px] tracking-wider uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:bg-red-200"
                      >
                        Cancelado
                      </button>
                      <button
                        onClick={() => snoozeFollowUp(f.id, 2)}
                        className="border border-[#e2e2e2] text-[#74777f] text-[10px] tracking-wider uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:border-[#002045] hover:text-[#002045]"
                      >
                        +2 dias
                      </button>
                      <button
                        onClick={() => { setSnoozeInputId(f.id); setSnoozeDays("2"); }}
                        className="border border-[#e2e2e2] text-[#74777f] text-[10px] tracking-wider uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:border-[#002045] hover:text-[#002045]"
                      >
                        Outro prazo
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="bg-[#002045] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-white font-[var(--font-noto-serif)] text-xl">Orbital Admin</p>
          {pendingPartners.length > 0 && (
            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold font-[var(--font-inter)] px-2 py-0.5 tracking-wider">
              {pendingPartners.length} PENDENTE{pendingPartners.length > 1 ? "S" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setCpOpen(!cpOpen); setCpError(""); setCpSuccess(false); }}
            className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors"
          >
            Alterar senha
          </button>
          <button onClick={() => { fetch("/api/admin/login", { method: "DELETE" }).finally(() => setAuthed(false)); }} className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors">
            Sair
          </button>
        </div>
      </div>

      {cpOpen && (
        <div className="bg-[#001530] border-b border-[#1a365d] px-8 py-5">
          {cpSuccess ? (
            <p className="text-green-400 text-sm font-[var(--font-inter)]">Senha alterada com sucesso.</p>
          ) : (
            <form onSubmit={handleAdminChangePassword} className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-white/50 mb-1">Senha atual</label>
                <div className="relative">
                  <input
                    required
                    type={showCpCurrent ? "text" : "password"}
                    value={cpCurrent}
                    onChange={(e) => setCpCurrent(e.target.value)}
                    className="border border-[#1a365d] bg-[#002045] text-white px-3 py-2 pr-9 text-sm font-[var(--font-inter)] focus:outline-none focus:border-white/40 w-44"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showCpCurrent ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowCpCurrent((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showCpCurrent ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-white/50 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    required
                    type={showCpNew ? "text" : "password"}
                    value={cpNew}
                    onChange={(e) => setCpNew(e.target.value)}
                    className="border border-[#1a365d] bg-[#002045] text-white px-3 py-2 pr-9 text-sm font-[var(--font-inter)] focus:outline-none focus:border-white/40 w-44"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showCpNew ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowCpNew((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showCpNew ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-white/50 mb-1">Confirmar nova senha</label>
                <div className="relative">
                  <input
                    required
                    type={showCpConfirm ? "text" : "password"}
                    value={cpConfirm}
                    onChange={(e) => setCpConfirm(e.target.value)}
                    className="border border-[#1a365d] bg-[#002045] text-white px-3 py-2 pr-9 text-sm font-[var(--font-inter)] focus:outline-none focus:border-white/40 w-44"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showCpConfirm ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowCpConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    {showCpConfirm ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {cpError && <p className="text-red-400 text-xs font-[var(--font-inter)]">{cpError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={cpLoading}
                    className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2 hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {cpLoading ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCpOpen(false)}
                    className="text-white/50 text-xs font-[var(--font-inter)] px-4 py-2 border border-white/20 hover:border-white/40 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {!supabaseConfigured && (
        <div className="max-w-4xl mx-auto px-8 pt-10">
          <div className="bg-yellow-50 border border-yellow-300 px-6 py-5 text-yellow-900 text-sm font-[var(--font-inter)]">
            Configure as variáveis de ambiente do Supabase para usar o painel admin.
          </div>
        </div>
      )}

      {/* ═══ MOBILE TOP BAR ═══ */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-[#e2e2e2] px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[var(--font-noto-serif)] text-[#002045] text-base leading-none">Orbital Admin</p>
          <p className="text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] mt-1 truncate">{NAV_LABELS[tab]}</p>
        </div>
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Abrir menu"
          className="flex-shrink-0 border border-[#e2e2e2] rounded-md p-2 text-[#002045] hover:border-[#002045] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
      </div>

      {/* ═══ MOBILE NAV DRAWER ═══ */}
      {navOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl overflow-y-auto p-4 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e2e2]">
              <div>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-lg leading-none">Orbital</p>
                <p className="text-[9px] tracking-[0.22em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] mt-1.5">Sistema Interno</p>
              </div>
              <button onClick={() => setNavOpen(false)} aria-label="Fechar menu" className="text-[#74777f] hover:text-[#002045] text-2xl leading-none px-1">×</button>
            </div>
            {NAV_GROUPS.map((sec) => (
              <div key={sec.group}>
                <p className="text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] px-3 mb-1.5">{sec.group}</p>
                <div className="flex flex-col gap-0.5">
                  {sec.items.map((t) => {
                    const active = tab === t;
                    const badge = t === "partners" ? pendingPartners.length : t === "lembretes" ? (overview?.followupsOverdue.count ?? 0) : t === "estoque" ? (overview?.lowStock.count ?? 0) : 0;
                    return (
                      <button
                        key={t}
                        onClick={() => { setTab(t); setNavOpen(false); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-[var(--font-inter)] rounded-md text-left transition-colors ${active ? "bg-[#002045] text-white font-bold" : "text-[#43474e] hover:bg-[#eef0f3]"}`}
                      >
                        <NavIcon id={t} className={active ? "text-white" : "text-[#a0a3a8]"} />
                        <span className="truncate flex-1">{NAV_LABELS[t]}</span>
                        {badge > 0 && (
                          <span className="bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">{badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6 items-start">
        {/* ═══ GROUPED SIDEBAR NAV (desktop) ═══ */}
        <aside className="hidden md:flex w-56 flex-shrink-0 md:sticky md:top-6 flex-col gap-5 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
          {/* Brand */}
          <div className="px-3 pb-3 mb-1 border-b border-[#e2e2e2] flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#002045] text-white flex items-center justify-center font-[var(--font-noto-serif)] text-base flex-shrink-0">O</span>
            <div className="min-w-0">
              <p className="font-[var(--font-noto-serif)] text-[#002045] text-lg leading-none">Orbital</p>
              <p className="text-[9px] tracking-[0.22em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] mt-1">Sistema Interno</p>
            </div>
          </div>
          {NAV_GROUPS.map((sec) => (
            <div key={sec.group}>
              <p className="text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] px-3 mb-1.5">{sec.group}</p>
              <div className="flex flex-col gap-0.5">
                {sec.items.map((t) => {
                  const active = tab === t;
                  const badge = t === "partners" ? pendingPartners.length : t === "lembretes" ? (overview?.followupsOverdue.count ?? 0) : t === "estoque" ? (overview?.lowStock.count ?? 0) : 0;
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`group flex items-center gap-2.5 px-3 py-2 text-xs font-[var(--font-inter)] rounded-md text-left transition-colors ${active ? "bg-[#002045] text-white font-bold" : "text-[#43474e] hover:bg-[#eef0f3]"}`}
                    >
                      <NavIcon id={t} className={active ? "text-white" : "text-[#a0a3a8] group-hover:text-[#43474e]"} />
                      <span className="truncate flex-1">{NAV_LABELS[t]}</span>
                      {badge > 0 && (
                        <span className="bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="flex-1 min-w-0 w-full">

        {/* ═══ DASHBOARD TAB ═══ */}
        {tab === "dashboard" && (
          <DashboardTab
            dash={dashData}
            dashLoading={dashLoading}
            onRefreshDash={() => {
              setDashData(null);
              setDashLoading(true);
              fetch("/api/admin/dashboard")
                .then((r) => r.json())
                .then((d2) => { if (d2 && d2.totalOrcamentos !== undefined) setDashData(d2); setDashLoading(false); })
                .catch(() => setDashLoading(false));
            }}
            overview={overview}
            overviewLoading={overviewLoading}
            onRefreshOverview={fetchOverview}
            onNavigate={(t) => setTab(t)}
            onOpenLead={(id) => { setLeadFocusId(id); setTab("leads"); }}
            onOpenPedido={(id) => { setPedidoFocusId(id); setTab("pedidos"); }}
          />
        )}

        {/* ═══ PARTNERS TAB ═══ */}
        {tab === "partners" && (
          <div>
            {/* Pending approvals */}
            {pendingPartners.length > 0 && (
              <div className="mb-8">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-yellow-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
                  Aguardando aprovação ({pendingPartners.length})
                </h3>
                <div className="space-y-3">
                  {pendingPartners.map((p) => (
                    <div key={p.id} className="bg-white border border-yellow-200 px-6 py-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#002045] font-[var(--font-inter)]">{p.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                            {p.email && <p className="text-xs text-[#74777f] font-[var(--font-inter)]">{p.email}</p>}
                            {p.phone && <p className="text-xs text-[#74777f] font-[var(--font-inter)]">{p.phone}</p>}
                            {p.sales_rep_referral_code && (
                              <p className="text-xs text-[#002045] font-[var(--font-inter)]">
                                Rep: <strong>{p.sales_rep_referral_code}</strong>
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-[#74777f] font-[var(--font-inter)] mt-0.5">
                            Cupom gerado: <span className="font-bold text-[#002045] tracking-wider">{p.coupon_code}</span> ·{" "}
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => { setApprovingId(approvingId === p.id ? null : p.id); setApprovalForm({ discount_type: "percentage", discount_value: 10, commission_type: "percentage", commission_value: 5, portal_password: "" }); }}
                            className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] tracking-[0.08em] uppercase px-4 py-2 hover:bg-[#1a365d] transition-colors">
                            Aprovar
                          </button>
                          <button onClick={() => rejectPartner(p)} className="border border-red-300 text-red-600 text-xs font-bold font-[var(--font-inter)] tracking-[0.08em] uppercase px-4 py-2 hover:bg-red-50 transition-colors">
                            Rejeitar
                          </button>
                        </div>
                      </div>
                      {/* Approval form */}
                      {approvingId === p.id && (
                        <div className="mt-4 pt-4 border-t border-yellow-100">
                          <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-3">Definir condições para aprovação</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            <div>
                              <label className={labelCls}>Tipo desconto</label>
                              <select value={approvalForm.discount_type} onChange={(e) => setApprovalForm({ ...approvalForm, discount_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                                <option value="percentage">% Porcentagem</option>
                                <option value="fixed">R$ Fixo</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Desconto {approvalForm.discount_type === "percentage" ? "(%)" : "(R$)"}</label>
                              <input type="number" min="0" step="0.01" value={approvalForm.discount_value} onChange={(e) => setApprovalForm({ ...approvalForm, discount_value: parseFloat(e.target.value) || 0 })} className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}>Tipo comissão</label>
                              <select value={approvalForm.commission_type} onChange={(e) => setApprovalForm({ ...approvalForm, commission_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                                <option value="percentage">% Porcentagem</option>
                                <option value="fixed">R$ Fixo</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Comissão {approvalForm.commission_type === "percentage" ? "(%)" : "(R$)"}</label>
                              <input type="number" min="0" step="0.01" value={approvalForm.commission_value} onChange={(e) => setApprovalForm({ ...approvalForm, commission_value: parseFloat(e.target.value) || 0 })} className={inputCls} />
                            </div>
                          </div>
                          <div className="mb-3 max-w-xs">
                            <label className={labelCls}>Senha do portal</label>
                            <div className="relative">
                              <input value={approvalForm.portal_password} onChange={(e) => setApprovalForm({ ...approvalForm, portal_password: e.target.value })} className={inputCls + " pr-10"} type={showApprovalPw ? "text" : "password"} placeholder="Opcional · mín. 8 caracteres" />
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={showApprovalPw ? "Ocultar senha" : "Mostrar senha"}
                                onClick={() => setShowApprovalPw((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
                              >
                                {showApprovalPw ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => approvePartner(p)} disabled={approvalLoading}
                              className="bg-green-700 text-white text-xs font-bold font-[var(--font-inter)] tracking-[0.08em] uppercase px-5 py-2 hover:bg-green-800 transition-colors disabled:opacity-50">
                              {approvalLoading ? "Aprovando..." : "Confirmar aprovação"}
                            </button>
                            <button onClick={() => setApprovingId(null)} className="text-[#74777f] text-xs font-bold font-[var(--font-inter)] px-4 py-2 border border-[#e2e2e2] hover:border-[#74777f] transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Birthdays this month */}
            {upcomingBirthdays.length > 0 && (
              <div className="mb-8">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3 flex items-center gap-2">
                  🎂 Aniversários em {new Date().toLocaleString("pt-BR", { month: "long" })}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {upcomingBirthdays.map((p) => {
                    const bday = new Date(p.birthday!);
                    const day = bday.getUTCDate();
                    const now = new Date();
                    const isToday = bday.getUTCDate() === now.getDate() && bday.getUTCMonth() === now.getMonth();
                    const age = now.getFullYear() - bday.getUTCFullYear();
                    return (
                      <div key={p.id} className={`px-4 py-3 border text-sm font-[var(--font-inter)] ${isToday ? "border-yellow-300 bg-yellow-50" : "border-[#e2e2e2] bg-white"}`}>
                        <span className="font-bold text-[#002045]">{day < 10 ? `0${day}` : day}</span>
                        <span className="text-[#74777f] text-xs ml-1">— {p.name}</span>
                        <span className="text-[#74777f] text-xs ml-1">({age} anos)</span>
                        {isToday && <span className="ml-2 text-yellow-700 text-xs font-bold">HOJE!</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partner rankings */}
            {(() => {
              const [pRankSort, setPRankSort] = [rankSortPartner, setRankSortPartner];
              const [pRankRep, setPRankRep] = [rankRepPartner, setRankRepPartner];
              const filtered = pRankRep === "all" ? partnerRanking : partnerRanking.filter((r) => {
                const p = activePartners.find((ap) => ap.coupon_code === r.code);
                return p?.sales_rep_referral_code === pRankRep;
              });
              const sorted = [...filtered].sort((a, b) => pRankSort === "count" ? b.count - a.count : pRankSort === "median" ? b.median - a.median : b.total - a.total);
              return (
                <div className="mb-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045]">
                      Ranking de Parceiros — vendas concluídas
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {salesReps.length > 0 && (
                        <select value={pRankRep} onChange={(e) => setPRankRep(e.target.value)} className="border border-[#e2e2e2] px-3 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                          <option value="all">Todos os representantes</option>
                          {salesReps.map((r) => <option key={r.id} value={r.referral_code}>{r.name}</option>)}
                        </select>
                      )}
                      {(["total", "count", "median"] as const).map((s) => (
                        <button key={s} onClick={() => setPRankSort(s)} className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${pRankSort === s ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}>
                          {s === "total" ? "Valor" : s === "count" ? "Qtd." : "Ticket Médio"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block bg-white border border-[#e2e2e2]">
                    <table className="w-full text-sm font-[var(--font-inter)]">
                      <thead>
                        <tr className="border-b border-[#e2e2e2]">
                          {["#", "Parceiro", "Cupom", "Rep.", "Total vendido", "Vendas", "Ticket médio"].map((h) => (
                            <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.length === 0 ? (
                          <tr><td colSpan={7} className="px-5 py-8 text-center text-[#74777f] text-sm">Nenhuma venda concluída registrada ainda.</td></tr>
                        ) : sorted.map((r, i) => {
                          const p = activePartners.find((ap) => ap.coupon_code === r.code);
                          const rep = p?.sales_rep_referral_code ? salesReps.find((sr) => sr.referral_code === p.sales_rep_referral_code) : null;
                          return (
                            <tr key={r.code} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                              <td className="px-5 py-3 font-bold text-[#002045]">{i + 1}°</td>
                              <td className="px-5 py-3 font-semibold text-[#002045]">{r.name}</td>
                              <td className="px-5 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{r.code}</span></td>
                              <td className="px-5 py-3 text-xs text-[#74777f]">{rep ? rep.name : "—"}</td>
                              <td className="px-5 py-3 font-semibold text-green-700">{fmt(r.total)}</td>
                              <td className="px-5 py-3 text-[#43474e]">{r.count}</td>
                              <td className="px-5 py-3 text-[#43474e]">{r.median > 0 ? fmt(r.median) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2">
                    {sorted.length === 0 ? (
                      <div className="bg-white border border-[#e2e2e2] px-4 py-6 text-center text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma venda concluída registrada ainda.</div>
                    ) : sorted.map((r, i) => {
                      const p = activePartners.find((ap) => ap.coupon_code === r.code);
                      const rep = p?.sales_rep_referral_code ? salesReps.find((sr) => sr.referral_code === p.sales_rep_referral_code) : null;
                      return (
                        <div key={r.code} className="bg-white border border-[#e2e2e2] p-4">
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-[#002045] flex-shrink-0">{i + 1}°</span>
                              <span className="font-semibold text-[#002045] truncate">{r.name}</span>
                            </div>
                            <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider flex-shrink-0">{r.code}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-[var(--font-inter)]">
                            <span className="text-[#74777f]">Total vendido</span><span className="text-right font-semibold text-green-700">{fmt(r.total)}</span>
                            <span className="text-[#74777f]">Vendas</span><span className="text-right text-[#43474e]">{r.count}</span>
                            <span className="text-[#74777f]">Ticket médio</span><span className="text-right text-[#43474e]">{r.median > 0 ? fmt(r.median) : "—"}</span>
                            <span className="text-[#74777f]">Representante</span><span className="text-right text-[#43474e]">{rep ? rep.name : "—"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Active partners */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal flex-shrink-0">Parceiros</h2>
                <span className="bg-[#eef2f8] text-[#002045] text-[11px] font-bold font-[var(--font-inter)] px-2 py-0.5 flex-shrink-0">
                  {partners.filter(p => p.status !== "pending").length}
                </span>
                <input
                  type="text"
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  placeholder="Filtrar por nome, email ou cupom…"
                  className="flex-1 min-w-0 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] placeholder-[#b0b4bc]"
                />
              </div>
              <button onClick={startCreatePartner} className="flex-shrink-0 bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors">
                + Novo Parceiro
              </button>
            </div>

            {newlyCreatedPartner && !showPartnerForm && (
              <div className="bg-green-50 border border-green-200 px-6 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-green-900 text-sm font-[var(--font-inter)] font-semibold mb-0.5">Parceiro criado!</p>
                  <p className="text-green-700 text-xs font-[var(--font-inter)]">
                    Cupom: <strong>{newlyCreatedPartner.coupon_code}</strong>
                  </p>
                </div>
                <a href={buildWALink(newlyCreatedPartner)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25d366] text-white text-xs tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1db954] transition-colors whitespace-nowrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Enviar via WhatsApp
                </a>
              </div>
            )}

            {showPartnerForm && (
              <div ref={partnerFormRef} className="bg-white border border-[#e2e2e2] p-8 mb-6">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-6">{editingPartnerId ? "Editar Parceiro" : "Novo Parceiro"}</h3>
                <form onSubmit={handlePartnerSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div><label className={labelCls}>Nome *</label><input required value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Código do Cupom *</label><input required value={partnerForm.coupon_code} onChange={(e) => setPartnerForm({ ...partnerForm, coupon_code: e.target.value.toUpperCase() })} className={inputCls + " uppercase"} placeholder="ex: ARQLIMA10" /></div>
                    <div><label className={labelCls}>Email</label><input value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} type="email" className={inputCls} /></div>
                    <div><label className={labelCls}>Telefone</label><input value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Data de Nascimento *</label><input required type="text" placeholder="DD/MM/AAAA" maxLength={10} value={isoToDMY(partnerForm.birthday || "")} onChange={(e) => setPartnerForm({ ...partnerForm, birthday: dmyToISO(maskBday(e.target.value)) })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Tipo de Desconto</label>
                      <select value={partnerForm.discount_type} onChange={(e) => setPartnerForm({ ...partnerForm, discount_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                        <option value="percentage">Porcentagem (%)</option><option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Valor do Desconto {partnerForm.discount_type === "percentage" ? "(%)" : "(R$)"}</label><input type="number" min="0" step="0.01" value={partnerForm.discount_value} onChange={(e) => setPartnerForm({ ...partnerForm, discount_value: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Tipo de Comissão</label>
                      <select value={partnerForm.commission_type} onChange={(e) => setPartnerForm({ ...partnerForm, commission_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                        <option value="percentage">Porcentagem (%)</option><option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Valor da Comissão {partnerForm.commission_type === "percentage" ? "(%)" : "(R$)"}</label><input type="number" min="0" step="0.01" value={partnerForm.commission_value} onChange={(e) => setPartnerForm({ ...partnerForm, commission_value: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Repasse total ao parceiro (%) <span className="normal-case font-normal">(teto que o parceiro divide entre desconto e comissão)</span></label>
                      <input type="number" min="0" step="0.01" value={partnerForm.commission_pool_pct} onChange={(e) => setPartnerForm({ ...partnerForm, commission_pool_pct: parseFloat(e.target.value) || 0 })} className={inputCls} />
                      {partnerForm.discount_type === "percentage" && partnerForm.commission_type === "percentage" && (() => {
                        const alloc = (partnerForm.discount_value || 0) + (partnerForm.commission_value || 0);
                        const rem = (partnerForm.commission_pool_pct || 0) - alloc;
                        const over = rem < -0.001;
                        return (
                          <p className={`text-[11px] font-[var(--font-inter)] mt-1 ${over ? "text-red-600 font-bold" : "text-[#74777f]"}`}>
                            {partnerForm.discount_value || 0}% cliente · {partnerForm.commission_value || 0}% parceiro · {over ? `excede o repasse em ${Math.abs(Math.round(rem * 100) / 100)}%` : `${Math.round(rem * 100) / 100}% ainda disponível`}
                          </p>
                        );
                      })()}
                    </div>
                    <div>
                      <label className={labelCls}>Senha do Portal <span className="normal-case font-normal">(acesso parceiro)</span></label>
                      <div className="relative">
                        <input value={partnerForm.portal_password} onChange={(e) => setPartnerForm({ ...partnerForm, portal_password: e.target.value })} className={inputCls + " pr-10"} type={showPartnerPw ? "text" : "password"} placeholder="Em branco = manter senha atual" />
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={showPartnerPw ? "Ocultar senha" : "Mostrar senha"}
                          onClick={() => setShowPartnerPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
                        >
                          {showPartnerPw ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {editingPartnerId && (
                      <div>
                        <label className={labelCls}>Status</label>
                        <select value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value as "active" | "inactive" | "pending" })} className={inputCls}>
                          <option value="active">Ativo</option><option value="inactive">Inativo</option><option value="pending">Pendente</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>Profissão</label>
                      <select
                        value={partnerForm.profession}
                        onChange={(e) => { setPartnerForm({ ...partnerForm, profession: e.target.value }); if (e.target.value !== "Outro") setPartnerProfOther(""); }}
                        className={inputCls}
                      >
                        <option value="">— Selecionar —</option>
                        {PROFESSIONS.map((prof) => <option key={prof} value={prof}>{prof}</option>)}
                        <option value="Outro">Outro</option>
                      </select>
                      {partnerForm.profession === "Outro" && (
                        <input
                          type="text"
                          value={partnerProfOther}
                          onChange={(e) => setPartnerProfOther(e.target.value)}
                          placeholder="Especifique a profissão"
                          className={inputCls + " mt-2"}
                        />
                      )}
                    </div>
                  </div>
                  <div className="border border-[#e2e2e2] p-5 mb-5">
                    <p className={labelCls + " mb-4"}>Acessos do parceiro</p>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!partnerForm.has_special_table}
                        onChange={(e) => setPartnerForm({ ...partnerForm, has_special_table: e.target.checked })}
                        className="w-4 h-4 accent-[#002045]"
                      />
                      <span className="text-sm font-[var(--font-inter)] text-[#002045]">
                        Permitir acesso à Tabela Especial de Compra Direta
                      </span>
                    </label>
                    <p className="text-xs text-[#74777f] font-[var(--font-inter)] mt-2 ml-7">
                      Ativa uma aba exclusiva no portal do parceiro com preços e simulador de compra direta.
                    </p>
                  </div>
                  {editingPartnerId && (
                    <div className="border border-[#e2e2e2] p-5 mb-5">
                      <p className={labelCls + " mb-4"}>Representantes Comerciais vinculados</p>
                      {partnerRepsLoading ? (
                        <p className="text-[#74777f] text-xs font-[var(--font-inter)]">Carregando...</p>
                      ) : (
                        <>
                          {partnerLinkedReps.length === 0 ? (
                            <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic mb-3">Nenhum representante vinculado.</p>
                          ) : (
                            <div className="space-y-2 mb-3">
                              {partnerLinkedReps.map((lr) => {
                                const rep = lr.sales_reps;
                                return (
                                  <div key={lr.id} className="flex items-center justify-between bg-[#f9f9f9] border border-[#e2e2e2] px-3 py-2">
                                    <div>
                                      <span className="text-sm font-semibold text-[#002045] font-[var(--font-inter)]">{rep.name}</span>
                                      <span className="text-xs text-[#74777f] font-[var(--font-inter)] ml-2">{rep.referral_code}</span>
                                      <span className="text-xs text-[#74777f] font-[var(--font-inter)] ml-2">· Comissão: {rep.commission_type === "percentage" ? `${rep.commission_value}%` : `R$ ${rep.commission_value}`}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeRepFromPartner(rep.id)}
                                      className="text-red-500 text-xs font-semibold hover:text-red-700 font-[var(--font-inter)] ml-4 flex-shrink-0"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="flex gap-2 items-start">
                            <select
                              value={addingRepId}
                              onChange={(e) => { setAddingRepId(e.target.value); setRepLinkError(""); }}
                              className={inputCls + " flex-1"}
                            >
                              <option value="">— Adicionar representante —</option>
                              {salesReps
                                .filter((r) => r.status === "active" && !partnerLinkedReps.some((lr) => lr.sales_rep_id === r.id))
                                .map((r) => (
                                  <option key={r.id} value={r.id}>{r.name} ({r.referral_code})</option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={addRepToPartner}
                              disabled={!addingRepId}
                              className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-40 whitespace-nowrap flex-shrink-0"
                            >
                              Vincular
                            </button>
                          </div>
                          {repLinkError && <p className="text-red-600 text-xs font-[var(--font-inter)] mt-1">{repLinkError}</p>}
                        </>
                      )}
                    </div>
                  )}
                  {partnerFormError && <p className="text-red-600 text-sm font-[var(--font-inter)] mb-4">{partnerFormError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={partnerFormLoading} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
                      {partnerFormLoading ? "Salvando..." : "Salvar"}
                    </button>
                    <button type="button" onClick={() => { setShowPartnerForm(false); setPartnerLinkedReps([]); setAddingRepId(""); setRepLinkError(""); }} className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 border border-[#e2e2e2] hover:border-[#74777f] transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingPartners ? <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p> : (
              <>
              <div className="hidden md:block bg-white border border-[#e2e2e2]">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Nome", "Cupom", "Profissão", "Desconto", "Comissão", "Rep", "Senha Portal", "Status", "Tab. Especial", "Ações"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePartners.length === 0 ? (
                      <tr><td colSpan={10} className="px-5 py-8 text-center text-[#74777f]">{partnerSearch.trim() ? "Nenhum parceiro encontrado para essa busca." : "Nenhum parceiro cadastrado."}</td></tr>
                    ) : (
                      activePartners.map((p) => (
                        <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                          <td className="px-5 py-4"><p className="font-semibold text-[#002045]">{p.name}</p>{p.email && <p className="text-xs text-[#74777f]">{p.email}</p>}</td>
                          <td className="px-5 py-4"><span className="bg-[#eef2f8] text-[#002045] px-2 py-1 text-xs font-bold tracking-wider">{p.coupon_code}</span></td>
                          <td className="px-5 py-4 text-xs text-[#43474e]">{p.profession || <span className="italic text-[#74777f]">—</span>}</td>
                          <td className="px-5 py-4 text-[#43474e]">{p.discount_type === "percentage" ? `${p.discount_value}%` : fmt(p.discount_value)}</td>
                          <td className="px-5 py-4 text-[#43474e]">
                            {p.commission_type === "percentage" ? `${p.commission_value}%` : fmt(p.commission_value)}
                            {p.commission_pool_pct != null && p.commission_type === "percentage" && (
                              <span className="block text-[9px] text-[#74777f] mt-0.5">repasse {p.commission_pool_pct}% · cliente {p.discount_value}%</span>
                            )}
                            {p.commission_updated_at && (
                              <span className="block text-[9px] text-[#b0b0b0] mt-0.5">↻ {new Date(p.commission_updated_at).toLocaleDateString("pt-BR")} · {p.commission_updated_by || "—"}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-[#74777f]">
                            {(() => {
                              const junctionReps = (p.partner_sales_reps ?? [])
                                .map((psr) => psr.sales_reps)
                                .filter(Boolean) as Array<{ name: string; referral_code: string }>;
                              if (junctionReps.length > 0) {
                                return (
                                  <span>
                                    {junctionReps.map((r) => (
                                      <span key={r.referral_code} className="block font-semibold text-[#002045]" title={`Cód. captação: ${r.referral_code}`}>{r.name}</span>
                                    ))}
                                  </span>
                                );
                              }
                              if (p.sales_rep_referral_code) {
                                const r = salesReps.find((r) => r.referral_code === p.sales_rep_referral_code);
                                return r ? <span className="font-semibold text-[#002045]">{r.name}</span> : <span>{p.sales_rep_referral_code}</span>;
                              }
                              return <span>—</span>;
                            })()}
                            <span className="block text-[9px] text-[#b0b0b0] font-[var(--font-inter)] mt-0.5">cód. captação</span>
                          </td>
                          <td className="px-5 py-4 text-xs text-[#74777f]">{p.has_portal_password ? <span className="text-green-700 font-semibold">Definida</span> : <span className="italic">—</span>}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold tracking-wider ${p.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                              {p.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => toggleSpecialTable(p)}
                              title={p.has_special_table ? "Desativar tabela especial" : "Ativar tabela especial"}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${p.has_special_table ? "bg-[#002045]" : "bg-[#d1d5db]"}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${p.has_special_table ? "translate-x-4" : "translate-x-0"}`} />
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => startEditPartner(p)} className="text-[#1a365d] text-xs font-semibold hover:text-[#002045]">Editar</button>
                              <span className="text-[#e2e2e2]">|</span>
                              <button onClick={() => togglePartnerStatus(p)} className="text-[#74777f] text-xs font-semibold hover:text-[#002045]">{p.status === "active" ? "Desativar" : "Ativar"}</button>
                              <span className="text-[#e2e2e2]">|</span>
                              <button onClick={() => deletePartner(p)} className="text-red-500 text-xs font-semibold hover:text-red-700">Excluir</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {activePartners.length === 0 ? (
                  <div className="bg-white border border-[#e2e2e2] px-4 py-6 text-center text-[#74777f] text-sm font-[var(--font-inter)]">{partnerSearch.trim() ? "Nenhum parceiro encontrado para essa busca." : "Nenhum parceiro cadastrado."}</div>
                ) : activePartners.map((p) => {
                  const junctionReps = (p.partner_sales_reps ?? []).map((psr) => psr.sales_reps).filter(Boolean) as Array<{ name: string; referral_code: string }>;
                  const repName = junctionReps.length > 0
                    ? junctionReps.map((r) => r.name).join(", ")
                    : p.sales_rep_referral_code
                      ? (salesReps.find((r) => r.referral_code === p.sales_rep_referral_code)?.name ?? p.sales_rep_referral_code)
                      : "—";
                  return (
                    <div key={p.id} className="bg-white border border-[#e2e2e2] p-4">
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#002045]">{p.name}</p>
                          {p.email && <p className="text-xs text-[#74777f] truncate">{p.email}</p>}
                        </div>
                        <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider flex-shrink-0">{p.coupon_code}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-[var(--font-inter)] mb-3">
                        <span className="text-[#74777f]">Profissão</span><span className="text-right text-[#43474e]">{p.profession || "—"}</span>
                        <span className="text-[#74777f]">Desconto</span><span className="text-right text-[#43474e]">{p.discount_type === "percentage" ? `${p.discount_value}%` : fmt(p.discount_value)}</span>
                        <span className="text-[#74777f]">Comissão</span>
                        <span className="text-right text-[#43474e]">
                          {p.commission_type === "percentage" ? `${p.commission_value}%` : fmt(p.commission_value)}
                          {p.commission_pool_pct != null && p.commission_type === "percentage" && <span className="block text-[9px] text-[#74777f]">repasse {p.commission_pool_pct}% · cliente {p.discount_value}%</span>}
                          {p.commission_updated_at && <span className="block text-[9px] text-[#b0b0b0]">↻ {new Date(p.commission_updated_at).toLocaleDateString("pt-BR")} · {p.commission_updated_by || "—"}</span>}
                        </span>
                        <span className="text-[#74777f]">Rep. (captação)</span><span className="text-right text-[#43474e] truncate">{repName}</span>
                        <span className="text-[#74777f]">Senha Portal</span><span className="text-right">{p.has_portal_password ? <span className="text-green-700 font-semibold">Definida</span> : <span className="text-[#74777f] italic">—</span>}</span>
                        <span className="text-[#74777f]">Status</span><span className="text-right"><span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider ${p.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{p.status === "active" ? "Ativo" : "Inativo"}</span></span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#f0f0f0]">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <button
                            onClick={() => toggleSpecialTable(p)}
                            title={p.has_special_table ? "Desativar tabela especial" : "Ativar tabela especial"}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${p.has_special_table ? "bg-[#002045]" : "bg-[#d1d5db]"}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${p.has_special_table ? "translate-x-4" : "translate-x-0"}`} />
                          </button>
                          <span className="text-[11px] text-[#74777f]">Tab. Especial</span>
                        </label>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button onClick={() => startEditPartner(p)} className="text-[#1a365d] text-xs font-semibold hover:text-[#002045]">Editar</button>
                          <span className="text-[#e2e2e2]">|</span>
                          <button onClick={() => togglePartnerStatus(p)} className="text-[#74777f] text-xs font-semibold hover:text-[#002045]">{p.status === "active" ? "Desativar" : "Ativar"}</button>
                          <span className="text-[#e2e2e2]">|</span>
                          <button onClick={() => deletePartner(p)} className="text-red-500 text-xs font-semibold hover:text-red-700">Excluir</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}

        {/* ═══ REPRESENTANTES TAB ═══ */}
        {tab === "representantes" && (
          <div>
            {/* Rep birthdays this month */}
            {upcomingRepBirthdays.length > 0 && (
              <div className="mb-8">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3 flex items-center gap-2">
                  🎂 Aniversários em {new Date().toLocaleString("pt-BR", { month: "long" })}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {upcomingRepBirthdays.map((r) => {
                    const bday = new Date(r.birthday!);
                    const day = bday.getUTCDate();
                    const now = new Date();
                    const isToday = bday.getUTCDate() === now.getDate() && bday.getUTCMonth() === now.getMonth();
                    const age = now.getFullYear() - bday.getUTCFullYear();
                    return (
                      <div key={r.id} className={`px-4 py-3 border text-sm font-[var(--font-inter)] ${isToday ? "border-yellow-300 bg-yellow-50" : "border-[#e2e2e2] bg-white"}`}>
                        <span className="font-bold text-[#002045]">{day < 10 ? `0${day}` : day}</span>
                        <span className="text-[#74777f] text-xs ml-1">— {r.name}</span>
                        <span className="text-[#74777f] text-xs ml-1">({age} anos)</span>
                        {isToday && <span className="ml-2 text-yellow-700 text-xs font-bold">HOJE!</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rep ranking */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045]">
                  Ranking de Representantes — vendas concluídas
                </h3>
                <div className="flex items-center gap-2">
                  {(["total", "count", "median"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setRepRankSort(s)}
                      className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${repRankSort === s ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}
                    >
                      {s === "total" ? "Valor" : s === "count" ? "Qtd." : "Ticket Médio"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Desktop table */}
              <div className="hidden md:block bg-white border border-[#e2e2e2]">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["#", "Representante", "Código", "Parceiros", "Total gerado", "Vendas", "Ticket médio"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repRanking.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-[#74777f] text-sm">Nenhuma venda concluída registrada ainda.</td></tr>
                    ) : repRanking.map((r, i) => (
                      <tr key={r.code} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-5 py-3 font-bold text-[#002045]">{i + 1}°</td>
                        <td className="px-5 py-3 font-semibold text-[#002045]">{r.name}</td>
                        <td className="px-5 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{r.code}</span></td>
                        <td className="px-5 py-3 text-[#43474e]">{r.partnerCount}</td>
                        <td className="px-5 py-3 font-semibold text-green-700">{fmt(r.total)}</td>
                        <td className="px-5 py-3 text-[#43474e]">{r.count}</td>
                        <td className="px-5 py-3 text-[#43474e]">{r.median > 0 ? fmt(r.median) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {repRanking.length === 0 ? (
                  <div className="bg-white border border-[#e2e2e2] px-4 py-6 text-center text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma venda concluída registrada ainda.</div>
                ) : repRanking.map((r, i) => (
                  <div key={r.code} className="bg-white border border-[#e2e2e2] p-4">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[#002045] flex-shrink-0">{i + 1}°</span>
                        <span className="font-semibold text-[#002045] truncate">{r.name}</span>
                      </div>
                      <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider flex-shrink-0">{r.code}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-[var(--font-inter)]">
                      <span className="text-[#74777f]">Total gerado</span><span className="text-right font-semibold text-green-700">{fmt(r.total)}</span>
                      <span className="text-[#74777f]">Vendas</span><span className="text-right text-[#43474e]">{r.count}</span>
                      <span className="text-[#74777f]">Ticket médio</span><span className="text-right text-[#43474e]">{r.median > 0 ? fmt(r.median) : "—"}</span>
                      <span className="text-[#74777f]">Parceiros</span><span className="text-right text-[#43474e]">{r.partnerCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <RepOversightTab reps={salesReps.map((r) => ({ id: r.id, name: r.name }))} />

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Representantes Comerciais</h2>
              <button onClick={startCreateRep} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors">
                + Novo Representante
              </button>
            </div>

            {showRepForm && (
              <div ref={repFormRef} className="bg-white border border-[#e2e2e2] p-8 mb-6">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-6">{editingRepId ? "Editar Representante" : "Novo Representante"}</h3>
                <form onSubmit={handleRepSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div><label className={labelCls}>Nome *</label><input required value={repForm.name} onChange={(e) => setRepForm({ ...repForm, name: e.target.value })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Código de Referência *</label>
                      <input required value={repForm.referral_code} onChange={(e) => setRepForm({ ...repForm, referral_code: e.target.value.toUpperCase() })} className={inputCls + " uppercase"} placeholder="ex: REP_JOAO" />
                      <p className="text-[10px] text-[#74777f] font-[var(--font-inter)] mt-1">Parceiros usam este código ao se cadastrar</p>
                    </div>
                    <div><label className={labelCls}>Email</label><input value={repForm.email} onChange={(e) => setRepForm({ ...repForm, email: e.target.value })} type="email" className={inputCls} /></div>
                    <div><label className={labelCls}>Telefone</label><input value={repForm.phone} onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Data de Nascimento *</label><input required type="text" placeholder="DD/MM/AAAA" maxLength={10} value={isoToDMY(repForm.birthday || "")} onChange={(e) => setRepForm({ ...repForm, birthday: dmyToISO(maskBday(e.target.value)) })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Tipo de Comissão</label>
                      <select value={repForm.commission_type} onChange={(e) => setRepForm({ ...repForm, commission_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                        <option value="percentage">Porcentagem (% da venda)</option><option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Comissão {repForm.commission_type === "percentage" ? "(%)" : "(R$)"}</label><input type="number" min="0" step="0.01" value={repForm.commission_value} onChange={(e) => setRepForm({ ...repForm, commission_value: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Senha do Portal <span className="normal-case font-normal">(acesso representante)</span></label>
                      <div className="relative">
                        <input value={repForm.portal_password} onChange={(e) => setRepForm({ ...repForm, portal_password: e.target.value })} className={inputCls + " pr-10"} type={showRepPw ? "text" : "password"} placeholder="Em branco = manter senha atual" />
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={showRepPw ? "Ocultar senha" : "Mostrar senha"}
                          onClick={() => setShowRepPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
                        >
                          {showRepPw ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {editingRepId && (
                      <div>
                        <label className={labelCls}>Status</label>
                        <select value={repForm.status} onChange={(e) => setRepForm({ ...repForm, status: e.target.value as "active" | "inactive" })} className={inputCls}>
                          <option value="active">Ativo</option><option value="inactive">Inativo</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {repFormError && <p className="text-red-600 text-sm font-[var(--font-inter)] mb-4">{repFormError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={repFormLoading} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
                      {repFormLoading ? "Salvando..." : "Salvar"}
                    </button>
                    <button type="button" onClick={() => setShowRepForm(false)} className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 border border-[#e2e2e2] hover:border-[#74777f] transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingReps ? <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p> : (
              <>
              <div className="hidden md:block bg-white border border-[#e2e2e2]">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Nome", "Código Ref.", "Comissão", "Parceiros", "Senha Portal", "Status", "Ações"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesReps.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-[#74777f]">Nenhum representante cadastrado.</td></tr>
                    ) : (
                      salesReps.map((r) => {
                        const legacyRepCount = partners.filter((p) => p.sales_rep_referral_code === r.referral_code).length;
                        const repPartnerCount = Math.max(legacyRepCount, junctionPartnerCounts[r.id] || 0);
                        const isExpanded = expandedRepId === r.id;
                        // Partners linked to this rep (junction or legacy referral code)
                        const repPartners = partners.filter((p) => {
                          const viaJunction = p.partner_sales_reps?.some((psr) => psr.sales_reps?.id === r.id);
                          const viaLegacy = p.sales_rep_referral_code === r.referral_code;
                          return viaJunction || viaLegacy;
                        });
                        return (
                          <React.Fragment key={r.id}>
                            <tr className={`border-b border-[#f0f0f0] hover:bg-[#fafafa] ${isExpanded ? "bg-[#f8fafc]" : ""}`}>
                              <td className="px-5 py-4"><p className="font-semibold text-[#002045]">{r.name}</p>{r.email && <p className="text-xs text-[#74777f]">{r.email}</p>}</td>
                              <td className="px-5 py-4"><span className="bg-[#eef2f8] text-[#002045] px-2 py-1 text-xs font-bold tracking-wider">{r.referral_code}</span></td>
                              <td className="px-5 py-4 text-[#43474e]">{r.commission_type === "percentage" ? `${r.commission_value}%` : fmt(r.commission_value)} <span className="text-xs text-[#74777f]">da venda</span></td>
                              <td className="px-5 py-4">
                                <button
                                  onClick={() => setExpandedRepId(isExpanded ? null : r.id)}
                                  className={`font-semibold text-sm transition-colors ${repPartnerCount > 0 ? "text-[#002045] hover:text-[#1a56db] underline decoration-dotted" : "text-[#43474e]"}`}
                                >
                                  {repPartnerCount}
                                  {repPartnerCount > 0 && (
                                    <span className="ml-1 text-[10px] font-normal no-underline">{isExpanded ? "▲" : "▼"}</span>
                                  )}
                                </button>
                              </td>
                              <td className="px-5 py-4 text-xs text-[#74777f]">{r.has_portal_password ? <span className="text-green-700 font-semibold">Definida</span> : <span className="italic">—</span>}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-1 text-[10px] font-bold tracking-wider ${r.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                  {r.status === "active" ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex gap-2">
                                  <button onClick={() => startEditRep(r)} className="text-[#1a365d] text-xs font-semibold hover:text-[#002045]">Editar</button>
                                  <span className="text-[#e2e2e2]">|</span>
                                  <button onClick={() => toggleRepStatus(r)} className="text-[#74777f] text-xs font-semibold hover:text-[#002045]">{r.status === "active" ? "Desativar" : "Ativar"}</button>
                                  <span className="text-[#e2e2e2]">|</span>
                                  <button onClick={() => deleteRep(r)} className="text-red-500 text-xs font-semibold hover:text-red-700">Excluir</button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0 border-b border-[#e2e2e2]">
                                  <div className="bg-[#f0f4fa] px-6 py-4">
                                    <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] font-[var(--font-inter)] mb-3">
                                      Parceiros de {r.name}
                                    </p>
                                    {repPartners.length === 0 ? (
                                      <p className="text-sm text-[#74777f] font-[var(--font-inter)] italic">Nenhum parceiro vinculado a este representante.</p>
                                    ) : (
                                      <table className="w-full text-xs font-[var(--font-inter)] bg-white border border-[#e2e2e2]">
                                        <thead>
                                          <tr className="border-b border-[#e2e2e2]">
                                            {["Nome", "Email", "Telefone", "Cupom", "Status", "Cadastro"].map((h) => (
                                              <th key={h} className="text-left px-4 py-2 text-[9px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {repPartners.map((p) => (
                                            <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                                              <td className="px-4 py-2.5 font-semibold text-[#002045]">{p.name}</td>
                                              <td className="px-4 py-2.5 text-[#43474e]">{p.email || <span className="italic text-[#74777f]">—</span>}</td>
                                              <td className="px-4 py-2.5 text-[#43474e]">{p.phone || <span className="italic text-[#74777f]">—</span>}</td>
                                              <td className="px-4 py-2.5"><span className="bg-[#eef2f8] text-[#002045] px-1.5 py-0.5 font-bold tracking-wider">{p.coupon_code}</span></td>
                                              <td className="px-4 py-2.5">
                                                <span className={`px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${p.status === "active" ? "bg-green-100 text-green-800" : p.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>
                                                  {p.status === "active" ? "Ativo" : p.status === "pending" ? "Pendente" : "Inativo"}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2.5 text-[#74777f]">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {salesReps.length === 0 ? (
                  <div className="bg-white border border-[#e2e2e2] px-4 py-6 text-center text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum representante cadastrado.</div>
                ) : salesReps.map((r) => {
                  const legacyRepCount = partners.filter((p) => p.sales_rep_referral_code === r.referral_code).length;
                  const repPartnerCount = Math.max(legacyRepCount, junctionPartnerCounts[r.id] || 0);
                  const isExpanded = expandedRepId === r.id;
                  const repPartners = partners.filter((p) => {
                    const viaJunction = p.partner_sales_reps?.some((psr) => psr.sales_reps?.id === r.id);
                    const viaLegacy = p.sales_rep_referral_code === r.referral_code;
                    return viaJunction || viaLegacy;
                  });
                  return (
                    <div key={r.id} className="bg-white border border-[#e2e2e2] p-4">
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#002045]">{r.name}</p>
                          {r.email && <p className="text-xs text-[#74777f] truncate">{r.email}</p>}
                        </div>
                        <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider flex-shrink-0">{r.referral_code}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-[var(--font-inter)] mb-3">
                        <span className="text-[#74777f]">Comissão</span><span className="text-right text-[#43474e]">{r.commission_type === "percentage" ? `${r.commission_value}%` : fmt(r.commission_value)} da venda</span>
                        <span className="text-[#74777f]">Senha Portal</span><span className="text-right">{r.has_portal_password ? <span className="text-green-700 font-semibold">Definida</span> : <span className="text-[#74777f] italic">—</span>}</span>
                        <span className="text-[#74777f]">Status</span><span className="text-right"><span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider ${r.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{r.status === "active" ? "Ativo" : "Inativo"}</span></span>
                        <span className="text-[#74777f]">Parceiros</span>
                        <span className="text-right">
                          <button
                            onClick={() => setExpandedRepId(isExpanded ? null : r.id)}
                            className={`font-semibold text-sm transition-colors ${repPartnerCount > 0 ? "text-[#002045] underline decoration-dotted" : "text-[#43474e]"}`}
                          >
                            {repPartnerCount}{repPartnerCount > 0 && <span className="ml-1 text-[10px] font-normal no-underline">{isExpanded ? "▲" : "▼"}</span>}
                          </button>
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="bg-[#f0f4fa] -mx-4 px-4 py-3 mb-3 space-y-2">
                          <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] font-[var(--font-inter)]">Parceiros de {r.name}</p>
                          {repPartners.length === 0 ? (
                            <p className="text-xs text-[#74777f] font-[var(--font-inter)] italic">Nenhum parceiro vinculado.</p>
                          ) : repPartners.map((p) => (
                            <div key={p.id} className="bg-white border border-[#e2e2e2] px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#002045] truncate">{p.name}</span>
                                <span className="bg-[#eef2f8] text-[#002045] px-1.5 py-0.5 text-[10px] font-bold tracking-wider flex-shrink-0">{p.coupon_code}</span>
                              </div>
                              {(p.email || p.phone) && <p className="text-[11px] text-[#74777f] mt-0.5 truncate">{[p.email, p.phone].filter(Boolean).join(" · ")}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end pt-2.5 border-t border-[#f0f0f0]">
                        <button onClick={() => startEditRep(r)} className="text-[#1a365d] text-xs font-semibold hover:text-[#002045]">Editar</button>
                        <span className="text-[#e2e2e2]">|</span>
                        <button onClick={() => toggleRepStatus(r)} className="text-[#74777f] text-xs font-semibold hover:text-[#002045]">{r.status === "active" ? "Desativar" : "Ativar"}</button>
                        <span className="text-[#e2e2e2]">|</span>
                        <button onClick={() => deleteRep(r)} className="text-red-500 text-xs font-semibold hover:text-red-700">Excluir</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}

        {/* ═══ CAMPAIGNS TAB ═══ */}
        {tab === "campaigns" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">
                Campanhas de E-mail
              </h2>
              <button
                onClick={generateCampaign}
                disabled={campaignGenerating}
                className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
              >
                {campaignGenerating ? "Gerando..." : "+ Gerar Próxima Campanha"}
              </button>
            </div>

            {campaignsLoading ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
            ) : campaigns.length === 0 ? (
              <div className="bg-white border border-[#e2e2e2] px-6 py-12 text-center">
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma campanha criada ainda.</p>
                <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">Clique em &ldquo;Gerar Próxima Campanha&rdquo; para começar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => {
                  const isExpanded = expandedCampaignId === c.id;
                  const isEditing = editingCampaignId === c.id;
                  const statusCls = c.status === 'sent' ? 'bg-green-100 text-green-800' : c.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600';
                  const statusLabel = c.status === 'sent' ? 'Enviada' : c.status === 'pending_approval' ? 'Aguardando aprovação' : 'Aprovada';
                  return (
                    <div key={c.id} className="bg-white border border-[#e2e2e2]">
                      {/* Campaign header row */}
                      <div className="px-6 py-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-[#74777f] font-[var(--font-inter)]">
                              {c.campaign_type === 'product' ? 'Produto' : 'Educacional'} · {c.campaign_subtype}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wide rounded-full ${statusCls}`}>{statusLabel}</span>
                          </div>
                          <p className="font-semibold text-[#002045] text-sm font-[var(--font-inter)] truncate">{c.subject}</p>
                          <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">
                            {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {c.sent_at && ` · ${c.recipient_count ?? 0} destinatários`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {c.status === 'pending_approval' && (
                            <>
                              <button
                                onClick={() => sendCampaignTest(c.id)}
                                disabled={campaignTestSending === c.id}
                                className="text-xs font-[var(--font-inter)] text-[#002045] border border-[#002045] px-3 py-1.5 hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-50"
                              >
                                {campaignTestSending === c.id ? "..." : "Reenviar Teste"}
                              </button>
                              <button
                                onClick={() => approveCampaign(c.id, c.approve_token)}
                                disabled={campaignApproving === c.id}
                                className="text-xs font-[var(--font-inter)] bg-green-700 text-white px-3 py-1.5 hover:bg-green-800 transition-colors disabled:opacity-50"
                              >
                                {campaignApproving === c.id ? "Enviando..." : "✓ Aprovar & Enviar"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteCampaign(c.id)}
                            disabled={campaignDeleting === c.id}
                            title="Excluir campanha"
                            className="text-[#74777f] hover:text-red-600 transition-colors p-1 disabled:opacity-40"
                          >
                            {campaignDeleting === c.id ? (
                              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6h14M10 11v6M14 11v6" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => setExpandedCampaignId(isExpanded ? null : c.id)}
                            className="text-[#74777f] hover:text-[#002045] transition-colors p-1"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-[#e2e2e2] px-6 py-5">
                          {isEditing ? (
                            <div className="space-y-5">
                              {/* Mode toggle */}
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f]">Editor</span>
                                <div className="flex border border-[#e2e2e2] overflow-hidden">
                                  {(["visual", "html"] as const).map((m) => (
                                    <button key={m} type="button" onClick={() => setCampaignEditMode(m)}
                                      className={`px-4 py-1.5 text-xs font-bold font-[var(--font-inter)] transition-colors ${campaignEditMode === m ? "bg-[#002045] text-white" : "bg-white text-[#74777f] hover:bg-[#f5f5f3]"}`}>
                                      {m === "visual" ? "Visual" : "HTML"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Subject — always shown */}
                              <div>
                                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Assunto do e-mail</label>
                                <input value={campaignEditSubject} onChange={(e) => setCampaignEditSubject(e.target.value)}
                                  className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                              </div>

                              {campaignEditMode === "visual" ? (
                                <div className="space-y-5">
                                  {/* AI assistant — product-grounded edit/add */}
                                  <div className="border border-[#cdd8e6] bg-[#eef2f8] p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="2.5"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#002045]">Assistente IA</span>
                                    </div>
                                    <p className="text-xs text-[#5b6470] font-[var(--font-inter)] mb-3 leading-relaxed">
                                      Peça para alterar ou adicionar conteúdo — ex: &ldquo;deixe o texto mais curto&rdquo;, &ldquo;adicione um parágrafo sobre resistência à umidade&rdquo;, &ldquo;reescreva o título de forma mais elegante&rdquo;. A IA usa apenas dados reais do produto Orbital e não inventa informações.
                                    </p>
                                    <textarea
                                      value={campaignAiInstruction}
                                      onChange={(e) => setCampaignAiInstruction(e.target.value)}
                                      rows={2}
                                      placeholder="O que você quer alterar ou adicionar?"
                                      className="w-full border border-[#cdd8e6] bg-white px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] resize-y"
                                    />
                                    <button
                                      type="button"
                                      onClick={runCampaignAiEdit}
                                      disabled={campaignAiEditing || !campaignAiInstruction.trim()}
                                      className="mt-2 inline-flex items-center gap-2 bg-[#002045] text-white text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] transition-colors disabled:opacity-40"
                                    >
                                      {campaignAiEditing ? (
                                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                      ) : null}
                                      {campaignAiEditing ? "Gerando…" : "Aplicar com IA"}
                                    </button>
                                  </div>

                                  {/* Subheadline */}
                                  <div>
                                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-1">
                                      Etiqueta / Categoria <span className="text-[#9e9e9e] normal-case tracking-normal font-normal">— opcional, aparece acima do título</span>
                                    </label>
                                    <input value={campaignVisualSubheadline} onChange={(e) => setCampaignVisualSubheadline(e.target.value)}
                                      placeholder="ex: Nova coleção · Produto destaque"
                                      className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                                  </div>

                                  {/* Headline */}
                                  <div>
                                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Título principal *</label>
                                    <input value={campaignVisualHeadline} onChange={(e) => setCampaignVisualHeadline(e.target.value)}
                                      placeholder="ex: Uma placa. Dez anos. Zero manutenção."
                                      className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                                  </div>

                                  {/* Body */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f]">
                                        Texto do e-mail <span className="text-[#9e9e9e] normal-case tracking-normal font-normal">— cada linha vira um parágrafo</span>
                                      </label>
                                      <button
                                        disabled={aiTextGenerating === "campaignBody"}
                                        onClick={() => generateAiText(
                                          "campaignBody",
                                          "Você é um redator de e-mail marketing premium para a Orbital Revestimentos, empresa de revestimentos PFB (painel de fibra de bambu) em Manaus.",
                                          `Escreva o corpo de um e-mail marketing para a campanha cujo título é: "${campaignVisualHeadline || "campanha Orbital"}". O e-mail deve ter 3 parágrafos curtos, tom elegante e persuasivo, destacando os benefícios do PFB para o clima de Manaus. Cada parágrafo em uma linha separada. Sem saudação nem assinatura.`,
                                          setCampaignVisualBody
                                        )}
                                        className="flex items-center gap-1 text-[8px] tracking-wide uppercase font-bold font-[var(--font-inter)] text-[#002045] border border-[#002045] px-2 py-0.5 hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-40"
                                      >
                                        {aiTextGenerating === "campaignBody" ? (
                                          <svg className="animate-spin" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                        ) : (
                                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                                        )}
                                        {aiTextGenerating === "campaignBody" ? "Gerando…" : "IA"}
                                      </button>
                                    </div>
                                    <textarea value={campaignVisualBody} onChange={(e) => setCampaignVisualBody(e.target.value)}
                                      rows={6} placeholder={"Escreva aqui o conteúdo do e-mail...\n\nVocê pode usar várias linhas — cada linha se torna um parágrafo separado."}
                                      className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] resize-y" />
                                  </div>

                                  {/* Image upload */}
                                  <div>
                                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                                      Foto <span className="text-[#9e9e9e] normal-case tracking-normal font-normal">— opcional, aparece em destaque no e-mail</span>
                                    </label>
                                    {campaignVisualImageUrl ? (
                                      <div className="border border-[#e2e2e2] overflow-hidden">
                                        <img src={campaignVisualImageUrl} alt="preview" className="w-full max-h-48 object-cover" />
                                        <div className="flex border-t border-[#e2e2e2]">
                                          <a href={campaignVisualImageUrl} download target="_blank" rel="noopener noreferrer"
                                            className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] text-[#1a365d] hover:bg-[#eef2f8] transition-colors">
                                            ↓ Download
                                          </a>
                                          <label className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors cursor-pointer">
                                            {campaignImageUploading ? "Enviando…" : "Substituir"}
                                            <input type="file" accept="image/*" className="hidden"
                                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCampaignImageUpload(f); e.currentTarget.value = ""; }} />
                                          </label>
                                          <button type="button" onClick={() => setCampaignVisualImageUrl("")}
                                            className="px-3 py-2 text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] text-red-600 hover:bg-red-50 transition-colors">
                                            Remover
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#e2e2e2] px-6 py-8 cursor-pointer hover:border-[#002045]/40 transition-colors ${campaignImageUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#74777f" strokeWidth="1.5">
                                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                        </svg>
                                        <span className="text-sm font-[var(--font-inter)] text-[#74777f]">
                                          {campaignImageUploading ? "Enviando..." : "Clique para selecionar ou arraste uma foto"}
                                        </span>
                                        <span className="text-[10px] text-[#9e9e9e] font-[var(--font-inter)]">JPG, PNG ou WebP · máx. 5 MB</span>
                                        <input type="file" accept="image/*" className="hidden"
                                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCampaignImageUpload(f); }} />
                                      </label>
                                    )}
                                  </div>

                                  {/* CTA button */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-1">
                                        Texto do botão <span className="text-[#9e9e9e] normal-case tracking-normal font-normal">— opcional</span>
                                      </label>
                                      <input value={campaignVisualCtaText} onChange={(e) => setCampaignVisualCtaText(e.target.value)}
                                        placeholder="Ver no site"
                                        className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Link do botão</label>
                                      <input value={campaignVisualCtaUrl} onChange={(e) => setCampaignVisualCtaUrl(e.target.value)}
                                        placeholder="https://orbitalrevestimentos.com.br"
                                        className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-2">HTML do Email</label>
                                  <textarea value={campaignEditBody} onChange={(e) => setCampaignEditBody(e.target.value)}
                                    rows={20} className="w-full border border-[#e2e2e2] px-3 py-2.5 text-xs font-mono text-[#002045] focus:outline-none focus:border-[#002045] resize-y" />
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-3 pt-1">
                                <button onClick={() => saveCampaignEdit(c.id)} disabled={campaignEditSaving}
                                  className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] disabled:opacity-50">
                                  {campaignEditSaving ? "Salvando..." : "Salvar"}
                                </button>
                                <button onClick={() => { saveCampaignEdit(c.id).then(() => sendCampaignTest(c.id)); }}
                                  className="border border-[#002045] text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#002045] hover:text-white transition-colors">
                                  Salvar + Reenviar Teste
                                </button>
                                <button onClick={() => setEditingCampaignId(null)}
                                  className="text-[#74777f] text-xs font-[var(--font-inter)] underline">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f]">Preview do Email</p>
                                {c.status !== 'sent' && (
                                  <button
                                    onClick={() => {
                                      setEditingCampaignId(c.id);
                                      setCampaignEditSubject(c.subject);
                                      setCampaignEditBody(c.html_body);
                                      setCampaignAiInstruction("");
                                      // Prefer embedded blocks; otherwise parse the HTML so the
                                      // Visual editor never opens with empty fields.
                                      const blocks = extractEmailBlocks(c.html_body) ?? htmlToBlocks(c.html_body);
                                      setCampaignEditMode("visual");
                                      setCampaignVisualHeadline(blocks.headline);
                                      setCampaignVisualSubheadline(blocks.subheadline);
                                      setCampaignVisualBody(blocks.body);
                                      setCampaignVisualImageUrl(blocks.imageUrl);
                                      setCampaignVisualCtaText(blocks.ctaText || "Ver no site");
                                      setCampaignVisualCtaUrl(blocks.ctaUrl || "https://orbitalrevestimentos.com.br");
                                    }}
                                    className="text-xs text-[#002045] font-[var(--font-inter)] underline"
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                              <div
                                className="border border-[#e2e2e2] bg-[#f5f5f3] p-2"
                                dangerouslySetInnerHTML={{ __html: c.html_body }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ ORÇAMENTOS TAB (merged Clientes + Histórico) ═══ */}
        {tab === "orcamentos" && (
          <div>
            {/* Materiais de instalação — regras do cálculo automático (PU-40 na
                parede; cola de contato + espuma no teto/forro). */}
            <div className="bg-white border border-[#e2e2e2] px-4 sm:px-5 py-4 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-[var(--font-inter)] text-sm font-bold text-[#002045]">Materiais de instalação</p>
                <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5">
                  Consumo por placa, embalagens de cola e quais aplicações disparam cada regra.
                </p>
              </div>
              <Link href="/admin/orcamentos/materiais" className="border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#002045] hover:text-white transition-colors whitespace-nowrap">
                Parâmetros do cálculo
              </Link>
            </div>

            {/* Header + filters */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Orçamentos</h2>
                  {!clientsLoading && (
                    <span className="bg-[#eef2f8] text-[#002045] text-[10px] font-bold font-[var(--font-inter)] tracking-wider px-2 py-0.5">
                      {filteredClients.length}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                <Link href="/admin/orcamentos/novo" className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors whitespace-nowrap">
                  + Novo orçamento
                </Link>
                <button
                  onClick={exportClients}
                  disabled={clientsExporting}
                  className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                >
                  {clientsExporting ? "Exportando..." : "Exportar CSV"}
                </button>
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail…"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full sm:w-auto border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] sm:min-w-[220px]"
                />
                <select value={clientStatusFilter} onChange={(e) => setClientStatusFilter(e.target.value)} className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                  <option value="all">Todos os status</option>
                  <option value="em_orcamento">Em orçamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="sem_cupom">Sem cupom</option>
                </select>
                <select value={clientPartnerFilter} onChange={(e) => setClientPartnerFilter(e.target.value)} className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                  <option value="all">Todos os parceiros</option>
                  {partners.filter((p) => p.status === "active").map((p) => (
                    <option key={p.id} value={p.coupon_code}>{p.name}</option>
                  ))}
                </select>
                {/* Ordenação — a ordem cronológica esconde os orçamentos grandes. */}
                <select
                  value={`${clientSortKey}:${clientSortDir}`}
                  onChange={(e) => {
                    const [k, d] = e.target.value.split(":");
                    setClientSortKey(k as "data" | "cliente" | "valor");
                    setClientSortDir(d as "asc" | "desc");
                  }}
                  className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                >
                  <option value="data:desc">Mais recentes</option>
                  <option value="data:asc">Mais antigos</option>
                  <option value="valor:desc">Maior valor</option>
                  <option value="valor:asc">Menor valor</option>
                  <option value="cliente:asc">Cliente (A–Z)</option>
                  <option value="cliente:desc">Cliente (Z–A)</option>
                </select>
                {/* Agrupar — 105 linhas seguidas não se gerencia. */}
                <select
                  value={clientGroupMode}
                  onChange={(e) => setClientGroupMode(e.target.value as "situacao" | "semana" | "mes" | "ano")}
                  className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                >
                  <option value="situacao">Agrupar por situação</option>
                  <option value="semana">Agrupar por semana</option>
                  <option value="mes">Agrupar por mês</option>
                  <option value="ano">Agrupar por ano</option>
                </select>
              </div>
            </div>

            {/* Orçamentos formalizados pelo site — convertíveis em pedido sem redigitar */}
            {formalQuotes.length > 0 && (
              <div className="bg-white border border-[#002045]/20 mb-5">
                <div className="bg-[#002045] px-4 py-2.5">
                  <p className="text-white text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)]">
                    Orçamentos formalizados no site ({formalQuotes.length})
                  </p>
                </div>
                <div className="divide-y divide-[#f0f0f0]">
                  {formalQuotes.map((fq) => {
                    const converted = !!fq.pedido_id;
                    return (
                      <div key={fq.slug} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">
                            {fq.formal_number} · {fq.client_name ?? "Cliente"}
                          </p>
                          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                            {fq.total_plates ?? 0} placas · {fq.payment_condition === "cartao" ? "Cartão" : "PIX"} · frete {fq.frete_free ? "grátis" : (fq.frete_amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} · {(fq.total_amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a href={`/api/orcamento/${fq.slug}/pdf`} target="_blank" rel="noopener noreferrer" className="text-[#002045] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] border border-[#e2e2e2] px-3 py-1.5 hover:border-[#002045] transition-colors">PDF</a>
                          <a href={`/admin/orcamentos/${fq.slug}`} className="text-[#002045] text-[10px] tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] border border-[#e2e2e2] px-3 py-1.5 hover:border-[#002045] transition-colors">Materiais</a>
                          {converted ? (
                            <span className="text-[#3b6934] text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] bg-[#f0f9eb] px-3 py-1.5">Convertido ✓</span>
                          ) : (
                            <button
                              onClick={() => convertFormalQuote(fq.slug)}
                              disabled={convertingSlug === fq.slug}
                              className="bg-[#3b6934] text-white text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:bg-[#2e5229] transition-colors disabled:opacity-50"
                            >
                              {convertingSlug === fq.slug ? "Convertendo…" : "Converter em pedido"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats bar */}
            {!clientsLoading && filteredClients.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                {[
                  { label: "Total", value: filteredClients.length, sub: "orçamentos" },
                  { label: "Em aberto", value: orcamentosStats.emAberto, sub: "em orçamento" },
                  { label: "Concluídos", value: orcamentosStats.concluidos, sub: "finalizados" },
                  { label: "Receita pot.", value: orcamentosStats.totalReceita.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }), sub: "só os em aberto" },
                  { label: "Drip ativo", value: orcamentosStats.dripAtivos, sub: `de ${filteredClients.length}` },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-[#e2e2e2] px-4 py-3">
                    <p className="text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">{s.label}</p>
                    <p className="text-lg font-semibold font-[var(--font-noto-serif)] text-[#002045] mt-0.5 leading-none">{s.value}</p>
                    <p className="text-[9px] text-[#b0b0b0] font-[var(--font-inter)] mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* A tabela espera SÓ os orçamentos. Cupons e pedidos enriquecem as
                linhas (status, conversão) e chegam depois — prender a tabela aos
                três fazia um endpoint lento esconder criar, excluir e ordenar,
                como se tivessem sumido. */}
            {clientsLoading ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando orçamentos...</p>
            ) : filteredClients.length === 0 && (clientsError || usesError || pedidosError) ? (
              // Nothing loaded from EITHER source and at least one fetch failed —
              // this is a real error, not "no orders". Block with a retry.
              <div className="bg-red-50 border border-red-200 px-6 py-8 text-center">
                <p className="text-red-800 text-sm font-semibold font-[var(--font-inter)]">Não foi possível carregar os orçamentos</p>
                {clientsError && <p className="text-red-700 text-xs font-[var(--font-inter)] mt-1 break-words">{clientsError}</p>}
                {usesError && <p className="text-red-700 text-xs font-[var(--font-inter)] mt-1 break-words">{usesError}</p>}
                {pedidosError && <p className="text-red-700 text-xs font-[var(--font-inter)] mt-1 break-words">{pedidosError}</p>}
                <button
                  onClick={() => { setClientsError(null); setUsesError(null); setPedidosError(null); fetchClients(); fetchUses(); fetchPedidos(); }}
                  className="mt-4 inline-block border border-red-300 text-red-800 px-4 py-2 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-red-100 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="bg-white border border-[#e2e2e2] px-6 py-12 text-center">
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum orçamento encontrado.</p>
              </div>
            ) : (
              <>
                {/* One source failed but the other returned rows — show the data and
                    surface the partial failure as a non-blocking warning. */}
                {(clientsError || usesError || pedidosError) && (
                  <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-amber-800 text-xs font-semibold font-[var(--font-inter)]">Alguns dados podem estar incompletos</p>
                      {clientsError && <p className="text-amber-700 text-[11px] font-[var(--font-inter)] mt-0.5 break-words">{clientsError}</p>}
                      {usesError && <p className="text-amber-700 text-[11px] font-[var(--font-inter)] mt-0.5 break-words">{usesError}</p>}
                      {pedidosError && <p className="text-amber-700 text-[11px] font-[var(--font-inter)] mt-0.5 break-words">{pedidosError}</p>}
                    </div>
                    <button
                      onClick={() => { setClientsError(null); setUsesError(null); setPedidosError(null); fetchClients(); fetchUses(); fetchPedidos(); }}
                      className="shrink-0 border border-amber-300 text-amber-800 px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-amber-100 transition-colors"
                    >
                      Recarregar
                    </button>
                  </div>
                )}
                {/* Desktop table — 8 cols, no overflow-x */}
                <div className="hidden sm:block bg-white border border-[#e2e2e2]">
                  <table className="w-full text-sm font-[var(--font-inter)] table-fixed">
                    <colgroup>
                      <col style={{width:"9%"}} />
                      <col style={{width:"20%"}} />
                      <col style={{width:"16%"}} />
                      <col style={{width:"9%"}} />
                      <col style={{width:"13%"}} />
                      <col style={{width:"13%"}} />
                      <col style={{width:"17%"}} />
                      <col style={{width:"3%"}} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[#e2e2e2]">
                        {["Data", "Cliente", "Orçamento", "Total", "Parceiro", "Status venda", "Emails / Drip", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orcamentoGroups.flatMap((g) => [
                        <tr key={`h-${g.key}`} className="bg-[#f5f5f3] border-y border-[#e2e2e2]">
                          <td colSpan={8} className="px-4 py-2">
                            <button onClick={() => toggleGroup(g.key)} className="flex items-center gap-2 text-left w-full">
                              <span className="text-[#74777f] text-[10px] w-3">{collapsedGroups[g.key] ? "▶" : "▼"}</span>
                              <span className="text-[11px] tracking-[0.08em] uppercase font-bold text-[#002045]">{g.label}</span>
                              <span className="text-[10px] font-bold text-[#74777f] bg-white border border-[#e2e2e2] px-1.5 py-0.5">{g.rows.length}</span>
                              {g.hint && <span className="text-[10px] text-[#a0a3a8] font-normal normal-case">{g.hint}</span>}
                              <span className="ml-auto text-[10px] text-[#74777f]">
                                {g.rows.reduce((s, r) => s + (r.total ?? 0), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                              </span>
                            </button>
                          </td>
                        </tr>,
                        ...(collapsedGroups[g.key] ? [] : g.rows.map((c) => {
                        const cu = c.couponUse;
                        const saleStatus = c.sale_status ?? cu?.sale_status ?? "em_orcamento";
                        const stMeta = STATUS_LABELS[saleStatus] ?? STATUS_LABELS.em_orcamento;
                        const age = ageBadge(c.created_at, c.status);
                        const waHref = c.client_phone ? `https://wa.me/55${c.client_phone.replace(/\D/g, "")}` : null;
                        return (
                          <tr key={c.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                            {/* Data + age */}
                            <td className="px-4 py-3">
                              <p className="text-xs text-[#74777f]">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                              <p className="text-[10px] text-[#43474e]">{new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                              <p className={`text-[9px] mt-0.5 ${age.cls}`}>{age.label}</p>
                            </td>
                            {/* Cliente + WA */}
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#002045] text-xs truncate">
                                {c.client_name}
                                {c._isPedido ? (
                                  <span className="ml-1.5 align-middle text-[8px] bg-[#002045] text-white px-1.5 py-0.5 font-bold tracking-wider rounded-sm">PEDIDO</span>
                                ) : (
                                  <span className="ml-1.5 align-middle text-[8px] bg-[#eef2f8] text-[#43474e] px-1.5 py-0.5 font-bold tracking-wider rounded-sm">ORÇAMENTO</span>
                                )}
                              </p>
                              <p className="text-[10px] text-[#74777f] truncate">{c.client_email}</p>
                              {waHref && (
                                <a href={waHref} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] text-[#3b6934] font-bold hover:underline mt-0.5">
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 0C5.149 0 0 5.149 0 11.5c0 2.115.576 4.092 1.578 5.779L.057 23l5.88-1.542A11.45 11.45 0 0011.5 23C17.851 23 23 17.851 23 11.5S17.851 0 11.5 0zm0 21.077a9.555 9.555 0 01-4.87-1.335l-.35-.208-3.63.952.969-3.542-.228-.363A9.533 9.533 0 011.923 11.5C1.923 6.193 6.193 1.923 11.5 1.923S21.077 6.193 21.077 11.5 16.807 21.077 11.5 21.077z"/></svg>
                                  WA
                                </a>
                              )}
                            </td>
                            {/* Orçamento: space, model, plates, m² */}
                            <td className="px-4 py-3 text-xs text-[#43474e]">
                              <p className="truncate font-medium">{c.space || "—"}</p>
                              <p className="text-[10px] text-[#74777f]">{c.model} · {c.plates} pl.</p>
                              {c.area_m2 != null && <p className="text-[9px] text-[#b0b0b0]">{Number(c.area_m2).toFixed(1)} m²</p>}
                            </td>
                            {/* Total */}
                            <td className="px-4 py-3 text-xs font-semibold text-[#002045] whitespace-nowrap">
                              {c.total != null ? c.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}
                            </td>
                            {/* Parceiro */}
                            <td className="px-4 py-3 text-xs text-[#43474e]">
                              {cu ? (
                                <div>
                                  <p className="truncate">{c.partner_name}</p>
                                  <span className="text-[10px] bg-[#eef2f8] text-[#002045] px-1.5 py-0.5 font-bold tracking-wider">{cu.coupon_code}</span>
                                </div>
                              ) : (
                                <span className="text-[#74777f] italic text-[10px]">Sem cupom</span>
                              )}
                            </td>
                            {/* Status venda */}
                            <td className="px-4 py-3">
                              <select
                                value={saleStatus}
                                onChange={(e) => updateSaleStatus(c.id, cu?.id ?? null, e.target.value, c._isStandaloneUse, c._isPedido)}
                                className={`text-[10px] font-bold tracking-wide px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#002045] w-full ${stMeta.cls}`}
                              >
                                <option value="em_orcamento">Em orçamento</option>
                                <option value="concluido">Concluído</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </td>
                            {/* Emails / Drip — progress dots + countdown */}
                            <td className="px-4 py-3">
                              {/* 7 progress dots */}
                              <div className="flex gap-[3px] mb-1">
                                {Array.from({ length: DRIP_TOTAL_STEPS }, (_, i) => (
                                  <div key={i} className={`w-[9px] h-[9px] rounded-full flex-shrink-0 ${i < c.current_step ? "bg-[#002045]" : "bg-[#e2e2e2]"}`} />
                                ))}
                              </div>
                              {/* Count + status */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-[#002045]">{c.current_step}/{DRIP_TOTAL_STEPS}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 ${c.status === "active" ? "bg-yellow-100 text-yellow-800" : c.status === "completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                                  {c.status === "active" ? "ativo" : c.status === "completed" ? "concluído" : "parado"}
                                </span>
                              </div>
                              {/* Next email countdown */}
                              {c.next_email_at && c.status === "active" && (
                                <p className="text-[9px] text-[#74777f] mt-0.5">{nextEmailLabel(c.next_email_at)}</p>
                              )}
                            </td>
                            {/* Delete */}
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              {c._isPedido ? (
                                <button onClick={() => { setPedidoFocusId(c.id); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold hover:underline mr-3">Ver pedido →</button>
                              ) : cu?.source_pedido_id ? (
                                <button onClick={() => { setPedidoFocusId(cu.source_pedido_id as string); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold hover:underline mr-3">Ver pedido →</button>
                              ) : (
                                <button onClick={() => { setPedidoQuotePrefill(quoteOptionFromRow(c)); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold hover:underline mr-3">Converter em Pedido</button>
                              )}
                              <button
                                onClick={() => deleteClient(c.id, c._isStandaloneUse, c._isPedido)}
                                disabled={deletingClientId === c.id}
                                className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                                title="Excluir cliente"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })),
                      ])}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-3">
                  {orcamentoGroups.flatMap((g) => [
                    <button key={`mh-${g.key}`} onClick={() => toggleGroup(g.key)}
                      className="w-full flex items-center gap-2 bg-[#f5f5f3] border border-[#e2e2e2] px-3 py-2 text-left">
                      <span className="text-[#74777f] text-[10px] w-3">{collapsedGroups[g.key] ? "▶" : "▼"}</span>
                      <span className="text-[11px] tracking-[0.08em] uppercase font-bold text-[#002045]">{g.label}</span>
                      <span className="text-[10px] font-bold text-[#74777f] bg-white border border-[#e2e2e2] px-1.5 py-0.5">{g.rows.length}</span>
                    </button>,
                    ...(collapsedGroups[g.key] ? [] : g.rows.map((c) => {
                    const cu = c.couponUse;
                    const saleStatus = c.sale_status ?? cu?.sale_status ?? "em_orcamento";
                    const stMeta = STATUS_LABELS[saleStatus] ?? STATUS_LABELS.em_orcamento;
                    const age = ageBadge(c.created_at, c.status);
                    const waHref = c.client_phone ? `https://wa.me/55${c.client_phone.replace(/\D/g, "")}` : null;
                    return (
                      <div key={c.id} className="bg-white border border-[#e2e2e2] px-5 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#002045] text-sm font-[var(--font-inter)] truncate">
                              {c.client_name}
                              {c._isPedido ? (
                                <span className="ml-1.5 align-middle text-[8px] bg-[#002045] text-white px-1.5 py-0.5 font-bold tracking-wider rounded-sm">PEDIDO</span>
                              ) : (
                                <span className="ml-1.5 align-middle text-[8px] bg-[#eef2f8] text-[#43474e] px-1.5 py-0.5 font-bold tracking-wider rounded-sm">ORÇAMENTO</span>
                              )}
                            </p>
                            <p className="text-xs text-[#74777f] font-[var(--font-inter)] truncate">{c.client_email}</p>
                            {waHref && (
                              <a href={waHref} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#3b6934] font-bold hover:underline">WA {c.client_phone}</a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <select
                              value={saleStatus}
                              onChange={(e) => updateSaleStatus(c.id, cu?.id ?? null, e.target.value, c._isStandaloneUse, c._isPedido)}
                              className={`text-[10px] font-bold px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${stMeta.cls}`}
                            >
                              <option value="em_orcamento">Em orçamento</option>
                              <option value="concluido">Concluído</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                            <button onClick={() => deleteClient(c.id, c._isStandaloneUse, c._isPedido)} disabled={deletingClientId === c.id} className="text-red-400 hover:text-red-600 disabled:opacity-40">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                            </button>
                          </div>
                        </div>
                        {/* Drip dots */}
                        <div className="flex gap-[3px] mb-2">
                          {Array.from({ length: DRIP_TOTAL_STEPS }, (_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i < c.current_step ? "bg-[#002045]" : "bg-[#e2e2e2]"}`} />
                          ))}
                          <span className="text-[10px] font-bold text-[#002045] ml-1.5">{c.current_step}/{DRIP_TOTAL_STEPS}</span>
                          {c.next_email_at && c.status === "active" && (
                            <span className="text-[9px] text-[#74777f] ml-1">{nextEmailLabel(c.next_email_at)}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-[var(--font-inter)] text-[#43474e]">
                          <span><span className="text-[#74777f]">Espaço:</span> {c.space || "—"}</span>
                          <span><span className="text-[#74777f]">Modelo:</span> {c.model}</span>
                          <span><span className="text-[#74777f]">Total:</span> {c.total != null ? c.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}</span>
                          <span><span className="text-[#74777f]">m²:</span> {c.area_m2 != null ? `${Number(c.area_m2).toFixed(1)} m²` : "—"}</span>
                          <span className="col-span-2"><span className="text-[#74777f]">Parceiro:</span> {cu ? `${c.partner_name} (${cu.coupon_code})` : "Sem cupom"}</span>
                          <span className={`col-span-2 text-[9px] ${age.cls}`}>{new Date(c.created_at).toLocaleDateString("pt-BR")} · {age.label}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
                          {c._isPedido ? (
                            <button onClick={() => { setPedidoFocusId(c.id); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold">Ver pedido →</button>
                          ) : cu?.source_pedido_id ? (
                            <button onClick={() => { setPedidoFocusId(cu.source_pedido_id as string); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold">Ver pedido →</button>
                          ) : (
                            <button onClick={() => { setPedidoQuotePrefill(quoteOptionFromRow(c)); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold">Converter em Pedido</button>
                          )}
                        </div>
                        {(() => {
                          const imgs = ("render_images" in c ? c.render_images : null) ?? [];
                          if (!imgs || imgs.length === 0) return null;
                          return (
                            <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-[#74777f] mb-1.5 font-[var(--font-inter)]">Renders do Visualizador</p>
                              <div className="flex gap-2 flex-wrap">
                                {imgs.slice(0, 6).map((r, i) => (
                                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" title={[r.local, r.productName].filter(Boolean).join(" · ")}>
                                    <img src={r.url} alt={r.productName ?? "Render"} className="w-16 h-16 object-cover border border-[#e2e2e2] hover:border-[#002045] transition-colors" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })),
                  ])}
                </div>
              </>
            )}
          </div>
        )}
        {/* ═══ LEADS / CRM TAB ═══ */}
        {tab === "leads" && authed && (
          <LeadsTab
            onConvertToPedido={(lead) => { setPedidoLeadPrefill(lead); setTab("pedidos"); }}
            onViewPedido={(pedidoId) => { setPedidoFocusId(pedidoId); setTab("pedidos"); }}
            focusLeadId={leadFocusId}
            onFocusConsumed={() => setLeadFocusId(null)}
          />
        )}
        {tab === "pedidos" && authed && (
          <PedidosTab
            leadPrefill={pedidoLeadPrefill}
            onLeadPrefillConsumed={() => setPedidoLeadPrefill(null)}
            onViewLead={(leadId) => { setLeadFocusId(leadId); setTab("leads"); }}
            focusPedidoId={pedidoFocusId}
            onPedidoFocusConsumed={() => setPedidoFocusId(null)}
            quotePrefill={pedidoQuotePrefill}
            onQuotePrefillConsumed={() => setPedidoQuotePrefill(null)}
          />
        )}
        {tab === "estoque" && authed && <EstoqueTab />}
        {tab === "financeiro" && authed && <FinanceiroTab />}

        {/* New modules — placeholders until their redesign phases land, so the
            final navigation structure ships (and is navigable) from day one. */}
        {tab === "custos" && authed && <CustosTab />}
        {tab === "compras" && authed && <ComprasTab />}
        {tab === "relatorios" && authed && <RelatoriosTab />}

        {tab === "lembretes" && authed && <RemindersTab />}

        {/* ═══ VISUALIZAÇÕES TAB ═══ */}
        {tab === "visualizacoes" && authed && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Visualizações geradas</h2>
                <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">
                  Todas as imagens geradas pelo Visualizador Orbital, com dados de contato quando informados.
                </p>
              </div>
              <button
                onClick={fetchVizRenders}
                disabled={vizRendersLoading}
                className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-[11px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:border-[#002045] transition-colors disabled:opacity-50"
              >
                {vizRendersLoading ? "Carregando…" : "Atualizar"}
              </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total de renders", value: vizRenders.length },
                { label: "Com contato", value: vizRenders.filter((r) => r.name || r.phone).length },
                { label: "Sem contato", value: vizRenders.filter((r) => !r.name && !r.phone).length },
              ].map((s) => (
                <div key={s.label} className="border border-[#e2e2e2] rounded-sm p-4 bg-[#fafaf9]">
                  <p className="text-2xl font-bold font-[var(--font-noto-serif)] text-[#002045]">{s.value}</p>
                  <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {vizRendersLoading && (
              <div className="flex items-center gap-3 text-[#74777f] text-sm font-[var(--font-inter)] py-12 justify-center">
                <div className="w-5 h-5 border-2 border-[#e2e2e2] border-t-[#002045] rounded-full animate-spin" />
                Carregando renders…
              </div>
            )}

            {!vizRendersLoading && vizRenders.length === 0 && (
              <p className="text-center text-[#74777f] text-sm font-[var(--font-inter)] py-12">
                Nenhuma visualização encontrada. Certifique-se de ter executado a migração SQL.
              </p>
            )}

            {!vizRendersLoading && vizRenders.length > 0 && (
              <div className="flex flex-col gap-4">
                {vizRenders.map((r) => {
                  const date = new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
                  const waHref = r.phone
                    ? `https://wa.me/55${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${r.name ?? ""}! Vi que você usou o Visualizador Orbital. Posso ajudar com um orçamento?`)}`
                    : null;
                  return (
                    <div key={r.id} className="border border-[#e2e2e2] rounded-sm p-4 bg-white">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        {/* Contact info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[#002045] font-[var(--font-inter)] text-sm">
                              {r.name ?? <span className="text-[#a0a3a9] font-normal italic">Anônimo</span>}
                            </p>
                            {(r.name || r.phone) && (
                              <span className="text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] bg-[#e8f5e4] text-[#3b6934] px-2 py-0.5 rounded-full">Lead</span>
                            )}
                          </div>
                          {r.phone ? (
                            <a
                              href={waHref ?? "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#25d366] text-xs font-[var(--font-inter)] hover:underline mt-0.5"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              {r.phone}
                            </a>
                          ) : (
                            <p className="text-[#a0a3a9] text-xs font-[var(--font-inter)] italic mt-0.5">Sem WhatsApp</p>
                          )}
                          <p className="text-[#a0a3a9] text-[11px] font-[var(--font-inter)] mt-1">{date}</p>
                        </div>

                        {/* Actions */}
                        {waHref && (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#25d366] text-white text-[11px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:brightness-95 transition"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Contatar
                          </a>
                        )}
                      </div>

                      {/* Render thumbnails */}
                      {r.images && r.images.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {r.images.map((img, idx) => (
                            <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" title={img.productName ?? img.local ?? ""} className="group relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.url}
                                alt={img.productName ?? "Render"}
                                className="w-20 h-20 object-cover rounded-sm border border-[#e2e2e2] group-hover:border-[#002045] transition"
                              />
                              {img.productName && (
                                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate rounded-b-sm font-[var(--font-inter)]">
                                  {img.productName}
                                </span>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* ═══ DRIP TAB ═══ */}
        {tab === "drip" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Campanha Drip de E-mail</h2>
              <button
                onClick={seedDripSteps}
                disabled={dripSeeding}
                className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
              >
                {dripSeeding ? "Inicializando..." : "Inicializar Padrões"}
              </button>
            </div>
            <p className="text-[10px] tracking-[0.1em] text-[#74777f] font-[var(--font-inter)] mb-6 bg-white border border-[#e2e2e2] px-4 py-3">
              Variáveis disponíveis:{" "}
              {/* perM2/perDay saíram: expunham preço por m², o que apresentava o PFB como
                   a opção mais cara. quoteLink e productImages entraram no lugar. */}
              {["{{firstName}}", "{{clientName}}", "{{spaceLabel}}", "{{model}}", "{{finish}}", "{{plates}}", "{{area}}", "{{total}}", "{{partnerFirst}}", "{{partnerName}}", "{{waLink}}", "{{quoteCard}}", "{{quoteLink}}", "{{productImages}}"].join(", ")}
            </p>

            {dripLoading ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
            ) : dripSteps.length === 0 ? (
              <div className="bg-white border border-[#e2e2e2] px-6 py-12 text-center">
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum passo configurado.</p>
                <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">Clique em &ldquo;Inicializar Padrões&rdquo; para criar os 9 passos padrão.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dripSteps.map((step) => {
                  const isExpanded = expandedDripStep === step.step_number;
                  const isEditing = editingDripStep === step.step_number;
                  const isPreviewing = dripPreviewStep === step.step_number;
                  return (
                    <div key={step.step_number} className="bg-white border border-[#e2e2e2]">
                      {/* Step header row */}
                      <div className="px-6 py-4 flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <span className="bg-[#002045] text-white text-[10px] font-bold font-[var(--font-inter)] tracking-widest px-2.5 py-1">
                            {step.step_number === 99 ? "99" : step.step_number === 98 ? "98" : `0${step.step_number}`.slice(-2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#002045] text-sm font-[var(--font-inter)]">{step.description}</p>
                          <p className="text-[10px] text-[#74777f] font-[var(--font-inter)] mt-0.5">
                            {dripDelayLabel(step)} · <span className="text-[#43474e]">{step.subject}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingDripStep(isEditing ? null : step.step_number);
                              setDripPreviewStep(null);
                              if (!isEditing) {
                                setDripEditSubject(step.subject);
                                setDripEditDelayDays(step.delay_days != null ? String(step.delay_days) : "");
                                setDripEditBodyHtml(step.body_html);
                                setExpandedDripStep(step.step_number);
                              }
                            }}
                            className="border border-[#e2e2e2] text-[#74777f] text-xs font-bold font-[var(--font-inter)] px-4 py-2 hover:border-[#002045] hover:text-[#002045] transition-colors"
                          >
                            {isEditing ? "Cancelar edição" : "Editar"}
                          </button>
                          <button
                            onClick={() => {
                              setDripPreviewStep(isPreviewing ? null : step.step_number);
                              setEditingDripStep(null);
                              setExpandedDripStep(step.step_number);
                            }}
                            className="border border-[#e2e2e2] text-[#74777f] text-xs font-bold font-[var(--font-inter)] px-4 py-2 hover:border-[#002045] hover:text-[#002045] transition-colors"
                          >
                            {isPreviewing ? "Fechar preview" : "Visualizar"}
                          </button>
                          <button
                            onClick={() => setExpandedDripStep(isExpanded && !isEditing && !isPreviewing ? null : step.step_number)}
                            className="text-[#74777f] hover:text-[#002045] transition-colors p-1"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-[#e2e2e2] px-6 py-5">
                          {isEditing ? (
                            <div className="space-y-4">
                              <div>
                                <label className={labelCls}>Assunto</label>
                                <input
                                  value={dripEditSubject}
                                  onChange={(e) => setDripEditSubject(e.target.value)}
                                  className={inputCls}
                                />
                              </div>
                              {step.step_number !== 98 && step.step_number !== 99 && (
                                <div>
                                  <label className={labelCls}>Delay (dias após o passo anterior)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={dripEditDelayDays}
                                    onChange={(e) => setDripEditDelayDays(e.target.value)}
                                    className={inputCls + " w-32"}
                                  />
                                </div>
                              )}
                              <div>
                                <label className={labelCls}>HTML do corpo do email</label>
                                <textarea
                                  value={dripEditBodyHtml}
                                  onChange={(e) => setDripEditBodyHtml(e.target.value)}
                                  rows={20}
                                  className="w-full border border-[#e2e2e2] px-3 py-2.5 font-mono text-xs text-[#002045] focus:outline-none focus:border-[#002045] resize-y font-[var(--font-inter)]"
                                />
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => saveDripEdit(step.step_number)}
                                  disabled={dripEditSaving}
                                  className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                                >
                                  {dripEditSaving ? "Salvando..." : "Salvar"}
                                </button>
                                <button
                                  onClick={() => { setEditingDripStep(null); setExpandedDripStep(null); }}
                                  className="text-[#74777f] text-xs font-[var(--font-inter)] underline"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : isPreviewing ? (
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-3">
                                Preview com dados de exemplo
                              </p>
                              <div
                                className="border border-[#e2e2e2] bg-[#f5f5f3] overflow-y-auto max-h-[600px]"
                                dangerouslySetInnerHTML={{
                                  __html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0eeeb;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eeeb;padding:40px 16px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:580px;width:100%;"><tr><td style="background:#002045;padding:28px 36px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">ORBITAL</p><p style="margin:6px 0 0;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Revestimentos · Manaus</p></td></tr><tr><td style="padding:40px 36px;">${interpolateSample(step.body_html)}</td></tr><tr><td style="background:#f5f5f3;padding:24px 36px;border-top:1px solid #e2e2e2;"><p style="margin:0;color:#74777f;font-size:11px;line-height:1.7;font-family:Arial,sans-serif;">Orbital Revestimentos · Manaus, Amazonas</p></td></tr></table></td></tr></table></body></html>`,
                                }}
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Assunto</p>
                              <p className="text-sm text-[#43474e] font-[var(--font-inter)] mb-4">{step.subject}</p>
                              <p className="text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-2">HTML (raw)</p>
                              <pre className="text-[10px] font-mono text-[#74777f] bg-[#f5f5f3] p-4 overflow-x-auto max-h-60 border border-[#e2e2e2] whitespace-pre-wrap">{step.body_html}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "commissions" && (
          <div>
            {(() => {
              const totalUnpaidPartner = commissionRows.filter(r => !r.partnerPaidAt && !r.partnerCancelledAt && r.partnerAmount).reduce((a, r) => a + r.partnerAmount, 0);
              const totalUnpaidRep = commissionRows.filter(r => r.repAmount && !r.repPaidAt && !r.repCancelledAt).reduce((a, r) => a + r.repAmount, 0);
              const thisMonth = new Date();
              const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
              const paidThisMonth = commissionRows
                .filter(r => (r.partnerPaidAt && r.partnerPaidAt >= monthStart) || (r.repPaidAt && r.repPaidAt >= monthStart))
                .reduce((a, r) => {
                  let sum = 0;
                  if (r.partnerPaidAt && r.partnerPaidAt >= monthStart) sum += r.partnerAmount;
                  if (r.repPaidAt && r.repPaidAt >= monthStart) sum += r.repAmount;
                  return a + sum;
                }, 0);

              // "A pagar" = tem alguma comissão pendente (não paga E não cancelada).
              const partnerPending = (r: CommissionRow) => !!r.partnerAmount && !r.partnerPaidAt && !r.partnerCancelledAt;
              const repPending = (r: CommissionRow) => !!r.repAmount && !r.repPaidAt && !r.repCancelledAt;
              const pendingRows = commissionRows.filter(r => partnerPending(r) || repPending(r));
              const paidRows = commissionRows.filter(r => !partnerPending(r) && !repPending(r));

              const displayRows = commissionFilter === "a_pagar" ? pendingRows : commissionFilter === "pago" ? paidRows : commissionRows;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                      <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">A pagar — Parceiros</p>
                      <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal">{fmt(totalUnpaidPartner)}</p>
                    </div>
                    <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                      <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">A pagar — Representantes</p>
                      <p className="font-[var(--font-noto-serif)] text-[#1a365d] text-2xl font-normal">{fmt(totalUnpaidRep)}</p>
                    </div>
                    <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                      <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Pago este mês</p>
                      <p className="font-[var(--font-noto-serif)] text-green-700 text-2xl font-normal">{fmt(paidThisMonth)}</p>
                    </div>
                  </div>

                  {/* Filter */}
                  <div className="flex gap-2 mb-4">
                    {([["a_pagar","A pagar"],["pago","Pago"],["tudo","Tudo"]] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setCommissionFilter(val)}
                        className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 border transition-colors ${commissionFilter === val ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Table — desktop */}
                  <div className="hidden md:block bg-white border border-[#e2e2e2]">
                    <table className="w-full text-sm font-[var(--font-inter)]">
                      <thead>
                        <tr className="border-b border-[#e2e2e2]">
                          {["Data","Origem","Rep.","Produto","Com. Parceiro","Status Parceiro","Com. Rep.","Status Rep.",""].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.length === 0 ? (
                          <tr><td colSpan={9} className="px-5 py-8 text-center text-[#74777f]">Nenhuma comissão encontrada.</td></tr>
                        ) : displayRows.map(r => (
                          <tr key={`${r.source}:${r.id}`} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                            <td className="px-4 py-3 text-xs text-[#43474e] whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                            <td className="px-4 py-3">
                              {r.source === "pedido" ? (
                                <span className="bg-[#002045] text-white px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-sm">PEDIDO</span>
                              ) : (
                                <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{r.couponCode}</span>
                              )}
                              {r.source === "pedido" && r.clientName && <p className="text-[10px] text-[#74777f] mt-0.5">{r.clientName}</p>}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#74777f]">{r.repName}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{r.productName || "—"}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-[#002045]">{r.partnerAmount ? fmt(r.partnerAmount) : "—"}</td>
                            <td className="px-4 py-3">
                              {r.partnerCancelledAt ? (
                                <span className="inline-block bg-gray-200 text-gray-600 px-2 py-0.5 text-[10px] font-bold tracking-wide" title={r.partnerCancelReason ? `Motivo: ${r.partnerCancelReason}` : undefined}>
                                  Cancelada {new Date(r.partnerCancelledAt).toLocaleDateString("pt-BR")}
                                </span>
                              ) : r.partnerPaidAt ? (
                                <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                                  ✓ Pago {new Date(r.partnerPaidAt).toLocaleDateString("pt-BR")}
                                </span>
                              ) : r.partnerAmount ? (
                                <button onClick={() => r.source === "coupon" ? markCommissionPaid(r.id, "partner") : markPedidoCommissionPaid(r.id, "partner")}
                                  className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold tracking-wide hover:bg-yellow-200 transition-colors cursor-pointer">
                                  A pagar — Marcar pago
                                </button>
                              ) : <span className="text-[#ccc]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-[#1a365d]">{r.repAmount ? fmt(r.repAmount) : "—"}</td>
                            <td className="px-4 py-3">
                              {!r.repAmount ? <span className="text-[#ccc]">—</span> :
                               r.repCancelledAt ? (
                                <span className="inline-block bg-gray-200 text-gray-600 px-2 py-0.5 text-[10px] font-bold tracking-wide" title={r.repCancelReason ? `Motivo: ${r.repCancelReason}` : undefined}>
                                  Cancelada {new Date(r.repCancelledAt).toLocaleDateString("pt-BR")}
                                </span>
                              ) : r.repPaidAt ? (
                                <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                                  ✓ Pago {new Date(r.repPaidAt).toLocaleDateString("pt-BR")}
                                </span>
                              ) : (
                                <button onClick={() => r.source === "coupon" ? markCommissionPaid(r.id, "rep") : markPedidoCommissionPaid(r.id, "rep")}
                                  className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold tracking-wide hover:bg-yellow-200 transition-colors cursor-pointer">
                                  A pagar — Marcar pago
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {((!!r.partnerAmount && !r.partnerPaidAt && !r.partnerCancelledAt) || (!!r.repAmount && !r.repPaidAt && !r.repCancelledAt)) && (
                                <button onClick={() => openCancelCommission(r)} className="text-[10px] text-[#cc0000] font-bold hover:underline mr-3">Cancelar comissão</button>
                              )}
                              {r.source === "pedido" && (
                                <button onClick={() => { setPedidoFocusId(r.id); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold hover:underline">Ver pedido →</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Table — mobile cards */}
                  <div className="md:hidden space-y-2">
                    {displayRows.length === 0 ? (
                      <div className="bg-white border border-[#e2e2e2] px-4 py-6 text-center text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma comissão encontrada.</div>
                    ) : displayRows.map(r => (
                      <div key={`${r.source}:${r.id}`} className="bg-white border border-[#e2e2e2] p-4">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="min-w-0">
                            {r.source === "pedido" ? (
                              <span className="bg-[#002045] text-white px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-sm">PEDIDO</span>
                            ) : (
                              <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{r.couponCode}</span>
                            )}
                            {r.clientName && <p className="text-xs text-[#002045] font-semibold mt-1 truncate">{r.clientName}</p>}
                            <p className="text-[11px] text-[#74777f] truncate">{[r.repName, r.productName].filter((x) => x && x !== "—").join(" · ") || "—"}</p>
                          </div>
                          <span className="text-[10px] text-[#74777f] whitespace-nowrap flex-shrink-0">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="space-y-2 pt-2.5 border-t border-[#f0f0f0]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#74777f]">Parceiro: <b className="text-[#002045]">{r.partnerAmount ? fmt(r.partnerAmount) : "—"}</b></span>
                            {r.partnerPaidAt ? (
                              <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">✓ Pago {new Date(r.partnerPaidAt).toLocaleDateString("pt-BR")}</span>
                            ) : r.partnerAmount ? (
                              <button onClick={() => r.source === "coupon" ? markCommissionPaid(r.id, "partner") : markPedidoCommissionPaid(r.id, "partner")} className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold tracking-wide hover:bg-yellow-200 transition-colors">Marcar pago</button>
                            ) : <span className="text-[#ccc] text-xs">—</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[#74777f]">Rep.: <b className="text-[#1a365d]">{r.repAmount ? fmt(r.repAmount) : "—"}</b></span>
                            {!r.repAmount ? <span className="text-[#ccc] text-xs">—</span> :
                              r.repPaidAt ? (
                                <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">✓ Pago {new Date(r.repPaidAt).toLocaleDateString("pt-BR")}</span>
                              ) : (
                                <button onClick={() => r.source === "coupon" ? markCommissionPaid(r.id, "rep") : markPedidoCommissionPaid(r.id, "rep")} className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold tracking-wide hover:bg-yellow-200 transition-colors">Marcar pago</button>
                              )}
                          </div>
                        </div>
                        {r.source === "pedido" && (
                          <div className="flex justify-end pt-2.5 mt-2.5 border-t border-[#f0f0f0]">
                            <button onClick={() => { setPedidoFocusId(r.id); setTab("pedidos"); }} className="text-[10px] text-[#3b6934] font-bold hover:underline">Ver pedido →</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ═══ PRODUTOS TAB ═══ */}
        {tab === "produtos" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal">Produtos</h2>
              <button
                onClick={() => {
                  setEditingProductId(null);
                  setProductForm({ code:"", name:"", linha:"Classic", finish:"Fosco", price:559, price_per_m2:161, description:"", image_path:"", is_active:true, show_in_catalog:true, sort_order:0, render_finish_description:"", render_panel_width_m:1.2, render_panel_height_m:2.9, render_context_image_path:"", render_texture_path:"", render_extra_notes:"" });
                  setProductFormError("");
                  setGalleryImages([]);
                  setShowProductForm(true);
                  setTimeout(() => productTabFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                }}
                className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
              >
                + Novo Produto
              </button>
            </div>

            {showProductForm && (
              <div ref={productTabFormRef} className="bg-white border border-[#e2e2e2] p-6 mb-8">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.15em] uppercase font-bold text-[#002045] mb-6">
                  {editingProductId ? "Editar Produto" : "Novo Produto"}
                </h3>
                <form onSubmit={handleProductSubmit}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className={labelCls}>Código *</label>
                      <input required type="text" value={productForm.code} onChange={(e) => setProductForm({...productForm, code: e.target.value})} className={inputCls} placeholder="ORB-001" />
                    </div>
                    <div>
                      <label className={labelCls}>Nome *</label>
                      <input required type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className={inputCls} placeholder="Bege Travertino" />
                    </div>
                    <div>
                      <label className={labelCls}>Linha</label>
                      <select value={productForm.linha} onChange={(e) => {
                        const linha = e.target.value as "Classic"|"Brilliance"|"Elegance";
                        const finish = linha === "Classic" ? "Fosco" : linha === "Brilliance" ? "Polido" : "Texturizado";
                        const price = linha === "Classic" ? 559 : linha === "Brilliance" ? 589 : 649;
                        setProductForm({...productForm, linha, finish, price, price_per_m2: Math.round(price/3.48)});
                      }} className={inputCls}>
                        <option value="Classic">Classic</option>
                        <option value="Brilliance">Brilliance</option>
                        <option value="Elegance">Elegance</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Acabamento</label>
                      <input type="text" value={productForm.finish} onChange={(e) => setProductForm({...productForm, finish: e.target.value})} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Preço (R$)</label>
                      <input type="number" min="0" value={productForm.price} onChange={(e) => {
                        const price = parseInt(e.target.value) || 0;
                        setProductForm({...productForm, price, price_per_m2: Math.round(price/3.48)});
                      }} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Preço/m² <span className="font-normal text-[#b0b0b0]">(auto)</span></label>
                      <input type="number" min="0" value={productForm.price_per_m2} onChange={(e) => setProductForm({...productForm, price_per_m2: parseInt(e.target.value) || 0})} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Sort Order</label>
                      <input type="number" min="0" value={productForm.sort_order} onChange={(e) => setProductForm({...productForm, sort_order: parseInt(e.target.value) || 0})} className={inputCls} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls} style={{marginBottom:0}}>Descrição</label>
                      <button
                        disabled={aiTextGenerating === "productDesc"}
                        onClick={() => generateAiText(
                          "productDesc",
                          "Você é um redator de catálogo de revestimentos premium para a Orbital Revestimentos, empresa especializada em PFB (painel de fibra de bambu) em Manaus.",
                          `Escreva uma descrição de produto elegante e técnica (máximo 2 frases, 150 caracteres) para o produto "${productForm.name || "PFB Orbital"}" (código ${productForm.code || "N/A"}). Destaque o acabamento visual e a durabilidade. Responda SOMENTE com a descrição, sem aspas.`,
                          (text) => setProductForm(f => ({ ...f, description: text }))
                        )}
                        className="flex items-center gap-1 text-[8px] tracking-wide uppercase font-bold font-[var(--font-inter)] text-[#002045] border border-[#002045] px-2 py-0.5 hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-40"
                      >
                        {aiTextGenerating === "productDesc" ? (
                          <svg className="animate-spin" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        ) : (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                        )}
                        {aiTextGenerating === "productDesc" ? "Gerando…" : "IA"}
                      </button>
                    </div>
                    <textarea rows={3} value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} className={inputCls + " resize-none"} />
                  </div>
                  <div className="mb-4">
                    <label className={labelCls}>Imagem</label>
                    {productForm.image_path ? (
                      /* Card view — matches Mídia tab style */
                      <div className="border border-[#e2e2e2] overflow-hidden">
                        {/* Preview */}
                        <div className="relative bg-[#f0f0f0] overflow-hidden" style={{ maxHeight: "220px", aspectRatio: "4/3" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={productForm.image_path}
                            alt="preview"
                            className="absolute inset-0 w-full h-full object-cover object-top"
                            onLoad={(e) => {
                              const img = e.currentTarget;
                              if (img.naturalWidth > 0) {
                                setProductImageDims(prev => ({
                                  ...prev,
                                  [productForm.image_path]: { w: img.naturalWidth, h: img.naturalHeight }
                                }));
                              }
                            }}
                          />
                          <div className={`absolute top-2 right-2 text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-2 py-1 ${productForm.image_path.startsWith("https://") ? "bg-[#3b6934] text-white" : "bg-white/90 text-[#74777f]"}`}>
                            {productForm.image_path.startsWith("https://") ? "Substituída" : "Original"}
                          </div>
                        </div>
                        {/* Info + actions */}
                        <div className="px-4 py-3 flex flex-col gap-3">
                          {/* Dimensions */}
                          {productImageDims[productForm.image_path] && (
                            <div className="bg-[#f9f9f9] border border-[#e2e2e2] px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[#74777f] text-[10px] font-[var(--font-inter)]">Dimensões nativas</span>
                                <span className="text-[#002045] text-[10px] font-bold font-[var(--font-inter)]">
                                  {productImageDims[productForm.image_path].w} × {productImageDims[productForm.image_path].h} px
                                </span>
                              </div>
                            </div>
                          )}
                          {/* Path edit */}
                          <input
                            type="text"
                            value={productForm.image_path}
                            onChange={(e) => setProductForm({...productForm, image_path: e.target.value})}
                            className={inputCls + " text-xs"}
                            placeholder="/images/catalogue/..."
                          />
                          {/* Action buttons */}
                          <div className="flex gap-2">
                            <a
                              href={productForm.image_path}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white transition-colors"
                            >
                              Download
                            </a>
                            <label className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 bg-[#002045] text-white hover:bg-[#1a365d] transition-colors cursor-pointer">
                              {productImageUploading ? "Enviando…" : "Substituir"}
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = await uploadImage(file, "products");
                                if (url) setProductForm((prev) => ({...prev, image_path: url}));
                                e.target.value = "";
                              }} />
                            </label>
                            <button
                              type="button"
                              onClick={() => setProductForm(prev => ({...prev, image_path: ""}))}
                              className="px-3 py-2 border border-red-300 text-red-600 text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] hover:bg-red-50 transition-colors"
                              title="Remover imagem"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty state — text input + upload */
                      <div className="flex gap-3 items-start">
                        <input type="text" value={productForm.image_path} onChange={(e) => setProductForm({...productForm, image_path: e.target.value})} className={inputCls} placeholder="/images/catalogue/..." />
                        <label className="flex-shrink-0 cursor-pointer bg-[#f0f0f0] border border-[#e2e2e2] px-4 py-2.5 text-xs font-bold font-[var(--font-inter)] text-[#002045] hover:bg-[#e8e8e8] transition-colors whitespace-nowrap">
                          {productImageUploading ? "Enviando..." : "Upload"}
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadImage(file, "products");
                            if (url) setProductForm((prev) => ({...prev, image_path: url}));
                          }} />
                        </label>
                      </div>
                    )}
                  </div>
                  {/* QR Code do modelo — só faz sentido para produto já salvo,
                      porque o código permanente é o que o QR carrega. */}
                  {editingProductId && productForm.code.trim() && (
                    <div className="mb-6 border border-[#e2e2e2] p-4">
                      <p className="font-[var(--font-inter)] text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-1">
                        QR Code do modelo
                      </p>
                      <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mb-3">
                        Aponta para o código <strong>{productForm.code.toUpperCase()}</strong>, não para o nome — renomear o
                        modelo, mudar o preço ou trocar as fotos não invalida código já impresso.
                      </p>

                      {productForm.is_active === false ? (
                        <p className="text-amber-800 text-[12px] font-[var(--font-inter)] bg-amber-50 border border-amber-200 px-3 py-2">
                          Modelo inativo — o QR Code não é gerado enquanto ele estiver fora do catálogo,
                          para não circular um código que abre uma página vazia.
                        </p>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={productQrUrl(productForm.code, "svg", 512)}
                            alt={`QR Code de ${productForm.code}`}
                            className="w-36 h-36 border border-[#e2e2e2] bg-white shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                readOnly
                                value={productUrl(productForm.code)}
                                onFocus={(e) => e.currentTarget.select()}
                                className="flex-1 min-w-0 border border-[#e2e2e2] px-2 py-1.5 text-[12px] font-[var(--font-inter)] text-[#43474e] bg-[#fafafa] focus:outline-none focus:border-[#002045]"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(productUrl(productForm.code));
                                    setQrCopied(true);
                                    setTimeout(() => setQrCopied(false), 2000);
                                  } catch { /* o campo fica selecionável para copiar à mão */ }
                                }}
                                className="border border-[#002045] text-[#002045] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:bg-[#002045] hover:text-white transition-colors whitespace-nowrap"
                              >
                                {qrCopied ? "Copiado" : "Copiar link"}
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`${productQrUrl(productForm.code, "png", 2048)}&download=1`}
                                download={`qr-${productForm.code.toLowerCase()}.png`}
                                className="border border-[#e2e2e2] text-[#43474e] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:border-[#002045] hover:text-[#002045] transition-colors"
                              >
                                Baixar PNG (2048px)
                              </a>
                              <a
                                href={productQrUrl(productForm.code, "svg")}
                                download={`qr-${productForm.code.toLowerCase()}.svg`}
                                className="border border-[#e2e2e2] text-[#43474e] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:border-[#002045] hover:text-[#002045] transition-colors"
                              >
                                Baixar SVG (impressão)
                              </a>
                              <button
                                type="button"
                                onClick={() => printProductQr(productForm.code, productForm.name)}
                                className="border border-[#e2e2e2] text-[#43474e] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:border-[#002045] hover:text-[#002045] transition-colors"
                              >
                                Imprimir etiqueta
                              </button>
                            </div>

                            <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)]">
                              SVG para gráfica (escala sem perder nitidez); PNG para uso rápido em
                              catálogo e etiqueta. Correção de erro em nível Q — o código ainda lê com
                              parte da superfície suja ou riscada.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gallery — only available when editing an existing product */}
                  {editingProductId && (
                    <div className="mb-6 border border-[#e2e2e2] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="font-[var(--font-inter)] text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">
                          Galeria de Imagens
                          <span className="ml-2 font-normal text-[#b0b0b0] normal-case tracking-normal">
                            ({galleryImages.length} foto{galleryImages.length !== 1 ? "s" : ""})
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                        {/* Baixar tudo — o pacote sai com a capa primeiro e a
                            galeria na ordem do painel, para não haver retrabalho
                            de renomear foto a foto. */}
                        <button
                          type="button"
                          onClick={downloadAllProductImages}
                          disabled={galleryZipping}
                          className="border border-[#002045] text-[#002045] text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#002045] hover:text-white transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                          title="Baixar todas as fotos deste modelo em um .zip"
                        >
                          {galleryZipping ? (
                            <>
                              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                              Compactando…
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
                              Baixar todas
                            </>
                          )}
                        </button>
                        <label className="cursor-pointer bg-[#002045] text-white text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] transition-colors whitespace-nowrap flex items-center gap-1.5">
                          {galleryUploading ? (
                            <>
                              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                              {galleryUploadProgress ? `${galleryUploadProgress.done}/${galleryUploadProgress.total}` : "Enviando..."}
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                              + Fotos
                            </>
                          )}
                          <input type="file" accept="image/*" multiple className="hidden" disabled={galleryUploading} onChange={async (e) => {
                            if (e.target.files && e.target.files.length > 0) await addGalleryImages(e.target.files);
                            e.target.value = "";
                          }} />
                        </label>
                        </div>
                      </div>
                      {galleryZipError && (
                        <p className="text-red-700 text-[11px] font-[var(--font-inter)] mb-2">{galleryZipError}</p>
                      )}
                      {galleryImages.length === 0 ? (
                        <p className="text-[#b0b0b0] text-xs font-[var(--font-inter)] text-center py-4">
                          Nenhuma imagem adicional. Adicione fotos de ambientes, detalhes e texturas.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          {[...galleryImages].sort((a, b) => a.sort_order - b.sort_order).map((img, idx, sorted) => (
                            <div
                              key={img.id}
                              draggable
                              onDragStart={() => setDragGalleryId(img.id)}
                              onDragEnd={() => { setDragGalleryId(null); setDragOverGalleryId(null); }}
                              onDragOver={(e) => { e.preventDefault(); if (dragOverGalleryId !== img.id) setDragOverGalleryId(img.id); }}
                              onDrop={(e) => { e.preventDefault(); if (dragGalleryId && dragGalleryId !== img.id) reorderGalleryImages(dragGalleryId, img.id); setDragGalleryId(null); setDragOverGalleryId(null); }}
                              className={`relative group aspect-square bg-[#f0f0f0] overflow-hidden cursor-grab active:cursor-grabbing transition-all ${dragGalleryId === img.id ? "opacity-30" : "opacity-100"} ${dragOverGalleryId === img.id && dragGalleryId !== img.id ? "ring-2 ring-[#002045] ring-offset-1" : ""}`}
                            >
                              <img src={img.image_path} alt="" draggable={false} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                {/* Reorder row */}
                                <div className="flex gap-1 w-[80%]">
                                  <button
                                    type="button"
                                    onClick={() => moveGalleryImage(img.id, "left")}
                                    disabled={idx === 0}
                                    title="Mover para esquerda"
                                    className="flex-1 bg-white/90 text-[#002045] text-[10px] font-bold px-1 py-1 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                  >
                                    ←
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveGalleryImage(img.id, "right")}
                                    disabled={idx === sorted.length - 1}
                                    title="Mover para direita"
                                    className="flex-1 bg-white/90 text-[#002045] text-[10px] font-bold px-1 py-1 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                  >
                                    →
                                  </button>
                                </div>
                                <a
                                  href={img.image_path}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download"
                                  className="bg-[#1a365d] text-white text-[9px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-1 hover:bg-[#002045] transition-colors w-[80%] text-center"
                                >
                                  ↓ Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setImageAsCover(img.image_path)}
                                  title="Usar como capa"
                                  className="bg-white text-[#002045] text-[9px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-1 hover:bg-[#eef2f8] transition-colors w-[80%] text-center"
                                >
                                  Capa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteGalleryImage(img.id)}
                                  title="Remover"
                                  className="bg-red-600 text-white text-[9px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-1 hover:bg-red-700 transition-colors w-[80%] text-center"
                                >
                                  Remover
                                </button>
                              </div>
                              {productForm.image_path === img.image_path && (
                                <div className="absolute top-1 left-1 bg-[#002045] text-white text-[8px] font-bold tracking-wider px-1 py-0.5">CAPA</div>
                              )}
                              <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] font-bold px-1">{idx + 1}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-2">
                        Arraste as fotos para reordenar (ou use ← → ao passar o mouse), definir como capa ou remover. O número indica a posição na galeria.
                      </p>
                    </div>
                  )}

                  {/* ── Visualizador / Render — per-model prompt fields ── */}
                  <div className="mb-6 border border-[#e2e2e2] p-4">
                    <label className="font-[var(--font-inter)] text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] block mb-1">
                      Visualizador / Render
                    </label>
                    <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mb-4">
                      Prompt fixo deste modelo no Visualizador. Em branco, o sistema usa o texto genérico da linha ({productForm.linha === "Brilliance" ? "mármore polido" : productForm.linha === "Elegance" ? "madeira" : "mármore fosco"}).
                    </p>
                    <div className="mb-4">
                      <label className={labelCls}>Descrição do acabamento para o render</label>
                      <textarea
                        rows={3}
                        value={productForm.render_finish_description}
                        onChange={(e) => setProductForm({...productForm, render_finish_description: e.target.value})}
                        className={inputCls + " resize-none"}
                        placeholder='Ex.: "polished Carrara marble, cool white background with soft grey veining, glossy reflective sheen"'
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className={labelCls}>Largura da placa (m)</label>
                        <input type="number" min="0" step="0.01" value={productForm.render_panel_width_m} onChange={(e) => setProductForm({...productForm, render_panel_width_m: parseFloat(e.target.value) || 0})} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Altura da placa (m)</label>
                        <input type="number" min="0" step="0.01" value={productForm.render_panel_height_m} onChange={(e) => setProductForm({...productForm, render_panel_height_m: parseFloat(e.target.value) || 0})} className={inputCls} />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Imagem de contexto (opcional)</label>
                      <div className="flex gap-3 items-start">
                        <input type="text" value={productForm.render_context_image_path} onChange={(e) => setProductForm({...productForm, render_context_image_path: e.target.value})} className={inputCls} placeholder="Foto do painel aplicado em um ambiente real" />
                        <label className="flex-shrink-0 cursor-pointer bg-[#f0f0f0] border border-[#e2e2e2] px-4 py-2.5 text-xs font-bold font-[var(--font-inter)] text-[#002045] hover:bg-[#e8e8e8] transition-colors whitespace-nowrap">
                          {productImageUploading ? "Enviando..." : "Upload"}
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadImage(file, "products");
                            if (url) setProductForm((prev) => ({...prev, render_context_image_path: url}));
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                      {productForm.render_context_image_path && (
                        <div className="mt-2 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={productForm.render_context_image_path} alt="contexto" className="h-16 w-16 object-cover border border-[#e2e2e2]" />
                          <button type="button" onClick={() => setProductForm(prev => ({...prev, render_context_image_path: ""}))} className="px-3 py-1.5 border border-red-300 text-red-600 text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] hover:bg-red-50 transition-colors">
                            Remover
                          </button>
                        </div>
                      )}
                      <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-1">
                        Se preenchida, é enviada como terceira referência para a IA ver o acabamento aplicado em contexto.
                      </p>
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Textura plana do painel (projeção exata)</label>
                      <div className="flex gap-3 items-start">
                        <input type="text" value={productForm.render_texture_path} onChange={(e) => setProductForm({...productForm, render_texture_path: e.target.value})} className={inputCls} placeholder="Imagem frontal e plana da placa (sem ângulo, sem brilho, sem ambiente)" />
                        <label className="flex-shrink-0 cursor-pointer bg-[#f0f0f0] border border-[#e2e2e2] px-4 py-2.5 text-xs font-bold font-[var(--font-inter)] text-[#002045] hover:bg-[#e8e8e8] transition-colors whitespace-nowrap">
                          {productImageUploading ? "Enviando..." : "Upload"}
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadImage(file, "products");
                            if (url) setProductForm((prev) => ({...prev, render_texture_path: url}));
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                      {productForm.render_texture_path && (
                        <div className="mt-2 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={productForm.render_texture_path} alt="textura" className="h-16 w-16 object-cover border border-[#e2e2e2]" />
                          <a href={productForm.render_texture_path} target="_blank" rel="noopener noreferrer" download
                            className="px-3 py-1.5 border border-[#e2e2e2] text-[#002045] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#f0f0f0] transition-colors">
                            Baixar
                          </a>
                          <button type="button" onClick={() => setProductForm(prev => ({...prev, render_texture_path: ""}))} className="px-3 py-1.5 border border-red-300 text-red-600 text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] hover:bg-red-50 transition-colors">
                            Remover
                          </button>
                        </div>
                      )}
                      <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-1">
                        Imagem retificada e sem brilho da placa, usada pela projeção exata (pixel-perfeita) do Visualizador. Diferente da foto de catálogo (em ângulo).
                      </p>
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Notas extras (opcional)</label>
                      <textarea
                        rows={2}
                        value={productForm.render_extra_notes}
                        onChange={(e) => setProductForm({...productForm, render_extra_notes: e.target.value})}
                        className={inputCls + " resize-none"}
                        placeholder='Ex.: "this finish has directional grain — keep it vertical"'
                      />
                    </div>

                    {/* Live preview of the exact prompt the AI receives */}
                    <details className="group">
                      <summary className="cursor-pointer select-none text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#002045] hover:text-[#3b6934] transition-colors">
                        Ver prompt final enviado à IA
                        <span className="ml-2 text-[#b0b0b0] normal-case tracking-normal font-normal">
                          ({productForm.render_finish_description.trim() ? "personalizado deste modelo" : "genérico da linha " + productForm.linha})
                        </span>
                      </summary>
                      <pre className="mt-2 bg-[#f7f7f5] border border-[#e2e2e2] p-3 text-[11px] leading-relaxed text-[#43474e] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
{composePrompt({
  finishText:
    productForm.render_finish_description.trim() ||
    finishDescription(
      productForm.linha === "Brilliance" ? "polished" : productForm.linha === "Elegance" ? "wood" : "matte"
    ),
  panelWidthM: productForm.render_panel_width_m > 0 ? productForm.render_panel_width_m : DEFAULT_PANEL_WIDTH_M,
  panelHeightM: productForm.render_panel_height_m > 0 ? productForm.render_panel_height_m : DEFAULT_PANEL_HEIGHT_M,
  extraNotes: productForm.render_finish_description.trim() ? productForm.render_extra_notes : null,
  hasContextImage: !!(productForm.render_finish_description.trim() && productForm.render_context_image_path.trim()),
})}
                      </pre>
                      <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-1">
                        Atualiza em tempo real conforme você edita os campos acima. A foto da parede do cliente entra como primeira imagem e a foto do produto como segunda.
                      </p>
                    </details>
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <input type="checkbox" id="prod-active" checked={productForm.is_active} onChange={(e) => setProductForm({...productForm, is_active: e.target.checked})} className="w-4 h-4" />
                    <label htmlFor="prod-active" className="text-sm font-[var(--font-inter)] text-[#43474e]">Produto ativo <span className="text-[#74777f] text-xs">(entra nos cálculos e no orçamento)</span></label>
                  </div>
                  <div className="mb-6 flex items-center gap-2">
                    <input type="checkbox" id="prod-catalog" checked={productForm.show_in_catalog} onChange={(e) => setProductForm({...productForm, show_in_catalog: e.target.checked})} className="w-4 h-4" />
                    <label htmlFor="prod-catalog" className="text-sm font-[var(--font-inter)] text-[#43474e]">Exibir no catálogo público <span className="text-[#74777f] text-xs">(desmarque para itens de suporte, ex. Cola PU)</span></label>
                  </div>
                  {productFormError && <p className="text-red-600 text-xs font-[var(--font-inter)] mb-3">{productFormError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={productFormLoading} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
                      {productFormLoading ? "Salvando..." : "Salvar"}
                    </button>
                    <button type="button" onClick={() => { setShowProductForm(false); setEditingProductId(null); setGalleryImages([]); }} className="border border-[#e2e2e2] text-[#74777f] text-xs font-[var(--font-inter)] px-6 py-2.5 hover:border-[#002045] hover:text-[#002045] transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingDbProducts ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] py-8 text-center">Carregando...</p>
            ) : (
              <>
              <div className="hidden md:block bg-white border border-[#e2e2e2]">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Imagem","Código","Nome","Linha","Preço","Status","Ações"].map(h => (
                        <th key={h} className={`text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap${h === "Imagem" ? " w-20" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dbProducts.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-[#74777f]">Nenhum produto cadastrado. Clique em &ldquo;+ Novo Produto&rdquo; para adicionar.</td></tr>
                    ) : dbProducts.map((p) => (
                      <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        {/* Image thumbnail with download + substitute */}
                        <td className="px-3 py-2 w-20">
                          <div className="relative group w-16 h-16 bg-[#f0f0f0] overflow-hidden flex-shrink-0">
                            {p.image_path ? (
                              <>
                                {/* Hidden img to capture natural dimensions */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.image_path}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                  onLoad={(e) => {
                                    const img = e.currentTarget;
                                    if (img.naturalWidth > 0) {
                                      setProductImageDims(prev => ({
                                        ...prev,
                                        [p.image_path]: { w: img.naturalWidth, h: img.naturalHeight }
                                      }));
                                    }
                                  }}
                                />
                                {/* Substituted badge */}
                                {p.image_path.startsWith("https://") && (
                                  <div className="absolute top-0.5 left-0.5 bg-[#3b6934] text-white text-[7px] font-bold tracking-wide px-1 py-0.5 leading-none">SUBST.</div>
                                )}
                                {/* Hover overlay: download + substitute */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                  <a
                                    href={p.image_path}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Download"
                                    className="bg-white text-[#002045] text-[8px] font-bold tracking-wide px-2 py-1 hover:bg-[#eef2f8] transition-colors leading-none whitespace-nowrap"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    ↓ DL
                                  </a>
                                  <label
                                    title="Substituir imagem"
                                    className={`bg-[#002045] text-white text-[8px] font-bold tracking-wide px-2 py-1 hover:bg-[#1a365d] transition-colors leading-none whitespace-nowrap cursor-pointer ${productImageSubstituting === p.id ? "opacity-50 pointer-events-none" : ""}`}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {productImageSubstituting === p.id ? "…" : "↑ SUB"}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={productImageSubstituting === p.id}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        await substituteProductCoverImage(p, file);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-[#c0c0c0] text-[9px] font-[var(--font-inter)] text-center leading-tight px-1">sem imagem</span>
                              </div>
                            )}
                          </div>
                          {/* Dimensions below thumbnail */}
                          {p.image_path && productImageDims[p.image_path] && (
                            <p className="text-[9px] text-[#b0b0b0] font-[var(--font-inter)] mt-0.5 text-center leading-none">
                              {productImageDims[p.image_path].w}×{productImageDims[p.image_path].h}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{p.code}</span></td>
                        <td className="px-4 py-3 text-[#002045] font-medium">
                          {p.name}
                          {(p.product_images?.length ?? 0) > 0 && (
                            <span className="ml-2 bg-[#eef2f8] text-[#002045] text-[9px] font-bold tracking-wider px-1.5 py-0.5 align-middle">
                              {p.product_images!.length} foto{p.product_images!.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide ${p.linha === "Classic" ? "bg-blue-100 text-blue-800" : p.linha === "Brilliance" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}`}>
                            {p.linha}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#43474e]">R$ {p.price.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide ${p.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                            {p.is_active ? "Ativo" : "Inativo"}
                          </span>
                          {p.show_in_catalog === false && (
                            <span className="inline-block ml-1 px-2 py-0.5 text-[10px] font-bold tracking-wide bg-amber-100 text-amber-800" title="Ativo para orçamento, oculto do catálogo público">Oculto</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => startEditProduct(p)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#002045] text-[#002045] hover:bg-[#002045] hover:text-white transition-colors">Editar</button>
                            <button onClick={() => deleteProduct(p.id, p.name)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {dbProducts.length === 0 ? (
                  <div className="bg-white border border-[#e2e2e2] px-4 py-6 text-center text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum produto cadastrado. Toque em &ldquo;+ Novo Produto&rdquo; para adicionar.</div>
                ) : dbProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-[#e2e2e2] p-3 flex gap-3">
                    <div className="w-16 h-16 bg-[#f0f0f0] overflow-hidden flex-shrink-0">
                      {p.image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_path} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><span className="text-[#c0c0c0] text-[9px] font-[var(--font-inter)] text-center leading-tight px-1">sem imagem</span></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[#002045] font-medium text-sm min-w-0 truncate">{p.name}</p>
                        <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-[10px] font-bold tracking-wider flex-shrink-0">{p.code}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide ${p.linha === "Classic" ? "bg-blue-100 text-blue-800" : p.linha === "Brilliance" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}`}>{p.linha}</span>
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide ${p.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>{p.is_active ? "Ativo" : "Inativo"}</span>
                        {p.show_in_catalog === false && <span className="inline-block ml-1 px-2 py-0.5 text-[10px] font-bold tracking-wide bg-amber-100 text-amber-800">Oculto</span>}
                        {(p.product_images?.length ?? 0) > 0 && <span className="bg-[#eef2f8] text-[#002045] text-[9px] font-bold tracking-wider px-1.5 py-0.5">{p.product_images!.length} foto{p.product_images!.length !== 1 ? "s" : ""}</span>}
                      </div>
                      <p className="text-[#43474e] text-sm mt-1.5">R$ {p.price.toLocaleString("pt-BR")}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => startEditProduct(p)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#002045] text-[#002045] hover:bg-[#002045] hover:text-white transition-colors">Editar</button>
                        <button onClick={() => deleteProduct(p.id, p.name)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        )}

        {/* ═══ PROJETOS TAB ═══ */}
        {tab === "projetos" && (
          <div>
            {/* O gerenciamento de categorias saiu daqui: misturar "organizar a
                navegação do site" com "cadastrar um projeto" era a causa dos
                campos duplicados. Agora vive em /admin/projetos/organizacao. */}
            <div className="bg-white border border-[#e2e2e2] px-4 sm:px-5 py-4 mb-8 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-[var(--font-inter)] text-sm font-bold text-[#002045]">Módulo de Projetos</p>
                <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5">
                  A lista com filtros, os rascunhos e o gerenciamento de categorias e showrooms
                  moram em telas próprias. Esta aba fica com o cadastro até o editor novo entrar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin/projetos/organizacao" className="border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#002045] hover:text-white transition-colors whitespace-nowrap">
                  Categorias e Showrooms
                </Link>
                <Link href="/admin/projetos" className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1a365d] transition-colors whitespace-nowrap">
                  Ver lista →
                </Link>
              </div>
            </div>

            {/* Section 1: Fotos Reais */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Fotos Reais</h3>
                <button
                  onClick={() => {
                    setEditingPhotoId(null);
                    setPhotoForm({ slug:"", title:"", product_code:"", short_description:"", categories:[], image_after:"", image_before:"", note:"", is_active:true, is_featured:false, show_on_home:false, is_new:false, feature_order:0, content_type:"", cover_category:"depois", sort_order:0 });
                    setSlugTouched(false); setProductPickerQuery(""); setPhotoAdvancedOpen(false);
                    setShowPhotoForm(true);
                    setTimeout(() => photoTabFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                  className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
                >
                  + Adicionar
                </button>
              </div>

              {showPhotoForm && (
                <div ref={photoTabFormRef} className="bg-white border border-[#e2e2e2] p-6 mb-6">
                  <h4 className="font-[var(--font-inter)] text-[10px] tracking-[0.15em] uppercase font-bold text-[#002045] mb-5">
                    {editingPhotoId ? "Editar Foto" : "Nova Foto Real"}
                  </h4>
                  <form onSubmit={handlePhotoSubmit}>
                    {/* Informações principais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelCls}>Nome do projeto *</label>
                        <input required type="text" value={photoForm.title}
                          onChange={(e) => { const title = e.target.value; setPhotoForm((prev) => ({ ...prev, title, slug: slugTouched ? prev.slug : slugify(title) })); }}
                          className={inputCls} placeholder="Showroom Parque 10" />
                      </div>
                      <div>
                        <label className={labelCls}>Descrição curta</label>
                        <input type="text" value={photoForm.short_description} onChange={(e) => setPhotoForm({...photoForm, short_description: e.target.value})} className={inputCls} placeholder="Breve descrição do projeto (opcional)" />
                      </div>
                    </div>

                    {/* Produto utilizado — seletor conectado ao catálogo */}
                    <div className="mb-4">
                      <label className={labelCls}>Produto utilizado</label>
                      {photoForm.product_code ? (
                        (() => {
                          const sel = dbProducts.find((p) => p.code === photoForm.product_code);
                          return (
                            <div className="flex items-center gap-3 border border-[#e2e2e2] px-3 py-2">
                              {sel?.image_path && <img src={sel.image_path} className="w-9 h-9 object-cover border border-[#e2e2e2]" alt="" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] truncate">{sel ? `${sel.code} — ${sel.name}` : photoForm.product_code}</p>
                                {sel ? <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">Linha {sel.linha}</p> : <p className="text-amber-700 text-[11px] font-[var(--font-inter)]">Código fora do catálogo atual</p>}
                              </div>
                              <button type="button" onClick={() => { setPhotoForm({...photoForm, product_code: ""}); setProductPickerQuery(""); }} className="text-[#cc0000] hover:text-white hover:bg-[#cc0000] w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors" aria-label="Remover produto">✕</button>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="relative">
                          <input type="text" value={productPickerQuery} onChange={(e) => setProductPickerQuery(e.target.value)} className={inputCls} placeholder="Buscar por código ou nome do modelo…" />
                          {productPickerQuery.trim() && (() => {
                            const q = productPickerQuery.trim().toLowerCase();
                            const matches = dbProducts.filter((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)).slice(0, 12);
                            return (
                              <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e2e2e2] shadow-lg">
                                {matches.length > 0 ? matches.map((p) => (
                                  <button key={p.id} type="button" onClick={() => { setPhotoForm((prev) => ({ ...prev, product_code: p.code })); setProductPickerQuery(""); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#eef2fb] text-left border-b border-[#f0f0f0] last:border-b-0">
                                    {p.image_path && <img src={p.image_path} className="w-8 h-8 object-cover border border-[#e2e2e2]" alt="" />}
                                    <span className="min-w-0">
                                      <span className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] block truncate">{p.code} — {p.name}</span>
                                      <span className="text-[#74777f] text-[11px] font-[var(--font-inter)]">Linha {p.linha}</span>
                                    </span>
                                  </button>
                                )) : (
                                  <p className="px-3 py-2 text-[#74777f] text-xs font-[var(--font-inter)]">Nenhum produto encontrado no catálogo.</p>
                                )}
                              </div>
                            );
                          })()}
                          <p className="text-[#a0a3a8] text-[10px] font-[var(--font-inter)] mt-1">Selecione do catálogo — evita códigos inexistentes.</p>
                        </div>
                      )}
                    </div>

                    {/* Nota + avançado */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                      <div>
                        <label className={labelCls}>Nota</label>
                        <input type="text" value={photoForm.note} onChange={(e) => setPhotoForm({...photoForm, note: e.target.value})} className={inputCls} placeholder="Área úmida" />
                      </div>
                    </div>
                    <div className="mb-4">
                      <button type="button" onClick={() => setPhotoAdvancedOpen((o) => !o)} className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors">
                        {photoAdvancedOpen ? "▾" : "▸"} Configurações avançadas
                      </button>
                      {photoAdvancedOpen && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className={labelCls}>Slug (gerado do nome)</label>
                            <input type="text" value={photoForm.slug} onChange={(e) => { setSlugTouched(true); setPhotoForm({...photoForm, slug: e.target.value}); }} className={inputCls} placeholder="showroom-parque-10" />
                          </div>
                          <div>
                            <label className={labelCls}>Ordem de exibição</label>
                            <input type="number" min="0" value={photoForm.sort_order} onChange={(e) => setPhotoForm({...photoForm, sort_order: parseInt(e.target.value) || 0})} className={inputCls} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Categorias</label>
                      {allCategories.length === 0 ? (
                        <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-2">Nenhuma categoria cadastrada — crie uma abaixo.</p>
                      ) : (
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-2">
                          {allCategories.map((cat) => {
                            const checked = photoForm.categories.includes(cat);
                            const inactive = isInactiveCat(cat);
                            // Categoria inativa só aparece se este projeto já a usa —
                            // o vínculo antigo nunca some sozinho.
                            if (inactive && !checked) return null;
                            return (
                              <label key={cat} className="flex items-center gap-1.5 text-sm font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                                <input type="checkbox" checked={checked} onChange={(e) => {
                                  setPhotoForm({...photoForm, categories: e.target.checked ? [...photoForm.categories, cat] : photoForm.categories.filter(c => c !== cat)});
                                }} className="w-4 h-4" />
                                {catLabel(cat)}
                                {inactive && <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1">inativa</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {/* Criar categoria aqui mesmo — grava em project_categories e
                          já fica disponível em todo o painel e no site. */}
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newCatInput}
                          onChange={(e) => setNewCatInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createAndSelectCategory(); } }}
                          className="border border-[#e2e2e2] px-3 py-1.5 text-sm font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045] w-44"
                          placeholder="nova categoria..."
                        />
                        <button
                          type="button"
                          onClick={createAndSelectCategory}
                          className="px-3 py-1.5 bg-[#002045] text-white text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#1a365d] transition-colors whitespace-nowrap"
                        >
                          + Criar
                        </button>
                      </div>
                    </div>
                    {/* Exibição no site — destaques controlados pelo painel */}
                    <div className="mb-4 border border-[#e2e2e2] p-4">
                      <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-3">Exibição no site</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-[var(--font-inter)] text-[#43474e]">
                          <input type="checkbox" checked={photoForm.is_featured} onChange={(e) => setPhotoForm({...photoForm, is_featured: e.target.checked})} className="w-4 h-4" />
                          Destacar na página de Projetos
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-[var(--font-inter)] text-[#43474e]">
                          <input type="checkbox" checked={photoForm.show_on_home} onChange={(e) => setPhotoForm({...photoForm, show_on_home: e.target.checked})} className="w-4 h-4" />
                          Exibir na página inicial
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-[var(--font-inter)] text-[#43474e]">
                          <input type="checkbox" checked={photoForm.is_new} onChange={(e) => setPhotoForm({...photoForm, is_new: e.target.checked})} className="w-4 h-4" />
                          Marcar como &quot;Novo&quot;
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-[var(--font-inter)] text-[#43474e] whitespace-nowrap">Ordem do destaque</label>
                          <input type="number" min="0" value={photoForm.feature_order} onChange={(e) => setPhotoForm({...photoForm, feature_order: parseInt(e.target.value) || 0})} className="border border-[#e2e2e2] px-2 py-1 text-sm font-[var(--font-inter)] text-[#002045] w-20 focus:outline-none focus:border-[#002045]" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className={labelCls}>Tipo de conteúdo</label>
                        <select value={photoForm.content_type ?? ""} onChange={(e) => setPhotoForm({...photoForm, content_type: e.target.value})} className={inputCls}>
                          <option value="">—</option>
                          <option value="antes_depois">Antes e depois</option>
                          <option value="concluido">Projeto concluído</option>
                          <option value="exposicao">Ambiente em exposição</option>
                          <option value="showroom">Showroom</option>
                          <option value="inspiracao">Inspiração</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className={labelCls}>Capa do projeto *</label>
                      {/* Classificação EXPLÍCITA da capa. Antes disso o site
                          inferia pela posição do campo e uma capa podia acabar
                          exibida como "Antes". Nova capa nasce "Depois". */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Classificação da capa</span>
                        {(["depois", "antes"] as const).map((c) => (
                          <button
                            key={c} type="button"
                            onClick={() => setPhotoForm({ ...photoForm, cover_category: c })}
                            className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${photoForm.cover_category === c ? (c === "antes" ? "bg-amber-500 text-white border-amber-500" : "bg-[#3b6934] text-white border-[#3b6934]") : "border-[#e2e2e2] text-[#74777f] hover:border-[#002045]"}`}
                          >
                            {c === "antes" ? "Antes" : "Depois"}
                          </button>
                        ))}
                        <span className="text-[10px] text-[#a0a3a8] font-[var(--font-inter)]">É esta a etiqueta e o filtro em que a capa aparece no site.</span>
                      </div>
                      {photoForm.image_after ? (
                        <div className="border border-[#e2e2e2]">
                          <img src={photoForm.image_after} alt="Imagem Depois" className="w-full max-h-48 object-cover" />
                          <div className="flex border-t border-[#e2e2e2]">
                            <a href={photoForm.image_after} download target="_blank" rel="noopener noreferrer"
                              className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] text-[#1a365d] hover:bg-[#eef2f8] transition-colors">
                              ↓ Download
                            </a>
                            <label className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors cursor-pointer">
                              Substituir
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setCoverCrop({ file, target: "image_after" });
                                e.target.value = "";
                              }} />
                            </label>
                            <button type="button" onClick={() => setPhotoForm(prev => ({...prev, image_after: ""}))}
                              className="px-3 py-2 text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                              Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 items-start">
                          <input required type="text" value={photoForm.image_after} onChange={(e) => setPhotoForm({...photoForm, image_after: e.target.value})} className={inputCls} placeholder="/images/projetos/..." />
                          <label className="flex-shrink-0 cursor-pointer bg-[#f0f0f0] border border-[#e2e2e2] px-4 py-2.5 text-xs font-bold font-[var(--font-inter)] text-[#002045] hover:bg-[#e8e8e8] transition-colors whitespace-nowrap">
                            Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCoverCrop({ file, target: "image_after" });
                              e.target.value = "";
                            }} />
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Imagem Antes <span className="font-normal text-[#b0b0b0]">(opcional — comparativo antes × depois)</span></label>
                      {photoForm.image_before && photoForm.image_before === photoForm.image_after && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 mb-2 font-[var(--font-inter)]">
                          Esta imagem é idêntica à capa — o site a ignora para não mostrar a mesma foto como “Antes” e “Depois”. Envie outra foto ou remova.
                        </p>
                      )}
                      {photoForm.image_before ? (
                        <div className="border border-[#e2e2e2]">
                          <img src={photoForm.image_before} alt="Imagem Antes" className="w-full max-h-48 object-cover" />
                          <div className="flex border-t border-[#e2e2e2]">
                            <a href={photoForm.image_before} download target="_blank" rel="noopener noreferrer"
                              className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] text-[#1a365d] hover:bg-[#eef2f8] transition-colors">
                              ↓ Download
                            </a>
                            <label className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors cursor-pointer">
                              Substituir
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setCoverCrop({ file, target: "image_before" });
                                e.target.value = "";
                              }} />
                            </label>
                            <button type="button" onClick={() => setPhotoForm(prev => ({...prev, image_before: ""}))}
                              className="px-3 py-2 text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                              Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 items-start">
                          <input type="text" value={photoForm.image_before} onChange={(e) => setPhotoForm({...photoForm, image_before: e.target.value})} className={inputCls} placeholder="/images/projetos/..." />
                          <label className="flex-shrink-0 cursor-pointer bg-[#f0f0f0] border border-[#e2e2e2] px-4 py-2.5 text-xs font-bold font-[var(--font-inter)] text-[#002045] hover:bg-[#e8e8e8] transition-colors whitespace-nowrap">
                            Upload
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCoverCrop({ file, target: "image_before" });
                              e.target.value = "";
                            }} />
                          </label>
                        </div>
                      )}
                    </div>
                    {/* Situação — fonte ÚNICA do estado público. Substitui o
                        antigo checkbox "Projeto ativo", que duplicava (e podia
                        contradizer) o selo "Publicado" e o botão Despublicar. */}
                    <div className="mb-6">
                      <label className={labelCls}>Situação</label>
                      <div className="flex gap-2 flex-wrap">
                        {([
                          { v: false, t: "Rascunho",  d: "Salvo, invisível no site" },
                          { v: true,  t: "Publicado", d: "Visível no site" },
                        ] as const).map((s) => (
                          <button
                            key={s.t} type="button"
                            onClick={() => setPhotoForm({ ...photoForm, is_active: s.v })}
                            className={`text-left px-3 py-2 border transition-colors ${photoForm.is_active === s.v ? "bg-[#002045] text-white border-[#002045]" : "border-[#e2e2e2] text-[#74777f] hover:border-[#002045]"}`}
                          >
                            <span className="block text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)]">{s.t}</span>
                            <span className={`block text-[10px] font-[var(--font-inter)] ${photoForm.is_active === s.v ? "text-white/70" : "text-[#a0a3a8]"}`}>{s.d}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors">Salvar</button>
                      <button type="button" onClick={() => { setShowPhotoForm(false); setEditingPhotoId(null); }} className="border border-[#e2e2e2] text-[#74777f] text-xs font-[var(--font-inter)] px-6 py-2.5 hover:border-[#002045] hover:text-[#002045] transition-colors">Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              {loadingProjects ? (
                <p className="text-[#74777f] text-sm font-[var(--font-inter)] py-4">Carregando...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dbPhotoProjects.length === 0 ? (
                    <p className="text-[#74777f] text-sm font-[var(--font-inter)] col-span-2 py-6 text-center">Nenhuma foto cadastrada.</p>
                  ) : dbPhotoProjects.map((p) => {
                    const isMediaOpen = expandedMediaSlug === p.slug;
                    const media = projectMediaMap[p.slug] ?? [];
                    return (
                      <div key={p.id} className="bg-white border border-[#e2e2e2] flex flex-col">
                        <div className="p-4 flex gap-4">
                          {p.image_after && (
                            <div className="relative w-20 h-24 flex-shrink-0">
                              <img src={p.image_after} alt={p.title} className="w-full h-full object-cover border border-[#e2e2e2]" />
                              <span className={`absolute bottom-0 left-0 right-0 text-[7px] tracking-[0.08em] uppercase font-bold text-center py-px ${p.cover_category === "antes" ? "bg-amber-500 text-white" : "bg-[#3b6934] text-white"}`}>
                                Capa · {p.cover_category === "antes" ? "Antes" : "Depois"}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-[#002045] font-[var(--font-inter)] text-sm">{p.title}</p>
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${p.is_active ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{p.is_active ? "Publicado" : "Rascunho"}</span>
                            </div>
                            <p className="text-xs text-[#3b6934] font-[var(--font-inter)] mt-0.5">{p.product_code}{p.short_description ? ` · ${p.short_description}` : ""}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.categories.map((c) => (
                                <span key={c} className="bg-[#eef2f8] text-[#002045] px-1.5 py-0.5 text-[9px] font-bold tracking-wider">{catLabel(c)}</span>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3 flex-wrap">
                              <button onClick={() => startEditPhoto(p)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#002045] text-[#002045] hover:bg-[#002045] hover:text-white transition-colors">Editar</button>
                              <button
                                onClick={() => {
                                  if (!isMediaOpen) fetchProjectMedia(p.slug);
                                  setExpandedMediaSlug(isMediaOpen ? null : p.slug);
                                  setVideoUrlInput("");
                                }}
                                className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${isMediaOpen ? "bg-[#3b6934] text-white border-[#3b6934]" : "border-[#3b6934] text-[#3b6934] hover:bg-[#3b6934] hover:text-white"}`}
                              >
                                {isMediaOpen ? "▲ Mídias" : `▼ Mídias${media.length ? ` (${media.length})` : ""}`}
                              </button>
                              <button onClick={() => togglePhotoActive(p)} className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${p.is_active ? "border-[#e2e2e2] text-[#74777f] hover:border-[#002045] hover:text-[#002045]" : "border-[#3b6934] text-[#3b6934] hover:bg-[#3b6934] hover:text-white"}`}>
                                {p.is_active ? "Despublicar" : "Publicar"}
                              </button>
                              <button onClick={() => duplicatePhoto(p.id, p.title)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#e2e2e2] text-[#43474e] hover:border-[#002045] hover:text-[#002045] transition-colors">Duplicar</button>
                              <button onClick={() => deletePhoto(p.id, p.title)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
                            </div>
                          </div>
                        </div>

                        {/* ── Media panel ── */}
                        {isMediaOpen && (
                          <div className="border-t border-[#e2e2e2] bg-[#f9f9f9] p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[10px] tracking-[0.12em] uppercase font-bold text-[#002045] font-[var(--font-inter)]">Mídia adicional da obra</p>
                              {mediaMigrated === false && (
                                <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 font-[var(--font-inter)]">
                                  ⚠ Execute a migração 051 no Supabase para habilitar classificação, capa e descrição
                                </span>
                              )}
                            </div>

                            {/* Existing media grid */}
                            {media.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {media.map((m) => (
                                  <div
                                    key={m.id}
                                    draggable
                                    onDragStart={() => setDragMediaId(m.id)}
                                    onDragEnd={() => { setDragMediaId(null); setDragOverMediaId(null); }}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverMediaId(m.id); }}
                                    onDrop={(e) => { e.preventDefault(); if (dragMediaId && dragMediaId !== m.id) reorderMedia(p.slug, dragMediaId, m.id); setDragMediaId(null); setDragOverMediaId(null); }}
                                    className={`relative group cursor-grab active:cursor-grabbing transition-opacity ${dragMediaId === m.id ? "opacity-30" : "opacity-100"} ${dragOverMediaId === m.id && dragMediaId !== m.id ? "ring-2 ring-[#002045]" : ""}`}
                                  >
                                    {/* Thumbnail */}
                                    <div className="relative w-24 h-24">
                                      {m.type === "image" ? (
                                        <img src={m.url} alt={m.caption ?? ""} className="w-full h-full object-cover border border-[#e2e2e2]" />
                                      ) : (
                                        <div className="w-full h-full bg-[#002045] flex items-center justify-center border border-[#002045]">
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                        </div>
                                      )}
                                      {m.type === "image" && (
                                        <a href={m.url} download target="_blank" rel="noopener noreferrer"
                                          className="absolute top-0.5 left-0.5 w-5 h-5 bg-[#002045] text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Download"
                                        >↓</a>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteProjectMedia(m.id, p.slug); }}
                                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      >×</button>
                                      {m.type === "video" && (
                                        <span className="absolute bottom-0.5 left-0.5 text-[7px] text-white/70 font-bold tracking-wide">VÍD</span>
                                      )}
                                      {/* Etiqueta legível — antes eram letras "A"/"D" sem legenda */}
                                      {mediaMigrated && (
                                        <span className={`absolute bottom-0.5 right-0.5 text-[7px] tracking-[0.08em] uppercase font-bold px-1 py-px ${m.category === "antes" ? "bg-amber-500 text-white" : m.category === "depois" ? "bg-[#3b6934] text-white" : "bg-[#74777f] text-white"}`}>
                                          {m.category === "antes" ? "Antes" : m.category === "depois" ? "Depois" : "Sem class."}
                                        </span>
                                      )}
                                      {/* Selo de capa */}
                                      {m.is_cover && (
                                        <span className="absolute bottom-0.5 left-0.5 text-[7px] tracking-[0.08em] uppercase font-bold px-1 py-px bg-[#002045] text-white">
                                          Capa
                                        </span>
                                      )}
                                      {/* Edit overlay */}
                                      {mediaMigrated && (
                                        <button
                                          onClick={() => {
                                            setEditingMediaId(m.id);
                                            setEditMediaDraft({ description: m.description ?? "", category: m.category ?? "geral" });
                                            setAiDescHint("");
                                          }}
                                          className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          title="Editar categoria / descrição"
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                      )}
                                    </div>

                                    {/* Controles visíveis — classificar e definir capa sem
                                        precisar abrir o popover de edição. */}
                                    {mediaMigrated && (
                                      <div className="w-24 mt-1 flex flex-col gap-1">
                                        <div className="flex">
                                          {(["antes", "depois"] as const).map((c) => (
                                            <button
                                              key={c} type="button"
                                              onClick={(e) => { e.stopPropagation(); setMediaCategory(m.id, p.slug, c); }}
                                              className={`flex-1 text-[8px] tracking-[0.05em] uppercase font-bold font-[var(--font-inter)] py-1 border transition-colors ${m.category === c ? (c === "antes" ? "bg-amber-500 text-white border-amber-500" : "bg-[#3b6934] text-white border-[#3b6934]") : "border-[#e2e2e2] bg-white text-[#74777f] hover:border-[#002045]"}`}
                                            >
                                              {c === "antes" ? "Antes" : "Depois"}
                                            </button>
                                          ))}
                                        </div>
                                        {m.type === "image" && !m.is_cover && (
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); useMediaAsCover(m, p); }}
                                            disabled={settingCoverId === m.id}
                                            className="text-[8px] tracking-[0.05em] uppercase font-bold font-[var(--font-inter)] py-1 border border-[#002045] bg-white text-[#002045] hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-50"
                                          >
                                            {settingCoverId === m.id ? "Trocando…" : "Definir capa"}
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Inline edit popover */}
                                    {editingMediaId === m.id && (
                                      <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-[#e2e2e2] p-3 shadow-lg w-64" onClick={(e) => e.stopPropagation()}>
                                        <p className="text-[9px] tracking-[0.12em] uppercase font-bold text-[#002045] font-[var(--font-inter)] mb-2">Editar mídia</p>
                                        {/* Category */}
                                        <div className="mb-2">
                                          <label className="text-[9px] text-[#74777f] font-[var(--font-inter)] uppercase tracking-wider font-bold block mb-1">Categoria</label>
                                          <div className="flex gap-1">
                                            {(["geral", "antes", "depois"] as const).map((cat) => (
                                              <button
                                                key={cat}
                                                onClick={() => setMediaCategory(m.id, p.slug, cat)}
                                                className={`flex-1 text-[9px] uppercase font-bold tracking-wider py-1.5 border transition-colors ${(m.category ?? "geral") === cat ? "bg-[#002045] text-white border-[#002045]" : "border-[#e2e2e2] text-[#74777f] hover:border-[#002045]"}`}
                                              >
                                                {cat}
                                              </button>
                                            ))}
                                          </div>
                                          <p className="text-[8px] text-[#3b6934] font-[var(--font-inter)] mt-1">Salvo automaticamente ao selecionar.</p>
                                        </div>
                                        {/* Description */}
                                        <div className="mb-3">
                                          <div className="flex items-center justify-between mb-1">
                                            <label className="text-[9px] text-[#74777f] font-[var(--font-inter)] uppercase tracking-wider font-bold">Descrição (visível ao usuário)</label>
                                            <button
                                              disabled={aiDescGenerating || m.type === "video"}
                                              onClick={() => generateAiDescription(m.url)}
                                              className="flex items-center gap-1 text-[8px] tracking-wide uppercase font-bold font-[var(--font-inter)] text-[#002045] border border-[#002045] px-2 py-0.5 hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              {aiDescGenerating ? (
                                                <svg className="animate-spin" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                              ) : (
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                                              )}
                                              {aiDescGenerating ? "Gerando…" : "☆ IA"}
                                            </button>
                                          </div>
                                          {/* Hint field for IA */}
                                          <input
                                            type="text"
                                            value={aiDescHint}
                                            onChange={e => setAiDescHint(e.target.value)}
                                            placeholder="Dica para IA: ex. foco na textura, iluminação lateral…"
                                            className="w-full border border-dashed border-[#c8d8e8] bg-[#f5f9ff] px-2 py-1 text-[9px] font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045] mb-1 placeholder:text-[#aab]"
                                          />
                                          <textarea
                                            value={editMediaDraft.description}
                                            onChange={(e) => setEditMediaDraft(d => ({ ...d, description: e.target.value }))}
                                            rows={2}
                                            placeholder="Ex: Detalhe da textura instalada…"
                                            className="w-full border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045] resize-none"
                                          />
                                        </div>
                                        {m.type === "image" && (
                                          <button
                                            onClick={() => useMediaAsCover(m, p)}
                                            disabled={settingCoverId === m.id}
                                            className="w-full mb-2 border border-[#3b6934] text-[#3b6934] text-[9px] uppercase font-bold tracking-wider py-1.5 hover:bg-[#3b6934] hover:text-white transition-colors disabled:opacity-50"
                                          >
                                            {settingCoverId === m.id ? "Trocando…" : "Usar como capa"}
                                          </button>
                                        )}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={async () => {
                                              await patchProjectMedia(m.id, p.slug, { description: editMediaDraft.description || null });
                                              setMediaToast({ text: "Descrição salva" });
                                              setTimeout(() => setMediaToast(null), 2500);
                                              setEditingMediaId(null);
                                            }}
                                            className="flex-1 bg-[#002045] text-white text-[9px] uppercase font-bold tracking-wider py-1.5 hover:bg-[#1a365d] transition-colors"
                                          >
                                            Salvar descrição
                                          </button>
                                          <button
                                            onClick={() => setEditingMediaId(null)}
                                            className="flex-1 border border-[#e2e2e2] text-[#74777f] text-[9px] uppercase font-bold tracking-wider py-1.5 hover:border-[#002045] transition-colors"
                                          >
                                            Fechar
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Classificação aplicada às próximas fotos enviadas */}
                            {mediaMigrated && (
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Enviar novas fotos como</span>
                                {(["depois", "antes"] as const).map((c) => (
                                  <button key={c} type="button" onClick={() => setUploadCategory(c)}
                                    className={`text-[9px] tracking-[0.05em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-1 border transition-colors ${uploadCategory === c ? (c === "antes" ? "bg-amber-500 text-white border-amber-500" : "bg-[#3b6934] text-white border-[#3b6934]") : "border-[#e2e2e2] bg-white text-[#74777f] hover:border-[#002045]"}`}>
                                    {c === "antes" ? "Antes" : "Depois"}
                                  </button>
                                ))}
                                <span className="text-[9px] text-[#a0a3a8] font-[var(--font-inter)]">Dá para trocar depois em cada foto.</span>
                              </div>
                            )}

                            {/* Add image + video file */}
                            <div className="flex flex-wrap gap-3">
                              <label className={`relative cursor-pointer text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 border border-[#002045] text-[#002045] hover:bg-[#002045] hover:text-white transition-colors whitespace-nowrap ${mediaUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                {mediaUploading ? "Enviando…" : "+ Fotos"}
                                <input
                                  type="file" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files ?? []);
                                    for (const file of files) await addProjectMediaImage(p.slug, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>

                              <label className={`relative cursor-pointer text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 bg-[#3b6934] text-white hover:bg-[#2d5128] transition-colors whitespace-nowrap ${mediaUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                {mediaUploading ? "Enviando…" : "+ Vídeo (arquivo)"}
                                <input
                                  type="file" accept="video/*,.mov,.mp4,.m4v,.webm,.avi" className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) await addProjectMediaVideoFile(p.slug, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>

                            {/* Add video URL */}
                            <div className="flex gap-2 mt-3">
                              <input
                                type="url"
                                value={videoUrlInput}
                                onChange={(e) => setVideoUrlInput(e.target.value)}
                                placeholder="Ou cole URL do vídeo (YouTube, Vimeo, Drive…)"
                                className="flex-1 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045]"
                              />
                              <button
                                onClick={() => addProjectMediaVideo(p.slug, videoUrlInput)}
                                disabled={!videoUrlInput.trim()}
                                className="text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 bg-[#002045] text-white hover:bg-[#1a365d] transition-colors disabled:opacity-40 whitespace-nowrap"
                              >
                                + URL
                              </button>
                            </div>
                            {mediaMigrated === false && (
                              <details className="mt-3">
                                <summary className="text-[9px] text-amber-700 cursor-pointer font-[var(--font-inter)] font-semibold">Ver SQL da migração ▸</summary>
                                <pre className="mt-2 text-[8px] bg-amber-50 border border-amber-200 p-2 text-amber-800 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
{`-- Rode a migração 051 no Supabase (SQL Editor → New query):
-- supabase/migrations/051_project_media_classification.sql
-- Ela normaliza antes/depois, cria is_cover e corrige os dados legados.`}
                                </pre>
                                <p className="text-[9px] text-[#74777f] font-[var(--font-inter)] mt-1">Cole no Supabase Dashboard → SQL Editor → New query → Run.</p>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[#e2e2e2] my-8" />

            {/* Section 2: Renders / CGI */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Renders / CGI</h3>
                <div className="flex gap-2">
                  {/* Bulk import button — only show if there are unimported statics */}
                  {STATIC_RENDERS.filter((r) => !dbRenderProjects.some((d) => d.slug === r.slug)).length > 0 && (
                    <button
                      onClick={importAllStaticRenders}
                      disabled={renderImportingAll}
                      className="border border-[#002045] text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-50"
                    >
                      {renderImportingAll ? "Importando…" : `↓ Importar ${STATIC_RENDERS.filter((r) => !dbRenderProjects.some((d) => d.slug === r.slug)).length} estáticos`}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingRenderId(null);
                      setRenderForm({ slug:"", title:"", product_code:"", image_path:"", is_active:true, sort_order:0 });
                      setShowRenderForm(true);
                      setTimeout(() => renderTabFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                    }}
                    className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-5">
                Renders <span className="font-bold text-[#3b6934]">gerenciados</span> sobrescrevem os estáticos no site quando têm o mesmo slug. Importe os estáticos para editá-los ou substituir as imagens.
              </p>

              {showRenderForm && (
                <div ref={renderTabFormRef} className="bg-white border border-[#e2e2e2] p-6 mb-6">
                  <h4 className="font-[var(--font-inter)] text-[10px] tracking-[0.15em] uppercase font-bold text-[#002045] mb-5">
                    {editingRenderId ? "Editar Render" : "Novo Render"}
                  </h4>
                  <form onSubmit={handleRenderSubmit}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className={labelCls}>Slug *</label>
                        <input required type="text" value={renderForm.slug} onChange={(e) => setRenderForm({...renderForm, slug: e.target.value})} className={inputCls} placeholder="orb001-sala" />
                      </div>
                      <div>
                        <label className={labelCls}>Título *</label>
                        <input required type="text" value={renderForm.title} onChange={(e) => setRenderForm({...renderForm, title: e.target.value})} className={inputCls} placeholder="Sala de Estar" />
                      </div>
                      <div>
                        <label className={labelCls}>Código do produto</label>
                        <input type="text" value={renderForm.product_code} onChange={(e) => setRenderForm({...renderForm, product_code: e.target.value})} className={inputCls} placeholder="ORB-001" />
                      </div>
                      <div>
                        <label className={labelCls}>Sort Order</label>
                        <input type="number" min="0" value={renderForm.sort_order} onChange={(e) => setRenderForm({...renderForm, sort_order: parseInt(e.target.value) || 0})} className={inputCls} />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Imagem</label>
                      <div className="flex gap-3 items-start">
                        <input type="text" value={renderForm.image_path} onChange={(e) => setRenderForm({...renderForm, image_path: e.target.value})} className={inputCls} placeholder="/images/renders/..." />
                        <label className="flex-shrink-0 cursor-pointer bg-[#f0f0f0] border border-[#e2e2e2] px-4 py-2.5 text-xs font-bold font-[var(--font-inter)] text-[#002045] hover:bg-[#e8e8e8] transition-colors whitespace-nowrap">
                          {projectImageUploading ? "Enviando..." : "Upload"}
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setProjectImageUploading(true);
                            const url = await uploadDirect(file, "renders");
                            setProjectImageUploading(false);
                            if (url) setRenderForm((prev) => ({...prev, image_path: url}));
                          }} />
                        </label>
                      </div>
                    </div>
                    <div className="mb-6 flex items-center gap-2">
                      <input type="checkbox" id="render-active" checked={renderForm.is_active} onChange={(e) => setRenderForm({...renderForm, is_active: e.target.checked})} className="w-4 h-4" />
                      <label htmlFor="render-active" className="text-sm font-[var(--font-inter)] text-[#43474e]">Render ativo</label>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors">Salvar</button>
                      <button type="button" onClick={() => { setShowRenderForm(false); setEditingRenderId(null); }} className="border border-[#e2e2e2] text-[#74777f] text-xs font-[var(--font-inter)] px-6 py-2.5 hover:border-[#002045] hover:text-[#002045] transition-colors">Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              {loadingProjects ? (
                <p className="text-[#74777f] text-sm font-[var(--font-inter)] py-4">Carregando...</p>
              ) : (
                <>
                <div className="hidden md:block bg-white border border-[#e2e2e2]">
                  <table className="w-full text-sm font-[var(--font-inter)]">
                    <thead>
                      <tr className="border-b border-[#e2e2e2]">
                        {["Imagem","Título","Código","Origem","Ações"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* DB (managed) renders first */}
                      {dbRenderProjects.map((r) => (
                        <tr key={r.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                          <td className="px-3 py-2 w-16">
                            {r.image_path && <img src={r.image_path} alt={r.title} className="w-14 h-14 object-cover border border-[#e2e2e2]" />}
                          </td>
                          <td className="px-4 py-3 text-[#002045] font-medium">{r.title}</td>
                          <td className="px-4 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{r.product_code}</span></td>
                          <td className="px-4 py-3">
                            <span className="text-[9px] font-bold tracking-wide bg-[#3b6934] text-white px-2 py-0.5">GERENCIADO</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => startEditRender(r)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#002045] text-[#002045] hover:bg-[#002045] hover:text-white transition-colors">Editar</button>
                              <button onClick={() => deleteRender(r.id, r.title)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Static renders not yet in DB */}
                      {STATIC_RENDERS.filter((r) => !dbRenderProjects.some((d) => d.slug === r.slug)).map((r, idx) => (
                        <tr key={r.slug} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] opacity-70">
                          <td className="px-3 py-2 w-16">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.image_path} alt={r.title} className="w-14 h-14 object-cover border border-[#e2e2e2]" />
                          </td>
                          <td className="px-4 py-3 text-[#002045]">{r.title}</td>
                          <td className="px-4 py-3"><span className="bg-[#f0f0f0] text-[#74777f] px-2 py-0.5 text-xs font-bold tracking-wider">{r.product_code}</span></td>
                          <td className="px-4 py-3">
                            <span className="text-[9px] font-bold tracking-wide bg-[#eef2f8] text-[#74777f] px-2 py-0.5">ESTÁTICO</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => importStaticRender(r, idx)}
                              disabled={renderImporting === r.slug}
                              className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#3b6934] text-[#3b6934] hover:bg-[#3b6934] hover:text-white transition-colors disabled:opacity-50"
                            >
                              {renderImporting === r.slug ? "…" : "↓ Importar"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {dbRenderProjects.length === 0 && (STATIC_RENDERS as readonly unknown[]).length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-8 text-center text-[#74777f]">Nenhum render.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {dbRenderProjects.map((r) => (
                    <div key={r.id} className="bg-white border border-[#e2e2e2] p-3 flex gap-3">
                      {r.image_path && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_path} alt={r.title} className="w-14 h-14 object-cover border border-[#e2e2e2] flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[#002045] font-medium text-sm min-w-0 truncate">{r.title}</p>
                          <span className="text-[9px] font-bold tracking-wide bg-[#3b6934] text-white px-2 py-0.5 flex-shrink-0">GERENCIADO</span>
                        </div>
                        <span className="inline-block bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-[10px] font-bold tracking-wider mt-1.5">{r.product_code}</span>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => startEditRender(r)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#002045] text-[#002045] hover:bg-[#002045] hover:text-white transition-colors">Editar</button>
                          <button onClick={() => deleteRender(r.id, r.title)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {STATIC_RENDERS.filter((r) => !dbRenderProjects.some((d) => d.slug === r.slug)).map((r, idx) => (
                    <div key={r.slug} className="bg-white border border-[#e2e2e2] p-3 flex gap-3 opacity-70">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.image_path} alt={r.title} className="w-14 h-14 object-cover border border-[#e2e2e2] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[#002045] text-sm min-w-0 truncate">{r.title}</p>
                          <span className="text-[9px] font-bold tracking-wide bg-[#eef2f8] text-[#74777f] px-2 py-0.5 flex-shrink-0">ESTÁTICO</span>
                        </div>
                        <span className="inline-block bg-[#f0f0f0] text-[#74777f] px-2 py-0.5 text-[10px] font-bold tracking-wider mt-1.5">{r.product_code}</span>
                        <div className="mt-2">
                          <button onClick={() => importStaticRender(r, idx)} disabled={renderImporting === r.slug} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-[#3b6934] text-[#3b6934] hover:bg-[#3b6934] hover:text-white transition-colors disabled:opacity-50">{renderImporting === r.slug ? "…" : "↓ Importar"}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dbRenderProjects.length === 0 && (STATIC_RENDERS as readonly unknown[]).length === 0 && (
                    <div className="bg-white border border-[#e2e2e2] px-4 py-6 text-center text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum render.</div>
                  )}
                </div>
                </>
              )}
            </div>
          </div>
        )}
        {/* ═══ MÍDIA TAB ═══ */}
        {tab === "midia" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-[var(--font-inter)] text-xl font-bold text-[#002045]">Imagens do Site</h2>
                <p className="text-[#74777f] text-sm font-[var(--font-inter)] mt-1">
                  Faça download das fotos originais, veja as dimensões exatas e substitua imagens diretamente — sem precisar de um deploy.
                </p>
              </div>
            </div>

            {assetLoading ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)] py-8">Carregando...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {SITE_ASSET_MANIFEST.map((asset) => {
                  const overrideUrl = assetManifest[asset.key];
                  const currentUrl = overrideUrl ?? asset.staticPath;
                  const isOverridden = !!overrideUrl;

                  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAssetUploading(asset.key);
                    const url = await uploadDirect(file, "assets");
                    if (url) {
                      await fetch("/api/admin/assets", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key: asset.key, url }),
                      });
                      setAssetManifest(prev => ({ ...prev, [asset.key]: url }));
                    }
                    setAssetUploading(null);
                    e.target.value = "";
                  }

                  async function handleRestore() {
                    setAssetRestoring(asset.key);
                    await fetch("/api/admin/assets", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ key: asset.key }),
                    });
                    setAssetManifest(prev => { const n = { ...prev }; delete n[asset.key]; return n; });
                    setAssetRestoring(null);
                  }

                  return (
                    <div key={asset.key} className="bg-white border border-[#e2e2e2] overflow-hidden flex flex-col">
                      {/* Preview */}
                      <div className="relative bg-[#f0f0f0] overflow-hidden" style={{ aspectRatio: asset.nativeW && asset.nativeH ? `${asset.nativeW}/${asset.nativeH}` : "4/3", maxHeight: "260px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentUrl}
                          alt={asset.label}
                          className="absolute inset-0 w-full h-full object-cover object-top"
                        />
                        {/* Status badge */}
                        <div className={`absolute top-2 right-2 text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-2 py-1 ${isOverridden ? "bg-[#3b6934] text-white" : "bg-white/90 text-[#74777f]"}`}>
                          {isOverridden ? "Substituída" : "Original"}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="px-4 pt-4 pb-3 flex-1 flex flex-col gap-3">
                        <div>
                          <p className="text-[#002045] font-semibold text-sm font-[var(--font-inter)] leading-snug">{asset.label}</p>
                          <p className="text-[#74777f] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] mt-0.5">{asset.section}</p>
                        </div>

                        {/* Dimensions */}
                        <div className="bg-[#f9f9f9] border border-[#e2e2e2] px-3 py-2 space-y-1">
                          {asset.nativeW > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[#74777f] text-[10px] font-[var(--font-inter)]">Tamanho do arquivo</span>
                              <span className="text-[#002045] text-[10px] font-bold font-[var(--font-inter)]">{asset.nativeW} × {asset.nativeH} px</span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[#74777f] text-[10px] font-[var(--font-inter)] shrink-0">Exibição no site</span>
                            <span className="text-[#002045] text-[10px] font-[var(--font-inter)] text-right">{asset.displayInfo}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#74777f] text-[10px] font-[var(--font-inter)]">Proporção ideal</span>
                            <span className="text-[#002045] text-[10px] font-bold font-[var(--font-inter)]">
                              {asset.nativeW > 0 ? `${asset.nativeW}:${asset.nativeH}` : "livre"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto">
                          {/* Download */}
                          <a
                            href={currentUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white transition-colors"
                          >
                            Download
                          </a>

                          {/* Upload replacement */}
                          <label className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 bg-[#002045] text-white hover:bg-[#1a365d] transition-colors cursor-pointer">
                            {assetUploading === asset.key ? "Enviando…" : "Substituir"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={assetUploading === asset.key}
                              onChange={handleUpload}
                            />
                          </label>
                        </div>

                        {/* Restore original */}
                        {isOverridden && (
                          <button
                            onClick={handleRestore}
                            disabled={assetRestoring === asset.key}
                            className="w-full text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            {assetRestoring === asset.key ? "Restaurando…" : "Restaurar imagem original"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ SIMULADOR TAB ═══ */}
        {tab === "simulador" && (() => {
          const PLATE_W = 1.2;
          const PLATE_H = 2.9;
          const simPlatesForDimensions = (w: number, h: number) =>
            w > 0 && h > 0 ? panelGrid(w, h, PLATE_W, PLATE_H).count : 0;
          const SIM_SPACES = [
            { id: "parede",      label: "Parede" },
            { id: "teto",        label: "Teto" },
            { id: "sala",        label: "Sala" },
            { id: "quarto",      label: "Quarto" },
            { id: "escritorio",  label: "Escritório" },
            { id: "corredor",    label: "Corredor" },
            { id: "banheiro",    label: "Banheiro" },
            { id: "lavabo",      label: "Lavabo" },
            { id: "cozinha",     label: "Cozinha" },
            { id: "box",         label: "Box / Ducha" },
            { id: "movel",       label: "Móvel / Marcenaria" },
            { id: "home-theater",label: "Home Theater" },
            { id: "comercial",   label: "Clínica / Comercial" },
          ];
          const LINE_INFO_SIM: Record<"Classic"|"Brilliance"|"Elegance", { finish: string; price: number }> = {
            Classic:    { finish: "Mármore Fosco",       price: 559 },
            Brilliance: { finish: "Mármore Polido",      price: 589 },
            Elegance:   { finish: "Madeira Texturizada", price: 649 },
          };
          const simWn = parseFloat(simW) || 0;
          const simHn = parseFloat(simH) || 0;
          const simArea = simWn * simHn;
          const simPlates = simPlatesForDimensions(simWn, simHn);
          const simProduct = dbProducts.find(p => p.code === simProductCode) ?? null;
          const simMaterial = simPlates * (simProduct?.price ?? 0);
          const canAddSpace = simSpaceName.trim() !== "" && simProduct !== null && simPlates > 0;

          interface SimSpaceCalc { spaceName: string; productCode: string; product: typeof simProduct; plates: number; area: number; material: number; w: string; h: string; }
          const allSpaces: SimSpaceCalc[] = [
            ...simSpaces.map(s => {
              const wn = parseFloat(s.w) || 0;
              const hn = parseFloat(s.h) || 0;
              const pl = simPlatesForDimensions(wn, hn);
              const prod = dbProducts.find(p => p.code === s.productCode) ?? null;
              return { spaceName: s.spaceName, productCode: s.productCode, product: prod, plates: pl, area: wn * hn, material: pl * (prod?.price ?? 0), w: s.w, h: s.h };
            }),
            ...(canAddSpace ? [{ spaceName: simSpaceName.trim(), productCode: simProductCode, product: simProduct, plates: simPlates, area: simArea, material: simMaterial, w: simW, h: simH }] : []),
          ];
          const grandPlatesSim = allSpaces.reduce((s, sp) => s + sp.plates, 0);
          const grandMaterialSim = allSpaces.reduce((s, sp) => s + sp.material, 0);
          const canGenerate = allSpaces.length > 0;

          function addCurrentSpace() {
            if (!canAddSpace) return;
            setSimSpaces(prev => [...prev, { key: `sim-${Date.now()}`, spaceName: simSpaceName.trim(), productCode: simProductCode, w: simW, h: simH }]);
            setSimSpaceName(""); setSimProductCode(""); setSimW(""); setSimH("");
            setSimSelectedLine(null); setSimShowCustom(false); setSimCustomText("");
            setSimLink(""); setSimLinkCopied(false);
          }

          function buildSimLink() {
            const origin = typeof window !== "undefined" ? window.location.origin : "https://orbitalrevestimentos.com.br";
            const p = new URLSearchParams();
            p.set("from", "consultor");
            // Rep direct sale takes precedence: use the rep's referral code as the coupon
            // and pass the admin-set discount % via ?desc so their commission is calculated.
            if (simRepCode.trim()) {
              p.set("cupom", simRepCode.trim().toUpperCase());
              const d = parseFloat(simRepDiscount);
              if (!isNaN(d) && d > 0) p.set("desc", d.toString());
            } else if (simCoupon.trim()) {
              p.set("cupom", simCoupon.trim().toUpperCase());
            }
            if (allSpaces.length === 1) {
              const sp = allSpaces[0];
              p.set("space", "custom");
              p.set("customSpace", sp.spaceName);
              p.set("produto", sp.productCode);
              p.set("area", sp.area.toFixed(2));
              p.set("placas", sp.plates.toString());
            } else {
              p.set("ms", allSpaces.length.toString());
              allSpaces.forEach((sp, i) => {
                p.set(`s${i}`, sp.spaceName);
                p.set(`p${i}`, sp.productCode);
                p.set(`pl${i}`, sp.plates.toString());
              });
            }
            return `${origin}/simulador?${p.toString()}`;
          }

          const waLines = allSpaces.map((sp, i) =>
            `*${i + 1}. ${sp.spaceName}* — ${sp.product?.name ?? sp.productCode} (${sp.productCode})\n   ${parseFloat(sp.w) || "?"}m × ${parseFloat(sp.h) || "?"}m · ${sp.plates} placas · ${sp.material.toLocaleString("pt-BR")}`
          );
          const waText = canGenerate ? encodeURIComponent(
            [`Olá! Segue o link para confirmar o orçamento do seu projeto com PFB Orbital:`, ``, buildSimLink(), ``, ...waLines,
             ...(allSpaces.length > 1 ? [``, `*Total material: ${grandMaterialSim.toLocaleString("pt-BR")}*`] : [])].join("\n")
          ) : "";

          return (
            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
              <div className="mb-6">
                <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal mb-2">Simulador para clientes</h2>
                <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">Configure um ou mais ambientes, gere o link e envie ao cliente. O link abre direto no passo de confirmação.</p>
              </div>

              {/* Saved spaces list */}
              {simSpaces.length > 0 && (
                <div className="bg-white border border-[#e2e2e2] mb-4 divide-y divide-[#f0f0f0]">
                  {simSpaces.map((s, i) => {
                    const wn = parseFloat(s.w) || 0; const hn = parseFloat(s.h) || 0;
                    const pl = simPlatesForDimensions(wn, hn);
                    const prod = dbProducts.find(p => p.code === s.productCode) ?? null;
                    const mat = pl * (prod?.price ?? 0);
                    return (
                      <div key={s.key} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-6 h-6 rounded-full bg-[#3b6934] text-white text-[10px] font-bold font-[var(--font-inter)] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        {prod && <img src={prod.image_path} alt={prod.name} className="w-10 h-10 object-cover flex-shrink-0 border border-[#e2e2e2]" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{s.spaceName}</p>
                          <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{prod?.name ?? s.productCode} · {wn}m × {hn}m · {pl} pl.</p>
                        </div>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] flex-shrink-0">{fmt(mat)}</p>
                        <button onClick={() => { setSimSpaces(prev => prev.filter((_, idx) => idx !== i)); setSimLink(""); }} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New space card */}
              <div className="bg-white border border-[#e2e2e2] p-6 space-y-6">
                <p className="text-[#002045] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)]">
                  {simSpaces.length === 0 ? "1 — Escolha o espaço" : `Ambiente ${simSpaces.length + 1} — Escolha o espaço`}
                </p>

                {/* Space buttons */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {SIM_SPACES.map(space => (
                    <button key={space.id} onClick={() => {
                      setSimSpaceName(space.label); setSimShowCustom(false); setSimCustomText("");
                      setTimeout(() => document.getElementById("sim-products")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                    }}
                      className={`px-3 py-2.5 min-h-[44px] border text-xs font-semibold font-[var(--font-inter)] transition-all text-left ${
                        simSpaceName === space.label && !simShowCustom
                          ? "border-[#002045] bg-[#002045] text-white"
                          : "border-[#e2e2e2] text-[#43474e] hover:border-[#002045] hover:text-[#002045]"
                      }`}>{space.label}</button>
                  ))}
                  <button onClick={() => {
                    setSimShowCustom(true); setSimSpaceName("");
                    setTimeout(() => document.getElementById("sim-products")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                  }}
                    className={`px-3 py-2.5 min-h-[44px] border text-xs font-semibold font-[var(--font-inter)] transition-all text-left ${
                      simShowCustom ? "border-[#002045] bg-[#002045] text-white" : "border-dashed border-[#c8c8c8] text-[#74777f] hover:border-[#002045] hover:text-[#002045]"
                    }`}>+ Outro</button>
                </div>
                {simShowCustom && (
                  <input autoFocus type="text" value={simCustomText}
                    onChange={e => { setSimCustomText(e.target.value); setSimSpaceName(e.target.value); }}
                    placeholder="Descreva o espaço — ex: varanda interna, garagem, hall…"
                    className="w-full border border-[#002045] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none" />
                )}

                {/* Product line + cards */}
                <div id="sim-products">
                  <p className="text-[#002045] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">2 — Escolha o modelo</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {(["Classic","Brilliance","Elegance"] as const).map(linha => {
                      const info = LINE_INFO_SIM[linha];
                      const active = simSelectedLine === linha;
                      return (
                        <button key={linha} onClick={() => {
                          setSimSelectedLine(linha); setSimProductCode("");
                          setTimeout(() => document.getElementById("sim-product-cards")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                        }}
                          className={`border text-left p-4 transition-all relative ${active ? "border-[#002045] bg-[#eef2fb]" : "border-[#e2e2e2] hover:border-[#002045] bg-[#fafafa]"}`}>
                          {active && <div className="absolute top-2 right-2 w-4 h-4 bg-[#002045] flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>}
                          <p className="text-[#002045] text-sm font-bold font-[var(--font-inter)] mb-0.5">{linha}</p>
                          <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#3b6934] mb-2">{info.finish}</p>
                          <p className="text-[#002045] text-xs font-bold font-[var(--font-inter)]">R$ {info.price.toLocaleString("pt-BR")}<span className="font-normal text-[#9e9e9e]">/placa</span></p>
                        </button>
                      );
                    })}
                  </div>

                  {simSelectedLine && (
                    <div id="sim-product-cards">
                      <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">Acabamentos {simSelectedLine}</p>
                      {loadingDbProducts ? (
                        <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-[#002045] border-t-transparent rounded-full animate-spin" /></div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {dbProducts.filter(p => p.linha === simSelectedLine && p.is_active).map(product => {
                            const active = simProductCode === product.code;
                            return (
                              <div key={product.code} onClick={() => {
                                setSimProductCode(product.code);
                                setTimeout(() => document.getElementById("sim-dims")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
                              }}
                                className={`border overflow-hidden cursor-pointer transition-all ${active ? "border-[#002045]" : "border-[#e2e2e2] hover:border-[#002045]"}`}>
                                <div className="relative w-full bg-[#f7f7f5]" style={{ aspectRatio: "812/988" }}>
                                  <img src={product.image_path} alt={product.name} className="absolute inset-0 w-full h-full object-contain" />
                                  {active && <div className="absolute inset-0 bg-[#002045]/10" />}
                                  {active && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white shadow flex items-center justify-center"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>}
                                </div>
                                <div className="p-1.5">
                                  <p className={`text-[10px] font-bold font-[var(--font-inter)] leading-tight ${active ? "text-[#002045]" : "text-[#43474e]"}`}>{product.name}</p>
                                  <p className="text-[9px] text-[#9e9e9e] font-[var(--font-inter)]">{product.code}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dimensions */}
                <div id="sim-dims">
                  <p className="text-[#002045] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">3 — Dimensões</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Largura (m)</label>
                      <input type="number" min="0" step="0.01" value={simW} onChange={e => setSimW(e.target.value)} placeholder="Ex: 6.10" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Altura (m)</label>
                      <input type="number" min="0" step="0.01" value={simH} onChange={e => setSimH(e.target.value)} placeholder="Ex: 5.16" className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                {simPlates > 0 && simProduct && (
                  <div className="bg-[#f9fbff] border border-[#dce8f5] px-5 py-4">
                    <div className="flex items-center gap-4 mb-3">
                      <img src={simProduct.image_path} alt={simProduct.name} className="w-12 h-12 object-cover border border-[#e2e2e2]" />
                      <div>
                        <p className="text-[#002045] text-sm font-bold font-[var(--font-inter)]">{simProduct.name}</p>
                        <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{simSpaceName} · {simProduct.code}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-t border-[#dce8f5] pt-3">
                      <div>
                        <p className="text-[#74777f] text-[9px] uppercase tracking-widest font-bold font-[var(--font-inter)]">Área</p>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{simArea.toFixed(2)} m²</p>
                      </div>
                      <div>
                        <p className="text-[#74777f] text-[9px] uppercase tracking-widest font-bold font-[var(--font-inter)]">Placas</p>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{simPlates}</p>
                      </div>
                      <div>
                        <p className="text-[#74777f] text-[9px] uppercase tracking-widest font-bold font-[var(--font-inter)]">Material</p>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{fmt(simMaterial)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add another + grand total + generate */}
                <button disabled={!canAddSpace} onClick={addCurrentSpace}
                  className="w-full py-2.5 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] hover:bg-[#f0f4fa] transition-colors disabled:opacity-40">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline mr-1.5 mb-0.5"><path d="M12 5v14M5 12h14"/></svg>
                  Salvar e adicionar outro ambiente
                </button>

                {allSpaces.length > 1 && (
                  <div className="bg-[#002045] px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-[9px] uppercase tracking-widest font-bold font-[var(--font-inter)]">Total do projeto</p>
                      <p className="text-white/60 text-[10px] font-[var(--font-inter)]">{allSpaces.length} ambientes · {grandPlatesSim} placas</p>
                    </div>
                    <p className="text-white text-xl font-[var(--font-noto-serif)]">{fmt(grandMaterialSim)}</p>
                  </div>
                )}

                <button disabled={!canGenerate} onClick={() => {
                  setSimLink(buildSimLink()); setSimLinkCopied(false);
                  setTimeout(() => document.getElementById("sim-link")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                }}
                  className="w-full py-3 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors disabled:opacity-40">
                  Gerar link para o cliente
                </button>
              </div>

              {/* Coupon — outside main form, collapsible */}
              <div className="mt-4 bg-white border border-[#e2e2e2] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">Cupom de desconto</p>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">Opcional — aplicado automaticamente no link</p>
                  </div>
                  <button
                    onClick={() => { setShowCouponCreator(v => !v); if (!showCouponCreator) fetchAdminCoupons(); }}
                    className="text-[9px] uppercase tracking-widest font-bold font-[var(--font-inter)] text-[#002045] border border-[#002045] px-3 py-1 hover:bg-[#002045] hover:text-white transition-colors"
                  >
                    {showCouponCreator ? "Fechar" : "+ Criar cupom"}
                  </button>
                </div>

                {/* Direct sale via sales rep — uses the rep's code + admin-set discount */}
                <div className="mb-3 border-b border-[#e2e2e2] pb-3">
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Venda direta — Representante</label>
                  <div className="flex gap-3">
                    <select value={simRepCode} onChange={e => setSimRepCode(e.target.value)}
                      className="flex-1 border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] bg-white">
                      <option value="">Nenhum (cupom normal)</option>
                      {salesReps.filter(r => r.status === "active").map(r => (
                        <option key={r.id} value={r.referral_code}>{r.name} ({r.referral_code})</option>
                      ))}
                    </select>
                    <div className="w-28">
                      <input type="number" min="0" max="50" value={simRepDiscount} onChange={e => setSimRepDiscount(e.target.value)}
                        disabled={!simRepCode}
                        placeholder="Desc. %"
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] disabled:opacity-40" />
                    </div>
                  </div>
                  {simRepCode && (
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2">A comissão do representante será calculada sobre o valor com desconto quando o cliente preencher os dados.</p>
                  )}
                </div>

                <input type="text" value={simCoupon} onChange={e => setSimCoupon(e.target.value.toUpperCase())}
                  disabled={!!simRepCode}
                  placeholder={simRepCode ? "Usando código do representante" : "Ex: PARCEIRO01 ou código gerado abaixo"}
                  className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] disabled:opacity-40" />

                {/* Coupon creator panel */}
                {showCouponCreator && (
                  <div className="mt-4 border-t border-[#e2e2e2] pt-4 space-y-3">
                    <p className="text-[10px] tracking-[0.12em] uppercase font-bold text-[#002045] font-[var(--font-inter)]">Criar novo cupom</p>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Código</label>
                        <input type="text" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value.toUpperCase())} placeholder="Ex: AVISTA5"
                          className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Desconto %</label>
                        <input type="number" min="1" max="50" value={newCouponPct} onChange={e => setNewCouponPct(e.target.value)}
                          className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Tipo de pagamento</label>
                      <div className="flex gap-2">
                        {([["a_vista","À Vista"],["parcelado","Parcelado"],["qualquer","Qualquer"]] as const).map(([val, label]) => (
                          <button key={val} onClick={() => setNewCouponPayment(val)}
                            className={`flex-1 text-[10px] uppercase font-bold tracking-wider py-2 border transition-colors font-[var(--font-inter)] ${newCouponPayment === val ? "bg-[#002045] text-white border-[#002045]" : "border-[#e2e2e2] text-[#74777f] hover:border-[#002045]"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Tipo de uso</label>
                      <div className="flex gap-2">
                        {([["single_use","Uso único"],["temporary","Temporário"]] as const).map(([val, label]) => (
                          <button key={val} onClick={() => setNewCouponUsage(val)}
                            className={`flex-1 text-[10px] uppercase font-bold tracking-wider py-2 border transition-colors font-[var(--font-inter)] ${newCouponUsage === val ? "bg-[#002045] text-white border-[#002045]" : "border-[#e2e2e2] text-[#74777f] hover:border-[#002045]"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {newCouponUsage === "temporary" && (
                        <div className="mt-2">
                          <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Válido até</label>
                          <input type="datetime-local" value={newCouponExpiry} onChange={e => setNewCouponExpiry(e.target.value)}
                            className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                        </div>
                      )}
                    </div>

                    <button disabled={couponCreating || !newCouponCode.trim()} onClick={createAdminCoupon}
                      className="w-full py-2.5 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors disabled:opacity-40">
                      {couponCreating ? "Criando…" : "Criar cupom e aplicar ao link"}
                    </button>

                    {couponCreatedMsg && <p className="text-[#2e7d32] text-sm font-[var(--font-inter)]">✓ {couponCreatedMsg}</p>}

                    {adminCoupons.length > 0 && (
                      <div className="border-t border-[#e2e2e2] pt-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#74777f] font-[var(--font-inter)]">Cupons existentes</p>
                        {adminCoupons.map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-[#fafafa] border border-[#e2e2e2] px-3 py-2">
                            <div>
                              <span className="text-sm font-bold text-[#002045] font-[var(--font-inter)]">{c.code}</span>
                              <span className="text-xs text-[#74777f] font-[var(--font-inter)] ml-2">{c.discount_pct}% · {c.payment_type === "a_vista" ? "à vista" : c.payment_type === "parcelado" ? "parcelado" : "qualquer"} · {c.usage_type === "single_use" ? "uso único" : "temporário"}</span>
                              {c.used && <span className="text-[10px] text-[#d32f2f] font-bold ml-2">USADO</span>}
                              {c.expires_at && !c.used && <span className="text-[10px] text-[#f57c00] ml-2">até {new Date(c.expires_at).toLocaleDateString("pt-BR")}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setSimCoupon(c.code)}
                                className="text-[10px] uppercase font-bold text-[#002045] border border-[#002045] px-2 py-1 hover:bg-[#002045] hover:text-white transition-colors font-[var(--font-inter)]">
                                Usar
                              </button>
                              <button onClick={() => deleteAdminCoupon(c.id)} className="text-[#d32f2f] hover:text-[#b71c1c]">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generated link */}
              <div id="sim-link" />
              {simLink && (
                <div className="mt-6 bg-white border border-[#e2e2e2] p-6 space-y-4">
                  <p className="text-[#002045] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)]">Link gerado</p>

                  <div className="flex gap-2">
                    <input readOnly value={simLink}
                      className="flex-1 border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#43474e] bg-[#fafafa] focus:outline-none select-all"
                      onClick={e => (e.target as HTMLInputElement).select()} />
                    <button
                      onClick={() => { navigator.clipboard.writeText(simLink); setSimLinkCopied(true); setTimeout(() => setSimLinkCopied(false), 2000); }}
                      className="px-4 py-2 text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] hover:bg-[#002045] hover:text-white transition-colors whitespace-nowrap"
                    >
                      {simLinkCopied ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>

                  <a href={`https://wa.me/5592988150149?text=${waText}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 bg-[#25d366] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#1ebe5d] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar via WhatsApp
                  </a>

                  <p className="text-[#b0b4bb] text-[10px] font-[var(--font-inter)] leading-relaxed">
                    {allSpaces.length > 1
                      ? `O link carrega os ${allSpaces.length} ambientes pré-configurados. O cliente só precisa preencher seus dados para finalizar.`
                      : `O link abre o simulador com espaço, produto e ${allSpaces[0]?.plates ?? 0} placas já pré-configurados.`
                    }
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ CHAT IA TAB ═══ */}
        {tab === "chat" && (
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
            <div className="mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal mb-2">Chat IA — Treinamento</h2>
              <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">
                Este é o prompt de sistema do assistente virtual. Edite aqui para corrigir respostas erradas, adicionar novos fatos ou criar regras de comportamento. O assistente usa este texto como base de conhecimento.
              </p>
            </div>

            <div className="bg-white border border-[#e2e2e2] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">Prompt do sistema</p>
                <button
                  onClick={resetChatPrompt}
                  className="text-[9px] uppercase tracking-widest font-bold font-[var(--font-inter)] text-[#74777f] border border-[#e2e2e2] px-3 py-1 hover:border-[#002045] hover:text-[#002045] transition-colors"
                >
                  ↺ Restaurar padrão
                </button>
              </div>

              {!chatPromptLoaded ? (
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p>
              ) : (
                <textarea
                  value={chatPrompt}
                  onChange={e => setChatPrompt(e.target.value)}
                  rows={28}
                  className="w-full border border-[#e2e2e2] px-4 py-3 text-xs font-mono text-[#1a1a1a] focus:outline-none focus:border-[#002045] resize-y leading-relaxed"
                  spellCheck={false}
                />
              )}

              <div className="flex items-center gap-4">
                <button
                  disabled={chatPromptSaving || !chatPromptLoaded}
                  onClick={saveChatPrompt}
                  className="bg-[#002045] text-white text-[10px] uppercase tracking-widest font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-40"
                >
                  {chatPromptSaving ? "Salvando…" : "Salvar e aplicar"}
                </button>
                {chatPromptMsg && (
                  <p className={`text-sm font-[var(--font-inter)] ${chatPromptMsg.startsWith("Erro") ? "text-red-500" : "text-[#2e7d32]"}`}>
                    {chatPromptMsg}
                  </p>
                )}
              </div>

              <div className="border-t border-[#e2e2e2] pt-4">
                <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Dicas de treinamento</p>
                <ul className="text-[11px] font-[var(--font-inter)] text-[#43474e] space-y-1 list-disc list-inside leading-relaxed">
                  <li>Para corrigir uma resposta errada, adicione em <strong>NUNCA DIGA</strong>: ex. <em>"Nunca diga que X — a resposta correta é Y"</em></li>
                  <li>Para adicionar um novo fato, cole no bloco <strong>SOBRE O PRODUTO PFB</strong> ou crie uma nova seção</li>
                  <li>Para mudar o tom (mais formal, mais curto, etc.), edite <strong>INSTRUÇÕES DE COMPORTAMENTO</strong></li>
                  <li>Para atualizar preços, edite o bloco <strong>PREÇOS</strong> diretamente</li>
                  <li>Ao salvar, o novo prompt entra em vigor imediatamente — sem redeploy necessário</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "precos" && authed && (
          <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
            <div className="mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal mb-2">Tabela de Preços — Parceiros</h2>
              <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">
                Altere os preços aqui e eles são atualizados automaticamente no portal do parceiro, nas propostas e nos emails enviados quando a tabela especial é ativada.
              </p>
            </div>

            {!pricingLoaded ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p>
            ) : (
              <div className="space-y-4">
                {(pricingRows.length > 0
                  ? pricingRows
                  : [
                      { linha: "Classic",    special_price: 399, public_price: 559 },
                      { linha: "Brilliance", special_price: 429, public_price: 589 },
                      { linha: "Elegance",   special_price: 499, public_price: 649 },
                    ]
                ).map((row) => {
                  const finish = { Classic: "Mármore Fosco", Brilliance: "Mármore Polido", Elegance: "Madeira Texturizada" }[row.linha] ?? "";
                  const edit = pricingEdits[row.linha] ?? { special: String(row.special_price), public_: String(row.public_price) };
                  return (
                    <div key={row.linha} className="bg-white border border-[#e2e2e2] p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <p className="font-bold text-[#002045] font-[var(--font-inter)]">{row.linha}</p>
                          <p className="text-[#74777f] text-xs font-[var(--font-inter)]">{finish}</p>
                        </div>
                        <span className="text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] border border-[#e2e2e2] px-2 py-1">Placa 2,9×1,2m</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                            Preço especial (parceiro)
                          </label>
                          <div className="flex items-center border border-[#e2e2e2] focus-within:border-[#002045] transition-colors">
                            <span className="text-[#74777f] text-sm font-[var(--font-inter)] pl-3 pr-1">R$</span>
                            <input
                              type="number"
                              min={1}
                              value={edit.special}
                              onChange={(e) => setPricingEdits((prev) => ({ ...prev, [row.linha]: { ...edit, special: e.target.value } }))}
                              className="flex-1 py-2 pr-3 text-sm font-[var(--font-inter)] text-[#002045] font-bold focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                            Preço público (referência)
                          </label>
                          <div className="flex items-center border border-[#e2e2e2] focus-within:border-[#002045] transition-colors">
                            <span className="text-[#74777f] text-sm font-[var(--font-inter)] pl-3 pr-1">R$</span>
                            <input
                              type="number"
                              min={1}
                              value={edit.public_}
                              onChange={(e) => setPricingEdits((prev) => ({ ...prev, [row.linha]: { ...edit, public_: e.target.value } }))}
                              className="flex-1 py-2 pr-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          disabled={pricingSaving[row.linha]}
                          onClick={() => savePricing(row.linha)}
                          className="bg-[#002045] text-white text-[10px] uppercase tracking-widest font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-40"
                        >
                          {pricingSaving[row.linha] ? "Salvando…" : "Salvar"}
                        </button>
                        {pricingMsg[row.linha] && (
                          <p className={`text-sm font-[var(--font-inter)] ${pricingMsg[row.linha].startsWith("Erro") || pricingMsg[row.linha].startsWith("Valores") ? "text-red-500" : "text-[#2e7d32]"}`}>
                            {pricingMsg[row.linha]}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="bg-[#fffbea] border border-[#e6c84a] px-5 py-4">
                  <p className="text-[#6b5000] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-2">Onde estes preços aparecem</p>
                  <ul className="text-[#6b5000] text-xs font-[var(--font-inter)] space-y-1 leading-relaxed">
                    <li>· Portal do parceiro — tabela de preços e seletor de linha no simulador de orçamento</li>
                    <li>· Email enviado quando a tabela especial é ativada para um parceiro</li>
                    <li>· O preço especial é usado nos cálculos de orçamento gerados pelo parceiro</li>
                  </ul>
                </div>

                {/* Regras comerciais do fluxo de orçamento (motor central) */}
                <div className="bg-white border border-[#e2e2e2] p-6 mt-8">
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-1">Regras do orçamento público</h3>
                  <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-5 leading-relaxed">
                    Cola PU, frete, desconto à vista, validade e instalação. Aplicadas em tempo real no site, no PDF e no WhatsApp.
                  </p>
                  {!orcCfg ? (
                    <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p>
                  ) : (
                    <div className="space-y-5">
                      {([
                        ["colaFactorPerPlate", "Cola PU — tubos por placa", "1.5", 0.1],
                        ["freteFreeMinPlates", "Frete grátis a partir de (placas)", "5", 1],
                        ["freteBase", "Frete-base estimado (R$)", "150", 1],
                        ["discountPct", "Desconto à vista (%)", "3", 0.5],
                        ["discountMinPlates", "Desconto a partir de (placas)", "2", 1],
                        ["quoteValidityDays", "Validade do orçamento (dias)", "7", 1],
                      ] as Array<[string, string, string, number]>).reduce<React.ReactNode[][]>((rows, item, i) => {
                        if (i % 2 === 0) rows.push([]);
                        rows[rows.length - 1].push(
                          <div key={item[0]}>
                            <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">{item[1]}</label>
                            <input
                              type="number" step={item[3]} min={0}
                              value={String(orcCfg[item[0]] ?? item[2])}
                              onChange={(e) => setOrcCfgField(item[0], parseFloat(e.target.value))}
                              className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] font-bold focus:outline-none focus:border-[#002045]"
                            />
                          </div>
                        );
                        return rows;
                      }, []).map((pair, i) => (
                        <div key={i} className="grid grid-cols-2 gap-4">{pair}</div>
                      ))}

                      <div>
                        <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Escopo do desconto</label>
                        <select
                          value={String(orcCfg.discountScope ?? "placas")}
                          onChange={(e) => setOrcCfgField("discountScope", e.target.value)}
                          className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                        >
                          <option value="placas">Somente placas</option>
                          <option value="placas_cola">Placas + Cola PU</option>
                          <option value="subtotal">Subtotal dos produtos</option>
                        </select>
                        <p className="text-[#a0a3a8] text-[10px] font-[var(--font-inter)] mt-1">O frete nunca recebe desconto.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Empresa instaladora</label>
                          <input value={String(orcCfg.installerName ?? "")} onChange={(e) => setOrcCfgField("installerName", e.target.value)} className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                        </div>
                        <div>
                          <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Telefone da instaladora</label>
                          <input value={String(orcCfg.installerPhone ?? "")} onChange={(e) => setOrcCfgField("installerPhone", e.target.value)} className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={orcCfg.leadMessageEnabled !== false} onChange={(e) => setOrcCfgField("leadMessageEnabled", e.target.checked)} />
                        <span className="text-[#43474e] text-sm font-[var(--font-inter)]">Enviar mensagem de recuperação de simulação ao lead</span>
                      </label>

                      {/* Follow-ups do orçamento formalizado (§33) */}
                      <div className="border border-[#e2e2e2] p-3">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input type="checkbox" checked={orcCfg.followupEnabled === true} onChange={(e) => setOrcCfgField("followupEnabled", e.target.checked)} />
                          <span className="text-[#43474e] text-sm font-[var(--font-inter)] font-semibold">Acompanhar orçamentos formalizados por WhatsApp</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">1º após (horas)</label>
                            <input type="number" min={1} value={String(orcCfg.followup1Hours ?? 24)} onChange={(e) => setOrcCfgField("followup1Hours", parseInt(e.target.value) || 0)} className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                          </div>
                          <div>
                            <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Último após (horas)</label>
                            <input type="number" min={1} value={String(orcCfg.followup2Hours ?? 72)} onChange={(e) => setOrcCfgField("followup2Hours", parseInt(e.target.value) || 0)} className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                          </div>
                        </div>
                        <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Mensagem 1 <span className="normal-case text-[#a0a3a8]">({'{nome}'}, {'{numero}'})</span></label>
                        <textarea value={String(orcCfg.followup1Message ?? "")} onChange={(e) => setOrcCfgField("followup1Message", e.target.value)} rows={2} className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045] resize-none mb-2" />
                        <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Mensagem 2</label>
                        <textarea value={String(orcCfg.followup2Message ?? "")} onChange={(e) => setOrcCfgField("followup2Message", e.target.value)} rows={2} className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045]" />
                        <p className="text-[#a0a3a8] text-[10px] font-[var(--font-inter)] mt-1">Para ao converter em pedido, ao expirar, no opt-out, ou após os 2 envios. Máx. 1 por dia.</p>
                      </div>

                      <div className="bg-[#f7f8fa] border border-[#e2e2e2] px-4 py-2.5">
                        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] leading-relaxed">
                          Parcelamento sem juros (faixas): 2–4 → 3x · 5–7 → 4x · 8–12 → 6x · 13+ → 10x. Uma placa não recebe promoção automática.
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          disabled={orcCfgSaving}
                          onClick={saveOrcCfg}
                          className="bg-[#002045] text-white text-[10px] uppercase tracking-widest font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-40"
                        >
                          {orcCfgSaving ? "Salvando…" : "Salvar regras"}
                        </button>
                        {orcCfgMsg && (
                          <p className={`text-sm font-[var(--font-inter)] ${orcCfgMsg.startsWith("Erro") ? "text-red-500" : "text-[#2e7d32]"}`}>{orcCfgMsg}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Zonas de frete por CEP */}
                <div className="bg-white border border-[#e2e2e2] p-6 mt-8">
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-1">Zonas de frete por CEP</h3>
                  <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-5 leading-relaxed">
                    Sem nenhuma zona, o frete usa o valor-base. Na formalização, o CEP do cliente define o valor. ≥ 5 placas mantém frete grátis.
                  </p>

                  {freteZones.length > 0 && (
                    <div className="border border-[#e2e2e2] divide-y divide-[#f0f0f0] mb-4">
                      {freteZones.map((z) => (
                        <div key={z.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{z.name}</p>
                            <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                              {z.cep_start && z.cep_end ? `${z.cep_start}–${z.cep_end}` : ""}{z.cep_list ? ` · lista: ${z.cep_list.slice(0, 40)}` : ""}{z.neighborhoods ? ` · ${z.neighborhoods}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[#74777f] text-xs">R$</span>
                            <input type="number" min="0" defaultValue={z.value} onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== z.value) patchFreteZone(z.id, { value: v }); }} className="w-20 border border-[#e2e2e2] px-2 py-1 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                          </div>
                          <label className="flex items-center gap-1 text-[11px] font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                            <input type="checkbox" checked={z.active} onChange={(e) => patchFreteZone(z.id, { active: e.target.checked })} /> ativa
                          </label>
                          <button onClick={() => deleteFreteZone(z.id)} className="text-[#cc0000] hover:text-white hover:bg-[#cc0000] w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors" aria-label="Remover zona">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add zone */}
                  <div className="bg-[#f7f8fa] border border-[#e2e2e2] p-3">
                    <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Nova zona</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input value={newZone.name} onChange={(e) => setNewZone({...newZone, name: e.target.value})} placeholder="Nome (ex. Centro)" className="col-span-2 sm:col-span-1 border border-[#e2e2e2] px-2 py-1.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      <input value={newZone.cep_start} onChange={(e) => setNewZone({...newZone, cep_start: e.target.value})} placeholder="CEP inicial" inputMode="numeric" className="border border-[#e2e2e2] px-2 py-1.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      <input value={newZone.cep_end} onChange={(e) => setNewZone({...newZone, cep_end: e.target.value})} placeholder="CEP final" inputMode="numeric" className="border border-[#e2e2e2] px-2 py-1.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      <div className="flex items-center gap-1">
                        <span className="text-[#74777f] text-xs">R$</span>
                        <input value={newZone.value} onChange={(e) => setNewZone({...newZone, value: e.target.value})} placeholder="150" inputMode="decimal" className="w-full border border-[#e2e2e2] px-2 py-1.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      </div>
                    </div>
                    <input value={newZone.neighborhoods} onChange={(e) => setNewZone({...newZone, neighborhoods: e.target.value})} placeholder="Bairros (opcional, referência)" className="w-full mt-2 border border-[#e2e2e2] px-2 py-1.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <button onClick={addFreteZone} disabled={zoneSaving || !newZone.name.trim()} className="mt-2 bg-[#002045] text-white text-[10px] uppercase tracking-widest font-bold font-[var(--font-inter)] px-5 py-2 hover:bg-[#1a365d] transition-colors disabled:opacity-40">
                      {zoneSaving ? "Salvando…" : "Adicionar zona"}
                    </button>
                  </div>

                  {/* CEP tester */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Testar CEP</span>
                    <input value={cepTest} onChange={(e) => setCepTest(e.target.value)} placeholder="69010-000" inputMode="numeric" className="border border-[#e2e2e2] px-2 py-1.5 text-sm font-[var(--font-inter)] text-[#002045] w-36 focus:outline-none focus:border-[#002045]" />
                    {cepTest.replace(/\D/g, "").length >= 8 && (() => {
                      const z = zoneForCep(cepTest);
                      return <span className={`text-xs font-semibold font-[var(--font-inter)] ${z ? "text-[#3b6934]" : "text-[#74777f]"}`}>{z ? `${z.name} — R$ ${z.value}` : "Sem zona → frete-base"}</span>;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        </main>
      </div>

      {/* Cancelar comissão A pagar */}
      {cancelCommTarget && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={() => { if (!cancelSubmitting) setCancelCommTarget(null); }}>
          <div className="bg-white w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#cc0000] px-5 py-3">
              <p className="text-white font-[var(--font-noto-serif)] text-base">Cancelar comissão</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-[#43474e] text-[13px] font-[var(--font-inter)] leading-relaxed">
                Cancela apenas a comissão gerada — <strong>não</strong> exclui o orçamento, pedido, cliente ou projeto. Comissões já pagas não podem ser canceladas aqui.
              </p>
              <div className="space-y-2">
                {cancelCommTarget.partnerEligible && (
                  <label className="flex items-center justify-between gap-3 border border-[#e2e2e2] px-3 py-2 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-[var(--font-inter)] text-[#002045]">
                      <input type="checkbox" checked={cancelWhich.partner} onChange={(e) => setCancelWhich((w) => ({ ...w, partner: e.target.checked }))} />
                      Parceiro — {cancelCommTarget.partnerName}
                    </span>
                    <span className="text-sm font-semibold text-[#002045]">{fmt(cancelCommTarget.partnerAmount)}</span>
                  </label>
                )}
                {cancelCommTarget.repEligible && (
                  <label className="flex items-center justify-between gap-3 border border-[#e2e2e2] px-3 py-2 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-[var(--font-inter)] text-[#002045]">
                      <input type="checkbox" checked={cancelWhich.rep} onChange={(e) => setCancelWhich((w) => ({ ...w, rep: e.target.checked }))} />
                      Representante — {cancelCommTarget.repName}
                    </span>
                    <span className="text-sm font-semibold text-[#1a365d]">{fmt(cancelCommTarget.repAmount)}</span>
                  </label>
                )}
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Motivo do cancelamento</label>
                <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} placeholder="Ex.: status marcado por engano / cliente não aprovou o projeto" className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045] resize-none" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (confirm("Confirmar o cancelamento das comissões selecionadas? Elas sairão de 'A pagar' e ficarão no histórico como Canceladas.")) void submitCancelCommission(); }}
                  disabled={cancelSubmitting || (!cancelWhich.partner && !cancelWhich.rep)}
                  className="flex-1 bg-[#cc0000] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] py-2.5 hover:bg-[#a30000] transition-colors disabled:opacity-50"
                >
                  {cancelSubmitting ? "Cancelando…" : "Cancelar comissão"}
                </button>
                <button onClick={() => setCancelCommTarget(null)} disabled={cancelSubmitting} className="flex-1 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] py-2.5 hover:border-[#002045] transition-colors disabled:opacity-50">
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recorte 1:1 da imagem de capa/antes do projeto */}
      {coverCrop && (
        <SquareCropper
          file={coverCrop.file}
          onCancel={() => setCoverCrop(null)}
          onCropped={handleCroppedCover}
        />
      )}

      {/* Toast discreto (autosave de mídia: categoria, capa, descrição) */}
      {mediaToast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 text-xs font-semibold font-[var(--font-inter)] shadow-lg ${mediaToast.error ? "bg-[#cc0000] text-white" : "bg-[#002045] text-white"}`}>
          {mediaToast.text}
        </div>
      )}
    </div>
  );
}
