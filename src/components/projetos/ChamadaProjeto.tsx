import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import Capitulo from "@/components/ds/Capitulo";
import Revelar from "./Revelar";
import { Sobretitulo } from "./SecaoCabecalho";

/**
 * Fechamento da apresentação de Projetos: o próximo passo (consultor, pelo
 * pré-contato) e o catálogo. As três fotos só aparecem no computador.
 */
const FOTOS = [
  { src: "/images/projetos/lavabo1-depois.png", alt: "Lavabo revestido com PFB" },
  { src: "/images/projetos/hall-depois.png", alt: "Hall revestido com PFB" },
  { src: "/images/projetos/escritorio-depois.jpeg", alt: "Escritório revestido com PFB" },
];

export default function ChamadaProjeto({ numero = "05" }: { numero?: string }) {
  return (
    <Capitulo id="proximo-passo" numero={numero} rotulo="Próximo passo" rotuladoPor="chamada-titulo" className="ds-secao bg-white">
      <div className="ds-wrap grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <Revelar>
          <Sobretitulo numero={numero}>Próximo projeto</Sobretitulo>
          <h2 id="chamada-titulo" className="font-serif text-primary text-t2 font-normal tracking-[-0.02em] mt-4 mb-5 text-balance">
            Novas possibilidades para o seu próximo projeto.
          </h2>
          <p className="text-on-surface-variant text-lead mb-4 max-w-md text-pretty">
            Escolha o acabamento, fale com um consultor e receba o orçamento completo do seu projeto.
            E com a nossa pronta-entrega, sua obra pode começar ainda essa semana!
          </p>
          <p className="text-[#1F7A44] text-legenda font-bold tracking-[0.05em] mb-8">PFB: Prático, Fácil, Bonito.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <ContatoCta className="ds-botao ds-botao-cheio w-full sm:w-auto min-h-12">
              Falar com um consultor
            </ContatoCta>
            <Link href="/produtos" className="ds-botao ds-botao-vazado w-full sm:w-auto min-h-12">
              Ver o catálogo
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <p className="text-on-surface-variant text-legenda italic mt-8">Orbital · Manaus, AM · Somos fornecedores diretos e não realizamos instalação.</p>
        </Revelar>
        <div className="hidden lg:grid grid-cols-3 gap-1.5">
          {FOTOS.map((f, i) => (
            <Revelar key={f.src} ordem={i} className="relative aspect-[3/4] overflow-hidden">
              <Image src={f.src} alt={f.alt} fill sizes="200px" className="object-cover mv-desvela" />
            </Revelar>
          ))}
        </div>
      </div>
    </Capitulo>
  );
}
