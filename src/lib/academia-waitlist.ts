/**
 * Inscrições no workshop da Academia Orbital — opções e rótulos.
 *
 * Fonte única usada pelo formulário público, pela API que grava e pela tela
 * do admin. Os `value` precisam bater com os CHECK da migration 056: mudou um
 * aqui, muda lá.
 *
 * Sem import nenhum de propósito: este arquivo roda no navegador (formulário)
 * e no servidor (API).
 */

export const ATUACOES = [
  { value: "aplicador", label: "Aplicador" },
  { value: "instalador", label: "Instalador" },
  { value: "marceneiro", label: "Marceneiro" },
  { value: "construcao_civil", label: "Profissional da construção civil" },
  { value: "outro", label: "Outro" },
] as const;

/** O que a pessoa mais instala ou aplica hoje. */
export const FOCOS = [
  { value: "drywall_gesso", label: "Drywall e gesso" },
  { value: "forro", label: "Forros (PVC, gesso, madeira)" },
  { value: "ceramica_porcelanato", label: "Cerâmica e porcelanato" },
  { value: "marcenaria_mdf", label: "Marcenaria e MDF" },
  { value: "paineis_revestimentos", label: "Painéis e revestimentos decorativos" },
  { value: "papel_de_parede", label: "Papel de parede" },
  { value: "pintura", label: "Pintura" },
  { value: "outro", label: "Outro" },
] as const;

/** Faixas, e não um número livre: ninguém digita "7,5" e a tela agrupa fácil. */
export const EXPERIENCIAS = [
  { value: "ate_1", label: "Menos de 1 ano" },
  { value: "1_3", label: "1 a 3 anos" },
  { value: "3_5", label: "3 a 5 anos" },
  { value: "5_10", label: "5 a 10 anos" },
  { value: "10_mais", label: "Mais de 10 anos" },
] as const;

export type Atuacao = (typeof ATUACOES)[number]["value"];
export type Foco = (typeof FOCOS)[number]["value"];
export type Experiencia = (typeof EXPERIENCIAS)[number]["value"];

type Opcao = { readonly value: string; readonly label: string };

export function rotulo(lista: readonly Opcao[], value: string | null | undefined): string {
  if (!value) return "";
  return lista.find((o) => o.value === value)?.label ?? value;
}

export function valido(lista: readonly Opcao[], value: string): boolean {
  return lista.some((o) => o.value === value);
}

/** Uma inscrição como sai do banco. */
export interface Inscricao {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  role: string;
  role_other: string | null;
  main_focus: string | null;
  main_focus_other: string | null;
  years_experience: string | null;
  source: string | null;
  created_at: string;
  // Migration 058 — ausentes antes dela rodar.
  confirmation_whatsapp_at?: string | null;
  confirmation_email_at?: string | null;
  launch_notified_at?: string | null;
  launch_whatsapp_at?: string | null;
  launch_email_at?: string | null;
  // Migration 065 — ausentes antes dela rodar (todos contam como 1ª turma).
  turma?: 1 | 2 | null;
  presenca?: "sim" | "nao" | null;
  presenca_pedida_at?: string | null;
  presenca_respondida_at?: string | null;
}

export const URL_ACADEMIA = "https://orbitalrevestimentos.com.br/academia";

/**
 * Aviso geral — ponto de partida que o admin edita antes de enviar (ex.: abrir
 * a 2ª turma para a fila). {nome} vira o primeiro nome de cada inscrito.
 */
export const LANCAMENTO_ASSUNTO_PADRAO = "A 2ª turma da Academia Orbital abriu";
export const LANCAMENTO_TEXTO_PADRAO = [
  "Olá, {nome}! 🎉",
  "",
  "A *2ª turma do Workshop de Instalação do PFB* da Academia Orbital abriu. Como você está na lista, está recebendo o aviso primeiro.",
  "",
  `Veja como participar: ${URL_ACADEMIA}`,
  "",
  "Orbital Revestimentos",
].join("\n");

/**
 * Pedido de confirmação de presença — vai uma semana antes, para a 1ª turma.
 * O admin troca os [colchetes] pela data, horário e local (o envio fica
 * bloqueado enquanto sobrar colchete). {link} vira o link pessoal Vou/Não vou.
 */
export const PRESENCA_ASSUNTO_PADRAO = "Confirme sua presença — Workshop Academia Orbital";
export const PRESENCA_TEXTO_PADRAO = [
  "Olá, {nome}! 👋",
  "",
  "O *Workshop de Instalação do PFB* (Painel Flexível Fibra de Bambu) da Academia Orbital está chegando:",
  "",
  "📅 [data]",
  "🕖 [horário]",
  "📍 [local]",
  "",
  "Você vai comparecer? Confirme aqui: {link}",
  "",
  "Se não puder ir, avise pelo mesmo link — a sua vaga passa para outro profissional.",
  "",
  "Orbital Revestimentos",
].join("\n");

/** Só os dígitos — é por eles que o WhatsApp identifica a pessoa. */
export function digitos(phone: string): string {
  return phone.replace(/\D/g, "");
}
