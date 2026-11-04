import type { CSSProperties } from "react";
import IntroOrbitaControle from "./IntroOrbitaControle";
import {
  ASSINATURA_HORIZONTAL,
  ASSINATURA_VERTICAL,
  HORIZONTAL_TRANSFORMACAO,
  HORIZONTAL_VIEWBOX,
  SIMBOLO_FORMAS,
  VERTICAL_TRANSFORMACAO,
  VERTICAL_VIEWBOX,
  type Forma,
} from "./formasOrbital";

/**
 * Porteiro da intro, inline e síncrono no começo do <body>: roda antes da
 * primeira pintura, então a cortina já nasce na tela (sem piscar o site antes)
 * ou não aparece nunca. Só liga `data-intro="1"` fora das áreas restritas
 * (/admin, /parceiro, /representante, /orcamento e /o, com subcaminhos; por
 * segmento, para não pegar /parcerias nem /orcamentos-x), sem movimento reduzido, com
 * sessionStorage funcionando e na primeira página da visita. Nas áreas
 * restritas nem a chave é gravada: a intro fica para a primeira página pública.
 * Grava a chave antes de ligar o atributo: se gravar falhar, não há intro.
 * Qualquer erro cai no catch e deixa o atributo desligado.
 * Não usa <Script beforeInteractive>: no App Router ele é enfileirado para o
 * runtime do Next e não roda antes da pintura.
 */
const PORTEIRO = `(function(){try{
if(/^\\/(admin|parceiro|representante|orcamento|o)(\\/|$)/.test(location.pathname))return;
if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var s=window.sessionStorage;
if(s.getItem("orbital-intro")!==null)return;
s.setItem("orbital-intro","1");
if(s.getItem("orbital-intro")!=="1")return;
document.documentElement.setAttribute("data-intro","1");
}catch(e){}})();`;

/**
 * Centro da esfera no arquivo horizontal (meio da caixa das dez faixas, medida
 * nos paths oficiais). No vertical o símbolo é o mesmo, só deslocado pelo
 * translate do grupo; a diferença sai das duas transformações oficiais.
 */
