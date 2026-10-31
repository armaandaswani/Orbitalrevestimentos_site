import { carregarProjetos } from "@/lib/projetos-dados";
import ProjetosVitrine from "./ProjetosVitrine";

/**
 * /projetos — os dados vêm do banco aqui no servidor e a página chega pronta,
 * sem esperar quatro APIs depois do JavaScript. Republica a cada 5 min: o
 * mesmo prazo que as APIs de projetos já tinham na edge (CACHE_CONTEUDO).
 */
export const revalidate = 300;

export default async function ProjetosPage() {
  const dados = await carregarProjetos();
  // eslint-disable-next-line react-hooks/purity -- hora da geração da página (selo "Novo" dos lugares)
  return <ProjetosVitrine {...dados} agora={Date.now()} />;
}
