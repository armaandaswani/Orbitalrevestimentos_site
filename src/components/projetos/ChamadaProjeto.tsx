import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import { Sobretitulo } from "./SecaoCabecalho";

/**
 * Fechamento da página de Projetos: o próximo passo (consultor, pelo
 * pré-contato) e o catálogo. As três fotos só aparecem no computador.
 */
const FOTOS = [
  { src: "/images/projetos/lavabo1-depois.png", alt: "Lavabo revestido com PFB" },
  { src: "/images/projetos/hall-depois.png", alt: "Hall revestido com PFB" },
  { src: "/images/projetos/escritorio-depois.jpeg", alt: "Escritório revestido com PFB" },
];

export default function ChamadaProjeto() {
  return (
    <section className="py-16 lg:py-24 bg-white" aria-labelledby="chamada-titulo">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <Sobretitulo>Próximo projeto</Sobretitulo>
          <h2 id="chamada-titulo" className="font-serif text-primary text-3xl lg:text-5xl font-normal leading-[1.08] tracking-[-0.02em] mt-4 mb-5">
            Transforme o seu ambiente com o PFB!
          </h2>
          <p className="text-on-surface-variant text-base leading-relaxed mb-4 max-w-md">
            Escolha o acabamento, fale com um consultor e receba o orçamento completo do seu projeto.
            E com a nossa pronta-entrega, sua obra pode começar ainda essa semana!
          </p>
          <p className="text-[#1F7A44] text-sm font-bold tracking-[0.05em] mb-8">PFB: Prático, Fácil, Bonito.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <ContatoCta className="w-full sm:w-auto inline-flex items-center justify-center min-h-12 px-8 bg-primary text-white text-xs tracking-[0.12em] uppercase font-bold hover:bg-[#2347A0] transition-colors">
              Falar com um consultor
            </ContatoCta>
            <Link href="/produtos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-12 px-8 border border-primary text-primary text-xs tracking-[0.12em] uppercase font-bold hover:bg-primary hover:text-white transition-colors">
              Ver o catálogo
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <p className="text-on-surface-variant text-sm italic mt-8">Orbital · Manaus, AM · Somos fornecedores diretos e não realizamos instalação.</p>
        </div>
        <div className="hidden lg:grid grid-cols-3 gap-1.5">
          {FOTOS.map((f) => (
            <div key={f.src} className="relative aspect-[3/4] overflow-hidden">
              <Image src={f.src} alt={f.alt} fill sizes="200px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
