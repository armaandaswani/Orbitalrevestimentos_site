/**
 * PFB Carbon (Luxury Line): a linha de luxo do Painel Flexível em Fibra de
 * Bambu, em chegada. Fonte única da página (/pfb-carbon), do catálogo e da
 * lista de espera.
 *
 * Só entra aqui o que o dono afirmou (15/11/2026): uso interno em parede e
 * teto, substrato em fibra de bambu carbonizado, SPC dos dois lados, adesivo
 * de alta aderência e filme PET, mais estável em temperaturas altas, medida e
 * densidades. Não há laudo do Carbon: nenhum número de temperatura, umidade,
 * fogo ou resistência, e nada herdado da ficha do PFB.
 *
 * Sem import nenhum: roda no navegador, no servidor e no teste (node --test).
 * Imagem nova = nome novo (cache de 1 ano): troque o sufixo -v1.
 */
export interface ModeloCarbon {
  slug: string;
  nome: string;
}

/** Os modelos da pasta do dono. Louro Freijó abre a página. */
export const MODELOS_CARBON: ModeloCarbon[] = [
  { slug: "louro-freijo", nome: "Louro Freijó" },
  { slug: "carvalho-natural", nome: "Carvalho Natural" },
  { slug: "imbuia", nome: "Imbuia" },
  { slug: "jatoba", nome: "Jatobá" },
  { slug: "pau-ferro", nome: "Pau Ferro" },
];

export const MEDIDA = "2,80 × 1,20 m";
export const ESPESSURA = "5 mm";
/** Só a base, sem o filme PET. */
export const DENSIDADE_BASE = "650 kg/m³";
/** A placa pronta, com o filme PET. Valor aproximado: sempre com "cerca de". */
export const DENSIDADE_PLACA = "720 kg/m³";

/** De cima para baixo, nos termos do dono: nunca "cola", nunca só "bambu carbonizado". */
export const CAMADAS_CARBON = [
  "Filme PET",
  "Adesivo de alta aderência",
  "SPC",
  "Substrato em fibra de bambu carbonizado",
  "SPC",
] as const;

export const PAGINA_CARBON = "/pfb-carbon";
export const CATALOGO_CARBON = "/pfb-carbon/catalogo";

/** Textura na proporção da placa (600 × 1400), para a tela. */
export function textura(m: ModeloCarbon): string {
  return `/images/pfb-carbon/texturas/${m.slug}-v1.webp`;
}

/** Arquivo do dono, inteiro, para o arquiteto usar em render. */
export function texturaDownload(m: ModeloCarbon): string {
  return `/images/pfb-carbon/download/pfb-carbon-${m.slug}.jpg`;
}

/** Fotos reais da placa em corte (dono, 15/11/2026), só com cor e recorte tratados. */
export const FOTO_MIOLO = {
  faixa: { src: "/images/pfb-carbon/miolo-faixa-v1.webp", largura: 1190, altura: 550 },
  mao: { src: "/images/pfb-carbon/miolo-mao-v1.webp", largura: 1400, altura: 1050 },
};

/** Modelos como a lista de espera mostra. */
export const CATALOGO_ESPERA_CARBON: { nome: string; imagem: string; detalhe?: string }[] = MODELOS_CARBON.map((m) => ({
  nome: m.nome,
  imagem: textura(m),
  detalhe: MEDIDA,
}));

/**
 * Todo texto público da página e do catálogo. Passado por orbital-marca e
 * humanizer; o teste (pfb-carbon.test.mjs) barra os termos vetados.
 */
export const TEXTOS = {
  rotulo: "Luxury Line",
  nome: "PFB Carbon",
  abertura: {
    frases: [
      "Painel Flexível em Fibra de Bambu.",
      "Por dentro, bambu carbonizado.",
      "Feito para o clima da Amazônia.",
    ],
    convite: "Chega em breve a Manaus.",
    apoio: "Entre na lista e fique sabendo primeiro.",
    botao: "Entrar na lista de espera",
    modelos: "Ver os modelos",
  },
  miolo: {
    titulo: "Esta é a placa por dentro.",
    texto: "O miolo escuro é fibra de bambu carbonizado. É ele que deixa a placa mais estável quando a temperatura sobe.",
    legenda: "Foto real da placa em corte.",
    alt: "Placa do PFB Carbon em corte: miolo escuro de fibra de bambu carbonizado entre duas camadas claras de SPC",
  },
  camadas: {
    titulo: "Cinco camadas em 5 mm.",
    nota: "Desenho ilustrativo das camadas.",
  },
  clima: {
    titulo: "Aqui o clima é outro.",
    frases: [
      "A umidade fica alta o ano inteiro.",
      "O calor também.",
      "Por isso a Orbital muda a composição de cada material, olhando a umidade e a temperatura média do ano na região.",
    ],
    fecho: "No PFB Carbon, isso virou bambu carbonizado e SPC dos dois lados.",
  },
  numeros: {
    titulo: "A placa em números.",
    itens: [
      { valor: MEDIDA, rotulo: "Altura e largura" },
      { valor: ESPESSURA, rotulo: "Espessura" },
      { valor: DENSIDADE_BASE, rotulo: "Densidade da base" },
      { valor: DENSIDADE_PLACA, prefixo: "cerca de", rotulo: "Densidade da placa com o filme PET" },
    ],
    uso: "Para paredes e tetos, em ambientes internos.",
    alt: "Mão segurando a placa do PFB Carbon de lado, com o miolo escuro e as duas camadas claras de SPC à vista",
  },
  modelos: {
    titulo: "Cinco madeiras.",
    link: "Ver o catálogo",
  },
  lista: {
    titulo: "Quer saber quando chegar?",
    texto: "Deixe seu contato e o modelo de que gostou. A Orbital avisa pelo WhatsApp e pelo e-mail assim que o PFB Carbon estiver em Manaus.",
    botao: "Entrar na lista de espera",
  },
  perguntas: [
    {
      q: "Quando o PFB Carbon chega?",
      a: "Está a caminho. Quem está na lista de espera é avisado antes, pelo WhatsApp e pelo e-mail, assim que o material estiver em pronta-entrega em Manaus.",
    },
    {
      q: "Onde posso usar?",
      a: "Em paredes e tetos de ambientes internos.",
    },
    {
      q: "O que muda em relação ao PFB?",
      a: "O PFB Carbon é a linha de luxo do Painel Flexível em Fibra de Bambu. O substrato é de fibra de bambu carbonizado e a placa leva SPC dos dois lados, o que a deixa mais estável em temperaturas altas. O PFB continua em pronta-entrega em Manaus.",
    },
    {
      q: "Como é instalado?",
      a: "A Orbital fornece o material e a aplicação fica com o profissional da sua escolha. Um consultor tira suas dúvidas antes da compra.",
    },
    {
      q: "Qual o valor?",
      a: "Os valores são passados por um consultor.",
    },
    {
      q: "Posso usar as texturas no meu projeto?",
      a: "Pode. Cada modelo tem a textura para baixar, para renders e apresentações. A cor real pode variar um pouco em relação à tela.",
    },
  ],
  catalogo: {
    titulo: "Catálogo PFB Carbon",
    lead: "Cinco madeiras em placas de 2,80 × 1,20 m. Baixe a textura e veja o modelo no seu projeto.",
    voltar: "Voltar para o PFB Carbon",
    baixar: "Baixar textura",
    interesse: "Tenho interesse",
    aviso: "A cor real pode variar um pouco em relação à tela.",
  },
};
