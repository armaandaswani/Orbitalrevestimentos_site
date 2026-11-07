/**
 * Textos das três linhas do Painel Flexível em Fibra de Bambu (PFB).
 *
 * Fontes (notas do Orbital Vault, em "03 Produto/"): "Linha Classic.md",
 * "Linha Brilliance.md", "Linha Elegance.md" e, para os usos da Elegance,
 * "Onde usar e onde não usar.md". Spec: .superpowers/sdd/2026-11-06-pagina-pfb/
 * design_doc.md, item 4 e tabela "Seção 4: As três linhas".
 *
 * Sem campo `slug`: o slug vive só em LINHA_SLUG (product-link.ts), e quem
 * precisa do endereço de uma linha usa catalogoPath({ linha: chave }).
 *
 * Lido pelo catálogo (`acabamento`) e, nas etapas seguintes, pela seção 4 da
 * página do produto e pelo cabeçalho da linha filtrada (`frases`).
 */
export const LINHAS_PFB: ReadonlyArray<{
  chave: "Classic" | "Brilliance" | "Elegance";
  acabamento: string;
  frases: readonly [string, string];
}> = [
  {
    chave: "Classic",
    acabamento: "Mármore fosco",
    frases: [
      "Mármore fosco, sem reflexo.",
      "Indicada para salas, quartos, consultórios, lavabos e cozinhas.",
    ],
  },
  {
    chave: "Brilliance",
    acabamento: "Mármore polido",
    frases: [
      "Mármore polido, de alto brilho.",
      "Indicada para halls, escritórios, lavabos de destaque, paredes de TV e comércio.",
    ],
  },
  {
    chave: "Elegance",
    acabamento: "Madeira texturizada",
    frases: [
      "Madeira texturizada e fosca.",
      "Indicada para cabeceiras, escadas, forros e interiores de embarcações.",
    ],
  },
];
