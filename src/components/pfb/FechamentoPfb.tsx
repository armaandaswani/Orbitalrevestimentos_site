import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import { coverStyle } from "@/lib/cover-crop";
import { separarLugares } from "@/lib/pfb-lugares";
import { PEDIR } from "@/lib/pfb-textos";
import { nomeLugar, type Showroom } from "@/lib/projetos-tipos";

/**
 * Capítulo 11 da página do PFB: onde ver e como pedir (spec
 * 2026-11-07-pfb-experiencia, Tabela, linha 11). Creme, com 96 px de respiro
 * antes do rodapé.
 *
 * Os lugares vêm de `carregarLugares()` e passam por `separarLugares`: até seis
 * showrooms numa grade 3 × 2 de miniaturas quadradas (108 px no celular, menores
 * abaixo de ~360 px de largura para caberem com 12 px entre elas; 160 no
 * computador), cada uma um link para a página do showroom, com só o nome
 * embaixo, inteiro, em até duas linhas (o nome como marca, `nomeLugar`, como
 * no resto do site; `line-clamp-2` só como segurança para um nome maior); sem capa, o quadrado azul-noite vazio. Sem showroom, a grade some.
 * As revendas não são listadas aqui: um link só, "Revendas em Manaus", leva a
 * /onde-comprar, que mostra cada loja com mapa, horário e WhatsApp. Nome do
 * banco sempre dentro de `[data-texto-banco]`.
 *
 * Depois: o pedido de orçamento, o botão do consultor e o link para
 * /projetos. No computador, o texto à esquerda e os lugares à direita.
 */
export default function FechamentoPfb({ lugares }: { lugares: Showroom[] }) {
  const { showrooms, revendas } = separarLugares(lugares);
  return (
    <section
      id="como-pedir"
      data-capitulo="como-pedir"
      aria-labelledby="pfb-pedir-titulo"
      className="bg-[#F6F5F2] pt-12 pb-24 lg:pt-24 lg:pb-24"
    >
      <div className="ds-wrap lg:grid lg:grid-cols-[minmax(0,1fr)_528px] lg:grid-rows-[auto_1fr] lg:gap-x-16">
        <div className="lg:col-start-1 lg:row-start-1">
          <h2 id="pfb-pedir-titulo" className="font-serif pfb-t1 text-[#0B1F45]">
            {PEDIR.titulo}
          </h2>
          <p className="pfb-corpo text-[#43474e] mt-6 lg:mt-8">{PEDIR.frase}</p>
        </div>

        {(showrooms.length > 0 || revendas.length > 0) && (
          <div className="mt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
            {showrooms.length > 0 && (
              <ul className="grid grid-cols-[repeat(3,minmax(0,108px))] justify-between gap-x-3 gap-y-4 lg:grid-cols-[repeat(3,160px)] lg:gap-y-6">
                {showrooms.map((lugar) => (
                  <li key={lugar.id}>
                    <Link
                      href={`/projetos/showroom/${lugar.slug}`}
                      data-teste="lugar"
                      data-tipo={lugar.kind}
                      data-texto-banco
                      className="group block text-[#0B1F45]"
                    >
                      <span className="relative block aspect-square overflow-hidden bg-[#0B1F45]">
                        {lugar.display_cover && (
                          <Image
                            src={lugar.display_cover}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 160px, 108px"
                            style={coverStyle(lugar.display_focus_x, lugar.display_focus_y, lugar.display_zoom)}
                          />
                        )}
                      </span>
                      <span className="mt-2 block line-clamp-2 pfb-legenda group-hover:underline group-hover:underline-offset-4">
                        {nomeLugar(lugar.name)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {revendas.length > 0 && (
              <p className={`pfb-legenda ${showrooms.length > 0 ? "mt-4 lg:mt-6" : ""}`}>
                <Link
                  href="/onde-comprar"
                  prefetch={false}
                  data-teste="revendas"
                  className="inline-flex min-h-11 items-center text-[#0B1F45] underline underline-offset-4 hover:text-[#2347A0]"
                >
                  {PEDIR.revendas}
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="mt-6 lg:col-start-1 lg:row-start-2 lg:mt-8">
          <p className="pfb-corpo text-[#43474e]">{PEDIR.orcamento}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <ContatoCta origem="pfb-como-pedir" className="ds-botao ds-botao-cheio lg:min-h-12">
              {PEDIR.botaoConsultor}
            </ContatoCta>
            <Link href="/projetos" className="inline-flex min-h-11 items-center text-[#0B1F45] underline underline-offset-4 hover:text-[#2347A0]">
              {PEDIR.reserva.link}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
