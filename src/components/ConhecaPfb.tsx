import Image from "next/image";
import Link from "next/link";
import Capitulo from "@/components/ds/Capitulo";
import Revelar from "@/components/projetos/Revelar";
import { Sobretitulo } from "@/components/projetos/SecaoCabecalho";

// Selos do Painel Flexível em Fibra de Bambu (seção "Conheça o produto") — os
// mesmos do material comercial da Orbital, na mesma ordem e com o mesmo tom.
// Ícones do material da marca (vetorizados), em public/images/selos.
const PFB_SELOS: { t: string; d: string; img: string }[] = [
  { t: "Resistente à água", d: "Água, umidade e mofo", img: "agua" },
  { t: "Protegido contra pragas", d: "Cupins e outras pragas", img: "pragas" },
  { t: "Não propaga chamas", d: "Retardante de chamas", img: "chamas" },
  { t: "Instalação rápida", d: "Prática, com cola PU", img: "pu" },
  { t: "Materiais ecológicos", d: "Fibra de bambu renovável", img: "eco" },
  { t: "Flexível e durável", d: "Paredes e forros internos", img: "flex" },
];

/**
 * "Conheça o produto": apresenta o PFB (título, diferenciais com os ícones do
 * material da marca, medidas) e o leque de acabamentos que leva a /produtos/pfb.
 * Usado na home e como primeira seção de /tecnologia.
 */
