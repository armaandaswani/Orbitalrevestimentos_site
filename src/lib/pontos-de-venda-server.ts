import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn } from "@/lib/db-compat";
import { lerPontosDeVendaDe, type PontoDeVenda } from "@/lib/pontos-de-venda";

/**
 * Lê as revendas ativas para a página /onde-comprar (cliente admin do servidor).
 * Plano B: se o banco ainda não tem as colunas novas (migração 076), refaz só
 * com as base. Qualquer outro erro, inclusive banco sem `kind` ou lista vazia,
 * volta em `erro`: a página lança e o ISR mantém a última versão boa.
 */
export async function lerPontosDeVenda(): Promise<{ pontos: PontoDeVenda[]; erro: string | null }> {
  return lerPontosDeVendaDe(
    async (cols) => {
      try {
        const { data, error } = await supabaseAdmin()
          .from("partner_showrooms")
          .select(cols)
          .eq("active", true)
          .eq("kind", "revenda")
          .order("sort_order", { ascending: true });
        return { data: data as unknown[] | null, error };
      } catch (e) {
        // Falha de rede ou do cliente nunca rejeita: vira erro comum.
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    },
    isMissingColumn,
  );
}
