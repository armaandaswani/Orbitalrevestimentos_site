import Image from "next/image";
import Link from "next/link";
import { coverStyle } from "@/lib/cover-crop";
import { contaAmbientes, linkComoChegar, lugarNovo, type Showroom } from "@/lib/projetos-tipos";

/**
 * Cartão de um lugar para ver o PFB ao vivo: showroom parceiro ou ponto de
 * revenda. O que o visitante precisa para ir até lá fica no próprio cartão:
 * endereço, quantos ambientes tem e "Como chegar".
 */

const botao = "inline-flex items-center justify-center gap-2 min-h-11 px-3 text-xs tracking-[0.08em] whitespace-nowrap uppercase font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0]";
const seta = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>;

export default function LugarCard({ lugar, agora }: { lugar: Showroom; agora: number }) {
  const revenda = lugar.kind === "revenda";
  const temPagina = !revenda || lugar.ambient_count > 0;
  const capa = lugar.display_cover;
  return (
    <article className="h-full bg-white border border-surface-variant flex flex-col">
      <div className="relative w-full overflow-hidden bg-primary" style={{ aspectRatio: "4 / 3" }}>
        {capa ? (
          <Image src={capa} alt={`${lugar.name}: ambiente com PFB`} fill sizes="(max-width: 639px) 84vw, (max-width: 1023px) 46vw, 31vw"
            style={coverStyle(lugar.display_focus_x, lugar.display_focus_y, lugar.display_zoom)} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#36A35C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 9l1.5-5h15L21 9" /><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z" /><path d="M5 13v7h14v-7" /><path d="M10 20v-4h4v4" />
            </svg>
            <p className="text-white/80 text-sm mt-3">{revenda ? "Todos os modelos em display" : "Fotos em breve"}</p>
          </div>
        )}
        <span className="absolute top-3 left-3 flex gap-1">
          <span className="bg-white text-primary text-xs tracking-[0.12em] uppercase font-bold px-2 py-1">{revenda ? "Revenda" : "Showroom"}</span>
          {lugarNovo(lugar.created_at, agora) && <span className="bg-secondary text-primary text-xs tracking-[0.12em] uppercase font-bold px-2 py-1">Novo</span>}
        </span>
      </div>
      <div className="px-5 pt-4 pb-5 flex-1 flex flex-col">
        <h3 className="font-serif text-primary text-xl leading-tight">{lugar.name}</h3>
        {lugar.address && <p className="text-on-surface-variant text-sm mt-2 leading-snug">{lugar.address}</p>}
        {revenda && lugar.description && <p className="text-on-surface-variant text-sm mt-2 leading-snug">{lugar.description}</p>}
        {lugar.ambient_count > 0 && <p className="text-on-surface-variant text-sm mt-2 font-semibold">{contaAmbientes(lugar.ambient_count)} com PFB</p>}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-5">
          {temPagina ? (
            <Link href={`/projetos/showroom/${lugar.slug}`} className={`${botao} bg-primary text-white hover:bg-[#2347A0]`}>
              {revenda ? "Projetos" : "Ambientes"} {seta}
            </Link>
          ) : (
            <Link href="/produtos" className={`${botao} bg-primary text-white hover:bg-[#2347A0]`}>Modelos {seta}</Link>
          )}
          <a href={linkComoChegar(lugar)} target="_blank" rel="noopener noreferrer"
            className={`${botao} border border-primary text-primary hover:bg-primary hover:text-white`}>
            Como chegar
          </a>
        </div>
      </div>
    </article>
  );
}
