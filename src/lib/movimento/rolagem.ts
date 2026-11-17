/**
 * Rolagem ao trocar de página (components/movimento/RolagemPaginas e
 * techstone/Encaixe). Regra do dono (17/11/2026): toda página abre no topo;
 * só voltar quase na hora devolve onde a pessoa estava.
 *
 * Sem imports com "@/" para rodar no node --test.
 */

/** Voltar (ou avançar) até este tempo depois de sair devolve a posição. */
export const JANELA_VOLTA_MS = 10_000;

export type Saida = { y: number; em: number };

/**
 * Onde a página que acabou de entrar deve começar: o y para rolar, ou null
 * para não mexer (link com âncora: o navegador leva até ela).
 */
export function posicaoAoChegar(a: { historico: boolean; ancora: boolean; saida: Saida | null; agora: number }): number | null {
  if (a.ancora) return null;
  if (a.historico && a.saida && a.agora - a.saida.em <= JANELA_VOLTA_MS) return a.saida.y;
  return 0;
}

/**
 * O clique neste link tira a pessoa desta página (outro caminho do mesmo site,
 * na mesma aba)? Mudança só de query ou de âncora fica na página.
 */
export function saiDaPagina(a: { href: string; origem: string; caminho: string; novaAba: boolean; modificador: boolean }): boolean {
  if (a.novaAba || a.modificador) return false;
  let url: URL;
  try {
    url = new URL(a.href, a.origem + a.caminho);
  } catch {
    return false;
  }
  return url.origin === a.origem && url.pathname !== a.caminho;
}
