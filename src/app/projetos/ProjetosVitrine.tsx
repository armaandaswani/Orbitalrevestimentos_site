"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import LugarCard from "@/components/projetos/LugarCard";
import RenderCard from "@/components/projetos/RenderCard";
import ChamadaProjeto from "@/components/projetos/ChamadaProjeto";
import Revelar from "@/components/projetos/Revelar";
import VisorProjetos, { useVisor } from "@/components/projetos/VisorProjetos";
import { modelosTxt } from "@/lib/projeto-modelos";
import {
  CATEGORIA_SHOWROOM, REVENDA_RESERVA, combinaBusca, nomeLugar, ordenarCategorias, porDestaque, rotuloTag, secoesDoProjeto,
  type Showroom,
} from "@/lib/projetos-tipos";
import type { DadosProjetos } from "@/lib/projetos-dados";

/**
 * Página de Projetos: os projetos primeiro, numa grade vertical, sem nenhuma
 * rolagem de lado. Em cima, uma barra presa sob o cabeçalho com as categorias
 * e a busca; embaixo, onde ver o PFB ao vivo, as simulações de IA e o
 * próximo passo.
 *
 * O VisorProjetos abre a galeria e o showroom por cima da página (estado na
 * URL, voltar fecha, a rolagem fica onde estava). Os dados chegam prontos do
 * servidor (page.tsx); aqui ficam o filtro e a busca.
 */

/** Quantos cartões aparecem de cada vez: a lista cresce só quando pedem. */
const POR_VEZ = 12;
/** 2 colunas no celular, 3 até 1279 px, 4 daí em diante (contêiner de 80rem). */
const COLUNAS = "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 lg:gap-x-6 lg:gap-y-10";
const SIZES_GRADE = "(max-width: 639px) 46vw, (max-width: 1279px) 31vw, 340px";

export default function ProjetosVitrine({ projetos, categorias, lugares, renders, agora }: DadosProjetos & { agora: number }) {
  const showrooms = lugares.filter((l) => l.kind === "showroom");
  const revendasBanco = lugares.filter((l) => l.kind === "revenda");
  // Parceiros: os showrooms (para o arquiteto ver ao vivo) e o canal de revenda.
  const parceiros = [...showrooms, ...(revendasBanco.length > 0 ? revendasBanco : REVENDA_RESERVA)];
  return (
    <VisorProjetos projetos={projetos} lugares={parceiros} base="/projetos">
      <Conteudo projetos={projetos} categorias={categorias} parceiros={parceiros} showrooms={showrooms} renders={renders} agora={agora} />
    </VisorProjetos>
  );
}

