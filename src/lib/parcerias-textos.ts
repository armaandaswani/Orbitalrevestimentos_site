/**
 * Textos e dados das páginas de parceria: a porta de entrada (/parcerias), as
 * páginas por perfil (/parcerias/arquitetos, /marceneiros, /engenheiros) e a
 * seção "Quer revender" no fim de /onde-comprar.
 *
 * Fatos conferidos no Vault (Programa de parceiros, Ficha técnica) em
 * 15/11/2026. Sem comparação com outros materiais, sem preço e sem número que
 * não esteja na ficha técnica. Uma ideia por linha: cada perfil tem um título,
 * uma frase e três benefícios.
 *
 * Desde 24/11/2026 (dono) só arquitetos e designers fazem o cadastro do portal
 * (eles indicam clientes: cupom, comissão, simulações). Marceneiros,
 * engenheiros e revendedores respondem o pré-contato de parceiros, que
 * termina no WhatsApp (ParceiroSheet, lib/parceiro-contato).
 */

import type { PerfilParceiro } from "./parceiro-contato";

export type PerfilSlug = "arquitetos" | "marceneiros" | "engenheiros";

export interface Beneficio {
  titulo: string;
  texto: string;
}

export interface PerfilParceria {
  slug: PerfilSlug;
  /** Nome do perfil no cartão e na trilha de navegação. */
  nome: string;
  titulo: string;
  lead: string;
  beneficios: [Beneficio, Beneficio, Beneficio];
  /** Profissões que o cadastro oferece; a primeira já vem marcada. Valores iguais aos do portal. */
  profissoes: string[];
  /**
   * Com isso, a página troca o cadastro do portal pelo pré-contato desse
   * perfil (perguntas e WhatsApp); sem, segue o cadastro (arquitetos).
   */
  contato?: PerfilParceiro;
  imagem: string;
  alt: string;
  /** Texto do <title> e da descrição da página. */
  meta: { titulo: string; descricao: string };
}

export const PERFIS: PerfilParceria[] = [
  {
    slug: "arquitetos",
    nome: "Arquitetos e designers",
    titulo: "O projeto que o seu cliente ainda vai elogiar daqui a cinco anos.",
    lead: "Especifique o Painel Flexível em Fibra de Bambu com amostras, texturas e documentação na mão.",
    beneficios: [
      { titulo: "Amostras para o moodboard", texto: "Parceiros recebem amostras físicas para apresentar ao cliente." },
      { titulo: "Textura de cada modelo", texto: "Baixe as texturas e use nos seus renders." },
      { titulo: "Documentação técnica", texto: "ART de Engenharia Civil e ficha técnica para o seu memorial." },
    ],
    profissoes: ["Arquiteto e Urbanista", "Designer de interiores"],
    imagem: "/images/catalogue/aplicacao-sala.jpeg",
    alt: "Sala de estar com parede revestida com o Painel Flexível em Fibra de Bambu em acabamento de mármore",
    meta: {
      titulo: "Parceria para arquitetos e designers de interiores",
      descricao: "Amostras, texturas para render e documentação técnica do Painel Flexível em Fibra de Bambu para arquitetos e designers de interiores em Manaus. Cadastre-se e receba o seu cupom de parceiro.",
    },
  },
  {
    slug: "marceneiros",
    nome: "Marceneiros",
    titulo: "Quem instala rápido, fecha mais contratos.",
    lead: "Um cômodo em 2 a 3 horas, com obra limpa.",
    beneficios: [
      { titulo: "Compra direta", texto: "Parceiros compram as placas com condições próprias." },
      { titulo: "Manual técnico de instalação", texto: "O passo a passo da aplicação, do preparo ao acabamento." },
      { titulo: "Formação da Academia Orbital", texto: "Aprenda o padrão Orbital de instalação." },
    ],
    profissoes: ["Marceneiro"],
    contato: "marceneiro",
    imagem: "/images/catalogue/projeto-escritorio-depois.jpeg",
    alt: "Escritório com paredes revestidas com o Painel Flexível em Fibra de Bambu",
    meta: {
      titulo: "Parceria para marceneiros",
      descricao: "Compra direta, manual técnico e formação em instalação do Painel Flexível em Fibra de Bambu para marceneiros em Manaus. Fale com a equipe da Orbital pelo WhatsApp.",
    },
  },
  {
    slug: "engenheiros",
    nome: "Engenheiros",
    titulo: "ART homologada, documentação completa, aprovação sem improviso.",
    lead: "Dados de ensaio e responsabilidade técnica para especificar com segurança.",
    beneficios: [
      { titulo: "ART de Engenharia Civil", texto: "Com registro no CREA, disponível para o seu projeto." },
      { titulo: "Ficha técnica", texto: "72,3 MPa de resistência à flexão e 0,2% de absorção de água em 48 h." },
      { titulo: "Feito para áreas internas exigentes", texto: "Resistente a mofo e cupim, e não propaga chamas." },
    ],
    profissoes: ["Engenheiro civil"],
    contato: "engenheiro",
    imagem: "/images/catalogue/projeto-hall.jpeg",
    alt: "Hall de entrada com parede revestida com o Painel Flexível em Fibra de Bambu",
    meta: {
      titulo: "Parceria para engenheiros",
      descricao: "ART de Engenharia Civil, ficha técnica e dados de ensaio do Painel Flexível em Fibra de Bambu para engenheiros em Manaus. Fale com a equipe da Orbital pelo WhatsApp.",
    },
  },
];

