import { revalidatePath } from "next/cache";

/**
 * Chamada por PATCH, POST, DELETE e reordenar de /api/admin/partner-showrooms:
 * invalida as páginas que mostram showrooms e revendas.
 */
export function revalidarLugares(): void {
  revalidatePath("/onde-comprar");
  revalidatePath("/");
  revalidatePath("/projetos");
  revalidatePath("/produtos/pfb");
}
