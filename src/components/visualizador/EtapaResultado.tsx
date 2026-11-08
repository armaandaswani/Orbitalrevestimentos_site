"use client";

// Resultado: enquanto gera, a espera (EsperaGeracao) mostra o trabalho
// acontecendo sobre a foto do cliente, com as etapas, a barra e os checks.
// O contato (nome e WhatsApp, a mesma validação de antes) fica logo abaixo,
// no fluxo da página, sem nada preso por cima: enviado durante a espera, o
// resultado abre sozinho quando ela termina. A espera só termina depois da
// imagem pronta; sem contato, o quadro mostra o resultado borrado e o mesmo
// formulário. Revelado: o antes e depois surge com um véu que se desfaz e uma
// luz passando, o aviso de simulação logo abaixo e a ação seguinte à mão
// ("Quero este acabamento" abre o pré-contato; o modelo no catálogo ao
// lado). No erro, a mensagem de sempre e "Tentar de novo". Só apresentação:
// gerar, enviar o contato, baixar e o orçamento são do wizard.
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AntesDepois from "./AntesDepois";
import EsperaGeracao from "./EsperaGeracao";
import { rolarParaTopo } from "./VizShell";
import { useProporcao } from "./EditorMarcacao";
import type { SinaisGeracao } from "./espera";
import { catalogoPath } from "@/lib/product-link";

const ROTULO = "block text-[11px] font-bold uppercase tracking-[0.14em] text-[#5b5f66]";
const CAMPO =
  "mt-1.5 w-full rounded-sm border border-[#dfe2e6] bg-white px-3 py-2.5 text-[16px] text-[#0B1F45] placeholder:text-[#8c9098] focus:border-[#0B1F45] focus:outline-none";
const PRIMARIO =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#0B1F45] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#2347A0] disabled:cursor-not-allowed disabled:bg-[#e8e8e6] disabled:text-[#8c9098]";
const LINK =
  "inline-flex min-h-11 items-center text-[13px] font-semibold text-[#0B1F45] underline decoration-[#0B1F45]/25 underline-offset-4 hover:text-[#2347A0] hover:decoration-[#2347A0]/40";
const BORRADO: React.CSSProperties = { filter: "blur(14px)", transform: "scale(1.06)" };

export type ModeloEscolhido = { nome: string; code: string | null };

/** Um WhatsApp de verdade tem de 8 a 13 dígitos (local, com DDD ou com o código do país). */
function telefoneValido(v: string): { digitos: number; valido: boolean } {
  const digitos = v.replace(/\D/g, "").length;
  return { digitos, valido: digitos >= 8 && digitos <= 13 };
}

function prefereMenosMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function EtapaResultado({
  photoData, resultado, previa, gerando, sinais, modelos, erro,
  leadEnviado, leadNome, leadTelefone, onNome, onTelefone, onEnviarLead,
  onConsultor, onBaixar, onOutroAcabamento, onOutroAmbiente, onTentarDeNovo, orcamento,
}: {
  photoData: string;
  resultado: string | null;
  previa: string | null;
  gerando: boolean;
  /** Sinais da geração atual (início, prévias, fim); nulo antes da primeira. */
  sinais: SinaisGeracao | null;
  /** Acabamentos escolhidos nas áreas, na ordem, sem repetir. */
  modelos: readonly ModeloEscolhido[];
  erro: string | null;
  leadEnviado: boolean;
  leadNome: string;
  leadTelefone: string;
  onNome: (v: string) => void;
  onTelefone: (v: string) => void;
  onEnviarLead: () => void;
  /** Sem ele (orçamento instantâneo visível), não há "Quero este acabamento". */
  onConsultor?: () => void;
  onBaixar: () => void;
  onOutroAcabamento: () => void;
  onOutroAmbiente: () => void;
  onTentarDeNovo: () => void;
  orcamento: null | { pronto: boolean; preparando: boolean; resumo: string; onContinuar: () => void };
}) {
  const proporcao = useProporcao(photoData) ?? 4 / 3;
  // A espera usa um quadro no máximo um pouco mais alto que largo (5:4): foto
  // em pé fica cortada, para o contato caber logo abaixo no celular.
  const proporcaoEspera = Math.max(proporcao, 1.25);

  // A espera termina (todas as etapas com check) só depois da imagem pronta.
  // Guardada pelo início da geração: uma geração nova começa do zero.
  const [concluidaEm, setConcluidaEm] = useState<number | null>(null);
  const inicio = sinais?.inicio ?? null;
  const concluida = inicio !== null && concluidaEm === inicio;
  const aoConcluir = useCallback(() => setConcluidaEm(inicio), [inicio]);

  const pronto = !gerando && !!resultado && (concluida || !sinais);
  const emEspera = !!sinais && !pronto && (gerando || !!resultado);
  const revelado = pronto && leadEnviado;
  const aguardandoContato = pronto && !leadEnviado;
  const falhou = !gerando && !resultado && !!erro;
  const pedeContato = !leadEnviado && (emEspera || aguardandoContato);
  const telefone = telefoneValido(leadTelefone);
  const contatoPronto = leadNome.trim().length > 0 && telefone.valido;

  const nomes = modelos.map((m) => m.nome).filter(Boolean);
  const umModelo = modelos.length === 1 ? modelos[0] : null;

  const titulo = emEspera
    ? "Gerando a sua simulação"
    : falhou
      ? "A visualização não saiu"
      : revelado
        ? "Voilà! Este é o seu novo ambiente"
        : "Sua simulação está pronta";

  // No celular o balão do chat some enquanto o Resultado está na tela (ele
  // cobria o canto da imagem; a ação seguinte já está aqui). O atributo sai ao
  // trocar de etapa ou desmontar; o CSS só age abaixo de 1024 px.
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-viz-no-resultado", "");
    return () => html.removeAttribute("data-viz-no-resultado");
  }, []);

  // Véu da revelação: a última imagem que o cliente viu (o resultado borrado,
  // se ele esperou com o formulário; senão a foto) por cima do antes e depois,
  // desfazendo-se com uma luz passando. Com movimento reduzido, não há véu.
  const [veu, setVeu] = useState<{ borrado: boolean } | null>(null);
  const [vistaAnterior, setVistaAnterior] = useState({ revelado, aguardandoContato });
  if (vistaAnterior.revelado !== revelado || vistaAnterior.aguardandoContato !== aguardandoContato) {
    setVistaAnterior({ revelado, aguardandoContato });
    if (revelado && !vistaAnterior.revelado && !prefereMenosMovimento()) setVeu({ borrado: vistaAnterior.aguardandoContato });
  }
  useEffect(() => {
    if (!veu) return;
    const t = window.setTimeout(() => setVeu(null), 1500);
    return () => window.clearTimeout(t);
  }, [veu]);

  // Revelou: o quadro volta para baixo do cabeçalho (o cliente estava no
  // formulário, mais abaixo) e o foco vai para o título, sem rolar de novo.
  const raiz = useRef<HTMLDivElement | null>(null);
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const reveladoAntes = useRef(revelado);
  useEffect(() => {
    const revelou = !reveladoAntes.current && revelado;
    reveladoAntes.current = revelado;
    if (!revelou) return;
    const shell = raiz.current?.closest<HTMLElement>("[data-viz-shell]");
    if (shell) rolarParaTopo(shell);
    tituloRef.current?.focus({ preventScroll: true });
  }, [revelado]);

  // Contato salvo durante a espera: o formulário some e a espera volta à vista.
  const contatoAntes = useRef(leadEnviado);
  useEffect(() => {
    const salvou = !contatoAntes.current && leadEnviado;
    contatoAntes.current = leadEnviado;
    if (!salvou || !emEspera) return;
    const shell = raiz.current?.closest<HTMLElement>("[data-viz-shell]");
    if (shell) rolarParaTopo(shell);
  }, [leadEnviado, emEspera]);

  return (
    <div
      ref={raiz}
      data-viz-resultado
      data-gerando={gerando ? "" : undefined}
      className={emEspera || aguardandoContato ? "viz-res-compacto" : undefined}
    >
      <div className="mb-3 flex min-h-8 items-baseline justify-between gap-3">
        <h2 ref={tituloRef} tabIndex={-1} className="font-serif text-xl leading-tight text-[#0B1F45] sm:text-2xl [text-wrap:balance]">{titulo}</h2>
        {revelado && <p className="hidden shrink-0 text-[13px] text-[#74777f] sm:block">Arraste para comparar</p>}
      </div>

      {emEspera && sinais ? (
        <EsperaGeracao
          key={sinais.inicio}
          foto={photoData}
          // Imagem pronta e etapas ainda fechando: o resultado fica no lugar da prévia.
          previa={previa ?? resultado}
          borrarPrevia={!leadEnviado}
          sinais={sinais}
          modelos={nomes}
          proporcao={proporcaoEspera}
          onConcluida={aoConcluir}
        />
      ) : revelado && resultado ? (
        <div className="viz-revela">
          <div className="viz-antes-depois relative mx-auto" style={{ "--proporcao": proporcao } as React.CSSProperties}>
            <AntesDepois antes={photoData} depois={resultado} />
            {veu && (
              <span aria-hidden data-viz-veu className="viz-revela-veu pointer-events-none absolute inset-0 overflow-hidden rounded-[6px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={veu.borrado ? resultado : photoData}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={veu.borrado ? BORRADO : undefined}
                />
                <span className="viz-revela-luz absolute inset-y-0 left-0 w-1/2" />
              </span>
            )}
          </div>
          {/* Logo abaixo da comparação, na largura dela. */}
          <p
            data-viz-aviso-simulacao
            className="viz-res-nota mx-auto mt-2 text-xs text-on-surface-variant"
            style={{ "--proporcao": proporcao } as React.CSSProperties}
          >
            A imagem gerada é uma simulação e pode diferir do resultado real.
            <span className="sm:hidden"> Arraste para comparar.</span>
          </p>
        </div>
      ) : (
        // Pronta sem contato: o mesmo quadro da espera, para o formulário caber logo abaixo.
        <div
          className="viz-res-quadro relative mx-auto overflow-hidden rounded-[6px] bg-[#11151b]"
          style={{ "--proporcao": aguardandoContato ? proporcaoEspera : proporcao, aspectRatio: aguardandoContato ? proporcaoEspera : proporcao } as React.CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultado ?? photoData}
            alt={resultado ? "Simulação gerada por IA da mesma foto com o acabamento escolhido" : "Sua foto"}
            className="absolute inset-0 h-full w-full object-cover"
            style={aguardandoContato ? BORRADO : undefined}
          />
          {aguardandoContato && (
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B1F45]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#36A35C]" />
              Pronta
            </span>
          )}
        </div>
      )}

      {/* Chegada do resultado, anunciada sem roubar o foco (a espera anuncia as etapas). */}
      <p aria-live="polite" role="status" className="sr-only">
        {revelado ? "Resultado pronto." : aguardandoContato ? "Sua simulação está pronta. Informe seus dados para ver." : ""}
      </p>

      {pedeContato && (
        <form
          data-viz-contato
          className="viz-res-nota mx-auto mt-5 flex flex-col gap-3"
          style={{ "--proporcao": proporcaoEspera } as React.CSSProperties}
          onSubmit={(e) => { e.preventDefault(); if (contatoPronto) onEnviarLead(); }}
        >
          <p className="text-[15px] leading-relaxed text-[#43474e]">
            {emEspera
              ? "Enquanto isso, deixe seu nome e WhatsApp. O resultado abre aqui assim que ficar pronto."
              : "Informe seus dados para ver o resultado."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={ROTULO}>Nome</span>
              <input
                value={leadNome}
                onChange={(e) => onNome(e.target.value)}
                autoComplete="name"
                placeholder="Seu nome completo"
                className={CAMPO}
              />
            </label>
            <label className="block">
              <span className={ROTULO}>WhatsApp</span>
              <input
                value={leadTelefone}
                onChange={(e) => onTelefone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(92) 99999-9999"
                aria-invalid={telefone.digitos > 0 && !telefone.valido}
                className={CAMPO}
              />
            </label>
          </div>
          {telefone.digitos > 0 && !telefone.valido && (
            <p className="-mt-1 text-[13px] text-[#9a5b0b]">Informe um WhatsApp válido com DDD.</p>
          )}
          <button type="submit" disabled={!contatoPronto} className={`${PRIMARIO} mt-1`}>
            {emEspera ? "Salvar e aguardar" : "Ver resultado"}
          </button>
        </form>
      )}

      {emEspera && leadEnviado && (
        <p
          data-viz-contato-salvo
          className="viz-res-nota mx-auto mt-5 flex items-center gap-2 text-[14px] text-[#43474e]"
          style={{ "--proporcao": proporcaoEspera } as React.CSSProperties}
        >
          <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#36A35C] text-white">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          Contato salvo. O resultado abre aqui assim que ficar pronto.
        </p>
      )}

      {falhou && (
        <div className="mt-4">
          <p className="text-[15px] text-[#b42318]">{erro}</p>
          <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            <button type="button" onClick={onTentarDeNovo} className={`${PRIMARIO} sm:w-auto sm:min-w-[240px]`}>
              Tentar de novo
            </button>
            <button type="button" onClick={onOutroAcabamento} className={`${LINK} justify-center sm:justify-start`}>
              Testar outro acabamento
            </button>
          </div>
        </div>
      )}

      {revelado && (
        <div className="viz-revela-acoes mt-5">
          {onConsultor && (
            <div data-viz-proximo-passo className="border border-[#e4e6ea] bg-[#fbfbfa] p-4 sm:p-5">
              <p className="font-serif text-lg leading-snug text-[#0B1F45]">Conta pra gente o que achou? 👇</p>
              <p className="mt-1 text-[15px] leading-relaxed text-[#43474e]">
                {umModelo
                  ? `Um consultor da Orbital já recebe o ${umModelo.nome} e tira suas dúvidas.`
                  : "Um consultor da Orbital já recebe os acabamentos escolhidos e tira suas dúvidas."}
              </p>
              <div className="mt-4 flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-6">
                <button type="button" onClick={onConsultor} className={`${PRIMARIO} lg:w-auto lg:min-w-[300px]`}>
                  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.4 8.4 0 01-12.3 7.5L3 21l2-5.5A8.5 8.5 0 1121 11.5z" />
                  </svg>
                  Quero este acabamento
                </button>
                <Link
                  href={umModelo?.code ? catalogoPath({ modelo: umModelo.code }) : catalogoPath({})}
                  className={`${LINK} justify-center lg:justify-start`}
                >
                  {umModelo ? `Ver o ${umModelo.nome} no catálogo` : "Ver os modelos no catálogo"}
                </Link>
              </div>
            </div>
          )}

          <ul className="mt-4 grid grid-cols-1 divide-y divide-[#ececea] border-y border-[#ececea] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <li>
              <AcaoSecundaria onClick={onBaixar} rotulo="Baixar imagem">
                <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
              </AcaoSecundaria>
            </li>
            <li>
              <AcaoSecundaria onClick={onOutroAcabamento} rotulo="Testar outro acabamento">
                <path d="M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z" />
              </AcaoSecundaria>
            </li>
            <li>
              <AcaoSecundaria onClick={onOutroAmbiente} rotulo="Adicionar outro ambiente">
                <path d="M12 5v14M5 12h14" />
              </AcaoSecundaria>
            </li>
          </ul>

          {orcamento && (
            <div className="mt-5 border border-[#e2e2e2] bg-[#fbfbfa] p-4 sm:p-5">
              <p className="text-[13px] text-[#43474e]">{orcamento.resumo}</p>
              <button
                type="button"
                onClick={orcamento.onContinuar}
                disabled={!orcamento.pronto || orcamento.preparando}
                className={`${PRIMARIO} mt-3 sm:w-auto sm:min-w-[260px]`}
              >
                {orcamento.preparando ? "Preparando…" : "Continuar para o orçamento"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AcaoSecundaria({ onClick, rotulo, children }: { onClick: () => void; rotulo: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-1 text-left text-[14px] font-medium text-[#0B1F45] hover:text-[#2347A0] sm:justify-center sm:px-3 sm:text-center"
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#5b5f66]">
        {children}
      </svg>
      <span className="min-w-0 flex-1 sm:flex-none">{rotulo}</span>
    </button>
  );
}
