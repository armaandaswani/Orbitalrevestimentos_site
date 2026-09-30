/**
 * Envios da aba "Solicitar atendimento" como saem do banco (site_contatos).
 * Sem imports: usado pela tela do admin (navegador) e pela exportação (servidor).
 */
export interface SiteContato {
  id: string;
  created_at: string;
  name: string | null;
  phone: string;
  perfil: string;
  etapa: string;
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

export function digitosContato(phone: string): string {
  return phone.replace(/\D/g, "");
}
