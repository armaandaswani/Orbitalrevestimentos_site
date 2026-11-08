import SolicitarManual from "@/components/SolicitarManual";
import { SERVE } from "@/lib/pfb-textos";

/**
 * Capítulo 9 da página do PFB: serve para o meu projeto? (spec
 * 2026-11-07-pfb-experiencia, Tabela, linha 9). Creme, o título e três blocos
 * que abrem ao tocar, um por vez (`details name="serve"`, fechados ao
 * carregar): onde usar, onde não usar e como instalar. O resumo de cada um
 * fica à vista com o bloco fechado; o "+" gira 45° com o bloco aberto
 * (`.pfb-mais`, o mesmo da ficha completa). O último bloco termina com o link
 * do manual; o diálogo dele vai para o body por portal, sem div dentro do p.
 *
 * No computador, o título à esquerda e os blocos à direita.
 */
export default function ServePfb() {
  const blocos = [SERVE.ondeUsar, SERVE.ondeNaoUsar, SERVE.comoInstalar] as const;
  return (
    <section
      id="onde-usar"
      data-capitulo="onde-usar"
      aria-labelledby="pfb-serve-titulo"
      className="bg-[#F6F5F2] py-12 lg:py-24"
    >
      <div className="ds-wrap lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:items-start">
        <h2 id="pfb-serve-titulo" className="font-serif pfb-t1 text-[#0B1F45]">
          {SERVE.titulo}
        </h2>
        <div className="mt-6 border-t border-[#74777f]/30 lg:mt-0">
          {blocos.map((bloco) => (
            <details key={bloco.titulo} name="serve" data-teste="serve-bloco" className="border-b border-[#74777f]/30">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[#0B1F45] [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block font-serif pfb-t3">{bloco.titulo}</span>
                  <span className="mt-0.5 block pfb-legenda text-[#43474e]">{bloco.resumo}</span>
                </span>
                <span aria-hidden="true" className="pfb-mais text-[1.5rem] leading-none">
                  +
                </span>
              </summary>
              <div className="flex flex-col gap-2 pb-4 text-[14px] leading-[22px] text-[#43474e] lg:max-w-[60ch]">
                {bloco.paragrafos.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {bloco === SERVE.comoInstalar && (
                  <p>
                    {SERVE.comoInstalar.antesDoManual}
                    <SolicitarManual variant="link" tom="claro" />
                    {SERVE.comoInstalar.depoisDoManual}
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
