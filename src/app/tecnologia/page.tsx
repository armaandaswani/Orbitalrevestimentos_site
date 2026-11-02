import type { Metadata } from "next";
import Image from "next/image";
import ARTAccordion from "@/components/ARTAccordion";
import FichaTecnicaAccordion from "@/components/FichaTecnicaAccordion";
import ConhecaPfb from "@/components/ConhecaPfb";
import SolicitarManual from "@/components/SolicitarManual";
import VideoShort from "@/components/VideoShort";
import Botao from "@/components/ds/Botao";
import Capitulo from "@/components/ds/Capitulo";
import HistoriaFixa from "@/components/ds/HistoriaFixa";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import AntesDepois from "@/components/projetos/AntesDepois";
import Revelar from "@/components/projetos/Revelar";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import { getAssetOverrides, resolveAsset } from "@/lib/assets";

/**
 * Tecnologia como apresentação: abertura → 01 Produto → 02 Camadas (narrativa
 * com quadro fixo) → 03 Laudos e ART → 04 Água e clima → 05 Instalação
 * (antes × depois, notas e o instalador) → 06 Ambiente → 07 Próximo passo.
 * O PFB se apresenta só pelos próprios méritos: nenhuma comparação com outros
 * materiais. Manual Técnico de Instalação: sem download direto, o visitante
 * solicita (components/SolicitarManual).
 */
export const metadata: Metadata = {
  title: "PFB Orbital — Tecnologia, Performance e Ficha Técnica | Revestimento Manaus",
  description:
    "A tecnologia por trás do Painel Flexível em Fibra de Bambu (PFB): 5 camadas, dados de laboratório, ART de Engenheiro Civil. Resistente à umidade, instalado em horas. Novas possibilidades para seus projetos em Manaus.",
  keywords: [
    "painel flexível fibra de bambu tecnologia",
    "PFB ficha técnica",
    "revestimento impermeável Manaus",
    "revestimento anti-mofo Manaus",
    "revestimento para clima úmido Manaus",
    "revestimento bambu Manaus",
    "revestimento parede Manaus",
    "revestimento sem obra Manaus",
    "PFB Orbital performance",
    "revestimento com ART engenheiro civil",
    "revestimento sustentável Manaus",
    "painel flexível fibra de bambu Amazonas",
  ],
  alternates: { canonical: "https://orbitalrevestimentos.com.br/tecnologia" },
  openGraph: {
    title: "PFB Orbital — Tecnologia, Performance e Ficha Técnica | Revestimento Manaus",
    description:
      "5 camadas, dados de laboratório, ART de Engenheiro Civil. Resistente à umidade, instalado em horas. O revestimento feito para o Amazonas.",
    url: "https://orbitalrevestimentos.com.br/tecnologia",
  },
};

const CAMADAS = [
  { titulo: "Película protetora UV", destaque: "Camada 1 · a superfície", texto: "Protege contra riscos, radiação UV e impactos superficiais. É o que mantém a cor e o brilho ao longo dos anos, mesmo em ambiente iluminado o dia inteiro.", imagem: { src: "/images/academia/escadaria-residencial.jpg", alt: "Parede de escadaria em PFB acabamento madeira, superfície íntegra" } },
  { titulo: "Impressão fotorrealista", destaque: "Camada 2 · o acabamento", texto: "A textura de pedra, mármore ou madeira é impressa em alta fidelidade: veios nítidos e profundidade visual que se mantêm iguais do primeiro ao último dia.", imagem: { src: "/images/academia/aplic-coluna.jpg", alt: "Coluna revestida com PFB acabamento mármore claro" } },
  { titulo: "Adesivo de alta aderência", destaque: "Camada 3 · a união", texto: "Colagem permanente e estrutural entre as camadas. Garante que a superfície nunca descole do núcleo, nem com calor, nem com umidade.", imagem: { src: "/images/academia/aplic-porta.jpg", alt: "Porta revestida com PFB alinhada à parede de mármore" } },
  { titulo: "Camada estrutural", destaque: "Camada 4 · a rigidez", texto: "Dá integridade dimensional à placa: permite o grande formato de 2,90 × 1,20 m sem empenar e, ao mesmo tempo, a flexibilidade para acompanhar curvas e colunas.", imagem: { src: "/images/academia/aplic-curva.jpg", alt: "Balcão curvo revestido com PFB acabamento madeira" } },
  { titulo: "Núcleo de fibra de bambu", destaque: "Camada 5 · o coração", texto: "Fibra renovável, sem formol, inodora. Não é habitat para fungos nem para cupins: a proteção vem da própria natureza do material, sem tratamento químico.", imagem: { src: "/images/academia/aplic-area-molhada.jpg", alt: "Box de banheiro com paredes e forro em PFB" } },
];

