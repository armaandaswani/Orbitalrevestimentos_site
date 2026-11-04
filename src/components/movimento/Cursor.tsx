"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { inclinacao } from "@/lib/movimento/inclinacao";
import { decidirNivel, lerSinais } from "@/lib/movimento/nivel";
import { relogio } from "@/lib/movimento/relogio";
import { aproximar } from "@/lib/movimento/suavizar";

/** Áreas restritas (mesma lista do porteiro da intro): painel e portais ficam com o cursor nativo. */
const AREA_RESTRITA = /^\/(admin|parceiro|representante|o)(\/|$)/;

/** O ponto segue o ponteiro com peso, mas sem arrasto: metade do "tau" padrão do site. */
const CURSOR_TAU_MS = 60;
/** Abaixo de 0,05 px o ponto já assentou. */
const CURSOR_EPSILON_PX = 0.05;
/** O botão acompanha a inclinação um pouco mais devagar que o ponto: peso, não nervosismo. */
const BOTAO_TAU_MS = 90;
/** Abaixo de 0,02 px a inclinação já assentou. */
const BOTAO_EPSILON_PX = 0.02;
/** A lista de `.ds-botao` é relida a cada tanto: a página troca de conteúdo sem avisar. */
const LISTA_BOTOES_MS = 600;
/** Depois de trocar de rota o conteúdo novo chega (transição, hidratação): relê o que está sob o ponteiro por esse tempo. */
const RELER_APOS_ROTA_MS = 700;

/** Campos onde o cursor nativo (cursor de texto, de seleção) precisa voltar. */
const SELETOR_NATIVO =
  'input, textarea, select, iframe, [contenteditable]:not([contenteditable="false"])';
/** Elementos clicáveis: sem a mãozinha nativa, o ponto cresce um pouco para avisar. */
const SELETOR_CLICAVEL = 'a[href], button, summary, label, select, [role="button"], [role="tab"]';

/**
 * Cursor refinado, só para quem usa mouse ou trackpad: um ponto de 8 px azul
 * marinho segue o ponteiro pelo relógio único do site; sobre imagens e
 * cartões (`[data-cursor="ver"]`) ele se abre num anel de 64 px com "Ver", e
 * encolhe a 0,85 ao pressionar. Também faz os botões `.ds-botao` se inclinarem
 * até 6 px para o lado do ponteiro, dentro de 80 px do centro.
 *
 * Só liga com `(hover: hover) and (pointer: fine)`, nível `completo` e sem
 * movimento reduzido. Ligar é escutar o ponteiro; o cursor nativo só some
 * (`html.mv-cursor`) no primeiro movimento de mouse de verdade, então quem abre
 * a página sem tocar no mouse (ou num aparelho híbrido, no toque) nunca fica
 * sem cursor. Um toque depois tira a classe até o próximo movimento do mouse.
 * Se qualquer coisa falhar, a classe sai e o cursor nativo volta na hora.
 * Com o ponteiro parado, rolar ou trocar de rota relê o que está embaixo dele
 * (uma consulta por quadro). O conjunto é decorativo (`aria-hidden`) e nunca
 * toca no foco do teclado.
 */
