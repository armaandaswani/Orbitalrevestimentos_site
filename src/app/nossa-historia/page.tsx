import type { Metadata } from "next";
import Image from "next/image";
import Botao from "@/components/ds/Botao";
import Capitulo from "@/components/ds/Capitulo";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import Revelar from "@/components/projetos/Revelar";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";

/**
 * Nossa história — conteúdo do Manual da Marca (ed. 01, capítulos 01 a 04),
 * como apresentação: manifesto → 01 Dois sócios, duas cores → 02 A órbita →
 * 03 Qualidade sob controle → 04 O que vem a seguir → fechamento com a
 * assinatura. O texto segue o manual; não invente fatos novos aqui.
 *
 * As duas cores (CORES) NÃO dizem qual sócio é qual — decisão do dono: os
 * cartões de cor ficam sem nome, e os sócios aparecem à parte (SOCIOS), sem
 * ligação com azul ou verde. Fotos em public/images/team, sempre com nome de
 * arquivo novo (as imagens ficam 1 ano em cache); sem foto, mostra as iniciais.
 */
const BASE_URL = "https://orbitalrevestimentos.com.br";

export const metadata: Metadata = {
  title: "Nossa história — Orbital Revestimentos",
  description:
    "A Orbital nasceu para ser uma marca. Dois sócios, duas cores, uma operação inteira construída em torno da qualidade — do fornecimento direto à logística controlada. Novas possibilidades para seus projetos.",
  alternates: { canonical: `${BASE_URL}/nossa-historia` },
  openGraph: {
    title: "Nossa história — Orbital Revestimentos",
    description: "Dois sócios. Duas cores. Uma só esfera: o equilíbrio entre segurança e inovação.",
    url: `${BASE_URL}/nossa-historia`,
  },
};

const CORES = [
  { cor: "Azul", hex: "#2347A0", texto: "#2347A0", papel: "O sócio pé no chão.", frase: "Solidez, método e segurança em cada decisão." },
  { cor: "Verde", hex: "#36A35C", texto: "#1F7A44", papel: "O sócio jovial e inovador.", frase: "O olhar para o novo e a coragem de fazer diferente." },
];

const SOCIOS: { nome: string; cargo: string; foto: string | null }[] = [
  { nome: "Armaan Daswani", cargo: "Sócio-fundador", foto: "/images/team/armaan-daswani-2026.jpg" },
  { nome: "Junior Hemnani", cargo: "Sócio-fundador", foto: null },
];

const PILARES = [
  { n: "01", t: "Fornecimento direto", d: "Somos fornecedores diretos de todos os materiais." },
  { n: "02", t: "Fábricas de referência", d: "Trabalhamos com fábricas terceirizadas renomadas, com paredes de certificações e prêmios, e com parceiros de produção." },
  { n: "03", t: "Controle na origem", d: "Uma equipe externa na China faz o controle de qualidade de tudo o que é produzido: fabricamos na China com padrão Orbital." },
  { n: "04", t: "Logística controlada", d: "Criamos uma rede logística em que tudo é controlado, até o estoque em Manaus." },
];

