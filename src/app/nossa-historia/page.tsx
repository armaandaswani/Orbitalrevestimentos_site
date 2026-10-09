import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import ContatoCta from "@/components/ContatoCta";

/**
 * Nossa história — conteúdo do Manual da Marca (ed. 01, capítulos 01 a 04):
 * dois sócios / duas cores, a órbita, qualidade sob controle e o que vem a
 * seguir. O texto segue o manual; não invente fatos novos aqui.
 *
 * Os sócios: cada um é uma cor do símbolo. Nome e foto só aparecem quando
 * preenchidos em SOCIOS (foto em public/images/team, sempre com nome de
 * arquivo novo — as imagens ficam 1 ano em cache).
 */

const BASE_URL = "https://orbitalrevestimentos.com.br";

export const metadata: Metadata = {
  title: "Nossa história — Orbital Revestimentos",
  description:
    "A Orbital nasceu para ser uma marca. Dois sócios, duas cores, uma operação inteira construída em torno da qualidade — do fornecimento direto à logística controlada.",
  alternates: { canonical: `${BASE_URL}/nossa-historia` },
  openGraph: {
    title: "Nossa história — Orbital Revestimentos",
    description: "Dois sócios. Duas cores. Uma só esfera: o equilíbrio entre segurança e inovação.",
    url: `${BASE_URL}/nossa-historia`,
  },
};

type Socio = { cor: string; hex: string; papel: string; texto: string; nome: string | null; foto: string | null };

const SOCIOS: Socio[] = [
  {
    cor: "Azul",
    hex: "#2347A0",
    papel: "O sócio pé no chão.",
    texto: "Solidez, método e segurança em cada decisão.",
    nome: null,
    foto: null,
  },
  {
    cor: "Verde",
    hex: "#36A35C",
    papel: "O sócio jovial e inovador.",
    texto: "O olhar para o novo e a coragem de fazer diferente.",
    nome: null,
    foto: null,
  },
];

const PILARES = [
  { n: "01", t: "Fornecimento direto", d: "Somos fornecedores diretos de todos os materiais." },
  { n: "02", t: "Fábricas de referência", d: "Trabalhamos com fábricas terceirizadas renomadas, com paredes de certificações e prêmios, e com parceiros de produção." },
  { n: "03", t: "Controle na origem", d: "Uma equipe externa na China faz o controle de qualidade de tudo o que é produzido." },
  { n: "04", t: "Logística controlada", d: "Criamos uma rede logística em que tudo é controlado." },
];

const EYEBROW = "text-[#2347A0] text-xs tracking-[0.2em] uppercase font-semibold mb-5";
const TITULO = "font-serif text-[#0B1F45] text-4xl lg:text-6xl leading-[1.05] tracking-[-0.01em]";

