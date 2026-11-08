"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, ViewTransition, type KeyboardEvent } from "react";
import { LINHAS, SITUACAO_ROTULO, type LinhaOrbital } from "@/lib/linhas";

const semAssinatura = () => () => {};
const nivelLeve = () => document.documentElement.dataset.mvNivel === "leve";

/**
 * Aparelho no nível `leve` (data-mv-nivel, ligado pelo <Movimento /> na
 * montagem)? Lido a cada render, não só na montagem: o nome do morph só
 * importa depois de uma troca de aba, quando o nível já está decidido.
 * No servidor, "completo".
 */
function useNivelLeve() {
  return useSyncExternalStore(semAssinatura, nivelLeve, () => false);
}

/** Tamanhos da foto no painel (o mesmo para a foto da linha e as dos usos). */
const TAMANHOS_FOTO = "(min-width: 768px) 50vw, 100vw";

/**
 * Seletor das linhas da Orbital: abas em cima e um painel por linha, lado a
 * lado numa pista com encaixe. No celular o visitante arrasta de lado (ou toca
 * na aba) e vê uma linha por vez, sem descer a página; no computador as abas
 * trocam o painel. A aba ativa acompanha a pista nos dois sentidos.
 *
 * Usado na home (Nossas soluções) e em /produtos.
 */