export function perfilDe(slug: string): PerfilParceria | undefined {
  return PERFIS.find((p) => p.slug === slug);
}

/** Âncoras fixas: o link que o dono copia e manda termina em #cadastro. */
export const ANCORA_CADASTRO = "cadastro";
export const ANCORA_REVENDER = "quero-revender";

/** Cartões da porta de entrada, na ordem. Revendedores e aplicadores levam às páginas deles. */
export const CARTOES_PARCERIA: { nome: string; frase: string; href: string; imagem: string; alt: string }[] = [
  ...PERFIS.map((p) => ({
    nome: p.nome,
    frase: {
      arquitetos: "Amostras e texturas para o seu projeto.",
      marceneiros: "Um cômodo em 2 a 3 horas.",
      engenheiros: "ART e ficha técnica para aprovar sem improviso.",
    }[p.slug],
    href: `/parcerias/${p.slug}`,
    imagem: p.imagem,
    alt: p.alt,
  })),
  {
    nome: "Revendedores",
    frase: "A linha Orbital na sua loja.",
    href: `/onde-comprar#${ANCORA_REVENDER}`,
    imagem: "/images/catalogue/projeto-sala-depois.jpeg",
    alt: "Sala com parede revestida com o Painel Flexível em Fibra de Bambu",
  },
  {
    nome: "Aplicadores",
    frase: "Formação da Academia Orbital.",
    href: "/academia",
    imagem: "/images/academia/lavabo-consultorio-inteiro.jpg",
    alt: "Lavabo de consultório revestido com o Painel Flexível em Fibra de Bambu",
  },
];

export const PORTA = {
  titulo: "Para cada profissional, uma proposta única.",
  lead: "Escolha o seu perfil.",
  portal: "Já é parceiro?",
  portalLink: "Entrar no portal",
};

export const CADASTRO = {
  // Hífen que não quebra (U+2011): o título não parte em "Cadastre-" / "se".
  titulo: "Cadastre\u2011se e receba o seu cupom de parceiro.",
  apoio: "A equipe ativa o cadastro em até 24 horas e avisa por e-mail.",
  copiar: "Copiar link",
  copiado: "Link copiado",
  botao: "Criar conta de parceiro",
  enviando: "Enviando…",
  sucessoTitulo: "Cadastro recebido!",
  codigoPergunta: "Tenho um código de indicação",
};

/** Seção no fim de /onde-comprar, para a loja que quer vender a linha. */
export const REVENDER = {
  titulo: "Quer revender a linha Orbital?",
  lead: "Estoque em Manaus e condições próprias para a sua loja.",
  beneficios: [
    { titulo: "Pronta-entrega em Manaus", texto: "O material sai do estoque local." },
    { titulo: "Condições para revendedores", texto: "Um consultor apresenta a tabela da sua loja." },
    { titulo: "Material para a equipe", texto: "Catálogo e ficha técnica para vender com segurança." },
  ] as Beneficio[],
  botao: "Quero revender",
};

/** Chamada do pré-contato de parceiros (ChamadaParceiro), no lugar do cadastro com senha. */
export const CHAMADA = {
  titulo: "Fale com a equipe de parcerias.",
  apoio: "Conte um pouco do seu trabalho e siga para o WhatsApp de um consultor da Orbital.",
  /** Título do cartão; sem o número de perguntas (ver o total dá ansiedade, o dono em 24/11). */
  cartaoTitulo: "Vamos conversar?",
  cartao: "As respostas chegam organizadas no WhatsApp do consultor. Você não precisa criar conta nem senha.",
  botao: "Quero ser parceiro",
  copiar: "Copiar link",
  copiado: "Link copiado",
};
