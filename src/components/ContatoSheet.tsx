"use client";

import { useEffect, useState } from "react";
import {
  CIDADES, ETAPAS, EVENTO_CONTATO, PERFIS,
  areaTexto, linkWhatsappContato, pendenciasContato,
  type ProdutoContato, type RespostasContato,
} from "@/lib/contato";

/**
 * Aba "Solicitar atendimento" — abre de qualquer página (abrirContato) e
 * também por ?contato na URL.
 *
 * Obrigatórios (asterisco): perfil, estágio da obra e cidade. Nome e medidas
 * são opcionais, sem dizer isso — só não têm asterisco. Visual contido, da
 * marca: serifa no título, rótulos pequenos em caixa alta, seletores
 * segmentados e linhas finas.
 */

type Opcao = { readonly value: string; readonly label: string };
type Campo = "perfil" | "etapa" | "cidade";

const rotuloCls = "block text-[10px] tracking-[0.18em] uppercase font-semibold font-[var(--font-inter)] text-[#5b5e66] mb-2.5";
const campoCls =
  "w-full bg-transparent border-0 border-b border-[#cfd2d6] px-0 py-2 text-[15px] font-[var(--font-inter)] text-[#002045] placeholder-[#b4b7bd] focus:outline-none focus:border-[#002045] transition-colors rounded-none";

function Obrigatorio() {
  return <span className="text-[#b3261e] ml-0.5" aria-hidden>*</span>;
}

