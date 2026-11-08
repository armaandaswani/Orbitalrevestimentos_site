import type { Metadata } from "next";
import { lerPontosDeVenda } from "@/lib/pontos-de-venda-server";
import { SCRIPT_ABERTURA_PDV } from "@/lib/pontos-de-venda";
import AberturaPdv from "@/components/onde-comprar/AberturaPdv";
import { TITULO_META_PDV, TITULO_PDV, subtituloPdv } from "@/lib/onde-comprar-textos";
import MapaManaus from "@/components/onde-comprar/MapaManaus";
import ListaPdv from "@/components/onde-comprar/ListaPdv";
import IlhaPdv from "@/components/onde-comprar/IlhaPdv";
import { nomeLugar } from "@/lib/projetos-tipos";

/**
 * /onde-comprar: as revendas do Painel Flexível em Fibra de Bambu em Manaus,
 * no mapa e em lista. Estática com ISR de 5 min, o mesmo prazo de /projetos.
 * Se o banco falhar (ou não houver loja ativa), a página lança: no build, o
 * build falha; em produção, o ISR mantém a última versão boa.
 */
export const revalidate = 300;

const SITE = "https://orbitalrevestimentos.com.br";
// Texto do controlador (humanizer e marca aplicados), rodada 1 da Tarefa 7.
const DESCRICAO = "Veja no mapa as lojas de Manaus que revendem o Painel Flexível em Fibra de Bambu, com endereço, horário e WhatsApp de cada uma.";
// A mesma imagem do layout raiz (o openGraph da página troca o do layout inteiro).
const IMAGEM_OG = {
    url: "/images/catalogue/hero-cover.png",
  width: 1200,
  height: 630,
  alt: "Orbital Revestimentos: Painel Flexível em Fibra de Bambu instalado numa sala de estar",
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
  const { pontos: lidos, erro } = await lerPontosDeVenda();
  if (erro) throw new Error(erro);
  // O nome curto sai pronto daqui: o projetos-tipos.ts fica fora do JS do cliente.
  const pontos = lidos.map((p) => ({ ...p, nomeCurto: nomeLugar(p.name) }));

  return (
    <main className="pt-20">
      {/* Liga data-pdv-abertura no <html> antes da primeira pintura (ou não liga: ?loja=, movimento reduzido, rede ou aparelho fracos, já tocou). */}
      <script id="pdv-abertura" dangerouslySetInnerHTML={{ __html: SCRIPT_ABERTURA_PDV }} />
      <div className="ds-wrap pb-2 pt-7 lg:pb-8 lg:pt-14">
        {/* tabIndex -1: o "Pular" da abertura devolve o foco aqui. */}
        <h1 tabIndex={-1} className="font-serif text-t1 font-normal tracking-[-0.02em] text-primary focus:outline-none">{TITULO_PDV}</h1>
        <p className="mt-3 max-w-[34ch] text-lead text-on-surface">{subtituloPdv(pontos.length)}</p>
      </div>
      <div className="lg:ds-wrap lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:pb-24">
        {/* data-pdv-mapa: a ilha liga aqui data-pdv-transicao (pinos com transição só depois de um clique) e data-pdv-sobe (a partir de lg, o mapa fica acima do véu enquanto a folha está aberta). O relative (sticky a partir de lg) é a caixa da abertura, por cima do mapa. */}
        <div data-pdv-mapa className="relative lg:sticky lg:top-24 lg:data-[pdv-sobe]:z-[56]">
          <MapaManaus pontos={pontos} />
          <AberturaPdv />
        </div>
        <ListaPdv pontos={pontos} />
      </div>
      <IlhaPdv pontos={pontos} />
    </main>
  );
}
