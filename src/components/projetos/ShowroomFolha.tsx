"use client";

import { useEffect, useRef } from "react";
import { useDialogo } from "@/components/ds/useDialogo";
import type { Projeto, Showroom } from "@/lib/projetos-tipos";
import ShowroomConteudo from "./ShowroomConteudo";

/**
 * Folha de um showroom por cima da página de Projetos: no celular ocupa a tela
 * (sobe); no computador entra pela direita e deixa a página escurecida atrás —
 * o visitante vê que não saiu do lugar. A rolagem fica dentro da folha.
 *
 * Barra fixa: fechar (volta aos projetos), anterior/próximo parceiro e a
 * posição ("2 / 5"). Diálogo modal (useDialogo): foco preso, Esc fecha, foco
 * volta ao cartão ao fechar. Só transform/opacity ao abrir.
 */
export default function ShowroomFolha({
  lugar, ambientes, todos, ativo, onFechar, onIr, onAbrirProjeto, hrefProjeto,
}: {
  lugar: Showroom;
  ambientes: Projeto[];
  todos: Showroom[];
  /** Falso enquanto a galeria está aberta por cima (Esc e Tab passam a ela). */
  ativo: boolean;
  onFechar: () => void;
  onIr: (s: Showroom) => void;
  onAbrirProjeto: (p: Projeto) => void;
  hrefProjeto: (p: Projeto) => string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  useDialogo(caixa, onFechar, ativo, caixa);

  const idx = todos.findIndex((s) => s.id === lugar.id);
  const anterior = idx > 0 ? todos[idx - 1] : null;
  const proximo = idx >= 0 && idx < todos.length - 1 ? todos[idx + 1] : null;

  // Trocar de parceiro: a folha volta ao topo e o leitor de tela ouve o novo nome.
  useEffect(() => { corpo.current?.scrollTo({ top: 0 }); }, [lugar.id]);

  const botao = "w-11 h-11 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-primary";

  return (
    <div className="fixed inset-0 z-[56]" aria-hidden={!ativo || undefined}>
      <div className="mv-veu absolute inset-0 bg-primary/60" onClick={onFechar} aria-hidden />
      <div ref={caixa} role="dialog" aria-modal="true" tabIndex={-1} aria-label={`${lugar.kind === "revenda" ? "Ponto de revenda" : "Showroom"}: ${lugar.name}`}
        className="outline-none "mv-folha lg:mv-folha-lado absolute inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[min(100%,72rem)] bg-background flex flex-col shadow-2xl"
        style={{ height: "100dvh" }}>
        <div className="flex items-center justify-between gap-3 px-[clamp(1rem,4.2vw,4rem)] pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 border-b border-surface-variant bg-background flex-shrink-0">
          <button ref={fechar} type="button" onClick={onFechar}
            className="inline-flex items-center gap-2 min-h-11 -ml-2 pl-2 pr-3 text-xs tracking-[0.14em] uppercase font-bold text-primary hover:text-[#2347A0] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            <span className="hidden sm:inline">Voltar aos projetos</span><span className="sm:hidden">Projetos</span>
          </button>
          <div className="flex items-center gap-2" role="group" aria-label="Trocar de parceiro">
            <p className="text-legenda text-on-surface-variant tabular-nums mr-1" aria-live="polite">
              <span className="sr-only">Parceiro </span>{idx + 1} / {todos.length}
            </p>
            <button type="button" className={botao} disabled={!anterior} onClick={() => anterior && onIr(anterior)} aria-label={anterior ? `Parceiro anterior: ${anterior.name}` : "Parceiro anterior"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" className={botao} disabled={!proximo} onClick={() => proximo && onIr(proximo)} aria-label={proximo ? `Próximo parceiro: ${proximo.name}` : "Próximo parceiro"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
        <div ref={corpo} className="ds-folha-rola flex-1 min-h-0 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)]">
          <ShowroomConteudo key={lugar.id} lugar={lugar} ambientes={ambientes} todos={todos} nivel="folha"
            onAbrirProjeto={onAbrirProjeto} hrefProjeto={hrefProjeto} onIr={onIr} />
        </div>
      </div>
    </div>
  );
}
