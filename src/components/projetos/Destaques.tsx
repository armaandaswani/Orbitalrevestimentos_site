"use client";

import Image from "next/image";
import type { Projeto } from "@/lib/projetos-tipos";

/**
 * Destaques de /projetos: os projetos marcados no painel (até 5, na ordem do
 * painel), um por tela, antes da grade. A página encaixa em cada um (Encaixe
 * da TechStone: nativo no toque, por regra com mouse e trackpad).
 *
 * Celular: a foto cobre a tela, no ponto de foco que o dono escolheu para a
 * capa; embaixo, sobre um véu, o nome, a linha (modelo e lugar) e "Ver projeto".
 *
 * Computador: as fotos são quase todas em pé ou quadradas, com 1080 px de
 * lado; esticá-las na tela toda as deixaria moles. A foto aparece inteira, na
 * altura da tela, à direita; atrás, a mesma foto desfocada e escurecida
 * preenche a tela; à esquerda, o nome, a linha e o botão.
 *
 * "Ver projeto" é um link de verdade (?projeto=<slug>), o mesmo da grade; com
 * JavaScript, abre a galeria no lugar, sem trocar de página.
 */
export default function Destaques({
  destaques, linha, hrefProjeto, onAbrir,
}: {
  destaques: Projeto[];
  /** Linha discreta sob o nome (modelo · lugar), a mesma do cartão da grade. */
  linha: (p: Projeto) => string;
  hrefProjeto: (p: Projeto) => string;
  onAbrir?: (p: Projeto) => void;
}) {
  return (
    <section aria-labelledby="projetos-titulo" data-destaques>
      <h1 id="projetos-titulo" className="sr-only">Projetos</h1>
      {destaques.map((p, i) => {
        const fx = `${Number(p.cover_focus_x ?? 0.5) * 100}%`;
        const fy = `${Number(p.cover_focus_y ?? 0.5) * 100}%`;
        const detalhe = linha(p);
        return (
          <article key={p.id} aria-labelledby={`destaque-${p.id}`} data-destaque={p.slug}
            className="ts-encaixe-ponto relative h-[100svh] overflow-hidden bg-[#07122A] text-white">
            {/* Fundo do computador: a própria foto, desfocada e escurecida. Pequena de propósito:
                o desfoque apaga a resolução. No celular fica escondida e nem é baixada. */}
            <div aria-hidden className="absolute inset-0 hidden lg:block">
              <Image src={p.image_after} alt="" fill sizes="20vw" className="object-cover scale-125 blur-3xl opacity-80" />
              <div className="absolute inset-0 bg-[#07122A]/60" />
            </div>

            {/* A foto: cobre a tela no celular; inteira, na altura da tela e à direita no computador.
                No primeiro destaque ela começa sob o cabeçalho, que está sempre à vista ali. */}
            <div className={`absolute inset-0 lg:left-[38%] ${i === 0 ? "lg:top-20" : ""}`}>
              <Image src={p.image_after} alt={p.title} fill priority={i === 0}
                sizes="(max-width: 1023px) 100vw, 62vw"
                className="object-cover [object-position:var(--fx)_var(--fy)] lg:object-contain lg:[object-position:100%_50%]"
                style={{ "--fx": fx, "--fy": fy } as React.CSSProperties} />
            </div>

            {/* Véu: embaixo no celular (sob o texto), à esquerda no computador. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#07122A]/90 via-[#07122A]/45 to-transparent lg:hidden" />

            <div className="absolute inset-x-0 bottom-0 px-5 sm:px-8 pb-[max(env(safe-area-inset-bottom),2.25rem)]
              lg:inset-y-0 lg:right-auto lg:w-[38%] lg:pb-0 lg:pl-[clamp(2rem,5vw,6rem)] lg:pr-10 lg:flex lg:flex-col lg:justify-center">
              <h2 id={`destaque-${p.id}`} className="font-serif font-normal leading-[1.04] tracking-[-0.02em] text-balance text-[clamp(2.125rem,1.4rem+3vw,4.25rem)] max-w-[14ch]">
                {p.title}
              </h2>
              {detalhe && <p className="mt-3 lg:mt-4 text-white/80 text-corpo">{detalhe}</p>}
              <div className="mt-6 lg:mt-9 flex flex-col items-start gap-3">
                <a href={hrefProjeto(p)} data-ver-projeto
                  onClick={(e) => { if (!onAbrir || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onAbrir(p); }}
                  className="ds-botao ds-botao-claro min-h-12 active:bg-[#E8E6E1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Ver projeto
                </a>
                <a href="#obras" data-todos-projetos
                  className="inline-flex items-center gap-2 min-h-11 text-legenda text-white/85 underline decoration-white/40 decoration-1 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Todos os projetos
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                </a>
              </div>
            </div>

            {/* Posição na sequência, discreta, à direita no celular e no pé do texto no computador. */}
            {destaques.length > 1 && (
              <p aria-hidden className="absolute right-5 sm:right-8 top-24 lg:top-auto lg:right-auto lg:left-[clamp(2rem,5vw,6rem)] lg:bottom-8 text-white/70 text-legenda tabular-nums">
                {i + 1} / {destaques.length}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
