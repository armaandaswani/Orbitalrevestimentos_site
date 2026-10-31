import { VALORIZA, VALORIZA_LEGADO } from "@/lib/contato";

/**
 * Envios da aba "Solicitar atendimento" como saem do banco (site_contatos).
 * Usado pela tela do admin (navegador) e pela exportação (servidor); só
 * importa @/lib/contato, que também não tem dependências.
 */
export interface SiteContato {
  id: string;
  created_at: string;
  name: string | null;
  /** Só nos envios antigos: o pré-contato novo não pede o WhatsApp. */
  phone: string | null;
  perfil: string;
  /** Pergunta antiga (estágio da obra); vazia nos envios novos. */
  etapa: string | null;
  /** O que mais valoriza / quando pretende fazer (migração 071), já em texto. */
  valoriza?: string | null;
  prazo?: string | null;
  /** Migração 074: já conhecia o painel, o que espera (rótulos) e o detalhe. */
  conhece_pfb?: boolean | null;
  espera?: string[] | null;
  espera_detalhe?: string | null;
  largura_m: number | null;
  altura_m: number | null;
  areas_detalhe: string | null;
  cidade: string;
  produtos: string | null;
  pagina: string | null;
  lead_id: string | null;
}

export const PERFIL_ROTULO: Record<string, string> = { proprietario: "Proprietário(a)", arquiteto: "Arquiteto(a)" };
export const ETAPA_ROTULO: Record<string, string> = { inicial: "Inicial", final: "Final", ideacao: "Em ideação" };
export const PRAZO_OPCOES = ["Nos próximos 30 dias", "Nos próximos 3 meses", "Ainda estou planejando"] as const;

/**
 * O que valoriza, em texto. O banco guarda o rótulo; se algum envio tiver
 * guardado a chave (sofisticacao, custo_beneficio, preco…), vira o rótulo.
 * Rótulos antigos ("Sofisticação & durabilidade") ficam como estão.
 */
const VALORIZA_ROTULO: Record<string, string> = Object.fromEntries(
  [...VALORIZA, ...VALORIZA_LEGADO].map((o) => [o.value, o.label]),
);
export function valorizaContato(c: SiteContato): string {
  const v = (c.valoriza ?? "").trim();
  return VALORIZA_ROTULO[v] ?? v;
}

/** "Sim" / "Não" / "" (envio de antes da pergunta). */
export function conheceContato(c: SiteContato): string {
  return c.conhece_pfb === true ? "Sim" : c.conhece_pfb === false ? "Não" : "";
}

/** O que espera, numa linha ("A; B"). */
export function esperaContato(c: SiteContato): string {
  return Array.isArray(c.espera) ? c.espera.filter(Boolean).join("; ") : "";
}

/** Quando pretende fazer; nos envios antigos, o estágio da obra. */
export function prazoContato(c: SiteContato): string {
  if (c.prazo) return c.prazo;
  return c.etapa ? `Estágio: ${ETAPA_ROTULO[c.etapa] ?? c.etapa}` : "";
}

function br(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** "3 × 2,6 m (7,8 m²)" / "Sala: 3 × 2,6 m; …" / "" */
export function areaContato(c: SiteContato): string {
  const l = c.largura_m != null ? Number(c.largura_m) : null;
  const a = c.altura_m != null ? Number(c.altura_m) : null;
  const partes: string[] = [];
  if (l && a) partes.push(`${br(l)} × ${br(a)} m (${br(Math.round(l * a * 100) / 100)} m²)`);
  else if (l) partes.push(`largura ${br(l)} m`);
  else if (a) partes.push(`altura ${br(a)} m`);
  if (c.areas_detalhe) partes.push(c.areas_detalhe);
  return partes.join(" · ");
}

export function digitosContato(phone: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}
