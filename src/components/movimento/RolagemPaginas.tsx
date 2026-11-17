"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { posicaoAoChegar, type Saida } from "@/lib/movimento/rolagem";

/** Áreas restritas (mesma lista da TransicaoPagina): o painel cuida da própria rolagem. */
const AREA_RESTRITA = /^\/(admin|parceiro|representante|o)(\/|$)/;

const rolar = (y: number) => window.scrollTo({ top: y, left: 0, behavior: "instant" });

/**
 * Toda página abre no topo (regra do dono, 17/11/2026). Voltar ou avançar pelo
 * navegador só devolve a posição se a pessoa saiu dela há pouco
 * (lib/movimento/rolagem › JANELA_VOLTA_MS); depois disso, topo também. Link
 * com âncora (#cadastro) fica com o navegador.
 *
 * A posição de cada caminho é guardada aqui e vale por cima da restauração do
 * navegador, que fica ligada: mudança só de query (?modelo=, ?projeto=) não
 * troca o caminho, não passa por aqui e segue com o navegador e com o
 * catálogo e os projetos (com "manual", fechar o modelo do catálogo voltava
 * 24 px fora do lugar).
 *
 * Também tira o encaixe da TechStone (html.ts-encaixe) antes da primeira
 * pintura da página nova, para o scroll-snap da página anterior não puxar a
 * nova até o rodapé; a Encaixe da página nova, se houver, liga de novo.
 */
export default function RolagemPaginas() {
  const caminho = usePathname() ?? "/";
  const anterior = useRef<string | null>(null);
  const yAtual = useRef(0);
  const saidas = useRef(new Map<string, Saida>());
  const historicoPara = useRef<string | null>(null);

  useEffect(() => {
    const rolou = () => {
      // A página que está na tela é a que foi pintada por último; a rolagem
      // que o Next faz ao trocar de rota não conta para a anterior.
      if (window.location.pathname === anterior.current) yAtual.current = window.scrollY;
    };
    const voltou = () => { historicoPara.current = window.location.pathname; };
    window.addEventListener("scroll", rolou, { passive: true });
    window.addEventListener("popstate", voltou);
    return () => {
      window.removeEventListener("scroll", rolou);
      window.removeEventListener("popstate", voltou);
    };
  }, []);

  useLayoutEffect(() => {
    const de = anterior.current;
    anterior.current = caminho;
    if (de === null || de === caminho) {
      yAtual.current = window.scrollY;
      return;
    }
    const agora = Date.now();
    saidas.current.set(de, { y: yAtual.current, em: agora });
    const historico = historicoPara.current === caminho;
    historicoPara.current = null;
    document.documentElement.classList.remove("ts-encaixe");
    if (AREA_RESTRITA.test(caminho)) return;

    const y = posicaoAoChegar({
      historico,
      ancora: window.location.hash.length > 1,
      saida: saidas.current.get(caminho) ?? null,
      agora,
    });
    if (y === null) return;
    yAtual.current = y;
    rolar(y);
    // A página pode crescer depois (fotos, dados): confere de novo e, voltando
    // a uma posição funda, espera a altura chegar até lá. Se a pessoa já mexeu
    // na página, a rolagem é dela.
    let tentativas = 0;
    let mexeu = false;
    const parar = () => { mexeu = true; };
    const conferir = () => {
      if (mexeu || Math.abs(window.scrollY - y) <= 2 || tentativas++ > 20) return;
      if (y === 0 || document.documentElement.scrollHeight - window.innerHeight >= y) rolar(y);
      raf = requestAnimationFrame(conferir);
    };
    let raf = requestAnimationFrame(conferir);
    const tarde = window.setTimeout(conferir, 300);
    const gestos = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    gestos.forEach((g) => window.addEventListener(g, parar, { passive: true }));
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(tarde);
      gestos.forEach((g) => window.removeEventListener(g, parar));
    };
  }, [caminho]);

  return null;
}
