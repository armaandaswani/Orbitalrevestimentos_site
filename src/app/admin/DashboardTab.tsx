"use client";

import React from "react";
import { Card, KpiCard, SectionLabel, Spinner, fmtBRL, btnPrimary, btnSecondary, btnGhost, cardCls, type AdminTab } from "./ui";

// ─── "Hoje" — the command-center dashboard ───────────────────────────────────
// Top: "Atenção agora" — everything that needs the owner's action, fed by
// /api/admin/overview (one aggregated round-trip). Below: the legacy KPI /
// status / trend / activity sections (moved out of page.tsx, unchanged data
// source: /api/admin/dashboard).

// Structurally identical to page.tsx's DashboardData (TS is structural, so the
// existing state can be passed straight in without exporting/importing types).
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

// Owned/fetched by page.tsx (also feeds the sidebar badges) and passed down.
export interface OverviewData {
  followupsOverdue: { count: number; rows: Array<{ id: string; name: string; phone: string | null; next_reminder_at: string; reminder_note: string | null }> };
  meetingsUpcoming: { count: number; rows: Array<{ id: string; title: string | null; scheduled_at: string; location: string | null; sales_rep_name: string | null }> };
  lowStock: { count: number; rows: Array<{ id: string; name: string; code: string | null; available: number; reorder_point: number }> };
  ordersInFlight: { count: number; emProducao: number; pronto: number; rows: Array<{ id: string; client_name: string; status: string; total: number | null; expected_delivery_at: string | null }> };
  quotesExpiring: { count: number; rows: Array<{ id: string; client_name: string; quote_valid_until: string | null; total: number | null }> };
  commissionsUnpaid: number;
  partnersPending: number;
  incomingShipments?: { count: number; rows: Array<{ id: string; reference: string | null; status: string; expected_arrival: string | null }> };
}

