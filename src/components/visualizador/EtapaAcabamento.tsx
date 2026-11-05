"use client";

// Acabamento, uma área por vez: o nome da área com "1 de 2", as abas das linhas,
// uma fileira de cartões grandes que rola de lado e a linha "Onde". Ajustes
// (tipo de superfície e medidas) e Onde (descrição e o que manter igual) abrem
// em folhas. No celular a tela inteira cabe numa altura de tela, com a foto no
// alto e a barra de ação embaixo (alturas em globals.css › Visualizador). Só
// apresentação: escolher, descrever e ajustar chamam o wizard.
import React, { useId, useMemo, useRef, useState } from "react";
import type { VizProduct, Zone } from "../VisualizadorWizard";
import CartaoAcabamento from "./CartaoAcabamento";
import Folha from "./Folha";
import SurfaceCanvas from "./SurfaceCanvas";
import { useProporcao } from "./EditorMarcacao";
import { LINE_ORDER, VIZ_SPACES, type ProductLine } from "./fluxo";

type Analise = "idle" | "loading" | "done" | "error";

const ROTULO = "block text-[11px] font-bold uppercase tracking-[0.14em] text-[#5b5f66]";
const CAMPO =
  "w-full rounded-sm border border-[#dfe2e6] bg-white px-3 py-2.5 text-[15px] text-[#0B1F45] placeholder:text-[#8c9098] focus:border-[#0B1F45] focus:outline-none";
const LINK =
  "inline-flex min-h-11 items-center text-[13px] font-semibold text-[#0B1F45] underline decoration-[#0B1F45]/25 underline-offset-4 hover:text-[#2347A0] hover:decoration-[#2347A0]/40";
const BOTAO_FOLHA =
  "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#0B1F45] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#2347A0]";

const higienizarMedida = (v: string) => v.replace(/[^0-9.,]/g, "").replace(",", ".");

/**
 * A foto do Acabamento (coluna da esquerda no computador, alto da tela no
 * celular), parada, com a área atual destacada. Contida numa altura máxima
 * (--viz-foto-h), a largura acompanha a proporção.
 */
export function FotoAcabamento({ photoData, zones, rotulos, zonaAtualId }: {
  photoData: string; zones: Zone[]; rotulos: string[]; zonaAtualId: string | null;
}) {
  const proporcao = useProporcao(photoData);
  const nada = () => {};
  return (
    <div
      className="viz-acab-foto mx-auto overflow-hidden"
      style={proporcao ? { width: `min(100%, calc(var(--viz-foto-h) * ${proporcao}))` } : { maxHeight: "var(--viz-foto-h)" }}
    >
      <SurfaceCanvas
        interativo={false}
        photoData={photoData} zones={zones} rotulos={rotulos} activeZoneId={zonaAtualId} setActiveZoneId={nada}
        mode="tap" onTapPhoto={nada} onDrawRect={nada} updateZone={nada}
        busy={false} retargeting={false} onConfirmQuad={nada}
      />
    </div>
  );
}

/** Acabamento sem nenhuma área (todas removidas no editor): aviso, nunca tela em branco. */
export function AcabamentoSemAreas({ onEditarAreas }: { onEditarAreas: () => void }) {
  return (
    <div data-viz-acabamento className="py-2">
      <h2 className="font-serif text-xl leading-tight text-[#0B1F45]">Nenhuma área marcada</h2>
      <p className="mt-1 text-sm text-[#5b5f66]">Marque pelo menos uma parede, teto ou móvel para escolher o acabamento.</p>
      <button type="button" onClick={onEditarAreas} className={`${LINK} mt-1`}>Marcar as áreas</button>
    </div>
  );
}

