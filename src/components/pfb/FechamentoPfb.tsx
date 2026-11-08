import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import LugarCard from "@/components/projetos/LugarCard";
import Revelar from "@/components/projetos/Revelar";
import { CATALOGO_PATH } from "@/lib/product-link";
import { PEDIR } from "@/lib/pfb-textos";
import { parceirosNaGrade } from "@/lib/pontos-de-venda";
import type { Showroom } from "@/lib/projetos-tipos";

/**
 * Seção 6 da página do PFB: onde ver e como pedir (spec, item 28 e "Seção 6").
 *
 * A grade de lugares é a mesma de /projetos#parceiros (LugarCard compacto),
 * sem onAbrir: os showrooms levam à página do lugar e um cartão só, "Pontos de
 * venda", leva a /onde-comprar (parceirosNaGrade). Cada cartão vai num envoltório
 * com data-teste="lugar", data-tipo (showroom ou revenda) e data-texto-banco
 * (o nome vem do banco). Como o cartão entra sempre, a frase de reserva com o
 * link para /projetos#parceiros só aparece se a grade vier vazia; o caminho
 * fica, como a spec pede.
 *
 * `agora` vem da página (Date.now() na renderização do servidor), para o selo
 * "Novo" dos lugares.
 */
export default function FechamentoPfb({ lugares, agora }: { lugares: Showroom[]; agora: number }) {
  // Os showrooms e o cartão único "Pontos de venda" (as revendas ficam em /onde-comprar).
  const grade = parceirosNaGrade(lugares);
  return (
    <section id="como-pedir" aria-labelledby="pfb-pedir-titulo" className="ds-secao bg-[#F6F5F2] scroll-mt-20">
      <div className="ds-wrap">
        <Revelar>
          <h2 id="pfb-pedir-titulo" className="font-serif text-t2 text-[#0B1F45]">{PEDIR.titulo}</h2>
          <p className="text-corpo text-[#43474e] mt-4">{PEDIR.frase}</p>
        </Revelar>

        {grade.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mt-8">
            {grade.map((lugar) => (
              <li key={lugar.id}>
                <div data-teste="lugar" data-tipo={lugar.kind} data-texto-banco className="h-full">
                  <LugarCard compacto lugar={lugar} agora={agora} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-corpo text-[#43474e] mt-8">
            {PEDIR.reserva.frase}{" "}
            <Link href="/projetos#parceiros" className="text-[#0B1F45] underline underline-offset-4">{PEDIR.reserva.link}</Link>
          </p>
        )}

        <Revelar ordem={1} className="mt-12">
          <h3 className="font-serif text-t3 text-[#0B1F45]">{PEDIR.orcamento.titulo}</h3>
          {PEDIR.orcamento.paragrafos.map((p) => (
            <p key={p} className="text-corpo text-[#43474e] mt-3 max-w-[40rem]">{p}</p>
          ))}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <ContatoCta origem="pfb-fechamento" className="ds-botao ds-botao-cheio min-h-12">
              {PEDIR.botaoConsultor}
            </ContatoCta>
            <Link href={CATALOGO_PATH} className="ds-botao ds-botao-vazado min-h-12">
              {PEDIR.botaoModelos}
            </Link>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
