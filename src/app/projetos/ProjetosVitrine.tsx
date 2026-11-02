"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GrupoChips from "@/components/projetos/GrupoChips";
import GradeProjetos from "@/components/projetos/GradeProjetos";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import SecaoCabecalho from "@/components/projetos/SecaoCabecalho";
import Trilho from "@/components/projetos/Trilho";
import LugarCard from "@/components/projetos/LugarCard";
import AntesDepois from "@/components/projetos/AntesDepois";
import RenderCard from "@/components/projetos/RenderCard";
import ChamadaProjeto from "@/components/projetos/ChamadaProjeto";
import Revelar from "@/components/projetos/Revelar";
import VisorProjetos, { useVisor } from "@/components/projetos/VisorProjetos";
import Capitulo from "@/components/ds/Capitulo";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import {
  CATEGORIA_SHOWROOM, OBRAS_ENTREGUES, REVENDA_RESERVA, ordenarCategorias, porDestaque, rotuloTag, secoesDoProjeto,
  type Projeto, type Showroom,
} from "@/lib/projetos-tipos";
import type { DadosProjetos } from "@/lib/projetos-dados";

/**
 * Página de Projetos como uma apresentação contínua, em capítulos:
 * 01 Onde ver (todos os parceiros no topo) → 02 Obras → 03 Transformação →
 * 04 Simulações → 05 Próximo passo. O ProgressoCapitulos marca onde o
 * visitante está; o VisorProjetos abre showroom e galeria por cima da página
 * (estado na URL, voltar fecha, a rolagem fica onde estava).
 *
 * Os dados chegam prontos do servidor (page.tsx); aqui ficam os filtros.
 */