export default function NossaHistoriaPage() {
  return (
    <div className="pt-20">
      {/* ── Manifesto ── */}
      <section className="bg-[#0B1F45] text-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16 py-20 lg:py-32 grid lg:grid-cols-[1fr_auto] gap-12 lg:gap-20 items-center">
          <div>
            <nav className="text-[#B4BBC8] text-xs mb-8 flex items-center gap-2">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">Nossa história</span>
            </nav>
            <p className="text-[#36A35C] text-xs tracking-[0.2em] uppercase font-semibold mb-5">Manifesto</p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl leading-[1.05] tracking-[-0.02em] mb-8">
              A Orbital nasceu<br /><em>para ser uma marca.</em>
            </h1>
            <p className="text-white/75 text-base lg:text-lg leading-relaxed max-w-2xl">
              Por trás do símbolo existe uma história: dois sócios, uma ambição e uma operação inteira
              construída em torno da qualidade.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/orbital-simbolo-negativo.svg"
            alt=""
            width={280}
            height={279}
            className="w-40 sm:w-56 lg:w-[280px] h-auto justify-self-center"
          />
        </div>
      </section>

      {/* ── 01 Dois sócios, duas cores ── */}
      <section className="bg-[#F6F5F2] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal className="max-w-2xl mb-12 lg:mb-16">
            <p className={EYEBROW}>01 — Nossa história</p>
            <h2 className={`${TITULO} mb-6`}>Dois sócios.<br /><em>Duas cores.</em></h2>
            <p className="text-[#43474e] text-base lg:text-lg leading-relaxed">
              A Orbital nasce do encontro de dois sócios com temperamentos que se completam. Cada um
              deles está no símbolo.
            </p>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            {SOCIOS.map((s) => (
              <ScrollReveal key={s.cor}>
                <article className="h-full bg-white border border-[#e2e2e2] flex flex-col sm:flex-row">
                  <div className="h-1.5 sm:h-auto sm:w-1.5 shrink-0" style={{ backgroundColor: s.hex }} />
                  {s.foto && (
                    <div className="relative w-full sm:w-44 aspect-[4/5] sm:aspect-auto shrink-0 bg-[#EFEDE8]">
                      <Image src={s.foto} alt={s.nome ?? `Sócio ${s.cor}`} fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className="p-7 lg:p-9">
                    <p className="text-xs tracking-[0.2em] uppercase font-bold mb-4" style={{ color: s.hex === "#36A35C" ? "#1F7A44" : s.hex }}>
                      {s.cor}
                    </p>
                    {s.nome && <p className="text-[#0B1F45] text-lg font-semibold mb-2">{s.nome}</p>}
                    <p className="font-serif text-[#0B1F45] text-2xl lg:text-3xl leading-snug mb-3">{s.papel}</p>
                    <p className="text-[#43474e] leading-relaxed">{s.texto}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <p className="font-serif italic text-[#0B1F45] text-2xl lg:text-3xl leading-snug max-w-3xl mt-12 lg:mt-16">
              Juntas, as duas faixas formam uma só esfera: o equilíbrio entre segurança e inovação.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 02 A órbita ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16 grid lg:grid-cols-2 gap-10 lg:gap-20 items-end">
          <ScrollReveal>
            <p className={EYEBROW}>02 — A órbita</p>
            <h2 className={TITULO}>Tudo dentro<br /><em>da nossa órbita.</em></h2>
          </ScrollReveal>
          <ScrollReveal className="space-y-5 text-[#43474e] text-base lg:text-lg leading-relaxed">
            <p className="text-[#0B1F45] font-semibold">A Orbital nasceu para ser uma marca. Por isso escolhemos a órbita.</p>
            <p>
              A ideia é englobar tudo dentro do leque da marca, usando a nossa expertise de importador para
              reunir o que cada projeto precisa em um só lugar.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 03 Qualidade sob controle ── */}
      <section className="bg-[#F6F5F2] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal className="mb-12 lg:mb-16">
            <p className={EYEBROW}>03 — Qualidade</p>
            <h2 className={TITULO}>Qualidade<br /><em>sob controle.</em></h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-[#e2e2e2]">
            {PILARES.map((p) => (
              <div key={p.n} className="bg-white border-r border-b border-[#e2e2e2] p-7 lg:p-8">
                <p className="font-serif text-[#2347A0] text-4xl mb-6">{p.n}</p>
                <p className="text-[#0B1F45] font-semibold mb-2">{p.t}</p>
                <p className="text-[#43474e] text-sm leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
          <p className="flex items-center gap-3 text-[#0B1F45] font-semibold mt-10">
            <span className="w-8 h-1.5 bg-[#2347A0]" aria-hidden />
            Reputação que gera confiança. Por isso, azul.
          </p>
        </div>
      </section>

      {/* ── 04 O que vem a seguir ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal className="mb-10 lg:mb-14">
            <p className={EYEBROW}>04 — O que vem a seguir</p>
            <h2 className={TITULO}>Projetos sob medida.<br /><em>Made-to-order.</em></h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-20 text-[#43474e] text-base lg:text-lg leading-relaxed max-w-5xl">
            <p>O nosso futuro está nos projetos personalizados, feitos a partir dos nossos produtos inovadores.</p>
            <p>Levamos a nossa tecnologia para acabamentos made-to-order, feitos para cada projeto.</p>
          </div>
          <p className="flex items-center gap-3 text-[#0B1F45] font-semibold mt-10">
            <span className="w-8 h-1.5 bg-[#36A35C]" aria-hidden />
            Inovação que move a marca. Por isso, verde.
          </p>
        </div>
      </section>

      {/* ── Fechamento ── */}
      <section className="bg-[#0B1F45] text-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16 py-20 lg:py-28 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/orbital-assinatura-negativo.svg"
            alt="Orbital Revestimentos"
            width={192}
            height={60}
            loading="lazy"
            className="h-[60px] w-auto mb-10"
          />
          <p className="font-serif italic text-3xl lg:text-5xl leading-tight mb-10">
            Instalado em horas. Admirado por anos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href="/produtos"
              className="w-full sm:w-auto text-center bg-[#36A35C] text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-[#4BB571] transition-colors"
            >
              Ver os produtos
            </Link>
            <ContatoCta className="w-full sm:w-auto text-center border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-white hover:text-[#0B1F45] transition-colors">
              Falar com um consultor
            </ContatoCta>
          </div>
        </div>
      </section>
    </div>
  );
}
