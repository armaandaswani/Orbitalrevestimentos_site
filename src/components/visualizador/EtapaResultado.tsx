"use client";

// Resultado: enquanto gera, a foto fica na tela com uma linha fina de progresso
// (aria-live). No site, antes de revelar, a folha do contato (nome e WhatsApp,
// a mesma validação de antes) fica por cima do resultado borrado e não fecha
// sozinha. Revelado: o antes e depois com o aviso de simulação logo abaixo e
// as ações, com "Falar com um consultor" à frente (ou só o orçamento, quando
// ele está visível). No erro, a mensagem de sempre e "Tentar de novo". Só
// apresentação: gerar, enviar o contato, baixar e o orçamento são do wizard.
import React from "react";
import AntesDepois from "./AntesDepois";
import Folha from "./Folha";
import { useProporcao } from "./EditorMarcacao";

const ROTULO = "block text-[11px] font-bold uppercase tracking-[0.14em] text-[#5b5f66]";
const CAMPO =
  "mt-1.5 w-full rounded-sm border border-[#dfe2e6] bg-white px-3 py-2.5 text-[16px] text-[#0B1F45] placeholder:text-[#8c9098] focus:border-[#0B1F45] focus:outline-none";
const PRIMARIO =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#0B1F45] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#2347A0] disabled:cursor-not-allowed disabled:bg-[#e8e8e6] disabled:text-[#8c9098]";
const LINK =
  "inline-flex min-h-11 items-center text-[13px] font-semibold text-[#0B1F45] underline decoration-[#0B1F45]/25 underline-offset-4 hover:text-[#2347A0] hover:decoration-[#2347A0]/40";

type Progresso = { i: number; total: number; label: string };

function textoProgresso(p: Progresso | null): string {
  if (!p) return "Gerando…";
  return p.total > 1 ? `Aplicando ${p.label} (${p.i} de ${p.total})…` : `Aplicando ${p.label}…`;
}

/** Um WhatsApp de verdade tem de 8 a 13 dígitos (local, com DDD ou com o código do país). */
function telefoneValido(v: string): { digitos: number; valido: boolean } {
  const digitos = v.replace(/\D/g, "").length;
  return { digitos, valido: digitos >= 8 && digitos <= 13 };
}

