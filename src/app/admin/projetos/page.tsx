"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../AdminShell";
import { btnGhost, btnPrimary } from "../ui";

/**
 * Lista de projetos — só lista. O formulário de cadastro não mora mais aqui:
 * misturar "gerenciar o acervo" com "criar um item" era parte da confusão.
 *
 * Mobile-first de propósito: no celular cada projeto é um cartão empilhado, e
 * nunca há rolagem horizontal.
 */

interface Row {
  id: string; slug: string; title: string; product_code: string;
  image_after: string; cover_focus_x: number; cover_focus_y: number;
  is_active: boolean;
  primary_category: string | null; category_label: string | null;
  showroom_id: string | null; showroom_name: string | null;
  tags: string[]; needs_review: boolean; review_reason: string | null;
  media_count: number; site_path: string; categories: string[];
}

type StatusFilter = "todos" | "publicado" | "rascunho" | "revisao";

export default function ProjetosListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [cat, setCat] = useState("");
  // Vindo de "Ver projetos" na tela de Organização: o filtro já nasce aplicado.
  const [showroom, setShowroom] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("showroom") ?? "",
  );
  const [produto, setProduto] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch("/api/admin/projects").then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (!alive) return;
      setRows(r?.rows ?? []);
      setPending(!!r?.pending_migration);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const cats = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.primary_category) m.set(r.primary_category, r.category_label ?? r.primary_category);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const showrooms = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.showroom_id && r.showroom_name) m.set(r.showroom_id, r.showroom_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const produtos = useMemo(
    () => [...new Set(rows.map((r) => r.product_code).filter(Boolean))].sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (status === "publicado" && !r.is_active) return false;
    if (status === "rascunho" && r.is_active) return false;
    if (status === "revisao" && !r.needs_review) return false;
    if (cat && r.primary_category !== cat) return false;
    if (showroom && r.showroom_id !== showroom) return false;
    if (produto && r.product_code !== produto) return false;
    return true;
  });

  const reviewCount = rows.filter((r) => r.needs_review).length;

  async function togglePublish(r: Row) {
    setBusy(r.id);
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: !x.is_active } : x)));
    await fetch("/api/admin/projects", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
    }).catch(() => {});
    setBusy(null);
  }

  async function duplicate(r: Row) {
    setBusy(r.id);
    const res = await fetch(`/api/projects/photos/${r.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const fresh = await fetch("/api/admin/projects").then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (fresh?.rows) setRows(fresh.rows);
    }
    setBusy(null);
  }

  async function remove(r: Row) {
    if (!confirm(`Excluir "${r.title}"? As mídias do projeto também são removidas. Não dá para desfazer.`)) return;
    setBusy(r.id);
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    await fetch(`/api/projects/photos/${r.id}`, { method: "DELETE" }).catch(() => {});
    setBusy(null);
  }

  const selCls = "border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#43474e] bg-white focus:outline-none focus:border-[#002045] w-full";

  return (
    <AdminShell
      active="projetos"
      breadcrumb={[{ label: "Projetos" }]}
      title="Projetos"
      action={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/projetos/organizacao" className={btnGhost}>Categorias e Showrooms</Link>
          <Link href="/admin?tab=projetos" className={btnPrimary}>+ Novo projeto</Link>
        </div>
      }
    >
      {pending && (
        <div className="mb-6 bg-amber-50 border border-amber-300 px-4 py-3 text-sm font-[var(--font-inter)] text-amber-900">
          <strong className="font-bold">Migração 053 pendente.</strong> Categoria principal, showroom parceiro e
          &ldquo;Revisão necessária&rdquo; só aparecem depois de rodá-la.
        </div>
      )}
      {reviewCount > 0 && (
        <button
          onClick={() => setStatus(status === "revisao" ? "todos" : "revisao")}
          className="w-full text-left mb-6 bg-amber-50 border border-amber-300 px-4 py-3 text-sm font-[var(--font-inter)] text-amber-900 hover:bg-amber-100 transition-colors"
        >
          <strong className="font-bold">{reviewCount} projeto(s) precisam de revisão.</strong>{" "}
          A migração não conseguiu determinar onde eles aparecem no site.{" "}
          <span className="underline">{status === "revisao" ? "Ver todos" : "Ver só esses"}</span>
        </button>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#e2e2e2] p-3 sm:p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…"
          className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] w-full lg:col-span-1"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={selCls}>
          <option value="todos">Todos os status</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Rascunhos</option>
          {reviewCount > 0 && <option value="revisao">Revisão necessária</option>}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selCls}>
          <option value="">Todas as categorias</option>
          {cats.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
        </select>
        <select value={showroom} onChange={(e) => setShowroom(e.target.value)} className={selCls} disabled={showrooms.length === 0}>
          <option value="">{showrooms.length === 0 ? "Sem showrooms" : "Todos os showrooms"}</option>
          {showrooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={produto} onChange={(e) => setProduto(e.target.value)} className={selCls}>
          <option value="">Todos os produtos</option>
          {produtos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-3">
        {loading ? "Carregando…" : `${filtered.length} de ${rows.length} projeto(s)`}
      </p>

      {/* ── Lista ───────────────────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-4 py-10 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum projeto encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className={`bg-white border ${r.needs_review ? "border-amber-300" : "border-[#e2e2e2]"} p-3 flex flex-col sm:flex-row gap-3`}>
              {/* Miniatura vertical 4:5 — a mesma proporção do card do site. */}
              <div className="w-20 sm:w-16 shrink-0 aspect-[4/5] bg-[#f0f0f0] overflow-hidden">
                {r.image_after ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_after} alt=""
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${(r.cover_focus_x ?? 0.5) * 100}% ${(r.cover_focus_y ?? 0.5) * 100}%` }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#c4c6ca] text-[10px] font-[var(--font-inter)]">sem capa</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-[var(--font-inter)] text-[#002045] font-bold text-sm">{r.title}</p>
                  <span className={`text-[9px] tracking-[0.1em] uppercase font-bold px-1.5 py-0.5 ${r.is_active ? "bg-[#eef5ec] text-[#2c5226]" : "bg-[#f0f0f0] text-[#74777f]"}`}>
                    {r.is_active ? "Publicado" : "Rascunho"}
                  </span>
                  {r.needs_review && (
                    <span className="text-[9px] tracking-[0.1em] uppercase font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900">Revisão necessária</span>
                  )}
                </div>

                <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-1 break-words">{r.site_path}</p>
                {r.needs_review && r.review_reason && (
                  <p className="text-amber-800 text-[11px] font-[var(--font-inter)] mt-1">{r.review_reason}</p>
                )}
                <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-1">
                  {r.product_code || "sem produto"} · {r.media_count} {r.media_count === 1 ? "mídia" : "mídias"}
                  {r.tags.length > 0 && ` · ${r.tags.join(", ")}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:flex-col sm:w-32 shrink-0">
                <Link href="/admin?tab=projetos" className="flex-1 text-center border border-[#002045] text-[#002045] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-1.5 hover:bg-[#002045] hover:text-white transition-colors">
                  Editar
                </Link>
                <button onClick={() => togglePublish(r)} disabled={busy === r.id}
                  className="flex-1 border border-[#e2e2e2] text-[#43474e] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-1.5 hover:border-[#002045] hover:text-[#002045] transition-colors disabled:opacity-50">
                  {r.is_active ? "Despublicar" : "Publicar"}
                </button>
                <button onClick={() => duplicate(r)} disabled={busy === r.id}
                  className="flex-1 border border-[#e2e2e2] text-[#43474e] text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-1.5 hover:border-[#002045] hover:text-[#002045] transition-colors disabled:opacity-50">
                  Duplicar
                </button>
                <button onClick={() => remove(r)} disabled={busy === r.id}
                  className="flex-1 border border-red-200 text-red-700 text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-1.5 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
