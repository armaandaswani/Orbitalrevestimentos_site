"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "../AdminShell";
import { inputCls, labelCls } from "../ui";
import CoverFramer, { COVER_ASPECT, coverStyle } from "./CoverFramer";
import { isUsableVideoUrl, videoHostLabel, videoThumbnail } from "@/lib/video-link";
import { compressImage } from "@/lib/image-compress";

/**
 * Editor de projeto — criação e edição na mesma tela.
 *
 * Quatro blocos, na ordem em que a decisão acontece: o que é o projeto, onde ele
 * aparece, o que tem dentro, e se está no ar. A coluna da direita mostra, o
 * tempo todo, como isso vai sair no site — a dúvida que o formulário antigo
 * deixava aberta.
 *
 * O projeto já existe como rascunho quando esta tela abre (criado por /novo),
 * então as mídias têm a que se vincular desde o primeiro upload.
 */

type MediaCat = "geral" | "antes" | "depois";

interface Media {
  id: string; project_slug: string; type: "image" | "video"; url: string;
  caption: string | null; description: string | null; category: MediaCat;
  is_cover?: boolean; sort_order: number;
}
interface Project {
  id: string; slug: string; title: string; product_code: string; short_description?: string;
  note?: string; image_after: string; image_before?: string; cover_category?: string | null;
  is_active: boolean; is_featured?: boolean; show_on_home?: boolean; feature_order?: number;
  primary_category?: string | null; showroom_id?: string | null; tags?: string[];
  needs_review?: boolean; review_reason?: string | null;
  cover_focus_x?: number; cover_focus_y?: number; cover_zoom?: number;
}
interface Cat { slug: string; label: string; active: boolean }
interface Showroom { id: string; name: string; address: string | null; active: boolean }
interface Tag { id: string; slug: string; label: string; active: boolean }
interface Product { code: string; name: string; finish?: string }

const SHOWROOM_SLUG = "showroom";

