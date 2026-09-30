"use client";

import { useEffect, useState } from "react";
import {
  ARQUITETO, CONHECE, ETAPAS, EVENTO_CONTATO, METRAGEM,
  linkWhatsappContato, type ProdutoContato, type RespostasContato,
} from "@/lib/contato";

/**
 * Aba "Falar com um consultor" — abre de qualquer página (abrirContato) e
 * também por ?contato na URL (links antigos do orçamento caem aqui).
 *
 * Feita para não assustar: 4 perguntas de um toque, TODAS opcionais, e o botão
 * do WhatsApp funciona desde o primeiro segundo. Campos de texto só aparecem
 * quando a resposta pede (nome do arquiteto, metragem).
 */

type Opcao = { readonly value: string; readonly label: string };

function Chips({
  titulo, opcoes, valor, onChange,
}: { titulo: string; opcoes: readonly Opcao[]; valor?: string; onChange: (v?: string) => void }) {
  return (
    <fieldset>
      <legend className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] mb-2">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = valor === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={ativo}
              // Tocar de novo desmarca: nada aqui é obrigatório.
              onClick={() => onChange(ativo ? undefined : o.value)}
              className={`min-h-10 px-4 text-sm font-[var(--font-inter)] border transition-colors ${
                ativo
                  ? "bg-[#002045] border-[#002045] text-white"
                  : "bg-white border-[#d6d8dc] text-[#43474e] hover:border-[#002045]"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const campoCls =
  "mt-2 w-full border border-[#d6d8dc] bg-white px-3 py-2.5 text-base sm:text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] placeholder-[#a0a3a9]";

export default function ContatoSheet() {
  const [aberto, setAberto] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoContato[]>([]);
  const [r, setR] = useState<RespostasContato>({});

  useEffect(() => {
    function abrir(e: Event) {
      const detail = (e as CustomEvent<{ produtos?: ProdutoContato[]; inicial?: RespostasContato }>).detail;
      setProdutos(detail?.produtos ?? []);
      setR(detail?.inicial ?? {});
      setAberto(true);
    }
    window.addEventListener(EVENTO_CONTATO, abrir);
    // ?contato na URL (ex.: /simulador antigo redirecionado): abre sozinho,
    // trazendo o código do produto se veio junto.
    const id = requestAnimationFrame(() => {
      const q = new URLSearchParams(window.location.search);
      if (q.has("contato")) {
        const code = q.get("produto");
        setProdutos(code ? [{ code }] : []);
        setAberto(true);
      }
    });
    return () => {
      window.removeEventListener(EVENTO_CONTATO, abrir);
      cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  if (!aberto) return null;

  const set = (campo: keyof RespostasContato) => (v?: string) => setR((x) => ({ ...x, [campo]: v }));
  const produtoTxt = produtos
    .map((p) => p.name || p.code)
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/55 flex items-end sm:items-center justify-center sm:p-4"
      onClick={() => setAberto(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contato-titulo"
    >
      <div
        className="bg-[#f9f9f9] w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#002045] px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p id="contato-titulo" className="text-white text-lg font-[var(--font-noto-serif)] leading-tight">
              Falar com um consultor
            </p>
            {produtoTxt && (
              <p className="text-[#a8c4ec] text-xs font-[var(--font-inter)] mt-1 break-words">{produtoTxt}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar"
            className="text-white/70 hover:text-white text-2xl leading-none -mt-1"
          >
            ×
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 space-y-5">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
            Responda o que souber. Assim o consultor já chega com a resposta certa.
          </p>

          <Chips titulo="Em que etapa está a obra?" opcoes={ETAPAS} valor={r.etapa} onChange={set("etapa")} />

          <div>
            <Chips titulo="Já tem arquiteto?" opcoes={ARQUITETO} valor={r.arquiteto} onChange={set("arquiteto")} />
            {r.arquiteto === "sim" && (
              <input
                value={r.arquitetoNome ?? ""}
                onChange={(e) => setR((x) => ({ ...x, arquitetoNome: e.target.value }))}
                placeholder="Nome do arquiteto (opcional)"
                className={campoCls}
                aria-label="Nome do arquiteto"
              />
            )}
          </div>

          <Chips titulo="Já conhece as placas?" opcoes={CONHECE} valor={r.conhece} onChange={set("conhece")} />

          <div>
            <Chips titulo="Já sabe a metragem?" opcoes={METRAGEM} valor={r.metragem} onChange={set("metragem")} />
            {r.metragem === "sim" && (
              <div className="relative">
                <input
                  value={r.metragemM2 ?? ""}
                  onChange={(e) => setR((x) => ({ ...x, metragemM2: e.target.value.replace(/[^\d.,]/g, "").slice(0, 8) }))}
                  inputMode="decimal"
                  placeholder="Quantos m²? (opcional)"
                  className={`${campoCls} pr-12`}
                  aria-label="Metragem em metros quadrados"
                />
                <span className="absolute right-3 top-1/2 translate-y-[-10%] text-[#74777f] text-sm font-[var(--font-inter)]">m²</span>
              </div>
            )}
          </div>
        </div>

        <div
          className="sticky bottom-0 bg-[#f9f9f9] px-5 pt-3 border-t border-[#e8e8e8]"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <a
            href={linkWhatsappContato(produtos, r)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAberto(false)}
            className="w-full min-h-13 inline-flex items-center justify-center gap-2 bg-[#25d366] text-white text-sm tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 hover:bg-[#1ebe5a] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Continuar no WhatsApp
          </a>
          <p className="text-[#a0a3a9] text-[11px] font-[var(--font-inter)] text-center mt-2">
            Nenhuma pergunta é obrigatória.
          </p>
        </div>
      </div>
    </div>
  );
}