export default function ConhecaPfb({ linkTecnologia = true, numero = "01" }: { linkTecnologia?: boolean; numero?: string }) {
  // Composição simétrica: título centralizado; duas colunas da mesma altura
  // (diferenciais | leque que leva à aba Produtos); medidas e botões centralizados.
  // É o capítulo "Produto" da apresentação (home e /tecnologia).
  return (
    <Capitulo id="produto" numero={numero} rotulo="Produto" rotuladoPor="produto-titulo" className="ds-secao bg-white border-b border-[#eeeeee]">
      <div className="ds-wrap">
        <Revelar className="text-center max-w-2xl mx-auto mb-8 lg:mb-10 flex flex-col items-center">
          <Sobretitulo numero={numero}>Conheça o produto</Sobretitulo>
          {/* O nome do produto fica sempre numa linha só: o tamanho acompanha a largura. */}
          <h2 id="produto-titulo" className="font-serif text-[#0B1F45] font-normal leading-[1.2] mt-4 mb-4 whitespace-nowrap text-[clamp(15px,4.9vw,26px)] sm:text-[30px] lg:text-t2">
            Painel Flexível em Fibra de Bambu (PFB)
          </h2>
          <p className="text-[#43474e] text-lead max-w-lg mx-auto text-pretty">
            Revestimento de fibra de bambu renovável para paredes e tetos internos — leve, flexível e ideal para o clima úmido de Manaus.
          </p>
        </Revelar>

        {/* Duas colunas da MESMA altura: a grade de diferenciais e o leque.
            Medidas e botões ficam centralizados embaixo, alinhados ao título. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
          <Revelar className="min-w-0">
            {/* Diferenciais com os ícones do material da Orbital: grade 2×3 de
                células iguais, sem números técnicos (confundem o leigo). */}
            <ul className="grid grid-cols-2 sm:grid-cols-3 border-t border-l border-[#ececec]">
              {PFB_SELOS.map((f) => (
                <li key={f.t} className="flex flex-col items-center text-center px-3 py-5 sm:py-6 border-r border-b border-[#ececec]">
                  <span className="w-12 h-12 flex items-center justify-center bg-[#F6F5F2]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/images/selos/pfb-icone-${f.img}.svg`} alt="" width={32} height={32} loading="lazy" className="h-8 w-8 object-contain" />
                  </span>
                  <span className="block text-[#0B1F45] text-[14px] font-medium leading-snug mt-3">{f.t}</span>
                  <span className="block text-[#74777f] text-[13px] leading-snug mt-1">{f.d}</span>
                </li>
              ))}
            </ul>
          </Revelar>
          <Revelar className="flex flex-col" ordem={1}>
            {/* Fanned swatch stack — real finishes, no numbers. Leva ao
                catálogo, onde o cliente escolhe o acabamento. */}
            <Link href="/produtos/pfb/catalogo" aria-label="Ver todos os modelos do Painel Flexível em Fibra de Bambu" className="group relative flex flex-col items-center justify-center h-[320px] sm:h-[360px] lg:h-auto">
              {/* Leque + selo formam um bloco só, centralizado na coluna —
                  assim o leque fica na altura do meio da grade ao lado. */}
              <div className="relative w-full h-[220px] sm:h-[260px] lg:h-[270px] flex items-center justify-center overflow-x-clip">
                {[
                  { img: "/images/catalogue/classic-bege-travertino-orb001.jpeg", rot: -18, x: -84 },
                  { img: "/images/catalogue/brilliance-bronze-armani-orb005.jpeg", rot: -9, x: -42 },
                  { img: "/images/catalogue/elegance-imbuia-orb002.jpeg", rot: 0, x: 0 },
                  { img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg", rot: 9, x: 42 },
                  { img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg", rot: 18, x: 84 },
                ].map((s, i) => (
                  <div
                    key={s.img}
                    className="absolute w-[116px] sm:w-[140px] lg:w-[152px] aspect-[3/4] overflow-hidden border-[3px] border-white ring-1 ring-[#0B1F45]/10 transition-transform duration-500 ease-out group-hover:scale-[1.015]"
                    style={{
                      transform: `rotate(${s.rot}deg) translate(${s.x}px, ${i === 2 ? -14 : 0}px)`,
                      zIndex: i === 2 ? 10 : 5 - Math.abs(i - 2),
                    }}
                  >
                    <Image src={s.img} alt="" fill className="object-cover" sizes="175px" />
                  </div>
                ))}
              </div>
              {/* Convite para os modelos, embaixo do leque */}
              <span className="relative mt-5 z-20 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 max-w-full text-center text-[#0B1F45] text-sobre tracking-[0.06em] sm:tracking-[0.14em] uppercase font-semibold">
                Classic · Brilliance · Elegance
                <span className="text-[#1F7A44] underline-offset-4 group-hover:underline">Ver todos →</span>
              </span>
            </Link>
          </Revelar>
        </div>

        <Revelar className="text-center mt-8 lg:mt-10">
          {/* Medidas da placa */}
          <p className="text-[#74777f] text-[13px] leading-relaxed">
            <span className="whitespace-nowrap">Placa de <strong className="text-[#0B1F45] font-semibold">1,20 × 2,90 m</strong></span> · <span className="whitespace-nowrap"><strong className="text-[#0B1F45] font-semibold">5 mm</strong> de espessura</span> · <span className="whitespace-nowrap"><strong className="text-[#0B1F45] font-semibold">3,48 m²</strong> por placa</span> · <span className="whitespace-nowrap">parede e forro</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-6">
            <Link
              href="/produtos/pfb/catalogo"
              className="ds-botao ds-botao-cheio min-h-12"
            >
              Ver os modelos
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            {linkTecnologia && (
              <Link href="/tecnologia" className="inline-flex items-center min-h-11 text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-bold hover:text-[#1F7A44] transition-colors">
                Tecnologia e ficha técnica →
              </Link>
            )}
          </div>
        </Revelar>
      </div>
    </Capitulo>
  );
}

/**
 * Versão curta (Academia): só os diferenciais, numa faixa de 6 (3×2 no
 * celular), com ícones menores e as medidas da placa. Sem o leque.
 * `tituloClassName` deixa a página usar a própria tipografia no título.
 */
export function DiferenciaisPfb({ tituloClassName }: { tituloClassName?: string }) {
  return (
    <section className="py-12 lg:py-20 bg-[#F6F5F2] text-[#0D1830]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
        <Revelar className="mb-8 lg:mb-10">
          <p className="text-[#2347A0] text-xs tracking-[0.2em] uppercase font-semibold mb-3">
            Conheça o produto
          </p>
          <h2 className={tituloClassName ?? "font-serif text-[#0B1F45] text-2xl lg:text-3xl font-normal"}>
            Painel Flexível em Fibra de Bambu (PFB)
          </h2>
        </Revelar>
        <ul className="grid grid-cols-3 lg:grid-cols-6 border-t border-l border-[#0D1830]/10 bg-white">
          {PFB_SELOS.map((f, i) => (
            <li key={f.t} className="border-r border-b border-[#0D1830]/10">
              <Revelar efeito="surge" ordem={i % 3} className="flex flex-col items-center text-center px-2 py-4 lg:py-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/selos/pfb-icone-${f.img}.svg`} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 object-contain" />
                <span className="block text-[#0B1F45] text-[12px] lg:text-[13px] font-semibold leading-tight mt-2">{f.t}</span>
                <span className="hidden sm:block text-[#74777f] text-[12px] leading-snug mt-0.5">{f.d}</span>
              </Revelar>
            </li>
          ))}
        </ul>
        <p className="text-[#74777f] text-[13px] leading-relaxed mt-4">
          <span className="whitespace-nowrap">Placa de <strong className="text-[#0B1F45] font-semibold">1,20 × 2,90 m</strong></span> · <span className="whitespace-nowrap"><strong className="text-[#0B1F45] font-semibold">5 mm</strong> de espessura</span> · <span className="whitespace-nowrap"><strong className="text-[#0B1F45] font-semibold">3,48 m²</strong> por placa</span> · <span className="whitespace-nowrap">parede e forro</span>
        </p>
      </div>
    </section>
  );
}
