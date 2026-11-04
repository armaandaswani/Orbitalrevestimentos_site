"use client";

import Image from "next/image";
import { useState } from "react";

interface Pessoa {
  id: string;
  rotulo: string;
  frase: string;
  texto: string;
  /** posicao: object-position do recorte, quando o centro não serve. */
  imagem: { src: string; alt: string; posicao?: string };
}

/**
 * Por que a Orbital existe: a convicção de que a Amazônia merece revestimentos
 * feitos para ela, contada por quem ganha com isso na obra. Abas no lugar de
 * três blocos empilhados: uma pessoa por vez, a foto troca em fusão.
 * Texto: vault › História e símbolo (aprovado pelo dono).
 */
const PESSOAS: Pessoa[] = [
  {
    id: "arquiteto",
    rotulo: "Arquiteto",
    frase: "O arquiteto cria sem amarras.",
    texto: "O material abre caminho para o projeto, em vez de limitá-lo.",
    imagem: { src: "/images/projetos/escritorio-depois.jpeg", alt: "Escritório com estantes e painéis em Painel Flexível em Fibra de Bambu, em obra entregue em Manaus" },
  },
  {
    id: "engenheiro",
    rotulo: "Engenheiro",
    frase: "O engenheiro executa essa visão.",
    texto: "Com revestimentos inovadores, testados para a nossa realidade.",
    imagem: { src: "/images/projetos/escada-madeira-pfb-2026-10.jpg", alt: "Escada com paredes em Painel Flexível em Fibra de Bambu com acabamento de madeira" },
  },
  {
    id: "cliente",
    rotulo: "Cliente",
    frase: "O cliente tem acesso ao novo.",
    texto: "Materiais que ainda não chegavam à região, com estoque aqui em Manaus.",
    // Retrato 3:4 numa caixa 4:3 no celular: o recorte desce um pouco para o
    // roda-pia e a pia ficarem à vista (no computador a caixa é quase do formato da foto).
    imagem: { src: "/images/projetos/cozinha-roda-pia-orb003.webp", alt: "Cozinha residencial com roda-pia em Painel Flexível em Fibra de Bambu, em obra entregue em Manaus", posicao: "50% 62%" },
  },
];

export default function PorQue() {
  const [ativo, setAtivo] = useState(0);
  const p = PESSOAS[ativo];
  return (
    <section aria-labelledby="por-que" className="ds-secao bg-white">
      <div className="ds-wrap grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:items-center">
        <div>
          <h2 id="por-que" className="font-serif text-t1 text-[#0B1F45] font-normal tracking-[-0.02em] max-w-[22ch] text-balance">
            A Amazônia merece revestimentos feitos para ela.
          </h2>
          <p className="mt-4 text-lead text-[#43474e] max-w-[44ch] text-pretty">
            Aqui o clima é quente e úmido o ano inteiro, e a mão de obra tem a sua realidade. Então escolhemos materiais que aguentam o nosso clima e que as equipes daqui conseguem executar bem.
          </p>

          <div role="tablist" aria-label="Quem ganha com isso" className="mt-8 flex gap-2">
            {PESSOAS.map((x, i) => (
              <button key={x.id} id={`porque-aba-${x.id}`} type="button" role="tab" aria-selected={ativo === i} aria-controls="porque-painel"
                onClick={() => setAtivo(i)}
                className={`min-h-11 px-4 rounded-full border text-legenda font-semibold transition-colors ${
                  ativo === i ? "bg-[#0B1F45] border-[#0B1F45] text-white" : "border-[#0B1F45]/20 text-[#0B1F45] hover:border-[#0B1F45]/50"
                }`}>
                {x.rotulo}
              </button>
            ))}
          </div>

          <div id="porque-painel" role="tabpanel" aria-labelledby={`porque-aba-${p.id}`} aria-live="polite" className="mt-6 min-h-[7.5rem]">
            <p key={p.id} className="hm-troca font-serif text-t2 text-[#0B1F45] text-balance">{p.frase}</p>
            <p key={`${p.id}-t`} className="hm-troca mt-2 text-corpo text-[#43474e] max-w-[40ch]">{p.texto}</p>
          </div>
        </div>

        <div className="relative aspect-[4/3] lg:aspect-[5/6] overflow-hidden bg-[#E8E6E1]">
          {PESSOAS.map((x, i) => (
            <Image key={x.id} src={x.imagem.src} alt={ativo === i ? x.imagem.alt : ""} aria-hidden={ativo !== i} fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              style={{ objectPosition: x.imagem.posicao }}
              className={`object-cover transition-opacity duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${ativo === i ? "opacity-100" : "opacity-0"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
