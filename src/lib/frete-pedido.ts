/**
 * Frete sugerido para pedidos criados no admin.
 *
 *  - Sem CEP (ou CEP fora de qualquer regra): FRETE_PADRAO.
 *  - Bairros distantes (ex. Ponta Negra): FRETE_DISTANTE.
 *  - Zonas cadastradas em "Zonas de frete por CEP" (frete_zones) vencem as
 *    regras acima: casam por faixa de CEP, lista de CEPs ou nome do bairro.
 *
 * É só a sugestão — o valor continua editável no formulário.
 */

export const FRETE_PADRAO = 100;
export const FRETE_DISTANTE = 150;
export const BAIRROS_DISTANTES = ["Ponta Negra"];

export interface FreteZona {
  name: string;
  neighborhoods: string | null;
  cep_start: string | null;
  cep_end: string | null;
  cep_list: string | null;
  value: number;
  priority: number;
  active: boolean;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function bairroCasa(bairro: string, lista: string[]): boolean {
  const b = norm(bairro);
  return !!b && lista.some((n) => {
    const x = norm(n);
    return !!x && (b === x || b.includes(x));
  });
}

export function fretePedido(
  { cep, bairro }: { cep?: string | null; bairro?: string | null },
  zonas: FreteZona[] = []
): { value: number; motivo: string } {
  const d = String(cep ?? "").replace(/\D/g, "");
  const b = String(bairro ?? "");
  for (const z of zonas.filter((z) => z.active).sort((a, b) => a.priority - b.priority)) {
    const s = (z.cep_start ?? "").replace(/\D/g, ""), e = (z.cep_end ?? "").replace(/\D/g, "");
    const lista = (z.cep_list ?? "").split(/[\s,;\n]+/).map((c) => c.replace(/\D/g, "")).filter(Boolean);
    const bairros = (z.neighborhoods ?? "").split(/[,;\n]+/);
    if ((d.length === 8 && ((s && e && d >= s && d <= e) || lista.includes(d))) || bairroCasa(b, bairros)) {
      return { value: Number(z.value) || 0, motivo: `zona ${z.name}` };
    }
  }
  if (bairroCasa(b, BAIRROS_DISTANTES)) return { value: FRETE_DISTANTE, motivo: `bairro distante (${b.trim()})` };
  return { value: FRETE_PADRAO, motivo: d.length === 8 ? "padrão" : "padrão (sem CEP)" };
}
