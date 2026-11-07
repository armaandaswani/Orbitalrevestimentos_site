import Revelar from "@/components/projetos/Revelar";
import { FICHA } from "@/lib/pfb-textos";

/**
 * A placa do PFB em escala, ao lado de uma porta (spec, item 24 e "Placa em
 * escala"). SVG com 1 unidade = 1 cm: a placa de 120 × 290 e a porta de
 * 80 × 210 sobre o mesmo chão. Os rótulos de medida são HTML por cima do
 * desenho, em posição proporcional à caixa, para o texto não escalar com o
 * SVG. O desenho tem role="img" e aria-label; os rótulos repetem o que o
 * aria-label já diz.
 */
export default function PlacaEmEscala() {
  const { figura } = FICHA;
  return (
    <figure className="relative">
      <Revelar efeito="surge">
        <div className="relative aspect-[340/350] w-full max-w-[16rem] mx-auto lg:max-w-none">
          <svg viewBox="0 0 340 350" role="img" aria-label={figura.ariaLabel} className="absolute inset-0 w-full h-full">
            <line x1={20} y1={320} x2={330} y2={320} stroke="#0B1F45" strokeOpacity={0.3} strokeWidth={1} />
            <rect x={60} y={30} width={120} height={290} fill="#F6F5F2" stroke="#0B1F45" strokeWidth={1.5} />
            <rect x={230} y={110} width={80} height={210} fill="none" stroke="#0B1F45" strokeOpacity={0.5} strokeWidth={1.25} />
            <circle cx={298} cy={220} r={3} fill="#0B1F45" fillOpacity={0.5} />
          </svg>
          <span
            aria-hidden="true"
            className="absolute text-legenda text-[#0B1F45] text-right"
            style={{ left: 0, width: "16.5%", top: "50%", translate: "0 -50%" }}
          >
            {figura.altura}
          </span>
          <span
            aria-hidden="true"
            className="absolute text-legenda text-[#0B1F45] text-center"
            style={{ left: "17.6%", width: "35.3%", top: "93%" }}
          >
            {figura.largura}
          </span>
        </div>
      </Revelar>
      <figcaption className="text-legenda text-[#43474e] mt-3 max-w-[16rem] mx-auto lg:max-w-none">{figura.legenda}</figcaption>
    </figure>
  );
}