export default function EtapaAcabamento({
  zona, rotulo, indice, total, produtos, carregando, analise, erroAnalise, onTentarDeNovo, depurar,
  onEscolher, onAtualizar, keepText, setKeepText, onEditarAreas,
}: {
  zona: Zone;
  /** Nome da área para o cliente (Parede 1…); sem ele, o label da zona. */
  rotulo?: string;
  indice: number;
  total: number;
  produtos: VizProduct[];
  carregando: boolean;
  analise: Analise;
  /** Mensagem do erro da análise, mostrada com "Tentar de novo". */
  erroAnalise?: string;
  onTentarDeNovo?: () => void;
  depurar: boolean;
  onEscolher: (productId: string) => void;
  onAtualizar: (patch: Partial<Zone>) => void;
  keepText: string;
  setKeepText: (v: string) => void;
  onEditarAreas: () => void;
}) {
  const nome = rotulo || zona.label;
  const idBase = useId();
  const produtoAtual = produtos.find((p) => p.id === zona.productId) ?? null;

  // Abas: só as linhas com modelos; começa na linha do modelo atual da área.
  const linhas = useMemo(() => LINE_ORDER.filter((l) => produtos.some((p) => p.linha === l)), [produtos]);
  const [linhaEscolhida, setLinhaEscolhida] = useState<ProductLine | null>(null);
  const linha: ProductLine | null =
    linhaEscolhida && linhas.includes(linhaEscolhida)
      ? linhaEscolhida
      : produtoAtual && linhas.includes(produtoAtual.linha)
        ? produtoAtual.linha
        : linhas[0] ?? null;
  const lista = linha ? produtos.filter((p) => p.linha === linha) : [];

  const fileira = useRef<HTMLDivElement | null>(null);
  const abasRef = useRef<Array<HTMLButtonElement | null>>([]);
  const trocarLinha = (l: ProductLine) => {
    setLinhaEscolhida(l);
    fileira.current?.scrollTo({ left: 0 });
  };
  const teclaAba = (e: React.KeyboardEvent, i: number) => {
    const n = linhas.length;
    const alvo = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (alvo < 0) return;
    e.preventDefault();
    trocarLinha(linhas[alvo]);
    abasRef.current[alvo]?.focus();
  };
  // Computador: setas para passar a fileira com o mouse.
  const passar = (sentido: 1 | -1) => {
    const el = fileira.current;
    if (!el) return;
    el.scrollBy({ left: sentido * 232 * 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  const [folha, setFolha] = useState<null | "onde" | "ajustes">(null);
  const lendo = analise === "loading";
  const instrucao = zona.instruction.trim();
  const redefinirCantos = depurar && !!produtoAtual?.render_texture_path?.trim() && !!zona.quad;

  return (
    <div data-viz-acabamento data-erro={analise === "error" ? "" : undefined} className="viz-area">
      {/* Área atual e as saídas secundárias */}
      <div className="flex h-9 items-center gap-3">
        <h2 className="min-w-0 flex-1 truncate font-serif text-xl leading-tight text-[#0B1F45]">
          {nome}
          <span className="font-sans text-sm text-[#5b5f66]"> · {indice + 1} de {total}</span>
        </h2>
        <button type="button" onClick={() => setFolha("ajustes")} className={`${LINK} -my-1 shrink-0`}>Ajustes</button>
        <button type="button" onClick={onEditarAreas} className={`${LINK} -my-1 shrink-0`}>Editar áreas</button>
      </div>

      {depurar && (
        <p data-viz-depurar className="mt-0.5 text-[10px] leading-4 text-[#74777f]">
          {zona.detecting ? "Detectando superfície…"
            : zona.detectFailed ? "Detecção falhou: ajuste manual pelos 4 pontos"
            : (zona.polygon || zona.maskUrl) && zona.detectEngine === "fal" ? "Superfície detectada (SAM2)"
            : (zona.polygon || zona.maskUrl) && zona.detectEngine === "gemini" ? "Contorno aproximado (SAM2 indisponível)"
            : zona.polygon || zona.maskUrl ? "Superfície detectada"
            : zona.manual && zona.rect ? "Área desenhada"
            : "Área descrita em texto"}
          {produtoAtual && (produtoAtual.render_texture_path?.trim() ? " · IA com referência" : " · IA com foto de referência")}
        </p>
      )}

      {/* Onde aplicar: logo abaixo do nome da área (embaixo, à direita, o balão
          do chat cobriria o "Editar"). */}
      <div data-viz-onde className="-mt-1 flex min-h-11 items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-sm" aria-live="polite">
          <span className="text-[#5b5f66]">Onde: </span>
          {lendo ? (
            <span className="text-[#0B1F45]">
              <span aria-hidden className="viz-ponto-detectando mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-[#2F5FD0] align-middle" />
              Lendo a foto…
            </span>
          ) : instrucao ? (
            <span className="text-[#0B1F45]">{instrucao}</span>
          ) : (
            <span className="font-semibold text-[#8a5a12]">Descreva onde aplicar</span>
          )}
        </p>
        <button type="button" onClick={() => setFolha("onde")} aria-label="Editar onde aplicar" className={`${LINK} shrink-0`}>
          Editar
        </button>
      </div>
      {analise === "error" && (
        <div className="-mt-2 flex items-center gap-3 text-[13px] text-[#8a5a12]">
          <p className="min-w-0 flex-1 truncate">{erroAnalise || "Não foi possível ler a foto."}</p>
          {onTentarDeNovo && (
            <button type="button" onClick={onTentarDeNovo} className="inline-flex min-h-11 shrink-0 items-center font-semibold underline underline-offset-2">
              Tentar de novo
            </button>
          )}
        </div>
      )}

      {/* Linhas */}
      <div className="mt-1 flex items-end border-b border-[#ececea]">
        <div role="tablist" aria-label="Linhas de acabamento" className="flex min-w-0 flex-1 gap-5">
          {linhas.map((l, i) => {
            const atual = l === linha;
            return (
              <button
                key={l}
                ref={(el) => { abasRef.current[i] = el; }}
                type="button"
                role="tab"
                id={`${idBase}-aba-${l}`}
                aria-selected={atual}
                aria-controls={`${idBase}-modelos`}
                tabIndex={atual ? 0 : -1}
                onClick={() => trocarLinha(l)}
                onKeyDown={(e) => teclaAba(e, i)}
                className={`relative -mb-px h-11 border-b-2 text-[13px] transition-colors ${
                  atual ? "border-[#0B1F45] font-semibold text-[#0B1F45]" : "border-transparent text-[#5b5f66] hover:text-[#0B1F45]"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
        <div className="hidden shrink-0 gap-1 pb-1.5 lg:flex">
          {([-1, 1] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => passar(s)}
              aria-label={s < 0 ? "Modelos anteriores" : "Mais modelos"}
              className="grid h-8 w-8 place-items-center rounded-full border border-[#dfe2e6] text-[#0B1F45] transition-colors hover:border-[#0B1F45]"
            >
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={s < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Modelos da linha: fileira que rola de lado (no celular, até a borda da tela) */}
      <div
        ref={fileira}
        id={`${idBase}-modelos`}
        role="tabpanel"
        aria-labelledby={linha ? `${idBase}-aba-${linha}` : undefined}
        aria-busy={carregando || undefined}
        className="viz-cartoes -mx-4 mt-1 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 py-1.5 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-1 lg:px-1"
      >
        {carregando ? (
          [0, 1].map((i) => (
            <span key={i} aria-hidden className="block w-[70vw] max-w-[320px] shrink-0 lg:w-[220px]">
              <span className="viz-cartao-foto block rounded-sm bg-[#eef0f2]" />
              <span className="mt-2 block h-[18px] w-2/3 rounded-sm bg-[#eef0f2]" />
              <span className="mt-1 block h-3 w-1/4 rounded-sm bg-[#eef0f2]" />
            </span>
          ))
        ) : lista.length === 0 ? (
          <p className="viz-cartao-foto flex items-center text-sm text-[#5b5f66]">
            Não foi possível carregar os acabamentos. Recarregue a página para tentar de novo.
          </p>
        ) : (
          lista.map((p) => (
            <CartaoAcabamento
              key={p.id}
              produto={p}
              selecionado={!!zona.productChosen && zona.productId === p.id}
              onEscolher={() => onEscolher(p.id)}
            />
          ))
        )}
      </div>


      <Folha aberta={folha === "onde"} titulo="Onde aplicar" onFechar={() => setFolha(null)}>
        <label htmlFor={`${idBase}-onde`} className={ROTULO}>Onde aplicar em {nome}</label>
        <textarea
          id={`${idBase}-onde`}
          value={zona.instruction}
          onChange={(e) => onAtualizar({ instruction: e.target.value })}
          rows={3}
          placeholder="ex: nas paredes cinza ao fundo, atrás do sofá"
          className={`${CAMPO} mt-1.5 resize-none`}
        />
        {lendo && <p className="mt-1.5 text-[13px] text-[#5b5f66]">Lendo a foto… a descrição aparece aqui.</p>}
        {analise === "error" && (
          <p className="mt-1.5 text-[13px] text-[#8a5a12]">
            {erroAnalise || "Não foi possível ler a foto."}{" "}
            {onTentarDeNovo && (
              <button type="button" onClick={onTentarDeNovo} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2">
                Tentar de novo
              </button>
            )}
          </p>
        )}
        <label htmlFor={`${idBase}-manter`} className={`${ROTULO} mt-5`}>Manter igual</label>
        <textarea
          id={`${idBase}-manter`}
          value={keepText}
          onChange={(e) => setKeepText(e.target.value)}
          rows={2}
          placeholder="ex: os móveis, o piso e a iluminação"
          className={`${CAMPO} mt-1.5 resize-none`}
        />
        <p className="mt-1.5 text-[13px] text-[#5b5f66]">Vale para a foto inteira.</p>
        <button type="button" onClick={() => setFolha(null)} className={BOTAO_FOLHA}>Pronto</button>
      </Folha>

      <Folha aberta={folha === "ajustes"} titulo="Ajustes" onFechar={() => setFolha(null)}>
        <label htmlFor={`${idBase}-tipo`} className={ROTULO}>Tipo de superfície</label>
        <select
          id={`${idBase}-tipo`}
          value={zona.surface}
          onChange={(e) => onAtualizar({ surface: e.target.value })}
          className={`${CAMPO} mt-1.5`}
        >
          {VIZ_SPACES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          <option value="__custom__">Outro…</option>
        </select>
        {zona.surface === "__custom__" && (
          <input
            aria-label="Nome do local"
            value={zona.customLabel}
            onChange={(e) => onAtualizar({ customLabel: e.target.value })}
            placeholder="ex: parede atrás da TV"
            className={`${CAMPO} mt-2`}
          />
        )}
        <p className={`${ROTULO} mt-5`}>
          Medidas <span className="font-normal normal-case tracking-normal">(opcional)</span>
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <input
            inputMode="decimal"
            aria-label="Largura em metros"
            value={zona.width}
            onChange={(e) => onAtualizar({ width: higienizarMedida(e.target.value) })}
            placeholder="Largura (m)"
            className={CAMPO}
          />
          <input
            inputMode="decimal"
            aria-label="Altura em metros"
            value={zona.height}
            onChange={(e) => onAtualizar({ height: higienizarMedida(e.target.value) })}
            placeholder="Altura (m)"
            className={CAMPO}
          />
        </div>
        {redefinirCantos && (
          <button type="button" onClick={() => onAtualizar({ quad: null })} className={`${LINK} mt-3`}>
            Redefinir cantos
          </button>
        )}
        <button type="button" onClick={() => setFolha(null)} className={BOTAO_FOLHA}>Pronto</button>
      </Folha>
    </div>
  );
}