const ESPECIFICACOES = [
  { valor: "72,3", unidade: "MPa", rotulo: "Resistência à flexão", nota: "Certificada em laboratório" },
  { valor: "0,2%", unidade: "", rotulo: "Inchamento (48 h)", nota: "Praticamente impermeável" },
  { valor: "550", unidade: "kg/m³", rotulo: "Densidade", nota: "Alta resistência estrutural" },
  { valor: "3,2", unidade: "kg/m²", rotulo: "Peso", nota: "Cerca de 11 kg por placa" },
  { valor: "0,5%", unidade: "", rotulo: "Teor de umidade", nota: "Estável no clima amazônico" },
];

const CLIMA = [
  { t: "Anti-mofo", d: "O bambu não é substrato para fungos. O PFB não mofa nem em banheiros sem ventilação." },
  { t: "Anti-cupim", d: "A fibra de bambu processada não atrai cupins. Proteção natural, sem tratamento químico." },
  { t: "Ciclos térmicos", d: "Ensaiado de –10 °C a +120 °C. Validado para uso interno; acima de 50 °C de calor contínuo pode ondular." },
  { t: "Estável na umidade", d: "0,5% de teor de umidade interno: não empena, não descola, não deforma com o tempo." },
];

const NOTAS = [
  { t: "Preparação da base", d: "Base plana, seca, sem irregularidades acima de 2 mm. Reboco fino ou drywall são ideais." },
  { t: "Adesivo", d: "Cola PU-40 de alta aderência nas paredes: 2 tubos por placa. Cola de contato para tetos e superfícies curvas." },
  { t: "Grandes superfícies", d: "Junta de dilatação a cada 3 m lineares, para acomodar a variação térmica." },
  { t: "Cantos", d: "Arestas e cantos vivos com perfil de acabamento. Evitar impacto direto nas bordas da placa." },
];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Tecnologia", item: "https://orbitalrevestimentos.com.br/tecnologia" },
  ],
};

