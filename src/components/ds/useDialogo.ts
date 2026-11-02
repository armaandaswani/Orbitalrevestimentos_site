"use client";

import { useEffect, type RefObject } from "react";

/**
 * Trava a rolagem da página enquanto houver alguma folha aberta. Um contador,
 * e não um "salva e devolve": duas folhas empilhadas (showroom + galeria)
 * podem fechar em qualquer ordem que a página só volta a rolar quando a
 * última sai. A posição de rolagem fica como estava (overflow hidden não
 * mexe no scrollY).
 */
let abertas = 0;
export function travarRolagem(): () => void {
  abertas += 1;
  document.body.style.overflow = "hidden";
  let solto = false;
  return () => {
    if (solto) return;
    solto = true;
    abertas -= 1;
    if (abertas <= 0) { abertas = 0; document.body.style.overflow = ""; }
  };
}

const FOCAVEIS = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], iframe, [tabindex]:not([tabindex='-1'])";

/**
 * Comportamento de diálogo modal para uma folha por cima da página: trava a
 * rolagem, leva o foco para dentro, prende o Tab, Esc fecha e, ao fechar, o
 * foco volta para onde estava. `ativo` deixa a folha de cima assumir o Esc
 * (a de baixo passa `ativo={false}` enquanto a galeria está aberta).
 */
export function useDialogo(ref: RefObject<HTMLElement | null>, onFechar: () => void, ativo = true, focoInicial?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const antes = document.activeElement as HTMLElement | null;
    const soltar = travarRolagem();
    (focoInicial?.current ?? el.querySelector<HTMLElement>(FOCAVEIS) ?? el).focus({ preventScroll: true });
    return () => { soltar(); antes?.focus?.({ preventScroll: true }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura
  }, []);

  useEffect(() => {
    if (!ativo) return;
    const el = ref.current;
    if (!el) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onFechar(); return; }
      if (e.key !== "Tab") return;
      const lista = [...el.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((f) => f.offsetParent !== null || f === document.activeElement);
      if (lista.length === 0) return;
      const primeiro = lista[0], ultimo = lista[lista.length - 1];
      const dentro = el.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === primeiro || !dentro)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [ref, onFechar, ativo]);
}
