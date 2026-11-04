"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  LENTE_SEGURAR_MS, LENTE_TAMANHO, LENTE_ZOOM,
  posicaoLente, retanguloAjustado, type CaixaLente,
} from "@/lib/movimento/lente";
import { relogio, tauAtual } from "@/lib/movimento/relogio";
import { aproximar } from "@/lib/movimento/suavizar";

/** A lente segue o ponto quase colada (meio "tau" padrão): precisa parecer precisa, não elástica. */
const SEGUIR_TAU_FATOR = 0.45;
/** Abaixo de 0,05 px a lente já assentou. */
const SEGUIR_EPSILON_PX = 0.05;
/** Dedo que anda mais que isso antes dos 250 ms está rolando, não segurando. */
const TOLERANCIA_DEDO_PX = 10;
/** Folga da lente em relação à borda da tela, para não ser cortada pelo toque perto dela. */
const MARGEM_TELA_PX = 6;
/** Depois de soltar o dedo que segurou, o clique sintético que o navegador manda ainda é engolido por este tempo. */
const ENGOLIR_CLIQUE_MS = 600;
/** Lente fechada há tanto tempo (as transições levam menos de 0,4 s): o portal sai do DOM. */
const DESMONTAR_MS = 1000;

interface Estado {
  /** Ponto a seguir e ponto mostrado agora (a lente suaviza de um para o outro), em px de tela. */
  alvo: { x: number; y: number };
  atual: { x: number; y: number };
  caixa: CaixaLente | null;
  /** Tamanho natural do arquivo grande, conhecido quando termina de baixar. */
  natural: { l: number; a: number } | null;
  aberta: boolean;
  toque: boolean;
  /** Pedido de download já feito (a primeira interação dispara; depois não repete). */
  carregou: string | null;
  /** Último arquivo que falhou ao baixar: só uma interação nova (entrar, segurar) tenta de novo. */
  falhou: string | null;
  temporizador: number | null;
  inicio: { x: number; y: number };
  /** Houve um segurar de dedo: o clique que viria ao soltar não deve selecionar nada. */
  segurou: boolean;
  limparSegurou: number | null;
}

/**
 * Lupa de textura, no jeito de uma lente de joalheiro: com mouse, passar por
 * cima mostra uma lente redonda de 160 px com a textura 2,5× maior, tirada do
 * arquivo de alta resolução (`fonte`). No toque, segurar 250 ms abre a lente
 * 90 px acima do dedo; um toque rápido ou uma rolagem seguem normais.
 *
 * Decorativa (`aria-hidden`): os links de download continuam sendo o caminho
 * acessível. O arquivo grande só começa a baixar na primeira interação, e o
 * ponto seguido passa pelo relógio único do site. A lente fica num portal no
 * <body>, em `position: fixed`, para não ser cortada pelo `overflow` da
 * miniatura nem deslocada por transformações dos ancestrais.
 *
 * `ajuste` diz como a imagem filha ocupa a caixa (`cobrir` = object-cover,
 * `conter` = object-contain), para a lente apontar o mesmo pedaço que se vê.
 * `className` substitui o padrão `relative block`.
 */
