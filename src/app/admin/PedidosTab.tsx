"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
export type PedidoStatus = "em_producao" | "pronto" | "entregue" | "cancelado";
export type PaymentStatus = "pendente" | "parcial" | "pago";

export interface Pedido {
  id: string;
  lead_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  partner_id: string | null;
  sales_rep_id: string | null;
  partner_name: string | null;
  space: string | null;
  product_name: string | null;
  area_m2: number | null;
  total: number | null;
  status: PedidoStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  expected_delivery_at: string | null;
  delivered_at: string | null;
  client_zip: string | null;
  client_address: string | null;
  client_address_complement: string | null;
  client_city: string | null;
  client_state: string | null;
  discount_amount: number | null;
  freight_amount: number | null;
  payment_methods: string[] | null;
  payment_terms: string | null;
  quote_valid_until: string | null;
  warranty_terms: string | null;
  document_notes: string | null;
  partner_commission_pct: number | null;
  partner_commission_amount: number | null;
  sales_rep_commission_pct: number | null;
  sales_rep_commission_amount: number | null;
  coupon_use_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Labels / styling ─────────────────────────────────────────────────────────
const STATUS_META: Record<PedidoStatus, { label: string; cls: string }> = {
  em_producao: { label: "Em produção", cls: "bg-yellow-100 text-yellow-800" },
  pronto: { label: "Pronto", cls: "bg-blue-100 text-blue-800" },
  entregue: { label: "Entregue", cls: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", cls: "bg-gray-200 text-gray-600" },
};
const STATUS_ORDER: PedidoStatus[] = ["em_producao", "pronto", "entregue", "cancelado"];

const PAYMENT_META: Record<PaymentStatus, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-red-100 text-red-800" },
  parcial: { label: "Parcial", cls: "bg-amber-100 text-amber-800" },
  pago: { label: "Pago", cls: "bg-green-100 text-green-800" },
};
const PAYMENT_ORDER: PaymentStatus[] = ["pendente", "parcial", "pago"];
const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Transferência Bancária"] as const;
const DEFAULT_PAYMENT_TERMS = "PIX ou dinheiro à vista";
const DEFAULT_DOCUMENT_NOTES =
  `CLÁUSULAS CONTRATUAIS - DISPOSIÇÕES GERAIS
ORBITAL REVESTIMENTOS

CLÁUSULA 1ª - DA NATUREZA DO FORNECIMENTO E LIMITAÇÃO DE ATUAÇÃO
A ORBITAL atua exclusivamente como fornecedora de revestimentos decorativos, não executando, não projetando, não acompanhando, não supervisionando, não fiscalizando e não se responsabilizando por obras, instalações, medições, preparo de base, compatibilizações técnicas, desempenho final ou resultado estético do ambiente.
Os produtos fornecidos não possuem caráter estrutural e não se equiparam a pedra natural, madeira maciça ou materiais construtivos tradicionais, sendo destinados exclusivamente a fins decorativos.

CLÁUSULA 2ª - DA INSTALAÇÃO, SERVIÇOS TERCEIRIZADOS E AUSÊNCIA DE RESPONSABILIDADE SOLIDÁRIA
A instalação dos produtos constitui serviço de terceiros, realizado por profissional independente, sem qualquer vínculo contratual, societário, trabalhista ou de representação com a ORBITAL.
A eventual indicação de instaladores, transportadores ou prestadores de serviço tem caráter estritamente facilitador, não implicando solidariedade, corresponsabilidade, garantia de resultado ou assunção de riscos pela ORBITAL.
O valor da mão de obra é orçado, contratado, cobrado e recebido diretamente pelo profissional escolhido, não integrando, sob nenhuma hipótese, o preço dos produtos fornecidos pela ORBITAL, sendo o COMPRADOR integralmente responsável pela escolha, contratação e fiscalização do prestador.

CLÁUSULA 3ª - DO PREPARO DA BASE, CONDIÇÕES DE APLICAÇÃO E RESPONSABILIDADE TÉCNICA
A avaliação da superfície, incluindo, mas não se limitando a, limpeza, regularização, nivelamento, impermeabilização, correção de prumo, tratamento contra umidade e demais preparos necessários à aplicação, são de responsabilidade exclusiva do COMPRADOR ou do profissional por ele contratado.
A ORBITAL não se responsabiliza por falhas, desprendimentos, deformações, fissuras, manchas, infiltrações, empenamentos, perdas estéticas ou danos de qualquer natureza decorrentes de:
* preparo inadequado da base;
* instalação incorreta;
* aplicação fora das recomendações técnicas;
* incompatibilidade do produto com o local escolhido.

CLÁUSULA 4ª - DAS CONDIÇÕES DE PAGAMENTO, LIBERAÇÃO E IRREVERSIBILIDADE DO PEDIDO
A liberação para entrega ou retirada dos produtos ocorrerá somente mediante: I - pagamento integral à vista; ou II - aprovação formal do parcelamento do valor total do pedido.
Após a aprovação do pedido de venda, não será admitido cancelamento, desistência, troca, devolução ou alteração da forma de entrega, nos termos aplicáveis a produtos comercializados sob encomenda.
Eventuais descontos concedidos para pagamento via PIX ou espécie aplicam-se exclusivamente aos produtos fornecidos pela ORBITAL, não abrangendo serviços terceirizados.

CLÁUSULA 5ª - DA ENTREGA, RETIRADA, CONFERÊNCIA E ENCERRAMENTO DA RESPONSABILIDADE
A responsabilidade da ORBITAL encerra-se no ato da entrega, mediante conferência da integridade dos produtos e sua aceitação pelo COMPRADOR.
No recebimento, compete exclusivamente ao COMPRADOR: I - conferir quantidade, tipo e especificação dos produtos; II - verificar defeitos aparentes, tais como riscos, trincas, quebras, empeno, oxidação, amassados ou divergências; III - registrar imediatamente qualquer inconformidade no documento da transportadora, com registros fotográficos.
A ausência de ressalvas caracteriza aceitação plena e definitiva dos produtos.
Na hipótese de retirada em depósito, a ORBITAL não se responsabiliza por danos ocorridos durante o transporte, assumindo o COMPRADOR integral responsabilidade após a retirada, observados os limites do Código de Defesa do Consumidor.
Caso a entrega não seja realizada por ausência do COMPRADOR, informações incorretas ou impedimentos alheios à ORBITAL, poderá ser cobrada nova taxa de entrega.

CLÁUSULA 6ª - DAS CARACTERÍSTICAS DOS PRODUTOS, VARIAÇÕES E TOLERÂNCIAS
Os produtos podem apresentar variações dimensionais milimétricas, bem como variações técnicas, visuais e de tonalidade entre lotes distintos, dentro das tolerâncias permitidas pelas normas da ABNT, não caracterizando defeito.
Produtos classificados como Classe Comercial (C) não serão considerados desconformes quando os aspectos estiverem dentro dos padrões dessa classificação.
Imagens, vídeos, renders, catálogos e materiais promocionais possuem caráter meramente ilustrativo, não constituindo garantia de identidade absoluta de textura, cor, brilho, escala ou acabamento.

CLÁUSULA 7ª - DA VEDAÇÃO À INSTALAÇÃO DE PRODUTOS COM DEFEITO E ACEITAÇÃO TÁCITA
Produtos com defeitos aparentes não devem ser instalados.
A instalação total ou parcial do produto implica aceitação definitiva, irretratável e integral, inclusive quanto a características visuais, dimensionais e de acabamento, afastando qualquer alegação posterior de vício aparente ou expectativa frustrada.

CLÁUSULA 8ª - DO USO, INSUMOS, GARANTIAS E EXCLUSÕES
A ORBITAL não garante desempenho, durabilidade ou aparência estética quando o produto for utilizado:
* fora das recomendações técnicas;
* em ambientes não indicados;
* sob condições extremas de calor, umidade excessiva ou exposição solar direta contínua;
* mediante instalação inadequada ou preparo incorreto da base;
* em caso de uso indevido, manutenção inadequada ou alterações posteriores.
O consumo de insumos, incluindo cola PU, é estimativo, podendo variar conforme superfície, técnica e execução, não gerando direito a complementação ou ressarcimento.

CLÁUSULA 9ª - DA LIMITAÇÃO DE RESPONSABILIDADE E EXPECTATIVA DO COMPRADOR
A ORBITAL não se responsabiliza por:
* atrasos de obra;
* custos adicionais;
* paralisações;
* danos indiretos;
* lucros cessantes;
* danos morais;
* insatisfação decorrente de gosto pessoal, expectativa subjetiva, alteração de projeto ou arrependimento posterior.
A ORBITAL não responde por atos, omissões, falhas técnicas ou danos causados por terceiros, incluindo instaladores, transportadoras, arquitetos, designers ou quaisquer profissionais contratados pelo COMPRADOR.
Somente informações prestadas por escrito em documentos oficiais da ORBITAL possuem validade jurídica, não vinculando a empresa a promessas verbais, interpretações subjetivas ou comunicações informais.

CLÁUSULA 10ª - DA GARANTIA LEGAL E DIREITOS DO COMPRADOR
A ORBITAL assegura ao COMPRADOR a garantia legal prevista no Código de Defesa do Consumidor, aplicável exclusivamente a vícios de fabricação que tornem o produto impróprio ou inadequado ao uso a que se destina, ou que lhe diminuam o valor.
Caso seja constatado defeito de fabricação, devidamente comunicado dentro do prazo legal e antes da instalação ou de qualquer intervenção no produto, a ORBITAL compromete-se a analisar o material e, sendo confirmada a responsabilidade, adotar as medidas cabíveis, tais como substituição do produto por outro em perfeitas condições, correção do defeito quando tecnicamente possível ou outra solução prevista em lei, sempre em conformidade com o Código de Defesa do Consumidor.
Para fins de garantia, o COMPRADOR deverá comunicar a ORBITAL por escrito, preferencialmente com registros fotográficos e descrição do ocorrido, tão logo identifique eventual vício, colaborando para uma análise técnica adequada.
Esta garantia tem por finalidade assegurar a qualidade do produto fornecido, não abrangendo falhas, danos ou prejuízos decorrentes de instalação, preparo inadequado da base, transporte após a entrega, uso fora das recomendações técnicas, intervenção de terceiros ou condições alheias ao processo de fabricação.
A instalação total ou parcial do produto caracteriza aceitação quanto a eventuais vícios aparentes, nos termos do Código de Defesa do Consumidor, permanecendo resguardado ao COMPRADOR o direito à garantia legal exclusivamente em relação a vícios de fabricação não aparentes no momento do recebimento.`;

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}
/** datetime-local value (YYYY-MM-DDTHH:mm) from an ISO string. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
function plusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Relative delivery badge: overdue / hoje / future date. Suppressed once delivered. */
function deliveryBadge(iso: string | null | undefined): { label: string; cls: string } | null {
  if (!iso) return null;
  const due = new Date(iso).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((due - now) / dayMs);
  if (due < now) return { label: `Atrasado · ${fmtDate(iso)}`, cls: "text-red-700 font-bold" };
  if (days === 0) return { label: "Hoje", cls: "text-amber-700 font-bold" };
  if (days <= 3) return { label: `Em ${days}d · ${fmtDate(iso)}`, cls: "text-amber-700" };
  return { label: fmtDate(iso), cls: "text-[#74777f]" };
}

