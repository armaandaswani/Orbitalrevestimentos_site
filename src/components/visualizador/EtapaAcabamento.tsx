"use client";

// Acabamento, uma área por vez: o nome da área com "1 de 2", as abas das linhas,
// uma fileira de cartões grandes que rola de lado e a linha "Onde". Ajustes
// (tipo de superfície e medidas) e Onde (descrição e o que manter igual) abrem
// em folhas. No celular a tela inteira cabe numa altura de tela, com a faixa da
// foto no alto e a barra de ação embaixo (alturas em globals.css › Visualizador). Só
// apresentação: escolher, descrever e ajustar chamam o wizard.
import React, { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { VizProduct, Zone } from "../VisualizadorWizard";
import CartaoAcabamento from "./CartaoAcabamento";
import Folha from "./Folha";
import SurfaceCanvas from "./SurfaceCanvas";
import { useProporcao } from "./EditorMarcacao";
import { LINE_ORDER, VIZ_SPACES, type ProductLine } from "./fluxo";

type Analise = "idle" | "loading" | "done" | "error";

const ROTULO = "block text-[11px] font-bold uppercase tracking-[0.14em] text-[#5b5f66]";
const CAMPO =
  "min-h-11 w-full rounded-sm border border-[#dfe2e6] bg-white px-3 py-2.5 text-[15px] text-[#0B1F45] placeholder:text-[#8c9098] focus:border-[#0B1F45] focus:outline-none";
const LINK =
  "inline-flex min-h-11 min-w-11 items-center text-[13px] font-semibold text-[#0B1F45] underline decoration-[#0B1F45]/25 underline-offset-4 hover:text-[#2347A0] hover:decoration-[#2347A0]/40";
const BOTAO_FOLHA =
  "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#0B1F45] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#2347A0]";

// Aba de linha: as de LINE_ORDER e "Outros" (linha desconhecida no catálogo).
const OUTROS = "Outros" as const;
type Aba = ProductLine | typeof OUTROS;
const abaDe = (p: VizProduct): Aba => (LINE_ORDER.includes(p.linha) ? p.linha : OUTROS);

const higienizarMedida =(v: string) => v.replace(/[^0-9.,]/g, "").replace(",", ".");

const nada = () => {};

// ── Foto do Acabamento ────────────────────────────────────────────────────────

type Ponto = { x: number; y: number };

const centroDaCaixa = (xs: number[], ys: number[]): Ponto => ({
  x: (Math.min(...xs) + Math.max(...xs)) / 2,
  y: (Math.min(...ys) + Math.max(...ys)) / 2,
});

/** Centro da área (0..1) pelo polígono, pela caixa ou pelos cantos; null se só houver máscara. */
function centroDireto(z: Zone): Ponto | null {
  if (z.polygon && z.polygon.length >= 3) return centroDaCaixa(z.polygon.map((p) => p[0]), z.polygon.map((p) => p[1]));
  if (z.rect) return { x: z.rect.x + z.rect.w / 2, y: z.rect.y + z.rect.h / 2 };
  if (z.quad) return centroDaCaixa(z.quad.map((p) => p[0]), z.quad.map((p) => p[1]));
  return null;
}

// Centro da máscara (caixa dos pixels visíveis), lido uma vez por URL. O
// resultado fica guardado também de forma síncrona (as últimas 24 máscaras),
// para a faixa enquadrar na hora ao voltar para uma área já vista.
const centrosResolvidos = new Map<string, Ponto | null>();
const centrosPendentes = new Map<string, Promise<Ponto | null>>();
const LIMITE_CENTROS = 24;
function guardarCentro(url: string, c: Ponto | null) {
  centrosResolvidos.delete(url);
  centrosResolvidos.set(url, c);
  while (centrosResolvidos.size > LIMITE_CENTROS) {
    const maisAntigo = centrosResolvidos.keys().next().value;
    if (maisAntigo === undefined) break;
    centrosResolvidos.delete(maisAntigo);
  }
}
function centroDaMascara(url: string): Promise<Ponto | null> {
  let p = centrosPendentes.get(url);
  if (!p) {
    p = new Promise<Ponto | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = 96;
          const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          let x0 = w, y0 = h, x1 = -1, y1 = -1;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          resolve(x1 < 0 ? null : { x: (x0 + x1 + 1) / 2 / w, y: (y0 + y1 + 1) / 2 / h });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    }).then((c) => {
      guardarCentro(url, c);
      centrosPendentes.delete(url);
      return c;
    });
    centrosPendentes.set(url, p);
  }
  return p;
}

