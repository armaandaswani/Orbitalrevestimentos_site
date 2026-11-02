import { carregarProdutos } from "@/lib/produtos-dados";
import { lerProjetos } from "@/lib/projetos-dados";
import ProdutosVitrine from "./ProdutosVitrine";

/**
 * /produtos — o catálogo chega pronto do servidor (modelos e os projetos em
 * que cada um foi aplicado). Republica a cada 5 min, como /projetos.
 */
export const revalidate = 300;

export default async function ProdutosPage() {
  const [produtos, projetos] = await Promise.all([carregarProdutos(), lerProjetos().catch(() => [])]);
  return <ProdutosVitrine produtos={produtos} projetos={projetos} />;
}
