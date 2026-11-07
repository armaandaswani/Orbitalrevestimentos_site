import Image from "next/image";
import Link from "next/link";
import { LINHAS_PFB } from "@/lib/pfb-linhas";
import type { ModeloVitrine } from "@/lib/pfb-modelos";
import { catalogoPath } from "@/lib/product-link";
import { LINHAS } from "@/lib/pfb-textos";

type Linha = "Classic" | "Brilliance" | "Elegance";

const seta = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta flex-shrink-0">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

/**
 * Seção 4 da página do PFB: as três linhas (spec, item 26 e "Seção 4").
 *
 * Uma faixa por linha, separadas só por espaço. Com modelos: duas miniaturas
 * (as duas primeiras da linha por sort_order) e, a partir do sm, o bloco-link
 * azul na terceira célula; no celular o bloco vira um botão vazado abaixo da
 * grade (os dois links existem, um sempre escondido). Sem modelos (banco
 * indisponível): só o botão vazado, abaixo do texto. Nenhum código de modelo é
 * impresso. O nome e o alt das miniaturas vêm do banco (data-texto-banco).
 */
export default function LinhasPfb({ modelos }: { modelos: Record<Linha, ModeloVitrine[]> }) {
  return (
    <section id="linhas" aria-labelledby="pfb-linhas-titulo" className="ds-secao bg-[#F6F5F2] scroll-mt-20">
      <div className="ds-wrap">
        <h2 id="pfb-linhas-titulo" className="font-serif text-t2 text-[#0B1F45]">{LINHAS.titulo}</h2>
        <p className="text-lead text-[#43474e] mt-4">{LINHAS.lead}</p>

        {LINHAS_PFB.map(({ chave, frases }) => {
          const daLinha = modelos[chave] ?? [];
          const href = catalogoPath({ linha: chave });
          const botao = (classe: string) => (
            <Link href={href} data-teste="ver-linha" className={`ds-botao ds-botao-vazado ${classe}`}>
              {LINHAS.verModelos(chave)}
            </Link>
          );
          return (
            <div key={chave} className="py-10 lg:py-14 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 items-center">
              <div>
                <h3 className="font-serif text-t3 text-[#0B1F45]">{chave}</h3>
                <p className="text-corpo text-[#43474e] mt-3">{frases.join(" ")}</p>
                {daLinha.length === 0 && botao("mt-6")}
              </div>
              {daLinha.length > 0 && (
                <div>
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {daLinha.map((m) => (
                      <li key={m.code}>
                        <Link href={catalogoPath({ modelo: m.code })} data-teste="miniatura" className="block">
                          <div className="mv-brilho relative aspect-[3/4] bg-[#e8e6e1]">
                            <Image
                              src={m.image_path}
                              alt={`${m.name}, linha ${m.linha}`}
                              fill
                              sizes="(min-width: 1024px) 18vw, 30vw"
                              className="object-cover"
                              data-texto-banco
                            />
                          </div>
                          <span data-texto-banco className="block text-legenda text-[#0B1F45] mt-2">{m.name}</span>
                        </Link>
                      </li>
                    ))}
                    <li className="hidden sm:block">
                      <Link href={href} data-teste="ver-linha" className="aspect-[3/4] bg-[#0B1F45] text-white p-4 flex items-end">
                        <span className="inline-flex items-center gap-2">{LINHAS.verModelos(chave)}{seta}</span>
                      </Link>
                    </li>
                  </ul>
                  {botao("mt-6 sm:hidden")}
                </div>
              )}
            </div>
          );
        })}

        <p className="text-legenda text-[#43474e]">{LINHAS.aviso}</p>
      </div>
    </section>
  );
}
