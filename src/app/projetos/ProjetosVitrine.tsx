"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GrupoChips from "@/components/projetos/GrupoChips";
import GradeProjetos from "@/components/projetos/GradeProjetos";
import ProjetoGaleria from "@/components/projetos/ProjetoGaleria";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import IndiceSecoes from "@/components/projetos/IndiceSecoes";
import Mosaico from "@/components/projetos/Mosaico";
import Trilho from "@/components/projetos/Trilho";
import LugarCard from "@/components/projetos/LugarCard";
import AntesDepois from "@/components/projetos/AntesDepois";
import GradeRenders from "@/components/projetos/GradeRenders";
import ChamadaProjeto from "@/components/projetos/ChamadaProjeto";
import {
  CATEGORIA_SHOWROOM, REVENDA_RESERVA, ordenarCategorias, porDestaque, rotuloTag, secoesDoProjeto,
  type Projeto,
} from "@/lib/projetos-tipos";
import type { DadosProjetos } from "@/lib/projetos-dados";

/**
 * Página de Projetos, montada só com peças de src/components/projetos. Os
 * dados chegam prontos do servidor (page.tsx); aqui ficam os filtros e a
 * galeria, que dependem do visitante.
 *
 * Ordem: abertura com obras reais → índice → obras → antes × depois →
 * showrooms → revenda → simulações de IA → próximo passo.
 */

/** Quantos projetos cada categoria mostra antes do "Ver todos". */
const POR_CATEGORIA = 8;

