"use client";

import { useEffect, useRef } from "react";
import { useDialogo } from "@/components/ds/useDialogo";
import { trackFunnel } from "@/lib/funnel";
import { acoesDaLoja, type PontoDeVenda } from "@/lib/pontos-de-venda";
import { FECHAR_PDV, HORARIO_ROTULO_PDV, SELO_PDV, notaFeriadoPdv, rotuloInstagramFolha } from "@/lib/onde-comprar-textos";
import { atributosDeMedicao, enderecoCompleto, SIMBOLO_SELO } from "./apresentacao-pdv";
import { BOTAO_PDV_CHEIO, BOTAO_PDV_CLARO, IconeDaAcao, IconeFechar } from "./IconesPdv";

/**
 * Folha de uma revenda por cima de /onde-comprar: sobe de baixo no celular e
 * entra pela direita a partir de `lg`, com o mapa à vista do lado. Diálogo
 * modal pelo `useDialogo` (foco preso, Esc fecha, rolagem travada, o foco
 * volta para onde estava). Sem <dialog>. Abrir envia `pdv_loja_aberta`; os
 * links levam os mesmos `data-pdv-*` da lista (o ouvinte da ilha mede).
 */
export default function FolhaPdv({ ponto, onFechar }: { ponto: PontoDeVenda; onFechar: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  // O foco entra na própria folha (o leitor de tela ouve o nome da loja) e não
  // no botão Fechar, que ganharia o anel de foco sem o visitante ter usado o teclado.
  useDialogo(caixa, onFechar, true, caixa);

  useEffect(() => {
    trackFunnel("pdv_loja_aberta", { loja: ponto.slug });
  }, [ponto.slug]);

  const acoes = acoesDaLoja(ponto);
  const principal = acoes[0];
  const rotas = acoes.slice(1).filter((a) => a.tipo === "rota" || a.tipo === "waze");
  const instagram = acoes.find((a) => a.tipo === "instagram");
  const endereco = enderecoCompleto(ponto);
  const idTitulo = `folha-pdv-${ponto.slug}`;

  return (
    // Véu e folha são irmãos, cada um fixo com o seu z-index (sem um contêiner
    // fixo em volta, que faria um contexto de empilhamento só): assim o pino da
    // loja (z 56, data-pdv-ativo) fica entre os dois, acima do véu e abaixo da folha.
    <>
      <div className="mv-veu fixed inset-0 z-[55] bg-primary/55" onClick={onFechar} aria-hidden="true" />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        data-pdv-folha={ponto.slug}
        className="ds-folha-rola mv-folha lg:mv-folha-lado fixed z-[57] inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto bg-surface-container-lowest px-5 pb-[max(env(safe-area-inset-bottom),1.75rem)] pt-[22px] shadow-2xl outline-none lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[min(100%,28rem)] lg:px-8 lg:pt-14"
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label={FECHAR_PDV}
          className="absolute right-2 top-2.5 grid h-11 w-11 place-items-center text-primary transition-colors hover:text-surface-tint focus-visible:outline-2 focus-visible:outline-surface-tint lg:right-4 lg:top-4"
        >
          <IconeFechar />
        </button>

        <p className="flex items-center gap-2 pr-12 text-legenda font-semibold text-on-secondary-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SIMBOLO_SELO} alt="" width={20} height={20} className="h-5 w-5" />
          {SELO_PDV}
        </p>
        <h2 id={idTitulo} className="mt-2.5 font-serif text-[27px] font-normal leading-[1.15] tracking-[-0.01em] text-primary">
          {ponto.name}
        </h2>
        {endereco && <p className="mt-1.5 text-base leading-[1.45] text-on-surface">{endereco}</p>}

        {ponto.horario && (
          <dl className="mt-4">
            <dt className="text-legenda font-semibold text-on-surface-variant">{HORARIO_ROTULO_PDV}</dt>
            <dd className="mt-0.5 text-base text-on-surface">{ponto.horario}</dd>
            <dd className="mt-1 text-legenda text-on-surface-variant">{notaFeriadoPdv(Boolean(ponto.whatsapp))}</dd>
          </dl>
        )}
        {ponto.description && <p className="mt-4 text-base leading-[1.5] text-on-surface">{ponto.description}</p>}

        {principal && principal.tipo !== "instagram" && (
          <a
            href={principal.href}
            target="_blank"
            rel="noopener"
            className={`${BOTAO_PDV_CHEIO} mt-5 flex w-full`}
            {...atributosDeMedicao(principal, ponto.slug)}
          >
            <IconeDaAcao tipo={principal.tipo} />
            {principal.rotulo}
          </a>
        )}
        {rotas.length > 0 && (
          <div className={`mt-2 grid gap-2 ${rotas.length > 1 ? "grid-cols-1 min-[390px]:grid-cols-2" : "grid-cols-1"}`}>
            {rotas.map((a) => (
              <a key={a.tipo} href={a.href} target="_blank" rel="noopener" className={`${BOTAO_PDV_CLARO} flex`} {...atributosDeMedicao(a, ponto.slug)}>
                <IconeDaAcao tipo={a.tipo} />
                {a.rotulo}
              </a>
            ))}
          </div>
        )}
        {instagram && ponto.instagram && (
          <a
            href={instagram.href}
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex min-h-11 items-center text-[15px] font-medium text-surface-tint underline underline-offset-[3px] hover:text-primary focus-visible:outline-2 focus-visible:outline-surface-tint"
            {...atributosDeMedicao(instagram, ponto.slug)}
          >
            {rotuloInstagramFolha(ponto.instagram)}
          </a>
        )}
      </div>
    </>
  );
}
