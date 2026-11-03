/**
 * Lista de espera das linhas que ainda estão chegando (TechStone, PFB Carbon).
 *
 * A pessoa deixa nome, WhatsApp, e-mail, perfil e o prazo da obra. Quando o
 * material chega, a Orbital avisa quem está na lista que ele está em
 * pronta-entrega em Manaus, em quantidade limitada. O prazo da obra só ordena
 * a fila no admin (em obra no topo); não é promessa pública de ordem.
 *
 * Sem import nenhum: roda no navegador (formulário) e no servidor (rota).
 */

/**
 * `artigo` é o artigo do nome (a TechStone, o PFB Carbon: PFB é masculino) e
 * `aposto` o que a mensagem de chegada acrescenta ao nome. As frases saem de
 * `fraseLinha` e `mensagemChegada`, nunca montadas à mão com "A {nome}".
 */
export const LINHAS_ESPERA = [
  { value: "techstone", label: "TechStone", artigo: "a" },
  { value: "carbon", label: "PFB Carbon", artigo: "o", aposto: "a linha de luxo do Painel Flexível em Fibra de Bambu" },
] as const;

export const PERFIS_ESPERA = [
  { value: "proprietario", label: "Sou proprietário" },
  { value: "arquiteto", label: "Sou arquiteto" },
  { value: "outro", label: "Outro" },
] as const;

/** Rótulo curto do perfil (admin, planilha). */
export const PERFIL_ESPERA_ROTULO: Record<string, string> = {
  proprietario: "Proprietário",
  arquiteto: "Arquiteto",
  outro: "Outro",
};

export const PRAZOS_OBRA = [
  { value: "em_obra", label: "Já estou em obra" },
  { value: "ate_3_meses", label: "Até 3 meses" },
  { value: "3_a_6_meses", label: "De 3 a 6 meses" },
  { value: "mais_6_meses", label: "Mais de 6 meses" },
  { value: "pesquisando", label: "Só pesquisando por enquanto" },
] as const;

export type LinhaEspera = (typeof LINHAS_ESPERA)[number]["value"];

export interface InscricaoEspera {
  linha: LinhaEspera;
  nome: string;
  whatsapp: string;
  email: string;
  perfil: string;
  perfilOutro?: string;
  prazo: string;
  modelos?: string[];
  aceite: boolean;
}

export const PERFIL_OUTRO_MAX = 120;
export const MAX_MODELOS = 9;

/** Só os dígitos do WhatsApp; aceita com ou sem 55. */
export function digitosWhatsapp(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

/** DDD + número (10 ou 11 dígitos), com ou sem o 55 na frente. */
export function whatsappValido(v: string): boolean {
  const d = digitosWhatsapp(v).replace(/^55(?=\d{10,11}$)/, "");
  return /^[1-9]{2}9?\d{8}$/.test(d);
}

export function emailValido(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v ?? "").trim());
}

/** Uma linha de site_lista_espera, como o admin recebe. */
export interface SiteListaEspera {
  id: string;
  created_at: string;
  linha: LinhaEspera;
  nome: string;
  whatsapp: string;
  email: string;
  perfil: string;
  perfil_outro: string | null;
  prazo: string;
  modelos: string[] | null;
  pagina: string | null;
  aceite_lgpd: boolean;
  avisado_em: string | null;
}

export function rotuloLinha(v: string): string {
  return LINHAS_ESPERA.find((o) => o.value === v)?.label ?? v;
}

/** Artigo da linha: "a" (TechStone) ou "o" (PFB Carbon). */
export function artigoLinha(v: string): "a" | "o" {
  return LINHAS_ESPERA.find((o) => o.value === v)?.artigo ?? "a";
}

/** "a TechStone", "o PFB Carbon": o nome com o artigo, para o meio da frase. */
export function fraseLinha(v: string): string {
  return `${artigoLinha(v)} ${rotuloLinha(v)}`;
}

export function rotuloPrazo(v: string): string {
  return PRAZOS_OBRA.find((o) => o.value === v)?.label ?? v;
}

/** Ordem da fila no admin: em obra no topo (índice em PRAZOS_OBRA). Não é promessa pública. */
export function prioridadePrazo(v: string): number {
  const i = PRAZOS_OBRA.findIndex((o) => o.value === v);
  return i < 0 ? PRAZOS_OBRA.length : i;
}

/** WhatsApp formatado para leitura: 5592999998888 → (92) 99999-8888. */
export function whatsappLegivel(digitos: string): string {
  const d = digitosWhatsapp(digitos).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos;
}

/** Lista com "e" antes do último item: "A", "A e B", "A, B e C". */
function listaComE(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * Mensagem de chegada que o consultor envia (o admin só monta o texto e abre
 * o WhatsApp ou o e-mail; quem envia é a pessoa). Sem preço: valores só com o
 * consultor.
 */
export function mensagemChegada(i: Pick<SiteListaEspera, "nome" | "linha" | "modelos">): string {
  const primeiro = i.nome.trim().split(/\s+/)[0] ?? "";
  const linha = LINHAS_ESPERA.find((o) => o.value === i.linha);
  const sujeito = linha
    ? `${fraseLinha(i.linha)}${"aposto" in linha ? `, ${linha.aposto},` : ""}`
    : `${i.linha}`;
  const frase = sujeito.charAt(0).toUpperCase() + sujeito.slice(1);
  const modelos = i.modelos?.length ? ` Você marcou interesse em ${listaComE(i.modelos)}.` : "";
  return `Olá, ${primeiro}! Aqui é da Orbital Revestimentos. ${frase} chegou a Manaus e já está em pronta-entrega, em quantidade limitada.${modelos} Quer que um consultor separe para você?`;
}

/** Assunto do e-mail de chegada (o corpo é a `mensagemChegada`). */
export function assuntoChegada(i: Pick<SiteListaEspera, "linha">): string {
  const frase = fraseLinha(i.linha);
  return `${frase.charAt(0).toUpperCase()}${frase.slice(1)} chegou a Manaus`;
}

/** Campos que ainda faltam, na ordem do formulário (vazio = pode enviar). */
export function pendenciasEspera(i: Partial<InscricaoEspera>): string[] {
  const falta: string[] = [];
  if (!i.nome?.trim()) falta.push("nome");
  if (!whatsappValido(i.whatsapp ?? "")) falta.push("whatsapp");
  if (!emailValido(i.email ?? "")) falta.push("email");
  if (!PERFIS_ESPERA.some((o) => o.value === i.perfil)) falta.push("perfil");
  if (i.perfil === "outro" && !i.perfilOutro?.trim()) falta.push("perfilOutro");
  if (!PRAZOS_OBRA.some((o) => o.value === i.prazo)) falta.push("prazo");
  if (!i.aceite) falta.push("aceite");
  return falta;
}