export default function ProjectEditor({ id }: { id: string }) {
  const router = useRouter();

  const [p, setP] = useState<Project | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Carga ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      const [proj, cs, sr, tg, pr] = await Promise.all([
        fetch("/api/admin/projects").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/project-categories").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/admin/partner-showrooms").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/project-tags").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/products?all=true").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      if (!alive) return;

      const row = (proj?.rows ?? []).find((x: { id: string }) => x.id === id);
      if (!row) { setNotFound(true); setLoading(false); return; }

      // A lista traz um resumo; o registro completo vem do endpoint do projeto.
      const full = await fetch(`/api/projects/photos`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
      const detailed = (full as Project[]).find((x) => x.id === id);
      const base: Project = { ...(detailed ?? {}), ...row } as Project;

      setP(base);
      setCats((Array.isArray(cs) ? cs : []).filter((c: Cat) => c.active !== false));
      setShowrooms((sr?.rows ?? []).filter((s: Showroom) => s.active !== false));
      setTags((tg?.rows ?? []).filter((t: Tag) => t.active !== false));
      setProducts(Array.isArray(pr) ? pr : []);

      const m = await fetch(`/api/projects/media?slug=${encodeURIComponent(base.slug)}`)
        .then((r) => (r.ok ? r.json() : [])).catch(() => []);
      if (!alive) return;
      setMedia(Array.isArray(m) ? m : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  // ── Salvamento ─────────────────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (patch: Partial<Project>) => {
    setSaveState("saving");
    const res = await fetch(`/api/projects/photos/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res || !res.ok) { setErr("Não foi possível salvar. Sua alteração continua na tela."); setSaveState("idle"); return; }
    setSaveState("saved");
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1800);
  }, [id]);

  /** Muda na tela na hora e grava sozinho pouco depois — nada se perde. */
  const set = useCallback((patch: Partial<Project>) => {
    setP((prev) => (prev ? { ...prev, ...patch } : prev));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(patch), 600);
  }, [persist]);

  // ── Mídias ─────────────────────────────────────────────────────────────────
  /**
   * Upload direto para o Supabase, via URL assinada.
   *
   * NÃO passe o arquivo por uma rota Next: em produção a Vercel corta o corpo da
   * requisição em ~4,5 MB e qualquer foto de celular estoura isso. Aqui só a
   * assinatura passa pelo servidor; os bytes vão do navegador para o storage.
   *
   * Toda falha é mostrada na tela. A versão anterior engolia os erros e os
   * arquivos simplesmente sumiam, sem nunca ter entrado.
   */
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!p) return;
    const list = Array.from(files);
    setErr(null);
    setUploading(list.length);
    let order = media.length;
    const failed: string[] = [];

    for (const original of list) {
      try {
        // Comprime antes de subir — ver @/lib/image-compress. Sem isto a foto de
        // câmera vai crua para o storage e depois é servida crua ao visitante.
        const f = await compressImage(original);

        const sign = await fetch("/api/admin/upload-sign", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: `projetos/${p.slug}`, filename: f.name, contentType: f.type }),
        });
        if (!sign.ok) throw new Error(`assinatura falhou (${sign.status}): ${await sign.text()}`);
        const { signedUrl, publicUrl } = await sign.json();

        const put = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": f.type }, body: f });
        if (!put.ok) throw new Error(`envio falhou (${put.status}): ${await put.text()}`);

        const res = await fetch("/api/projects/media", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_slug: p.slug, type: f.type.startsWith("video/") ? "video" : "image",
            url: publicUrl, category: "geral", sort_order: order++,
          }),
        });
        if (!res.ok) throw new Error(`registro falhou (${res.status}): ${await res.text()}`);

        const created = await res.json();
        setMedia((prev) => [...prev, created]);
      } catch (e) {
        failed.push(`${original.name}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }

    setUploading(0);
    if (failed.length > 0) setErr(`Não foi possível enviar ${failed.length} arquivo(s). ${failed.join(" · ")}`);
  }, [p, media.length]);

  /**
   * Vídeo por link (YouTube, Vimeo, Drive).
   *
   * Vídeo longo não cabe no storage do site — entra como endereço. A galeria
   * abre o link numa aba nova, sem incorporar o player.
   */
  const addVideoUrl = useCallback(async () => {
    if (!p) return;
    const url = videoUrl.trim();
    if (!isUsableVideoUrl(url)) {
      setErr("Cole um endereço completo, começando com https:// (YouTube, Vimeo, Drive…).");
      return;
    }
    setErr(null);
    const res = await fetch("/api/projects/media", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_slug: p.slug, type: "video", url,
        category: "geral", sort_order: media.length,
      }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setErr(`Não foi possível adicionar o vídeo${res ? ` (${res.status})` : ""}.`);
      return;
    }
    const created = await res.json();
    setMedia((prev) => [...prev, created]);
    setVideoUrl("");
  }, [p, media.length, videoUrl]);

  const patchMedia = useCallback(async (mid: string, patch: Partial<Media>) => {
    setMedia((prev) => prev.map((m) => (m.id === mid ? { ...m, ...patch } : m)));
    const res = await fetch(`/api/projects/media/${mid}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res || !res.ok) setErr("A alteração da mídia não foi gravada. Recarregue para ver o estado real.");
  }, []);

  const removeMedia = useCallback(async (m: Media) => {
    if (m.is_cover) { setErr("Esta é a capa. Escolha outra capa antes de removê-la."); return; }
    if (!confirm("Remover esta mídia do projeto?")) return;
    setMedia((prev) => prev.filter((x) => x.id !== m.id));
    const res = await fetch(`/api/projects/media/${m.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) setErr("A mídia não foi removida no servidor. Recarregue para ver o estado real.");
  }, []);

  /**
   * Define a capa sem perder a anterior: a antiga só deixa de ser capa, continua
   * na galeria com a classificação que tinha. A classificação da nova NÃO muda
   * por virar capa — é ela que vira a etiqueta no site.
   */
  const setAsCover = useCallback(async (m: Media) => {
    if (!p || m.type !== "image") return;
    const old = media.find((x) => x.is_cover && x.id !== m.id);
    setMedia((prev) => prev.map((x) => ({ ...x, is_cover: x.id === m.id })));
    if (old) await patchMedia(old.id, { is_cover: false });
    await patchMedia(m.id, { is_cover: true });
    set({ image_after: m.url, cover_category: m.category, cover_focus_x: 0.5, cover_focus_y: 0.5, cover_zoom: 1 });
  }, [p, media, patchMedia, set]);

  const reorder = useCallback(async (fromId: string, toId: string) => {
    const list = [...media].sort((a, b) => a.sort_order - b.sort_order);
    const from = list.findIndex((m) => m.id === fromId);
    const to = list.findIndex((m) => m.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const reindexed = list.map((m, i) => ({ ...m, sort_order: i }));
    setMedia(reindexed);
    await Promise.all(reindexed.map((m) =>
      fetch(`/api/projects/media/${m.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: m.sort_order }),
      }).catch(() => {})));
  }, [media]);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const isShowroom = p?.primary_category === SHOWROOM_SLUG;
  const showroom = showrooms.find((s) => s.id === p?.showroom_id) ?? null;
  const catLabel = cats.find((c) => c.slug === p?.primary_category)?.label ?? null;

  const trail = useMemo(() => {
    const t = ["Projetos"];
    if (catLabel) t.push(catLabel);
    if (isShowroom && showroom) t.push(showroom.name);
    t.push(p?.title?.trim() || "Sem nome");
    return t;
  }, [catLabel, isShowroom, showroom, p?.title]);

  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order);
  const hasAntes = media.some((m) => m.category === "antes");
  const hasDepois = media.some((m) => m.category === "depois");
  const galleryState = hasAntes && hasDepois ? "Antes e depois — comparação ativada no site"
    : hasAntes ? "Só fotos de antes — galeria simples, sem comparativo vazio"
    : hasDepois ? "Só fotos de depois — galeria simples"
    : media.length > 0 ? "Galeria comum (sem classificação antes/depois)"
    : "Nenhuma mídia ainda";

  const blocked = !p?.title?.trim() ? "Dê um nome ao projeto."
    : !p?.primary_category ? "Escolha a categoria principal."
    : isShowroom && !p?.showroom_id ? "Escolha o showroom parceiro."
    : !p?.image_after ? "Defina a capa do projeto."
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <AdminShell breadcrumb={[{ label: "Projetos", href: "/admin/projetos" }]} title="Carregando…"><div /></AdminShell>;
  }
  if (notFound || !p) {
    return (
      <AdminShell breadcrumb={[{ label: "Projetos", href: "/admin/projetos" }]} title="Projeto não encontrado">
        <Link href="/admin/projetos" className="text-[#002045] underline text-sm font-[var(--font-inter)]">Voltar para a lista</Link>
      </AdminShell>
    );
  }

  const secCls = "bg-white border border-[#e2e2e2]";
  const secHead = "px-4 sm:px-5 py-3.5 border-b border-[#f0f0f0]";
  const secTitle = "font-[var(--font-noto-serif)] text-[#002045] text-lg";
  const secHint = "text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5";

  const preview = (
    <div className="bg-white border border-[#e2e2e2] p-4">
      <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-3">
        Como aparecerá no site
      </p>
      <div className="w-full max-w-[200px] mx-auto">
        <div className="w-full overflow-hidden bg-[#f0f0f0] relative" style={{ aspectRatio: COVER_ASPECT }}>
          {p.image_after ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_after} alt="" className="absolute inset-0 w-full h-full"
              style={coverStyle(p.cover_focus_x ?? 0.5, p.cover_focus_y ?? 0.5, p.cover_zoom ?? 1)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#c4c6ca] text-[11px] font-[var(--font-inter)]">sem capa</div>
          )}
          {(p.cover_category === "antes" || p.cover_category === "depois") && (
            <span className={`absolute top-1.5 left-1.5 text-[8px] tracking-[0.15em] uppercase font-bold px-1.5 py-0.5 ${p.cover_category === "antes" ? "bg-amber-500/90 text-white" : "bg-[#3b6934]/90 text-white"}`}>
              {p.cover_category === "antes" ? "Antes" : "Depois"}
            </span>
          )}
        </div>
        <p className="font-[var(--font-noto-serif)] text-[#002045] text-base mt-2.5">{p.title?.trim() || "Sem nome"}</p>
        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
          {p.product_code || "sem produto"}{catLabel ? ` · ${catLabel}` : ""}
        </p>
        {isShowroom && showroom && (
          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-0.5">{showroom.name}</p>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-[#f0f0f0] space-y-1.5">
        <p className="text-[11px] font-[var(--font-inter)] text-[#43474e] break-words">
          <span className="text-[#a0a3a8]">Caminho: </span>{trail.join(" › ")}
        </p>
        <p className="text-[11px] font-[var(--font-inter)] text-[#43474e]">
          <span className="text-[#a0a3a8]">Galeria: </span>{galleryState}
        </p>
      </div>
    </div>
  );

  return (
    <AdminShell
      breadcrumb={[{ label: "Projetos", href: "/admin/projetos" }, { label: p.title?.trim() || "Novo projeto" }]}
      title={p.title?.trim() || "Novo projeto"}
      action={
        <span className={`text-[11px] font-[var(--font-inter)] px-2.5 py-1 ${p.is_active ? "bg-[#eef5ec] text-[#2c5226]" : "bg-[#f0f0f0] text-[#74777f]"}`}>
          {p.is_active ? "Publicado" : "Rascunho"}
          {saveState === "saving" && " · salvando…"}
          {saveState === "saved" && " · salvo"}
        </span>
      }
    >
      {err && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm font-[var(--font-inter)] flex items-start justify-between gap-3">
          <span>{err}</span>
          <button onClick={() => setErr(null)} className="font-bold shrink-0">✕</button>
        </div>
      )}
      {p.needs_review && (
        <div className="mb-4 bg-amber-50 border border-amber-300 px-4 py-3 text-sm font-[var(--font-inter)] text-amber-900">
          <strong className="font-bold">Revisão necessária.</strong> {p.review_reason}{" "}
          <button onClick={() => set({ needs_review: false, review_reason: null })} className="underline font-bold">
            Está correto, remover o aviso
          </button>
        </div>
      )}

      {/* Prévia recolhível no mobile. */}
      <button onClick={() => setShowPreview((v) => !v)}
        className="lg:hidden w-full mb-4 border border-[#e2e2e2] bg-white px-4 py-2.5 text-[11px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">
        {showPreview ? "Ocultar prévia" : "Ver como aparecerá no site"}
      </button>
      {showPreview && <div className="lg:hidden mb-6">{preview}</div>}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── Bloco 1 ─────────────────────────────────────────────────── */}
          <section className={secCls}>
            <div className={secHead}>
              <h2 className={secTitle}>1 · Informações do projeto</h2>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nome do projeto ou ambiente *</label>
                <input value={p.title ?? ""} onChange={(e) => set({ title: e.target.value })}
                  placeholder="Ex.: Sala Principal" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Descrição curta</label>
                <input value={p.short_description ?? ""} onChange={(e) => set({ short_description: e.target.value })}
                  placeholder="Uma linha sobre o ambiente" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Produto utilizado</label>
                <select value={p.product_code ?? ""} onChange={(e) => set({ product_code: e.target.value })} className={inputCls}>
                  <option value="">— selecione —</option>
                  {products.map((pr) => (
                    <option key={pr.code} value={pr.code}>{pr.code} — {pr.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Observação interna</label>
                <input value={p.note ?? ""} onChange={(e) => set({ note: e.target.value })}
                  placeholder="Não aparece no site" className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── Bloco 2 ─────────────────────────────────────────────────── */}
          <section className={secCls}>
            <div className={secHead}>
              <h2 className={secTitle}>2 · Onde este projeto será exibido?</h2>
              <p className={secHint}>Uma decisão só: a categoria define a navegação do site.</p>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Categoria principal *</label>
                  <select value={p.primary_category ?? ""} onChange={(e) => {
                    // Grave null, nunca "": string vazia passava pelas checagens
                    // de "tem categoria?" e o projeto ficava publicado sem seção.
                    const v = e.target.value || null;
                    set({ primary_category: v, ...(v === SHOWROOM_SLUG ? {} : { showroom_id: null }) });
                  }} className={inputCls}>
                    <option value="">— selecione —</option>
                    {cats.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                  </select>
                </div>
                {isShowroom && (
                  <div>
                    <label className={labelCls}>Showroom parceiro *</label>
                    <select value={p.showroom_id ?? ""} onChange={(e) => set({ showroom_id: e.target.value || null })} className={inputCls}>
                      <option value="">— selecione —</option>
                      {showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {showroom?.address && (
                      <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-1.5">
                        Endereço herdado do showroom: {showroom.address}
                      </p>
                    )}
                    {showrooms.length === 0 && (
                      <p className="text-amber-800 text-[11px] font-[var(--font-inter)] mt-1.5">
                        Nenhum parceiro cadastrado.{" "}
                        <Link href="/admin/projetos/organizacao" className="underline font-bold">Cadastrar agora</Link>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-[#f5f5f3] border border-[#e2e2e2] px-3.5 py-3">
                <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">
                  Este projeto aparecerá em
                </p>
                <p className="font-[var(--font-inter)] text-[#002045] text-sm break-words">{trail.join(" › ")}</p>
              </div>

              {tags.length > 0 && (
                <div>
                  <label className={labelCls}>Características do ambiente</label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => {
                      const on = (p.tags ?? []).includes(t.slug);
                      return (
                        <button key={t.id} type="button"
                          onClick={() => set({ tags: on ? (p.tags ?? []).filter((s) => s !== t.slug) : [...(p.tags ?? []), t.slug] })}
                          className={`text-[11px] font-[var(--font-inter)] px-2.5 py-1 border transition-colors ${on ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#43474e] border-[#e2e2e2] hover:border-[#002045]"}`}>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-1.5">
                    Descrevem o ambiente. Não mudam onde ele aparece.
                  </p>
                </div>
              )}

              <div className="pt-1 space-y-2 border-t border-[#f0f0f0]">
                <label className="flex items-center gap-2 text-[13px] font-[var(--font-inter)] text-[#43474e] cursor-pointer pt-3">
                  <input type="checkbox" checked={!!p.is_featured} onChange={(e) => set({ is_featured: e.target.checked })} />
                  Destacar na página de Projetos
                </label>
                <label className="flex items-center gap-2 text-[13px] font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                  <input type="checkbox" checked={!!p.show_on_home} onChange={(e) => set({ show_on_home: e.target.checked })} />
                  Destacar na página inicial
                </label>
                {(p.is_featured || p.show_on_home) && (
                  <div className="pt-1">
                    <label className={labelCls}>Ordem do destaque</label>
                    <input type="number" value={p.feature_order ?? 0}
                      onChange={(e) => set({ feature_order: Number(e.target.value) || 0 })}
                      className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] w-28" />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Bloco 3 ─────────────────────────────────────────────────── */}
          <section className={secCls}>
            <div className={secHead}>
              <h2 className={secTitle}>3 · Fotos e vídeos</h2>
              <p className={secHint}>
                Cada mídia tem a própria classificação. A etiqueta no site vem dela — não do projeto.
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-5">
              {/* Capa */}
              <div className="flex flex-col sm:flex-row gap-5">
                <div>
                  <p className={labelCls}>Capa do projeto</p>
                  <CoverFramer
                    url={p.image_after ?? ""}
                    focusX={Number(p.cover_focus_x ?? 0.5)}
                    focusY={Number(p.cover_focus_y ?? 0.5)}
                    zoom={Number(p.cover_zoom ?? 1)}
                    onChange={(v) => set({ cover_focus_x: v.focusX, cover_focus_y: v.focusY, cover_zoom: v.zoom })}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={labelCls}>Classificação da capa</p>
                  <div className="flex gap-1.5">
                    {(["geral", "antes", "depois"] as MediaCat[]).map((c) => (
                      <button key={c} type="button" onClick={() => set({ cover_category: c })}
                        className={`text-[11px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${p.cover_category === c ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#43474e] border-[#e2e2e2] hover:border-[#002045]"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-2 leading-snug">
                    É esta etiqueta que aparece no site e decide em qual filtro a capa entra.
                    Ser capa não muda a classificação de uma foto.
                  </p>
                </div>
              </div>

              {/* Upload */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); }}
                className="border border-dashed border-[#d4d6da] bg-[#fafafa] px-4 py-6 text-center"
              >
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
                  Arraste fotos e vídeos aqui, ou
                </p>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="mt-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1a365d] transition-colors">
                  Escolher arquivos
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
                  onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
                {uploading > 0 && (
                  <p className="text-[#002045] text-xs font-[var(--font-inter)] mt-2">Enviando {uploading} arquivo(s)…</p>
                )}
              </div>

              {/* Vídeo por link — o que não cabe no storage entra por aqui. */}
              <div>
                <label className={labelCls}>Vídeo por link</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoUrl(); } }}
                    placeholder="Cole o link do vídeo (YouTube, Instagram, Vimeo, Drive…)"
                    className={inputCls}
                  />
                  <button type="button" onClick={addVideoUrl} disabled={!videoUrl.trim()}
                    className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-40 whitespace-nowrap">
                    + Vídeo
                  </button>
                </div>
                <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-1.5">
                  Para vídeos longos, que não cabem como arquivo. No site a galeria abre o link numa aba nova.
                </p>
              </div>

              {/* Galeria */}
              {sorted.length === 0 ? (
                <p className="text-[#a0a3a8] text-sm font-[var(--font-inter)]">Nenhuma mídia ainda.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sorted.map((m) => (
                    <div key={m.id} draggable
                      onDragStart={() => setDragId(m.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (dragId && dragId !== m.id) reorder(dragId, m.id); setDragId(null); }}
                      className={`border ${m.is_cover ? "border-[#002045]" : "border-[#e2e2e2]"} bg-white`}
                    >
                      <div className="relative bg-[#f0f0f0]" style={{ aspectRatio: COVER_ASPECT }}>
                        {m.type === "video" ? (
                          <>
                            {videoThumbnail(m.url) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={videoThumbnail(m.url)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 bg-[#0a1628]" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg width="26" height="26" viewBox="0 0 24 24" fill="white" opacity=".85"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] tracking-[0.1em] uppercase font-bold px-1.5 py-0.5">
                              {videoHostLabel(m.url)}
                            </span>
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        {m.is_cover && (
                          <span className="absolute top-1 left-1 bg-[#002045] text-white text-[8px] tracking-[0.12em] uppercase font-bold px-1.5 py-0.5">Capa</span>
                        )}
                      </div>
                      <div className="p-2 space-y-1.5">
                        <select value={m.category} onChange={(e) => patchMedia(m.id, { category: e.target.value as MediaCat })}
                          className="w-full border border-[#e2e2e2] px-1.5 py-1 text-[11px] font-[var(--font-inter)] text-[#43474e] bg-white focus:outline-none focus:border-[#002045]">
                          <option value="geral">Geral</option>
                          <option value="antes">Antes</option>
                          <option value="depois">Depois</option>
                        </select>
                        {m.type === "image" && !m.is_cover && (
                          <button type="button" onClick={() => setAsCover(m)}
                            className="w-full border border-[#e2e2e2] text-[#43474e] text-[10px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] py-1 hover:border-[#002045] hover:text-[#002045] transition-colors">
                            Definir capa
                          </button>
                        )}
                        <button type="button" onClick={() => removeMedia(m)}
                          className="w-full border border-red-200 text-red-700 text-[10px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] py-1 hover:bg-red-50 transition-colors">
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)]">
                Arraste as miniaturas para reordenar.
              </p>
            </div>
          </section>

          {/* ── Bloco 4 ─────────────────────────────────────────────────── */}
          <section className={secCls}>
            <div className={secHead}>
              <h2 className={secTitle}>4 · Publicação</h2>
            </div>
            <div className="p-4 sm:p-5">
              {blocked ? (
                <p className="text-amber-800 text-[13px] font-[var(--font-inter)] mb-3">
                  Falta para publicar: {blocked}
                </p>
              ) : (
                <p className="text-[#2c5226] text-[13px] font-[var(--font-inter)] mb-3">
                  Tudo pronto — este projeto pode ir ao ar.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!!blocked}
                  onClick={() => { set({ is_active: true }); router.push("/admin/projetos"); }}
                  className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-40">
                  {p.is_active ? "Manter publicado" : "Publicar projeto"}
                </button>
                <button type="button"
                  onClick={() => { set({ is_active: false }); router.push("/admin/projetos"); }}
                  className="border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#002045] hover:text-white transition-colors">
                  Salvar como rascunho
                </button>
                <Link href="/admin/projetos"
                  className="border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:border-[#002045] hover:text-[#002045] transition-colors">
                  Cancelar
                </Link>
              </div>
              <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-3">
                Suas alterações são gravadas sozinhas enquanto você edita — &ldquo;Cancelar&rdquo; volta para a lista, não desfaz.
              </p>
            </div>
          </section>
        </div>

        {/* Coluna da prévia (desktop) */}
        <aside className="hidden lg:block w-[300px] shrink-0">
          <div className="sticky top-6">{preview}</div>
        </aside>
      </div>
    </AdminShell>
  );
}