// Draft used by the create/edit modal.
type PedidoDraft = Partial<Pedido> & { _isNew?: boolean };

type PartnerOption = {
  id: string;
  name: string;
  coupon_code: string;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  partner_sales_reps?: Array<{ sales_reps?: { id: string; name: string; referral_code: string } | null }>;
};

type SalesRepOption = {
  id: string;
  name: string;
  referral_code: string;
  commission_type: "percentage" | "fixed";
  commission_value: number;
};

export default function PedidosTab() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | PedidoStatus>("all");
  const [search, setSearch] = useState("");

  const [draft, setDraft] = useState<PedidoDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  // Stock-aware line items for the create form (model + plate qty).
  type StockProduct = { id: string; name: string; code: string | null; price: number | null; cost_price: number | null; sale_unit: string | null; available: number; stock_on_hand: number };
  type OrderItem = { product_id: string; plates: number };
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);

  useEffect(() => {
    // Best-effort: if migration 023 isn't applied the picker just stays empty.
    fetch("/api/admin/stock")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.products) setStockProducts(j.products); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/partners")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setPartners(Array.isArray(rows) ? rows : []))
      .catch(() => setPartners([]));
    fetch("/api/sales-reps")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setSalesReps(Array.isArray(rows) ? rows : []))
      .catch(() => setSalesReps([]));
  }, []);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pedidos");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setPedidos(data);
      } else {
        const msg =
          res.status === 401
            ? "sessão de admin expirada ou inválida (401) — faça login novamente"
            : data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : `HTTP ${res.status}`;
        setError(`Falha ao carregar pedidos (/api/admin/pedidos): ${msg}`);
      }
    } catch (e) {
      setError(`Falha ao carregar pedidos: ${e instanceof Error ? e.message : "erro de rede"}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const c = { all: pedidos.length, em_producao: 0, pronto: 0, entregue: 0, cancelado: 0 } as Record<string, number>;
    for (const p of pedidos) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [pedidos]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (s) {
        const hay = `${p.client_name} ${p.client_email ?? ""} ${p.client_phone ?? ""} ${p.product_name ?? ""} ${p.partner_name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [pedidos, statusFilter, search]);

  const stats = useMemo(() => {
    const ativos = filtered.filter((p) => p.status === "em_producao" || p.status === "pronto");
    const emProducao = filtered.filter((p) => p.status === "em_producao").length;
    const prontos = filtered.filter((p) => p.status === "pronto").length;
    const entregues = filtered.filter((p) => p.status === "entregue").length;
    // Money still owed across non-cancelled orders that aren't fully paid.
    const aReceber = filtered
      .filter((p) => p.status !== "cancelado" && p.payment_status !== "pago")
      .reduce((a, p) => a + (p.total ?? 0), 0);
    const atrasados = ativos.filter(
      (p) => p.expected_delivery_at && new Date(p.expected_delivery_at).getTime() < Date.now()
    ).length;
    return { emProducao, prontos, entregues, aReceber, atrasados };
  }, [filtered]);

  const itemPricing = useMemo(() => {
    let total = 0;
    let cost = 0;
    let missingPrice = false;
    let missingCost = false;
    for (const item of items) {
      if (!item.product_id || !item.plates) continue;
      const product = stockProducts.find((p) => p.id === item.product_id);
      if (!product) continue;
      if (product.price == null) missingPrice = true;
      else total += product.price * item.plates;
      if (product.cost_price == null) missingCost = true;
      else cost += product.cost_price * item.plates;
    }
    return { total, cost, grossProfit: total - cost, missingPrice, missingCost };
  }, [items, stockProducts]);

  const currentTotal = Math.max(0, Number(draft?.total) || 0);
  const selectedPartner = partners.find((p) => p.id === draft?.partner_id) ?? null;
  const selectedRep = salesReps.find((r) => r.id === draft?.sales_rep_id) ?? null;

  function moneyFromPct(pct: number, total = currentTotal) {
    return Math.round((Math.max(0, total) * Math.max(0, pct)) / 100);
  }

  function pctFromMoney(amount: number, total = currentTotal) {
    return total > 0 ? Math.round((Math.max(0, amount) / total) * 10_000) / 100 : 0;
  }

  function applyPartnerSelection(partnerId: string) {
    if (!draft) return;
    const partner = partners.find((p) => p.id === partnerId) ?? null;
    if (!partner) {
      setDraft({ ...draft, partner_id: null, partner_name: null, partner_commission_pct: 0, partner_commission_amount: 0 });
      return;
    }
    const linkedRep = partner.partner_sales_reps?.map((l) => l.sales_reps).find(Boolean) ?? null;
    const pct = partner.commission_type === "percentage" ? Number(partner.commission_value) || 0 : pctFromMoney(Number(partner.commission_value) || 0);
    const next: PedidoDraft = {
      ...draft,
      partner_id: partner.id,
      partner_name: partner.name,
      partner_commission_pct: pct,
      partner_commission_amount: partner.commission_type === "percentage" ? moneyFromPct(pct) : Number(partner.commission_value) || 0,
    };
    if (linkedRep && !draft.sales_rep_id) {
      const rep = salesReps.find((r) => r.id === linkedRep.id);
      const repPct = rep?.commission_type === "percentage" ? Number(rep.commission_value) || 0 : pctFromMoney(Number(rep?.commission_value) || 0);
      next.sales_rep_id = linkedRep.id;
      next.sales_rep_commission_pct = repPct;
      next.sales_rep_commission_amount = rep?.commission_type === "percentage" ? moneyFromPct(repPct) : Number(rep?.commission_value) || 0;
    }
    setDraft(next);
  }

  function applySalesRepSelection(repId: string) {
    if (!draft) return;
    const rep = salesReps.find((r) => r.id === repId) ?? null;
    if (!rep) {
      setDraft({ ...draft, sales_rep_id: null, sales_rep_commission_pct: 0, sales_rep_commission_amount: 0 });
      return;
    }
    const pct = rep.commission_type === "percentage" ? Number(rep.commission_value) || 0 : pctFromMoney(Number(rep.commission_value) || 0);
    setDraft({
      ...draft,
      sales_rep_id: rep.id,
      sales_rep_commission_pct: pct,
      sales_rep_commission_amount: rep.commission_type === "percentage" ? moneyFromPct(pct) : Number(rep.commission_value) || 0,
    });
  }

  async function lookupCep() {
    if (!draft) return;
    const cep = String(draft.client_zip ?? "").replace(/\D/g, "");
    if (cep.length !== 8) {
      setCepError("Digite um CEP com 8 números.");
      return;
    }
    setCepLoading(true);
    setCepError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!res.ok || data?.erro) {
        setCepError("CEP não encontrado.");
        return;
      }
      setDraft({
        ...draft,
        client_zip: cep.replace(/^(\d{5})(\d{3})$/, "$1-$2"),
        client_address: data.logradouro || draft.client_address || "",
        client_address_complement: draft.client_address_complement || data.bairro || "",
        client_city: data.localidade || draft.client_city || "",
        client_state: data.uf || draft.client_state || "",
      });
    } catch {
      setCepError("Não foi possível buscar o CEP agora.");
    } finally {
      setCepLoading(false);
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────────
  async function patchPedido(id: string, patch: Partial<Pedido>) {
    // optimistic
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      const res = await fetch(`/api/admin/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        await fetchPedidos(); // revert to server truth
      } else {
        const updated = await res.json().catch(() => null);
        if (updated && typeof updated === "object" && "id" in updated) {
          setPedidos((prev) => prev.map((p) => (p.id === id ? (updated as Pedido) : p)));
        }
      }
    } catch {
      await fetchPedidos();
    }
  }

  async function deletePedido(id: string) {
    if (!confirm("Excluir este pedido permanentemente? Esta ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/admin/pedidos/${id}`, { method: "DELETE" });
    if (res.ok) setPedidos((prev) => prev.filter((p) => p.id !== id));
    else await fetchPedidos();
  }

  async function saveDraft() {
    if (!draft || !draft.client_name?.trim()) return;
    setSaving(true);
    const payload = {
      client_name: draft.client_name?.trim(),
      client_email: draft.client_email ?? null,
      client_phone: draft.client_phone ?? null,
      partner_id: draft.partner_id ?? null,
      sales_rep_id: draft.sales_rep_id ?? null,
      partner_name: draft.partner_name ?? null,
      space: draft.space ?? null,
      product_name: draft.product_name ?? null,
      area_m2: draft.area_m2 ?? null,
      total: draft.total ?? null,
      status: draft.status ?? "em_producao",
      payment_status: draft.payment_status ?? "pendente",
      notes: draft.notes ?? null,
      expected_delivery_at: draft.expected_delivery_at ?? null,
      client_zip: draft.client_zip ?? null,
      client_address: draft.client_address ?? null,
      client_address_complement: draft.client_address_complement ?? null,
      client_city: draft.client_city ?? null,
      client_state: draft.client_state ?? null,
      discount_amount: draft.discount_amount ?? 0,
      freight_amount: draft.freight_amount ?? 0,
      payment_methods: draft.payment_methods?.length ? draft.payment_methods : ["Pix"],
      payment_terms: draft.payment_terms ?? null,
      quote_valid_until: draft.quote_valid_until ?? null,
      warranty_terms: draft.warranty_terms ?? null,
      document_notes: draft.document_notes ?? null,
      partner_commission_pct: draft.partner_commission_pct ?? 0,
      partner_commission_amount: draft.partner_commission_amount ?? moneyFromPct(Number(draft.partner_commission_pct) || 0),
      sales_rep_commission_pct: draft.sales_rep_commission_pct ?? 0,
      sales_rep_commission_amount: draft.sales_rep_commission_amount ?? moneyFromPct(Number(draft.sales_rep_commission_pct) || 0),
    };
    const cleanItems = items.filter((it) => it.product_id && it.plates > 0);
    try {
      if (draft._isNew) {
        const res = await fetch("/api/admin/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, items: cleanItems }),
        });
        if (res.ok) {
          const created = await res.json();
          setPedidos((prev) => [created as Pedido, ...prev]);
          setDraft(null);
        } else {
          const d = await res.json().catch(() => null);
          alert(`Erro ao salvar: ${d?.error ?? res.status}`);
        }
      } else if (draft.id) {
        await patchPedido(draft.id, payload);
        setDraft(null);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Pedidos / Produção</h2>
            {!loading && (
              <span className="bg-[#eef2f8] text-[#002045] text-[10px] font-bold font-[var(--font-inter)] tracking-wider px-2 py-0.5">
                {filtered.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { setItems([]); setDraft({ _isNew: true, status: "em_producao", payment_status: "pendente", payment_methods: ["Pix"], payment_terms: DEFAULT_PAYMENT_TERMS, quote_valid_until: plusDays(7), document_notes: DEFAULT_DOCUMENT_NOTES }); }}
            className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
          >
            + Novo pedido
          </button>
        </div>

        {/* Status segmentation */}
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "Todos"],
            ["em_producao", "Em produção"],
            ["pronto", "Prontos"],
            ["entregue", "Entregues"],
            ["cancelado", "Cancelados"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 text-xs font-bold font-[var(--font-inter)] tracking-wide border transition-colors ${
                statusFilter === key
                  ? "bg-[#002045] text-white border-[#002045]"
                  : "bg-white text-[#74777f] border-[#e2e2e2] hover:text-[#002045]"
              }`}
            >
              {label}
              <span className="ml-2 opacity-70">{statusCounts[key] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por cliente, e-mail, telefone, produto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[280px]"
          />
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { label: "Em produção", value: stats.emProducao, sub: "na oficina" },
            { label: "Prontos", value: stats.prontos, sub: "para entrega" },
            { label: "Entregues", value: stats.entregues, sub: "concluídos" },
            { label: "A receber", value: fmtBRL(stats.aReceber), sub: "não pagos" },
            { label: "Atrasados", value: stats.atrasados, sub: "prazo vencido" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#e2e2e2] px-4 py-3">
              <p className="text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">{s.label}</p>
              <p className="text-lg font-semibold font-[var(--font-noto-serif)] text-[#002045] mt-0.5 leading-none">{s.value}</p>
              <p className="text-[9px] text-[#b0b0b0] font-[var(--font-inter)] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 px-6 py-8 text-center">
          <p className="text-red-800 text-sm font-semibold font-[var(--font-inter)]">Não foi possível carregar os pedidos</p>
          <p className="text-red-700 text-xs font-[var(--font-inter)] mt-1 break-words">{error}</p>
          <button
            onClick={fetchPedidos}
            className="mt-4 inline-block border border-red-300 text-red-800 px-4 py-2 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-red-100 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-6 py-12 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
            {pedidos.length === 0
              ? "Nenhum pedido ainda. Crie um pedido ao fechar uma venda para acompanhar produção e entrega."
              : "Nenhum pedido corresponde aos filtros."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-[#e2e2e2]">
            <table className="w-full text-sm font-[var(--font-inter)] table-fixed">
              <colgroup>
                <col style={{ width: "9%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e2e2e2]">
                  {["Data", "Cliente", "Produção", "Pagamento", "Valor", "Entrega", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const db = deliveryBadge(p.expected_delivery_at);
                  const waHref = p.client_phone ? `https://wa.me/55${p.client_phone.replace(/\D/g, "")}` : null;
                  return (
                    <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] align-top">
                      <td className="px-4 py-3">
                        <p className="text-xs text-[#74777f]">{fmtDate(p.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDraft({ ...p })} className="font-semibold text-[#002045] text-xs truncate hover:underline text-left block max-w-full">{p.client_name}</button>
                        {p.client_email && <p className="text-[10px] text-[#74777f] truncate">{p.client_email}</p>}
                        <div className="flex items-center gap-2 mt-0.5">
                          {waHref && (
                            <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#3b6934] font-bold hover:underline">
                              WhatsApp
                            </a>
                          )}
                          {p.partner_name && <span className="text-[9px] text-[#74777f]">via {p.partner_name}</span>}
                        </div>
                        {(p.product_name || p.space) && (
                          <p className="text-[9px] text-[#b0b0b0] mt-0.5 truncate">
                            {[p.space, p.product_name].filter(Boolean).join(" · ")}
                            {p.area_m2 ? ` · ${p.area_m2} m²` : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.status}
                          onChange={(e) => patchPedido(p.id, { status: e.target.value as PedidoStatus })}
                          className={`text-[10px] font-bold font-[var(--font-inter)] border-0 px-2 py-1 cursor-pointer focus:outline-none ${STATUS_META[p.status].cls}`}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.payment_status}
                          onChange={(e) => patchPedido(p.id, { payment_status: e.target.value as PaymentStatus })}
                          className={`text-[10px] font-bold font-[var(--font-inter)] border-0 px-2 py-1 cursor-pointer focus:outline-none ${PAYMENT_META[p.payment_status].cls}`}
                        >
                          {PAYMENT_ORDER.map((s) => (
                            <option key={s} value={s}>{PAYMENT_META[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-[#002045] font-semibold">{fmtBRL(p.total)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {p.status === "entregue" ? (
                          <p className="text-[10px] text-[#3b6934]">Entregue {fmtDate(p.delivered_at)}</p>
                        ) : db ? (
                          <p className={`text-[10px] ${db.cls}`}>{db.label}</p>
                        ) : (
                          <span className="text-[10px] text-[#b0b0b0]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <a href={`/admin/pedidos/${p.id}/documento?tipo=orcamento`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#1e5fb4] font-bold hover:underline mr-3">PDF</a>
                        <button onClick={() => setDraft({ ...p })} className="text-[10px] text-[#002045] font-bold hover:underline mr-3">Editar</button>
                        <button onClick={() => deletePedido(p.id)} className="text-[10px] text-red-600 font-bold hover:underline">Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((p) => {
              const db = deliveryBadge(p.expected_delivery_at);
              return (
                <div key={p.id} className="bg-white border border-[#e2e2e2] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button onClick={() => setDraft({ ...p })} className="font-semibold text-[#002045] text-sm truncate hover:underline text-left block max-w-full">{p.client_name}</button>
                      {p.client_email && <p className="text-[11px] text-[#74777f] truncate">{p.client_email}</p>}
                      {(p.product_name || p.space) && (
                        <p className="text-[10px] text-[#b0b0b0] mt-0.5 truncate">{[p.space, p.product_name].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    <span className="text-xs text-[#002045] font-semibold shrink-0">{fmtBRL(p.total)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={p.status}
                      onChange={(e) => patchPedido(p.id, { status: e.target.value as PedidoStatus })}
                      className={`text-[10px] font-bold border-0 px-2 py-1 ${STATUS_META[p.status].cls}`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>
                    <select
                      value={p.payment_status}
                      onChange={(e) => patchPedido(p.id, { payment_status: e.target.value as PaymentStatus })}
                      className={`text-[10px] font-bold border-0 px-2 py-1 ${PAYMENT_META[p.payment_status].cls}`}
                    >
                      {PAYMENT_ORDER.map((s) => (
                        <option key={s} value={s}>{PAYMENT_META[s].label}</option>
                      ))}
                    </select>
                  </div>
                  {p.status === "entregue" ? (
                    <p className="text-[10px] text-[#3b6934] mt-2">Entregue {fmtDate(p.delivered_at)}</p>
                  ) : db ? (
                    <p className={`text-[10px] mt-2 ${db.cls}`}>📦 {db.label}</p>
                  ) : null}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-[#f0f0f0]">
                    <a href={`/admin/pedidos/${p.id}/documento?tipo=orcamento`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#1e5fb4] font-bold">PDF</a>
                    <button onClick={() => setDraft({ ...p })} className="text-[10px] text-[#002045] font-bold">Editar</button>
                    <button onClick={() => deletePedido(p.id)} className="text-[10px] text-red-600 font-bold">Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / edit modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setDraft(null)}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#002045] px-6 py-4 flex items-center justify-between sticky top-0">
              <p className="text-white font-[var(--font-noto-serif)] text-lg">{draft._isNew ? "Novo pedido" : "Editar pedido"}</p>
              <button onClick={() => !saving && setDraft(null)} className="text-white/60 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Cliente *">
                <input className={inputCls} value={draft.client_name ?? ""} onChange={(e) => setDraft({ ...draft, client_name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail">
                  <input className={inputCls} value={draft.client_email ?? ""} onChange={(e) => setDraft({ ...draft, client_email: e.target.value })} />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <input className={inputCls} value={draft.client_phone ?? ""} onChange={(e) => setDraft({ ...draft, client_phone: e.target.value })} />
                </Field>
              </div>
              <div className="border border-[#e2e2e2] p-3 space-y-3">
                <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Dados do cliente no documento</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CEP">
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        value={draft.client_zip ?? ""}
                        onChange={(e) => { setCepError(""); setDraft({ ...draft, client_zip: e.target.value }); }}
                        onBlur={() => {
                          const cep = String(draft.client_zip ?? "").replace(/\D/g, "");
                          if (cep.length === 8) lookupCep();
                        }}
                        placeholder="69000-000"
                      />
                      <button
                        type="button"
                        onClick={lookupCep}
                        disabled={cepLoading}
                        className="border border-[#002045] text-[#002045] disabled:opacity-50 px-3 text-[10px] uppercase tracking-[0.08em] font-bold font-[var(--font-inter)] hover:bg-[#eef2f8]"
                      >
                        {cepLoading ? "..." : "Buscar"}
                      </button>
                    </div>
                    {cepError && <p className="text-red-600 text-[10px] font-[var(--font-inter)] mt-1">{cepError}</p>}
                  </Field>
                  <Field label="Cidade / UF">
                    <div className="grid grid-cols-[1fr_64px] gap-2">
                      <input className={inputCls} value={draft.client_city ?? ""} onChange={(e) => setDraft({ ...draft, client_city: e.target.value })} placeholder="Manaus" />
                      <input className={inputCls} value={draft.client_state ?? ""} onChange={(e) => setDraft({ ...draft, client_state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="AM" />
                    </div>
                  </Field>
                </div>
                <Field label="Endereço">
                  <input className={inputCls} value={draft.client_address ?? ""} onChange={(e) => setDraft({ ...draft, client_address: e.target.value })} placeholder="Rua, avenida, número" />
                </Field>
                <Field label="Complemento">
                  <input className={inputCls} value={draft.client_address_complement ?? ""} onChange={(e) => setDraft({ ...draft, client_address_complement: e.target.value })} placeholder="Bairro, sala, referência" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ambiente">
                  <input className={inputCls} value={draft.space ?? ""} onChange={(e) => setDraft({ ...draft, space: e.target.value })} />
                </Field>
                <Field label="Produto">
                  <input className={inputCls} value={draft.product_name ?? ""} onChange={(e) => setDraft({ ...draft, product_name: e.target.value })} />
                </Field>
              </div>

              {/* Stock-aware line items (model + plate qty). Reserves stock for
                  active orders; powers profit. Only on new orders. */}
              {draft._isNew && stockProducts.length > 0 && (
                <div className="border border-[#e2e2e2] rounded-sm p-3">
                  <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Itens do pedido (reserva/baixa de estoque)
                  </p>
                  <div className="space-y-2">
                    {items.map((it, idx) => {
                      const prod = stockProducts.find((p) => p.id === it.product_id);
                      const unit = prod?.sale_unit || "placa";
                      const over = prod && it.plates > prod.available;
                      return (
                        <div key={idx} className="border border-[#f0f0f0] bg-white p-2">
                          <div className="grid grid-cols-[1fr_120px_28px] gap-2 items-start">
                          <select value={it.product_id}
                            onChange={(e) => setItems((cur) => cur.map((x, i) => i === idx ? { ...x, product_id: e.target.value } : x))}
                            className={`${inputCls} min-w-0`}>
                            <option value="">Selecione o modelo…</option>
                            {stockProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}{p.code ? ` (${p.code})` : ""} — {p.available} {p.sale_unit || "placa"} disp. — venda/{p.sale_unit || "placa"} {p.price != null ? fmtBRL(p.price) : "sem preço"}
                              </option>
                            ))}
                          </select>
                          <div className="flex">
                            <input type="number" min="1" value={it.plates || ""} placeholder="Qtd."
                              onChange={(e) => setItems((cur) => cur.map((x, i) => i === idx ? { ...x, plates: Number(e.target.value) } : x))}
                              className={`${inputCls} rounded-none`} />
                            <span className="border border-l-0 border-[#e2e2e2] px-2 flex items-center text-[10px] font-bold text-[#74777f] bg-[#fafafa] min-w-[52px] justify-center">
                              {unit}
                            </span>
                          </div>
                          <button onClick={() => setItems((cur) => cur.filter((_, i) => i !== idx))}
                            className="text-[#b42318] text-lg leading-none px-1" title="Remover">×</button>
                          </div>
                          {prod && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-[var(--font-inter)] text-[#74777f]">
                              <span className="font-semibold text-[#002045]">{prod.name}{prod.code ? ` · ${prod.code}` : ""}</span>
                              <span>{prod.available} {unit} disponíveis</span>
                              <span>Venda/{unit}: {prod.price != null ? fmtBRL(prod.price) : "sem preço"}</span>
                              {over && <span className="text-amber-700 font-bold">Quantidade acima do disponível</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setItems((cur) => [...cur, { product_id: "", plates: 1 }])}
                    className="mt-2 text-[11px] font-bold font-[var(--font-inter)] text-[#002045] hover:underline">
                    + Adicionar modelo
                  </button>
                  {items.some((it) => it.product_id && it.plates > 0) && (
                    <div className="mt-3 border-t border-[#f0f0f0] pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Total sugerido pelos itens</p>
                          <p className="text-sm font-semibold font-[var(--font-inter)] text-[#002045]">
                            {itemPricing.total > 0 ? fmtBRL(itemPricing.total) : "Defina preço de venda no Estoque"}
                          </p>
                          {itemPricing.total > 0 && !itemPricing.missingCost && (
                            <p className="text-[10px] text-[#74777f] font-[var(--font-inter)]">
                              Margem bruta estimada: {fmtBRL(itemPricing.grossProfit)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraft({
                            ...draft,
                            total: itemPricing.total,
                            partner_commission_amount: moneyFromPct(Number(draft.partner_commission_pct) || 0, itemPricing.total),
                            sales_rep_commission_amount: moneyFromPct(Number(draft.sales_rep_commission_pct) || 0, itemPricing.total),
                          })}
                          disabled={itemPricing.total <= 0}
                          className="border border-[#002045] text-[#002045] disabled:opacity-40 text-[10px] uppercase tracking-[0.1em] font-bold font-[var(--font-inter)] px-3 py-2 hover:bg-[#eef2f8]"
                        >
                          Usar total
                        </button>
                      </div>
                      {(itemPricing.missingPrice || itemPricing.missingCost) && (
                        <p className="text-amber-700 text-[10px] font-[var(--font-inter)] mt-2">
                          {itemPricing.missingPrice ? "Há modelo sem preço de venda. " : ""}
                          {itemPricing.missingCost ? "Há modelo sem custo para margem." : ""}
                        </p>
                      )}
                      <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-2">
                        {(draft.status ?? "em_producao") === "entregue"
                          ? "Estoque será baixado (pedido entregue)."
                          : "Estoque será reservado enquanto o pedido estiver em produção."}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Área (m²)">
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.area_m2 ?? ""}
                    onChange={(e) => setDraft({ ...draft, area_m2: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </Field>
                <Field label="Valor total (R$)">
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.total ?? ""}
                    onChange={(e) => {
                      const total = e.target.value === "" ? null : Number(e.target.value);
                      setDraft({
                        ...draft,
                        total,
                        partner_commission_amount: moneyFromPct(Number(draft.partner_commission_pct) || 0, Number(total) || 0),
                        sales_rep_commission_amount: moneyFromPct(Number(draft.sales_rep_commission_pct) || 0, Number(total) || 0),
                      });
                    }}
                  />
                </Field>
              </div>
              <div className="border border-[#e2e2e2] p-3 space-y-3">
                <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Vínculos comerciais e comissões</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Parceiro">
                    <select className={inputCls} value={draft.partner_id ?? ""} onChange={(e) => applyPartnerSelection(e.target.value)}>
                      <option value="">Sem parceiro</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} · {p.coupon_code}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Representante">
                    <select className={inputCls} value={draft.sales_rep_id ?? ""} onChange={(e) => applySalesRepSelection(e.target.value)}>
                      <option value="">Sem representante</option>
                      {salesReps.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} · {r.referral_code}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {(selectedPartner || selectedRep) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPartner && (
                      <div className="border border-[#f0f0f0] p-3">
                        <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#002045] mb-2">Repasse parceiro</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="% do pedido">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={inputCls}
                              value={draft.partner_commission_pct ?? 0}
                              onChange={(e) => {
                                const pct = Number(e.target.value) || 0;
                                setDraft({ ...draft, partner_commission_pct: pct, partner_commission_amount: moneyFromPct(pct) });
                              }}
                            />
                          </Field>
                          <Field label="Valor (R$)">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={inputCls}
                              value={draft.partner_commission_amount ?? 0}
                              onChange={(e) => {
                                const amount = Number(e.target.value) || 0;
                                setDraft({ ...draft, partner_commission_amount: amount, partner_commission_pct: pctFromMoney(amount) });
                              }}
                            />
                          </Field>
                        </div>
                      </div>
                    )}
                    {selectedRep && (
                      <div className="border border-[#f0f0f0] p-3">
                        <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#002045] mb-2">Comissão representante</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="% do pedido">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={inputCls}
                              value={draft.sales_rep_commission_pct ?? 0}
                              onChange={(e) => {
                                const pct = Number(e.target.value) || 0;
                                setDraft({ ...draft, sales_rep_commission_pct: pct, sales_rep_commission_amount: moneyFromPct(pct) });
                              }}
                            />
                          </Field>
                          <Field label="Valor (R$)">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={inputCls}
                              value={draft.sales_rep_commission_amount ?? 0}
                              onChange={(e) => {
                                const amount = Number(e.target.value) || 0;
                                setDraft({ ...draft, sales_rep_commission_amount: amount, sales_rep_commission_pct: pctFromMoney(amount) });
                              }}
                            />
                          </Field>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Desconto (R$)">
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={draft.discount_amount ?? ""}
                    onChange={(e) => setDraft({ ...draft, discount_amount: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                </Field>
                <Field label="Frete / despesas (R$)">
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={draft.freight_amount ?? ""}
                    onChange={(e) => setDraft({ ...draft, freight_amount: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                </Field>
              </div>
              <div className="border border-[#e2e2e2] p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Documento comercial</p>
                  {draft.id && (
                    <div className="flex flex-wrap gap-2">
                      {(["orcamento", "pedido", "nota", "recibo"] as const).map((tipo) => (
                        <a
                          key={tipo}
                          href={`/admin/pedidos/${draft.id}/documento?tipo=${tipo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-[#e2e2e2] px-2 py-1 text-[9px] uppercase tracking-[0.08em] font-bold text-[#002045] hover:border-[#002045]"
                        >
                          {tipo === "orcamento" ? "Orçamento" : tipo === "pedido" ? "Pedido" : tipo === "nota" ? "Nota" : "Recibo"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <Field label="Formas de pagamento">
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => {
                      const selected = (draft.payment_methods ?? ["Pix"]).includes(method);
                      return (
                        <label key={method} className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e]">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const current = draft.payment_methods ?? ["Pix"];
                              const next = e.target.checked ? [...current, method] : current.filter((m) => m !== method);
                              setDraft({ ...draft, payment_methods: next.length ? next : ["Pix"] });
                            }}
                          />
                          {method}
                        </label>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Condição de pagamento">
                  <input className={inputCls} value={draft.payment_terms ?? ""} onChange={(e) => setDraft({ ...draft, payment_terms: e.target.value })} placeholder={DEFAULT_PAYMENT_TERMS} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Validade do orçamento">
                    <input type="date" className={inputCls} value={toDateInput(draft.quote_valid_until)} onChange={(e) => setDraft({ ...draft, quote_valid_until: e.target.value || null })} />
                  </Field>
                  <Field label="Garantia">
                    <input className={inputCls} value={draft.warranty_terms ?? ""} onChange={(e) => setDraft({ ...draft, warranty_terms: e.target.value })} placeholder="Garantia legal conforme CDC" />
                  </Field>
                </div>
                <Field label="Observações do documento">
                  <textarea className={`${inputCls} min-h-[120px]`} value={draft.document_notes ?? ""} onChange={(e) => setDraft({ ...draft, document_notes: e.target.value })} placeholder={DEFAULT_DOCUMENT_NOTES} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status da produção">
                  <select className={inputCls} value={draft.status ?? "em_producao"} onChange={(e) => setDraft({ ...draft, status: e.target.value as PedidoStatus })}>
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Pagamento">
                  <select className={inputCls} value={draft.payment_status ?? "pendente"} onChange={(e) => setDraft({ ...draft, payment_status: e.target.value as PaymentStatus })}>
                    {PAYMENT_ORDER.map((s) => (
                      <option key={s} value={s}>{PAYMENT_META[s].label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Previsão de entrega">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={toLocalInput(draft.expected_delivery_at)}
                  onChange={(e) => setDraft({ ...draft, expected_delivery_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
              <Field label="Anotações">
                <textarea className={`${inputCls} min-h-[80px]`} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Ex: medidas, detalhes de acabamento, instruções de instalação" />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-[#e2e2e2] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => !saving && setDraft(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#74777f] hover:text-[#002045]">Cancelar</button>
              <button
                onClick={saveDraft}
                disabled={saving || !draft.client_name?.trim()}
                className="bg-[#002045] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#1a365d] disabled:opacity-50"
              >
                {saving ? "Salvando..." : draft._isNew ? "Criar pedido" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">{label}</span>
      {children}
    </label>
  );
}
