import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

// Selos do Painel Flexível Fibra de Bambu (seção "Conheça o produto") — os
// mesmos do material comercial da Orbital, na mesma ordem e com o mesmo tom.
// Ícones do material da marca (vetorizados), em public/images/selos.
const PFB_SELOS: { t: string; d: string; img: string }[] = [
  { t: "Resistente à água", d: "Água, umidade e mofo", img: "agua" },
  { t: "Protegido contra pragas", d: "Cupins e outras pragas", img: "pragas" },
  { t: "Não propaga chamas", d: "Retardante de chamas", img: "chamas" },
  { t: "Instalação rápida e prática", d: "Com cola PU", img: "pu" },
  { t: "Materiais ecológicos", d: "Fibra de bambu renovável", img: "eco" },
  { t: "Flexível e durável", d: "Paredes e forros internos", img: "flex" },
];

/**
 * "Conheça o produto": apresenta o PFB (título, diferenciais com os ícones do
 * material da marca, medidas) e o leque de acabamentos que leva a /produtos.
 * Usado na home e como primeira seção de /tecnologia.
 */
export default function ConhecaPfb({ linkTecnologia = true }: { linkTecnologia?: boolean }) {
  // Título centralizado; embaixo, duas colunas do mesmo peso: os
  // diferenciais (esquerda) e o leque que leva à aba Produtos.
  return (
    <section className="py-12 lg:py-24 bg-white border-b border-[#eeeeee]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Conheça o produto
          </p>
          {/* O nome do produto fica sempre numa linha só: o tamanho acompanha a largura. */}
          <h2 className="font-serif text-[#002045] font-normal leading-[1.2] mb-4 whitespace-nowrap text-[clamp(15px,4.9vw,26px)] sm:text-[30px] lg:text-[36px]">
            Painel Flexível Fibra de Bambu (PFB)
          </h2>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed max-w-lg mx-auto">
            Revestimento de fibra de bambu renovável para paredes e tetos internos — leve, flexível e ideal para o clima úmido de Manaus.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <ScrollReveal className="min-w-0" direction="left">
            {/* Diferenciais com os ícones do material da Orbital. Lista leve,
                em frases curtas — sem números técnicos, que confundem o leigo. */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-8 border-b border-[#ececec]">
              {PFB_SELOS.map((f) => (
                <li key={f.t} className="flex items-center gap-4 py-4 border-t border-[#ececec]">
                  <span className="flex-shrink-0 w-14 h-14 flex items-center justify-center bg-[#f3f5f8]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/images/selos/pfb-selo-${f.img}.svg`} alt="" width={32} height={32} loading="lazy" className="h-9 w-9 object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[#002045] text-[15px] font-semibold font-[var(--font-inter)] leading-snug">{f.t}</span>
                    <span className="block text-[#74777f] text-[13px] font-[var(--font-inter)] leading-snug mt-0.5">{f.d}</span>
                  </span>
                </li>
              ))}
            </ul>
            {/* Medidas da placa */}
            <p className="text-[#74777f] text-[13px] font-[var(--font-inter)] leading-relaxed mt-5">
              <span className="whitespace-nowrap">Placa de <strong className="text-[#002045] font-semibold">1,20 × 2,90 m</strong></span> · <span className="whitespace-nowrap"><strong className="text-[#002045] font-semibold">5 mm</strong> de espessura</span> · <span className="whitespace-nowrap"><strong className="text-[#002045] font-semibold">3,48 m²</strong> por placa</span> · <span className="whitespace-nowrap">parede e forro</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8">
              <Link
                href="/produtos"
                className="inline-flex items-center justify-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#1a365d] transition-colors"
              >
                Ver os modelos
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              {linkTecnologia && (
                <Link href="/tecnologia" className="text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:text-[#3b6934] transition-colors">
                  Tecnologia e ficha técnica →
                </Link>
              )}
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right" delay={100}>
            {/* Fanned swatch stack — real finishes, no numbers. Leva ao
                catálogo, onde o cliente escolhe o acabamento. */}
            <Link href="/produtos" aria-label="Ver todos os modelos do Painel Flexível Fibra de Bambu" className="group relative block h-[300px] sm:h-[380px] lg:h-[440px]">
              <div className="absolute inset-0 flex items-center justify-center">
                {[
                  { img: "/images/catalogue/classic-bege-travertino-orb001.jpeg", rot: -18, x: -84 },
                  { img: "/images/catalogue/brilliance-bronze-armani-orb005.jpeg", rot: -9, x: -42 },
                  { img: "/images/catalogue/elegance-imbuia-orb002.jpeg", rot: 0, x: 0 },
                  { img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg", rot: 9, x: 42 },
                  { img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg", rot: 18, x: 84 },
                ].map((s, i) => (
                  <div
                    key={s.img}
                    className="absolute w-[120px] sm:w-[150px] lg:w-[175px] aspect-[3/4] shadow-2xl overflow-hidden border-[3px] border-white transition-transform duration-500 ease-out group-hover:scale-[1.015]"
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
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 whitespace-nowrap bg-white border border-[#e2e2e2] shadow-md px-4 py-2.5 text-[#002045] text-[10px] sm:text-[11px] tracking-[0.14em] uppercase font-bold font-[var(--font-inter)] group-hover:bg-[#002045] group-hover:text-white group-hover:border-[#002045] transition-colors">
                Classic · Brilliance · Elegance
                <span className="text-[#3b6934] group-hover:text-[#a1d494]">Ver todos →</span>
              </span>
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