/** Largura de um cartão de obra dentro da linha, por faixa de tela. */
const LARGURA_OBRA = "w-[44%] sm:w-[30%] lg:w-[23.5%]";
const SIZES_OBRA = "(max-width: 639px) 44vw, (max-width: 1023px) 30vw, (max-width: 1920px) 300px, 16vw";

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
  const abrir = (p: Projeto, lista?: Projeto[]) => visor?.abrirProjeto(p, lista);
  const href = (p: Projeto) => visor?.hrefProjeto(p) ?? `/projetos?projeto=${p.slug}`;
  const [categoria, setCategoria] = useState("todos");
  const [tag, setTag] = useState("todos");

  // Ambientes da categoria Showroom moram na folha do showroom; o resto são as obras.
  const obras = useMemo(
    () => projetos.filter((p) => !(showrooms.length > 0 && secoesDoProjeto(p).includes(CATEGORIA_SHOWROOM))),
    [projetos, showrooms.length],
  );
  const cats = ordenarCategorias(categorias).filter((c) => c.slug !== CATEGORIA_SHOWROOM || showrooms.length === 0);
  const conta = (slug: string) => obras.filter((p) => secoesDoProjeto(p).includes(slug)).length;
  const tags = [...new Set(obras.flatMap((p) => p.tags ?? []))].sort((a, b) => rotuloTag(a).localeCompare(rotuloTag(b), "pt-BR"));
  const filtradas = obras
    .filter((p) => categoria === "todos" || secoesDoProjeto(p).includes(categoria))
    .filter((p) => tag === "todos" || (p.tags ?? []).includes(tag))
    .sort(porDestaque);

  const blocos = (() => {
    // Cada projeto entra na PRIMEIRA categoria em que se encaixa: nada repete.
    const vistos = new Set<string>();
    const out = cats.map((cat) => {
      const lista = obras.filter((p) => !vistos.has(p.id) && secoesDoProjeto(p).includes(cat.slug)).sort(porDestaque);
      lista.forEach((p) => vistos.add(p.id));
      return { slug: cat.slug, titulo: cat.label, texto: cat.description ?? "", lista, filtravel: true };
    });
    const resto = obras.filter((p) => !vistos.has(p.id)).sort(porDestaque);
    if (resto.length) out.push({ slug: "outros", titulo: "Outros projetos", texto: "Demais ambientes executados", lista: resto, filtravel: false });
    return out.filter((b) => b.lista.length > 0);
  })();

  const verCategoria = (slug: string) => {
    setCategoria(slug);
    setTag("todos");
    document.getElementById("obras")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div className="pt-20">
      <ProgressoCapitulos />

      {/* ── 01 Onde ver: todos os parceiros de uma vez, no topo ─────────────── */}
      <Capitulo id="parceiros" numero="01" rotulo="Onde ver" rotuladoPor="parceiros-titulo" className="bg-[#F6F5F2] border-b border-[#e8e6e1]">
        {/* Âncoras antigas (#showrooms, #revenda) continuam levando para cá. */}
        <span id="showrooms" className="block scroll-mt-36" aria-hidden />
        <span id="revenda" className="block scroll-mt-36" aria-hidden />
        <div className="ds-wrap pt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] pb-[clamp(2.5rem,1.5rem+3vw,4.5rem)]">
          <div className="max-w-2xl mb-[clamp(1.5rem,1rem+1.5vw,2.5rem)]">
            <h1 id="parceiros-titulo" className="font-serif text-primary text-t1 font-normal tracking-[-0.02em] text-balance">
              <span className="sr-only">Orbital Revestimentos: showrooms e projetos em Manaus. </span>
              Veja o PFB de perto.
            </h1>
            <p className="text-on-surface-variant text-lead mt-3 text-pretty">
              Ambientes decorados com o Painel Flexível em Fibra de Bambu (PFB) nos showrooms parceiros, e todos os modelos em display na Casa do Eletricista.
            </p>
          </div>
          {/* Sem animação de entrada: é o topo da página. */}
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {parceiros.map((s) => (
              <li key={s.id}>
                <LugarCard compacto lugar={s} agora={agora} onAbrir={visor ? (l) => visor.abrirShowroom(l) : undefined} />
              </li>
            ))}
          </ul>
          <p className="text-on-surface-variant text-legenda mt-6 text-pretty">
            Prefere ver no seu escritório? Um consultor leva as amostras até você: é só pedir pelo pré-contato.
          </p>
        </div>
      </Capitulo>

      {/* ── 02 Obras ───────────────────────────────────────────────────────── */}
      <Capitulo id="obras" numero="02" rotulo="Obras" rotuladoPor="obras-titulo" className="ds-secao bg-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="obras-titulo" numero="02" sobretitulo="Obras realizadas" titulo="Projetos executados"
              texto={`${OBRAS_ENTREGUES} obras entregues em Manaus. Deslize cada linha e toque em um projeto para ver todas as fotos.`} />
          </Revelar>
          <div className="space-y-2 mb-8">
            <GrupoChips rotulo="Categoria" ativo={categoria} onMudar={setCategoria}
              opcoes={[{ valor: "todos", rotulo: "Todas" }, ...cats.filter((c) => conta(c.slug) > 0).map((c) => ({ valor: c.slug, rotulo: c.label, conta: conta(c.slug) }))]} />
            {tags.length > 0 && (
              <GrupoChips rotulo="Tipo" ativo={tag} onMudar={setTag}
                opcoes={[{ valor: "todos", rotulo: "Todos" }, ...tags.map((t) => ({ valor: t, rotulo: rotuloTag(t) }))]} />
            )}
          </div>

          {categoria === "todos" && tag === "todos" ? (
            <div className="space-y-10 lg:space-y-12">
              {blocos.map((b) => (
                <Revelar key={b.slug}>
                  <div className="flex items-end justify-between gap-4 mb-4 pb-3 border-b border-surface-variant">
                    <div className="min-w-0">
                      <h3 className="font-serif text-primary text-t3 font-normal">{b.titulo}</h3>
                      {b.texto && <p className="text-on-surface-variant text-legenda mt-0.5">{b.texto}</p>}
                    </div>
                    {b.filtravel && b.lista.length > 1 && (
                      <button type="button" onClick={() => verCategoria(b.slug)}
                        className="flex-shrink-0 min-h-11 px-1 text-primary text-xs tracking-[0.12em] uppercase font-bold underline-offset-4 hover:underline">
                        Ver todos ({b.lista.length})
                      </button>
                    )}
                  </div>
                  <Trilho rotulo={`Projetos: ${b.titulo}`} largura={LARGURA_OBRA}>
                    {b.lista.map((p) => <ProjetoCard key={p.id} projeto={p} onAbrir={(x) => abrir(x, b.lista)} href={href(p)} sizes={SIZES_OBRA} />)}
                  </Trilho>
                </Revelar>
              ))}
              {blocos.length === 0 && <p className="text-on-surface-variant text-corpo">Os projetos aparecem aqui em breve.</p>}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-on-surface-variant text-corpo">Nenhum projeto com esses filtros.</p>
              <button type="button" onClick={() => { setCategoria("todos"); setTag("todos"); }}
                className="mt-3 min-h-11 px-4 text-primary text-sm font-semibold underline underline-offset-2">Ver todos</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-on-surface-variant text-legenda" aria-live="polite">
                  {filtradas.length} {filtradas.length === 1 ? "projeto" : "projetos"}
                </p>
                <button type="button" onClick={() => { setCategoria("todos"); setTag("todos"); }}
                  className="min-h-11 px-1 text-primary text-xs tracking-[0.12em] uppercase font-bold underline-offset-4 hover:underline">
                  Todas as categorias
                </button>
              </div>
              <GradeProjetos projetos={filtradas} onAbrir={(x) => abrir(x, filtradas)} href={href} />
            </>
          )}
          <p className="text-on-surface-variant text-corpo italic text-center mt-10">
            Imagens reais de projetos executados. A Orbital não realiza instalação; somos fornecedores diretos.
          </p>
        </div>
      </Capitulo>

      {/* ── 03 Transformação ───────────────────────────────────────────────── */}
      <Capitulo id="transformacao" numero="03" rotulo="Antes e depois" rotuladoPor="transformacao-titulo" escuro className="ds-secao bg-[#090e18]">
        <div className="ds-wrap max-w-[72rem]">
          <Revelar>
            <SecaoCabecalho id="transformacao-titulo" numero="03" escuro sobretitulo="Transformação real" titulo="A diferença é visível."
              texto="Arraste a divisória para comparar o mesmo lavabo antes e depois do PFB." />
          </Revelar>
          <AntesDepois
            antes={{ src: "/images/academia/lavabo-consultorio-antes.jpg", alt: "Lavabo de consultório antes do PFB" }}
            depois={{ src: "/images/academia/lavabo-consultorio-depois.jpg", alt: "Lavabo de consultório depois, com PFB acabamento mármore e forro amadeirado" }} />
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-5">
            <div>
              <p className="text-secondary text-sobre tracking-[0.14em] uppercase font-semibold">Mármore nas paredes · Forro amadeirado</p>
              <p className="text-white/75 text-legenda mt-1">Lavabo de consultório · Comercial · Manaus, AM</p>
            </div>
            <p className="text-white/70 text-legenda italic">Sem obra pesada · Sem poeira</p>
          </div>
        </div>
      </Capitulo>

      {/* ── 04 Simulações de IA ────────────────────────────────────────────── */}
      <Capitulo id="inspiracoes" numero="04" rotulo="Simulações" rotuladoPor="inspiracoes-titulo" escuro className="ds-secao bg-primary">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="inspiracoes-titulo" numero="04" escuro sobretitulo="Possibilidades · Simulações de IA" titulo="O Orbital no seu espaço."
              texto="Imagens geradas por inteligência artificial, para fins ilustrativos, mostrando o PFB em diferentes ambientes."
              acao={
                <Link href="/visualizador" className="ds-botao ds-botao-linha">
                  Simular no meu ambiente
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              } />
          </Revelar>
          <Revelar>
            <Trilho rotulo="Simulações de IA" escuro largura="w-[44%] sm:w-[30%] lg:w-[18.6%]">
              {renders.map((r) => <RenderCard key={r.id} render={r} />)}
            </Trilho>
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 05 Próximo passo ───────────────────────────────────────────────── */}
      <ChamadaProjeto numero="05" />
    </div>
  );
}
