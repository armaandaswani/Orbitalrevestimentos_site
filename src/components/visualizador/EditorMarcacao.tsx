"use client";

// Marcar as áreas. No celular, um editor em tela cheia (como a câmera do
// telefone: fundo escuro, a foto no meio, controles leves em volta); no
// computador, as mesmas peças no lugar (FotoMarcavel + PainelMarcacao). Só
// apresentação: tocar, desenhar, refazer e descrever chamam os handlers do
// wizard, que continuam donos da detecção.
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogo } from "@/components/ds/useDialogo";
import type { Rect, Zone } from "../VisualizadorWizard";
import SurfaceCanvas, { type ZoneMode } from "./SurfaceCanvas";
import { ZONE_COLORS, podeConcluirMarcacao } from "./fluxo";

const DICA = "Toque em cada parede, teto ou móvel que quer revestir";
const DICA_CLIQUE = "Clique em cada parede, teto ou móvel que quer revestir";
const AVISO_TEXTO = "Você escreve onde aplicar no próximo passo.";

/** Área criada por "Descrever em texto": sem toque, caixa, máscara nem polígono. */
function ehAreaDeTexto(z: Zone): boolean {
  return !z.detecting && !z.rect && !z.maskUrl && !(z.polygon && z.polygon.length >= 3);
}

/** Largura ÷ altura da foto, quando ela carrega (null antes). */
export function useProporcao(photoData: string): number | null {
  const [proporcao, setProporcao] = useState<number | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => { if (img.naturalWidth && img.naturalHeight) setProporcao(img.naturalWidth / img.naturalHeight); };
    img.src = photoData;
  }, [photoData]);
  return proporcao;
}

/**
 * Marcação no lugar só com mouse (ponteiro fino) a partir de 1024 px. Toque em
 * qualquer largura (tablet em paisagem inclusive) ou tela estreita usa o
 * editor em tela cheia: a foto da página nunca fica com touch-action:none.
 */
export function marcaNoLugar(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 1024px)").matches && !window.matchMedia("(pointer: coarse)").matches;
}

/**
 * `marcaNoLugar()` como estado, acompanhando giro e redimensionamento.
 * `aoMudar` roda no próprio evento de mudança (fora de efeito), para quem usa
 * ajustar o seu estado junto.
 */
export function useMarcacaoNoLugar(aoMudar?: (noLugar: boolean) => void): boolean {
  const [noLugar, setNoLugar] = useState(false);
  const aoMudarRef = useRef(aoMudar);
  useEffect(() => { aoMudarRef.current = aoMudar; });
  useEffect(() => {
    const largura = window.matchMedia("(min-width: 1024px)");
    const ponteiro = window.matchMedia("(pointer: coarse)");
    const ler = () => setNoLugar(marcaNoLugar());
    const mudou = () => { const v = marcaNoLugar(); setNoLugar(v); aoMudarRef.current?.(v); };
    ler();
    largura.addEventListener("change", mudou);
    ponteiro.addEventListener("change", mudou);
    return () => { largura.removeEventListener("change", mudou); ponteiro.removeEventListener("change", mudou); };
  }, []);
  return noLugar;
}

type HandlersMarcacao = {
  onTapPhoto: (nx: number, ny: number) => void;
  onDrawRect: (rect: Rect) => void;
  onConfirmQuad: (id: string) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
};

/**
 * A foto marcável (SurfaceCanvas interativo) com um pulso suave no ponto do
 * toque enquanto a área é detectada, no lugar do véu escuro sobre a foto toda.
 */