export default function EtapaResultado({
  photoData, resultado, previa, gerando, progresso, erro, embutido,
  leadEnviado, leadNome, leadTelefone, onNome, onTelefone, onEnviarLead,
  onConsultor, onBaixar, onOutroAcabamento, onOutroAmbiente, onTentarDeNovo, orcamento,
}: {
  photoData: string;
  resultado: string | null;
  previa: string | null;
  gerando: boolean;
  progresso: Progresso | null;
  erro: string | null;
  embutido: boolean;
  leadEnviado: boolean;
  leadNome: string;
  leadTelefone: string;
  onNome: (v: string) => void;
  onTelefone: (v: string) => void;
  onEnviarLead: () => void;
  /** Sem ele (orçamento instantâneo visível), não há "Falar com um consultor". */
  onConsultor?: () => void;
  onBaixar: () => void;
  onOutroAcabamento: () => void;
  onOutroAmbiente: () => void;
  onTentarDeNovo: () => void;
  orcamento: null | { pronto: boolean; preparando: boolean; resumo: string; onContinuar: () => void };
}) {
  const proporcao = useProporcao(photoData) ?? 4 / 3;
  const liberado = embutido || leadEnviado;
  const revelado = !gerando && !!resultado && liberado;
  const falhou = !gerando && !resultado && !!erro;
  const folhaAberta = !embutido && !leadEnviado && !erro && (gerando || !!resultado);
  const telefone = telefoneValido(leadTelefone);
  const contatoPronto = leadNome.trim().length > 0 && telefone.valido;
  const progressoTexto = textoProgresso(progresso);

  const titulo = gerando
    ? "Gerando sua visualização"
    : falhou
      ? "A visualização não saiu"
      : revelado
        ? "Antes e depois"
        : "Sua visualização está pronta";

  // Foto do quadro enquanto não revela: o resultado (borrado, atrás da folha),
  // a prévia do gerador ou a foto original.
  const fotoQuadro = resultado ?? (gerando ? previa : null) ?? photoData;
  const borrar = folhaAberta && fotoQuadro !== photoData;

  return (
    <div data-viz-resultado data-gerando={gerando ? "" : undefined}>
      <div className="mb-3 flex min-h-8 items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl leading-tight text-[#0B1F45] sm:text-2xl">{titulo}</h2>
        {revelado && <p className="shrink-0 text-[13px] text-[#74777f]">Arraste para comparar</p>}
      </div>

      {revelado && resultado ? (
        <div className="viz-revela">
          <AntesDepois antes={photoData} depois={resultado} />
          {/* Logo abaixo da comparação, na largura dela. */}
          <p
            data-viz-aviso-simulacao
            className="viz-res-nota mx-auto mt-2 text-xs text-on-surface-variant"
            style={{ "--proporcao": proporcao } as React.CSSProperties}
          >
            A imagem gerada é uma simulação e pode diferir do resultado real.
          </p>
        </div>
      ) : (
        <div
          className="viz-res-quadro relative mx-auto overflow-hidden rounded-[6px] bg-[#11151b]"
          style={{ "--proporcao": proporcao, aspectRatio: proporcao } as React.CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoQuadro}
            alt={resultado ? "Simulação gerada por IA da mesma foto com o acabamento escolhido" : "Sua foto"}
            className="absolute inset-0 h-full w-full object-cover"
            style={borrar ? { filter: "blur(14px)", transform: "scale(1.06)" } : undefined}
          />
          {gerando && previa && (
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              Prévia, refinando os detalhes
            </span>
          )}
          {gerando && (
            <span aria-hidden className="viz-progresso absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/25">
              <span className="viz-progresso-barra block h-full w-1/3 bg-[#36A35C]" />
            </span>
          )}
        </div>
      )}

      {/* Progresso e chegada do resultado, anunciados sem roubar o foco. */}
      <div aria-live="polite" role="status" className={gerando ? "mt-3" : "sr-only"}>
        {gerando ? (
          <>
            <p className="text-[15px] font-medium text-[#0B1F45]">{progressoTexto}</p>
            <p className="mt-0.5 text-[13px] text-[#74777f]">Pode levar até 1 minuto. O resto da foto continua igual.</p>
          </>
        ) : revelado ? (
          "Resultado pronto."
        ) : null}
      </div>

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
        <div className="mt-4">
          {!embutido && onConsultor && (
            <div>
              <button type="button" onClick={onConsultor} className={`${PRIMARIO} lg:w-auto lg:min-w-[320px]`}>
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.4 8.4 0 01-12.3 7.5L3 21l2-5.5A8.5 8.5 0 1121 11.5z" />
                </svg>
                Falar com um consultor
              </button>
              <p className="mt-2 text-[13px] text-[#74777f]">Ele já recebe os acabamentos escolhidos.</p>
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

      {!embutido && (
        <Folha
          aberta={folhaAberta}
          titulo={gerando ? "Enquanto a visualização fica pronta" : "Sua visualização está pronta"}
          onFechar={() => {}}
          fechavel={false}
        >
          {gerando && (
            <p className="mb-3 flex items-center gap-2 text-[13px] text-[#43474e]">
              <span aria-hidden className="viz-ponto-detectando h-2 w-2 shrink-0 rounded-full bg-[#36A35C]" />
              {progressoTexto}
            </p>
          )}
          <p className="text-[15px] text-[#43474e]">Informe seus dados para ver o resultado.</p>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => { e.preventDefault(); if (contatoPronto) onEnviarLead(); }}
          >
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
            {telefone.digitos > 0 && !telefone.valido && (
              <p className="-mt-1 text-[13px] text-[#9a5b0b]">Informe um WhatsApp válido com DDD.</p>
            )}
            {/* Enquanto gera, o contato fica salvo e o resultado abre sozinho. */}
            <button type="submit" disabled={!contatoPronto} className={`${PRIMARIO} mt-2`}>
              {gerando ? "Salvar e aguardar" : "Ver resultado"}
            </button>
          </form>
        </Folha>
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
