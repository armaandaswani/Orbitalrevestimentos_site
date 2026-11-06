"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import LugarCard from "@/components/projetos/LugarCard";
import RenderCard from "@/components/projetos/RenderCard";
import ChamadaProjeto from "@/components/projetos/ChamadaProjeto";
import Revelar from "@/components/projetos/Revelar";
import ContatoCta from "@/components/ContatoCta";
import VisorProjetos, { useVisor } from "@/components/projetos/VisorProjetos";
import { modelosTxt } from "@/lib/projeto-modelos";
import {
  CATEGORIA_SHOWROOM, REVENDA_RESERVA, combinaBusca, nomeLugar, ordenarCategorias, porDestaque, rotuloTag, secoesDoProjeto,
  type Projeto, type Showroom,
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
const SIZES_GRADE = "(max-width: 639px) 46vw, (max-width: 1279px) 31vw, (min-width: 1921px) 21vw, 340px";
/** Foco por teclado nunca fica sob a barra presa: cabeçalho (5rem) + altura medida da barra.
    No li vale para o link do cartão (o filho que recebe o foco): scroll-margin não passa de pai para filho. */
const SOB_A_BARRA = "scroll-mt-[calc(5rem+var(--barra-projetos,0px))]";
const SOB_A_BARRA_FILHO = "*:scroll-mt-[calc(5rem+var(--barra-projetos,0px))]";
/** Data de cadastro em ms; sem data, 0 (fica a ordem do painel). */
const cadastro = (p: Projeto) => Date.parse(p.created_at ?? "") || 0;

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
  // A URL (?categoria=, ?ver=) só é escrita depois de lida no carregamento.
  const [lido, setLido] = useState(false);
  const secao = useRef<HTMLElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const inicioGrade = useRef<HTMLDivElement>(null);
  const grade = useRef<HTMLUListElement>(null);
  const focarEm = useRef<number | null>(null);
  const listaRenders = useRef<HTMLUListElement>(null);
  const focarRender = useRef<number | null>(null);

  // Ambientes da categoria Showroom moram na folha do showroom; o resto são as obras.
  // Destaques primeiro; depois os mais recentes pela data de cadastro (sem data, a ordem do painel).
  const [obras, ambientes] = useMemo(() => {
    const doShowroom = (p: Projeto) => showrooms.length > 0 && secoesDoProjeto(p).includes(CATEGORIA_SHOWROOM);
    const ordem = (a: Projeto, b: Projeto) => porDestaque(a, b) || cadastro(b) - cadastro(a);
    return [projetos.filter((p) => !doShowroom(p)).sort(ordem), projetos.filter(doShowroom).sort(ordem)];
  }, [projetos, showrooms.length]);
  const semDados = obras.length === 0;
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
    return new Map([...obras, ...ambientes].map((p) => {
      const secoes = secoesDoProjeto(p);
      const lugar = (p.showroom_id && nomes.get(p.showroom_id)) || rotulo.get(secoes[0]) || "";
      const codigos = modelosTxt(p);
      const texto = [
        p.title, codigos, lugar, ...secoes.map((s) => rotulo.get(s) ?? s),
        ...(p.tags ?? []).flatMap((t) => [t, rotuloTag(t)]), p.projeto_de ?? "",
      ].join(" ");
      return [p.id, { detalhe: [codigos, lugar].filter(Boolean).join(" · "), texto }];
    }));
  }, [obras, ambientes, showrooms, rotulos]);

  // Filtro e busca valem para todas as obras, não só para as que já estão na tela.
  // Com algo digitado, a busca também acha os ambientes dos showrooms (depois das obras).
  const filtradas = useMemo(() => (busca.trim() ? [...obras, ...ambientes] : obras)
    .filter((p) => categoria === "todos" || secoesDoProjeto(p).includes(categoria))
    .filter((p) => !busca.trim() || combinaBusca(fichas.get(p.id)?.texto ?? p.title, busca)),
  [obras, ambientes, categoria, busca, fichas]);
  const visiveis = filtradas.slice(0, mostrar);
  const faltam = filtradas.length - visiveis.length;

  // "Ver mais": o foco vai para o primeiro cartão novo (quem usa teclado continua dali).
  useEffect(() => {
    const i = focarEm.current;
    if (i == null) return;
    focarEm.current = null;
    grade.current?.children[i]?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
  }, [mostrar]);
  useEffect(() => {
    const i = focarRender.current;
    if (i == null) return;
    focarRender.current = null;
    (listaRenders.current?.children[i] as HTMLElement | undefined)?.focus({ preventScroll: true });
  }, [mostrarRenders]);

  // Altura da barra presa em --barra-projetos: o scroll-margin dos cartões usa essa medida.
  useEffect(() => {
    const b = barra.current;
    const s = secao.current;
    if (!b || !s) return;
    const medir = () => s.style.setProperty("--barra-projetos", `${b.offsetHeight}px`);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(b);
    return () => ro.disconnect();
  }, [semDados]);

  // Link com ?categoria=<slug>&ver=<n>: abre já filtrado. Slug que não existe = Todos.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      const slug = q.get("categoria");
      if (slug && cats.some((c) => c.slug === slug)) setCategoria(slug);
      const ver = Number(q.get("ver"));
      if (Number.isInteger(ver) && ver > POR_VEZ) setMostrar(ver);
      setLido(true);
    }, 0);
    return () => clearTimeout(t);
  }, [cats]);

  // Categoria e "ver mais" espelhados na URL sem criar entrada no histórico. Mantém
  // o history.state (o visor guarda nele a profundidade) e os outros parâmetros
  // (?projeto=, ?showroom=). A busca não vai para a URL.
  useEffect(() => {
    if (!lido) return;
    const url = new URL(window.location.href);
    if (categoria === "todos") url.searchParams.delete("categoria");
    else url.searchParams.set("categoria", categoria);
    if (mostrar > POR_VEZ) url.searchParams.set("ver", String(mostrar));
    else url.searchParams.delete("ver");
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [lido, categoria, mostrar]);

  // Mudou o filtro com a grade já rolada: volta ao começo dela, logo abaixo da barra.
  // O limite é o real: altura do cabeçalho (que volta ao subir) mais a da barra.
  const voltarAoTopo = () => {
    const b = barra.current;
    const g = inicioGrade.current;
    if (!b || !g) return;
    const cabecalho = document.querySelector<HTMLElement>("header[data-site]")?.offsetHeight ?? 0;
    const limite = cabecalho + b.offsetHeight;
    const y = g.getBoundingClientRect().top;
    if (y >= limite) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: window.scrollY + y - limite, behavior: reduzido ? "auto" : "smooth" });
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
    campo.current?.focus();
  };
  const conta = `${filtradas.length} ${filtradas.length === 1 ? "projeto" : "projetos"}`;

  const chip = (ativo: boolean) =>
    `relative h-8 lg:h-9 px-3 lg:px-3.5 text-[0.8125rem] font-medium border transition-colors after:absolute after:inset-x-0 after:-inset-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0] ${
      ativo ? "bg-primary border-primary text-white" : "bg-white border-[#d5d8de] text-primary hover:border-primary"
    }`;

  return (
    <div className="pt-20">
      {/* ── Projetos: título, barra presa e grade ─────────────────────────── */}
      <section ref={secao} id="obras" aria-labelledby="projetos-titulo" className="scroll-mt-20 bg-white pb-[clamp(3.5rem,2rem+4.5vw,6rem)]">
        <div className="ds-wrap pt-[clamp(2rem,1.25rem+2.5vw,3.75rem)] pb-5 lg:pb-7">
          <h1 id="projetos-titulo" className="font-serif text-primary text-t1 font-normal tracking-[-0.02em]">Projetos</h1>
          <p className="text-on-surface-variant text-lead mt-3 max-w-2xl text-pretty">
            Obras entregues em Manaus com o Painel Flexível em Fibra de Bambu (PFB).
          </p>
        </div>

        {semDados ? (
          // Falha ao ler os projetos (o loader devolve lista vazia): sem barra, com uma saída.
          <div className="ds-wrap py-12 text-center" data-projetos-falha>
            <p className="text-primary text-lead text-pretty">Os projetos não carregaram agora. Recarregue a página em instantes.</p>
            <ContatoCta className="ds-botao ds-botao-vazado mt-6">Falar com um consultor</ContatoCta>
          </div>
        ) : (
          <>
            {/* Presa logo abaixo do cabeçalho enquanto a grade está na tela; quando ele se recolhe, sobe junto.
                No celular some junto com ele ao descer e volta ao subir. */}
            <div ref={barra} className="ds-sob-cabecalho ds-some-no-celular sticky z-40 bg-white border-y border-[#e8e6e1]" data-barra-projetos>
              <div className="ds-wrap py-2.5 lg:py-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
                <div className="flex items-start gap-3 lg:flex-1 min-w-0">
                  <div role="group" aria-label="Categoria" className="flex flex-wrap items-center gap-x-1.5 gap-y-2 flex-1 min-w-0">
                    {[{ slug: "todos", label: "Todos" }, ...cats].map((c) => (
                      <button key={c.slug} type="button" aria-pressed={categoria === c.slug} onClick={() => escolher(c.slug)} className={chip(categoria === c.slug)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p className="self-end shrink-0 h-8 lg:h-9 flex items-center text-on-surface-variant text-[13px] tabular-nums whitespace-nowrap" aria-live="polite">{conta}</p>
                </div>
                <label className="relative flex items-center order-first lg:order-none lg:w-72">
                  <span className="sr-only">Buscar projeto</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden
                    className="absolute left-3 text-on-surface-variant pointer-events-none">
                    <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
                  </svg>
                  <input ref={campo} type="search" name="busca" value={busca} onChange={(e) => buscar(e.target.value)} placeholder="Buscar projeto…"
                    onKeyDown={(e) => { if (e.key === "Escape" && busca) { e.preventDefault(); buscar(""); } }}
                    autoComplete="off" spellCheck={false} enterKeyHint="search"
                    className="w-full h-10 pl-9 pr-10 bg-white border border-[#d5d8de] text-primary text-base lg:text-sm placeholder:text-on-surface-variant/80 outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary [&::-webkit-search-cancel-button]:appearance-none" />
                  {busca && (
                    <button type="button" onClick={() => { buscar(""); campo.current?.focus(); }} aria-label="Limpar busca"
                      className="absolute right-0 h-10 w-10 flex items-center justify-center text-on-surface-variant hover:text-primary">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  )}
                </label>
              </div>
            </div>

            <div ref={inicioGrade} className="ds-wrap pt-6 lg:pt-8">
              {filtradas.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-serif text-primary text-t3">Nenhum projeto encontrado</p>
                  <p className="text-on-surface-variant text-legenda mt-2">Tente outra palavra, um código como ORB-003 ou outra categoria.</p>
                  <button type="button" onClick={limpar} className="ds-botao ds-botao-vazado mt-6">
                    {categoria === "todos" ? "Limpar busca" : "Limpar busca e filtro"}
                  </button>
                </div>
              ) : (
                <ul ref={grade} key={categoria} className={`${COLUNAS} ${trocou ? "mv-veu" : ""}`} data-grade-projetos>
                  {visiveis.map((p, i) => (
                    <li key={p.id} className={`${SOB_A_BARRA} ${SOB_A_BARRA_FILHO}`}>
                      <ProjetoCard projeto={p} detalhe={fichas.get(p.id)?.detalhe ?? ""} sizes={SIZES_GRADE} prioridade={i < 4}
                        href={visor?.hrefProjeto(p) ?? `/projetos?projeto=${p.slug}`}
                        onAbrir={visor ? (x) => visor.abrirProjeto(x, filtradas) : undefined} />
                    </li>
                  ))}
                </ul>
              )}
              {faltam > 0 && (
                <div className="mt-10 lg:mt-12 flex justify-center">
                  <button type="button" onClick={() => { focarEm.current = visiveis.length; setMostrar((m) => m + POR_VEZ); }}
                    className={`ds-botao ds-botao-vazado min-h-12 w-full sm:w-auto ${SOB_A_BARRA}`}>
                    Ver mais projetos
                  </button>
                </div>
              )}
              <p className="text-on-surface-variant text-legenda mt-10 lg:mt-12 text-pretty">
                Imagens reais de projetos executados. A Orbital não realiza instalação; somos fornecedores diretos.
              </p>
            </div>
          </>
        )}
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
            <ul ref={listaRenders} className={COLUNAS}>
              {/* tabIndex -1: "Ver mais simulações" leva o foco à primeira nova. */}
              {renders.slice(0, mostrarRenders).map((r) => (
                <li key={r.id} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <RenderCard render={r} sizes={SIZES_GRADE} />
                </li>
              ))}
            </ul>
            {renders.length > mostrarRenders && (
              <div className="mt-10 lg:mt-12 flex justify-center">
                <button type="button" onClick={() => { focarRender.current = mostrarRenders; setMostrarRenders((m) => m + POR_VEZ); }}
                  className="ds-botao ds-botao-linha min-h-12 w-full sm:w-auto">
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