export function FotoMarcavel({
  photoData, zones, rotulos, activeZoneId, setActiveZoneId, modo, retargeting, onTapPhoto, onDrawRect, onConfirmQuad, updateZone, alturaMax,
}: HandlersMarcacao & {
  /** Altura máxima da foto (CSS); a largura acompanha a proporção. Sem ela, largura cheia. */
  alturaMax?: string;
  photoData: string;
  zones: Zone[];
  rotulos: string[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  modo: ZoneMode;
  retargeting: boolean;
}) {
  const [toque, setToque] = useState<{ x: number; y: number } | null>(null);
  const proporcao = useProporcao(photoData);
  const pulsos = zones
    .filter((z) => z.detecting)
    .map((z) => {
      // Caixa desenhada: o pulso fica no meio dela; toque: no ponto tocado.
      if (z.manual && z.rect) return { id: z.id, x: z.rect.x + z.rect.w / 2, y: z.rect.y + z.rect.h / 2 };
      if (toque) return { id: z.id, ...toque };
      if (z.rect) return { id: z.id, x: z.rect.x + z.rect.w / 2, y: z.rect.y + z.rect.h / 2 };
      return null;
    })
    .filter((p): p is { id: string; x: number; y: number } => !!p);

  return (
    <div className="relative" style={alturaMax && proporcao ? { width: `min(100%, calc(${alturaMax} * ${proporcao}))` } : undefined}>
      <SurfaceCanvas
        interativo
        photoData={photoData}
        zones={zones}
        rotulos={rotulos}
        activeZoneId={activeZoneId}
        setActiveZoneId={setActiveZoneId}
        mode={modo}
        onTapPhoto={(nx, ny) => { setToque({ x: nx, y: ny }); onTapPhoto(nx, ny); }}
        onDrawRect={onDrawRect}
        updateZone={updateZone}
        retargeting={retargeting}
        onConfirmQuad={onConfirmQuad}
      />
      {pulsos.map((p) => (
        <span
          key={p.id}
          data-viz-pulso
          aria-hidden
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          className="viz-pulso pointer-events-none absolute"
        />
      ))}
    </div>
  );
}

/**
 * A dica, os chips das áreas (cor, nome, ✕ e "Refazer" no selecionado) e as
 * duas saídas secundárias: desenhar uma área ou descrever em texto.
 */
export function PainelMarcacao({
  zones, rotulos, activeZoneId, setActiveZoneId, removeZone, retargetId, setRetargetId, modo, setModo, onAddTextZone, tom,
}: {
  zones: Zone[];
  rotulos: string[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  removeZone: (id: string) => void;
  retargetId: string | null;
  setRetargetId: (id: string | null) => void;
  modo: ZoneMode;
  setModo: (m: ZoneMode) => void;
  onAddTextZone: () => void;
  tom: "escuro" | "claro";
}) {
  const escuro = tom === "escuro";
  const refazendo = retargetId ? zones.findIndex((z) => z.id === retargetId) : -1;
  const dica = refazendo >= 0
    ? `${escuro ? "Toque" : "Clique"} no ponto certo para refazer ${rotulos[refazendo]}`
    : modo === "draw"
      ? "Arraste sobre a foto para marcar a área. Não precisa ser exato."
      : escuro ? DICA : DICA_CLIQUE;

  const chip = escuro
    ? { base: "border-white/15 bg-white/[0.06] text-white", sel: "border-white bg-white text-[#0B1F45]" }
    : { base: "border-[#dfe2e8] bg-white text-[#0B1F45]", sel: "border-[#0B1F45] bg-[#0B1F45] text-white" };
  const link = escuro
    ? "text-white/80 hover:text-white decoration-white/30"
    : "text-[#0B1F45] hover:text-[#2347A0] decoration-[#0B1F45]/25";

  // Área por texto selecionada: a descrição é escrita no passo seguinte.
  const ativa = zones.find((z) => z.id === activeZoneId);
  const textoSelecionado = !!ativa && ehAreaDeTexto(ativa);

  // Anúncios para leitor de tela quando as áreas mudam (escrita direta na região viva).
  const vivo = useRef<HTMLParagraphElement | null>(null);
  const anteriores = useRef(new Map(zones.map((z) => [z.id, z.detecting])));
  useEffect(() => {
    const antes = anteriores.current;
    let aviso = "";
    for (const z of zones) {
      if (!antes.has(z.id)) {
        if (!z.detecting) aviso = ehAreaDeTexto(z) ? `Área marcada. ${AVISO_TEXTO}` : "Área marcada";
        continue;
      }
      if (antes.get(z.id) && !z.detecting) aviso = z.detectFailed ? "Não foi possível detectar, desenhe a área" : "Área detectada";
    }
    anteriores.current = new Map(zones.map((z) => [z.id, z.detecting]));
    if (aviso && vivo.current) vivo.current.textContent = aviso;
  }, [zones]);

  return (
    <div>
      <p className={`text-[15px] leading-snug ${refazendo >= 0 ? (escuro ? "text-[#f3c77a]" : "text-[#8a5a12]") : escuro ? "text-white/85" : "text-[#43474e]"}`}>
        {dica}
      </p>

      {zones.length > 0 && (
        <ul
          aria-label="Áreas marcadas"
          className="viz-chips -mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
        >
          {zones.map((z, i) => {
            const sel = z.id === activeZoneId;
            const nome = rotulos[i];
            const cor = ZONE_COLORS[i % ZONE_COLORS.length];
            return (
              <li
                key={z.id}
                className={`flex shrink-0 snap-start items-center rounded-full border ${sel ? chip.sel : chip.base}`}
              >
                <button
                  type="button"
                  aria-pressed={sel}
                  onClick={() => setActiveZoneId(sel ? null : z.id)}
                  className="flex min-h-11 items-center gap-2 pl-3.5 pr-1.5 text-sm font-medium"
                >
                  <span
                    aria-hidden
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${z.detecting ? "viz-ponto-detectando" : ""}`}
                    style={{ background: cor }}
                  />
                  {nome}
                </button>
                {sel && (
                  <button
                    type="button"
                    onClick={() => { setModo("tap"); setRetargetId(retargetId === z.id ? null : z.id); }}
                    className={`min-h-11 px-2 text-[13px] font-semibold underline underline-offset-4 ${escuro ? "decoration-[#0B1F45]/30" : "decoration-white/40"}`}
                  >
                    {retargetId === z.id ? "Cancelar" : "Refazer"}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remover ${nome}`}
                  onClick={() => { if (retargetId === z.id) setRetargetId(null); removeZone(z.id); }}
                  className={`grid h-11 w-11 place-items-center rounded-full ${sel ? "opacity-80 hover:opacity-100" : escuro ? "text-white/60 hover:text-white" : "text-[#74777f] hover:text-[#0B1F45]"}`}
                >
                  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-5">
        <button
          type="button"
          aria-pressed={modo === "draw"}
          onClick={() => { setRetargetId(null); setModo(modo === "draw" ? "tap" : "draw"); }}
          className={`inline-flex min-h-11 items-center gap-2 text-[13px] font-medium underline underline-offset-4 ${link}`}
        >
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {modo === "draw" ? <><circle cx="12" cy="12" r="2.5" /><circle cx="12" cy="12" r="8" /></> : <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />}
          </svg>
          {modo === "draw" ? "Voltar a tocar" : "Desenhar uma área"}
        </button>
        <button
          type="button"
          onClick={onAddTextZone}
          className={`inline-flex min-h-11 items-center gap-2 text-[13px] font-medium underline underline-offset-4 ${link}`}
        >
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M5 7h14M5 12h14M5 17h8" />
          </svg>
          Descrever em texto
        </button>
      </div>

      {textoSelecionado && (
        <p className={`mt-1 text-[13px] leading-snug ${escuro ? "text-white/70" : "text-[#5b5f66]"}`}>{AVISO_TEXTO}</p>
      )}

      <p ref={vivo} aria-live="polite" className="sr-only" />
    </div>
  );
}

// Uma entrada no histórico por editor aberto: o voltar do navegador fecha o
// editor e a página fica onde está. Fora do React porque o modo estrito monta,
// desmonta e remonta o editor; o contador evita empilhar duas entradas.
// Enquanto a entrada existe, a restauração de rolagem do navegador fica manual:
// sair dela (voltar, ou o history.back() do ✕/Pronto) não pode devolver a
// página à posição antiga, de antes de a etapa rolar para o topo.
let editoresMontados = 0;
let entradaEmpilhada: string | null = null;
let restauracaoAntes: ScrollRestoration = "auto";

function devolverRestauracao() {
  history.scrollRestoration = restauracaoAntes;
}

export default function EditorMarcacao(props: {
  aberto: boolean;
  photoData: string;
  zones: Zone[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  onTapPhoto: (nx: number, ny: number) => void;
  onDrawRect: (rect: Rect) => void;
  onAddTextZone: () => void;
  onConfirmQuad: (id: string) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  removeZone: (id: string) => void;
  retargetId: string | null;
  setRetargetId: (id: string | null) => void;
  /** Nome de cada área para o cliente, na ordem das zonas. */
  rotulos: string[];
  ocupado: boolean;
  onPronto: () => void;
  onFechar: () => void;
}) {
  if (!props.aberto || typeof document === "undefined") return null;
  return createPortal(<EditorAberto {...props} />, document.body);
}

function EditorAberto({
  photoData, zones, activeZoneId, setActiveZoneId, onTapPhoto, onDrawRect, onAddTextZone, onConfirmQuad, updateZone, removeZone,
  retargetId, setRetargetId, rotulos, ocupado, onPronto, onFechar,
}: React.ComponentProps<typeof EditorMarcacao>) {
  const raiz = useRef<HTMLDivElement | null>(null);
  const fecharRef = useRef<HTMLButtonElement | null>(null);
  const ficarRef = useRef<HTMLButtonElement | null>(null);
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const tituloId = useId();
  const [modo, setModo] = useState<ZoneMode>("tap");
  const [perguntando, setPerguntando] = useState(false);
  // Áreas que já existiam ao abrir: só as novas são descartadas pelo ✕.
  const [iniciais] = useState(() => new Set(zones.map((z) => z.id)));
  const novas = zones.filter((z) => !iniciais.has(z.id));

  const onFecharRef = useRef(onFechar);
  useEffect(() => { onFecharRef.current = onFechar; });

  const descartar = () => {
    for (const z of novas) removeZone(z.id);
    setRetargetId(null);
    onFechar();
  };
  // Dispensar a pergunta (Continuar marcando ou Esc): o foco volta ao ✕.
  const ficar = () => {
    setPerguntando(false);
    fecharRef.current?.focus({ preventScroll: true });
  };
  const pedirFechar = () => {
    if (perguntando) { ficar(); return; }
    if (novas.length > 0) { setPerguntando(true); return; }
    setRetargetId(null);
    onFechar();
  };
  // Trava a rolagem (contador do site, body overflow), prende o foco, Esc pede para fechar.
  // O foco entra pelo título: o leitor de tela anuncia o editor e nenhum botão
  // aparece aceso logo ao abrir.
  useDialogo(raiz, pedirFechar, true, tituloRef);

  useEffect(() => { if (perguntando) ficarRef.current?.focus({ preventScroll: true }); }, [perguntando]);

  // Histórico: empilha uma entrada ao abrir; voltar fecha mantendo as marcações.
  useEffect(() => {
    editoresMontados += 1;
    if (entradaEmpilhada === null) {
      entradaEmpilhada = location.pathname + location.search;
      restauracaoAntes = history.scrollRestoration;
      history.scrollRestoration = "manual";
      history.pushState({ vizEditor: true }, "");
    }
    let porVoltar = false;
    const aoVoltar = () => {
      if (entradaEmpilhada === null) return;
      entradaEmpilhada = null;
      porVoltar = true;
      window.setTimeout(devolverRestauracao, 0);
      onFecharRef.current();
    };
    window.addEventListener("popstate", aoVoltar);
    return () => {
      window.removeEventListener("popstate", aoVoltar);
      editoresMontados -= 1;
      if (porVoltar) return;
      window.setTimeout(() => {
        if (editoresMontados > 0 || entradaEmpilhada === null) return;
        const mesmaPagina = entradaEmpilhada === location.pathname + location.search;
        entradaEmpilhada = null;
        // Fechou por ✕, Esc ou Pronto: tira a entrada. Saiu da página: deixa como está.
        if (!mesmaPagina) { devolverRestauracao(); return; }
        window.addEventListener("popstate", () => window.setTimeout(devolverRestauracao, 0), { once: true });
        history.back();
      }, 0);
    };
  }, []);

  // Proporção da foto, para caber inteira (contain) entre a barra e o painel.
  const proporcao = useProporcao(photoData);

  const podePronto = podeConcluirMarcacao(zones);

  return (
    <div
      ref={raiz}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      data-viz-editor
      className="viz-editor fixed inset-0 z-[80] flex flex-col overscroll-contain bg-[#0B1F45] text-white"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-2 pt-[env(safe-area-inset-top)]">
        <button
          ref={fecharRef}
          type="button"
          onClick={pedirFechar}
          aria-label="Fechar"
          className="grid h-12 w-12 place-items-center rounded-full text-white/85 hover:text-white"
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <h2 ref={tituloRef} id={tituloId} tabIndex={-1} className="font-serif text-[17px] leading-none text-white outline-none">Marcar as áreas</h2>
        <button
          type="button"
          onClick={onPronto}
          disabled={!podePronto}
          className={`min-h-11 rounded-full px-5 text-[13px] font-bold tracking-[0.06em] ${
            podePronto ? "bg-[#36A35C] text-[#0B1F45] hover:bg-[#4BB571]" : "cursor-not-allowed bg-white/10 text-white/40"
          }`}
        >
          Pronto
        </button>
      </div>

      {/* A foto no meio, inteira; só ela tem touch-action:none. */}
      <div aria-busy={ocupado} className="relative min-h-0 flex-1 px-3 py-3" style={{ containerType: "size" }}>
        <div className="flex h-full w-full items-center justify-center">
          <div style={{ width: proporcao ? `min(100cqw, calc(100cqh * ${proporcao}))` : "100%" }}>
            <FotoMarcavel
              photoData={photoData}
              zones={zones}
              rotulos={rotulos}
              activeZoneId={activeZoneId}
              setActiveZoneId={setActiveZoneId}
              modo={modo}
              retargeting={!!retargetId}
              onTapPhoto={onTapPhoto}
              onDrawRect={onDrawRect}
              onConfirmQuad={onConfirmQuad}
              updateZone={updateZone}
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <PainelMarcacao
          tom="escuro"
          zones={zones}
          rotulos={rotulos}
          activeZoneId={activeZoneId}
          setActiveZoneId={setActiveZoneId}
          removeZone={removeZone}
          retargetId={retargetId}
          setRetargetId={setRetargetId}
          modo={modo}
          setModo={setModo}
          onAddTextZone={onAddTextZone}
        />
      </div>

      {perguntando && (
        <div className="viz-editor-pergunta absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] rounded-[14px] bg-white p-5 text-[#0B1F45] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <p className="font-serif text-xl leading-tight">Descartar as novas marcações?</p>
          <p className="mt-1 text-sm text-[#5b5f66]">As áreas que você marcou agora saem da foto.</p>
          <div className="mt-4 flex gap-2">
            <button
              ref={ficarRef}
              type="button"
              onClick={ficar}
              className="min-h-11 flex-1 whitespace-nowrap border border-[#d5d9e0] px-2 text-[13px] font-semibold hover:border-[#0B1F45]"
            >
              Continuar marcando
            </button>
            <button
              type="button"
              onClick={descartar}
              className="min-h-11 flex-1 whitespace-nowrap bg-[#0B1F45] px-2 text-[13px] font-semibold text-white hover:bg-[#2347A0]"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
