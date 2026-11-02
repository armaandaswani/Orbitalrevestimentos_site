"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GrupoChips from "@/components/projetos/GrupoChips";
import GradeProjetos from "@/components/projetos/GradeProjetos";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import Mosaico from "@/components/projetos/Mosaico";
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
 * abertura → 01 Obras → 02 Transformação → 03 Onde ver (showrooms) →
 * 04 Simulações → 05 Próximo passo. O ProgressoCapitulos marca onde o
 * visitante está; o VisorProjetos abre showroom e galeria por cima da página
 * (estado na URL, voltar fecha, a rolagem fica onde estava).
 *
 * Os dados chegam prontos do servidor (page.tsx); aqui ficam os filtros.
 */

/** Largura de um cartão de obra dentro da linha, por faixa de tela. */
const LARGURA_OBRA = "w-[44%] sm:w-[30%] lg:w-[23.5%]";
const SIZES_OBRA = "(max-width: 639px) 44vw, (max-width: 1023px) 30vw, 300px";

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

  // Abertura: destaques do painel, depois os novos, depois o resto — 3 fotos diferentes.
  const abertura = useMemo(() => {
    const ordem = [...projetos].sort((a, b) => porDestaque(a, b) || Number(!!b.is_new) - Number(!!a.is_new));
    const vistas = new Set<string>();
    return ordem.filter((p) => !vistas.has(p.image_after) && vistas.add(p.image_after)).slice(0, 3);
  }, [projetos]);

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

      {/* ── Abertura: a coleção já começa aqui ─────────────────────────────── */}
      <section className="bg-[#001223] text-white ds-escuro">
        <div className="ds-wrap pt-10 pb-10 lg:py-16 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
          <div>
            <Sobretitulo escuro>Projetos · Parceiros</Sobretitulo>
            <h1 className="font-serif text-white text-t1 font-normal tracking-[-0.025em] mt-4 mb-4 text-balance">
              <span className="sr-only">Orbital Revestimentos: projetos em Manaus. </span>
              Veja o PFB de perto.
            </h1>
            <p className="text-white/75 text-lead max-w-xl text-pretty">
              Obras entregues em Manaus e ambientes decorados em empresas parceiras, para você ver o acabamento ao vivo.
            </p>
            <ul className="mt-7 grid grid-cols-2 gap-2 max-w-xs">
              {[
                { href: "#obras", n: OBRAS_ENTREGUES, r: "obras entregues" },
                { href: "#parceiros", n: String(parceiros.length), r: parceiros.length === 1 ? "parceiro" : "parceiros" },
              ].map((x) => (
                <li key={x.href}>
                  <a href={x.href} className="flex flex-col justify-center min-h-16 px-3 py-2 border border-white/20 hover:border-secondary hover:bg-white/5 transition-colors">
                    <span className="font-serif text-3xl leading-none">{x.n}</span>
                    <span className="text-white/75 text-sobre font-semibold mt-1.5">{x.r}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {/* Sem animação de entrada: a foto grande costuma ser o LCP da página. */}
          <Mosaico projetos={abertura} onAbrir={(p) => abrir(p, abertura)} href={href} />
        </div>
      </section>

      {/* ── 01 Obras ───────────────────────────────────────────────────────── */}
      <Capitulo id="obras" numero="01" rotulo="Obras" rotuladoPor="obras-titulo" className="ds-secao bg-background">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="obras-titulo" numero="01" sobretitulo="Obras realizadas" titulo="Projetos executados"
              texto="Ambientes reais revestidos com o Painel Flexível em Fibra de Bambu (PFB). Deslize cada linha e toque em um projeto para ver todas as fotos." />
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
          <p className="text-on-surface-variant text-legenda italic text-center mt-10">
            Imagens reais de projetos executados. A Orbital não realiza instalação; somos fornecedores diretos.
          </p>
        </div>
      </Capitulo>

      {/* ── 02 Transformação ───────────────────────────────────────────────── */}
      <Capitulo id="transformacao" numero="02" rotulo="Antes e depois" rotuladoPor="transformacao-titulo" escuro className="ds-secao bg-[#090e18]">
        <div className="ds-wrap max-w-[72rem]">
          <Revelar>
            <SecaoCabecalho id="transformacao-titulo" numero="02" escuro sobretitulo="Transformação real" titulo="A diferença é visível."
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

      {/* ── 03 Onde ver: showrooms + canal de revenda ──────────────────────── */}
      <Capitulo id="parceiros" numero="03" rotulo="Onde ver" rotuladoPor="parceiros-titulo" className="ds-secao bg-white">
        {/* Âncoras antigas (#showrooms, #revenda) continuam levando para cá. */}
        <span id="showrooms" className="block scroll-mt-36" aria-hidden />
        <span id="revenda" className="block scroll-mt-36" aria-hidden />
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="parceiros-titulo" numero="03" sobretitulo="Visite e veja de perto" titulo="Onde ver o PFB ao vivo"
              texto="Showrooms de empresas parceiras com ambientes decorados com o PFB, e a Casa do Eletricista com todos os modelos em display. Toque em um parceiro para ver os ambientes sem sair daqui." />
          </Revelar>
          <Revelar>
            <Trilho rotulo="Parceiros">
              {parceiros.map((s) => <LugarCard key={s.id} lugar={s} agora={agora} onAbrir={visor ? (l) => visor.abrirShowroom(l) : undefined} />)}
            </Trilho>
          </Revelar>
          <p className="text-on-surface-variant text-legenda mt-8 max-w-2xl text-pretty">
            Prefere ver no seu escritório? Um consultor leva as amostras até você: é só pedir pelo pré-contato.
          </p>
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
