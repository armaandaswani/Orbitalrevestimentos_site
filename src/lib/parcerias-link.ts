/**
 * Leva o código do representante (`?rep=`) de uma página de parceria para a
 * outra: a porta de entrada, as páginas de perfil e a seção de revenda em
 * /onde-comprar. Sem isso, quem chega pelo link do representante e troca de
 * perfil (ou toca em "Revendedores") se cadastraria sem a indicação.
 */
export function comRep(href: string, rep: string): string {
  if (!rep || !/^\/(parcerias|onde-comprar)(\/|#|\?|$)/.test(href)) return href;
  const [caminho, ancora] = href.split("#");
  const consulta = `${caminho.includes("?") ? "&" : "?"}rep=${encodeURIComponent(rep)}`;
  return `${caminho}${consulta}${ancora ? `#${ancora}` : ""}`;
}
