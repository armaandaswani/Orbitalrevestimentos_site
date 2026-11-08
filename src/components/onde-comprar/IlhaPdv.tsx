"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { trackFunnel, type FunnelEvent } from "@/lib/funnel";
import { lojaDaUrl, origemValida, type PontoDeVenda } from "@/lib/pontos-de-venda";
import { EVENTOS_DE_SAIDA } from "./apresentacao-pdv";
import FolhaPdv from "./FolhaPdv";

const nadaMuda = () => () => {};
const buscaDoCliente = () => window.location.search;
const buscaDoServidor = () => "";

/** Troca a busca da URL sem navegar nem rolar (o Next acompanha o replaceState nativo). */
function trocarBusca(params: URLSearchParams) {
  const busca = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${busca ? `?${busca}` : ""}${window.location.hash}`);
}

/**
 * A parte com JavaScript de /onde-comprar, bem pequena. Ao montar, lê `?loja=`
 * e `?origem=`, mede a abertura da página e tira a `origem` da URL; com loja
 * válida, a folha já nasce aberta. Um único ouvinte de clique no documento (a
 * lista é irmã desta ilha, não filha) abre a folha pelos links `?loja=` da
 * lista e dos pinos e mede os links de saída `[data-pdv-evento]`.
 *
 * Nada aqui rola a página (sem scrollIntoView nem scrollTo): a abertura da
 * Tarefa 8 sai ao primeiro scroll, e abrir pela URL não pode desligá-la.
 */
export default function IlhaPdv({ slugs, pontos }: { slugs: string[]; pontos: PontoDeVenda[] }) {
  // A loja da URL só existe no cliente: o servidor e a hidratação veem "" e a
  // folha aparece no render seguinte, sem divergir do HTML estático.
  const busca = useSyncExternalStore(nadaMuda, buscaDoCliente, buscaDoServidor);
  // undefined: o visitante ainda não escolheu nada e vale a loja da URL.
  const [escolhida, setEscolhida] = useState<string | null | undefined>(undefined);
  const aberta = escolhida !== undefined ? escolhida : lojaDaUrl(busca, slugs).slug;
  const ponto = aberta ? pontos.find((p) => p.slug === aberta) ?? null : null;

  // Abertura da página: mede uma vez e tira a origem da URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const { slug, invalida } = lojaDaUrl(window.location.search, slugs);
    trackFunnel("pdv_pagina_aberta", { origem: origemValida(params.get("origem")), loja_pre: slug });
    // Texto livre da URL só vai à medição se tiver cara de slug.
    if (invalida !== null) trackFunnel("pdv_loja_invalida", { loja: /^[a-z0-9-]{1,80}$/.test(invalida) ? invalida : "outro" });
    if (params.has("origem")) {
      params.delete("origem");
      trocarBusca(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura da página
  }, []);

  // Abertura por clique: só então a folha, o véu e os pinos animam (pelo link,
  // `?loja=`, tudo já aparece no lugar).
  const [animar, setAnimar] = useState(false);
  const abrir = useCallback((slug: string) => {
    document.querySelector("[data-pdv-mapa]")?.setAttribute("data-pdv-transicao", "");
    setAnimar(true);
    setEscolhida(slug);
    // Mantém utm_*, gclid e o resto; só a origem sai.
    const params = new URLSearchParams(window.location.search);
    params.set("loja", slug);
    params.delete("origem");
    trocarBusca(params);
  }, []);

  const fechar = useCallback(() => {
    setEscolhida(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("loja");
    trocarBusca(params);
  }, []);

  // Ouvinte único: mede as saídas e abre a folha pelos links ?loja=.
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target instanceof Element ? e.target : null;
      if (!alvo) return;
      const medido = alvo.closest<HTMLElement>("[data-pdv-evento]");
      if (medido) {
        const { pdvEvento, pdvLoja, pdvApp } = medido.dataset;
        if (pdvEvento && EVENTOS_DE_SAIDA.includes(pdvEvento)) {
          trackFunnel(pdvEvento as FunnelEvent, pdvApp ? { loja: pdvLoja ?? null, app: pdvApp } : { loja: pdvLoja ?? null }, { saida: true });
        }
        return;
      }
      const link = alvo.closest<HTMLAnchorElement>('a[href^="?loja="]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const { slug } = lojaDaUrl(link.getAttribute("href") ?? "", slugs);
      if (!slug) return;
      e.preventDefault();
      abrir(slug);
    };
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, [slugs, abrir]);

  // Pino da loja aberta em destaque; os outros esmaecem. A partir de `lg`, o
  // invólucro sticky do mapa sobe acima do véu enquanto a folha está aberta.
  useEffect(() => {
    document.querySelector("[data-pdv-mapa]")?.toggleAttribute("data-pdv-sobe", aberta !== null);
    const pinos = document.querySelectorAll<HTMLElement>("[data-pdv-pino]");
    pinos.forEach((el) => {
      const ativo = aberta !== null && el.dataset.pdvPino === aberta;
      el.toggleAttribute("data-pdv-ativo", ativo);
      el.toggleAttribute("data-pdv-apagado", aberta !== null && !ativo);
    });
  }, [aberta]);

  return ponto ? <FolhaPdv key={ponto.slug} ponto={ponto} onFechar={fechar} animar={animar} /> : null;
}
