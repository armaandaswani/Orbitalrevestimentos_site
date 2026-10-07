/**
 * Datas impressas nos documentos do pedido (página de impressão e PDF por
 * e-mail).
 *
 * Orçamento e Pedido de Venda saem sempre com a data de HOJE — mesmo que o
 * pedido seja antigo — e a validade do orçamento é contada a partir de hoje,
 * mantendo o mesmo prazo que o pedido tinha (validade − criação; sem isso,
 * QUOTE_VALIDITY_DAYS). Tudo no fuso de Manaus.
 *
 * Datas "AAAA-MM-DD" são dias de calendário: nunca passam por new Date(),
 * que as lê como meia-noite UTC e, em Manaus (UTC−4), mostrava o dia anterior.
 */

import { QUOTE_VALIDITY_DAYS } from "@/lib/orcamento-pricing";

const TZ = "America/Manaus";
const DIA = /^\d{4}-\d{2}-\d{2}$/;

/** AAAA-MM-DD do instante `d` em Manaus. */
function diaEmManaus(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Dia de calendário (AAAA-MM-DD) de uma data salva: só data ou ISO com hora. */
function diaDe(s: string | null | undefined): string | null {
  if (!s) return null;
  if (DIA.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : diaEmManaus(d);
}

const emUtc = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));

function somarDias(ymd: string, n: number): string {
  return new Date(emUtc(ymd) + n * 86_400_000).toISOString().slice(0, 10);
}

/** DD/MM/AAAA de uma data salva (só data ou ISO), sem deslocar o dia. */
export function fmtDia(s: string | null | undefined): string {
  const d = diaDe(s);
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "-";
}

/** Data e validade a imprimir num orçamento/pedido gerado agora. */
export function datasDoDocumento(
  createdAt: string | null | undefined,
  validUntil: string | null | undefined,
  agora: Date = new Date()
): { data: string; validade: string } {
  const hoje = diaEmManaus(agora);
  const criado = diaDe(createdAt);
  const valido = diaDe(validUntil);
  const prazo = criado && valido ? Math.round((emUtc(valido) - emUtc(criado)) / 86_400_000) : 0;
  return { data: fmtDia(hoje), validade: fmtDia(somarDias(hoje, prazo > 0 ? prazo : QUOTE_VALIDITY_DAYS)) };
}
