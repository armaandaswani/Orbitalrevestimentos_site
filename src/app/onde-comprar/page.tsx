import type { Metadata } from "next";
import { lerPontosDeVenda } from "@/lib/pontos-de-venda-server";
import { SCRIPT_ABERTURA_PDV } from "@/lib/pontos-de-venda";
import AberturaPdv from "@/components/onde-comprar/AberturaPdv";
import { TITULO_META_PDV, TITULO_PDV, subtituloPdv } from "@/lib/onde-comprar-textos";
import MapaManaus from "@/components/onde-comprar/MapaManaus";
import ListaPdv from "@/components/onde-comprar/ListaPdv";
import IlhaPdv from "@/components/onde-comprar/IlhaPdv";
import { nomeLugar } from "@/lib/projetos-tipos";

/** Liga `data-pdv-js` no `<html>` antes da pintura: com ele, o bloco `.pdv-sem-js` da lista some. */
const SCRIPT_JS_PDV = 'document.documentElement.setAttribute("data-pdv-js","")';

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
      {/* Com JavaScript, a lista mostra só nome e bairro (a folha tem o resto); sem ele, o bloco .pdv-sem-js aparece. */}
      <script id="pdv-js" dangerouslySetInnerHTML={{ __html: SCRIPT_JS_PDV }} />
      {/* v2 (08/11/2026): no celular, o título curto, o mapa como imagem de abertura e as lojas em cartões que deslizam;
          no computador, o mapa à esquerda e, à direita, o título e as lojas em linhas finas. */}
      <div className="lg:ds-wrap lg:grid lg:grid-cols-[minmax(0,38rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-24 lg:pb-24 lg:pt-14">
        <div className="ds-wrap pb-5 pt-6 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:w-full lg:max-w-none lg:px-0 lg:pb-10 lg:pt-10">
          {/* tabIndex -1: o "Pular" da abertura devolve o foco aqui. */}
          <h1 tabIndex={-1} className="font-serif text-[1.75rem] leading-[2.125rem] font-normal tracking-[-0.02em] text-primary focus:outline-none lg:text-[2.5rem] lg:leading-[2.875rem]">{TITULO_PDV}</h1>
          <p className="mt-2 max-w-[34ch] text-[0.9375rem] leading-6 text-on-surface-variant lg:mt-4 lg:text-base">{subtituloPdv(pontos.length)}</p>
        </div>
        {/* data-pdv-mapa: a ilha liga aqui data-pdv-transicao (pinos com transição só depois de um clique) e data-pdv-sobe (a partir de lg, o mapa fica acima do véu enquanto a folha está aberta). O relative (sticky a partir de lg) é a caixa da abertura, por cima do mapa. */}
        <div data-pdv-mapa className="relative lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:data-[pdv-sobe]:z-[56]">
          <MapaManaus pontos={pontos} />
          <AberturaPdv />
        </div>
        <div className="ds-wrap pb-20 pt-6 lg:col-start-2 lg:row-start-2 lg:mx-0 lg:w-full lg:max-w-none lg:px-0 lg:pt-0 lg:pb-0">
          <ListaPdv pontos={pontos} />
        </div>
      </div>
      <IlhaPdv pontos={pontos} />
    </main>
  );
}
