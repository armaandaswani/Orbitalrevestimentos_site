"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SITE_ASSET_MANIFEST } from "@/lib/assets";

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
  portal_password: string | null;
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
  portal_password: string | null;
  status: "active" | "inactive";
  created_at: string;
  birthday: string | null;
}

interface ProductImage { id:string; product_id:string; image_path:string; sort_order:number; }
interface DbProduct { id:string; code:string; name:string; linha:"Classic"|"Brilliance"|"Elegance"; finish:string; price:number; price_per_m2:number; description:string; image_path:string; is_active:boolean; sort_order:number; created_at:string; product_images?: ProductImage[]; }
interface DbPhotoProject { id:string; slug:string; title:string; product_code:string; categories:string[]; image_after:string; image_before:string; note:string; is_active:boolean; sort_order:number; }
interface DbRenderProject { id:string; slug:string; title:string; product_code:string; image_path:string; is_active:boolean; sort_order:number; }
interface ProjectMedia { id:string; project_slug:string; type:"image"|"video"; url:string; caption:string|null; sort_order:number; }

interface CouponUse {
  id: string;
  partner_id: string;
  coupon_code: string;
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
  sale_status: "em_orcamento" | "concluido" | "cancelado" | null;
  sales_rep_referral_code: string | null;
  sales_rep_commission_owed: number | null;
  created_at: string;
  partner_commission_paid_at: string | null;
  rep_commission_paid_at: string | null;
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

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

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
  const [tab, setTab] = useState<"partners" | "representantes" | "orcamentos" | "campaigns" | "drip" | "commissions" | "produtos" | "projetos" | "midia" | "simulador">("partners");
  const [commissionFilter, setCommissionFilter] = useState<"a_pagar" | "pago" | "tudo">("a_pagar");

