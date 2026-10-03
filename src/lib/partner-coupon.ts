import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cupom de um parceiro novo: primeiro nome em maiúsculas (só letras, sem
 * acento) + os 2 últimos dígitos do ano, com sufixo numérico se já existir.
 * Ex.: "Érica Souza" → ERICA26, ERICA261, ...
 */
export async function gerarCupomParceiro(db: SupabaseClient, name: string): Promise<string> {
  const year2 = String(new Date().getFullYear()).slice(-2);
  const firstWord = name
    .trim()
    .split(/\s+/)[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const baseCode = `${firstWord || "PARCEIRO"}${year2}`;

  let couponCode = baseCode;
  let suffix = 1;
  while (true) {
    const { data: existing } = await db
      .from("partners")
      .select("id")
      .eq("coupon_code", couponCode)
      .maybeSingle();
    if (!existing) return couponCode;
    couponCode = `${baseCode}${suffix}`;
    suffix++;
  }
}
