import type { CSSProperties } from "react";
import {
  ALTURA_MAPA,
  LARGURA_MAPA,
  aproximarPinos,
  cabePino,
  dentroDeManaus,
  projetarManaus,
  rotulosDeBairro,
  type PontoDeVenda,
} from "@/lib/pontos-de-venda";
import { ESTILO_MANAUS, MAPA_SVG, ROTULOS_FIXOS, type CAMADAS_MANAUS } from "./dados-mapa-manaus";

/** Imagem do pino. Se o dono preferir um pino neutro (Pergunta 4), basta trocar esta constante. */
export const PINO_PDV = "/images/brand/orbital-simbolo.svg";

const { cor, largura } = ESTILO_MANAUS;

/** Uma camada do desenho no SVG estático (public/images/onde-comprar/mapa-manaus.svg, gerado). */
const camada = (id: (typeof CAMADAS_MANAUS)[number]) => `${MAPA_SVG}#${id}`;

/** Posição em % do contêiner, para o mapa escalar sem JS e sem deslocar nada (sem CLS). */
const paraPorcento = (valor: number, total: number) => `${((valor / total) * 100).toFixed(2)}%`;
const posicao = (x: number, y: number) => ({ left: paraPorcento(x, LARGURA_MAPA), top: paraPorcento(y, ALTURA_MAPA) });

/**
 * `rotulosDeBairro` põe o rótulo 34 unidades abaixo da ponta do pino mais baixo
 * do bairro. Centrado ali, o texto ficava ~30 px abaixo da ponta a 390 px, bem
 * mais longe que no quadro aprovado (4 px até o topo do texto); a posição volta
 * para a ponta e a âncora passa a ser o topo do texto.
 */
const DESCIDA_ROTULO = 34;

/** Halo da cor do fundo, para o texto continuar legível sobre ruas e água. */
const HALO = "[text-shadow:0_0_2px_var(--color-background),0_0_3px_var(--color-background),0_0_5px_var(--color-background),0_0_7px_var(--color-background)]";

/**
 * Mapa real de Manaus (OpenStreetMap, desenhado por scripts/gerar-mapa-manaus.mjs)
 * com um pino por loja. Server Component: nada disto entra no JS do cliente. O
 * desenho vem do SVG estático por <use href> (vetor: não é candidato a LCP) e
 * não pesa no HTML nem no payload RSC; o HTML leva só cores, pinos e rótulos. Recebe os pontos já filtrados como ativos.
 * Com a folha de uma loja aberta, a IlhaPdv marca o pino dela com
 * `data-pdv-ativo` (fica entre o véu e a folha) e os outros com `data-pdv-apagado`; a
 * transição dos pinos só liga com `data-pdv-transicao` num ancestral (abertura por clique).
 *
 * Tudo mora no contêiner `relative` (proporção fixa 400 × 480, sem CLS), onde a
 * abertura da página também entra. Loja fora de Manaus ou sem espaço para o
 * pino (`cabePino`) só aparece na lista. Se `aproximarPinos` lançar, o erro
 * sobe de propósito: o build falha em vez de publicar pinos sobrepostos.
 */
