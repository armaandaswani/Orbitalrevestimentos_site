"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Lupa from "@/components/movimento/Lupa";
import ListaEsperaSheet from "@/components/ListaEsperaSheet";
import {
  CATALOGO_ESPERA, DO_TAMANHO, ESPESSURA_MM, FORMATOS, MODELOS_TECHSTONE, USO_TAMANHO,
  catalogoTechStone, texturaDownload, texturaMiniatura, type FormatoTechStone,
} from "@/lib/techstone";

export type FiltroCatalogo = "todos" | FormatoTechStone;

const ABAS: { value: FiltroCatalogo; rotulo: string; detalhe: string }[] = [
  { value: "todos", rotulo: "Todos", detalhe: `${MODELOS_TECHSTONE.length} modelos` },
  ...FORMATOS.map((f) => ({ value: f.value, rotulo: f.rotulo, detalhe: `${DO_TAMANHO[f.value].length} modelos` })),
];

/**
 * O catálogo com o filtro que veio na URL (?tamanho=). Lido no navegador, para
 * a página continuar estática: ler o searchParams no servidor a faria rodar
 * uma função a cada visita. Precisa de <Suspense> em volta (useSearchParams).
 */
export function CatalogoDaUrl() {
  const pedido = useSearchParams().get("tamanho");
  const inicial: FiltroCatalogo = FORMATOS.find((f) => f.value === pedido)?.value ?? "todos";
  // key: chegar por outro ?tamanho= volta a montar com o filtro novo.
  return <CatalogoTechStone key={inicial} inicial={inicial} />;
}

/**
 * Catálogo da TechStone: os modelos em grade, com o filtro de tamanho
 * (?tamanho= na URL, para as ideias abrirem já num deles), a textura para
 * baixar e o "Tenho interesse", que abre a lista de espera com o modelo marcado.
 * A Lupa mostra a textura ampliada ao passar o mouse ou segurar o dedo.
 */
export default function CatalogoTechStone({ inicial }: { inicial: FiltroCatalogo }) {
  const [filtro, setFiltro] = useState<FiltroCatalogo>(inicial);
  const escolher = useCallback((f: FiltroCatalogo) => {
    setFiltro(f);
    window.history.replaceState(window.history.state, "", catalogoTechStone(f === "todos" ? undefined : f));
  }, []);

  const [espera, setEspera] = useState<{ aberto: boolean; modelos: string[] }>({ aberto: false, modelos: [] });
  const abrirEspera = useCallback((modelos: string[] = []) => setEspera({ aberto: true, modelos }), []);
  const fecharEspera = useCallback(() => setEspera((e) => ({ ...e, aberto: false })), []);

  const lista = filtro === "todos" ? MODELOS_TECHSTONE : DO_TAMANHO[filtro];

  return (
    <div className="bg-[#EFEBE4] min-h-[100svh] pt-28 sm:pt-32 pb-20">
      <div className="ds-wrap">
        <Link href="/techstone"
          className="inline-flex items-center min-h-11 text-legenda text-[#4A4540] underline underline-offset-4 decoration-[#22201C]/30 hover:decoration-[#22201C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22201C]">
          Voltar para a TechStone
        </Link>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-serif text-t1 text-[#22201C]">Catálogo TechStone</h1>
            <p className="mt-4 text-lead text-[#4A4540] max-w-[46ch]">
              Pedra e madeira em placas de {ESPESSURA_MM}&nbsp;mm. Baixe a textura e veja o modelo no seu projeto.
            </p>
          </div>
          <button type="button" onClick={() => abrirEspera()}
            className="ds-botao bg-[#22201C] text-white hover:bg-[#4A4540] min-h-12 px-8 whitespace-nowrap self-start lg:self-auto shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22201C]">
            Entrar na lista de espera
          </button>
        </div>

        {/* Filtro, não abas: botões de alternância (aria-pressed), que o teclado percorre com Tab. */}
        <div role="group" aria-label="Filtrar por tamanho" className="mt-10 grid grid-cols-3 gap-2 sm:gap-3 max-w-3xl">
          {ABAS.map((a) => {
            const ativo = a.value === filtro;
            return (
              <button key={a.value} id={`tsc-aba-${a.value}`} type="button" aria-pressed={ativo}
                onClick={() => escolher(a.value)}
                className={`text-left px-3 py-3.5 sm:px-5 sm:py-4 border transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22201C] ${
                  ativo ? "bg-[#22201C] border-[#22201C] text-white" : "border-[#22201C]/20 text-[#22201C] hover:border-[#22201C]/50"
                }`}>
                <span className="block font-serif text-[0.9375rem] min-[400px]:text-[1.0625rem] sm:text-t3 leading-tight whitespace-nowrap tabular-nums">{a.rotulo}</span>
                <span className={`mt-1 block text-legenda ${ativo ? "text-white/70" : "text-[#6B6158]"}`}>{a.detalhe}</span>
              </button>
            );
          })}
        </div>

        <div id="tsc-painel" className="mt-8">
          {filtro !== "todos" && (
            <p className="mb-6 font-serif text-t3 text-[#22201C]">{USO_TAMANHO[filtro]}</p>
          )}
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-x-4">
            {lista.map((m, i) => (
              <li key={m.slug} className="min-w-0 row-span-4 grid grid-rows-subgrid gap-y-0">
                <Lupa fonte={texturaDownload(m)}>
                  <span className="relative block aspect-[1/2] overflow-hidden bg-[#D9D1C4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={texturaMiniatura(m)} alt={`Textura TechStone ${m.nome}`} loading={i < 6 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} decoding="async"
                      className="absolute inset-0 w-full h-full object-cover" />
                  </span>
                </Lupa>
                <h2 className="mt-3 font-serif text-[1.0625rem] leading-snug text-[#22201C]">{m.nome}</h2>
                <p className="mt-0.5 text-legenda text-[#6B6158] tabular-nums">
                  {FORMATOS.find((f) => f.value === m.formato)!.rotulo}, {m.aparencia === "pedra" ? "pedra" : "madeira"}
                </p>
                <div className="mt-1 flex flex-col items-start">
                  <a href={texturaDownload(m)} download
                    className="min-h-10 inline-flex items-center text-legenda text-[#22201C] underline underline-offset-4 decoration-[#22201C]/30 hover:decoration-[#22201C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22201C]">
                    Baixar textura
                  </a>
                  <button type="button" onClick={() => abrirEspera([m.nome])}
                    className="min-h-10 inline-flex items-center text-legenda font-semibold text-[#1F7A44] hover:text-[#22201C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22201C]">
                    Tenho interesse
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sobre text-[#8C7B63]">A cor real pode variar um pouco em relação à tela.</p>
        </div>
      </div>

      <ListaEsperaSheet
        aberto={espera.aberto}
        fechar={fecharEspera}
        linha="techstone"
        nomeLinha="TechStone"
        catalogo={CATALOGO_ESPERA}
        modelosIniciais={espera.modelos}
      />
    </div>
  );
}