export default function SeletorLinhas({ titulo = "h3" }: {
  /** Nível do nome da linha dentro do painel (h2 em /produtos, h3 na home). */
  titulo?: "h2" | "h3";
}) {
  const pista = useRef<HTMLDivElement>(null);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const [ativo, setAtivo] = useState(0);
  /** Etiqueta de uso escolhida (linha e posição); null = a foto da linha. */
  const [uso, setUso] = useState<{ linha: number; i: number } | null>(null);
  // Trocou de linha: a escolha some (ajuste durante a renderização, sem efeito).
  if (uso && uso.linha !== ativo) setUso(null);
  // No nível leve a troca de página é só dissolução, sem morph (spec 2.4).
  const leve = useNivelLeve();

  // A pista manda na aba: rolou de lado, a aba acompanha.
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let raf = 0;
    const medir = () => {
      raf = 0;
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setAtivo((v) => (v === i ? v : Math.min(LINHAS.length - 1, Math.max(0, i))));
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    el.addEventListener("scroll", pedir, { passive: true });
    return () => { cancelAnimationFrame(raf); el.removeEventListener("scroll", pedir); };
  }, []);

  const ir = useCallback((i: number) => {
    const el = pista.current;
    if (!el) return;
    setAtivo(i);
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduzir ? "auto" : "smooth" });
  }, []);

  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = (ativo + passo + LINHAS.length) % LINHAS.length;
    ir(i);
    abas.current[i]?.focus();
  };

  return (
    <div className="mv-brilho-fonte">
      <div role="tablist" aria-label="Linhas da Orbital" onKeyDown={teclado}
        className="grid grid-cols-3 border-b border-[#0B1F45]/12">
        {LINHAS.map((l, i) => (
          <button key={l.slug} ref={(b) => { abas.current[i] = b; }} id={`linha-aba-${l.slug}`} type="button" role="tab"
            aria-selected={ativo === i} aria-controls={`linha-painel-${l.slug}`} tabIndex={ativo === i ? 0 : -1}
            onClick={() => ir(i)}
            className={`relative min-h-14 px-2 pb-3 pt-2 text-left sm:text-center transition-colors duration-300 ${ativo === i ? "text-[#0B1F45]" : "text-[#0B1F45]/45 hover:text-[#0B1F45]/75"}`}>
            <span className="block font-serif text-[1.0625rem] sm:text-t3 leading-tight">{l.curto}</span>
            <span className="mt-1 flex items-center gap-1.5 sm:justify-center text-[11px] sm:text-legenda">
              <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full ${l.situacao === "pronta-entrega" ? "bg-[#36A35C]" : "bg-[#B79B6C]"}`} />
              {l.situacao === "pronta-entrega" ? "Pronta-entrega" : "Em breve"}
            </span>
            <span aria-hidden className={`absolute inset-x-0 -bottom-px h-0.5 bg-[#0B1F45] origin-left transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${ativo === i ? "scale-x-100" : "scale-x-0"}`} />
          </button>
        ))}
      </div>

      <div ref={pista} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain">
        {LINHAS.map((l, i) => {
          const escolhido = uso && uso.linha === i ? uso.i : null;
          return (
            <div key={l.slug} id={`linha-painel-${l.slug}`} role="tabpanel" aria-labelledby={`linha-aba-${l.slug}`}
              aria-hidden={ativo !== i} inert={ativo !== i}
              className="w-full shrink-0 snap-center pt-6 sm:pt-8 lg:pt-5">
              {/* Com um uso escolhido a foto à vista não é a da abertura da
                  TechStone: o morph sai e a troca de página só dissolve. */}
              <Painel linha={l} Titulo={titulo} prioridade={i === 0} aberto={ativo === i} uso={escolhido}
                escolherUso={(u) => setUso(escolhido === u ? null : { linha: i, i: u })}
                morph={!leve && l.slug === "techstone" && ativo === i && escolhido === null} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Quando o navegador folgar (Safari não tem requestIdleCallback: espera um pouco). */
function quandoFolgar(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const t = window.setTimeout(fn, 300);
  return () => window.clearTimeout(t);
}

function Painel({ linha, Titulo, prioridade, aberto, uso, escolherUso, morph }: {
  linha: LinhaOrbital; Titulo: "h2" | "h3"; prioridade: boolean;
  /** O painel é o da aba ativa. */
  aberto: boolean;
  /** Etiqueta de uso escolhida (posição em linha.usos); null = a foto da linha. */
  uso: number | null;
  /** Toque numa etiqueta: escolhe o uso, ou volta à foto da linha se já era ele. */
  escolherUso: (i: number) => void;
  /** A foto leva o nome do morph da TechStone (painel da TechStone, ativo, fora do nível leve). */
  morph: boolean;
}) {
  const prontaEntrega = linha.situacao === "pronta-entrega";
  const raiz = useRef<HTMLDivElement>(null);
  /** As fotos dos usos entram no DOM (e carregam) só com o painel ativo perto da tela e o navegador folgado. */
  const [carregar, setCarregar] = useState(false);
  const temUsos = linha.usos.length > 0;

  useEffect(() => {
    if (!aberto || carregar || !temUsos || !raiz.current) return;
    let cancelar = () => {};
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      cancelar = quandoFolgar(() => setCarregar(true));
    }, { rootMargin: "100% 0px" });
    io.observe(raiz.current);
    return () => { io.disconnect(); cancelar(); };
  }, [aberto, carregar, temUsos]);

  const gerada = uso !== null ? linha.usos[uso]?.imagemGerada : linha.imagemGerada;
  // Largura da foto no painel: wide (4/3) em vez de alta, e no computador a
  // altura segue a tela (svh) para a seção inteira caber numa vista.
  const caixa = `relative block aspect-[16/10] md:aspect-[4/3] md:max-h-[min(62svh,560px)] lg:aspect-auto lg:h-[min(50svh,30rem)] overflow-hidden bg-[#141A26]${linha.imagem ? " mv-brilho" : ""}`;
  const foto = linha.imagem ? (
    <>
      {/* A foto da TechStone vira a abertura da página dela (mesmo nome
          em techstone/Apresentacao). Só ela: o catálogo do PFB não abre
          com a mesma foto, então essa navegação apenas se dissolve. E só
          com o painel à vista: fora da tela (outra aba ativa) o morph
          sairia voando do canto, e na volta para cá a foto cairia num
          painel escondido. Sem nome, a foto troca junto com a página. */}
      <ViewTransition name={morph ? "linha-techstone" : undefined} share="mv-morph" default="none">
        <Image src={linha.imagem.src} alt={uso === null ? linha.imagem.alt : ""} aria-hidden={uso !== null || undefined}
          fill priority={prioridade} sizes={TAMANHOS_FOTO} className="object-cover" />
      </ViewTransition>
      {/* Fotos dos usos por cima da foto da linha, em fusão (ver .sl-uso no CSS). */}
      {(carregar || uso !== null) && (
        <span className="sl-usos" data-vazio={uso === null || undefined}>
          {linha.usos.map((u, i) => (
            <Image key={u.rotulo} src={u.imagem.src} alt={uso === i ? u.imagem.alt : ""} aria-hidden={uso !== i || undefined}
              fill loading="eager" sizes={TAMANHOS_FOTO} className="sl-uso object-cover" style={{ objectPosition: u.imagem.posicao }} data-ativo={uso === i || undefined} />
          ))}
        </span>
      )}
    </>
  ) : (
    <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 bg-[radial-gradient(ellipse_at_30%_20%,#2A3142,#0E121A_70%)]">
      <p className="font-serif text-white/90 text-t2">{linha.nome}</p>
      <p className="mt-1 text-white/55 text-legenda">Em preparação</p>
    </div>
  );
  return (
    <div ref={raiz} className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12 md:items-center">
      {/* A foto leva à página da linha (o mesmo destino do botão). Dentro da
          pista de arrastar o navegador já cancela o clique quando o gesto vira
          rolagem, então deslizar de lado não abre a página. Linha sem página
          (PFB Carbon) continua sem link. */}
      {linha.href ? (
        <Link href={linha.href} className={caixa} data-cursor="ver"
          aria-label={`${prontaEntrega ? `Ver o catálogo d${linha.artigo} ${linha.curto}` : `Conhecer ${linha.artigo} ${linha.nome}`}${
            /* A foto não mostra aviso; para leitor de tela, o rótulo diz que ela foi gerada por IA (X0.08 v2; dono, 07/11/2026: sem selo visível). */
            gerada ? " (imagem gerada por IA)" : ""}`}>
          {foto}
        </Link>
      ) : (
        <div className={caixa} data-cursor={linha.imagem ? "ver" : undefined}>{foto}</div>
      )}
      <div>
        <p className="flex items-center gap-2 text-legenda text-[#43474e]">
          <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full ${prontaEntrega ? "bg-[#36A35C]" : "bg-[#B79B6C]"}`} />
          {SITUACAO_ROTULO[linha.situacao]}
        </p>
        <Titulo className="mt-2 font-serif text-t2 text-[#0B1F45] text-balance">{linha.nome}</Titulo>
        <p className="mt-3 text-corpo text-[#43474e] max-w-[42ch] text-pretty">{linha.resumo}</p>
        {temUsos && (
          // Botões de toque simples: nada de arrastar aqui, então deslizar de
          // lado por cima deles continua trocando de linha no celular.
          <div role="group" aria-label="Onde usar" className="mt-5 flex flex-wrap gap-2">
            {linha.usos.map((u, i) => (
              <button key={u.rotulo} type="button" aria-pressed={uso === i}
                onClick={() => { setCarregar(true); escolherUso(i); }}
                className={`sl-etiqueta px-3 py-1.5 rounded-full border text-legenda transition-colors duration-300 ${
                  uso === i ? "bg-[#0B1F45] border-[#0B1F45] text-white" : "border-[#0B1F45]/15 text-[#0B1F45] hover:border-[#0B1F45]/45"
                }`}>
                {u.rotulo}
              </button>
            ))}
          </div>
        )}
        {linha.href ? (
          <Link href={linha.href} className="mt-7 ds-botao ds-botao-cheio min-h-12">
            {prontaEntrega ? "Ver o catálogo" : `Conhecer ${linha.artigo} ${linha.nome}`}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        ) : (
          <p className="mt-7 text-legenda text-[#74777f]">Os detalhes chegam em breve.</p>
        )}
      </div>
    </div>
  );
}
