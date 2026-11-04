"use client";

import { useEffect, useRef, type ReactNode } from "react";
// Tempos da intro num lugar só (o mesmo que o controle da intro e o CSS usam):
// INICIO_CORTINA é quando a cortina começa a subir; ESPERA_MAXIMA_HERO, o fim
// da intro mais uma folga, para a foto se acomodar se o fim nunca avisar.
import { ESPERA_MAXIMA_HERO as ESPERA_MAXIMA, INICIO_CORTINA } from "@/lib/movimento/introTempo";

/**
 * A cortina já subiu (ou sumiu)? Se a hidratação do hero chegar tarde, travar a
 * foto em 1,04 agora a faria saltar para trás (pop) antes de se acomodar; nesse
 * caso o assentar do CSS segue sozinho. Web Animations em try/catch: sem a API
 * ou com erro, trata como "ainda não subiu" e mantém o comportamento normal.
 */
function cortinaJaSubiu(): boolean {
  if (!document.getElementById("intro-orbita")) return true;
  try {
    const subida = document
      .getAnimations()
      .find((a) => typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation && a.animationName === "intro-cortina");
    if (!subida) return false;
    return subida.playState === "finished" || Number(subida.currentTime ?? 0) >= INICIO_CORTINA;
  } catch {
    return false;
  }
}

/**
 * Faz a foto do hero se acomodar (de 1,04 para 1) quando a abertura aparece.
 * A animação está no CSS (`.mv-assenta`) e começa na primeira pintura, sem
 * esperar a hidratação, para não haver salto nem atraso na visita comum.
 * Só com a intro da órbita ligada (`html[data-intro="1"]` no momento da
 * montagem) a foto fica parada em 1,04 atrás da cortina e se acomoda quando
 * `orbital:intro-fim` chega, ou após `ESPERA_MAXIMA` se o evento não vier.
 * Nunca depende de `data-intro` em CSS: se a hidratação falhar, o atributo
 * poderia ficar para sempre e a foto ficaria presa. O DOM é tocado direto
 * (atributo no elemento), sem estado, para o React não repintar o hero.
 */
export default function HeroAssenta({ children }: { children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el || document.documentElement.dataset.intro !== "1") return;
    if (cortinaJaSubiu()) return;

    el.dataset.assenta = "espera";
    const soltar = () => {
      window.clearTimeout(limite);
      window.removeEventListener("orbital:intro-fim", soltar);
      delete el.dataset.assenta;
    };
    const limite = window.setTimeout(soltar, ESPERA_MAXIMA);
    window.addEventListener("orbital:intro-fim", soltar);
    return () => {
      window.clearTimeout(limite);
      window.removeEventListener("orbital:intro-fim", soltar);
      delete el.dataset.assenta;
    };
  }, []);

  return (
    <div ref={caixa} className="absolute inset-0 mv-assenta">
      {children}
    </div>
  );
}