function Conteudo({
  projetos, categorias, parceiros, showrooms, renders, agora,
}: Omit<DadosProjetos, "lugares"> & { parceiros: Showroom[]; showrooms: Showroom[]; agora: number }) {
  const visor = useVisor();
  const [categoria, setCategoria] = useState("todos");
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState(POR_VEZ);
  const [mostrarRenders, setMostrarRenders] = useState(POR_VEZ);
  // A grade só esmaece na troca de categoria, nunca ao carregar (não atrasa a primeira foto).
  const [trocou, setTrocou] = useState(false);
  const topo = useRef<HTMLDivElement>(null);
  const grade = useRef<HTMLUListElement>(null);
  const focarEm = useRef<number | null>(null);

  // Ambientes da categoria Showroom moram na folha do showroom; o resto são as obras.
  // Destaques primeiro, depois a ordem do painel (os mais recentes no topo).
  const obras = useMemo(
    () => projetos.filter((p) => !(showrooms.length > 0 && secoesDoProjeto(p).includes(CATEGORIA_SHOWROOM))).sort(porDestaque),
    [projetos, showrooms.length],
  );
  const rotulos = useMemo(() => ordenarCategorias(categorias), [categorias]);
  // Só as categorias que têm obra: um filtro que daria zero não aparece.
  const cats = useMemo(() => rotulos
    .filter((c) => c.slug !== CATEGORIA_SHOWROOM || showrooms.length === 0)
    .filter((c) => obras.some((p) => secoesDoProjeto(p).includes(c.slug))), [rotulos, showrooms.length, obras]);

  // Linha discreta do cartão (modelo · lugar) e o texto em que a busca procura.
  // Lugar: o parceiro onde o ambiente está ou, sem parceiro, a categoria.
  const fichas = useMemo(() => {
    const nomes = new Map(showrooms.map((s) => [s.id, nomeLugar(s.name)]));
    const rotulo = new Map(rotulos.map((c) => [c.slug, c.label]));
    return new Map(obras.map((p) => {
      const secoes = secoesDoProjeto(p);
      const lugar = (p.showroom_id && nomes.get(p.showroom_id)) || rotulo.get(secoes[0]) || "";
      const codigos = modelosTxt(p);
      const texto = [
        p.title, codigos, lugar, ...secoes.map((s) => rotulo.get(s) ?? s),
        ...(p.tags ?? []).flatMap((t) => [t, rotuloTag(t)]), p.projeto_de ?? "",
      ].join(" ");
      return [p.id, { detalhe: [codigos, lugar].filter(Boolean).join(" · "), texto }];
    }));
  }, [obras, showrooms, rotulos]);

  // Filtro e busca valem para todas as obras, não só para as que já estão na tela.
  const filtradas = useMemo(() => obras
    .filter((p) => categoria === "todos" || secoesDoProjeto(p).includes(categoria))
    .filter((p) => !busca.trim() || combinaBusca(fichas.get(p.id)?.texto ?? p.title, busca)),
  [obras, categoria, busca, fichas]);
  const visiveis = filtradas.slice(0, mostrar);
  const faltam = filtradas.length - visiveis.length;

  // "Ver mais": o foco vai para o primeiro cartão novo (quem usa teclado continua dali).
  useEffect(() => {
    const i = focarEm.current;
    if (i == null) return;
    focarEm.current = null;
    grade.current?.children[i]?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
  }, [mostrar]);

  // Mudou o filtro com a grade já rolada: volta ao começo dela, logo abaixo da barra.
  const voltarAoTopo = () => {
    const y = topo.current?.getBoundingClientRect().top ?? 0;
    if (y >= 0) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: window.scrollY + y - 80, behavior: reduzido ? "auto" : "smooth" });
  };
  const escolher = (slug: string) => {
    if (slug === categoria) return;
    setCategoria(slug);
    setMostrar(POR_VEZ);
    setTrocou(true);
    voltarAoTopo();
  };
  const buscar = (texto: string) => {
    setBusca(texto);
    setMostrar(POR_VEZ);
    voltarAoTopo();
  };
  const limpar = () => {
    setBusca("");
    setCategoria("todos");
    setMostrar(POR_VEZ);
  };
  const conta = `${filtradas.length} ${filtradas.length === 1 ? "projeto" : "projetos"}`;

  const chip = (ativo: boolean) =>
    `relative h-8 lg:h-9 px-3 lg:px-3.5 text-[0.8125rem] font-medium border transition-colors after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0] ${
      ativo ? "bg-primary border-primary text-white" : "bg-white border-[#d5d8de] text-primary hover:border-primary"
    }`;

  return (
    <div className="pt-20">
      {/* ── Projetos: título, barra presa e grade ─────────────────────────── */}
      <section id="obras" aria-labelledby="projetos-titulo" className="scroll-mt-20 bg-white pb-[clamp(3.5rem,2rem+4.5vw,6rem)]">
        <div className="ds-wrap pt-[clamp(2rem,1.25rem+2.5vw,3.75rem)] pb-5 lg:pb-7">
          <h1 id="projetos-titulo" className="font-serif text-primary text-t1 font-normal tracking-[-0.02em]">Projetos</h1>
          <p className="text-on-surface-variant text-lead mt-3 max-w-2xl text-pretty">
            Obras entregues em Manaus com o Painel Flexível em Fibra de Bambu.
          </p>
        </div>

        <div ref={topo} aria-hidden />
        {/* Presa logo abaixo do cabeçalho enquanto a grade está na tela; quando ele se recolhe, sobe junto. */}
        <div className="ds-sob-cabecalho sticky z-40 bg-white border-y border-[#e8e6e1]" data-barra-projetos>
          <div className="ds-wrap py-2.5 lg:py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
            <div role="group" aria-label="Categoria" className="flex flex-wrap items-center gap-1.5 lg:flex-1">
              {[{ slug: "todos", label: "Todos" }, ...cats].map((c) => (
                <button key={c.slug} type="button" aria-pressed={categoria === c.slug} onClick={() => escolher(c.slug)} className={chip(categoria === c.slug)}>
                  {c.label}
                </button>
              ))}
              <p className="ml-auto pl-3 text-on-surface-variant text-[13px] tabular-nums whitespace-nowrap" aria-live="polite">{conta}</p>
            </div>
            <label className="relative flex items-center order-first lg:order-none lg:w-72">
              <span className="sr-only">Buscar projeto</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden
                className="absolute left-3 text-on-surface-variant pointer-events-none">
                <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
              </svg>
              <input type="search" value={busca} onChange={(e) => buscar(e.target.value)} placeholder="Buscar projeto"
                onKeyDown={(e) => { if (e.key === "Escape" && busca) { e.preventDefault(); buscar(""); } }}
                autoComplete="off" spellCheck={false} enterKeyHint="search"
                className="w-full h-10 pl-9 pr-10 bg-white border border-[#d5d8de] text-primary text-base lg:text-sm placeholder:text-on-surface-variant/80 outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary [&::-webkit-search-cancel-button]:appearance-none" />
              {busca && (
                <button type="button" onClick={() => buscar("")} aria-label="Limpar busca"
                  className="absolute right-0 h-10 w-10 flex items-center justify-center text-on-surface-variant hover:text-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="ds-wrap pt-6 lg:pt-8">
          {filtradas.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-serif text-primary text-t3">Nenhum projeto encontrado</p>
              <p className="text-on-surface-variant text-legenda mt-2">Tente outra palavra, um código como ORB-003 ou outra categoria.</p>
              <button type="button" onClick={limpar} className="ds-botao ds-botao-vazado mt-6">Limpar busca</button>
            </div>
          ) : (
            <ul ref={grade} key={categoria} className={`${COLUNAS} ${trocou ? "mv-veu" : ""}`} data-grade-projetos>
              {visiveis.map((p, i) => (
                <li key={p.id}>
                  <ProjetoCard projeto={p} detalhe={fichas.get(p.id)?.detalhe ?? ""} sizes={SIZES_GRADE} prioridade={i < 2}
                    href={visor?.hrefProjeto(p) ?? `/projetos?projeto=${p.slug}`}
                    onAbrir={visor ? (x) => visor.abrirProjeto(x, filtradas) : undefined} />
                </li>
              ))}
            </ul>
          )}
          {faltam > 0 && (
            <div className="mt-10 lg:mt-12 flex justify-center">
              <button type="button" onClick={() => { focarEm.current = visiveis.length; setMostrar((m) => m + POR_VEZ); }}
                className="ds-botao ds-botao-vazado min-h-12 w-full sm:w-auto">
                Ver mais projetos
              </button>
            </div>
          )}
          <p className="text-on-surface-variant text-legenda mt-10 lg:mt-12 text-pretty">
            Imagens reais de projetos executados. A Orbital não realiza instalação; somos fornecedores diretos.
          </p>
        </div>
      </section>

      {/* ── Onde ver o PFB: showrooms parceiros e revenda ─────────────────── */}
      <section id="parceiros" aria-labelledby="parceiros-titulo" className="scroll-mt-20 bg-[#F6F5F2] border-b border-[#e8e6e1]">
        {/* Âncoras antigas (#showrooms, #revenda) continuam levando para cá. */}
        <span id="showrooms" className="block scroll-mt-20" aria-hidden />
        <span id="revenda" className="block scroll-mt-20" aria-hidden />
        <div className="ds-wrap py-[clamp(3rem,2rem+3vw,5rem)]">
          <Revelar className="max-w-2xl mb-[clamp(1.5rem,1rem+1.5vw,2.5rem)]">
            <h2 id="parceiros-titulo" className="font-serif text-primary text-t2 font-normal tracking-[-0.02em] text-balance">Onde ver o PFB</h2>
            <p className="text-on-surface-variant text-lead mt-3 text-pretty">
              Ambientes decorados com o PFB nos showrooms parceiros, e todos os modelos em display na Casa do Eletricista.
            </p>
          </Revelar>
          <Revelar efeito="surge">
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
              {parceiros.map((s) => (
                <li key={s.id}>
                  <LugarCard compacto lugar={s} agora={agora} onAbrir={visor ? (l) => visor.abrirShowroom(l) : undefined} />
                </li>
              ))}
            </ul>
          </Revelar>
          <p className="text-on-surface-variant text-legenda mt-6 text-pretty">
            Prefere ver no seu escritório? Um consultor leva as amostras até você: é só pedir pelo pré-contato.
          </p>
        </div>
      </section>

      {/* ── Simulações de IA ───────────────────────────────────────────────── */}
      {renders.length > 0 && (
        <section id="inspiracoes" aria-labelledby="simulacoes-titulo" className="scroll-mt-20 ds-escuro bg-primary">
          <div className="ds-wrap py-[clamp(3rem,2rem+3vw,5rem)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-[clamp(1.5rem,1rem+1.5vw,2.5rem)]">
              <div className="max-w-2xl">
                <h2 id="simulacoes-titulo" className="font-serif text-white text-t2 font-normal tracking-[-0.02em]">Simulações</h2>
                <p className="text-white/75 text-lead mt-3 text-pretty">Como o PFB fica em outros tipos de ambiente.</p>
                <p className="text-white/60 text-legenda mt-2">Imagens geradas por inteligência artificial, para fins ilustrativos.</p>
              </div>
              <Link href="/visualizador" className="ds-botao ds-botao-linha self-start md:self-auto">
                Simular no meu ambiente
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
            <ul className={COLUNAS}>
              {renders.slice(0, mostrarRenders).map((r) => <li key={r.id}><RenderCard render={r} sizes={SIZES_GRADE} /></li>)}
            </ul>
            {renders.length > mostrarRenders && (
              <div className="mt-10 lg:mt-12 flex justify-center">
                <button type="button" onClick={() => setMostrarRenders((m) => m + POR_VEZ)} className="ds-botao ds-botao-linha min-h-12 w-full sm:w-auto">
                  Ver mais simulações
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <ChamadaProjeto />
    </div>
  );
}
