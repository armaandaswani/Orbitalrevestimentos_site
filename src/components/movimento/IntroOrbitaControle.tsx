"use client";

import { useEffect } from "react";

/** Quando a cortina começa a subir na sequência normal (ms); igual ao atraso no CSS. */
const INICIO_CORTINA = 1200;

/**
 * Animações que formam a subida da cortina (o campo, a liberação do clique e
 * o conteúdo que sobe junto). Pular é adiantá-las para o começo da subida; as
 * faixas e a trava de segurança de 2,2 s seguem no tempo delas.
 */
const ANIMACOES_DA_CORTINA = new Set(["intro-cortina", "intro-solta", "intro-conteudo-sai"]);

/**
 * Parte cliente da intro da órbita. Qualquer toque, clique ou tecla adianta a
 * sequência para a subida da cortina (nunca volta atrás se ela já subia).
 * Quando a cortina termina, desliga `data-intro` no <html> e avisa o resto do
 * site com o evento `orbital:intro-fim` em window (o hero se acomoda nele).
 * Se a hidratação chegar depois de a cortina já ter subido, fecha na hora.
 * Não renderiza nada; sem intro na visita, não faz nada.
 */
export default function IntroOrbitaControle() {
  useEffect(() => {
    const raiz = document.documentElement;
    const cortina = document.getElementById("intro-orbita");
    if (raiz.dataset.intro !== "1" || !cortina) return;

    let encerrada = false;
    const encerrar = () => {
      if (encerrada) return;
      encerrada = true;
      soltarPulo();
      cortina.removeEventListener("animationend", aoTerminarAnimacao);
      delete raiz.dataset.intro;
      window.dispatchEvent(new Event("orbital:intro-fim"));
    };

    const aoTerminarAnimacao = (e: AnimationEvent) => {
      if (e.target === cortina && e.animationName === "intro-cortina") encerrar();
    };

    const pular = () => {
      soltarPulo();
      for (const animacao of cortina.getAnimations({ subtree: true })) {
        if (!(animacao instanceof CSSAnimation)) continue;
        if (!ANIMACOES_DA_CORTINA.has(animacao.animationName)) continue;
        if (Number(animacao.currentTime ?? 0) < INICIO_CORTINA) animacao.currentTime = INICIO_CORTINA;
      }
    };
    const soltarPulo = () => {
      window.removeEventListener("pointerdown", pular);
      window.removeEventListener("keydown", pular);
    };

    cortina.addEventListener("animationend", aoTerminarAnimacao);
    window.addEventListener("pointerdown", pular, { passive: true });
    window.addEventListener("keydown", pular);

    // Cortina já terminada (hidratação lenta) ou sem animação (CSS de
    // movimento reduzido a escondeu): não há animationend por vir.
    const subida = cortina
      .getAnimations()
      .find((a) => a instanceof CSSAnimation && a.animationName === "intro-cortina");
    if (!subida || subida.playState === "finished") encerrar();

    return () => {
      soltarPulo();
      cortina.removeEventListener("animationend", aoTerminarAnimacao);
    };
  }, []);

  return null;
}