function useCentroDaArea(z: Zone | undefined): Ponto {
  const direto = z ? centroDireto(z) : null;
  const url = !direto && z?.maskUrl ? z.maskUrl : null;
  const [mascara, setMascara] = useState<{ url: string; c: Ponto | null } | null>(null);
  const guardado = url && centrosResolvidos.has(url) ? centrosResolvidos.get(url) ?? null : undefined;
  useEffect(() => {
    if (!url || centrosResolvidos.has(url)) return;
    let vivo = true;
    void centroDaMascara(url).then((c) => { if (vivo) setMascara({ url, c }); });
    return () => { vivo = false; };
  }, [url]);
  const daMascara = guardado !== undefined ? guardado : url && mascara?.url === url ? mascara.c : null;
  return direto ?? daMascara ?? { x: 0.5, y: 0.5 };
}

const consultaComputador = "(min-width: 1024px)";
function assinarLargura(aviso: () => void) {
  const mq = window.matchMedia(consultaComputador);
  mq.addEventListener("change", aviso);
  return () => mq.removeEventListener("change", aviso);
}
/** Layout de computador (duas colunas, ≥ 1024 px); falso no servidor. */
function useLarguraComputador(): boolean {
  return useSyncExternalStore(assinarLargura, () => window.matchMedia(consultaComputador).matches, () => false);
}

/**
 * A foto do Acabamento, parada (interativo={false}). No computador, inteira na
 * coluna da esquerda, com as áreas e os nomes. No celular, uma faixa da largura
 * do conteúdo e altura fixa, recortada como object-fit: cover e centrada na
 * área atual: a foto com as áreas (SurfaceCanvas na proporção certa, então as
 * máscaras continuam alinhadas) é escalada e deslocada só com transform. Na
 * faixa só a área atual tem cor cheia, as outras ficam quase apagadas e não há
 * rótulos (o nome está no título logo abaixo). Na troca de área a foto desliza
 * até a nova (instantâneo com movimento reduzido).
 */
export function FotoAcabamento({ photoData, zones, rotulos, zonaAtualId }: {
  photoData: string; zones: Zone[]; rotulos: string[]; zonaAtualId: string | null;
}) {
  const computador = useLarguraComputador();
  return computador
    ? <FotoInteira photoData={photoData} zones={zones} rotulos={rotulos} zonaAtualId={zonaAtualId} />
    : <FaixaFoto photoData={photoData} zones={zones} zonaAtualId={zonaAtualId} />;
}

function FotoInteira({ photoData, zones, rotulos, zonaAtualId }: {
  photoData: string; zones: Zone[]; rotulos: string[]; zonaAtualId: string | null;
}) {
  const proporcao = useProporcao(photoData);
  return (
    <div
      className="viz-acab-foto mx-auto overflow-hidden"
      style={proporcao ? { width: `min(100%, calc(var(--viz-foto-h) * ${proporcao}))` } : { maxHeight: "var(--viz-foto-h)" }}
    >
      <SurfaceCanvas
        interativo={false}
        photoData={photoData} zones={zones} rotulos={rotulos} activeZoneId={zonaAtualId} setActiveZoneId={nada}
        mode="tap" onTapPhoto={nada} onDrawRect={nada} updateZone={nada}
        retargeting={false} onConfirmQuad={nada}
      />
    </div>
  );
}

