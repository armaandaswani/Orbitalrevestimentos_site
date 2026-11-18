"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { baixarFoto, nomeDaFoto } from "./baixarFoto";

/**
 * "Mais fotos do projeto" dentro do formulário de Fotos Reais.
 *
 * Antes, o formulário só aceitava a capa e uma foto "Antes"; as demais ficavam
 * escondidas no botão "Mídias" do cartão, que só aparece DEPOIS de salvar.
 * Aqui dá para enviar várias de uma vez e classificar cada uma.
 *
 *  - Projeto já salvo (slug): grava direto em project_media.
 *  - Projeto novo: guarda a lista (`pending`) e o formulário grava ao salvar.
 *
 * Ordem: arrastar e soltar no computador, ou as setas ◀ ▶ de cada foto (que
 * funcionam também no celular, onde arrastar não funciona). É a ordem da
 * galeria do projeto no site (sort_order).
 *
 * Olho: oculta a foto do site num toque e grava na hora; ela fica aqui, com o
 * botão de baixar. A capa não se oculta.
 */

export type Categoria = "depois" | "antes" | "geral";
export interface FotoPendente { url: string; category: Categoria; is_hidden?: boolean }
interface Midia { id: string; url: string; type: "image" | "video"; category: Categoria; is_cover?: boolean; is_hidden?: boolean; sort_order: number }

const BOTAO_FOTO = "w-7 h-7 grid place-items-center bg-white/90 text-[#0B1F45] hover:bg-white disabled:opacity-40";

