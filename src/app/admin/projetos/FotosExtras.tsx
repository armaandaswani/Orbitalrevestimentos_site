"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Mais fotos do projeto" dentro do formulário de Fotos Reais.
 *
 * Antes, o formulário só aceitava a capa e uma foto "Antes"; as demais ficavam
 * escondidas no botão "Mídias" do cartão, que só aparece DEPOIS de salvar.
 * Aqui dá para enviar várias de uma vez e classificar cada uma.
 *
 *  - Projeto já salvo (slug): grava direto em project_media.
 *  - Projeto novo: guarda a lista (`pending`) e o formulário grava ao salvar.
 */

export type Categoria = "depois" | "antes" | "geral";
export interface FotoPendente { url: string; category: Categoria }
interface Midia { id: string; url: string; type: "image" | "video"; category: Categoria; is_cover?: boolean; sort_order: number }

const CATS: { v: Categoria; label: string; on: string }[] = [
  { v: "depois", label: "Depois", on: "bg-[#36A35C] text-[#0B1F45] border-[#36A35C]" },
  { v: "antes", label: "Antes", on: "bg-amber-500 text-white border-amber-500" },
  { v: "geral", label: "Geral", on: "bg-[#0B1F45] text-white border-[#0B1F45]" },
];

function Classificar({ value, onChange }: { value: Categoria; onChange: (c: Categoria) => void }) {
  return (
    <div className="flex">
      {CATS.map((c) => (
        <button key={c.v} type="button" onClick={() => onChange(c.v)}
          className={`flex-1 text-[8px] tracking-[0.06em] uppercase font-bold px-1 py-1 border -ml-px first:ml-0 transition-colors ${value === c.v ? c.on : "border-[#e2e2e2] text-[#74777f] bg-white hover:text-[#0B1F45]"}`}>
          {c.label}
        </button>
      ))}
    </div>
  );
}

export default function FotosExtras({
  slug,
  pending,
  setPending,
  upload,
}: {
  /** Slug do projeto já salvo; null para projeto novo. */
  slug: string | null;
  pending: FotoPendente[];
  setPending: (f: FotoPendente[] | ((prev: FotoPendente[]) => FotoPendente[])) => void;
  /** Comprime e envia ao storage; devolve a URL pública. */
  upload: (file: File) => Promise<string | null>;
}) {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [novaCategoria, setNovaCategoria] = useState<Categoria>("depois");
  const [enviando, setEnviando] = useState<{ feito: number; total: number } | null>(null);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const carregar = useCallback(async () => {
    if (!slug) return;
    const res = await fetch(`/api/projects/media?slug=${encodeURIComponent(slug)}`).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => []) : [];
    setMidias((Array.isArray(data) ? data : []).filter((m: Midia) => m.type === "image"));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    fetch(`/api/projects/media?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (vivo) setMidias((Array.isArray(data) ? data : []).filter((m: Midia) => m.type === "image")); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [slug]);

  async function enviar(files: FileList | null) {
    const lista = Array.from(files ?? []).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (lista.length === 0) return;
    setErro("");
    setEnviando({ feito: 0, total: lista.length });
    const falhas: string[] = [];
    let ordem = slug ? midias.length : pending.length;
    for (const f of lista) {
      try {
        const url = await upload(f);
        if (!url) throw new Error("envio falhou");
        if (slug) {
          const res = await fetch("/api/projects/media", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_slug: slug, type: "image", url, category: novaCategoria, sort_order: ordem++ }),
          });
          if (!res.ok) throw new Error(`registro falhou (${res.status})`);
        } else {
          setPending((prev) => [...prev, { url, category: novaCategoria }]);
        }
      } catch (e) {
        falhas.push(`${f.name}: ${e instanceof Error ? e.message : "erro"}`);
      }
      setEnviando((s) => (s ? { ...s, feito: s.feito + 1 } : s));
    }
    setEnviando(null);
    if (falhas.length) setErro(`Não entraram: ${falhas.join(" · ")}`);
    if (slug) await carregar();
  }

  async function mudarCategoria(m: Midia, category: Categoria) {
    setMidias((prev) => prev.map((x) => (x.id === m.id ? { ...x, category } : x)));
    await fetch(`/api/projects/media/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category }),
    }).catch(() => {});
  }

  async function remover(m: Midia) {
    if (!confirm("Remover esta foto do projeto?")) return;
    setMidias((prev) => prev.filter((x) => x.id !== m.id));
    await fetch(`/api/projects/media/${m.id}`, { method: "DELETE" }).catch(() => {});
  }

  const itens = slug
    ? midias.map((m) => ({ key: m.id, url: m.url, category: m.category, capa: !!m.is_cover, mid: m as Midia | null, idx: -1 }))
    : pending.map((p, i) => ({ key: `${p.url}-${i}`, url: p.url, category: p.category, capa: false, mid: null as Midia | null, idx: i }));

  return (
    <div className="mb-4">
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-2">
        Mais fotos do projeto <span className="font-normal normal-case tracking-normal text-[#b0b0b0]">(opcional — quantas quiser)</span>
      </label>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f]">Novas fotos entram como</span>
        <div className="w-44"><Classificar value={novaCategoria} onChange={setNovaCategoria} /></div>
        <button type="button" disabled={!!enviando} onClick={() => inputRef.current?.click()}
          className="bg-[#0B1F45] text-white text-[10px] tracking-[0.1em] uppercase font-bold px-4 py-2 hover:bg-[#2347A0] transition-colors disabled:opacity-50">
          {enviando ? `Enviando ${enviando.feito + 1} de ${enviando.total}…` : "+ Adicionar fotos"}
        </button>
        <input ref={inputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
          onChange={(e) => { void enviar(e.target.files); e.target.value = ""; }} />
      </div>

      {itens.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {itens.map((it) => (
            <div key={it.key} className="border border-[#e2e2e2] bg-white">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {it.capa ? (
                  <span className="absolute top-0 left-0 bg-[#0B1F45] text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5">Capa</span>
                ) : (
                  <button type="button" title="Remover"
                    onClick={() => (it.mid ? remover(it.mid) : setPending((prev) => prev.filter((_, k) => k !== it.idx)))}
                    className="absolute top-0.5 right-0.5 w-6 h-6 bg-white/90 text-red-600 text-sm font-bold leading-none hover:bg-white">×</button>
                )}
              </div>
              <Classificar value={it.category}
                onChange={(c) => (it.mid ? mudarCategoria(it.mid, c) : setPending((prev) => prev.map((p, k) => (k === it.idx ? { ...p, category: c } : p))))} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[#a0a3a8]">
          Nenhuma foto extra ainda. Elas aparecem na galeria do projeto no site, com o filtro Antes / Depois.
        </p>
      )}
      {!slug && pending.length > 0 && (
        <p className="text-[11px] text-[#74777f] mt-2">Estas fotos entram no projeto quando você clicar em Salvar.</p>
      )}
      {erro && <p className="text-[11px] text-red-600 mt-2 break-words">{erro}</p>}
    </div>
  );
}