export default async function TecnologiaPage() {
  const overrides = await getAssetOverrides();
  const img = (key: string, fallback: string) => resolveAsset(key, fallback, overrides);
  const agua = [
    { src: img("pfb-water-0h", "/images/catalogue/pfb-mdf-0h.png"), t: "0 h", l: "Início do teste", n: "Placa de PFB submersa em água, em condições controladas de laboratório." },
    { src: img("pfb-water-24h", "/images/catalogue/pfb-mdf-24h.png"), t: "24 h", l: "24 horas de imersão", n: "Integridade estrutural total: sem deformação, sem absorção visível." },
    { src: img("pfb-water-48h", "/images/catalogue/pfb-mdf-48h.png"), t: "48 h", l: "48 horas de imersão", n: "Sai intacto: 0,2% de absorção. Praticamente impermeável." },
  ];

  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ProgressoCapitulos />

      {/* ── Abertura ───────────────────────────────────────────────────────── */}
      <section className="bg-[#0B1F45] text-white ds-escuro">
        <div className="ds-wrap pt-10 pb-10 lg:py-16 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
          <div>
            <Sobretitulo escuro>PFB · Tecnologia e ficha técnica</Sobretitulo>
            <h1 className="font-serif text-white text-t1 font-normal tracking-[-0.025em] mt-4 mb-4 text-balance">
              A engenharia por trás do Painel Flexível em Fibra de Bambu (PFB).
            </h1>
            <p className="text-white/75 text-lead max-w-xl text-pretty">
              Materiais naturais e engenharia avançada, adaptados ao clima da Amazônia. Cada dado desta página vem da ficha técnica e dos laudos, não do marketing.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-7">
              <Botao href="#laudos" tom="claro" largo>Ver laudos e ART</Botao>
              <Botao contato tom="linha" largo>Falar com um especialista</Botao>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden bg-primary-container">
            <Image src={img("onde-aplicar-main", "/images/catalogue/onde-aplicar-main.jpeg")} alt="Ambiente revestido com PFB Orbital" fill priority sizes="(max-width: 1023px) 92vw, 560px" className="object-cover" />
          </div>
        </div>
      </section>

      {/* ── 01 Produto ─────────────────────────────────────────────────────── */}
      <ConhecaPfb linkTecnologia={false} numero="01" />

      {/* ── 02 Camadas ─────────────────────────────────────────────────────── */}
      <Capitulo id="camadas" numero="02" rotulo="Camadas" rotuladoPor="camadas-titulo" className="ds-secao bg-background">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="camadas-titulo" numero="02" sobretitulo="Anatomia da placa" titulo="5 camadas. 5 mm de espessura."
              texto="O PFB não é um laminado comum: cada camada tem uma função, da proteção UV na superfície ao núcleo de bambu que dá resistência e sustentabilidade." />
          </Revelar>
          <HistoriaFixa passos={CAMADAS} />
          <Revelar className="mt-14 lg:mt-20 grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-8 items-center border-t border-surface-container-high pt-10">
            <Image src={img("product-anatomy", "/images/catalogue/product-anatomy.png")} alt="Seção transversal da placa PFB com as 5 camadas" width={732} height={1638} sizes="160px" className="h-[22rem] w-auto mx-auto" />
            <dl className="grid grid-cols-2 sm:grid-cols-4 border border-surface-variant bg-white">
              {[["2,90 × 1,20 m", "Placa"], ["3,48 m²", "Por placa"], ["5 mm", "Espessura"], ["≈ 11 kg", "Peso"]].map(([v, l], i) => (
                <div key={l} className={`p-4 lg:p-5 ${i < 3 ? "sm:border-r border-surface-variant" : ""} ${i % 2 === 0 ? "border-r sm:border-r-0" : ""} ${i < 2 ? "border-b sm:border-b-0 border-surface-variant" : ""}`}>
                  <dd className="font-serif text-primary text-t3">{v}</dd>
                  <dt className="text-on-surface-variant text-sobre tracking-[0.12em] uppercase font-semibold mt-1">{l}</dt>
                </div>
              ))}
            </dl>
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 03 Laudos e ART ────────────────────────────────────────────────── */}
      <Capitulo id="laudos" numero="03" rotulo="Laudos e ART" rotuladoPor="laudos-titulo" escuro className="ds-secao bg-[#0B1F45] text-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="laudos-titulo" numero="03" escuro sobretitulo="Ficha técnica" titulo="Desempenho comprovado em laboratório."
              texto="Ensaios certificados e Anotação de Responsabilidade Técnica de Engenheiro Civil. Os cinco números que importam, e os documentos completos logo abaixo." />
          </Revelar>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 lg:gap-6">
            {ESPECIFICACOES.map((e, i) => (
              <Revelar key={e.rotulo} como="li" ordem={i} className="border-l-2 border-[#2347A0] pl-3 lg:pl-5">
                <p className="font-serif text-white text-t2 leading-none">{e.valor}{e.unidade && <span className="text-lead text-[#B4BBC8] ml-1">{e.unidade}</span>}</p>
                <p className="text-[#B4BBC8] text-sobre tracking-[0.1em] uppercase font-semibold mt-2">{e.rotulo}</p>
                <p className="text-secondary text-sobre mt-0.5">{e.nota}</p>
              </Revelar>
            ))}
          </ul>
          <p className="text-[#B4BBC8]/80 text-legenda mt-5">Peso e densidade admitem tolerância de ±10%: o bambu é fibra natural e cada lote varia.</p>
          <Revelar className="mt-8">
            <ARTAccordion />
            <FichaTecnicaAccordion />
            <SolicitarManual />
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 04 Água e clima ────────────────────────────────────────────────── */}
      <Capitulo id="agua" numero="04" rotulo="Água e clima" rotuladoPor="agua-titulo" className="ds-secao bg-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="agua-titulo" numero="04" sobretitulo="Teste de resistência à água" titulo="48 horas submerso. 0,2% de absorção."
              texto="Uma placa de PFB ficou imersa por 48 horas em laboratório e saiu intacta: sem deformação, sem descolar. É o que faz o painel servir ao clima de Manaus, com umidade acima de 80% o ano inteiro." />
          </Revelar>
          <ul className="grid grid-cols-3 gap-2 lg:gap-4 max-w-4xl">
            {agua.map((a, i) => (
              <Revelar key={a.t} como="li" ordem={i} className="flex flex-col">
                <div className="relative aspect-[1536/2752] max-h-[26rem] overflow-hidden bg-surface-container">
                  <Image src={a.src} alt={`Teste de imersão do PFB: ${a.l}`} fill sizes="(max-width: 1023px) 30vw, 280px" className="object-cover object-top mv-desvela" />
                  <span className="absolute top-3 left-3 bg-white text-primary text-sm font-bold px-3 py-1.5">{a.t}</span>
                </div>
                <p className="text-primary font-semibold text-legenda mt-3">{a.l}</p>
                <p className="text-on-surface-variant text-legenda mt-1 hidden sm:block">{a.n}</p>
              </Revelar>
            ))}
          </ul>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-12">
            {CLIMA.map((c, i) => (
              <Revelar key={c.t} como="li" ordem={i} className="border border-surface-variant p-5">
                <p className="text-primary font-semibold text-corpo">{c.t}</p>
                <p className="text-on-surface-variant text-legenda mt-2 leading-relaxed">{c.d}</p>
              </Revelar>
            ))}
          </ul>
        </div>
      </Capitulo>

      {/* ── 05 Instalação ──────────────────────────────────────────────────── */}
      <Capitulo id="instalacao" numero="05" rotulo="Instalação" rotuladoPor="instalacao-titulo" escuro className="ds-secao bg-[#090e18] text-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="instalacao-titulo" numero="05" escuro sobretitulo="Instalado em horas" titulo="Colado sobre a superfície existente, sem obra."
              texto="Arraste a divisória: o mesmo lavabo antes e depois do PFB. Um cômodo fica pronto em duas a três horas, sem demolição e sem poeira." />
          </Revelar>
          <div className="max-w-[72rem]">
            <AntesDepois
              antes={{ src: "/images/academia/lavabo-consultorio-antes.jpg", alt: "Lavabo de consultório antes do PFB" }}
              depois={{ src: "/images/academia/lavabo-consultorio-depois.jpg", alt: "Lavabo de consultório depois, com PFB acabamento mármore e forro amadeirado" }} />
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {NOTAS.map((n, i) => (
              <Revelar key={n.t} como="li" ordem={i} className="border-l border-white/20 pl-5">
                <p className="text-white font-semibold text-corpo">{n.t}</p>
                <p className="text-white/70 text-legenda mt-2 leading-relaxed">{n.d}</p>
              </Revelar>
            ))}
          </ul>
          <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-20 items-center border-t border-white/10 pt-10">
            <Revelar>
              <Sobretitulo escuro>Opinião de instalador</Sobretitulo>
              <h3 className="font-serif text-white text-t2 font-normal tracking-[-0.02em] mt-4 mb-5 text-balance">Um serviço rápido. Sobra tempo para mais obras.</h3>
              <p className="text-white/75 text-corpo mb-6 max-w-xl text-pretty">
                Adam, da Werk Engenharia, conta como é instalar o PFB na prática: aplicação simples, placa leve de cerca de 11 kg, corte sem equipamento pesado e acabamento limpo.
              </p>
              <p className="text-white/70 text-legenda italic">
                A Orbital fornece o material e não realiza instalação. O passo a passo completo está no <SolicitarManual variant="link" />; a formação em instalação é da Academia Orbital.
              </p>
            </Revelar>
            <Revelar ordem={1}>
              <VideoShort id="hpgoCY8L2PI" poster="/images/videos/opiniao-instalador-adam-werk.jpg" titulo="Opinião de instalador" className="max-w-[320px] mx-auto" />
            </Revelar>
          </div>
        </div>
      </Capitulo>

      {/* ── 06 Ambiente ────────────────────────────────────────────────────── */}
      <Capitulo id="ambiente" numero="06" rotulo="Ambiente" rotuladoPor="ambiente-titulo" className="ds-secao bg-background">
        <div className="ds-wrap grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Revelar>
            <SecaoCabecalho id="ambiente-titulo" numero="06" sobretitulo="Impacto ambiental" titulo="Bambu cresce em meses. Uma árvore leva décadas."
              texto="O bambu rebrota após o corte, sem replantio. O PFB não contém formol nem compostos orgânicos voláteis: é inodoro e seguro para ambientes habitados, clínicas e espaços com crianças." />
            <ul className="space-y-3">
              {[["Bambu renovável", "Ciclo de cultivo de meses, não de décadas."], ["Sem formol", "Não emite VOCs. Seguro para clínicas, hospitais e casas com crianças."], ["Inodoro", "Zero odor de fábrica: instalável com o ambiente em uso."], ["Núcleo biodegradável", "Fibra natural ao fim da vida útil."]].map(([t, d]) => (
                <li key={t} className="flex gap-4">
                  <span aria-hidden className="w-6 h-px bg-secondary mt-3 flex-shrink-0" />
                  <p className="text-corpo"><span className="text-primary font-semibold">{t} — </span><span className="text-on-surface-variant">{d}</span></p>
                </li>
              ))}
            </ul>
          </Revelar>
          <Revelar ordem={1} className="relative aspect-[4/5] overflow-hidden bg-surface-container">
            <Image src={img("onde-aplicar-main", "/images/catalogue/onde-aplicar-main.jpeg")} alt="Material ecológico de bambu aplicado em ambiente interno" fill sizes="(max-width: 1023px) 92vw, 560px" className="object-cover mv-desvela" />
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 07 Próximo passo ───────────────────────────────────────────────── */}
      <Capitulo id="proximo-passo" numero="07" rotulo="Próximo passo" rotuladoPor="proximo-titulo" className="ds-secao bg-white border-t border-surface-container-high">
        <div className="ds-wrap">
          <Revelar className="max-w-3xl mx-auto text-center">
            <Sobretitulo numero="07">Pronto para especificar?</Sobretitulo>
            <h2 id="proximo-titulo" className="font-serif text-primary text-t2 font-normal tracking-[-0.02em] mt-4 mb-5 text-balance">Novas possibilidades para seus projetos.</h2>
            <p className="text-on-surface-variant text-lead mb-8 text-pretty">Ficha técnica completa (ART/CREA), amostras e suporte para arquitetos, designers e engenheiros, pelo pré-contato.</p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
              <Botao contato grande largo>Falar com um especialista</Botao>
              <Botao href="/produtos" tom="vazado" grande largo seta>Ver o catálogo</Botao>
            </div>
          </Revelar>
        </div>
      </Capitulo>
    </div>
  );
}
