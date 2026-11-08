// Páginas que o assistente do chat pode indicar com [PAGE: /caminho] e o rótulo
// do botão de cada uma. Puro (sem React), para o ChatWidget e o teste.

export const PAGE_LABELS: Record<string, string> = {
  "/produtos":     "Ver os produtos",
  "/produtos/pfb": "Conhecer o PFB",
  "/produtos/pfb/catalogo": "Ver o catálogo",
  "/techstone":    "Conhecer a TechStone",
  "/projetos":     "Ver Projetos",
  "/onde-comprar": "Onde comprar",
  "/visualizador": "Simular no meu ambiente",
  "/parcerias":    "Programa de Parcerias",
  "/academia":     "Formação da Academia",
  "/contato":      "Falar com um consultor",
};

// Páginas que o assistente citava e que mudaram de endereço (as respostas
// guardadas e o prompt do /admin ainda podem trazê-las).
export const PAGINAS_ANTIGAS: Record<string, string> = { "/tecnologia": "/produtos/pfb" };

/**
 * Tira as etiquetas [PAGE: /caminho] do texto do assistente e devolve o texto
 * limpo e os caminhos que viram botão (só os que têm rótulo, sem repetir).
 */
export function extrairPaginas(raw: string): { texto: string; pageLinks: string[] } {
  const pageLinks: string[] = [];
  const texto = raw.replace(/\[PAGE:\s*(\/[^\]]*)\]/g, (_, path: string) => {
    const p = PAGINAS_ANTIGAS[path.trim()] ?? path.trim();
    if (PAGE_LABELS[p] && !pageLinks.includes(p)) pageLinks.push(p);
    return "";
  }).trim();
  return { texto, pageLinks };
}