interface DashboardTabProps {
  dash: DashboardData | null;
  dashLoading: boolean;
  onRefreshDash: () => void;
  overview: OverviewData | null;
  overviewLoading: boolean;
  onRefreshOverview: () => void;
  onNavigate: (tab: AdminTab) => void;
  onOpenLead: (leadId: string) => void;
  onOpenPedido: (pedidoId: string) => void;
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

// One attention card: count-badge title, up to ~4 actionable rows, footer CTA.
function AttentionCard({
  title,
  count,
  tone,
  emptyLabel,
  ctaLabel,
  onCta,
  children,
}: {
  title: string;
  count: number;
  tone: "warn" | "bad" | "info";
  emptyLabel: string;
  ctaLabel: string;
  onCta: () => void;
  children?: React.ReactNode;
}) {
  const badgeCls =
    count === 0
      ? "bg-green-100 text-green-800"
      : tone === "bad"
        ? "bg-red-100 text-red-700"
        : tone === "warn"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-[#eef2f8] text-[#002045]";
  return (
    <div className={`${cardCls} flex flex-col min-w-0`}>
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[#f0f0f0]">
        <SectionLabel>{title}</SectionLabel>
        <span className={`text-[10px] font-bold font-[var(--font-inter)] px-2 py-0.5 rounded-full ${badgeCls}`}>
          {count === 0 ? "Em dia" : count}
        </span>
      </div>
      <div className="flex-1 px-5 py-3">
        {count === 0 ? (
          <p className="text-[#a0a3a8] text-xs font-[var(--font-inter)] py-2">{emptyLabel}</p>
        ) : (
          <div className="divide-y divide-[#f7f7f5]">{children}</div>
        )}
      </div>
      <button
        onClick={onCta}
        className="text-left px-5 py-2.5 border-t border-[#f0f0f0] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
      >
        {ctaLabel} →
      </button>
    </div>
  );
}

function AttentionRow({ primary, secondary, meta, onClick }: { primary: string; secondary?: string; meta?: string; onClick?: () => void }) {
  const inner = (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-[var(--font-inter)] text-[#002045] truncate">{primary}</p>
        {secondary && <p className="text-[10px] font-[var(--font-inter)] text-[#74777f] truncate">{secondary}</p>}
      </div>
      {meta && <span className="text-[10px] font-bold font-[var(--font-inter)] text-[#43474e] flex-shrink-0">{meta}</span>}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-2 text-left hover:bg-[#fafafa] transition-colors">
      {inner}
    </button>
  ) : (
    <div className="flex items-center gap-3 py-2">{inner}</div>
  );
}

export default function DashboardTab({ dash, dashLoading, onRefreshDash, overview, overviewLoading, onRefreshOverview, onNavigate, onOpenLead, onOpenPedido }: DashboardTabProps) {
  const fmtK = (n: number) => (n >= 1000 ? `R$${(n / 1000).toFixed(1)}k` : fmtBRL(n));
  const STATUS_MAP: Record<string, string> = { em_orcamento: "Em orçamento", concluido: "Concluído", cancelado: "Cancelado" };
  const PEDIDO_STATUS: Record<string, string> = { em_producao: "Em produção", pronto: "Pronto", entregue: "Entregue", cancelado: "Cancelado" };

  const trend = dash?.monthlyTrend ?? [];
  const maxMonth = trend.length > 0 ? Math.max(...trend.map((m) => m.count), 1) : 1;

  return (
    <div className="space-y-8 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-3 border-b border-[#e2e2e2]">
        <div>
          <h1 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal leading-tight">Hoje</h1>
          <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1 capitalize">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate("orcamentos")} className={btnPrimary}>Ver orçamentos</button>
          <button onClick={() => onNavigate("pedidos")} className={btnSecondary}>Pedidos</button>
          <button onClick={() => onNavigate("leads")} className={btnGhost}>Leads / CRM</button>
        </div>
      </div>

      {/* ── Atenção agora ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal">Atenção agora</h2>
          {overviewLoading && <Spinner />}
        </div>
        {overview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AttentionCard
              title="Follow-ups atrasados" count={overview.followupsOverdue.count} tone="bad"
              emptyLabel="Nenhum follow-up pendente." ctaLabel="Ver lembretes" onCta={() => onNavigate("lembretes")}
            >
              {overview.followupsOverdue.rows.map((l) => (
                <AttentionRow key={l.id} primary={l.name} secondary={l.reminder_note ?? undefined} meta={fmtDateShort(l.next_reminder_at)} onClick={() => onOpenLead(l.id)} />
              ))}
            </AttentionCard>

            <AttentionCard
              title="Reuniões (7 dias)" count={overview.meetingsUpcoming.count} tone="info"
              emptyLabel="Nenhuma reunião marcada." ctaLabel="Ver representantes" onCta={() => onNavigate("representantes")}
            >
              {overview.meetingsUpcoming.rows.map((m) => (
                <AttentionRow key={m.id} primary={m.title || "Reunião"} secondary={[m.sales_rep_name, m.location].filter(Boolean).join(" · ") || undefined} meta={fmtDateTime(m.scheduled_at)} />
              ))}
            </AttentionCard>

            <AttentionCard
              title="Estoque baixo" count={overview.lowStock.count} tone="warn"
              emptyLabel="Todos os produtos acima do mínimo." ctaLabel="Ver estoque" onCta={() => onNavigate("estoque")}
            >
              {overview.lowStock.rows.map((p) => (
                <AttentionRow key={p.id} primary={p.name} secondary={p.code ?? undefined} meta={`${p.available} disp. · mín ${p.reorder_point}`} />
              ))}
            </AttentionCard>

            <AttentionCard
              title="Pedidos em andamento" count={overview.ordersInFlight.count} tone="info"
              emptyLabel="Nenhum pedido em produção." ctaLabel="Ver pedidos" onCta={() => onNavigate("pedidos")}
            >
              {overview.ordersInFlight.rows.map((o) => (
                <AttentionRow key={o.id} primary={o.client_name} secondary={PEDIDO_STATUS[o.status] ?? o.status} meta={o.total != null ? fmtBRL(o.total) : undefined} onClick={() => onOpenPedido(o.id)} />
              ))}
            </AttentionCard>

            <AttentionCard
              title="Orçamentos vencendo" count={overview.quotesExpiring.count} tone="warn"
              emptyLabel="Nenhuma validade próxima." ctaLabel="Ver pedidos" onCta={() => onNavigate("pedidos")}
            >
              {overview.quotesExpiring.rows.map((q) => (
                <AttentionRow key={q.id} primary={q.client_name} meta={`vence ${fmtDateShort(q.quote_valid_until)}`} onClick={() => onOpenPedido(q.id)} />
              ))}
            </AttentionCard>

            {overview.incomingShipments && (
              <AttentionCard
                title="Chegadas previstas" count={overview.incomingShipments.count} tone="info"
                emptyLabel="Nenhuma importação a caminho." ctaLabel="Ver compras" onCta={() => onNavigate("compras")}
              >
                {overview.incomingShipments.rows.map((s) => (
                  <AttentionRow key={s.id} primary={s.reference || "Pedido de compra"} secondary={s.status === "in_transit" ? "em trânsito" : "pedido feito"} meta={s.expected_arrival ? fmtDateShort(s.expected_arrival) : undefined} />
                ))}
              </AttentionCard>
            )}

            <div className="grid grid-rows-2 gap-4 min-w-0">
              <KpiCard
                label="Comissões a pagar"
                value={fmtBRL(overview.commissionsUnpaid)}
                hint="cupons + pedidos entregues"
                tone={overview.commissionsUnpaid > 0 ? "warn" : "good"}
                onClick={() => onNavigate("commissions")}
              />
              <KpiCard
                label="Parceiros aguardando"
                value={overview.partnersPending}
                hint={overview.partnersPending > 0 ? "aprovação pendente" : "nenhuma pendência"}
                tone={overview.partnersPending > 0 ? "warn" : "good"}
                onClick={() => onNavigate("partners")}
              />
            </div>
          </div>
        ) : (
          <div className={`${cardCls} px-6 py-10 flex items-center justify-center gap-3`}>
            <Spinner />
            <p className="text-[#74777f] text-xs tracking-[0.15em] uppercase font-[var(--font-inter)]">Carregando visão geral…</p>
          </div>
        )}
      </div>

      {/* ── Legacy metrics (dados de orçamentos do simulador/cupons) ── */}
      {dashLoading || !dash ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#002045] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#74777f] text-xs tracking-[0.15em] uppercase font-[var(--font-inter)]">Carregando métricas…</p>
          </div>
        </div>
      ) : (
        <>
          {/* Top KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Orçamentos hoje" value={dash.hoje.count} hint={fmtK(dash.hoje.valor)} />
            <KpiCard label="Esta semana" value={dash.semana.count} hint={fmtK(dash.semana.valor)} />
            <KpiCard label="Este mês" value={dash.mes.count} hint={`${dash.mes.concluidos} concluídos`} />
            <KpiCard label="Total histórico" value={dash.totalOrcamentos} hint={fmtBRL(dash.totalValor)} />
          </div>

          {/* Middle row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Status dos orçamentos">
              <div className="space-y-3">
                {[
                  { label: "Em orçamento", value: dash.emOrcamento, total: dash.totalOrcamentos, color: "bg-yellow-400" },
                  { label: "Concluídos", value: dash.concluidos, total: dash.totalOrcamentos, color: "bg-green-400" },
                  { label: "Cancelados", value: dash.cancelados, total: dash.totalOrcamentos, color: "bg-red-300" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-[var(--font-inter)] text-[#43474e]">{s.label}</span>
                      <span className="text-xs font-bold font-[var(--font-inter)] text-[#002045]">{s.value}</span>
                    </div>
                    <div className="h-1.5 bg-[#f0efec] rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.total > 0 ? Math.round((s.value / s.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#f0efec] flex items-center justify-between">
                  <span className="text-xs font-[var(--font-inter)] text-[#74777f]">Taxa de conversão</span>
                  <span className="text-sm font-bold font-[var(--font-inter)] text-[#002045]">{dash.conversionRate}%</span>
                </div>
              </div>
            </Card>

            <Card title="Parceiros & comissões">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-[var(--font-inter)] text-[#74777f]">Parceiros ativos</span>
                  <span className="font-[var(--font-noto-serif)] text-2xl text-[#002045]">{dash.parceirosAtivos}</span>
                </div>
                {dash.parceirosPendentes > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-[var(--font-inter)] text-[#74777f]">Aguardando aprovação</span>
                    <span className="text-sm font-bold font-[var(--font-inter)] text-yellow-600">{dash.parceirosPendentes}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#f0efec]">
                  <p className="text-[#74777f] text-[10px] uppercase tracking-widest font-[var(--font-inter)] mb-1">Comissões a pagar</p>
                  <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl">{fmtBRL(dash.comissaoPendente)}</p>
                </div>
                <button onClick={() => onNavigate("commissions")} className={`${btnSecondary} w-full text-center`}>
                  Ver comissões →
                </button>
              </div>
            </Card>

            <Card title="Produtos mais orçados">
              <div className="space-y-2.5">
                {(dash.topProducts ?? []).length === 0 ? (
                  <p className="text-[#74777f] text-xs font-[var(--font-inter)]">Nenhum dado disponível.</p>
                ) : (dash.topProducts ?? []).map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-[#74777f] text-[10px] font-[var(--font-inter)] w-4 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-[var(--font-inter)] text-[#43474e] truncate">{p.name}</p>
                    </div>
                    <span className="text-xs font-bold font-[var(--font-inter)] text-[#002045]">{p.count}×</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Monthly trend */}
          <Card title="Orçamentos — últimos 6 meses">
            <div className="flex items-end gap-3 h-28">
              {trend.map((m) => {
                const [year, month] = m.month.split("-");
                const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
                const label = `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
                const pct = maxMonth > 0 ? Math.round((m.count / maxMonth) * 100) : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[#002045] text-[10px] font-bold font-[var(--font-inter)]">{m.count > 0 ? m.count : ""}</span>
                    <div className="w-full bg-[#f0efec] rounded-sm overflow-hidden" style={{ height: "80px" }}>
                      <div className="w-full bg-[#002045] rounded-sm transition-all duration-500" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                    </div>
                    <span className="text-[#74777f] text-[9px] font-[var(--font-inter)]">{label}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent activity */}
          <Card
            title="Atividade recente"
            padded={false}
            action={
              <button onClick={() => onNavigate("orcamentos")} className="text-[10px] tracking-widest uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors">
                Ver todos →
              </button>
            }
          >
            <div className="divide-y divide-[#f0efec]">
              {(dash.recentActivity ?? []).length === 0 ? (
                <p className="px-6 py-4 text-xs text-[#74777f] font-[var(--font-inter)]">Nenhuma atividade recente.</p>
              ) : (dash.recentActivity ?? []).map((a) => {
                const statusCls = a.sale_status === "concluido" ? "text-green-600" : a.sale_status === "cancelado" ? "text-red-500" : "text-yellow-600";
                return (
                  <div key={a.id} className="px-6 py-3 flex items-center gap-4 hover:bg-[#fafafa] transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#002045] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-[var(--font-inter)] text-[#002045] truncate">{a.architect_name ?? "—"} · {a.product_name ?? "—"}</p>
                      <p className="text-[10px] font-[var(--font-inter)] text-[#74777f]">{a.space ?? "—"} · {a.coupon_code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold font-[var(--font-inter)] text-[#002045]">{a.material_discounted ? fmtBRL(a.material_discounted) : "—"}</p>
                      <p className={`text-[10px] font-[var(--font-inter)] ${statusCls}`}>{STATUS_MAP[a.sale_status ?? ""] ?? "Em orçamento"}</p>
                    </div>
                    <p className="text-[10px] font-[var(--font-inter)] text-[#b0b0b0] flex-shrink-0 hidden sm:block">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Refresh */}
          <div className="text-right">
            <button
              onClick={() => { onRefreshDash(); onRefreshOverview(); }}
              className="text-[10px] tracking-widest uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
            >
              ↺ Atualizar dados
            </button>
          </div>
        </>
      )}
    </div>
  );
}