  // Partners
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
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
  }

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

  const [clients, setClients] = useState<ClientSeq[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsExporting, setClientsExporting] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [clientPartnerFilter, setClientPartnerFilter] = useState<string>("all");
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

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
  const [productForm, setProductForm] = useState({ code:"", name:"", linha:"Classic" as "Classic"|"Brilliance"|"Elegance", finish:"Fosco", price:559, price_per_m2:161, description:"", image_path:"", is_active:true, sort_order:0 });
  const [productFormError, setProductFormError] = useState("");
  const [productFormLoading, setProductFormLoading] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [productImageSubstituting, setProductImageSubstituting] = useState<string | null>(null); // product id being substituted from list
  const [productImageDims, setProductImageDims] = useState<Record<string, {w: number, h: number}>>({});
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
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
  const [photoForm, setPhotoForm] = useState({ slug:"", title:"", product_code:"", categories:[] as string[], image_after:"", image_before:"", note:"", is_active:true, sort_order:0 });
  const [renderForm, setRenderForm] = useState({ slug:"", title:"", product_code:"", image_path:"", is_active:true, sort_order:0 });
  const [projectMediaMap, setProjectMediaMap] = useState<Record<string, ProjectMedia[]>>({});
  const [expandedMediaSlug, setExpandedMediaSlug] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");

  // ── Admin simulator ──────────────────────────────────────────────────────
  interface SimSpace { key: string; spaceName: string; productCode: string; w: string; h: string; }
  const [simSpaces, setSimSpaces] = useState<SimSpace[]>([]);
  const [simSpaceName, setSimSpaceName] = useState("");
  const [simProductCode, setSimProductCode] = useState("");
  const [simW, setSimW] = useState("");
  const [simH, setSimH] = useState("");
  const [simCoupon, setSimCoupon] = useState("");
  const [simLink, setSimLink] = useState("");
  const [simLinkCopied, setSimLinkCopied] = useState(false);

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

  // Dynamic project categories (persisted in localStorage)
  const BASE_CATEGORIES = ["residencial", "comercial", "umido", "nautico"];
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("orbital_custom_cats");
      if (stored) setCustomCategories(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const allCategories = useMemo(() => {
    const fromProjects = (dbPhotoProjects ?? []).flatMap((p) => p.categories ?? []);
    return Array.from(new Set([...BASE_CATEGORIES, ...customCategories, ...fromProjects])).sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbPhotoProjects, customCategories]);

  function saveCustomCategories(list: string[]) {
    setCustomCategories(list);
    try { localStorage.setItem("orbital_custom_cats", JSON.stringify(list)); } catch { /* ignore */ }
  }

  function addNewCategory(raw: string) {
    const name = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || allCategories.includes(name)) return name;
    saveCustomCategories([...customCategories, name]);
    return name;
  }

  function removeCustomCategory(name: string) {
    saveCustomCategories(customCategories.filter((c) => c !== name));
  }

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    const stored = sessionStorage.getItem("orbital_admin_auth");
    if (stored === "1") setAuthed(true);
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
    const res = await fetch("/api/coupons/use");
    if (res.ok) setUses(await res.json());
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
    const res = await fetch("/api/admin/clients");
    if (res.ok) setClients(await res.json());
    setClientsLoading(false);
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
    const res = await fetch("/api/products");
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

  useEffect(() => {
    if (tab === "campaigns" && authed) loadCampaigns();
  }, [tab, authed, loadCampaigns]);

  useEffect(() => {
    if (tab === "drip" && authed) fetchDripSteps();
  }, [tab, authed, fetchDripSteps]);

  useEffect(() => {
    if (tab === "orcamentos" && authed) { fetchClients(); fetchUses(); }
  }, [tab, authed, fetchClients, fetchUses]);

  useEffect(() => { if ((tab === "produtos" || tab === "simulador") && authed) fetchDbProducts(); }, [tab, authed, fetchDbProducts]);
  useEffect(() => { if (tab === "projetos" && authed) fetchProjects(); }, [tab, authed, fetchProjects]);
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

  async function deleteClient(id: string, isStandalone?: boolean) {
    if (!confirm(isStandalone ? "Excluir este orçamento permanentemente?" : "Excluir este cliente e toda a sua sequência de emails?")) return;
    setDeletingClientId(id);
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
    perM2: "R$ 161",
    perDay: "R$ 1",
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

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PW) {
      sessionStorage.setItem("orbital_admin_auth", "1");
      setAuthed(true);
    } else {
      setPwError("Senha incorreta.");
    }
  }

  async function handleAdminChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) { setCpError("As senhas não coincidem."); return; }
    if (cpNew.length < 6) { setCpError("A nova senha deve ter pelo menos 6 caracteres."); return; }
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
  async function uploadDirect(file: File, folder: string): Promise<string | null> {
    // Step 1: get a signed upload URL from our API (tiny JSON request, no file bytes)
    const signRes = await fetch("/api/admin/upload-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
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
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
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
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify(productForm),
      });
    } else {
      res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify(productForm),
      });
    }
    const json = await res.json();
    setProductFormLoading(false);
    if (!res.ok) { setProductFormError(json.error || "Erro desconhecido."); return; }
    setShowProductForm(false);
    setEditingProductId(null);
    setProductForm({ code:"", name:"", linha:"Classic", finish:"Fosco", price:559, price_per_m2:161, description:"", image_path:"", is_active:true, sort_order:0 });
    fetchDbProducts();
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Excluir produto "${name}"?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE", headers: { "x-admin-auth": ADMIN_PW } });
    fetchDbProducts();
  }

  function startEditProduct(p: DbProduct) {
    setEditingProductId(p.id);
    setProductForm({ code: p.code, name: p.name, linha: p.linha, finish: p.finish, price: p.price, price_per_m2: p.price_per_m2, description: p.description, image_path: p.image_path, is_active: p.is_active, sort_order: p.sort_order });
    setProductFormError("");
    setGalleryImages(p.product_images ?? []);
    setShowProductForm(true);
    setTimeout(() => productTabFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
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
    const res = await fetch(`/api/products/images/${imageId}`, { method: "DELETE", headers: { "x-admin-auth": ADMIN_PW } });
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
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify({ sort_order: bOrder }),
      }),
      fetch(`/api/products/images/${galleryImages[newIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify({ sort_order: aOrder }),
      }),
    ]);
  }

  // ── Photo Project CRUD ───────────────────
  async function handlePhotoSubmit(e: React.FormEvent) {
    e.preventDefault();
    let res: Response;
    if (editingPhotoId) {
      res = await fetch(`/api/projects/photos/${editingPhotoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify(photoForm),
      });
    } else {
      res = await fetch("/api/projects/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify(photoForm),
      });
    }
    if (res.ok) {
      setShowPhotoForm(false);
      setEditingPhotoId(null);
      setPhotoForm({ slug:"", title:"", product_code:"", categories:[], image_after:"", image_before:"", note:"", is_active:true, sort_order:0 });
      fetchProjects();
    }
  }

  async function deletePhoto(id: string, title: string) {
    if (!confirm(`Excluir projeto "${title}"?`)) return;
    await fetch(`/api/projects/photos/${id}`, { method: "DELETE", headers: { "x-admin-auth": ADMIN_PW } });
    fetchProjects();
  }

  function startEditPhoto(p: DbPhotoProject) {
    setEditingPhotoId(p.id);
    setPhotoForm({ slug: p.slug, title: p.title, product_code: p.product_code, categories: p.categories, image_after: p.image_after, image_before: p.image_before, note: p.note, is_active: p.is_active, sort_order: p.sort_order });
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
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify(renderForm),
      });
    } else {
      res = await fetch("/api/projects/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
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
    await fetch(`/api/projects/renders/${id}`, { method: "DELETE", headers: { "x-admin-auth": ADMIN_PW } });
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
    const res = await fetch(`/api/projects/media?slug=${slug}`, { headers: { "x-admin-auth": ADMIN_PW } });
    if (res.ok) {
      const data = await res.json();
      setProjectMediaMap((prev) => ({ ...prev, [slug]: data }));
    }
  }

  async function addProjectMediaImage(slug: string, file: File) {
    setMediaUploading(true);
    const url = await uploadDirect(file, "projetos");
    if (url) {
      const existing = projectMediaMap[slug] ?? [];
      await fetch("/api/projects/media", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify({ project_slug: slug, type: "image", url, sort_order: existing.length }),
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
      headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
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
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
        body: JSON.stringify({ project_slug: slug, type: "video", url, sort_order: existing.length }),
      });
      await fetchProjectMedia(slug);
    }
    setMediaUploading(false);
  }

  async function deleteProjectMedia(id: string, slug: string) {
    await fetch(`/api/projects/media/${id}`, { method: "DELETE", headers: { "x-admin-auth": ADMIN_PW } });
    await fetchProjectMedia(slug);
  }

  async function importStaticRender(render: { slug: string; title: string; product_code: string; image_path: string }, idx: number) {
    setRenderImporting(render.slug);
    await fetch("/api/projects/renders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
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
        headers: { "Content-Type": "application/json", "x-admin-auth": ADMIN_PW },
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
      portal_password: p.portal_password || "",
      status: p.status,
      sales_rep_referral_code: p.sales_rep_referral_code || "",
      birthday: p.birthday ? p.birthday.split("T")[0] : "",
      profession: PROFESSIONS.includes(p.profession || "") ? (p.profession || "") : (p.profession ? "Outro" : ""),
      has_special_table: p.has_special_table ?? false,
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
    const payload = { ...partnerForm, coupon_code: partnerForm.coupon_code.toUpperCase(), portal_password: partnerForm.portal_password || null, sales_rep_referral_code: partnerForm.sales_rep_referral_code || null, profession: resolvedProfession };
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
      body: JSON.stringify({ ...approvalForm, portal_password: approvalForm.portal_password || null, status: "active" }),
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
    if (p.portal_password) lines.push(`🔑 Senha: ${p.portal_password}`);
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
      portal_password: r.portal_password || "",
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
    const payload = { ...repForm, referral_code: repForm.referral_code.toUpperCase(), portal_password: repForm.portal_password || null };
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
  async function updateSaleStatus(clientId: string, useId: string | null, sale_status: string, isStandalone?: boolean) {
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
  const activePartners = partners.filter((p) => p.status !== "pending");

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
          client_email: "",
          client_phone: null as string | null,
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
        };
      });

    // Merge, sort by created_at descending
    return [...fromSeqs, ...standaloneUses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [clients, useById, uses, partners]);

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
    });
  }, [enrichedClients, clientSearch, clientPartnerFilter, clientStatusFilter]);

  const orcamentosStats = useMemo(() => {
    const getStatus = (c: typeof filteredClients[0]) => c.sale_status ?? c.couponUse?.sale_status ?? "em_orcamento";
    const emAberto = filteredClients.filter((c) => getStatus(c) === "em_orcamento").length;
    const concluidos = filteredClients.filter((c) => getStatus(c) === "concluido").length;
    const totalReceita = filteredClients.reduce((sum, c) => sum + (c.total ?? 0), 0);
    const comParceiro = filteredClients.filter((c) => !!c.couponUse).length;
    const dripAtivos = filteredClients.filter((c) => c.status === "active").length;
    return { emAberto, concluidos, totalReceita, comParceiro, dripAtivos };
  }, [filteredClients]);

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

  const inputCls = "w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]";
  const labelCls = "block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2";

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
          <button onClick={() => { sessionStorage.removeItem("orbital_admin_auth"); setAuthed(false); }} className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors">
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

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-1 mb-8 border-b border-[#e2e2e2] flex-wrap">
          {(["partners", "representantes", "orcamentos", "campaigns", "drip", "commissions", "produtos", "projetos", "midia", "simulador"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-6 py-3 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === t ? "border-[#002045] text-[#002045]" : "border-transparent text-[#74777f] hover:text-[#002045]"}`}>
              {t === "partners" ? "Parceiros" : t === "representantes" ? "Representantes" : t === "orcamentos" ? "Orçamentos" : t === "campaigns" ? "Campanhas" : t === "drip" ? "Drip de Emails" : t === "commissions" ? "Comissões" : t === "produtos" ? "Produtos" : t === "projetos" ? "Projetos" : t === "midia" ? "Mídia" : "Simulador"}
              {t === "partners" && pendingPartners.length > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingPartners.length}
                </span>
              )}
            </button>
          ))}
        </div>

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
                          <button onClick={() => { setApprovingId(approvingId === p.id ? null : p.id); setApprovalForm({ discount_type: "percentage", discount_value: 10, commission_type: "percentage", commission_value: 5, portal_password: p.portal_password || "" }); }}
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
                              <input value={approvalForm.portal_password} onChange={(e) => setApprovalForm({ ...approvalForm, portal_password: e.target.value })} className={inputCls + " pr-10"} type={showApprovalPw ? "text" : "password"} placeholder="Opcional" />
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
                  <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
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
                </div>
              );
            })()}

            {/* Active partners */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Parceiros</h2>
              <button onClick={startCreatePartner} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors">
                + Novo Parceiro
              </button>
            </div>

            {newlyCreatedPartner && !showPartnerForm && (
              <div className="bg-green-50 border border-green-200 px-6 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-green-900 text-sm font-[var(--font-inter)] font-semibold mb-0.5">Parceiro criado!</p>
                  <p className="text-green-700 text-xs font-[var(--font-inter)]">
                    Cupom: <strong>{newlyCreatedPartner.coupon_code}</strong>
                    {newlyCreatedPartner.portal_password && <> · Senha: <strong>{newlyCreatedPartner.portal_password}</strong></>}
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
                    <div>
                      <label className={labelCls}>Senha do Portal <span className="normal-case font-normal">(acesso parceiro)</span></label>
                      <div className="relative">
                        <input value={partnerForm.portal_password} onChange={(e) => setPartnerForm({ ...partnerForm, portal_password: e.target.value })} className={inputCls + " pr-10"} type={showPartnerPw ? "text" : "password"} placeholder="Deixe em branco para sem acesso" />
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
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
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
                      <tr><td colSpan={10} className="px-5 py-8 text-center text-[#74777f]">Nenhum parceiro cadastrado.</td></tr>
                    ) : (
                      activePartners.map((p) => (
                        <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                          <td className="px-5 py-4"><p className="font-semibold text-[#002045]">{p.name}</p>{p.email && <p className="text-xs text-[#74777f]">{p.email}</p>}</td>
                          <td className="px-5 py-4"><span className="bg-[#eef2f8] text-[#002045] px-2 py-1 text-xs font-bold tracking-wider">{p.coupon_code}</span></td>
                          <td className="px-5 py-4 text-xs text-[#43474e]">{p.profession || <span className="italic text-[#74777f]">—</span>}</td>
                          <td className="px-5 py-4 text-[#43474e]">{p.discount_type === "percentage" ? `${p.discount_value}%` : fmt(p.discount_value)}</td>
                          <td className="px-5 py-4 text-[#43474e]">{p.commission_type === "percentage" ? `${p.commission_value}%` : fmt(p.commission_value)}</td>
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
                          <td className="px-5 py-4 text-xs text-[#74777f]">{p.portal_password ? <span className="font-mono text-[#43474e]">{p.portal_password}</span> : <span className="italic">—</span>}</td>
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
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
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
            </div>

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
                        <input value={repForm.portal_password} onChange={(e) => setRepForm({ ...repForm, portal_password: e.target.value })} className={inputCls + " pr-10"} type={showRepPw ? "text" : "password"} placeholder="Deixe em branco para sem acesso" />
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
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
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
                              <td className="px-5 py-4 text-xs text-[#74777f]">{r.portal_password ? <span className="font-mono text-[#43474e]">{r.portal_password}</span> : <span className="italic">—</span>}</td>
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
                                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold font-[var(--font-inter)] text-[#74777f] mb-1">
                                      Texto do e-mail <span className="text-[#9e9e9e] normal-case tracking-normal font-normal">— cada linha vira um parágrafo</span>
                                    </label>
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
                                      const blocks = extractEmailBlocks(c.html_body);
                                      if (blocks) {
                                        setCampaignEditMode("visual");
                                        setCampaignVisualHeadline(blocks.headline);
                                        setCampaignVisualSubheadline(blocks.subheadline);
                                        setCampaignVisualBody(blocks.body);
                                        setCampaignVisualImageUrl(blocks.imageUrl);
                                        setCampaignVisualCtaText(blocks.ctaText);
                                        setCampaignVisualCtaUrl(blocks.ctaUrl);
                                      } else {
                                        setCampaignEditMode("html");
                                        setCampaignVisualHeadline("");
                                        setCampaignVisualSubheadline("");
                                        setCampaignVisualBody("");
                                        setCampaignVisualImageUrl("");
                                        setCampaignVisualCtaText("Ver no site");
                                        setCampaignVisualCtaUrl("https://orbitalrevestimentos.com.br");
                                      }
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
                <button
                  onClick={exportClients}
                  disabled={clientsExporting}
                  className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                >
                  {clientsExporting ? "Exportando..." : "Exportar CSV"}
                </button>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail…"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[220px]"
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
              </div>
            </div>

            {/* Stats bar */}
            {!clientsLoading && !loadingUses && filteredClients.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                {[
                  { label: "Total", value: filteredClients.length, sub: "orçamentos" },
                  { label: "Em aberto", value: orcamentosStats.emAberto, sub: "em orçamento" },
                  { label: "Concluídos", value: orcamentosStats.concluidos, sub: "finalizados" },
                  { label: "Receita pot.", value: orcamentosStats.totalReceita.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }), sub: "sem descontos" },
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

            {clientsLoading || loadingUses ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
            ) : filteredClients.length === 0 ? (
              <div className="bg-white border border-[#e2e2e2] px-6 py-12 text-center">
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum orçamento encontrado.</p>
              </div>
            ) : (
              <>
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
                      {filteredClients.map((c) => {
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
                              <p className={`text-[9px] mt-0.5 ${age.cls}`}>{age.label}</p>
                            </td>
                            {/* Cliente + WA */}
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#002045] text-xs truncate">{c.client_name}</p>
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
                                onChange={(e) => updateSaleStatus(c.id, cu?.id ?? null, e.target.value, c._isStandaloneUse)}
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
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => deleteClient(c.id, c._isStandaloneUse)}
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
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-3">
                  {filteredClients.map((c) => {
                    const cu = c.couponUse;
                    const saleStatus = c.sale_status ?? cu?.sale_status ?? "em_orcamento";
                    const stMeta = STATUS_LABELS[saleStatus] ?? STATUS_LABELS.em_orcamento;
                    const age = ageBadge(c.created_at, c.status);
                    const waHref = c.client_phone ? `https://wa.me/55${c.client_phone.replace(/\D/g, "")}` : null;
                    return (
                      <div key={c.id} className="bg-white border border-[#e2e2e2] px-5 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#002045] text-sm font-[var(--font-inter)] truncate">{c.client_name}</p>
                            <p className="text-xs text-[#74777f] font-[var(--font-inter)] truncate">{c.client_email}</p>
                            {waHref && (
                              <a href={waHref} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#3b6934] font-bold hover:underline">WA {c.client_phone}</a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <select
                              value={saleStatus}
                              onChange={(e) => updateSaleStatus(c.id, cu?.id ?? null, e.target.value, c._isStandaloneUse)}
                              className={`text-[10px] font-bold px-2 py-0.5 border-0 cursor-pointer focus:outline-none ${stMeta.cls}`}
                            >
                              <option value="em_orcamento">Em orçamento</option>
                              <option value="concluido">Concluído</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                            <button onClick={() => deleteClient(c.id, c._isStandaloneUse)} disabled={deletingClientId === c.id} className="text-red-400 hover:text-red-600 disabled:opacity-40">
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
                      </div>
                    );
                  })}
                </div>
              </>
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
              {["{{firstName}}", "{{clientName}}", "{{spaceLabel}}", "{{model}}", "{{finish}}", "{{plates}}", "{{area}}", "{{total}}", "{{partnerFirst}}", "{{partnerName}}", "{{waLink}}", "{{quoteCard}}", "{{perM2}}", "{{perDay}}"].join(", ")}
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
              const concludedAll = uses.filter(u => u.sale_status === "concluido");
              const totalUnpaidPartner = concludedAll.filter(u => !u.partner_commission_paid_at && u.commission_owed).reduce((a, u) => a + (u.commission_owed ?? 0), 0);
              const totalUnpaidRep = concludedAll.filter(u => u.sales_rep_commission_owed && !u.rep_commission_paid_at).reduce((a, u) => a + (u.sales_rep_commission_owed ?? 0), 0);
              const thisMonth = new Date();
              const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
              const paidThisMonth = concludedAll
                .filter(u => (u.partner_commission_paid_at && u.partner_commission_paid_at >= monthStart) || (u.rep_commission_paid_at && u.rep_commission_paid_at >= monthStart))
                .reduce((a, u) => {
                  let sum = 0;
                  if (u.partner_commission_paid_at && u.partner_commission_paid_at >= monthStart) sum += (u.commission_owed ?? 0);
                  if (u.rep_commission_paid_at && u.rep_commission_paid_at >= monthStart) sum += (u.sales_rep_commission_owed ?? 0);
                  return a + sum;
                }, 0);

              const pendingRows = concludedAll.filter(u => !u.partner_commission_paid_at || (u.sales_rep_commission_owed && !u.rep_commission_paid_at));
              const paidRows = concludedAll.filter(u => u.partner_commission_paid_at && (!u.sales_rep_commission_owed || u.rep_commission_paid_at));

              const displayRows = commissionFilter === "a_pagar" ? pendingRows : commissionFilter === "pago" ? paidRows : concludedAll;

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

                  {/* Table */}
                  <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                    <table className="w-full text-sm font-[var(--font-inter)]">
                      <thead>
                        <tr className="border-b border-[#e2e2e2]">
                          {["Data","Cupom","Rep.","Produto","Com. Parceiro","Status Parceiro","Com. Rep.","Status Rep."].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.length === 0 ? (
                          <tr><td colSpan={8} className="px-5 py-8 text-center text-[#74777f]">Nenhuma comissão encontrada.</td></tr>
                        ) : displayRows.map(u => (
                          <tr key={u.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                            <td className="px-4 py-3 text-xs text-[#43474e] whitespace-nowrap">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                            <td className="px-4 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{u.coupon_code}</span></td>
                            <td className="px-4 py-3 text-xs text-[#74777f]">{u.sales_rep_referral_code || "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.product_name || "—"}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-[#002045]">{u.commission_owed ? fmt(u.commission_owed) : "—"}</td>
                            <td className="px-4 py-3">
                              {u.partner_commission_paid_at ? (
                                <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                                  ✓ Pago {new Date(u.partner_commission_paid_at).toLocaleDateString("pt-BR")}
                                </span>
                              ) : u.commission_owed ? (
                                <button onClick={() => markCommissionPaid(u.id, "partner")}
                                  className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold tracking-wide hover:bg-yellow-200 transition-colors cursor-pointer">
                                  A pagar — Marcar pago
                                </button>
                              ) : <span className="text-[#ccc]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-[#1a365d]">{u.sales_rep_commission_owed ? fmt(u.sales_rep_commission_owed) : "—"}</td>
                            <td className="px-4 py-3">
                              {!u.sales_rep_commission_owed ? <span className="text-[#ccc]">—</span> :
                               u.rep_commission_paid_at ? (
                                <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                                  ✓ Pago {new Date(u.rep_commission_paid_at).toLocaleDateString("pt-BR")}
                                </span>
                              ) : (
                                <button onClick={() => markCommissionPaid(u.id, "rep")}
                                  className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold tracking-wide hover:bg-yellow-200 transition-colors cursor-pointer">
                                  A pagar — Marcar pago
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  setProductForm({ code:"", name:"", linha:"Classic", finish:"Fosco", price:559, price_per_m2:161, description:"", image_path:"", is_active:true, sort_order:0 });
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
                    <label className={labelCls}>Descrição</label>
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
                      {galleryImages.length === 0 ? (
                        <p className="text-[#b0b0b0] text-xs font-[var(--font-inter)] text-center py-4">
                          Nenhuma imagem adicional. Adicione fotos de ambientes, detalhes e texturas.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          {[...galleryImages].sort((a, b) => a.sort_order - b.sort_order).map((img, idx, sorted) => (
                            <div key={img.id} className="relative group aspect-square bg-[#f0f0f0] overflow-hidden">
                              <img src={img.image_path} alt="" className="w-full h-full object-cover" />
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
                        Passe o mouse sobre uma foto para reordenar (← →), definir como capa ou remover. O número indica a posição na galeria.
                      </p>
                    </div>
                  )}

                  <div className="mb-6 flex items-center gap-2">
                    <input type="checkbox" id="prod-active" checked={productForm.is_active} onChange={(e) => setProductForm({...productForm, is_active: e.target.checked})} className="w-4 h-4" />
                    <label htmlFor="prod-active" className="text-sm font-[var(--font-inter)] text-[#43474e]">Produto ativo</label>
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
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
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
            )}
          </div>
        )}

        {/* ═══ PROJETOS TAB ═══ */}
        {tab === "projetos" && (
          <div>
            {/* ── Categories management panel ── */}
            <div className="bg-white border border-[#e2e2e2] p-4 mb-8">
              <p className="font-[var(--font-inter)] text-[10px] tracking-[0.15em] uppercase font-bold text-[#002045] mb-3">Categorias de Projetos</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {allCategories.map((cat) => {
                  const isBase = BASE_CATEGORIES.includes(cat);
                  const isFromProject = !isBase && !customCategories.includes(cat);
                  return (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold font-[var(--font-inter)] tracking-wide ${isBase ? "bg-[#eef2f8] text-[#002045]" : "bg-[#f0f5ec] text-[#3b6934]"}`}
                    >
                      {cat}
                      {isBase && <span className="text-[9px] font-normal text-[#74777f] tracking-normal">base</span>}
                      {isFromProject && <span className="text-[9px] font-normal text-[#74777f] tracking-normal">via projeto</span>}
                      {!isBase && !isFromProject && (
                        <button
                          type="button"
                          onClick={() => removeCustomCategory(cat)}
                          title="Remover categoria"
                          className="text-[#74777f] hover:text-red-600 transition-colors leading-none ml-0.5"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
              {/* Quick-add a standalone category */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addNewCategory(newCatInput);
                      setNewCatInput("");
                    }
                  }}
                  className="border border-[#e2e2e2] px-3 py-1.5 text-sm font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045] w-48"
                  placeholder="nova categoria..."
                />
                <button
                  type="button"
                  onClick={() => { addNewCategory(newCatInput); setNewCatInput(""); }}
                  className="px-3 py-1.5 bg-[#002045] text-white text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#1a365d] transition-colors whitespace-nowrap"
                >
                  + Criar
                </button>
              </div>
              <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-2">
                Categorias &ldquo;base&rdquo; são fixas. Categorias &ldquo;via projeto&rdquo; existem pois já estão em uso — para removê-las edite os projetos que as usam. Categorias criadas aqui aparecem imediatamente nos formulários.
              </p>
            </div>

            {/* Section 1: Fotos Reais */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Fotos Reais</h3>
                <button
                  onClick={() => {
                    setEditingPhotoId(null);
                    setPhotoForm({ slug:"", title:"", product_code:"", categories:[], image_after:"", image_before:"", note:"", is_active:true, sort_order:0 });
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className={labelCls}>Slug *</label>
                        <input required type="text" value={photoForm.slug} onChange={(e) => setPhotoForm({...photoForm, slug: e.target.value})} className={inputCls} placeholder="lavabo1" />
                      </div>
                      <div>
                        <label className={labelCls}>Título *</label>
                        <input required type="text" value={photoForm.title} onChange={(e) => setPhotoForm({...photoForm, title: e.target.value})} className={inputCls} placeholder="Lavabo" />
                      </div>
                      <div>
                        <label className={labelCls}>Código do produto</label>
                        <input type="text" value={photoForm.product_code} onChange={(e) => setPhotoForm({...photoForm, product_code: e.target.value})} className={inputCls} placeholder="ORB-004 · Louro Freijó" />
                      </div>
                      <div>
                        <label className={labelCls}>Nota</label>
                        <input type="text" value={photoForm.note} onChange={(e) => setPhotoForm({...photoForm, note: e.target.value})} className={inputCls} placeholder="Área úmida" />
                      </div>
                      <div>
                        <label className={labelCls}>Sort Order</label>
                        <input type="number" min="0" value={photoForm.sort_order} onChange={(e) => setPhotoForm({...photoForm, sort_order: parseInt(e.target.value) || 0})} className={inputCls} />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Categorias</label>
                      <div className="flex flex-wrap gap-3 mb-2">
                        {allCategories.map((cat) => (
                          <label key={cat} className="flex items-center gap-1.5 text-sm font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                            <input type="checkbox" checked={photoForm.categories.includes(cat)} onChange={(e) => {
                              setPhotoForm({...photoForm, categories: e.target.checked ? [...photoForm.categories, cat] : photoForm.categories.filter(c => c !== cat)});
                            }} className="w-4 h-4" />
                            {cat}
                          </label>
                        ))}
                      </div>
                      {/* Inline: add a brand-new category */}
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newCatInput}
                          onChange={(e) => setNewCatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const name = addNewCategory(newCatInput);
                              if (name && !photoForm.categories.includes(name)) {
                                setPhotoForm(prev => ({ ...prev, categories: [...prev.categories, name] }));
                              }
                              setNewCatInput("");
                            }
                          }}
                          className="border border-[#e2e2e2] px-3 py-1.5 text-sm font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045] w-44"
                          placeholder="nova categoria..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const name = addNewCategory(newCatInput);
                            if (name && !photoForm.categories.includes(name)) {
                              setPhotoForm(prev => ({ ...prev, categories: [...prev.categories, name] }));
                            }
                            setNewCatInput("");
                          }}
                          className="px-3 py-1.5 bg-[#002045] text-white text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] hover:bg-[#1a365d] transition-colors whitespace-nowrap"
                        >
                          + Criar
                        </button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Imagem Depois *</label>
                      {photoForm.image_after ? (
                        <div className="border border-[#e2e2e2]">
                          <img src={photoForm.image_after} alt="Imagem Depois" className="w-full max-h-48 object-cover" />
                          <div className="flex border-t border-[#e2e2e2]">
                            <a href={photoForm.image_after} download target="_blank" rel="noopener noreferrer"
                              className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] text-[#1a365d] hover:bg-[#eef2f8] transition-colors">
                              ↓ Download
                            </a>
                            <label className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors cursor-pointer">
                              {projectImageUploading ? "Enviando…" : "Substituir"}
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setProjectImageUploading(true);
                                const url = await uploadDirect(file, "projetos");
                                setProjectImageUploading(false);
                                if (url) setPhotoForm((prev) => ({...prev, image_after: url}));
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
                            {projectImageUploading ? "Enviando..." : "Upload"}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setProjectImageUploading(true);
                              const url = await uploadDirect(file, "projetos");
                              setProjectImageUploading(false);
                              if (url) setPhotoForm((prev) => ({...prev, image_after: url}));
                              e.target.value = "";
                            }} />
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <label className={labelCls}>Imagem Antes <span className="font-normal text-[#b0b0b0]">(opcional)</span></label>
                      {photoForm.image_before ? (
                        <div className="border border-[#e2e2e2]">
                          <img src={photoForm.image_before} alt="Imagem Antes" className="w-full max-h-48 object-cover" />
                          <div className="flex border-t border-[#e2e2e2]">
                            <a href={photoForm.image_before} download target="_blank" rel="noopener noreferrer"
                              className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] text-[#1a365d] hover:bg-[#eef2f8] transition-colors">
                              ↓ Download
                            </a>
                            <label className="flex-1 text-center text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border-r border-[#e2e2e2] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors cursor-pointer">
                              {projectImageUploading ? "Enviando…" : "Substituir"}
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setProjectImageUploading(true);
                                const url = await uploadDirect(file, "projetos");
                                setProjectImageUploading(false);
                                if (url) setPhotoForm((prev) => ({...prev, image_before: url}));
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
                            {projectImageUploading ? "Enviando..." : "Upload"}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setProjectImageUploading(true);
                              const url = await uploadDirect(file, "projetos");
                              setProjectImageUploading(false);
                              if (url) setPhotoForm((prev) => ({...prev, image_before: url}));
                              e.target.value = "";
                            }} />
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="mb-6 flex items-center gap-2">
                      <input type="checkbox" id="photo-active" checked={photoForm.is_active} onChange={(e) => setPhotoForm({...photoForm, is_active: e.target.checked})} className="w-4 h-4" />
                      <label htmlFor="photo-active" className="text-sm font-[var(--font-inter)] text-[#43474e]">Projeto ativo</label>
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
                          {p.image_after && <img src={p.image_after} alt={p.title} className="w-20 h-24 object-cover flex-shrink-0 border border-[#e2e2e2]" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#002045] font-[var(--font-inter)] text-sm">{p.title}</p>
                            <p className="text-xs text-[#3b6934] font-[var(--font-inter)] mt-0.5">{p.product_code}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.categories.map((c) => (
                                <span key={c} className="bg-[#eef2f8] text-[#002045] px-1.5 py-0.5 text-[9px] font-bold tracking-wider">{c}</span>
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
                              <button onClick={() => deletePhoto(p.id, p.title)} className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors">Excluir</button>
                            </div>
                          </div>
                        </div>

                        {/* ── Media panel ── */}
                        {isMediaOpen && (
                          <div className="border-t border-[#e2e2e2] bg-[#f9f9f9] p-4">
                            <p className="text-[10px] tracking-[0.12em] uppercase font-bold text-[#002045] font-[var(--font-inter)] mb-3">Mídia adicional da obra</p>

                            {/* Existing media grid */}
                            {media.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {media.map((m) => (
                                  <div key={m.id} className="relative group w-20 h-20">
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
                                      onClick={() => deleteProjectMedia(m.id, p.slug)}
                                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >×</button>
                                    {m.type === "video" && (
                                      <span className="absolute bottom-0.5 left-0.5 text-[7px] text-white/70 font-bold tracking-wide">VÍD</span>
                                    )}
                                  </div>
                                ))}
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
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={videoUrlInput}
                                onChange={(e) => setVideoUrlInput(e.target.value)}
                                placeholder="Ou cole URL do vídeo (YouTube, Vimeo…)"
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
                <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
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
          const simWn = parseFloat(simW) || 0;
          const simHn = parseFloat(simH) || 0;
          const simArea = simWn * simHn;
          const simPlates = simWn > 0 && simHn > 0
            ? Math.ceil(simWn / PLATE_W) * Math.ceil(simHn / PLATE_H)
            : 0;
          const simProduct = dbProducts.find(p => p.code === simProductCode) ?? null;
          const simMaterial = simPlates * (simProduct?.price ?? 0);
          const canAddSpace = simSpaceName.trim() !== "" && simProduct !== null && simPlates > 0;

          // All spaces = saved + current (if valid)
          interface SimSpaceCalc { spaceName: string; productCode: string; product: typeof simProduct; plates: number; area: number; material: number; }
          const allSpaces: SimSpaceCalc[] = [
            ...simSpaces.map(s => {
              const wn = parseFloat(s.w) || 0;
              const hn = parseFloat(s.h) || 0;
              const pl = wn > 0 && hn > 0 ? Math.ceil(wn / PLATE_W) * Math.ceil(hn / PLATE_H) : 0;
              const prod = dbProducts.find(p => p.code === s.productCode) ?? null;
              return { spaceName: s.spaceName, productCode: s.productCode, product: prod, plates: pl, area: wn * hn, material: pl * (prod?.price ?? 0) };
            }),
            ...(canAddSpace ? [{ spaceName: simSpaceName.trim(), productCode: simProductCode, product: simProduct, plates: simPlates, area: simArea, material: simMaterial }] : []),
          ];
          const grandPlatesSim = allSpaces.reduce((s, sp) => s + sp.plates, 0);
          const grandMaterialSim = allSpaces.reduce((s, sp) => s + sp.material, 0);
          const canGenerate = allSpaces.length > 0;

          function addCurrentSpace() {
            if (!canAddSpace) return;
            setSimSpaces(prev => [...prev, { key: `sim-${Date.now()}`, spaceName: simSpaceName.trim(), productCode: simProductCode, w: simW, h: simH }]);
            setSimSpaceName(""); setSimProductCode(""); setSimW(""); setSimH("");
            setSimLink(""); setSimLinkCopied(false);
          }

          function buildSimLink() {
            const origin = typeof window !== "undefined" ? window.location.origin : "https://orbitalrevestimentos.com.br";
            const p = new URLSearchParams();
            if (simCoupon.trim()) p.set("cupom", simCoupon.trim().toUpperCase());

            if (allSpaces.length === 1) {
              // Single space — use existing single-space format
              const sp = allSpaces[0];
              p.set("space", "custom");
              p.set("customSpace", sp.spaceName);
              p.set("produto", sp.productCode);
              p.set("area", sp.area.toFixed(2));
              p.set("placas", sp.plates.toString());
            } else {
              // Multi-space — indexed params
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
            `*${i + 1}. ${sp.spaceName}* — ${sp.product?.name ?? sp.productCode} (${sp.productCode})\n   ${parseFloat(simSpaces[i]?.w || simW) || "?"}m × ${parseFloat(simSpaces[i]?.h || simH) || "?"}m · ${sp.plates} placas · ${sp.material.toLocaleString("pt-BR")}`
          );
          const waText = canGenerate ? encodeURIComponent(
            [
              `Olá! Segue o link para confirmar o orçamento do seu projeto com PFB Orbital:`,
              ``,
              buildSimLink(),
              ``,
              ...waLines,
              ...(allSpaces.length > 1 ? [``, `*Total material: ${grandMaterialSim.toLocaleString("pt-BR")}*`] : []),
            ].join("\n")
          ) : "";

          return (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-1">Simulador de Orçamento</h2>
                <p className="text-[#74777f] text-xs font-[var(--font-inter)]">Adicione um ou mais ambientes, configure produto e medidas, e gere o link personalizado para o cliente.</p>
              </div>

              {/* Saved spaces list */}
              {simSpaces.length > 0 && (
                <div className="bg-white border border-[#e2e2e2] mb-4 divide-y divide-[#f0f0f0]">
                  {simSpaces.map((s, i) => {
                    const wn = parseFloat(s.w) || 0; const hn = parseFloat(s.h) || 0;
                    const pl = wn > 0 && hn > 0 ? Math.ceil(wn / PLATE_W) * Math.ceil(hn / PLATE_H) : 0;
                    const prod = dbProducts.find(p => p.code === s.productCode) ?? null;
                    const mat = pl * (prod?.price ?? 0);
                    return (
                      <div key={s.key} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-6 h-6 rounded-full bg-[#3b6934] text-white text-[10px] font-bold font-[var(--font-inter)] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{s.spaceName}</p>
                          <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{prod?.name ?? s.productCode} · {wn}m × {hn}m · {pl} pl.</p>
                        </div>
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] flex-shrink-0">{mat.toLocaleString("pt-BR")}</p>
                        <button onClick={() => { setSimSpaces(prev => prev.filter((_, idx) => idx !== i)); setSimLink(""); }} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add space form */}
              <div className="bg-white border border-[#e2e2e2] p-6 space-y-5">
                <p className="text-[#002045] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)]">
                  {simSpaces.length === 0 ? "Ambiente" : `Ambiente ${simSpaces.length + 1}`}
                </p>

                <div>
                  <label className={labelCls}>Nome do espaço</label>
                  <input type="text" value={simSpaceName} onChange={e => setSimSpaceName(e.target.value)} placeholder="Ex: Garagem, Marquise, Área de Lazer…" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Produto / Acabamento</label>
                  <select value={simProductCode} onChange={e => setSimProductCode(e.target.value)} className={inputCls}>
                    <option value="">— selecione —</option>
                    {["Classic","Brilliance","Elegance"].map(linha => (
                      <optgroup key={linha} label={linha}>
                        {dbProducts.filter(p => p.linha === linha && p.is_active).map(p => (
                          <option key={p.id} value={p.code}>{p.name} ({p.code}) — {p.price.toLocaleString("pt-BR")}/placa</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

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

                {/* Live preview for current space */}
                {simPlates > 0 && simProduct && (
                  <div className="bg-[#f9fbff] border border-[#dce8f5] px-5 py-4">
                    <div className="grid grid-cols-3 gap-4">
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
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{simMaterial.toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add another space button */}
                <button
                  disabled={!canAddSpace}
                  onClick={addCurrentSpace}
                  className="w-full py-2.5 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] hover:bg-[#f0f4fa] transition-colors disabled:opacity-40"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline mr-1.5 mb-0.5"><path d="M12 5v14M5 12h14"/></svg>
                  Salvar e adicionar outro ambiente
                </button>

                {/* Coupon */}
                <div>
                  <label className={labelCls}>Cupom (opcional)</label>
                  <input type="text" value={simCoupon} onChange={e => setSimCoupon(e.target.value.toUpperCase())} placeholder="Ex: PARCEIRO01" className={inputCls} />
                </div>

                {/* Grand total when multiple */}
                {allSpaces.length > 1 && (
                  <div className="bg-[#002045] px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-[9px] uppercase tracking-widest font-bold font-[var(--font-inter)]">Total do projeto</p>
                      <p className="text-white/60 text-[10px] font-[var(--font-inter)]">{allSpaces.length} ambientes · {grandPlatesSim} placas</p>
                    </div>
                    <p className="text-white text-xl font-[var(--font-noto-serif)]">{grandMaterialSim.toLocaleString("pt-BR")}</p>
                  </div>
                )}

                {/* Generate button */}
                <button
                  disabled={!canGenerate}
                  onClick={() => { setSimLink(buildSimLink()); setSimLinkCopied(false); }}
                  className="w-full py-3 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] bg-[#002045] text-white hover:bg-[#1a365d] transition-colors disabled:opacity-40"
                >
                  Gerar link para o cliente
                </button>
              </div>

              {/* Generated link */}
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

      </div>
    </div>
  );
}
