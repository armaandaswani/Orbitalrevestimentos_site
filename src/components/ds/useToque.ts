"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TRAVA_SEGURANCA } from "@/lib/movimento/introTempo";
import { relogio } from "@/lib/movimento/relogio";
import { criarToque, type EstadoToque, type Toque } from "@/lib/movimento/toque";

/**
 * Seção de uma tela que toca sozinha, como um vídeo. Escreve no elemento os
 * mesmos sinais do useProgresso (`--p`, `data-p10`, `data-ativo`), então o CSS
 * das seções que andavam pela rolagem continua valendo: só a fonte do --p muda.
 *
 * Toca quando pelo menos `limiar` da seção está na tela e a rolagem parou (o
 * encaixe da página terminou). Volta ao começo quando a seção sai da tela, para
 * tocar de novo na próxima chegada. Com movimento reduzido, fica no fim, parada.
 * `data-ativo` chega uma tela antes (margem de 100%), como no useProgresso com
 * margem, para o CSS ligar will-change e a seção decodificar imagens fora da vista.
 */
export function useToque<T extends HTMLElement>(duracaoMs: number, opcoes?: { limiar?: number }) {
  const ref = useRef<T>(null);
  const toqueRef = useRef<Toque | null>(null);
  const [estado, setEstado] = useState<EstadoToque>("parado");
  const limiar = opcoes?.limiar ?? 0.6;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const toque = criarToque(duracaoMs);
    toqueRef.current = toque;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)");
    let fracao = 0;
    let rolando = false;
    let parada = 0;

    const escrever = (p: number) => {
      el.style.setProperty("--p", p.toFixed(4));
      const decimo = String(Math.floor(p * 10));
      if (el.dataset.p10 !== decimo) el.dataset.p10 = decimo;
      if (el.dataset.toque !== toque.estado) el.dataset.toque = toque.estado;
      setEstado(toque.estado);
    };

    const assinante = {
      tick(dt: number) {
        const antes = toque.p;
        const p = toque.avancar(dt);
        if (p !== antes || el.dataset.toque !== toque.estado) escrever(p);
        return toque.estado === "tocando";
      },
    };
    const sair = relogio.assinar(assinante);

    // Na primeira visita a intro da órbita cobre a página (html[data-intro]):
    // tocar atrás dela esconderia o começo. O fim dela chama de novo.
    // Reserva: passada a trava de segurança da intro, toca mesmo sem o aviso.
    let esperaIntro = true;
    const fimDaEspera = window.setTimeout(() => { esperaIntro = false; talvezTocar(); }, TRAVA_SEGURANCA + 250);
    const naIntro = () => esperaIntro && document.documentElement.dataset.intro === "1";
    const talvezTocar = () => {
      if (reduzir.matches || rolando || naIntro() || toque.estado !== "parado" || fracao < limiar) return;
      toque.tocar();
      escrever(toque.p);
      relogio.acordar();
    };

    const aplicarReduzido = () => {
      if (reduzir.matches) {
        toque.terminar();
        escrever(1);
      } else {
        toque.zerar();
        escrever(0);
        talvezTocar();
      }
    };

    const io = new IntersectionObserver((entradas) => {
      fracao = entradas[entradas.length - 1].intersectionRatio;
      if (fracao < 0.15 && !reduzir.matches && toque.estado !== "parado") {
        toque.zerar();
        escrever(0);
      }
      talvezTocar();
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] });
    io.observe(el);

    const perto = new IntersectionObserver((entradas) => {
      if (entradas[entradas.length - 1].isIntersecting) el.dataset.ativo = "";
      else delete el.dataset.ativo;
    }, { rootMargin: "100% 0px" });
    perto.observe(el);

    // A rolagem parou: scrollend onde existe, 180 ms sem scroll como reserva.
    const rolou = () => {
      rolando = true;
      window.clearTimeout(parada);
      parada = window.setTimeout(parou, 180);
    };
    const parou = () => {
      window.clearTimeout(parada);
      rolando = false;
      talvezTocar();
    };
    const voltou = () => { if (!document.hidden) relogio.acordar(); };
    window.addEventListener("scroll", rolou, { passive: true });
    window.addEventListener("scrollend", parou);
    window.addEventListener("orbital:intro-fim", talvezTocar);
    document.addEventListener("visibilitychange", voltou);
    reduzir.addEventListener("change", aplicarReduzido);
    aplicarReduzido();

    return () => {
      sair();
      io.disconnect();
      perto.disconnect();
      window.clearTimeout(parada);
      window.clearTimeout(fimDaEspera);
      window.removeEventListener("scroll", rolou);
      window.removeEventListener("scrollend", parou);
      window.removeEventListener("orbital:intro-fim", talvezTocar);
      document.removeEventListener("visibilitychange", voltou);
      reduzir.removeEventListener("change", aplicarReduzido);
      delete el.dataset.ativo;
      toqueRef.current = null;
    };
  }, [duracaoMs, limiar]);

  /** Botão de pausa: pausa, continua ou, no fim, toca de novo. */
  const alternar = useCallback(() => {
    const toque = toqueRef.current;
    const el = ref.current;
    if (!toque || !el) return;
    if (toque.estado === "tocando") toque.pausar();
    else toque.tocar();
    el.style.setProperty("--p", toque.p.toFixed(4));
    el.dataset.toque = toque.estado;
    setEstado(toque.estado);
    relogio.acordar();
  }, []);

  /** Vai a um ponto do progresso e pausa ali (marcas do trilho). */
  const ir = useCallback((p: number) => {
    const toque = toqueRef.current;
    const el = ref.current;
    if (!toque || !el) return;
    toque.ir(p);
    el.style.setProperty("--p", toque.p.toFixed(4));
    el.dataset.p10 = String(Math.floor(toque.p * 10));
    el.dataset.toque = toque.estado;
    setEstado(toque.estado);
  }, []);

  return { ref, estado, alternar, ir };
}