function Segmentado({
  id, rotulo, opcoes, valor, onChange, obrigatorio, erro,
}: {
  id: string; rotulo: string; opcoes: readonly Opcao[]; valor?: string;
  onChange: (v: string) => void; obrigatorio?: boolean; erro?: boolean;
}) {
  return (
    <div role="radiogroup" aria-labelledby={`${id}-rotulo`} aria-required={obrigatorio}>
      <span id={`${id}-rotulo`} className={rotuloCls}>
        {rotulo}{obrigatorio && <Obrigatorio />}
      </span>
      <div
        className={`grid border ${erro ? "border-[#b3261e]" : "border-[#cfd2d6]"}`}
        style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}
      >
        {opcoes.map((o, i) => {
          const ativo = valor === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.value)}
              className={`min-h-11 px-2 text-[13px] font-[var(--font-inter)] tracking-[0.01em] transition-colors ${
                i > 0 ? "border-l border-[#cfd2d6]" : ""
              } ${ativo ? "bg-[#002045] text-white" : "bg-white text-[#43474e] hover:bg-[#f3f4f6]"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ContatoSheet() {
  const [aberto, setAberto] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoContato[]>([]);
  const [r, setR] = useState<RespostasContato>({});
  // Erros só aparecem depois da primeira tentativa de envio.
  const [tentou, setTentou] = useState(false);

  useEffect(() => {
    function abrir(e: Event) {
      const detail = (e as CustomEvent<{ produtos?: ProdutoContato[]; inicial?: RespostasContato }>).detail;
      setProdutos(detail?.produtos ?? []);
      setR(detail?.inicial ?? {});
      setTentou(false);
      setAberto(true);
    }
    window.addEventListener(EVENTO_CONTATO, abrir);
    // ?contato na URL (ex.: /contato): abre sozinho, com o produto se veio junto.
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

  const set = (campo: keyof RespostasContato) => (v: string) => setR((x) => ({ ...x, [campo]: v }));
  const faltam = pendenciasContato(r);
  const erro = (c: Campo) => tentou && faltam.includes(c);
  const area = areaTexto(r);
  const medida = (v: string) => v.replace(/[^\d.,]/g, "").slice(0, 6);
  const principal = produtos[0];

  return (
    <div
      className="fixed inset-0 z-[120] bg-[#0b1320]/70 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-6"
      onClick={() => setAberto(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contato-titulo"
    >
      <div
        className="bg-white w-full sm:max-w-[460px] max-h-[94dvh] overflow-y-auto overscroll-contain shadow-[0_24px_80px_-20px_rgba(0,20,50,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 bg-white px-6 sm:px-8 pt-6 pb-5 border-b border-[#ececec]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-semibold font-[var(--font-inter)] text-[#8a8d93] mb-2">
                Orbital · Atendimento
              </p>
              <p id="contato-titulo" className="font-serif text-[#002045] text-[26px] leading-[1.1] tracking-[-0.01em]">
                Solicitar atendimento
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="w-9 h-9 -mr-2 flex items-center justify-center text-[#8a8d93] hover:text-[#002045] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {principal && (principal.name || principal.code) && (
            <div className="mt-5 flex items-center gap-3">
              {principal.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={principal.image} alt="" className="w-11 h-11 object-cover border border-[#ececec] flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[#002045] text-sm font-[var(--font-inter)] truncate">
                  {principal.name || principal.code}
                  {produtos.length > 1 && <span className="text-[#8a8d93]"> e mais {produtos.length - 1}</span>}
                </p>
                <p className="text-[#8a8d93] text-[11px] tracking-[0.08em] uppercase font-[var(--font-inter)] truncate">
                  {[principal.linha && `Linha ${principal.linha}`, principal.name && principal.code].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Campos */}
        <div className="px-6 sm:px-8 py-6 space-y-7">
          <Segmentado
            id="ct-perfil" rotulo="Perfil" opcoes={PERFIS} valor={r.perfil}
            onChange={set("perfil")} obrigatorio erro={erro("perfil")}
          />

          <label className="block">
            <span className={rotuloCls}>Nome</span>
            <input
              value={r.nome ?? ""}
              onChange={(e) => set("nome")(e.target.value.slice(0, 80))}
              autoComplete="name"
              placeholder="Como podemos te chamar"
              className={campoCls}
            />
          </label>

          <Segmentado
            id="ct-etapa" rotulo="Estágio da obra" opcoes={ETAPAS} valor={r.etapa}
            onChange={set("etapa")} obrigatorio erro={erro("etapa")}
          />

          <div>
            <span className={rotuloCls}>Largura &amp; altura da área</span>
            <div className="grid grid-cols-2 gap-6">
              <label className="relative block">
                <span className="sr-only">Largura em metros</span>
                <input
                  value={r.largura ?? ""}
                  onChange={(e) => set("largura")(medida(e.target.value))}
                  inputMode="decimal"
                  placeholder="Largura"
                  className={`${campoCls} pr-6`}
                />
                <span className="absolute right-0 bottom-2.5 text-[#8a8d93] text-sm font-[var(--font-inter)]">m</span>
              </label>
              <label className="relative block">
                <span className="sr-only">Altura em metros</span>
                <input
                  value={r.altura ?? ""}
                  onChange={(e) => set("altura")(medida(e.target.value))}
                  inputMode="decimal"
                  placeholder="Altura"
                  className={`${campoCls} pr-6`}
                />
                <span className="absolute right-0 bottom-2.5 text-[#8a8d93] text-sm font-[var(--font-inter)]">m</span>
              </label>
            </div>
            {area.includes("m²") && (
              <p className="mt-2 text-[#8a8d93] text-xs font-[var(--font-inter)]">{area.slice(area.indexOf("(") + 1, -1)} de área</p>
            )}
            {!!r.areasDetalhe?.length && (
              <p className="mt-2 text-[#8a8d93] text-xs font-[var(--font-inter)] leading-relaxed">
                Do Visualizador: {r.areasDetalhe.join(" · ")}
              </p>
            )}
          </div>

          <div>
            <Segmentado
              id="ct-cidade" rotulo="Cidade" opcoes={CIDADES} valor={r.cidade}
              onChange={set("cidade")} obrigatorio erro={erro("cidade") && r.cidade !== "outra"}
            />
            {r.cidade === "outra" && (
              <input
                value={r.cidadeOutra ?? ""}
                onChange={(e) => set("cidadeOutra")(e.target.value.slice(0, 60))}
                autoComplete="address-level2"
                placeholder="Qual cidade?"
                aria-label="Qual cidade?"
                aria-invalid={erro("cidade")}
                className={`${campoCls} mt-3 ${erro("cidade") ? "border-[#b3261e]" : ""}`}
              />
            )}
          </div>
        </div>

        {/* Envio */}
        <div
          className="sticky bottom-0 bg-white px-6 sm:px-8 pt-4 border-t border-[#ececec]"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          {tentou && faltam.length > 0 && (
            <p className="text-[#b3261e] text-xs font-[var(--font-inter)] mb-3" role="alert">
              Preencha os campos marcados com *.
            </p>
          )}
          <a
            href={linkWhatsappContato(produtos, r)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (faltam.length) { e.preventDefault(); setTentou(true); return; }
              setAberto(false);
            }}
            className="group w-full min-h-[52px] inline-flex items-center justify-center gap-3 bg-[#002045] text-white text-[11px] tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] px-6 hover:bg-[#0a2d5c] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="opacity-80" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar pelo WhatsApp
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-hover:translate-x-0.5" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <p className="text-[#a0a3a9] text-[11px] font-[var(--font-inter)] text-center mt-3 tracking-[0.02em]">
            Você será atendido por um consultor da Orbital.
          </p>
        </div>
      </div>
    </div>
  );
}
