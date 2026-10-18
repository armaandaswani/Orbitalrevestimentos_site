"use client";

import { useState } from "react";

/**
 * Modelos aplicados no projeto — um ou vários, do catálogo (migração 067).
 * O primeiro da lista é o principal (product_code); os demais vão para
 * extra_product_codes. Usado nos dois editores de projeto do admin.
 */

export interface ModeloCatalogo {
  code: string;
  name: string;
  linha?: string | null;
  image_path?: string | null;
}

const inputCls =
  "w-full border border-[#e2e2e2] px-4 py-2.5 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]";

export default function ModelosPicker({
  produtos, codigos, onChange,
}: { produtos: ModeloCatalogo[]; codigos: string[]; onChange: (codigos: string[]) => void }) {
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const resultados = q
    ? produtos.filter((p) => !codigos.includes(p.code) && (p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))).slice(0, 12)
    : [];

  const remover = (code: string) => onChange(codigos.filter((c) => c !== code));
  const principal = (code: string) => onChange([code, ...codigos.filter((c) => c !== code)]);
  const adicionar = (code: string) => { onChange([...codigos, code]); setBusca(""); };

  return (
    <div>
      {codigos.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {codigos.map((code, i) => {
            const sel = produtos.find((p) => p.code === code);
            return (
              <li key={code} className="flex items-center gap-3 border border-[#e2e2e2] px-3 py-2">
                {sel?.image_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sel.image_path} className="w-9 h-9 object-cover border border-[#e2e2e2] flex-shrink-0" alt="" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[#0B1F45] text-sm font-semibold truncate">{sel ? `${sel.code} — ${sel.name}` : code}</p>
                  {sel ? (
                    <p className="text-[#74777f] text-[11px]">{sel.linha ? `Linha ${sel.linha}` : ""}{i === 0 && codigos.length > 1 ? `${sel.linha ? " · " : ""}Principal` : ""}</p>
                  ) : (
                    <p className="text-amber-700 text-[11px]">Código fora do catálogo atual</p>
                  )}
                </div>
                {i > 0 && (
                  <button type="button" onClick={() => principal(code)}
                    className="text-[10px] uppercase tracking-wide font-bold text-[#74777f] hover:text-[#0B1F45] px-2 py-1 border border-[#e2e2e2] hover:border-[#0B1F45] flex-shrink-0">
                    Tornar principal
                  </button>
                )}
                <button type="button" onClick={() => remover(code)}
                  className="text-[#cc0000] hover:text-white hover:bg-[#cc0000] w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0"
                  aria-label={`Remover ${code}`}>✕</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="relative">
        <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} className={inputCls}
          placeholder={codigos.length ? "Adicionar outro modelo — código ou nome…" : "Buscar por código ou nome do modelo…"} />
        {q && (
          <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#e2e2e2] shadow-lg">
            {resultados.length > 0 ? resultados.map((p) => (
              <button key={p.code} type="button" onClick={() => adicionar(p.code)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#eef2fb] text-left border-b border-[#f0f0f0] last:border-b-0">
                {p.image_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_path} className="w-8 h-8 object-cover border border-[#e2e2e2]" alt="" />
                )}
                <span className="min-w-0">
                  <span className="text-[#0B1F45] text-sm font-semibold block truncate">{p.code} — {p.name}</span>
                  {p.linha && <span className="text-[#74777f] text-[11px]">Linha {p.linha}</span>}
                </span>
              </button>
            )) : (
              <p className="px-3 py-2 text-[#74777f] text-xs">Nenhum produto encontrado no catálogo.</p>
            )}
          </div>
        )}
        <p className="text-[#a0a3a8] text-[10px] mt-1">
          Selecione do catálogo. Pode adicionar quantos modelos o projeto tiver; o primeiro é o principal.
        </p>
      </div>
    </div>
  );
}