export default function Cursor() {
  const posRef = useRef<HTMLDivElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  /** O efeito principal publica aqui o pedido de releitura, para a troca de rota (efeito abaixo) usar. */
  const reler = useRef<((janelaMs: number) => void) | null>(null);
  const caminho = usePathname();
  const restrita = AREA_RESTRITA.test(caminho ?? "");

  useEffect(() => {
    const pos = posRef.current;
    const corpo = corpoRef.current;
    if (!pos || !corpo || restrita) return;
    const html = document.documentElement;

    const mqMouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    const mqReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Estado do cursor. Muda a cada evento ou quadro, sem renderizar.
    const alvo = { x: 0, y: 0 };
    const atual = { x: 0, y: 0 };
    /** Ponteiro de mouse dentro da janela: sem isso nada aparece nem se inclina. */
    let presente = false;
    /** `html.mv-cursor` está posta (cursor nativo escondido): só depois do primeiro movimento de mouse. */
    let ativo = false;
    /** Há uma releitura do que está sob o ponteiro pedida para o próximo quadro. */
    let sujo = false;
    /** Até quando (performance.now) reler a cada quadro, depois de trocar de rota. */
    let relerAte = 0;
    /** Estado escrito no DOM por último (só escreve quando muda). */
    const marca = { visivel: "", ver: "", clicavel: "", pressionado: "" };
    /** Botões que seguem o ponteiro agora, com o deslocamento mostrado em px. */
    const seguindo = new Map<HTMLElement, { x: number; y: number }>();
    let lista: HTMLElement[] = [];
    let listaEm = -Infinity;
    let desassinar: (() => void) | null = null;
    let ligado = false;

    /** Escreve um atributo de estado só se mudou. */
    const marcar = (chave: keyof typeof marca, valor: string) => {
      if (marca[chave] === valor) return;
      marca[chave] = valor;
      const nome = chave === "visivel" ? "data-visivel" : `data-${chave}`;
      corpo.setAttribute(nome, valor);
    };

    /** O que há sob o ponteiro: campo nativo, "Ver" e clicável. */
    const classificar = (el: Element | null) => {
      const nativo = !!el?.closest(SELETOR_NATIVO);
      return {
        visivel: nativo ? "0" : "1",
        ver: !nativo && el?.closest('[data-cursor="ver"]') ? "1" : "0",
        clicavel: !nativo && el?.closest(SELETOR_CLICAVEL) ? "1" : "0",
      };
    };
    const aplicar = (c: ReturnType<typeof classificar>) => {
      marcar("visivel", c.visivel);
      marcar("ver", c.ver);
      marcar("clicavel", c.clicavel);
    };

    /** Larga um botão: a transição do CSS (curva de chegada) o devolve ao lugar. */
    const soltar = (el: HTMLElement) => {
      el.removeAttribute("data-mv-segue");
      el.style.translate = "";
      seguindo.delete(el);
    };

    /** Primeiro mouse de verdade: agora sim o cursor nativo some. */
    const esconderNativo = () => {
      if (ativo) return;
      ativo = true;
      html.classList.add("mv-cursor");
    };
    /** Toque (ou caneta): o cursor nativo volta e o ponto some até o próximo movimento do mouse. */
    const devolverNativo = () => {
      if (ativo) {
        ativo = false;
        html.classList.remove("mv-cursor");
      }
      presente = false;
      marcar("visivel", "0");
      marcar("pressionado", "0");
      relogio.acordar();
    };

    const aoMover = (e: PointerEvent) => {
      try {
        if (e.pointerType !== "mouse") {
          devolverNativo();
          return;
        }
        esconderNativo();
        const primeiro = !presente;
        presente = true;
        alvo.x = e.clientX;
        alvo.y = e.clientY;
        if (primeiro) {
          // Primeira aparição: nasce no ponto, sem deslizar vindo do canto.
          atual.x = alvo.x;
          atual.y = alvo.y;
        }
        aplicar(classificar(e.target instanceof Element ? e.target : null));
        relogio.acordar();
      } catch {
        desligar();
      }
    };

    const aoSairDaJanela = () => {
      presente = false;
      marcar("visivel", "0");
      marcar("pressionado", "0");
      relogio.acordar();
    };

    const aoPressionar = (e: PointerEvent) => {
      // Um toque sem movimento também conta como interação por toque.
      if (e.pointerType !== "mouse") devolverNativo();
      else if (e.isPrimary) marcar("pressionado", "1");
    };
    const aoSoltar = () => marcar("pressionado", "0");

    /** Pede a releitura do que está sob o ponteiro parado (rolagem, troca de rota). */
    const pedirLeitura = (janelaMs = 0) => {
      if (!ativo || !presente) return;
      sujo = true;
      if (janelaMs > 0) relerAte = Math.max(relerAte, performance.now() + janelaMs);
      relogio.acordar();
    };
    // Captura: rolar o trilho de um carrossel também move cartões sob o ponteiro.
    const aoRolar = () => pedirLeitura();

    const tick = (dt: number): boolean => {
      try {
        let movendo = false;
        const agora = performance.now();

        // Leitura primeiro (uma consulta por quadro, só com o ponteiro parado sob conteúdo que mudou);
        // a escrita no DOM do cursor fica para o fim, junto das outras.
        let lido: ReturnType<typeof classificar> | null = null;
        if (ativo && presente && (sujo || agora < relerAte)) {
          sujo = false;
          lido = classificar(document.elementFromPoint(alvo.x, alvo.y));
          if (agora < relerAte) movendo = true;
        }

        atual.x = aproximar(atual.x, alvo.x, dt, CURSOR_TAU_MS, CURSOR_EPSILON_PX);
        atual.y = aproximar(atual.y, alvo.y, dt, CURSOR_TAU_MS, CURSOR_EPSILON_PX);
        pos.style.transform = `translate3d(${atual.x.toFixed(2)}px, ${atual.y.toFixed(2)}px, 0)`;
        if (atual.x !== alvo.x || atual.y !== alvo.y) movendo = true;

        // Botões: leituras de caixa primeiro, escritas depois, no mesmo quadro.
        if (agora - listaEm > LISTA_BOTOES_MS) {
          lista = Array.from(document.querySelectorAll<HTMLElement>(".ds-botao"));
          listaEm = agora;
        }
        const alvos: Array<[HTMLElement, { x: number; y: number } | null]> = [];
        for (const el of lista) {
          if (!el.isConnected) {
            seguindo.delete(el);
            continue;
          }
          if (!presente) {
            alvos.push([el, null]);
            continue;
          }
          const c = el.getBoundingClientRect();
          if (c.width === 0 || c.height === 0) {
            alvos.push([el, null]);
            continue;
          }
          // O centro medido já inclui a inclinação aplicada: tira, senão ela realimenta a si mesma.
          const s = seguindo.get(el);
          const centro = {
            x: c.left + c.width / 2 - (s?.x ?? 0),
            y: c.top + c.height / 2 - (s?.y ?? 0),
          };
          const d = inclinacao(alvo, centro);
          alvos.push([el, d.x !== 0 || d.y !== 0 ? d : null]);
        }
        for (const [el, d] of alvos) {
          if (!d) {
            if (seguindo.has(el)) soltar(el);
            continue;
          }
          let s = seguindo.get(el);
          if (!s) {
            s = { x: 0, y: 0 };
            seguindo.set(el, s);
            el.setAttribute("data-mv-segue", "");
          }
          s.x = aproximar(s.x, d.x, dt, BOTAO_TAU_MS, BOTAO_EPSILON_PX);
          s.y = aproximar(s.y, d.y, dt, BOTAO_TAU_MS, BOTAO_EPSILON_PX);
          el.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
          if (s.x !== d.x || s.y !== d.y) movendo = true;
        }
        if (lido) aplicar(lido);
        return movendo;
      } catch {
        desligar();
        return false;
      }
    };

    function ligar() {
      if (ligado) return;
      ligado = true;
      // A classe html.mv-cursor NÃO entra aqui: só no primeiro movimento de mouse (aoMover).
      document.addEventListener("pointermove", aoMover, { passive: true });
      document.addEventListener("pointerdown", aoPressionar, { passive: true });
      document.addEventListener("pointerup", aoSoltar, { passive: true });
      document.addEventListener("pointercancel", aoSoltar, { passive: true });
      window.addEventListener("scroll", aoRolar, { passive: true, capture: true });
      html.addEventListener("pointerleave", aoSairDaJanela);
      window.addEventListener("blur", aoSairDaJanela);
      desassinar = relogio.assinar({ tick });
    }

    /** Também é a saída de emergência: tira a classe e o cursor nativo volta na hora. */
    function desligar() {
      ativo = false;
      html.classList.remove("mv-cursor");
      if (!ligado) return;
      ligado = false;
      document.removeEventListener("pointermove", aoMover);
      document.removeEventListener("pointerdown", aoPressionar);
      document.removeEventListener("pointerup", aoSoltar);
      document.removeEventListener("pointercancel", aoSoltar);
      window.removeEventListener("scroll", aoRolar, { capture: true });
      html.removeEventListener("pointerleave", aoSairDaJanela);
      window.removeEventListener("blur", aoSairDaJanela);
      desassinar?.();
      desassinar = null;
      presente = false;
      sujo = false;
      relerAte = 0;
      for (const el of [...seguindo.keys()]) soltar(el);
      marcar("visivel", "0");
      marcar("pressionado", "0");
    }

    /** Liga ou desliga conforme o aparelho, o nível e o movimento reduzido. */
    const sincronizar = () => {
      try {
        const pode = mqMouse.matches && !mqReduzido.matches && decidirNivel(lerSinais()) === "completo";
        if (pode) ligar();
        else desligar();
      } catch {
        desligar();
      }
    };

    reler.current = pedirLeitura;
    sincronizar();
    mqMouse.addEventListener("change", sincronizar);
    mqReduzido.addEventListener("change", sincronizar);
    return () => {
      reler.current = null;
      mqMouse.removeEventListener("change", sincronizar);
      mqReduzido.removeEventListener("change", sincronizar);
      desligar();
    };
  }, [restrita]);

  // Trocou de página com o ponteiro parado: o que está embaixo dele mudou sem ele se mexer.
  useEffect(() => {
    reler.current?.(RELER_APOS_ROTA_MS);
  }, [caminho]);

  return (
    <div ref={posRef} aria-hidden className="mv-cursor-pos">
      <div ref={corpoRef} className="mv-cursor-corpo" data-visivel="0" data-ver="0" data-clicavel="0" data-pressionado="0">
        <span className="mv-cursor-ponto" />
        <span className="mv-cursor-anel">
          <span className="mv-cursor-texto">Ver</span>
        </span>
      </div>
    </div>
  );
}