export default function ProjetosVitrine({ projetos, categorias, lugares, renders, agora }: DadosProjetos & { agora: number }) {
  const [categoria, setCategoria] = useState("todos");
  const [tag, setTag] = useState("todos");
  const [aberto, setAberto] = useState<Projeto | null>(null);

  const showrooms = lugares.filter((l) => l.kind === "showroom");
  const revendasBanco = lugares.filter((l) => l.kind === "revenda");
  const revendas = revendasBanco.length > 0 ? revendasBanco : REVENDA_RESERVA;

  // Ambientes da categoria Showroom moram na página do showroom; o resto são as obras.
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

  // Link antigo vindo do showroom (?projeto=<id>): abre a galeria daquele ambiente.
  useEffect(() => {
    const quer = new URLSearchParams(window.location.search).get("projeto");
    if (!quer) return;
    const alvo = projetos.find((p) => p.id === quer || p.slug === quer);
    if (!alvo) return;
    const t = setTimeout(() => setAberto(alvo), 0);
    return () => clearTimeout(t);
  }, [projetos]);

  const indice = [
    { id: "obras", rotulo: "Obras", conta: obras.length },
    { id: "showrooms", rotulo: "Showrooms", conta: showrooms.length },
    { id: "revenda", rotulo: "Revenda", conta: revendas.length },
    { id: "inspiracoes", rotulo: "Simulações IA" },
  ];

  const blocos = (() => {
    // Cada projeto entra na PRIMEIRA categoria em que se encaixa: nada repete.
    const vistos = new Set<string>();
    const out = cats.map((cat) => {
      const lista = obras.filter((p) => !vistos.has(p.id) && secoesDoProjeto(p).includes(cat.slug)).sort(porDestaque);
      lista.forEach((p) => vistos.add(p.id));
      return { slug: cat.slug, titulo: cat.label, texto: cat.description ?? "", lista };
    });
    const resto = obras.filter((p) => !vistos.has(p.id)).sort(porDestaque);
    if (resto.length) out.push({ slug: "outros", titulo: "Outros projetos", texto: "Demais ambientes executados", lista: resto });
    return out.filter((b) => b.lista.length > 0);
  })();

  return (
    <div className="pt-20">
      {aberto && <ProjetoGaleria key={aberto.id} projeto={aberto} onFechar={() => setAberto(null)} />}

      {/* ── Abertura: a coleção já começa aqui ─────────────────────────────── */}
      <section className="bg-[#001223] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 pt-10 pb-10 lg:py-16 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
          <div>
            <Sobretitulo escuro>Projetos · Showrooms · Revenda</Sobretitulo>
            <h1 className="font-serif text-white text-4xl sm:text-5xl xl:text-[3.6rem] font-normal tracking-[-0.025em] leading-[1.04] mt-4 mb-4">
              <span className="sr-only">Orbital Revestimentos: projetos em Manaus. </span>
              Veja o PFB de perto.
            </h1>
            <p className="text-white/75 text-base lg:text-lg leading-relaxed max-w-xl">
              Obras entregues, ambientes decorados em empresas parceiras e pontos de revenda em Manaus.
            </p>
            <ul className="mt-7 grid grid-cols-3 gap-2 max-w-md">
              {[
                { href: "#obras", n: obras.length, r: obras.length === 1 ? "obra" : "obras" },
                { href: "#showrooms", n: showrooms.length, r: showrooms.length === 1 ? "showroom" : "showrooms" },
                { href: "#revenda", n: revendas.length, r: revendas.length === 1 ? "revenda" : "revendas" },
              ].map((x) => (
                <li key={x.href}>
                  <a href={x.href} className="flex flex-col justify-center min-h-16 px-2.5 sm:px-3 py-2 border border-white/20 hover:border-secondary hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-secondary">
                    <span className="font-serif text-2xl leading-none">{x.n}</span>
                    {/* Sem caixa alta espaçada: "showrooms" cabe na célula até em 320 px. */}
                    <span className="text-white/75 text-xs font-semibold mt-1.5">{x.r}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <Mosaico projetos={abertura} onAbrir={setAberto} />
        </div>
      </section>

      <IndiceSecoes itens={indice} />

      {/* ── Obras ──────────────────────────────────────────────────────────── */}
      <section id="obras" aria-labelledby="obras-titulo" className="scroll-mt-36 py-12 lg:py-20 bg-background">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <SecaoCabecalho id="obras-titulo" sobretitulo="Obras realizadas" titulo="Projetos executados"
            texto="Ambientes reais revestidos com o Painel Flexível Fibra de Bambu. Toque em um projeto para ver todas as fotos." />
          <div className="space-y-2 mb-8">
            <GrupoChips rotulo="Categoria" ativo={categoria} onMudar={setCategoria}
              opcoes={[{ valor: "todos", rotulo: "Todas" }, ...cats.filter((c) => conta(c.slug) > 0).map((c) => ({ valor: c.slug, rotulo: c.label, conta: conta(c.slug) }))]} />
            {tags.length > 0 && (
              <GrupoChips rotulo="Tipo" ativo={tag} onMudar={setTag}
                opcoes={[{ valor: "todos", rotulo: "Todos" }, ...tags.map((t) => ({ valor: t, rotulo: rotuloTag(t) }))]} />
            )}
          </div>

          {categoria === "todos" && tag === "todos" ? (
            <div className="space-y-12">
              {blocos.map((b) => (
                <div key={b.slug}>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-4 pb-3 border-b border-surface-variant">
                    <h3 className="font-serif text-primary text-2xl font-normal">{b.titulo}</h3>
                    {b.texto && <p className="text-on-surface-variant text-sm">{b.texto}</p>}
                  </div>
                  <GradeProjetos projetos={b.lista} onAbrir={setAberto} limite={POR_CATEGORIA} />
                </div>
              ))}
              {blocos.length === 0 && <p className="text-on-surface-variant text-base">Os projetos aparecem aqui em breve.</p>}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-on-surface-variant text-base">Nenhum projeto com esses filtros.</p>
              <button type="button" onClick={() => { setCategoria("todos"); setTag("todos"); }}
                className="mt-3 min-h-11 px-4 text-primary text-sm font-semibold underline underline-offset-2">Ver todos</button>
            </div>
          ) : (
            <>
              <p className="text-on-surface-variant text-sm mb-3" aria-live="polite">
                {filtradas.length} {filtradas.length === 1 ? "projeto" : "projetos"}
              </p>
              <GradeProjetos projetos={filtradas} onAbrir={setAberto} />
            </>
          )}
          <p className="text-on-surface-variant text-sm italic text-center mt-10">
            Imagens reais de projetos executados. A Orbital não realiza instalação; somos fornecedores diretos.
          </p>
        </div>
      </section>

      {/* ── Antes × depois ─────────────────────────────────────────────────── */}
      <section aria-labelledby="transformacao-titulo" className="bg-[#090e18] py-14 lg:py-24">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-16">
          <SecaoCabecalho id="transformacao-titulo" escuro sobretitulo="Transformação real" titulo="A diferença é visível."
            texto="Arraste a divisória para comparar o mesmo lavabo antes e depois do PFB." />
          <AntesDepois
            antes={{ src: "/images/academia/lavabo-consultorio-antes.jpg", alt: "Lavabo de consultório antes do PFB" }}
            depois={{ src: "/images/academia/lavabo-consultorio-depois.jpg", alt: "Lavabo de consultório depois, com PFB acabamento mármore e forro amadeirado" }} />
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-5">
            <div>
              <p className="text-secondary text-xs tracking-[0.14em] uppercase font-semibold">Mármore nas paredes · Forro amadeirado</p>
              <p className="text-white/75 text-sm mt-1">Lavabo de consultório · Comercial · Manaus, AM</p>
            </div>
            <p className="text-white/70 text-sm italic">Sem obra pesada · Sem poeira</p>
          </div>
        </div>
      </section>

      {/* ── Showrooms parceiros ────────────────────────────────────────────── */}
      <section id="showrooms" aria-labelledby="showrooms-titulo" className="scroll-mt-36 py-12 lg:py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <SecaoCabecalho id="showrooms-titulo" sobretitulo="Visite e veja de perto" titulo="Showrooms parceiros"
            texto="Ambientes decorados com o PFB dentro de empresas parceiras. Veja o acabamento, a textura e a luz ao vivo." />
          {showrooms.length === 0
            ? <p className="text-on-surface-variant text-base">Em breve.</p>
            : <Trilho rotulo="Showrooms parceiros">{showrooms.map((s) => <LugarCard key={s.id} lugar={s} agora={agora} />)}</Trilho>}
        </div>
      </section>

      {/* ── Pontos de revenda ──────────────────────────────────────────────── */}
      <section id="revenda" aria-labelledby="revenda-titulo" className="scroll-mt-36 py-12 lg:py-20 bg-background">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <SecaoCabecalho id="revenda-titulo" sobretitulo="Compre perto de você" titulo="Pontos de revenda"
            texto="Lojas parceiras com os nossos modelos em display, no tamanho real da placa, para escolher com o painel na mão." />
          <Trilho rotulo="Pontos de revenda">{revendas.map((s) => <LugarCard key={s.id} lugar={s} agora={agora} />)}</Trilho>
        </div>
      </section>

      {/* ── Simulações de IA ───────────────────────────────────────────────── */}
      <section id="inspiracoes" aria-labelledby="inspiracoes-titulo" className="scroll-mt-36 py-14 lg:py-24 bg-primary">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <SecaoCabecalho id="inspiracoes-titulo" escuro sobretitulo="Possibilidades · Simulações de IA" titulo="O Orbital no seu espaço."
            texto="Imagens geradas por inteligência artificial, para fins ilustrativos, mostrando o PFB em diferentes ambientes."
            acao={
              <Link href="/visualizador"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-5 border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold hover:bg-white hover:text-primary transition-colors">
                Simular no meu ambiente
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            } />
          <GradeRenders renders={renders} />
        </div>
      </section>

      <ChamadaProjeto />
    </div>
  );
}
