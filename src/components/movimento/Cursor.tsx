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
 * movimento reduzido. Ligar é pôr `html.mv-cursor`, que esconde o cursor
 * nativo (menos em campos de texto, que o CSS e o handler devolvem). Se
 * qualquer coisa falhar, a classe sai e o cursor nativo volta na hora. O
 * conjunto é decorativo (`aria-hidden`) e nunca toca no foco do teclado.
 */
export default function Cursor() {
  const posRef = useRef<HTMLDivElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
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

    /** Larga um botão: a transição do CSS (curva de chegada) o devolve ao lugar. */
    const soltar = (el: HTMLElement) => {
      el.removeAttribute("data-mv-segue");
      el.style.translate = "";
      seguindo.delete(el);
    };

    const aoMover = (e: PointerEvent) => {
      try {
        if (e.pointerType === "touch") {
          presente = false;
          marcar("visivel", "0");
          relogio.acordar();
          return;
        }
        const primeiro = !presente;
        presente = true;
        alvo.x = e.clientX;
        alvo.y = e.clientY;
        if (primeiro) {
          // Primeira aparição: nasce no ponto, sem deslizar vindo do canto.
          atual.x = alvo.x;
          atual.y = alvo.y;
        }
        const el = e.target instanceof Element ? e.target : null;
        const nativo = !!el?.closest(SELETOR_NATIVO);
        marcar("visivel", nativo ? "0" : "1");
        marcar("ver", !nativo && el?.closest('[data-cursor="ver"]') ? "1" : "0");
        marcar("clicavel", !nativo && el?.closest(SELETOR_CLICAVEL) ? "1" : "0");
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
      if (e.pointerType !== "touch" && e.isPrimary) marcar("pressionado", "1");
    };
    const aoSoltar = () => marcar("pressionado", "0");

    const tick = (dt: number): boolean => {
      try {
        let movendo = false;

        atual.x = aproximar(atual.x, alvo.x, dt, CURSOR_TAU_MS, CURSOR_EPSILON_PX);
        atual.y = aproximar(atual.y, alvo.y, dt, CURSOR_TAU_MS, CURSOR_EPSILON_PX);
        pos.style.transform = `translate3d(${atual.x.toFixed(2)}px, ${atual.y.toFixed(2)}px, 0)`;
        if (atual.x !== alvo.x || atual.y !== alvo.y) movendo = true;

        // Botões: leituras de caixa primeiro, escritas depois, no mesmo quadro.
        const agora = performance.now();
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
        return movendo;
      } catch {
        desligar();
        return false;
      }
    };

    function ligar() {
      if (ligado) return;
      ligado = true;
      html.classList.add("mv-cursor");
      document.addEventListener("pointermove", aoMover, { passive: true });
      document.addEventListener("pointerdown", aoPressionar, { passive: true });
      document.addEventListener("pointerup", aoSoltar, { passive: true });
      document.addEventListener("pointercancel", aoSoltar, { passive: true });
      html.addEventListener("pointerleave", aoSairDaJanela);
      window.addEventListener("blur", aoSairDaJanela);
      desassinar = relogio.assinar({ tick });
    }

    /** Também é a saída de emergência: tira a classe e o cursor nativo volta na hora. */
    function desligar() {
      html.classList.remove("mv-cursor");
      if (!ligado) return;
      ligado = false;
      document.removeEventListener("pointermove", aoMover);
      document.removeEventListener("pointerdown", aoPressionar);
      document.removeEventListener("pointerup", aoSoltar);
      document.removeEventListener("pointercancel", aoSoltar);
      html.removeEventListener("pointerleave", aoSairDaJanela);
      window.removeEventListener("blur", aoSairDaJanela);
      desassinar?.();
      desassinar = null;
      presente = false;
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

    sincronizar();
    mqMouse.addEventListener("change", sincronizar);
    mqReduzido.addEventListener("change", sincronizar);
    return () => {
      mqMouse.removeEventListener("change", sincronizar);
      mqReduzido.removeEventListener("change", sincronizar);
      desligar();
    };
  }, [restrita]);

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
