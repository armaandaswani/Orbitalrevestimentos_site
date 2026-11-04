"use client";

import { useState } from "react";
import Lupa from "@/components/movimento/Lupa";
import {
  ESPESSURA_MM, FORMATOS, MODELOS_TECHSTONE, texturaDownload, texturaMiniatura,
  type FormatoTechStone, type ModeloTechStone,
} from "@/lib/techstone";

/** Para que serve cada tamanho (texto aprovado pelo dono). */
const USO: Record<FormatoTechStone, string> = {
  "1200x600": "Para detalhes, nichos e paginações.",
  "2400x1200": "Para panos contínuos, com menos juntas.",
};

/**
 * Os dois tamanhos e os modelos de cada um, numa seção só: o visitante escolhe
 * o tamanho, vê a placa em escala ao lado de uma pessoa de 1,70 m e os
 * modelos daquele tamanho (textura para baixar e "Tenho interesse"). No
 * celular os modelos correm de lado, para a seção não virar uma lista longa.
 */
export default function Tamanhos({ tamanho, escolher, interesse }: {
  tamanho: FormatoTechStone;
  escolher: (t: FormatoTechStone) => void;
  /** Abre a lista de espera com este modelo já marcado. */
  interesse: (nome: string) => void;
}) {
  const lista = MODELOS_TECHSTONE.filter((m) => m.formato === tamanho);
  // O modelo escolhido só vale se for do tamanho atual; senão cai no primeiro da lista.
  // Derivar assim evita um efeito (e uma renderização a mais) ao trocar de aba.
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const modeloAtivo = lista.find((m) => m.slug === escolhido) ?? lista[0];
  return (
    <section id="tamanhos" data-tamanho={tamanho} aria-labelledby="ts-tamanhos" className="ts-tamanhos bg-[#EFEBE4] ds-secao scroll-mt-16">
      <div className="ds-wrap">
        <h2 id="ts-tamanhos" className="font-serif text-t1 text-[#22201C]">Dois tamanhos.</h2>
        <p className="mt-3 text-lead text-[#4A4540] max-w-[46ch]">
          Os dois com {ESPESSURA_MM}&nbsp;mm de espessura. Escolha um para ver a escala e os modelos.
        </p>

        <div role="tablist" aria-label="Tamanho da placa" className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 max-w-2xl">
          {FORMATOS.map((f) => {
            const ativo = f.value === tamanho;
            const n = MODELOS_TECHSTONE.filter((m) => m.formato === f.value).length;
            return (
              <button key={f.value} id={`ts-aba-${f.value}`} type="button" role="tab" aria-selected={ativo} aria-controls="ts-painel-tamanho"
                onClick={() => escolher(f.value)}
                className={`text-left px-3 py-4 sm:px-6 sm:py-5 border transition-colors duration-300 ${
                  ativo ? "bg-[#22201C] border-[#22201C] text-white" : "border-[#22201C]/20 text-[#22201C] hover:border-[#22201C]/50"
                }`}>
                <span className="block font-serif text-[1rem] min-[400px]:text-[1.125rem] sm:text-t3 leading-tight whitespace-nowrap tabular-nums">{f.rotulo}</span>
                <span className={`mt-1.5 block text-legenda ${ativo ? "text-white/70" : "text-[#6B6158]"}`}>{f.medida} · {n} modelos</span>
              </button>
            );
          })}
        </div>

        <div id="ts-painel-tamanho" role="tabpanel" aria-labelledby={`ts-aba-${tamanho}`}
          className="mv-brilho-fonte mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:items-center">
          <Escala modelo={modeloAtivo} />
          <div>
            <p className="font-serif text-t2 text-[#22201C] max-w-[22ch]">{USO[tamanho]}</p>
            <ul aria-label={`Modelos em ${FORMATOS.find((f) => f.value === tamanho)!.rotulo}`}
              className="mt-8 flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-[clamp(1rem,4.2vw,4rem)] px-[clamp(1rem,4.2vw,4rem)] scroll-px-[clamp(1rem,4.2vw,4rem)] pb-2 sm:mx-0 sm:px-0 sm:scroll-px-0 sm:grid sm:grid-cols-5 sm:gap-x-4 sm:overflow-visible">
              {/* Do sm para cima cada item ocupa 3 linhas da grade (textura, nome, ações) em subgrade:
                  as linhas são compartilhadas, então nomes de 1, 2 ou 3 linhas não desalinham os links. */}
              {lista.map((m) => (
                <li key={m.slug} className="snap-start shrink-0 w-[38%] sm:w-auto sm:row-span-3 sm:grid sm:grid-rows-subgrid">
                  <button type="button" onClick={() => setEscolhido(m.slug)}
                    aria-pressed={m.slug === modeloAtivo.slug} aria-label={`Ver ${m.nome} na placa`}
                    className="ts-modelo relative block w-full text-left">
                    {/* Lupa: passar o mouse (ou segurar 250 ms no celular) mostra a textura 2,5× do arquivo grande;
                        o clique/toque rápido continua escolhendo o modelo. */}
                    <Lupa fonte={texturaDownload(m)}>
                      <span className="mv-brilho relative block aspect-[1/2] overflow-hidden bg-[#D9D1C4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={texturaMiniatura(m)} alt="" loading="lazy" decoding="async"
                          className="absolute inset-0 w-full h-full object-cover" />
                      </span>
                    </Lupa>
                    <span aria-hidden className="ts-modelo-linha" />
                  </button>
                  <h3 className="mt-3 min-h-[2lh] sm:min-h-0 font-serif text-[1rem] leading-snug text-[#22201C]">{m.nome}</h3>
                  <div className="mt-1 flex flex-col items-start">
                    <a href={texturaDownload(m)} download className="min-h-10 inline-flex items-center text-legenda text-[#22201C] underline underline-offset-4 decoration-[#22201C]/30 hover:decoration-[#22201C]">
                      Baixar textura
                    </a>
                    <button type="button" onClick={() => interesse(m.nome)}
                      className="min-h-10 inline-flex items-center text-legenda font-semibold text-[#1F7A44] hover:text-[#22201C]">
                      Tenho interesse
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sobre text-[#8C7B63]">A cor real pode variar um pouco em relação à tela.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Pessoa de 1,70 m em traço de planta, para dar escala à placa. */
function Pessoa() {
  return (
    <g fill="none" stroke="#22201C" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="420" cy="1012" r="102" />
      <path d="M420 1114 L420 1690 M300 1300 Q420 1180 540 1300 M420 1690 L340 2300 L330 2600 M420 1690 L500 2300 L510 2600 M300 1300 L270 1760 M540 1300 L570 1760" />
    </g>
  );
}

/** Cota de desenho técnico: linha com traços nas pontas e a medida no meio. */
function Cota({ x1, y1, x2, y2, texto, vertical = false }: {
  x1: number; y1: number; x2: number; y2: number; texto: string; vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g stroke="#8C7B63" strokeWidth="8" fill="#8C7B63">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - 40} y1={y1} x2={x1 + 40} y2={y1} />
          <line x1={x2 - 40} y1={y2} x2={x2 + 40} y2={y2} />
          {texto && <text x={x1 + 70} y={my} stroke="none" fontSize="86" dominantBaseline="middle" fontFamily="var(--font-inter)">{texto}</text>}
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 40} x2={x1} y2={y1 + 40} />
          <line x1={x2} y1={y2 - 40} x2={x2} y2={y2 + 40} />
          <text x={mx} y={my + 120} stroke="none" fontSize="86" textAnchor="middle" fontFamily="var(--font-inter)">{texto}</text>
        </>
      )}
    </g>
  );
}

/**
 * Placa em escala exata ao lado da pessoa, com a textura do modelo escolhido.
 * O CSS dobra a placa no tamanho grande. Ao trocar de modelo a textura nova
 * entra em fusão por cima da anterior, que fica embaixo até a fusão acabar.
 */
function Escala({ modelo }: { modelo: ModeloTechStone }) {
  const textura = texturaMiniatura(modelo);
  // Guarda a textura anterior no próprio estado (ajuste durante a renderização,
  // sem efeito) para poder empilhar as duas.
  const [par, setPar] = useState<{ atual: string; anterior: string | null }>({ atual: textura, anterior: null });
  if (par.atual !== textura) setPar({ atual: textura, anterior: par.atual });
  // Unidades do desenho em milímetros. Chão em y = 2600; placa encostada nele.
  const X = 1000, CHAO = 2600;
  const placa = { x: X, y: CHAO - 1200, width: 600, height: 1200, preserveAspectRatio: "xMidYMid slice" } as const;
  return (
    <svg viewBox="-260 0 3460 2900" className="w-full max-h-[48svh] lg:max-h-[62svh]" role="img"
      aria-label={`Placa TechStone ${modelo.nome} em escala ao lado de uma pessoa de 1,70 metro`}>
      <line x1="80" y1={CHAO} x2="3120" y2={CHAO} stroke="#22201C" strokeWidth="8" />
      <Pessoa />
      <g stroke="#8C7B63" strokeWidth="8" fill="#8C7B63">
        <line x1="190" y1={CHAO} x2="190" y2="910" />
        <line x1="150" y1={CHAO} x2="230" y2={CHAO} />
        <line x1="150" y1="910" x2="230" y2="910" />
        <text x="120" y="1755" stroke="none" fontSize="86" textAnchor="end" dominantBaseline="middle" fontFamily="var(--font-inter)">1,70 m</text>
      </g>
      <g className="ts-folha">
        {par.anterior && <image key={par.anterior} href={par.anterior} {...placa} />}
        <image key={par.atual} href={par.atual} {...placa} className={par.anterior ? "ts-folha-entra" : undefined} />
        {/* Contorno fino: non-scaling mantém 1,5 px na tela mesmo com a placa dobrada. */}
        <rect x={X} y={CHAO - 1200} width="600" height="1200" fill="none" stroke="#22201C" strokeOpacity={0.7}
          strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </g>
      <g className="ts-cota ts-cota-pequena">
        <Cota x1={X} y1={CHAO + 60} x2={X + 600} y2={CHAO + 60} texto="600" />
        <Cota x1={X + 700} y1={CHAO} x2={X + 700} y2={CHAO - 1200} texto="1200" vertical />
      </g>
      <g className="ts-cota ts-cota-grande">
        <Cota x1={X} y1={CHAO + 60} x2={X + 1200} y2={CHAO + 60} texto="1200" />
        <Cota x1={X + 1300} y1={CHAO} x2={X + 1300} y2={CHAO - 2400} texto="2400" vertical />
      </g>
    </svg>
  );
}