const CENTRO_X = 100.37;
const CENTRO_Y = 100;
const primeiroTranslate = (t: string) => Number(/translate\(\s*(-?[\d.]+)/.exec(t)?.[1] ?? 0);
const DESLOCAMENTO_VERTICAL =
  primeiroTranslate(VERTICAL_TRANSFORMACAO) - primeiroTranslate(HORIZONTAL_TRANSFORMACAO);

/**
 * Coreografia das faixas, medida nos paths oficiais (coordenadas do arquivo
 * horizontal, relativas ao centro da esfera). `i` é o índice em SIMBOLO_FORMAS;
 * `angulo` é o eixo principal da faixa no sentido em que ela corre (azuis
 * descem para a direita, verdes sobem); `p` é o trecho que ela ocupa ao longo
 * desse eixo e `q` na perpendicular; `caixa` é a caixa da faixa (x0, y0), de
 * onde sai a origem do giro. As azuis entram de cima para baixo e as verdes de
 * baixo para cima, cada uma 110 ms depois da anterior: a última azul começa em
 * 440 ms e a última verde termina em 1,6 s.
 */
type Faixa = {
  i: number;
  atraso: number;
  angulo: number;
  p: [number, number];
  q: [number, number];
  caixa: [number, number];
};
const FAIXAS: Faixa[] = [
  { i: 5, atraso: 0, angulo: 30.9, p: [-77, 80.6], q: [-95.4, -60.2], caixa: [67, 0.9] },
  { i: 1, atraso: 110, angulo: 16.9, p: [-93.1, 31.6], q: [-62.9, -26.8], caixa: [21.8, 17.2] },
  { i: 3, atraso: 220, angulo: 11.9, p: [-100.9, -16.6], q: [-16.8, 25.8], caixa: [0, 63.1] },
  { i: 6, atraso: 330, angulo: 79.2, p: [-10.1, 81.9], q: [-91.9, -50], caixa: [150.8, 75.9] },
  { i: 2, atraso: 440, angulo: 76, p: [19.1, 101.1], q: [-47.9, 23.3], caixa: [86.1, 113.8] },
  { i: 4, atraso: 460, angulo: -14.2, p: [-80.6, 19.8], q: [50.8, 80.8], caixa: [36.8, 148] },
  { i: 7, atraso: 570, angulo: -69.5, p: [-27.9, 9.5], q: [55.7, 90], caixa: [147.9, 116.2] },
  { i: 0, atraso: 680, angulo: -28.1, p: [-97.1, 90.4], q: [-27.1, 22.9], caixa: [10.5, 39.3] },
  { i: 8, atraso: 790, angulo: -94.7, p: [-23.5, 17.5], q: [88.7, 100.4], caixa: [188.8, 74.8] },
  { i: 9, atraso: 900, angulo: 24.8, p: [-41.6, 38.9], q: [-100.1, -89.2], caixa: [100, 0] },
];

/** Cor das faixas azuis nos arquivos negativos (as demais são verdes). */
const AZUL = "#2F5FD0";

/** Largura da borda esfumada da varredura (unidades do viewBox). */
const BORDA_FAIXA = 32;
const BORDA_ASSINATURA = 120;

/** Prefixo dos ids dos paths do símbolo, desenhados uma vez e usados nos dois logos. */
const PREFIXO_FORMA = "io-f";

const arred = (v: number) => Math.round(v * 10) / 10;

/**
 * Conteúdo de uma máscara de varredura: um retângulo branco com a borda da
 * frente esfumada, girado para o eixo da forma. Parado, ele cobre a forma
 * inteira (sem a animação, tudo aparece); a animação o traz de trás da forma
 * (`--curso` negativo) até aqui, revelando-a ao longo do próprio eixo.
 */
function Varredura({
  cx,
  cy,
  angulo,
  p,
  q,
  borda,
  atraso,
  prefixo,
  classe,
}: {
  cx: number;
  cy: number;
  angulo: number;
  p: [number, number];
  q: [number, number];
  borda: number;
  atraso?: number;
  prefixo: string;
  classe: string;
}) {
  const folga = 2;
  const comprimento = p[1] - p[0] + 2 * folga;
  const x = arred(cx + p[0] - folga);
  const y = arred(cy + q[0] - folga);
  const altura = arred(q[1] - q[0] + 2 * folga);
  const estilo = {
    "--curso": `${arred(-(comprimento + borda))}px`,
    ...(atraso !== undefined ? { "--atraso": `${atraso}ms` } : {}),
  } as CSSProperties;
  return (
    <g transform={angulo ? `rotate(${angulo} ${arred(cx)} ${arred(cy)})` : undefined}>
      <g className={classe} style={estilo}>
        <rect x={x} y={y} width={arred(comprimento)} height={altura} fill="#fff" />
        <rect
          x={arred(x + comprimento)}
          y={y}
          width={borda}
          height={altura}
          fill={`url(#${prefixo}borda)`}
        />
      </g>
    </g>
  );
}

/** Caixa (x0, y0, x1, y1) dos paths do logotipo, para a varredura dele. */
type Caixa = [number, number, number, number];

/**
 * Um logo oficial (horizontal ou vertical) montado para a intro: cada faixa
 * num grupo próprio, com a transformação do grupo do arquivo, a sua máscara
 * de varredura e o giro em volta do centro da esfera; o logotipo depois, num
 * grupo que sobe e se revela da esquerda para a direita.
 */
function Logo({
  viewBox,
  transformacao,
  deslocamento,
  assinatura,
  caixaAssinatura,
  prefixo,
  classe,
}: {
  viewBox: string;
  transformacao: string;
  deslocamento: number;
  assinatura: Forma[];
  caixaAssinatura: Caixa;
  prefixo: string;
  classe: string;
}) {
  const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  const cx = CENTRO_X + deslocamento;
  const mascara = { maskUnits: "userSpaceOnUse", x: vx, y: vy, width: vw, height: vh } as const;
  const [ax0, ay0, ax1, ay1] = caixaAssinatura;
  return (
    <svg className={`intro-orbita__logo ${classe}`} viewBox={viewBox} focusable="false">
      <defs>
        <linearGradient id={`${prefixo}borda`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {FAIXAS.map((f) => (
          <mask key={f.i} id={`${prefixo}m${f.i}`} {...mascara}>
            <Varredura
              cx={cx}
              cy={CENTRO_Y}
              angulo={f.angulo}
              p={f.p}
              q={f.q}
              borda={BORDA_FAIXA}
              atraso={f.atraso}
              prefixo={prefixo}
              classe="intro-orbita__varredura"
            />
          </mask>
        ))}
        <mask id={`${prefixo}assinatura`} {...mascara}>
          <Varredura
            cx={0}
            cy={0}
            angulo={0}
            p={[ax0, ax1]}
            q={[ay0, ay1]}
            borda={BORDA_ASSINATURA}
            prefixo={prefixo}
            classe="intro-orbita__varredura-assinatura"
          />
        </mask>
      </defs>
      {/* Ordem de pintura do arquivo oficial; a ordem de entrada vem do atraso. */}
      {SIMBOLO_FORMAS.map((forma, i) => {
        const f = FAIXAS.find((x) => x.i === i)!;
        const estilo = {
          "--atraso": `${f.atraso}ms`,
          transformOrigin: `${arred(CENTRO_X - f.caixa[0])}px ${arred(CENTRO_Y - f.caixa[1])}px`,
        } as CSSProperties;
        return (
          <g
            key={i}
            className={`intro-orbita__faixa intro-orbita__faixa--${forma.fill === AZUL ? "azul" : "verde"}`}
            style={estilo}
            mask={`url(#${prefixo}m${i})`}
          >
            <g transform={transformacao}>
              <use href={`#${PREFIXO_FORMA}${i}`} />
            </g>
          </g>
        );
      })}
      <g className="intro-orbita__assinatura" mask={`url(#${prefixo}assinatura)`}>
        {assinatura.map((forma, i) => (
          <path key={i} fill={forma.fill} d={forma.d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Intro da órbita na primeira página da visita, com o logo oficial de 2026:
 * campo azul-marinho, as cinco faixas azuis e depois as cinco verdes do
 * símbolo se constroem uma a uma (cada uma varre o próprio eixo enquanto gira
 * alguns graus até o lugar), o logotipo ORBITAL REVESTIMENTOS sobe e se
 * revela, e o campo sobe como uma cortina, em cerca de 3 s. Horizontal a
 * partir de sm; no celular, o arquivo vertical. Componente de servidor: o
 * HTML já vem pronto e só aparece sob `html[data-intro="1"]` (globals.css);
 * sem JavaScript o atributo nunca liga e nada aparece. Fica fora do
 * SiteChrome porque o porteiro já pula as áreas restritas pelo caminho.
 */
export default function IntroOrbita() {
  return (
    <>
      <script id="intro-orbita-porteiro" dangerouslySetInnerHTML={{ __html: PORTEIRO }} />
      <div id="intro-orbita" className="intro-orbita" aria-hidden="true">
        {/* Os paths do símbolo uma vez só; os dois logos os usam com <use>. */}
        <svg className="intro-orbita__formas" width="0" height="0" focusable="false">
          <defs>
            {SIMBOLO_FORMAS.map((forma, i) => (
              <path key={i} id={`${PREFIXO_FORMA}${i}`} fill={forma.fill} d={forma.d} />
            ))}
          </defs>
        </svg>
        <div className="intro-orbita__conteudo">
          <Logo
            viewBox={HORIZONTAL_VIEWBOX}
            transformacao={HORIZONTAL_TRANSFORMACAO}
            deslocamento={0}
            assinatura={ASSINATURA_HORIZONTAL}
            caixaAssinatura={[232.7, 48.5, 638.8, 150.7]}
            prefixo="io-h-"
            classe="intro-orbita__logo--horizontal"
          />
          <Logo
            viewBox={VERTICAL_VIEWBOX}
            transformacao={VERTICAL_TRANSFORMACAO}
            deslocamento={DESLOCAMENTO_VERTICAL}
            assinatura={ASSINATURA_VERTICAL}
            caixaAssinatura={[0, 231.1, 333.1, 314]}
            prefixo="io-v-"
            classe="intro-orbita__logo--vertical"
          />
        </div>
      </div>
      <IntroOrbitaControle />
    </>
  );
}
