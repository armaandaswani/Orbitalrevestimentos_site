"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ProjetoGaleria from "./ProjetoGaleria";
import ShowroomFolha from "./ShowroomFolha";
import type { Projeto, Showroom } from "@/lib/projetos-tipos";

/**
 * O "visor" da apresentação de Projetos: abre um showroom ou a galeria de um
 * projeto POR CIMA da página, sem trocar de página e sem perder o lugar.
 *
 * O estado mora na URL (?showroom=<slug> e/ou ?projeto=<slug>):
 * - abrir empurra uma entrada no histórico; o botão "voltar" do navegador (ou
 *   o gesto) fecha a folha e a página continua onde estava;
 * - fechar pelo X desfaz essa entrada (history.back) — a pilha não acumula;
 * - um link direto (?showroom=ornare, ?projeto=hall) abre a folha ao carregar
 *   e fechar volta para a URL limpa, sem sair da página;
 * - o ?projeto=<id> antigo, que o showroom mandava, continua valendo.
 *
 * Sem JavaScript, os cartões são links de verdade para a página do showroom
 * (/projetos/showroom/<slug>) e a galeria não existe: nada quebra.
 *
 * `base` é o caminho da página onde o visor vive. Na página de um showroom
 * (`fixo`), só a galeria abre por aqui; trocar de showroom é um link comum.
 */
interface Estado { showroom: string | null; projeto: string | null }

interface Visor {
  abrirProjeto: (p: Projeto, lista?: Projeto[]) => void;
  abrirShowroom: (s: Showroom) => void;
  hrefProjeto: (p: Projeto) => string;
  hrefShowroom: (s: Showroom) => string;
}

const VisorContext = createContext<Visor | null>(null);
export const useVisor = () => useContext(VisorContext);

function lerUrl(): Estado {
  const q = new URLSearchParams(window.location.search);
  return { showroom: q.get("showroom"), projeto: q.get("projeto") };
}

export default function VisorProjetos({
  projetos, lugares, base, fixo, children,
}: {
  projetos: Projeto[];
  lugares: Showroom[];
  base: string;
  fixo?: Showroom;
  children: React.ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>({ showroom: null, projeto: null });
  // Lista em que o projeto aberto está (linha da categoria, ambientes do showroom…): dá o anterior/próximo.
  const [lista, setLista] = useState<Projeto[]>(projetos);

  const showroom = useMemo(
    () => fixo ?? (estado.showroom ? lugares.find((s) => s.slug === estado.showroom) ?? null : null),
    [fixo, estado.showroom, lugares],
  );
  const ambientes = useMemo(() => (showroom ? projetos.filter((p) => p.showroom_id === showroom.id) : []), [showroom, projetos]);
  const projeto = useMemo(
    () => (estado.projeto ? projetos.find((p) => p.slug === estado.projeto || p.id === estado.projeto) ?? null : null),
    [estado.projeto, projetos],
  );

  // Ao navegar, parte da URL atual e só mexe em ?showroom= e ?projeto=: os outros
  // parâmetros da página (?categoria=, ?ver=) ficam. Os href desenhados partem de
  // `base`, iguais no servidor e no navegador (sem divergência na hidratação).
  const montarUrl = useCallback((e: Estado, atual?: string) => {
    const url = new URL(atual ?? base, "http://local");
    if (e.showroom && !fixo) url.searchParams.set("showroom", e.showroom);
    else url.searchParams.delete("showroom");
    if (e.projeto) url.searchParams.set("projeto", e.projeto);
    else url.searchParams.delete("projeto");
    return `${url.pathname}${url.search}`;
  }, [base, fixo]);

  const ir = useCallback((novo: Estado, modo: "push" | "replace") => {
    const atual = (window.history.state?.visor as number | undefined) ?? 0;
    const dados = { ...(window.history.state ?? {}), visor: modo === "push" ? atual + 1 : atual };
    window.history[modo === "push" ? "pushState" : "replaceState"](dados, "", montarUrl(novo, window.location.href));
    setEstado(novo);
  }, [montarUrl]);

  // Link direto ao carregar e botão voltar/avançar do navegador.
  useEffect(() => {
    const sincronizar = () => {
      const e = lerUrl();
      if (fixo) e.showroom = null;
      setEstado(e);
    };
    const t = setTimeout(sincronizar, 0);
    window.addEventListener("popstate", sincronizar);
    return () => { clearTimeout(t); window.removeEventListener("popstate", sincronizar); };
  }, [fixo]);

  const fechar = useCallback((ate: Estado) => {
    const profundidade = (window.history.state?.visor as number | undefined) ?? 0;
    if (profundidade > 0) window.history.back();
    else ir(ate, "replace");
  }, [ir]);

  const visor = useMemo<Visor>(() => ({
    hrefProjeto: (p) => montarUrl({ showroom: fixo ? null : estado.showroom, projeto: p.slug }),
    hrefShowroom: (s) => `/projetos/showroom/${s.slug}`,
    abrirProjeto: (p, l) => { setLista(l && l.includes(p) ? l : (showroom ? ambientes : projetos)); ir({ showroom: estado.showroom, projeto: p.slug }, "push"); },
    abrirShowroom: (s) => { ir({ showroom: s.slug, projeto: null }, "push"); },
  }), [montarUrl, fixo, estado.showroom, showroom, ambientes, projetos, ir]);

  // Projeto aberto por link direto ou pelo histórico: a lista é a do contexto em que ele está.
  const l = projeto && !lista.includes(projeto) ? (showroom ? ambientes : projetos) : lista;
  const pos = projeto ? l.indexOf(projeto) : -1;
  const vizinhos = projeto && pos >= 0 && l.length > 1 ? {
    anterior: l[(pos - 1 + l.length) % l.length],
    proximo: l[(pos + 1) % l.length],
    posicao: `${pos + 1} / ${l.length}`,
    onIr: (p: Projeto) => ir({ showroom: estado.showroom, projeto: p.slug }, "replace"),
  } : undefined;

  return (
    <VisorContext.Provider value={visor}>
      {children}
      {showroom && !fixo && (
        <ShowroomFolha
          lugar={showroom}
          ambientes={ambientes}
          todos={lugares}
          ativo={!projeto}
          onFechar={() => fechar({ showroom: null, projeto: null })}
          onIr={(s) => ir({ showroom: s.slug, projeto: null }, "replace")}
          onAbrirProjeto={(p) => visor.abrirProjeto(p, ambientes)}
          hrefProjeto={(p) => montarUrl({ showroom: showroom.slug, projeto: p.slug })}
        />
      )}
      {projeto && (
        <ProjetoGaleria key={projeto.id} projeto={projeto} vizinhos={vizinhos}
          onFechar={() => fechar({ showroom: fixo ? null : estado.showroom, projeto: null })} />
      )}
    </VisorContext.Provider>
  );
}