export default function NossaHistoriaPage() {
  return (
    <div className="pt-20">
      <ProgressoCapitulos />

      {/* ── Manifesto ──────────────────────────────────────────────────────── */}
      <section className="bg-[#0B1F45] text-white ds-escuro">
        <div className="ds-wrap py-16 lg:py-24 grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-20 items-center">
          <div>
            <Sobretitulo escuro>Manifesto · Manual da marca</Sobretitulo>
            <h1 className="font-serif text-white text-display font-normal tracking-[-0.025em] mt-4 mb-6 max-w-[16ch] text-balance">
              A Orbital nasceu <em>para ser uma marca.</em>
            </h1>
            <p className="text-white/80 text-lead max-w-2xl text-pretty">
              Por trás do símbolo existe uma história: dois sócios, uma ambição e uma operação inteira construída em torno da qualidade.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/orbital-simbolo-negativo.svg" alt="" width={280} height={279} className="w-40 sm:w-56 lg:w-[280px] h-auto justify-self-center" />
        </div>
      </section>

      {/* ── 01 Dois sócios, duas cores ─────────────────────────────────────── */}
      <Capitulo id="socios" numero="01" rotulo="Dois sócios" rotuladoPor="socios-titulo" className="ds-secao bg-background">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="socios-titulo" numero="01" sobretitulo="Nossa história" titulo={<>Dois sócios. <em>Duas cores.</em></>}
              texto="A Orbital nasce do encontro de dois sócios com temperamentos que se completam. Cada um deles está no símbolo." />
          </Revelar>
          <ul className="grid md:grid-cols-2 gap-4 lg:gap-6">
            {CORES.map((c, i) => (
              <Revelar key={c.cor} como="li" ordem={i}>
                <article className="h-full bg-white border border-surface-variant flex flex-col sm:flex-row">
                  <div className="h-1.5 sm:h-auto sm:w-1.5 shrink-0" style={{ backgroundColor: c.hex }} />
                  <div className="p-6 lg:p-8">
                    <p className="text-sobre tracking-[0.2em] uppercase font-bold mb-3" style={{ color: c.texto }}>{c.cor}</p>
                    <p className="font-serif text-primary text-t3 leading-snug mb-2">{c.papel}</p>
                    <p className="text-on-surface-variant text-corpo">{c.frase}</p>
                  </div>
                </article>
              </Revelar>
            ))}
          </ul>
          <Revelar>
            <p className="font-serif italic text-primary text-t3 leading-snug max-w-3xl mt-10 lg:mt-14 text-pretty">
              Juntas, as duas faixas formam uma só esfera: o equilíbrio entre segurança e inovação.
            </p>
          </Revelar>

          {/* Os sócios — sem dizer quem é azul e quem é verde. */}
          <div className="mt-14 lg:mt-16 pt-10 border-t border-surface-container-high">
            <Sobretitulo>Os sócios</Sobretitulo>
            <ul className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mt-5">
              {SOCIOS.map((s, i) => (
                <Revelar key={s.nome} como="li" ordem={i}>
                  <figure>
                    <div className="relative aspect-[4/5] bg-[#EFEDE8] overflow-hidden">
                      {s.foto
                        ? <Image src={s.foto} alt={s.nome} fill sizes="(min-width: 640px) 330px, 45vw" className="object-cover object-top" />
                        : <span className="absolute inset-0 flex items-center justify-center font-serif text-primary/40 text-5xl sm:text-6xl" aria-hidden>{s.nome.split(" ").map((p) => p[0]).join("")}</span>}
                    </div>
                    <figcaption className="mt-3">
                      <p className="text-primary text-corpo font-semibold">{s.nome}</p>
                      <p className="text-on-surface-variant text-legenda">{s.cargo}</p>
                    </figcaption>
                  </figure>
                </Revelar>
              ))}
            </ul>
          </div>
        </div>
      </Capitulo>

      {/* ── 02 A órbita ────────────────────────────────────────────────────── */}
      <Capitulo id="orbita" numero="02" rotulo="A órbita" rotuladoPor="orbita-titulo" className="ds-secao bg-white">
        <div className="ds-wrap grid lg:grid-cols-2 gap-8 lg:gap-20 items-end">
          <Revelar>
            <SecaoCabecalho id="orbita-titulo" numero="02" sobretitulo="A órbita" titulo={<>Tudo dentro <em>da nossa órbita.</em></>} />
          </Revelar>
          <Revelar ordem={1} className="space-y-4 text-on-surface-variant text-lead text-pretty lg:pb-[clamp(2rem,1.4rem+2vw,3.5rem)]">
            <p className="text-primary font-semibold">A Orbital nasceu para ser uma marca. Por isso escolhemos a órbita.</p>
            <p>A ideia é englobar tudo dentro do leque da marca, usando a nossa expertise de importador para reunir o que cada projeto precisa em um só lugar.</p>
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 03 Qualidade sob controle ──────────────────────────────────────── */}
      <Capitulo id="qualidade" numero="03" rotulo="Qualidade" rotuladoPor="qualidade-titulo" className="ds-secao bg-background">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="qualidade-titulo" numero="03" sobretitulo="Qualidade" titulo={<>Qualidade <em>sob controle.</em></>} />
          </Revelar>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-surface-variant">
            {PILARES.map((p, i) => (
              <Revelar key={p.n} como="li" ordem={i} className="bg-white border-r border-b border-surface-variant p-6 lg:p-8">
                <p className="font-serif text-[#2347A0] text-t2 leading-none mb-5">{p.n}</p>
                <p className="text-primary font-semibold text-corpo mb-2">{p.t}</p>
                <p className="text-on-surface-variant text-legenda leading-relaxed">{p.d}</p>
              </Revelar>
            ))}
          </ol>
          <p className="flex items-center gap-3 text-primary font-semibold text-corpo mt-8">
            <span className="w-8 h-1.5 bg-[#2347A0]" aria-hidden />
            Reputação que gera confiança. Por isso, azul.
          </p>
        </div>
      </Capitulo>

      {/* ── 04 O que vem a seguir ──────────────────────────────────────────── */}
      <Capitulo id="futuro" numero="04" rotulo="O que vem" rotuladoPor="futuro-titulo" className="ds-secao bg-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="futuro-titulo" numero="04" sobretitulo="O que vem a seguir" titulo={<>Projetos sob medida. <em>Made-to-order.</em></>} />
          </Revelar>
          <Revelar className="grid md:grid-cols-2 gap-5 lg:gap-16 text-on-surface-variant text-lead text-pretty max-w-5xl">
            <p>O nosso futuro está nos projetos personalizados, feitos a partir dos nossos produtos inovadores.</p>
            <p>Levamos a nossa tecnologia para acabamentos made-to-order, feitos para cada projeto.</p>
          </Revelar>
          <p className="flex items-center gap-3 text-primary font-semibold text-corpo mt-8">
            <span className="w-8 h-1.5 bg-[#36A35C]" aria-hidden />
            Inovação que move a marca. Por isso, verde.
          </p>
        </div>
      </Capitulo>

      {/* ── Fechamento ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0B1F45] text-white ds-escuro">
        <div className="ds-wrap py-16 lg:py-24 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/orbital-assinatura-negativo.svg" alt="Orbital Revestimentos" width={192} height={60} loading="lazy" className="h-[60px] w-auto mb-8" />
          <p className="font-serif text-t1 leading-tight mb-3 max-w-[16ch] text-balance">Novas possibilidades para seus projetos.</p>
          <p className="font-serif italic text-white/75 text-lead mb-10">Instalado em horas. Admirado por anos.</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Botao href="/produtos" tom="claro" grande largo>Ver os produtos</Botao>
            <Botao contato tom="linha" grande largo>Falar com um consultor</Botao>
          </div>
        </div>
      </section>
    </div>
  );
}