export function MapaManaus({ pontos }: { pontos: PontoDeVenda[] }) {
  const pinos = aproximarPinos(
    pontos.flatMap((p) => {
      if (p.lat === null || p.lng === null || !dentroDeManaus(p.lat, p.lng)) return [];
      const { x, y } = projetarManaus(p.lat, p.lng);
      return cabePino({ x, y }) ? [{ slug: p.slug, x, y }] : [];
    }),
  );
  const bairros = rotulosDeBairro(pontos);

  return (
    // pdv-mapa-caixa: sem aspect-ratio (iOS 14), o globals.css segura a proporção com height 0 + padding-bottom 120%.
    <div className="pdv-mapa-caixa relative w-full overflow-hidden" style={{ aspectRatio: `${LARGURA_MAPA} / ${ALTURA_MAPA}` }}>
      <svg
        viewBox={`0 0 ${LARGURA_MAPA} ${ALTURA_MAPA}`}
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 block h-full w-full"
      >
        {/* Terra (token background), parques, água, ilhas por cima da água, depois as vias. */}
        {/* O desenho mora no SVG estático (uma vez cada camada, em cache), fora do HTML e do payload RSC; cor e traço vêm daqui, por herança do <use>. */}
        <rect width={LARGURA_MAPA} height={ALTURA_MAPA} className="fill-background" />
        <use href={camada("parques")} fill={cor.parque} />
        <use href={camada("agua")} fill={cor.agua} />
        <use href={camada("ilhas")} className="fill-background" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <use href={camada("igarapes")} stroke={cor.agua} strokeWidth={largura.igarape} />
          <use href={camada("terciaria")} stroke={cor.terciaria} strokeWidth={largura.terciaria} />
          {/* Principais e secundárias: o mesmo desenho duas vezes, borda e preenchimento. */}
          <use href={camada("principal")} stroke={cor.principalBorda} strokeWidth={largura.principalBorda} />
          <use href={camada("secundaria")} stroke={cor.principalBorda} strokeWidth={largura.secundariaBorda} />
          <use href={camada("secundaria")} className="stroke-surface-container-lowest" strokeWidth={largura.secundaria} />
          <use href={camada("principal")} className="stroke-surface-container-lowest" strokeWidth={largura.principal} />
        </g>
      </svg>

      {/* Rio, avenida e bairros: só orientação. A lista de lojas é o caminho acessível. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        {ROTULOS_FIXOS.map((r) => (
          <span
            key={r.texto}
            className={
              r.texto === "Rio Negro"
                ? "absolute whitespace-nowrap font-serif text-[15px] font-normal italic text-surface-tint"
                : `absolute whitespace-nowrap font-sans text-[11px] font-medium text-outline ${HALO}`
            }
            style={{ ...posicao(r.x, r.y), transform: `translate(-50%, -50%) rotate(${r.rotacao}deg)` }}
          >
            {r.texto}
          </span>
        ))}
        {bairros.map((b) => (
          <span
            key={b.bairro}
            className={`absolute whitespace-nowrap font-sans text-xs font-medium text-on-surface ${HALO}`}
            style={
              b.y < ALTURA_MAPA - 8
                ? // Como no quadro aprovado: o topo do texto 4 px abaixo da ponta do pino mais baixo.
                  { ...posicao(b.x, b.y - DESCIDA_ROTULO), transform: "translate(-50%, 4px)" }
                : // Rótulo encostado no fundo do mapa: fica centrado onde rotulosDeBairro pôs.
                  { ...posicao(b.x, b.y), transform: "translate(-50%, -50%)" }
            }
          >
            {b.bairro}
          </span>
        ))}
      </div>

      {/* --i e --n: ordem da queda na abertura (globals.css, "Onde comprar: abertura"); sem a abertura não fazem nada. */}
      {pinos.map((p, i) => (
        <a
          key={p.slug}
          href={`?loja=${encodeURIComponent(p.slug)}`}
          data-pdv-pino={p.slug}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-full place-items-start [[data-pdv-transicao]_&]:transition-opacity data-[pdv-apagado]:opacity-35 data-[pdv-ativo]:z-[56] justify-items-center after:absolute after:bottom-0 after:left-1/2 after:-z-10 after:h-2.5 after:w-2.5 after:-translate-x-1/2 after:-translate-y-px after:rotate-45 after:bg-surface-container-lowest after:shadow-[2px_2px_2px_rgba(11,31,69,0.18)]"
          style={{ ...posicao(p.x, p.y), "--i": i, "--n": pinos.length } as CSSProperties}
        >
          {/* SVG da marca de 36 px em disco branco (o desenho aprovado); o 44 do atributo é a caixa do alvo de toque. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PINO_PDV}
            alt=""
            width={44}
            height={44}
            decoding="async"
            className="box-border h-9 w-9 rounded-full bg-surface-container-lowest p-1.5 shadow-[0_1px_3px_rgba(11,31,69,0.28)]"
          />
        </a>
      ))}

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener"
        className="absolute bottom-0 right-0 inline-flex min-h-6 min-w-6 items-center bg-surface-container-lowest px-2 text-xs leading-snug text-on-surface-variant"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}

export default MapaManaus;
