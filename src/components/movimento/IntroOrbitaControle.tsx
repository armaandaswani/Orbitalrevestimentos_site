"use client";

import { useEffect } from "react";

/** Quando a cortina começa a subir na sequência normal (ms); igual ao atraso no CSS. */
const INICIO_CORTINA = 2300;

/**
 * Animações que formam a subida da cortina (o campo, a liberação do clique e
 * o conteúdo que sobe junto). Pular é adiantá-las para o começo da subida; as
 * faixas, o logotipo e a trava de segurança de 3,6 s seguem no tempo deles.
 */
const ANIMACOES_DA_CORTINA = new Set(["intro-cortina", "intro-solta", "intro-conteudo-sai"]);

/** Nome da animação CSS, ou null se não for uma (ou o navegador não tiver CSSAnimation). */
function nomeDaAnimacao(animacao: Animation): string | null {
  return typeof CSSAnimation !== "undefined" && animacao instanceof CSSAnimation
    ? animacao.animationName
    : null;
}

/**
 * Parte cliente da intro da órbita. Qualquer toque, clique ou tecla adianta a
 * sequência para a subida da cortina (nunca volta atrás se ela já subia).
 * Quando a cortina termina, desliga `data-intro` no <html> e avisa o resto do
 * site com o evento `orbital:intro-fim` em window (o hero se acomoda nele).
 * Se a hidratação chegar depois de a cortina já ter subido, fecha na hora.
 * Toda a parte de Web Animations fica em try/catch: navegador sem a API ou
 * qualquer erro encerra a intro (atributo desligado, evento uma vez) em vez
 * de quebrar o efeito; a trava CSS de 3,6 s continua valendo de todo jeito.
 * Não renderiza nada; sem intro na visita, não faz nada.
 */
export default function IntroOrbitaControle() {
  useEffect(() => {
    const raiz = document.documentElement;
    if (raiz.dataset.intro !== "1") return;
    const cortina = document.getElementById("intro-orbita");

    let encerrada = false;
    const soltarPulo = () => {
      window.removeEventListener("pointerdown", pular);
      window.removeEventListener("keydown", pular);
    };
    const encerrar = () => {
      if (encerrada) return;
      encerrada = true;
      soltarPulo();
      cortina?.removeEventListener("animationend", aoTerminarAnimacao);
      delete raiz.dataset.intro;
      window.dispatchEvent(new Event("orbital:intro-fim"));
    };

    const aoTerminarAnimacao = (e: AnimationEvent) => {
      if (e.target === cortina && e.animationName === "intro-cortina") encerrar();
    };

    function pular() {
      soltarPulo();
      try {
        for (const animacao of cortina!.getAnimations({ subtree: true })) {
          const nome = nomeDaAnimacao(animacao);
          if (!nome || !ANIMACOES_DA_CORTINA.has(nome)) continue;
          if (Number(animacao.currentTime ?? 0) < INICIO_CORTINA) animacao.currentTime = INICIO_CORTINA;
        }
      } catch {
        encerrar();
      }
    }

    try {
      if (!cortina || typeof cortina.getAnimations !== "function") throw new Error("sem Web Animations");
      cortina.addEventListener("animationend", aoTerminarAnimacao);
      window.addEventListener("pointerdown", pular, { passive: true });
      window.addEventListener("keydown", pular);

      // Cortina já terminada (hidratação lenta) ou sem animação (CSS de
      // movimento reduzido a escondeu): não há animationend por vir.
      const subida = cortina.getAnimations().find((a) => nomeDaAnimacao(a) === "intro-cortina");
      if (!subida || subida.playState === "finished") encerrar();
    } catch {
      encerrar();
    }

    return () => {
      soltarPulo();
      cortina?.removeEventListener("animationend", aoTerminarAnimacao);
    };
  }, []);

  return null;
}
