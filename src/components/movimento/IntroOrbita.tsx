import IntroOrbitaControle from "./IntroOrbitaControle";
import {
  ASSINATURA_FORMAS,
  ASSINATURA_RECORTES,
  ASSINATURA_VIEWBOX,
  SIMBOLO_CAIXA,
  SIMBOLO_FORMAS,
  SIMBOLO_RECORTES,
  SIMBOLO_VIEWBOX,
  type Forma,
} from "./formasOrbital";

/**
 * Porteiro da intro, inline e síncrono no começo do <body>: roda antes da
 * primeira pintura, então a cortina já nasce na tela (sem piscar o site antes)
 * ou não aparece nunca. Só liga `data-intro="1"` fora das áreas restritas
 * (/admin, /parceiro, /representante e /o, com subcaminhos; por segmento,
 * para não pegar /orcamento nem /parcerias), sem movimento reduzido, com
 * sessionStorage funcionando e na primeira página da visita. Nas áreas
 * restritas nem a chave é gravada: a intro fica para a primeira página pública.
 * Grava a chave antes de ligar o atributo: se gravar falhar, não há intro.
 * Qualquer erro cai no catch e deixa o atributo desligado.
 * Não usa <Script beforeInteractive>: no App Router ele é enfileirado para o
 * runtime do Next e não roda antes da pintura.
 */
const PORTEIRO = `(function(){try{
if(/^\\/(admin|parceiro|representante|o)(\\/|$)/.test(location.pathname))return;
if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var s=window.sessionStorage;
if(s.getItem("orbital-intro")!==null)return;
s.setItem("orbital-intro","1");
if(s.getItem("orbital-intro")!=="1")return;
document.documentElement.setAttribute("data-intro","1");
}catch(e){}})();`;

/** Centro do símbolo (meio do viewBox oficial), eixo das máscaras de arco. */
const CENTRO_X = SIMBOLO_CAIXA.x + SIMBOLO_CAIXA.largura / 2;
const CENTRO_Y = SIMBOLO_CAIXA.y + SIMBOLO_CAIXA.altura / 2;

/** Cor da faixa azul no símbolo negativo (as demais formas são a faixa verde). */
const AZUL_NEGATIVO = "#2F5FD0";

/**
 * Ângulo onde a órbita começa (graus, sentido horário a partir das 3 h): no
 * alto à esquerda, de onde as faixas entram no desenho.
 */
const INICIO_ARCO = -150;

/**
 * Prefixos dos ids de clipPath e máscara. Os dois arquivos oficiais usam os
 * mesmos ids (b, c), então cada SVG tem o seu, e ambos evitam colidir com
 * outros SVGs da página.
 */
const PREFIXO = "io-";
const PREFIXO_SIMBOLO = "io-s-";
const PREFIXO_ASSINATURA = "io-a-";

/**
 * Máscara de uma faixa: um círculo de traço tão largo que cobre o símbolo
 * inteiro (raio 42, traço 88 vai do centro até 86, além do raio 76 das
 * faixas). Animar o stroke-dashoffset varre uma fatia que cresce em volta do
 * centro, revelando a faixa ao longo do próprio arco.
 */
function MascaraArco({ faixa }: { faixa: "azul" | "verde" }) {
  return (
    <mask
      id={`${PREFIXO}mascara-${faixa}`}
      maskUnits="userSpaceOnUse"
      x={SIMBOLO_CAIXA.x}
      y={SIMBOLO_CAIXA.y}
      width={SIMBOLO_CAIXA.largura}
      height={SIMBOLO_CAIXA.altura}
    >
      <circle
        className={`intro-orbita__arco intro-orbita__arco--${faixa}`}
        cx={CENTRO_X}
        cy={CENTRO_Y}
        r="42"
        strokeWidth="88"
        pathLength={100}
        transform={`rotate(${INICIO_ARCO} ${CENTRO_X} ${CENTRO_Y})`}
      />
    </mask>
  );
}

/** Desenha um path oficial com seu clipPath (se houver) e, opcionalmente, uma máscara. */
function Path({ forma, prefixo, mascara }: { forma: Forma; prefixo: string; mascara?: string }) {
  const path = (
    <path fill={forma.fill} d={forma.d} mask={mascara ? `url(#${mascara})` : undefined} />
  );
  return forma.recorte ? (
    <g clipPath={`url(#${prefixo}${forma.recorte})`}>{path}</g>
  ) : (
    path
  );
}

/** clipPaths de um SVG oficial, com o prefixo daquele SVG. */
function Recortes({ recortes, prefixo }: { recortes: Record<string, string>; prefixo: string }) {
  return Object.entries(recortes).map(([id, d]) => (
    <clipPath key={id} id={`${prefixo}${id}`}>
      <path d={d} />
    </clipPath>
  ));
}

/**
 * Intro da órbita na primeira página da visita: campo azul-marinho, a faixa
 * azul e depois a verde do símbolo oficial desenhadas ao longo do arco, o
 * logotipo surge e o campo sobe como uma cortina. Componente de servidor: o
 * HTML já vem pronto e só aparece sob `html[data-intro="1"]` (globals.css);
 * sem JavaScript o atributo nunca liga e nada aparece. Fica fora do
 * SiteChrome porque o porteiro já pula as áreas restritas pelo caminho.
 */
export default function IntroOrbita() {
  return (
    <>
      <script id="intro-orbita-porteiro" dangerouslySetInnerHTML={{ __html: PORTEIRO }} />
      <div id="intro-orbita" className="intro-orbita" aria-hidden="true">
        <div className="intro-orbita__conteudo">
          <svg
            className="intro-orbita__simbolo"
            viewBox={SIMBOLO_VIEWBOX}
            focusable="false"
          >
            <defs>
              <Recortes recortes={SIMBOLO_RECORTES} prefixo={PREFIXO_SIMBOLO} />
              <MascaraArco faixa="azul" />
              <MascaraArco faixa="verde" />
            </defs>
            {/* Ordem de pintura do arquivo oficial; cada path leva a máscara da sua faixa. */}
            {SIMBOLO_FORMAS.map((forma, i) => (
              <Path
                key={i}
                forma={forma}
                prefixo={PREFIXO_SIMBOLO}
                mascara={`${PREFIXO}mascara-${forma.fill === AZUL_NEGATIVO ? "azul" : "verde"}`}
              />
            ))}
          </svg>
          <svg
            className="intro-orbita__assinatura"
            viewBox={ASSINATURA_VIEWBOX}
            focusable="false"
          >
            <defs>
              <Recortes recortes={ASSINATURA_RECORTES} prefixo={PREFIXO_ASSINATURA} />
            </defs>
            {ASSINATURA_FORMAS.map((forma, i) => (
              <Path key={i} forma={forma} prefixo={PREFIXO_ASSINATURA} />
            ))}
          </svg>
        </div>
      </div>
      <IntroOrbitaControle />
    </>
  );
}
