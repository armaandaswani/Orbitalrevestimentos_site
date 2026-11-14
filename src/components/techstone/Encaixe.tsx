"use client";

import { useEffect } from "react";
import { ehTela, escolherTela } from "@/lib/movimento/encaixe";

/** Sem scrollend (Safari antigo), a rolagem conta como parada depois disto. */
const PARADA_MS = 140;

/**
 * Encaixe firme da TechStone: quando a rolagem para, a página desliza até a
 * tela (`.ts-encaixe-ponto` de 0,8 a 1,6 janela) que entrou; um toque de roda já
 * leva à vizinha, e o texto solto rola livre (regra em lib/movimento/encaixe).
 * Não mexe enquanto o dedo está na tela, com movimento reduzido nem quando o
 * foco do teclado está fora da tela escolhida.
 */
export default function Encaixe() {
  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ultima: number | null = null;
    let yAntes = window.scrollY;
    let tocando = false;
    let deslizando = false;
    let parada = 0;
    let solta = 0;

    const telas = () => Array.from(document.querySelectorAll<HTMLElement>(".ts-encaixe-ponto"));
    const encaixada = (lista: HTMLElement[]) => {
      const i = lista.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return Math.abs(r.top) < 2 && ehTela(r.height, window.innerHeight);
      });
      return i >= 0 ? i : null;
    };

    const parou = () => {
      window.clearTimeout(parada);
      const lista = telas();
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
      if (tocando || reduzir.matches) return;
      const vh = window.innerHeight;
      const direcao = Math.sign(window.scrollY - yAntes);
      const i = escolherTela(lista.map((el) => {
        const r = el.getBoundingClientRect();
        return { topo: r.top, altura: r.height };
      }), vh, ultima, direcao);
      yAntes = window.scrollY;
      if (i === null) {
        ultima = encaixada(lista) ?? ultima;
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
    const tocou = () => { tocando = true; };
    const soltou = () => { tocando = false; rolou(); };

    ultima = encaixada(telas());
    window.addEventListener("scroll", rolou, { passive: true });
    window.addEventListener("scrollend", parou);
    window.addEventListener("touchstart", tocou, { passive: true });
    window.addEventListener("touchend", soltou, { passive: true });
    window.addEventListener("touchcancel", soltou, { passive: true });
    return () => {
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
