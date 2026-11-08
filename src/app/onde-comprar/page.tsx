import type { Metadata } from "next";
import { lerPontosDeVenda } from "@/lib/pontos-de-venda-server";
import { TITULO_META_PDV, TITULO_PDV, subtituloPdv } from "@/lib/onde-comprar-textos";
import MapaManaus from "@/components/onde-comprar/MapaManaus";
import ListaPdv from "@/components/onde-comprar/ListaPdv";
import IlhaPdv from "@/components/onde-comprar/IlhaPdv";

/**
 * /onde-comprar: as revendas do Painel Flexível em Fibra de Bambu em Manaus,
 * no mapa e em lista. Estática com ISR de 5 min, o mesmo prazo de /projetos.
 * Se o banco falhar (ou não houver loja ativa), a página lança: no build, o
 * build falha; em produção, o ISR mantém a última versão boa.
 */
export const revalidate = 300;

const SITE = "https://orbitalrevestimentos.com.br";
// Tirada da regra de revenda aprovada para o chat (textos.md, seção 8).
const DESCRICAO = "As lojas de Manaus que revendem o Painel Flexível em Fibra de Bambu, no mapa, com endereço, horário e o WhatsApp de cada uma.";
// A mesma imagem do layout raiz (o openGraph da página troca o do layout inteiro).
const IMAGEM_OG = {
  url: "/images/catalogue/hero-cover.png",
  width: 1200,
  height: 630,
  alt: "Orbital Revestimentos: PFB instalado em interior premium",
};

export const metadata: Metadata = {
  // O modelo do layout raiz completa com " | Orbital Revestimentos".
  title: TITULO_META_PDV,
  description: DESCRICAO,
  alternates: { canonical: `${SITE}/onde-comprar` },
  openGraph: {
    title: `${TITULO_META_PDV} | Orbital Revestimentos`,
    description: DESCRICAO,
    url: `${SITE}/onde-comprar`,
    images: [IMAGEM_OG],
  },
  // O bloco twitter do layout raiz não vale aqui (o objeto é trocado inteiro).
  twitter: {
    card: "summary_large_image",
    title: `${TITULO_META_PDV} | Orbital Revestimentos`,
    description: DESCRICAO,
    images: [IMAGEM_OG.url],
  },
};

export default async function OndeComprarPage() {
  const { pontos, erro } = await lerPontosDeVenda();
  if (erro) throw new Error(erro);

  return (
    <main className="pt-20">
      <div className="ds-wrap pb-2 pt-7 lg:pb-8 lg:pt-14">
        <h1 className="font-serif text-t1 font-normal tracking-[-0.02em] text-primary">{TITULO_PDV}</h1>
        <p className="mt-3 max-w-[34ch] text-lead text-on-surface">{subtituloPdv(pontos.length)}</p>
      </div>
      <div className="lg:ds-wrap lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:pb-24">
        <div className="lg:sticky lg:top-24">
          <MapaManaus pontos={pontos} />
        </div>
        <ListaPdv pontos={pontos} />
      </div>
      <IlhaPdv slugs={pontos.map((p) => p.slug)} pontos={pontos} />
    </main>
  );
}