export default function Lupa({ fonte, ajuste = "cobrir", className = "relative block", children }: {
  fonte: string;
  ajuste?: "cobrir" | "conter";
  className?: string;
  children: ReactNode;
}) {
  const caixaRef = useRef<HTMLSpanElement>(null);
  const posRef = useRef<HTMLDivElement>(null);
  const lenteRef = useRef<HTMLDivElement>(null);
  // Objeto mutável e estável: guarda o que os eventos e o relógio mudam a cada quadro sem renderizar.
  // Só se lê dentro de eventos, efeitos e do relógio (nunca na renderização).
  const estadoRef = useRef<Estado | null>(null);
  const est = useCallback((): Estado => {
    estadoRef.current ??= {
      alvo: { x: 0, y: 0 }, atual: { x: 0, y: 0 }, caixa: null, natural: null,
      aberta: false, toque: false, carregou: null, falhou: null, temporizador: null,
      inicio: { x: 0, y: 0 }, segurou: false, limparSegurou: null,
    };
    return estadoRef.current;
  }, []);

  /** A lente só existe no DOM depois da primeira interação. */
  const [ativou, setAtivou] = useState(false);
  const [aberta, setAberta] = useState(false);
  const [toqueAberto, setToqueAberto] = useState(false);
  /** Arquivo grande já baixado (guarda qual, para a troca de `fonte` invalidar sozinha). */
  const [pronta, setPronta] = useState<string | null>(null);
  /** Com `conter`, o ponteiro sobre a faixa vazia ao lado da imagem não abre a lente. */
  const [sobreImagem, setSobreImagem] = useState(true);

  const visivel = aberta && pronta === fonte && sobreImagem;

  /**
   * Começa a baixar o arquivo grande (uma vez por `fonte`). Só é chamado por
   * uma interação de verdade: passar o mouse, segurar o dedo, ou mexer o mouse
   * depois de a foto ter trocado. Com `retentar`, uma falha anterior não bloqueia.
   */
  const baixar = useCallback((retentar: boolean) => {
    if (est().carregou === fonte) return;
    if (!retentar && est().falhou === fonte) return;
    est().carregou = fonte;
    est().falhou = null;
    est().natural = null;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (est().carregou !== fonte) return;
      est().natural = { l: img.naturalWidth, a: img.naturalHeight };
      setPronta(fonte);
    };
    img.onerror = () => {
      // Falhou: nada fica bloqueado (sem `natural` a lente não abre) e a próxima interação tenta de novo.
      if (est().carregou !== fonte) return;
      est().carregou = null;
      est().falhou = fonte;
    };
    img.src = fonte;
  }, [est, fonte]);

  /** Cria a lente no DOM e (se preciso) baixa o arquivo grande. */
  const carregar = useCallback((retentar: boolean) => {
    setAtivou(true);
    baixar(retentar);
  }, [baixar]);

  /** O arquivo desta `fonte` já baixou: só então a lente pode aparecer. */
  const arquivoPronto = useCallback(() => est().carregou === fonte && est().natural !== null, [est, fonte]);

  /** Mede onde a imagem está na tela agora e ajusta o tamanho da textura ampliada. */
  const medir = useCallback(() => {
    const el = caixaRef.current;
    if (!el) return;
    const c = el.getBoundingClientRect();
    const n = est().natural;
    const caixa = n ? retanguloAjustado(c, n.l, n.a, ajuste) : c;
    est().caixa = caixa;
    const lente = lenteRef.current;
    if (lente) lente.style.backgroundSize = `${caixa.width * LENTE_ZOOM}px ${caixa.height * LENTE_ZOOM}px`;
  }, [est, ajuste]);

  /** Escreve a posição da lente e o recorte da textura (só transform e background-position). */
  const aplicar = useCallback(() => {
    const caixa = est().caixa;
    const pos = posRef.current;
    const lente = lenteRef.current;
    if (!caixa || !pos || !lente) return;
    const r = posicaoLente(est().atual, caixa, { toque: est().toque });
    let { left, top } = r;
    if (est().toque) {
      // No toque a lente sobe do dedo: perto do topo ou das laterais ela não sai da tela.
      left = Math.min(Math.max(left, MARGEM_TELA_PX), window.innerWidth - LENTE_TAMANHO - MARGEM_TELA_PX);
      top = Math.max(top, MARGEM_TELA_PX);
    }
    pos.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0)`;
    lente.style.backgroundPosition = `${r.fundoX.toFixed(2)}px ${r.fundoY.toFixed(2)}px`;
  }, [est]);

  /** Aponta a lente para um novo ponto (mede de novo: a página pode ter rolado). */
  const apontar = useCallback((x: number, y: number) => {
    est().alvo = { x, y };
    medir();
    const c = est().caixa;
    if (ajuste === "conter" && c) {
      setSobreImagem(x >= c.left && x <= c.left + c.width && y >= c.top && y <= c.top + c.height);
    }
    relogio.acordar();
  }, [est, medir, ajuste]);

  const abrir = useCallback((x: number, y: number, toque: boolean) => {
    est().toque = toque;
    est().aberta = true;
    est().alvo = { x, y };
    est().atual = { x, y }; // abre direto no ponto, sem deslizar vindo de outro lugar
    apontar(x, y);
    setToqueAberto(toque);
    setAberta(true);
  }, [est, apontar]);

  const fechar = useCallback(() => {
    est().aberta = false;
    setAberta(false);
  }, [est]);

  const cancelarTemporizador = useCallback(() => {
    const t = est().temporizador;
    if (t !== null) {
      window.clearTimeout(t);
      est().temporizador = null;
    }
  }, [est]);

  // Posiciona a lente antes de ela aparecer (e quando o arquivo termina de baixar).
  useLayoutEffect(() => {
    if (!aberta) return;
    medir();
    est().atual = { ...est().alvo };
    aplicar();
  }, [aberta, pronta, ativou, est, medir, aplicar]);

  // O relógio só trabalha enquanto a lente está aberta.
  useEffect(() => {
    if (!aberta) return;
    return relogio.assinar({
      tick(dt) {
        if (!est().aberta) return false;
        const nivelLeve = document.documentElement.dataset.mvNivel === "leve";
        const tau = nivelLeve ? 0 : tauAtual() * SEGUIR_TAU_FATOR;
        est().atual.x = aproximar(est().atual.x, est().alvo.x, dt, tau, SEGUIR_EPSILON_PX);
        est().atual.y = aproximar(est().atual.y, est().alvo.y, dt, tau, SEGUIR_EPSILON_PX);
        aplicar();
        return est().atual.x !== est().alvo.x || est().atual.y !== est().alvo.y;
      },
    });
  }, [aberta, est, aplicar]);

  // Rolar com o mouse parado: a imagem anda sob o ponteiro. Fecha se saiu de cima dela.
  useEffect(() => {
    if (!aberta) return;
    const aoRolar = () => {
      apontar(est().alvo.x, est().alvo.y);
      const el = caixaRef.current;
      if (!el || est().toque) return;
      const c = el.getBoundingClientRect();
      const { x, y } = est().alvo;
      if (x < c.left || x > c.right || y < c.top || y > c.bottom) fechar();
    };
    window.addEventListener("scroll", aoRolar, { passive: true, capture: true });
    window.addEventListener("resize", aoRolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar, { capture: true });
      window.removeEventListener("resize", aoRolar);
    };
  }, [aberta, est, apontar, fechar]);

  // Com a lente aberta pelo dedo, arrastar move a lente e não rola a página. O
  // `touch-action: none` (abaixo) só vale para gestos que começam depois; para o
  // gesto em curso é este preventDefault, que ainda pode cancelar a rolagem
  // porque ela não começou (o dedo estava parado). Fora do segurar não faz nada.
  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const aoMoverToque = (ev: TouchEvent) => {
      if (est().aberta && est().toque && ev.cancelable) ev.preventDefault();
    };
    el.addEventListener("touchmove", aoMoverToque, { passive: false });
    return () => el.removeEventListener("touchmove", aoMoverToque);
  }, [est]);

  useEffect(() => () => {
    cancelarTemporizador();
    const t = est().limparSegurou;
    if (t !== null) window.clearTimeout(t);
  }, [est, cancelarTemporizador]);

  // Lente fechada por um tempo: tira o portal do DOM (e a camada fixa do navegador)
  // para passar por muitas miniaturas não deixar camadas ociosas pela página.
  useEffect(() => {
    if (aberta || !ativou) return;
    const t = window.setTimeout(() => setAtivou(false), DESMONTAR_MS);
    return () => window.clearTimeout(t);
  }, [aberta, ativou]);

  const aoEntrar = (ev: PointerEvent) => {
    if (ev.pointerType === "touch") return;
    carregar(true);
    abrir(ev.clientX, ev.clientY, false);
  };

  const aoMover = (ev: PointerEvent) => {
    if (ev.pointerType === "touch") {
      if (est().aberta) {
        apontar(ev.clientX, ev.clientY);
      } else if (est().temporizador !== null) {
        const dx = ev.clientX - est().inicio.x;
        const dy = ev.clientY - est().inicio.y;
        if (Math.hypot(dx, dy) > TOLERANCIA_DEDO_PX) cancelarTemporizador();
      }
      return;
    }
    if (!est().aberta) {
      carregar(false);
      abrir(ev.clientX, ev.clientY, false);
    } else {
      // A foto pode ter trocado com o mouse parado em cima (setas da galeria): busca a nova agora.
      baixar(false);
      apontar(ev.clientX, ev.clientY);
    }
  };

  const aoSair = (ev: PointerEvent) => {
    if (ev.pointerType === "touch") return;
    fechar();
  };

  const aoPressionar = (ev: PointerEvent) => {
    if (ev.pointerType !== "touch") return;
    cancelarTemporizador();
    // Segundo dedo (pinça): nunca abre a lente nem bloqueia o gesto.
    if (!ev.isPrimary) return;
    const antigo = est().limparSegurou;
    if (antigo !== null) window.clearTimeout(antigo);
    est().segurou = false;
    est().inicio = { x: ev.clientX, y: ev.clientY };
    const { clientX, clientY } = ev;
    // Encostar não baixa nada: um deslize de rolagem começa assim. A interação de
    // verdade é o segurar de 250 ms, e só ela busca o arquivo grande.
    est().temporizador = window.setTimeout(() => {
      est().temporizador = null;
      carregar(true);
      // Arquivo ainda baixando (primeira vez): o toque segue sendo um toque comum,
      // sem bloquear rolagem nem engolir o clique. A lente fica para a próxima.
      if (!arquivoPronto()) return;
      medir();
      const c = est().caixa;
      if (ajuste === "conter" && c && !(clientX >= c.left && clientX <= c.left + c.width && clientY >= c.top && clientY <= c.top + c.height)) return;
      // Só a partir daqui o segurar vale: a lente abre, a rolagem e o clique saem de cena.
      est().segurou = true;
      abrir(clientX, clientY, true);
    }, LENTE_SEGURAR_MS);
  };

  const aoSoltar = (ev: PointerEvent) => {
    if (ev.pointerType !== "touch") return;
    cancelarTemporizador();
    if (est().aberta) fechar();
    if (est().segurou) {
      est().limparSegurou = window.setTimeout(() => { est().segurou = false; est().limparSegurou = null; }, ENGOLIR_CLIQUE_MS);
    }
  };

  return (
    <span
      ref={caixaRef}
      className={className}
      onPointerEnter={aoEntrar}
      onPointerMove={aoMover}
      onPointerLeave={aoSair}
      onPointerDown={aoPressionar}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
      // Segurou e soltou: não é um clique (o botão de fora não deve selecionar).
      onClickCapture={(ev) => {
        // Qualquer clique fecha a lente, para ela nunca ficar por cima de um overlay aberto por ele.
        if (est().aberta) fechar();
        if (!est().segurou) return;
        ev.stopPropagation();
        ev.preventDefault();
      }}
      // O gesto de arrastar a lente não pode virar "passar a foto" no contêiner de fora.
      onTouchEnd={(ev) => { if (est().segurou) ev.stopPropagation(); }}
      // Pressionar e segurar abriria o menu de imagem do celular por cima da lente.
      onContextMenu={(ev) => { if (est().temporizador !== null || est().aberta || est().segurou) ev.preventDefault(); }}
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        cursor: visivel && !toqueAberto ? "none" : undefined,
        touchAction: aberta && toqueAberto ? "none" : undefined,
      }}
    >
      {children}
      {ativou && createPortal(
        <div ref={posRef} aria-hidden className="mv-lupa" style={{ width: LENTE_TAMANHO, height: LENTE_TAMANHO }}>
          <div
            ref={lenteRef}
            className="mv-lupa-lente"
            data-lupa-lente
            data-aberta={visivel}
            style={{ backgroundImage: `url(${JSON.stringify(fonte)})` }}
          />
        </div>,
        document.body,
      )}
    </span>
  );
}
