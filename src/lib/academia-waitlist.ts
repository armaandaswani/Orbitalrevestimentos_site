/**
 * Lista de espera da Academia Orbital — opções e rótulos.
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
}

/** Só os dígitos — é por eles que o WhatsApp identifica a pessoa. */
export function digitos(phone: string): string {
  return phone.replace(/\D/g, "");
}
