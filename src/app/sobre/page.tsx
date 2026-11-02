import type { Metadata } from "next";
import Image from "next/image";
import Botao from "@/components/ds/Botao";
import Capitulo from "@/components/ds/Capitulo";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import Revelar from "@/components/projetos/Revelar";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";

/**
 * Sobre a Orbital, como apresentação: abertura → 01 Manifesto → 02 Essência
 * → 03 Valores → 04 Em números → 05 Fundadores → 06 Contato. A tese: trazer
 * materiais inovadores adaptados ao clima da Amazônia. A Orbital se
 * apresenta só pelos próprios méritos, sem comparar com outros materiais, e
 * sem endereço para visita: o PFB se vê nos showrooms parceiros.
 */
const BASE_URL = "https://orbitalrevestimentos.com.br";

export const metadata: Metadata = {
  title: "Sobre a Orbital Revestimentos — Manaus, AM",
  description:
    "A Orbital nasceu para trazer materiais inovadores, adaptados ao clima da Amazônia. Fornecedora exclusiva do Painel Flexível em Fibra de Bambu (PFB) em Manaus: tecnicamente validado, estoque local e suporte especializado.",
  keywords: [
    "Orbital Revestimentos",
    "Orbital Revestimentos Manaus",
    "empresa revestimentos Manaus",
    "quem é Orbital Revestimentos",
    "revestimentos inovadores Amazônia",
    "PFB Manaus empresa",
    "revestimento Manaus fundadores",
  ],
  alternates: { canonical: `${BASE_URL}/sobre` },
  openGraph: {
    title: "Sobre a Orbital Revestimentos — Manaus, AM",
    description:
      "Nascemos da inquietação. Percorremos fábricas no mundo para encontrar o que realmente resolve os desafios da Amazônia. Novas possibilidades para seus projetos.",
    url: `${BASE_URL}/sobre`,
    images: [{ url: `/images/catalogue/hero-cover.png`, width: 1200, height: 630, alt: "Orbital Revestimentos — Manaus, AM" }],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Orbital Revestimentos",
  url: BASE_URL,
  logo: `${BASE_URL}/images/brand/orbital-simbolo.png`,
  description: "Referência em revestimentos inovadores na Amazônia. Fornecedora exclusiva de Painéis Flexíveis em Fibra de Bambu (PFB) em Manaus — tecnicamente validados, estoque local, pronta-entrega.",
  foundingLocation: { "@type": "Place", name: "Manaus, AM, Brasil" },
  telephone: "+55-92-98815-0149",
  email: "orbital.revestimentos@gmail.com",
  address: { "@type": "PostalAddress", addressLocality: "Manaus", addressRegion: "AM", addressCountry: "BR" },
  sameAs: ["https://instagram.com/orbitalrevestimentos", "https://wa.me/5592988150149"],
  founders: [
    { "@type": "Person", name: "Armaan Daswani", jobTitle: "Fundador e CEO" },
    { "@type": "Person", name: "Junior Hemnani", jobTitle: "Fundador e CFO" },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Sobre", item: `${BASE_URL}/sobre` },
  ],
};

const VALORES = [
  "Resolver problemas reais antes de vender produtos.",
  "Buscar inovação com propósito.",
  "Excelência técnica acima de promessas comerciais.",
  "Respeito ao cliente e aos seus projetos.",
  "Agilidade e compromisso com prazos.",
  "Transparência em todas as relações.",
  "Coragem para desafiar o convencional.",
  "Mentalidade global com execução local.",
];

const NUMEROS = [
  { valor: "50+", rotulo: "Obras entregues", desc: "Residenciais, comerciais, corporativas e náuticas em Manaus" },
  { valor: "15", rotulo: "Acabamentos exclusivos", desc: "Em pronta-entrega, com estoque local" },
  { valor: "0,2%", rotulo: "Absorção de umidade", desc: "Em 48 horas de imersão, validado em laboratório" },
  { valor: "ART", rotulo: "Responsabilidade técnica", desc: "Emitida por engenheiro civil habilitado (CREA)" },
];

const ESSENCIA = [
  { tag: "Propósito", titulo: "Por que existimos", texto: ["Transformar a forma como os espaços são construídos e renovados na Amazônia, conectando inovação global às necessidades reais do mercado local.", "Arquitetos, construtoras e consumidores não deveriam precisar escolher entre estética, durabilidade, praticidade e disponibilidade. Existimos para eliminar barreiras entre boas ideias e sua execução."] },
  { tag: "Missão", titulo: "O que fazemos", texto: ["Trazer revestimentos inovadores, tecnicamente validados e adaptados ao clima amazônico, com pronta-entrega, suporte especializado e uma cadeia de fornecimento construída diretamente na origem."] },
  { tag: "Visão", titulo: "Para onde vamos", texto: ["Ser a principal referência em revestimentos inovadores da Amazônia e uma das empresas mais respeitadas do Brasil na introdução de novas tecnologias para acabamento e construção."] },
];

const EQUIPE = [
  { nome: "Armaan Daswani", cargo: "Fundador & CEO", foto: "/images/team/armaan-daswani-2026.jpg", bio: "É o motor por trás da Orbital. Lidera a visão estratégica, o desenvolvimento de produto, a construção de marca, o marketing e a operação do dia a dia — do primeiro contato com o cliente à entrega final do projeto." },
  { nome: "Junior Hemnani", cargo: "Fundador & CFO", foto: null, bio: "Responsável pela solidez financeira da Orbital. Atua na inteligência de suprimentos e na cadeia de fornecimento global, percorrendo mercados internacionais para identificar soluções que o mercado amazônico ainda não conhecia." },
];

export default function SobrePage() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ProgressoCapitulos />

      {/* ── Abertura ───────────────────────────────────────────────────────── */}
      <section className="relative h-[min(85svh,52rem)] min-h-[30rem] flex items-end overflow-hidden bg-[#0B1F45] ds-escuro">
        <div className="absolute inset-0 mv-parallax-topo will-change-transform">
          <Image src="/images/catalogue/hero-cover.png" alt="Ambiente revestido com o Painel Flexível em Fibra de Bambu (PFB) Orbital, em Manaus" fill priority sizes="100vw" className="object-cover object-center" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/95 via-[#0B1F45]/50 to-[#0B1F45]/15" aria-hidden />
        <div className="relative z-10 w-full ds-wrap pb-[clamp(2.5rem,6vh,5rem)] mv-esmaece-topo">
          <Sobretitulo escuro>Orbital Revestimentos · Manaus, Amazonas</Sobretitulo>
          <h1 className="font-serif text-white text-display font-normal tracking-[-0.025em] mt-4 mb-5 max-w-[14ch] text-balance">
            Nascemos da inquietação.
          </h1>
          <p className="text-white/80 text-lead max-w-2xl text-pretty">
            Somos filhos de uma tradição de importadores, mas escolhemos não seguir apenas os caminhos conhecidos. Percorremos cidades, fábricas e fornecedores pelo mundo em busca de materiais inovadores, adaptados ao clima da Amazônia, que realmente servem ao nosso mercado.
          </p>
        </div>
      </section>

      {/* ── 01 Manifesto ───────────────────────────────────────────────────── */}
      <Capitulo id="manifesto" numero="01" rotulo="Manifesto" rotuladoPor="manifesto-titulo" className="bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-background ds-wrap lg:px-[clamp(2rem,5vw,5rem)] ds-secao flex items-center">
            <Revelar className="max-w-lg">
              <SecaoCabecalho id="manifesto-titulo" numero="01" sobretitulo="Manifesto" titulo="Onde muitos viam limitações, nós vimos possibilidades." />
              <div className="space-y-5 text-on-surface-variant text-corpo text-pretty">
                <p>Foi assim que encontramos o Painel Flexível em Fibra de Bambu (PFB): um material capaz de unir design, resistência, praticidade e desempenho para enfrentar um dos ambientes mais desafiadores do mundo, a Amazônia.</p>
                <p>Mas não bastava acreditar. Era preciso comprovar. Por isso investimos em ensaios, relatórios técnicos e validações para garantir resistência à umidade, à água, ao mofo, aos cupins e comportamento seguro diante do fogo.</p>
                <p>Também entendemos que um grande produto não vale nada sem uma grande estrutura. Construímos uma cadeia logística eficiente, mantemos estoque local e formamos uma rede de profissionais aptos a transformar projetos em realidade.</p>
                <p className="font-semibold text-primary">Porque acreditamos que inovação só tem valor quando chega até quem precisa dela.</p>
                <p className="text-[#1F7A44] font-semibold">E estamos apenas começando.</p>
              </div>
            </Revelar>
          </div>
          <div className="relative min-h-[22rem] lg:min-h-0 overflow-hidden bg-primary">
            <Image src="/images/catalogue/aplicacao-sala.jpeg" alt="Sala revestida com PFB Orbital em Manaus" fill sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover mv-parallax" />
          </div>
        </div>
      </Capitulo>

      {/* ── 02 Essência ────────────────────────────────────────────────────── */}
      <Capitulo id="essencia" numero="02" rotulo="Essência" rotuladoPor="essencia-titulo" escuro className="ds-secao bg-[#0B1F45] text-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="essencia-titulo" numero="02" escuro sobretitulo="Nossa essência" titulo="Propósito, missão e visão." />
          </Revelar>
          <ul className="grid grid-cols-1 lg:grid-cols-3 border border-white/15">
            {ESSENCIA.map((e, i) => (
              <Revelar key={e.tag} como="li" ordem={i} className={`p-6 lg:p-10 ${i < 2 ? "border-b lg:border-b-0 lg:border-r border-white/15" : ""}`}>
                <Sobretitulo escuro>{e.tag}</Sobretitulo>
                <h3 className="font-serif text-white text-t3 font-normal mt-3 mb-4">{e.titulo}</h3>
                <div className="space-y-3">
                  {e.texto.map((p) => <p key={p} className="text-white/70 text-corpo leading-relaxed text-pretty">{p}</p>)}
                </div>
              </Revelar>
            ))}
          </ul>
        </div>
      </Capitulo>

      {/* ── 03 Valores ─────────────────────────────────────────────────────── */}
      <Capitulo id="valores" numero="03" rotulo="Valores" rotuladoPor="valores-titulo" className="ds-secao bg-background">
        <div className="ds-wrap grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Revelar>
            <SecaoCabecalho id="valores-titulo" numero="03" sobretitulo="Valores" titulo="O que guia cada decisão que tomamos." />
            <ol className="space-y-0">
              {VALORES.map((v, i) => (
                <li key={v} className="flex items-baseline gap-4 border-t border-surface-container-high py-3">
                  <span className="font-serif text-primary/50 text-sm tabular-nums w-6 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-on-surface text-corpo">{v}</p>
                </li>
              ))}
            </ol>
          </Revelar>
          <Revelar ordem={1} className="relative aspect-[4/5] overflow-hidden bg-surface-container">
            <Image src="/images/academia/escadaria-residencial.jpg" alt="Escadaria residencial com paredes em PFB" fill sizes="(max-width: 1023px) 92vw, 560px" className="object-cover mv-desvela" />
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 04 Em números ──────────────────────────────────────────────────── */}
      <Capitulo id="numeros" numero="04" rotulo="Em números" rotuladoPor="numeros-titulo" escuro className="ds-secao bg-[#0B1F45] text-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="numeros-titulo" numero="04" escuro sobretitulo="A Orbital em números" titulo="O que já entregamos em Manaus." />
          </Revelar>
          <ul className="grid grid-cols-2 lg:grid-cols-4 border border-white/15">
            {NUMEROS.map((n, i) => (
              <Revelar key={n.rotulo} como="li" ordem={i} className={`p-5 lg:p-8 ${i < 3 ? "lg:border-r border-white/15" : ""} ${i % 2 === 0 ? "border-r lg:border-r-0" : ""} ${i < 2 ? "border-b lg:border-b-0 border-white/15" : ""} ${i === 2 ? "lg:border-r" : ""}`}>
                <p className="font-serif text-white text-t1 leading-none">{n.valor}</p>
                <p className="text-white text-corpo font-semibold mt-3">{n.rotulo}</p>
                <p className="text-white/60 text-legenda mt-1 leading-relaxed">{n.desc}</p>
              </Revelar>
            ))}
          </ul>
          <Revelar className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 border-t border-white/15 pt-8">
            {["Estoque local em Manaus", "Fornecimento direto da origem", "Rede de instaladores formados na Academia Orbital", "Material desenvolvido para alta umidade", "Ensaios técnicos certificados", "Suporte especializado em todos os projetos"].map((item) => (
              <p key={item} className="flex items-center gap-3 text-white/75 text-corpo"><span aria-hidden className="w-5 h-px bg-secondary flex-shrink-0" />{item}</p>
            ))}
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 05 Fundadores ──────────────────────────────────────────────────── */}
      <Capitulo id="fundadores" numero="05" rotulo="Fundadores" rotuladoPor="fundadores-titulo" className="ds-secao bg-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="fundadores-titulo" numero="05" sobretitulo="Fundadores" titulo="As pessoas por trás da Orbital." />
          </Revelar>
          <ul className="grid grid-cols-1 sm:grid-cols-2 border border-surface-variant max-w-3xl">
            {EQUIPE.map((p, i) => (
              <Revelar key={p.nome} como="li" ordem={i} className={i === 0 ? "border-b sm:border-b-0 sm:border-r border-surface-variant" : ""}>
                <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#EFEDE8]">
                  {p.foto
                    ? <Image src={p.foto} alt={`${p.nome} — ${p.cargo} da Orbital Revestimentos`} fill sizes="(max-width: 639px) 92vw, 360px" className="object-cover object-top" />
                    : <span className="absolute inset-0 flex items-center justify-center font-serif text-primary/40 text-6xl" aria-hidden>{p.nome.split(" ").map((x) => x[0]).join("")}</span>}
                </div>
                <div className="p-5 lg:p-7">
                  <h3 className="font-serif text-primary text-t3 font-normal">{p.nome}</h3>
                  <p className="text-[#2347A0] text-sobre tracking-[0.12em] uppercase font-semibold mt-1 mb-3">{p.cargo}</p>
                  <p className="text-on-surface-variant text-corpo leading-relaxed text-pretty">{p.bio}</p>
                </div>
              </Revelar>
            ))}
          </ul>
        </div>
      </Capitulo>

      {/* ── 06 Contato ─────────────────────────────────────────────────────── */}
      <Capitulo id="contato" numero="06" rotulo="Contato" rotuladoPor="contato-titulo" escuro className="relative overflow-hidden ds-secao">
        <div className="absolute inset-0 bg-primary">
          <Image src="/images/catalogue/aplicacao-cozinha.jpeg" alt="" fill sizes="100vw" className="object-cover opacity-20" />
        </div>
        <div className="relative ds-wrap flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <Revelar className="max-w-xl">
            <Sobretitulo escuro numero="06">Pronto para trabalhar com a Orbital?</Sobretitulo>
            <h2 id="contato-titulo" className="font-serif text-white text-t1 font-normal tracking-[-0.025em] mt-4 mb-4 text-balance">Novas possibilidades para seus projetos.</h2>
            <p className="text-white/75 text-lead text-pretty">
              Arquitetos, designers, marceneiros, construtoras ou clientes finais: um consultor responde pelo pré-contato, com amostras e estoque disponível em Manaus. O material está nos showrooms parceiros.
            </p>
          </Revelar>
          <Revelar ordem={1} className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Botao contato tom="claro" grande largo>Falar com um consultor</Botao>
            <Botao href="/projetos#parceiros" tom="linha" grande largo seta>Onde ver o PFB</Botao>
          </Revelar>
        </div>
      </Capitulo>
    </div>
  );
}
