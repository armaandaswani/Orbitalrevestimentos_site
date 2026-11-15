/**
 * Data de nascimento do cadastro de parceiro: máscara DD/MM/AAAA, conferência
 * de que a data existe e conversão para o formato que a API guarda. Sem
 * navegador, para o teste rodar em Node.
 */

/** DD/MM/AAAA enquanto digita. Aceita a data ISO que o preenchimento automático do navegador pode colar (AAAA-MM-DD). */
export function mascaraData(bruto: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bruto.trim());
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = bruto.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

/** A data DD/MM/AAAA existe no calendário e o ano fica entre 1900 e `anoAtual`. */
export function dataValida(dma: string, anoAtual: number): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dma);
  if (!m) return false;
  const dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);
  if (ano < 1900 || ano > anoAtual || mes < 1 || mes > 12 || dia < 1) return false;
  // Dia 0 do mês seguinte = último dia deste mês (em UTC, sem fuso).
  return dia <= new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** DD/MM/AAAA → AAAA-MM-DD. */
export function dataIso(dma: string): string {
  const [d, m, a] = dma.split("/");
  return `${a}-${(m ?? "").padStart(2, "0")}-${(d ?? "").padStart(2, "0")}`;
}
