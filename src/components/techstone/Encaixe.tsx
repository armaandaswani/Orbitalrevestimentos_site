"use client";

import { useEffect } from "react";
import { escolherTela, telaAtual, type Tela } from "@/lib/movimento/encaixe";

/** Sem scrollend (Safari antigo), a rolagem conta como parada depois disto. */
const PARADA_MS = 140;

/**
 * Encaixe firme da TechStone, em dois modos.
 *
 * Toque (pointer: coarse): o scroll-snap do navegador (globals.css › html.ts-encaixe,
 * a classe entra aqui e sai ao desmontar). Só ele segura a inércia do dedo em
 * cada tela; um encaixe feito depois da parada deixaria o deslize forte pular
 * uma seção inteira.
 *
 * Mouse e trackpad: quando a rolagem para, a página desliza até a tela
 * (`.ts-encaixe-ponto` de 0,8 a 1,6 janela, sem `data-encaixe="solto"`) que
 * entrou; um toque de roda já leva à vizinha, e o texto solto rola livre
 * (regra em lib/movimento/encaixe). Aqui o scroll-snap obrigatório não serve:
 * o toque de roda não vence a borda de uma seção mais alta que a tela. Não
 * mexe com movimento reduzido, com uma folha ou foto aberta por cima
 * (aria-modal) nem quando o foco do teclado está fora da tela escolhida.
 */
export default function Encaixe() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("ts-encaixe");
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dedo = window.matchMedia("(pointer: coarse)");
    let ultima: number | null = null;
    let yAntes = window.scrollY;
    let deslizando = false;
    let tocando = false;
    let yToque = 0;
    let parada = 0;
    let solta = 0;

    const pontos = () => Array.from(document.querySelectorAll<HTMLElement>(".ts-encaixe-ponto"));
    const medir = (lista: HTMLElement[]): Tela[] => lista.map((el) => {
      const r = el.getBoundingClientRect();
      return { topo: r.top, altura: r.height, solta: el.dataset.encaixe === "solto" };
    });

    const parou = () => {
      window.clearTimeout(parada);
      const lista = pontos();
      if (deslizando) {
        deslizando = false;
        window.clearTimeout(solta);
        // Chegou aonde ia: pronto. Se a pessoa rolou no meio do deslize, a
        // parada é dela e passa pela regra de novo.
        if (ultima !== null && lista[ultima] && Math.abs(lista[ultima].getBoundingClientRect().top) < 2) {
          yAntes = window.scrollY;
          return;
        }
      }
      // Dedo ainda na tela (notebook com tela de toque): espera soltar.
      if (tocando) return;
      if (reduzir.matches || dedo.matches || document.querySelector('[aria-modal="true"]')) {
        yAntes = window.scrollY;
        return;
      }
      const vh = window.innerHeight;
      const telas = medir(lista);
      const direcao = Math.sign(window.scrollY - yAntes);
      const i = escolherTela(telas, vh, ultima, direcao);
      yAntes = window.scrollY;
      if (i === null) {
        // Numa tela (ou por dentro de uma mais alta) ela passa a ser a de saída;
        // no texto solto não há tela de saída, e nenhuma vizinha tem preferência.
        if (direcao !== 0) ultima = telaAtual(telas, vh);
        return;
      }
      // Foco do teclado fora da tela escolhida: deslizar o tiraria da vista.
      const foco = document.activeElement;
      if (foco instanceof HTMLElement && foco !== document.body && foco.matches(":focus-visible") && !lista[i].contains(foco)) return;
      ultima = i;
      deslizando = true;
      // Reserva: se o scrollend da rolagem suave não vier, solta mesmo assim.
      solta = window.setTimeout(() => { deslizando = false; yAntes = window.scrollY; }, 1200);
      window.scrollTo({ top: window.scrollY + lista[i].getBoundingClientRect().top, behavior: "smooth" });
    };

    const rolou = () => {
      window.clearTimeout(parada);
      parada = window.setTimeout(parou, PARADA_MS);
    };

    // Só o dedo que rolou a página pede encaixe ao soltar; um toque parado não.
    const tocou = () => { tocando = true; yToque = window.scrollY; };
    const soltou = () => { tocando = false; if (window.scrollY !== yToque) rolou(); };

    ultima = telaAtual(medir(pontos()), window.innerHeight);
    window.addEventListener("scroll", rolou, { passive: true });
    window.addEventListener("scrollend", parou);
    window.addEventListener("touchstart", tocou, { passive: true });
    window.addEventListener("touchend", soltou, { passive: true });
    window.addEventListener("touchcancel", soltou, { passive: true });
    return () => {
      html.classList.remove("ts-encaixe");
      window.clearTimeout(parada);
      window.clearTimeout(solta);
      window.removeEventListener("scroll", rolou);
      window.removeEventListener("scrollend", parou);
      window.removeEventListener("touchstart", tocou);
      window.removeEventListener("touchend", soltou);
      window.removeEventListener("touchcancel", soltou);
    };
  }, []);
  return null;
}
