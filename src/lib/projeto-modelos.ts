/**
 * Modelos aplicados num projeto e autoria (migração 067). Sem import: roda no
 * navegador e no servidor.
 *
 * product_code é o modelo principal (primeiro da lista); extra_product_codes,
 * os demais. Antes da migração, só existe o principal.
 */

export interface ComModelos {
  product_code?: string | null;
  extra_product_codes?: string[] | null;
}

/** Todos os códigos, principal primeiro, sem repetição nem vazios. */
export function modelosDoProjeto(p: ComModelos): string[] {
  const todos = [p.product_code ?? "", ...(p.extra_product_codes ?? [])].map((c) => c.trim()).filter(Boolean);
  return [...new Set(todos)];
}

/** Lista → campos do banco: o primeiro vira o principal. */
export function camposDosModelos(codigos: string[]): { product_code: string; extra_product_codes: string[] } {
  const limpos = [...new Set(codigos.map((c) => c.trim()).filter(Boolean))];
  return { product_code: limpos[0] ?? "", extra_product_codes: limpos.slice(1) };
}

/** "ORB-002 · ORB-005" */
export function modelosTxt(p: ComModelos): string {
  return modelosDoProjeto(p).join(" · ");
}

/** "Projeto de Arq. Fulana" — sem autoria, vazio. */
export function autoriaTxt(projetoDe?: string | null): string {
  const n = (projetoDe ?? "").trim();
  return n ? `Projeto de ${n}` : "";
}
