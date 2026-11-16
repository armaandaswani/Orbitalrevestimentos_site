import type { Metadata } from "next";
import Image from "next/image";
import LinkParceria from "@/components/parcerias/LinkParceria";
import { notFound } from "next/navigation";
import CadastroParceiro from "@/components/parcerias/CadastroParceiro";
import { OG_PADRAO } from "@/lib/og";
import { capasDeParceria } from "@/lib/parcerias-capas";
import { ANCORA_CADASTRO, ANCORA_REVENDER, PERFIS, perfilDe } from "@/lib/parcerias-textos";

/**
 * /parcerias/arquitetos, /marceneiros, /engenheiros: a página curta de cada
 * perfil. Uma tela com a foto de uma obra e o título, três benefícios de uma
 * linha, e o cadastro (#cadastro) já com a profissão marcada. O link que o
 * dono manda ao profissional é o desta página.
 */
export const revalidate = 3600;
export const dynamicParams = false;

const SITE = "https://orbitalrevestimentos.com.br";
// A imagem padrão de prévia (lib/og): JPG leve, que o WhatsApp mostra.
const IMAGEM_OG = OG_PADRAO;

export function generateStaticParams() {
  return PERFIS.map((p) => ({ perfil: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ perfil: string }> }): Promise<Metadata> {
  const p = perfilDe((await params).perfil);
  if (!p) return {};
  const url = `${SITE}/parcerias/${p.slug}`;
  return {
    title: p.meta.titulo,
    description: p.meta.descricao,
    alternates: { canonical: url },
    // Com imagem: o link vai por WhatsApp, e o openGraph da página troca o do layout inteiro.
    openGraph: { title: `${p.meta.titulo} | Orbital Revestimentos`, description: p.meta.descricao, url, images: [IMAGEM_OG] },
  };
}

const LINK_CLARO = "underline underline-offset-4 decoration-white/40 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const LINK_ESCURO = "underline underline-offset-4 decoration-[#0B1F45]/30 hover:decoration-[#0B1F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]";

export default async function PerfilParceriaPage({ params }: { params: Promise<{ perfil: string }> }) {
  const p = perfilDe((await params).perfil);
  if (!p) notFound();
  const capa = (await capasDeParceria())[p.slug];
  const outros = [
    ...PERFIS.filter((x) => x.slug !== p.slug).map((x) => ({ nome: x.nome, href: `/parcerias/${x.slug}` })),
    { nome: "Revendedores", href: `/onde-comprar#${ANCORA_REVENDER}` },
    { nome: "Aplicadores", href: "/academia" },
  ];

  return (
    <main>
      {/* Celular: a foto ocupa a tela, com o texto embaixo, sobre um véu. Computador: texto à esquerda e a foto
          em pé à direita, na altura da tela (as fotos de obra são quase todas em pé). */}
      <section aria-labelledby="perfil-titulo" className="relative flex min-h-[100svh] flex-col justify-end bg-[#0B1F45] lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:justify-normal">
        <div className="absolute inset-0 lg:relative lg:inset-auto lg:order-2">
          <Image src={capa.src} alt={capa.alt} fill priority sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" style={{ objectPosition: capa.foco }} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B1F45] via-[#0B1F45]/65 to-[#0B1F45]/10 lg:hidden" />
        </div>
        <div className="relative ds-wrap pb-12 pt-28 lg:order-1 lg:mx-0 lg:flex lg:max-w-none lg:flex-col lg:justify-center lg:px-[clamp(2rem,6vw,7rem)] lg:py-32">
          <p className="text-legenda text-white/75">
            <LinkParceria href="/parcerias" className={LINK_CLARO}>Parcerias</LinkParceria>
            <span aria-hidden className="mx-2">/</span>
            {p.nome}
          </p>
          <h1 id="perfil-titulo" className="mt-4 font-serif text-display text-white text-balance max-w-[17ch]">{p.titulo}</h1>
          <p className="mt-5 text-lead text-white/85 max-w-[38ch]">{p.lead}</p>
          <div className="mt-8">
            <a href={`#${ANCORA_CADASTRO}`} className="ds-botao ds-botao-claro min-h-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Quero ser parceiro
            </a>
          </div>
        </div>
      </section>

      <section aria-label="O que o parceiro recebe" className="bg-white">
        <ul className="ds-wrap ds-secao grid gap-8 md:grid-cols-3 md:gap-12">
          {p.beneficios.map((b) => (
            <li key={b.titulo} className="border-t border-[#0B1F45]/15 pt-6">
              <h2 className="font-serif text-t2 text-[#0B1F45] text-balance">{b.titulo}</h2>
              <p className="mt-3 text-corpo text-[#43474e] max-w-[30ch]">{b.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <CadastroParceiro ancora={ANCORA_CADASTRO} profissoes={p.profissoes} />

      <nav aria-label="Outros perfis de parceria" className="bg-white">
        <div className="ds-wrap flex flex-wrap items-center gap-x-6 gap-y-1 py-8 text-legenda text-[#43474e]">
          <span>Outro perfil?</span>
          {outros.map((o) => (
            <LinkParceria key={o.href} href={o.href} className={`inline-flex min-h-11 items-center text-[#0B1F45] ${LINK_ESCURO}`}>{o.nome}</LinkParceria>
          ))}
        </div>
      </nav>
    </main>
  );
}
