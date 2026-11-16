/**
 * Imagem padrão de prévia de link (WhatsApp, Instagram, Google), para as páginas
 * que declaram o próprio `openGraph`: no Next.js o `openGraph` de uma página
 * substitui o do layout inteiro, imagem incluída, então quem declara título e
 * descrição precisa declarar a imagem também (ou o link sai sem miniatura).
 *
 * JPG de 1200 × 630 e uns 160 KB: o WhatsApp muitas vezes não mostra miniatura
 * de imagem WebP nem de arquivo pesado. Gerado por `scripts/gerar-og.sh`.
 */
export const OG_PADRAO = {
  url: "/images/og/orbital.jpg",
  width: 1200,
  height: 630,
  alt: "Sala de estar com paredes revestidas com o Painel Flexível em Fibra de Bambu, da Orbital Revestimentos",
};
