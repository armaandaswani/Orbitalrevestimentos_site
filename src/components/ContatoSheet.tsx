"use client";

import { useEffect, useState } from "react";
import {
  CIDADES, ETAPAS, EVENTO_CONTATO, PERFIS,
  areaTexto, linkWhatsappContato, mascaraWhatsapp, pendenciasContato,
  type CampoObrigatorio, type ProdutoContato, type RespostasContato,
} from "@/lib/contato";

/**
 * Aba "Solicitar atendimento" — abre de qualquer página (abrirContato) e
 * também por ?contato na URL.
 *
 * Obrigatórios (asterisco): perfil, WhatsApp, estágio da obra e cidade. Nome e medidas
 * são opcionais, sem dizer isso — só não têm asterisco. Visual da marca:
 * fundo azul-marinho, contornos no verde da logo, texto branco, cantos
 * arredondados e serifa no título.
 */

type Opcao = { readonly value: string; readonly label: string };

// Paleta: azul-marinho da marca (#002045) no fundo, verde da logo (#a1d494)
// nos contornos e na opção marcada, texto branco.
const rotuloCls = "block text-[10px] tracking-[0.18em] uppercase font-semibold font-[var(--font-inter)] text-white/70 mb-2.5";
// Cor da linha fora da base: com as duas cores na mesma classe, a de erro
// perdia para a padrão e o campo obrigatório não ficava vermelho.
const campoBase =
  "w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-[15px] font-[var(--font-inter)] text-white placeholder-white/35 focus:outline-none focus:border-[#a1d494] focus:bg-white/[0.07] transition-colors";
const campoCls = `${campoBase} border-[#a1d494]/45`;
const campoErroCls = `${campoBase} border-[#ff7a7a]`;

function Obrigatorio() {
  return <span className="text-[#ff6b6b] ml-0.5" aria-hidden>*</span>;
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
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
        {opcoes.map((o) => {
          const ativo = valor === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.value)}
              className={`min-h-11 px-2 rounded-xl border text-[13px] font-[var(--font-inter)] tracking-[0.01em] transition-colors ${
                ativo
                  ? "bg-[#a1d494] border-[#a1d494] text-[#002045] font-semibold"
                  : `bg-transparent text-white hover:bg-white/[0.06] ${erro ? "border-[#ff7a7a]" : "border-[#a1d494]/45 hover:border-[#a1d494]"}`
              }`}
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
  // Campo-isca anti-robô: fora da tela, só robô preenche.
  const [isca, setIsca] = useState("");

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
  const erro = (c: CampoObrigatorio) => tentou && faltam.includes(c);
  const area = areaTexto(r);
  const medida = (v: string) => v.replace(/[^\d.,]/g, "").slice(0, 6);
  const principal = produtos[0];

  return (
    <div
      className="fixed inset-0 z-[120] bg-[#050b16]/70 backdrop-blur-[3px] flex items-end sm:items-center justify-center sm:p-6"
      onClick={() => setAberto(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contato-titulo"
    >
      <div
        className="bg-[#002045] text-white w-full sm:max-w-[460px] max-h-[94dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl ring-1 ring-white/10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 bg-[#002045] px-6 sm:px-8 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase font-semibold font-[var(--font-inter)] text-[#a1d494] mb-2">
                Orbital · Atendimento
              </p>
              <p id="contato-titulo" className="font-serif text-white text-[26px] leading-[1.1] tracking-[-0.01em]">
                Solicitar atendimento
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {principal && (principal.name || principal.code) && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#a1d494]/30 bg-white/[0.04] p-2.5 pr-4">
              {principal.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={principal.image} alt="" className="w-11 h-11 object-cover rounded-xl flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-white text-sm font-[var(--font-inter)] truncate">
                  {principal.name || principal.code}
                  {produtos.length > 1 && <span className="text-white/55"> e mais {produtos.length - 1}</span>}
                </p>
                <p className="text-white/55 text-[11px] tracking-[0.08em] uppercase font-[var(--font-inter)] truncate">
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
            <span className={rotuloCls}>WhatsApp<Obrigatorio /></span>
            <input
              value={r.whatsapp ?? ""}
              onChange={(e) => set("whatsapp")(mascaraWhatsapp(e.target.value))}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(92) 9 0000-0000"
              aria-required
              aria-invalid={erro("whatsapp")}
              className={erro("whatsapp") ? campoErroCls : campoCls}
            />
          </label>

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
            <div className="grid grid-cols-2 gap-3">
              <label className="relative block">
                <span className="sr-only">Largura em metros</span>
                <input
                  value={r.largura ?? ""}
                  onChange={(e) => set("largura")(medida(e.target.value))}
                  inputMode="decimal"
                  placeholder="Largura"
                  className={`${campoCls} pr-9`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 text-sm font-[var(--font-inter)] pointer-events-none">m</span>
              </label>
              <label className="relative block">
                <span className="sr-only">Altura em metros</span>
                <input
                  value={r.altura ?? ""}
                  onChange={(e) => set("altura")(medida(e.target.value))}
                  inputMode="decimal"
                  placeholder="Altura"
                  className={`${campoCls} pr-9`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 text-sm font-[var(--font-inter)] pointer-events-none">m</span>
              </label>
            </div>
            {area.includes("m²") && (
              <p className="mt-2 text-[#a1d494]/80 text-xs font-[var(--font-inter)]">{area.slice(area.indexOf("(") + 1, -1)} de área</p>
            )}
            {!!r.areasDetalhe?.length && (
              <p className="mt-2 text-white/55 text-xs font-[var(--font-inter)] leading-relaxed">
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
                className={`${erro("cidade") ? campoErroCls : campoCls} mt-3`}
              />
            )}
          </div>
        </div>

        {/* Campo-isca anti-robô. Fora da tela e fora da ordem de tabulação. */}
        <div aria-hidden className="absolute -left-[10000px] w-px h-px overflow-hidden">
          <input tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} />
        </div>

        {/* Envio */}
        <div
          className="sticky bottom-0 bg-[#002045] px-6 sm:px-8 pt-4 border-t border-white/10"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          {tentou && faltam.length > 0 && (
            <p className="text-[#ff8a8a] text-xs font-[var(--font-inter)] mb-3" role="alert">
              Preencha os campos marcados com *.
            </p>
          )}
          <a
            href={linkWhatsappContato(produtos, r)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (faltam.length) { e.preventDefault(); setTentou(true); return; }
              // Registra (site_contatos + CRM) sem segurar o WhatsApp: keepalive
              // deixa a requisição terminar mesmo com a aba indo para o WhatsApp.
              try {
                fetch("/api/contato", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ respostas: r, produtos, pagina: window.location.pathname, website: isca }),
                  keepalive: true,
                }).catch(() => {});
              } catch {}
              setAberto(false);
            }}
            className="group w-full min-h-[52px] inline-flex items-center justify-center gap-3 rounded-2xl bg-[#a1d494] text-[#002045] text-[11px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] px-6 hover:bg-[#b4dea9] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="opacity-80" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar pelo WhatsApp
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-hover:translate-x-0.5" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <p className="text-white/45 text-[11px] font-[var(--font-inter)] text-center mt-3 tracking-[0.02em]">
            Você será atendido por um consultor da Orbital.
          </p>
        </div>
      </div>
    </div>
  );
}
