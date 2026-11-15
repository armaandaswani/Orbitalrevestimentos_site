import Link from "next/link";
import CartoesParceria from "@/components/parcerias/CartoesParceria";
import { capasDeParceria } from "@/lib/parcerias-capas";
import { CARTOES_PARCERIA, PERFIS, PORTA } from "@/lib/parcerias-textos";

/**
 * /parcerias: a porta de entrada. Uma tela com o título, uma frase e um cartão
 * por perfil; o conteúdo de cada um mora na sua página (/parcerias/arquitetos,
 * /marceneiros, /engenheiros), com o cadastro já no perfil certo. Revendedores
 * vão para a seção de revenda em /onde-comprar e aplicadores, para a Academia.
 *
 * As fotos dos três perfis são capas de obras reais (parcerias-capas), então a
 * página republica de hora em hora.
 */
export const revalidate = 3600;

export default async function ParceriasPage() {
  const capas = await capasDeParceria();
  const cartoes = CARTOES_PARCERIA.map((c) => {
    const perfil = PERFIS.find((p) => c.href === `/parcerias/${p.slug}`);
    const capa = perfil ? capas[perfil.slug] : c.nome === "Revendedores" ? capas.revendedores : null;
    return capa ? { ...c, imagem: capa.src, foco: capa.foco } : c;
  });

  return (
    <main className="bg-[#F6F5F2] pt-20">
      <section aria-labelledby="parcerias-titulo" className="ds-wrap pb-16 pt-10 lg:pb-16 lg:pt-12">
        <h1 id="parcerias-titulo" className="font-serif text-t1 text-[#0B1F45] text-balance max-w-[24ch]">{PORTA.titulo}</h1>
        <p className="mt-3 text-lead text-[#43474e]">{PORTA.lead}</p>
        <CartoesParceria cartoes={cartoes} />
        <p className="mt-10 text-corpo text-[#43474e]">
          {PORTA.portal}{" "}
          <Link href="/parceiro" className="font-semibold text-[#0B1F45] underline underline-offset-4 decoration-[#0B1F45]/30 hover:decoration-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
            {PORTA.portalLink}
          </Link>
        </p>
      </section>
    </main>
  );
}