function Icone({ d }: { d: string }) {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
}
const OLHO = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z";
const OLHO_FECHADO = "M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A17 17 0 002 12s3.6 7 10 7a10 10 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2";
const SETA_BAIXAR = "M12 4v11M7 10l5 5 5-5M5 20h14";

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
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!slug) return;
    const res = await fetch(`/api/projects/media?admin=1&slug=${encodeURIComponent(slug)}`).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => []) : [];
    setMidias((Array.isArray(data) ? data : []).filter((m: Midia) => m.type === "image"));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    fetch(`/api/projects/media?admin=1&slug=${encodeURIComponent(slug)}`)
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

  /** Oculta ou mostra na hora; se não gravar, a foto volta como estava. */
  async function alternarOculta(m: Midia) {
    const is_hidden = !m.is_hidden;
    const aplicar = (v: boolean) => setMidias((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_hidden: v } : x)));
    setErro("");
    aplicar(is_hidden);
    const res = await fetch(`/api/projects/media/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_hidden }),
    }).catch(() => null);
    if (!res || !res.ok) {
      aplicar(!is_hidden);
      setErro(is_hidden ? "Não foi possível ocultar a foto. Tente de novo." : "Não foi possível mostrar a foto. Tente de novo.");
    }
  }

  async function baixar(lista: { key: string; url: string; pos: number }[]) {
    setErro("");
    const falhas: number[] = [];
    for (const f of lista) {
      setBaixando(f.key);
      if (!(await baixarFoto(f.url, nomeDaFoto(slug, f.pos, f.url)))) falhas.push(f.pos);
      // Intervalo para o navegador aceitar vários downloads seguidos.
      if (lista.length > 1) await new Promise((r) => setTimeout(r, 350));
    }
    setBaixando(null);
    if (falhas.length) setErro(`Não foi possível baixar: foto ${falhas.join(", ")}.`);
  }

  /** Move a foto da posição `de` para `para` e grava só as que mudaram de lugar. */
  async function mover(de: number, para: number) {
    if (de === para || para < 0) return;
    if (!slug) {
      setPending((prev) => {
        if (para >= prev.length) return prev;
        const l = [...prev];
        const [x] = l.splice(de, 1);
        l.splice(para, 0, x);
        return l;
      });
      return;
    }
    if (para >= midias.length) return;
    const l = [...midias];
    const [x] = l.splice(de, 1);
    l.splice(para, 0, x);
    const reindexada = l.map((m, i) => ({ ...m, sort_order: i }));
    const mudaram = reindexada.filter((m) => midias.find((o) => o.id === m.id)?.sort_order !== m.sort_order);
    setMidias(reindexada);
    const r = await Promise.all(mudaram.map((m) =>
      fetch(`/api/projects/media/${m.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: m.sort_order }),
      }).then((res) => res.ok).catch(() => false)));
    if (r.includes(false)) { setErro("Não foi possível salvar a nova ordem. Tente de novo."); await carregar(); }
  }

  async function remover(m: Midia) {
    if (!confirm("Remover esta foto do projeto?")) return;
    setMidias((prev) => prev.filter((x) => x.id !== m.id));
    await fetch(`/api/projects/media/${m.id}`, { method: "DELETE" }).catch(() => {});
  }

  // Mídias já salvas: na ordem gravada (a API já devolve por sort_order).
  const itens = slug
    ? midias.map((m) => ({ key: m.id, url: m.url, category: m.category, capa: !!m.is_cover, oculta: !!m.is_hidden && !m.is_cover, mid: m as Midia | null, idx: -1 }))
    : pending.map((p, i) => ({ key: `${p.url}-${i}`, url: p.url, category: p.category, capa: false, oculta: !!p.is_hidden, mid: null as Midia | null, idx: i }));
  const ocultas = itens.map((it, i) => ({ ...it, pos: i + 1 })).filter((it) => it.oculta);

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
          {itens.map((it, pos) => (
            <div key={it.key}
              draggable
              onDragStart={() => setArrastando(pos)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (arrastando !== null) void mover(arrastando, pos); setArrastando(null); }}
              onDragEnd={() => setArrastando(null)}
              className={`border bg-white cursor-grab active:cursor-grabbing ${arrastando === pos ? "opacity-40 border-[#0B1F45]" : "border-[#e2e2e2]"}`}>
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt="" className={`absolute inset-0 w-full h-full object-cover ${it.oculta ? "opacity-35 grayscale" : ""}`} />
                {it.capa && (
                  <span className="absolute top-0 left-0 bg-[#0B1F45] text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5">Capa</span>
                )}
                {it.oculta && (
                  <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-[#0B1F45] text-white text-center text-[9px] font-bold uppercase tracking-[0.1em] py-1">Oculta no site</span>
                )}
                <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                  <button type="button" title="Baixar foto" aria-label={`Baixar foto ${pos + 1}`} disabled={baixando !== null}
                    onClick={() => void baixar([{ key: it.key, url: it.url, pos: pos + 1 }])}
                    className={BOTAO_FOTO}><Icone d={SETA_BAIXAR} /></button>
                  {!it.capa && (
                    <>
                      <button type="button" aria-pressed={it.oculta}
                        title={it.oculta ? "Mostrar no site" : "Ocultar do site"}
                        aria-label={`${it.oculta ? "Mostrar no site" : "Ocultar do site"}: foto ${pos + 1}`}
                        onClick={() => (it.mid ? void alternarOculta(it.mid) : setPending((prev) => prev.map((p, k) => (k === it.idx ? { ...p, is_hidden: !p.is_hidden } : p))))}
                        className={`${BOTAO_FOTO} ${it.oculta ? "!bg-[#0B1F45] !text-white" : ""}`}><Icone d={it.oculta ? OLHO_FECHADO : OLHO} /></button>
                      <button type="button" title="Remover" aria-label={`Remover foto ${pos + 1}`}
                        onClick={() => (it.mid ? remover(it.mid) : setPending((prev) => prev.filter((_, k) => k !== it.idx)))}
                        className="w-7 h-7 bg-white/90 text-red-600 text-sm font-bold leading-none hover:bg-white">×</button>
                    </>
                  )}
                </div>
                <span className="absolute bottom-0.5 left-0.5 bg-white/90 text-[#0B1F45] text-[9px] font-bold px-1.5 py-0.5">{pos + 1}</span>
                <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                  <button type="button" title="Mover para a esquerda" aria-label="Mover para a esquerda" disabled={pos === 0}
                    onClick={() => void mover(pos, pos - 1)}
                    className="w-7 h-7 bg-white/90 text-[#0B1F45] text-xs font-bold hover:bg-white disabled:opacity-30">◀</button>
                  <button type="button" title="Mover para a direita" aria-label="Mover para a direita" disabled={pos === itens.length - 1}
                    onClick={() => void mover(pos, pos + 1)}
                    className="w-7 h-7 bg-white/90 text-[#0B1F45] text-xs font-bold hover:bg-white disabled:opacity-30">▶</button>
                </div>
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
      {ocultas.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#43474e] mt-2">
          {ocultas.length === 1 ? "1 foto oculta: fica só aqui no painel, o cliente não vê." : `${ocultas.length} fotos ocultas: ficam só aqui no painel, o cliente não vê.`}
          <button type="button" disabled={baixando !== null} onClick={() => void baixar(ocultas)}
            className="font-bold text-[#0B1F45] underline underline-offset-2 disabled:opacity-40">
            {baixando !== null ? "Baixando…" : ocultas.length === 1 ? "Baixar a oculta" : "Baixar as ocultas"}
          </button>
        </p>
      )}
      {itens.length > 1 && (
        <p className="text-[11px] text-[#a0a3a8] mt-2">Arraste as fotos ou use ◀ ▶ para mudar a ordem — é a ordem da galeria no site.</p>
      )}
      {!slug && pending.length > 0 && (
        <p className="text-[11px] text-[#74777f] mt-2">Estas fotos entram no projeto quando você clicar em Salvar.</p>
      )}
      {erro && <p className="text-[11px] text-red-600 mt-2 break-words">{erro}</p>}
    </div>
  );
}
