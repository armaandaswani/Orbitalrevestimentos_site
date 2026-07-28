"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../../AdminShell";
import { btnGhost, btnPrimary, inputCls, labelCls } from "../../ui";

/**
 * Categorias e Showrooms — a tela que antes era uma caixa espremida no topo do
 * cadastro de projetos.
 *
 * Separa as três coisas que o modelo antigo misturava num array de texto só:
 *   Categoria principal → onde o projeto aparece na navegação do site
 *   Showroom parceiro   → uma empresa, com endereço próprio, que abriga ambientes
 *   Característica      → descreve o ambiente sem virar item de menu
 */

interface Cat { id: string; slug: string; label: string; description: string | null; sort_order: number; active: boolean }
interface Showroom {
  id: string; slug: string; name: string; address: string | null; maps_url: string | null;
  description: string | null; logo_url: string | null; cover_url: string | null;
  active: boolean; sort_order: number; project_count: number;
}
interface Tag { id: string; slug: string; label: string; sort_order: number; active: boolean }

export default function OrganizacaoPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [newCat, setNewCat] = useState("");
  const [newShowroom, setNewShowroom] = useState("");
  const [newTag, setNewTag] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const flash = useCallback((m: string) => { setSaved(m); setTimeout(() => setSaved(null), 2200); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, s, t] = await Promise.all([
        fetch("/api/admin/project-categories").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/admin/partner-showrooms").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/project-tags").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (!alive) return;
      setCats(Array.isArray(c) ? c : []);
      setShowrooms(s?.rows ?? []);
      setTags(t?.rows ?? []);
      setPending(!!s?.pending_migration || !!t?.pending_migration);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // ── Categorias ─────────────────────────────────────────────────────────────
  const activeCats = cats.filter((c) => c.active).sort((a, b) => a.sort_order - b.sort_order);

  async function patchCat(id: string, patch: Partial<Cat>) {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await fetch(`/api/admin/project-categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => {});
  }

  async function createCat() {
    const label = newCat.trim();
    if (!label) return;
    const slug = label.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) { setErr("Nome inválido."); return; }
    const res = await fetch("/api/admin/project-categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, label }),
    });
    if (!res.ok) { setErr((await res.json().catch(() => ({})))?.error ?? "Não foi possível criar."); return; }
    const created = await res.json();
    setCats((prev) => [...prev, created]);
    setNewCat("");
    flash(`"${label}" criada — já aparece no site e no cadastro de projetos.`);
  }

  async function moveCat(id: string, dir: -1 | 1) {
    const ordered = [...activeCats];
    const i = ordered.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    const reindexed = ordered.map((c, idx) => ({ ...c, sort_order: idx }));
    setCats((prev) => prev.map((c) => reindexed.find((r) => r.id === c.id) ?? c));
    await fetch("/api/admin/project-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: reindexed.map((c) => ({ id: c.id, sort_order: c.sort_order })) }),
    }).catch(() => {});
    flash("Ordem salva — já vale no site.");
  }

  // ── Showrooms ──────────────────────────────────────────────────────────────
  async function createShowroom() {
    const name = newShowroom.trim();
    if (!name) return;
    const res = await fetch("/api/admin/partner-showrooms", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    if (!res.ok) { setErr((await res.json().catch(() => ({})))?.error ?? "Não foi possível criar."); return; }
    const created = await res.json();
    setShowrooms((prev) => [...prev, created]);
    setNewShowroom("");
    setEditing(created.id);
    flash(`"${name}" criado. Preencha o endereço.`);
  }

  async function patchShowroom(id: string, patch: Partial<Showroom>) {
    setShowrooms((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await fetch(`/api/admin/partner-showrooms/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => {});
  }

  async function removeShowroom(s: Showroom) {
    const warn = s.project_count > 0
      ? `"${s.name}" tem ${s.project_count} ambiente(s). Eles NÃO serão apagados: ficam sem showroom e marcados como "Revisão necessária". Continuar?`
      : `Remover "${s.name}"?`;
    if (!confirm(warn)) return;
    setShowrooms((prev) => prev.filter((x) => x.id !== s.id));
    await fetch(`/api/admin/partner-showrooms/${s.id}`, { method: "DELETE" }).catch(() => {});
    flash(s.project_count > 0 ? `${s.project_count} ambiente(s) foram para revisão.` : "Showroom removido.");
  }

  // ── Características ────────────────────────────────────────────────────────
  async function createTag() {
    const label = newTag.trim();
    if (!label) return;
    const res = await fetch("/api/admin/project-tags", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }),
    });
    if (!res.ok) { setErr((await res.json().catch(() => ({})))?.error ?? "Não foi possível criar."); return; }
    const created = await res.json();
    setTags((prev) => [...prev, created]);
    setNewTag("");
  }

  async function patchTag(id: string, patch: Partial<Tag>) {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await fetch(`/api/admin/project-tags/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => {});
  }

  async function removeTag(t: Tag) {
    if (!confirm(`Remover a característica "${t.label}"? Os projetos que já a usam não são alterados.`)) return;
    setTags((prev) => prev.filter((x) => x.id !== t.id));
    await fetch(`/api/admin/project-tags/${t.id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <AdminShell
      active="projetos"
      breadcrumb={[{ label: "Projetos", href: "/admin/projetos" }, { label: "Categorias e Showrooms" }]}
      title="Categorias e Showrooms"
    >
      {saved && (
        <div className="mb-4 bg-[#eef5ec] border border-[#3b6934]/25 text-[#2c5226] px-4 py-2.5 text-sm font-[var(--font-inter)]">{saved}</div>
      )}
      {err && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm font-[var(--font-inter)] flex items-start justify-between gap-3">
          <span>{err}</span>
          <button onClick={() => setErr(null)} className="font-bold shrink-0">✕</button>
        </div>
      )}
      {pending && (
        <div className="mb-6 bg-amber-50 border border-amber-300 px-4 py-3 text-sm font-[var(--font-inter)] text-amber-900">
          <strong className="font-bold">Migração 053 pendente.</strong> As tabelas de showrooms parceiros e características
          ainda não existem no banco. Rode <code className="bg-amber-100 px-1">053_projects_showrooms_architecture.sql</code> no
          Supabase para habilitar esta tela.
        </div>
      )}

      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p>
      ) : (
        <div className="space-y-8">

          {/* ── 1. Categorias principais ───────────────────────────────────── */}
          <section className="bg-white border border-[#e2e2e2]">
            <div className="px-4 sm:px-5 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Categorias principais</h2>
              <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-1">
                São as seções da página de Projetos, nesta ordem. Todo projeto pertence a exatamente uma.
              </p>
            </div>
            <div className="divide-y divide-[#f0f0f0]">
              {activeCats.map((c, idx) => (
                <div key={c.id} className="px-4 sm:px-5 py-3.5 flex gap-3">
                  <div className="flex flex-col pt-1 shrink-0">
                    <button onClick={() => moveCat(c.id, -1)} disabled={idx === 0}
                      className="text-[#74777f] hover:text-[#002045] disabled:opacity-20 leading-none text-sm" aria-label="Subir">▲</button>
                    <button onClick={() => moveCat(c.id, 1)} disabled={idx === activeCats.length - 1}
                      className="text-[#74777f] hover:text-[#002045] disabled:opacity-20 leading-none text-sm" aria-label="Descer">▼</button>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input value={c.label} onChange={(e) => patchCat(c.id, { label: e.target.value })}
                      className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] font-semibold focus:outline-none focus:border-[#002045]" />
                    <input value={c.description ?? ""} onChange={(e) => patchCat(c.id, { description: e.target.value })}
                      placeholder="Subtítulo da seção no site (opcional)"
                      className="w-full border border-[#e2e2e2] px-3 py-1.5 text-xs font-[var(--font-inter)] text-[#43474e] focus:outline-none focus:border-[#002045]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 sm:px-5 py-4 border-t border-[#f0f0f0] flex flex-wrap gap-2">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createCat(); } }}
                placeholder="Nova categoria principal (ex.: Corporativo)"
                className="flex-1 min-w-[200px] border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
              <button onClick={createCat} disabled={!newCat.trim()} className={btnPrimary}>+ Criar</button>
            </div>
          </section>

          {/* ── 2. Showrooms parceiros ─────────────────────────────────────── */}
          <section className="bg-white border border-[#e2e2e2]">
            <div className="px-4 sm:px-5 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Showrooms parceiros</h2>
              <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-1">
                Cada parceiro tem um endereço só. Os ambientes cadastrados dentro dele herdam esse endereço —
                não é preciso repetir em cada projeto.
              </p>
            </div>

            {showrooms.length === 0 ? (
              <p className="px-4 sm:px-5 py-6 text-[#a0a3a8] text-sm font-[var(--font-inter)]">
                Nenhum showroom parceiro cadastrado ainda.
              </p>
            ) : (
              <div className="divide-y divide-[#f0f0f0]">
                {showrooms.map((s) => (
                  <div key={s.id} className="px-4 sm:px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-[var(--font-inter)] text-[#002045] font-bold text-sm flex items-center gap-2 flex-wrap">
                          {s.name}
                          {!s.active && <span className="text-[9px] tracking-[0.1em] uppercase font-bold bg-[#f0f0f0] text-[#74777f] px-1.5 py-0.5">Inativo</span>}
                        </p>
                        <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">
                          {s.address || <span className="text-[#c4c6ca]">Sem endereço cadastrado</span>}
                        </p>
                        <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">
                          {s.project_count} {s.project_count === 1 ? "ambiente" : "ambientes"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setEditing(editing === s.id ? null : s.id)} className={btnGhost}>
                          {editing === s.id ? "Fechar" : "Editar"}
                        </button>
                        <Link href={`/admin/projetos?showroom=${s.id}`} className={btnGhost}>Ver projetos</Link>
                      </div>
                    </div>

                    {editing === s.id && (
                      <div className="mt-4 pt-4 border-t border-[#f0f0f0] grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Nome</label>
                          <input value={s.name} onChange={(e) => patchShowroom(s.id, { name: e.target.value })} className={inputCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Endereço</label>
                          <input value={s.address ?? ""} onChange={(e) => patchShowroom(s.id, { address: e.target.value })}
                            placeholder="Rua, número, bairro — Manaus/AM" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Link do Google Maps</label>
                          <input value={s.maps_url ?? ""} onChange={(e) => patchShowroom(s.id, { maps_url: e.target.value })}
                            placeholder="https://maps.app.goo.gl/…" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Logo (URL)</label>
                          <input value={s.logo_url ?? ""} onChange={(e) => patchShowroom(s.id, { logo_url: e.target.value })}
                            placeholder="/images/showrooms/…" className={inputCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Descrição curta</label>
                          <input value={s.description ?? ""} onChange={(e) => patchShowroom(s.id, { description: e.target.value })}
                            placeholder="Aparece na página do showroom no site" className={inputCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Foto de capa (URL)</label>
                          <input value={s.cover_url ?? ""} onChange={(e) => patchShowroom(s.id, { cover_url: e.target.value })}
                            placeholder="/images/showrooms/…" className={inputCls} />
                        </div>
                        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                          <label className="flex items-center gap-2 text-[13px] font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                            <input type="checkbox" checked={s.active} onChange={(e) => patchShowroom(s.id, { active: e.target.checked })} />
                            Ativo (visível no site)
                          </label>
                          <button onClick={() => removeShowroom(s)}
                            className="border border-red-200 text-red-700 text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-red-50 hover:border-red-400 transition-colors">
                            Remover
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 sm:px-5 py-4 border-t border-[#f0f0f0] flex flex-wrap gap-2">
              <input value={newShowroom} onChange={(e) => setNewShowroom(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createShowroom(); } }}
                placeholder="Nome do showroom parceiro (ex.: Ornare)" disabled={pending}
                className="flex-1 min-w-[200px] border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] disabled:bg-[#f5f5f3]" />
              <button onClick={createShowroom} disabled={pending || !newShowroom.trim()} className={btnPrimary}>
                + Novo showroom
              </button>
            </div>
          </section>

          {/* ── 3. Características ─────────────────────────────────────────── */}
          <section className="bg-white border border-[#e2e2e2]">
            <div className="px-4 sm:px-5 py-4 border-b border-[#f0f0f0]">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Características do ambiente</h2>
              <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-1">
                &ldquo;Área úmida&rdquo;, &ldquo;cozinha&rdquo;, &ldquo;teto&rdquo;. Descrevem o projeto sem virar item de menu —
                por isso não competem com as categorias principais.
              </p>
            </div>

            {tags.length === 0 ? (
              <p className="px-4 sm:px-5 py-6 text-[#a0a3a8] text-sm font-[var(--font-inter)]">Nenhuma característica cadastrada.</p>
            ) : (
              <div className="divide-y divide-[#f0f0f0]">
                {tags.map((t) => (
                  <div key={t.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3">
                    <input value={t.label} onChange={(e) => patchTag(t.id, { label: e.target.value })}
                      className="flex-1 min-w-[160px] border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    <label className="flex items-center gap-2 text-[12px] font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                      <input type="checkbox" checked={t.active} onChange={(e) => patchTag(t.id, { active: e.target.checked })} />
                      Ativa
                    </label>
                    <button onClick={() => removeTag(t)} aria-label="Remover"
                      className="text-[#cc0000] hover:text-white hover:bg-[#cc0000] w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 sm:px-5 py-4 border-t border-[#f0f0f0] flex flex-wrap gap-2">
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createTag(); } }}
                placeholder="Nova característica (ex.: Área úmida)" disabled={pending}
                className="flex-1 min-w-[200px] border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] disabled:bg-[#f5f5f3]" />
              <button onClick={createTag} disabled={pending || !newTag.trim()} className={btnPrimary}>+ Criar</button>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