function FaixaFoto({ photoData, zones, zonaAtualId }: { photoData: string; zones: Zone[]; zonaAtualId: string | null }) {
  const proporcao = useProporcao(photoData);
  const centro = useCentroDaArea(zones.find((z) => z.id === zonaAtualId));
  const moldura = useRef<HTMLDivElement | null>(null);
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = moldura.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const posicionada = !!tam && !!proporcao && tam.w > 0 && tam.h > 0;
  let estilo: React.CSSProperties = { width: "100%" };
  if (posicionada) {
    // Cobre a faixa (escala mínima 1) e põe o centro da área no meio, sem sair da foto.
    const altNatural = tam.w / proporcao;
    const s = Math.max(1, tam.h / altNatural);
    const larg = tam.w * s;
    const alt = altNatural * s;
    const tx = Math.min(0, Math.max(tam.w - larg, tam.w / 2 - centro.x * larg));
    const ty = Math.min(0, Math.max(tam.h - alt, tam.h / 2 - centro.y * alt));
    estilo = { width: tam.w, transform: `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})` };
  }
  // A transição só liga depois do primeiro enquadramento: a foto não "voa" ao aparecer.
  useEffect(() => {
    if (!posicionada) return;
    const el = moldura.current;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => el?.setAttribute("data-animar", "")); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [posicionada]);

  return (
    <div ref={moldura} data-viz-faixa className="viz-acab-faixa relative overflow-hidden rounded-sm bg-[#11151b]">
      <div className="viz-faixa-mov absolute left-0 top-0 origin-top-left" style={estilo}>
        <SurfaceCanvas
          interativo={false}
          destaque="atual"
          photoData={photoData} zones={zones} activeZoneId={zonaAtualId} setActiveZoneId={nada}
          mode="tap" onTapPhoto={nada} onDrawRect={nada} updateZone={nada}
          retargeting={false} onConfirmQuad={nada}
        />
      </div>
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
  zona, rotulo, indice, total, produtos, carregando, analise, erroAnalise, onTentarDeNovo, depurar, projecao = false,
  onEscolher, onAtualizar, keepText, setKeepText, onEditarAreas, abrirOnde = false, onOndeFechada,
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
  /** Projeção pelos 4 cantos ligada no render (só aí os cantos valem para o cliente). */
  projecao?: boolean;
  onEscolher: (productId: string) => void;
  onAtualizar: (patch: Partial<Zone>) => void;
  keepText: string;
  setKeepText: (v: string) => void;
  onEditarAreas: () => void;
  /** Abrir a folha Onde ao montar (vindo do aviso "Falta dizer onde aplicar…"). */
  abrirOnde?: boolean;
  /** A folha Onde fechou (o pedido de abrir já foi atendido). */
  onOndeFechada?: () => void;
}) {
  const nome = rotulo || zona.label;
  const idBase = useId();
  const produtoAtual = produtos.find((p) => p.id === zona.productId) ?? null;

  // Abas: só as linhas com modelos, e "Outros" para modelos de uma linha fora
  // de LINE_ORDER (nunca somem); começa na aba do modelo escolhido da área (o
  // modelo semeado por padrão, ainda não escolhido, não conta), senão na primeira.
  const linhas = useMemo<Aba[]>(() => {
    const conhecidas: Aba[] = LINE_ORDER.filter((l) => produtos.some((p) => p.linha === l));
    return produtos.some((p) => abaDe(p) === OUTROS) ? [...conhecidas, OUTROS] : conhecidas;
  }, [produtos]);
  const [linhaEscolhida, setLinhaEscolhida] = useState<Aba | null>(null);
  const linha: Aba | null =
    linhaEscolhida && linhas.includes(linhaEscolhida)
      ? linhaEscolhida
      : zona.productChosen && produtoAtual && linhas.includes(abaDe(produtoAtual))
        ? abaDe(produtoAtual)
        : linhas[0] ?? null;
  const lista = linha ? produtos.filter((p) => abaDe(p) === linha) : [];

  const fileira = useRef<HTMLDivElement | null>(null);
  const abasRef = useRef<Array<HTMLButtonElement | null>>([]);
  const trocarLinha = (l: Aba) => {
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

  const [folha, setFolha] = useState<null | "onde" | "ajustes">(abrirOnde ? "onde" : null);
  // Aberta pela linha "Falta dizer onde aplicar…", a folha não tem quem a abriu
  // nesta tela (a linha some ao trocar de área): ao fechar, o foco vai para o
  // título da área. O efeito roda depois da limpeza da Folha.
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const focarTitulo = useRef(false);
  const fecharOnde = () => {
    if (abrirOnde) focarTitulo.current = true;
    setFolha(null);
    onOndeFechada?.();
  };
  useEffect(() => {
    if (folha !== null || !focarTitulo.current) return;
    focarTitulo.current = false;
    tituloRef.current?.focus({ preventScroll: true });
  }, [folha]);
  const lendo = analise === "loading";
  const instrucao = zona.instruction.trim();
  // Refazer os cantos: só quando se aplica (projeção pelos cantos ligada, ou
  // ?debug=1; modelo com textura plana e área com os 4 cantos). Com a projeção
  // desligada os cantos não entram no render, e o cliente não apaga o quad de
  // reserva da detecção. Limpa o quad da área, como o antigo "Redefinir cantos".
  const refazerCantos = (projecao || depurar) && !!produtoAtual?.render_texture_path?.trim() && !!zona.quad;

  return (
    <div data-viz-acabamento data-erro={analise === "error" ? "" : undefined} className="viz-area">
      {/* Área atual e as saídas secundárias. min-h e não altura fixa: com fonte
          grande de acessibilidade a linha cresce em vez de cobrir a linha Onde,
          e a tela passa a rolar (de propósito; o encaixe numa tela vale para o
          tamanho de texto padrão). O contador fica fora do corte do nome. */}
      <div className="flex min-h-8 items-center gap-3">
        <h2 ref={tituloRef} tabIndex={-1} className="flex min-w-0 flex-1 items-baseline font-serif text-xl leading-tight text-[#0B1F45]">
          <span className="min-w-0 truncate">{nome}</span>
          <span className="ml-1.5 shrink-0 whitespace-nowrap font-sans text-sm text-[#5b5f66]">· {indice + 1} de {total}</span>
        </h2>
        <button type="button" onClick={() => setFolha("ajustes")} className={`${LINK} -my-1.5 shrink-0`}>Ajustes</button>
        <button type="button" onClick={onEditarAreas} className={`${LINK} -my-1.5 shrink-0`}>Editar áreas</button>
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
          do chat cobriria o "Editar"). Se a análise falhou e a área ficou sem
          texto, a linha inteira é um botão que abre a folha Onde. A linha toda
          é uma região viva: "Lendo a foto…", a descrição e "Descreva onde
          aplicar" (também no botão da falha) são anunciados ao mudar. */}
      <div data-viz-onde aria-live="polite" className="flex min-h-11 items-center gap-3">
        {analise === "error" && !instrucao ? (
          <button type="button" onClick={() => setFolha("onde")} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left text-sm">
            <span className="min-w-0 flex-1 truncate">
              <span className="text-[#5b5f66]">Onde: </span>
              <span className="font-semibold text-[#8a5a12]">Descreva onde aplicar</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-[#0B1F45] underline decoration-[#0B1F45]/25 underline-offset-4">Editar</span>
          </button>
        ) : (
          <>
            <p className="min-w-0 flex-1 truncate text-sm">
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
          </>
        )}
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
                className={`relative -mb-px h-11 min-w-11 border-b-2 text-[13px] ${
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
              className="grid h-11 w-11 place-items-center rounded-full border border-[#dfe2e6] text-[#0B1F45] hover:border-[#0B1F45]"
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
              <span className="mt-2 block h-5 w-2/3 rounded-sm bg-[#eef0f2]" />
            </span>
          ))
        ) : lista.length === 0 ? (
          <p className="viz-cartao-foto flex items-center text-sm text-[#5b5f66]">
            Não foi possível carregar os acabamentos. Recarregue a página para tentar de novo.
          </p>
        ) : (
          lista.map((p, i) => (
            <CartaoAcabamento
              key={p.id}
              produto={p}
              adiar={i >= 2}
              selecionado={!!zona.productChosen && zona.productId === p.id}
              onEscolher={() => onEscolher(p.id)}
            />
          ))
        )}
      </div>


      <Folha aberta={folha === "onde"} titulo="Onde aplicar" onFechar={fecharOnde}>
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
        <button type="button" onClick={fecharOnde} className={BOTAO_FOLHA}>Pronto</button>
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
        {refazerCantos && (
          <button type="button" onClick={() => onAtualizar({ quad: null })} className={`${LINK} mt-3`}>
            Refazer os cantos
          </button>
        )}
        <button type="button" onClick={() => setFolha(null)} className={BOTAO_FOLHA}>Pronto</button>
      </Folha>
    </div>
  );
}
