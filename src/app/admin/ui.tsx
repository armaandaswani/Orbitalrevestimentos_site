"use client";

import React from "react";

// ─── Orbital Admin design system ─────────────────────────────────────────────
// Single source for the visual vocabulary that every admin tab previously
// hand-rolled inline (same colors/typography — codified, not reinvented):
//   navy #002045 · hover #1a365d · borders #e2e2e2/#f0f0f0 · bg #f5f5f3
//   serif headings var(--font-noto-serif) · sans UI var(--font-inter)
// Rule of thumb: className CONSTANTS for things call-sites extend/concatenate
// (inputs, buttons, table cells); COMPONENTS for repeated structure.

// ─── Tab union ───────────────────────────────────────────────────────────────
// Central so page.tsx / new modules never re-declare the literal list.
export type AdminTab =
  | "dashboard" | "lembretes"
  | "leads" | "orcamentos" | "pedidos"
  | "partners" | "representantes" | "commissions"
  | "produtos" | "estoque" | "compras"
  | "financeiro" | "custos" | "relatorios"
  | "campaigns" | "projetos" | "midia"
  | "simulador" | "visualizacoes"
  | "precos" | "drip" | "chat";

// ─── className constants ─────────────────────────────────────────────────────
export const inputCls =
  "w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]";
export const labelCls =
  "block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2";
export const btnPrimary =
  "bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50";
export const btnSecondary =
  "border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-50";
export const btnGhost =
  "border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:border-[#002045] hover:text-[#002045] transition-colors disabled:opacity-50";
export const btnDanger =
  "border border-red-200 text-red-700 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50";
export const cardCls = "bg-white border border-[#e2e2e2] rounded-lg";
export const thCls =
  "text-left px-4 py-3 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] whitespace-nowrap border-b border-[#e2e2e2]";
export const tdCls = "px-4 py-3 text-xs font-[var(--font-inter)] text-[#43474e]";

export function fmtBRL(n: number | null | undefined): string {
  return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({
  title,
  action,
  className = "",
  padded = true,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  padded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${cardCls} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#f0f0f0]">
          {title && <SectionLabel>{title}</SectionLabel>}
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────
const KPI_TONES = {
  default: "border-l-[#002045]",
  good: "border-l-green-600",
  warn: "border-l-amber-500",
  bad: "border-l-red-500",
} as const;

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof KPI_TONES;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1.5">{label}</p>
      <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl sm:text-3xl font-normal leading-none">{value}</p>
      {hint && <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-1.5">{hint}</p>}
    </>
  );
  const cls = `${cardCls} border-l-4 ${KPI_TONES[tone]} p-5 min-w-0 text-left`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} w-full hover:border-[#002045] transition-colors cursor-pointer`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-4 mb-6 border-b border-[#e2e2e2]">
      <div className="min-w-0">
        <h1 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal leading-tight">{title}</h1>
        {subtitle && <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Section label ───────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">{children}</p>
  );
}

// ─── Status badge ────────────────────────────────────────────────────────────
const BADGE_TONES = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-[#eef2f8] text-[#002045]",
  gray: "bg-gray-100 text-gray-600",
  navy: "bg-[#002045] text-white",
} as const;

export function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof BADGE_TONES;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold font-[var(--font-inter)] tracking-wide rounded-sm ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${cardCls} px-6 py-14 text-center`}>
      <p className="font-[var(--font-noto-serif)] text-[#002045] text-lg">{title}</p>
      {hint && <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2 max-w-md mx-auto leading-relaxed">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// ─── Table shell ─────────────────────────────────────────────────────────────
// Interim no-bleed guarantee for wide tables until each gets its mobile-card
// dual render (Phase 5): content stays inside the container, scrolling within
// it instead of pushing the page wider.
export function TableShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${cardCls} overflow-x-auto ${className}`}>
      <table className="w-full text-sm font-[var(--font-inter)]">{children}</table>
    </div>
  );
}

// ─── Field (mobile-card label/value pair) ────────────────────────────────────
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="text-xs font-[var(--font-inter)] text-[#43474e]">
      <span className="text-[#74777f]">{label}:</span> {children}
    </span>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-[#e2e2e2] border-t-[#002045] rounded-full animate-spin align-middle" />
  );
}

// ─── Nav icons (Feather-style inline strokes) ────────────────────────────────
const ICON_PATHS: Record<AdminTab, React.ReactNode> = {
  dashboard: (<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>),
  lembretes: (<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  leads: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  orcamentos: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>),
  pedidos: (<><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>),
  partners: (<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></>),
  representantes: (<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>),
  commissions: (<><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>),
  produtos: (<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>),
  estoque: (<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>),
  compras: (<><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>),
  financeiro: (<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  custos: (<><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>),
  relatorios: (<><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>),
  campaigns: (<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>),
  projetos: (<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />),
  midia: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>),
  simulador: (<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>),
  visualizacoes: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  precos: (<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>),
  drip: (<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>),
  chat: (<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5h.5a8.48 8.48 0 0 1 8 8v.5z" />),
};

export function NavIcon({ id, className = "" }: { id: AdminTab; className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 ${className}`}
      aria-hidden
    >
      {ICON_PATHS[id]}
    </svg>
  );
}
