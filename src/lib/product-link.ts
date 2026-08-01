/**
 * Link permanente de um modelo do catálogo.
 *
 * O endereço é montado a partir do CÓDIGO do produto (ORB-003), não do nome nem
 * do id do banco. É essa escolha que faz um QR Code já impresso continuar
 * funcionando depois de renomear o modelo, mudar o preço, trocar as fotos ou
 * reescrever a descrição — coisas que acontecem, e que não podem invalidar
 * material que já está na rua.
 */

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://orbitalrevestimentos.com.br").replace(/\/+$/, "");

/** Normaliza o código para uso em URL: "ORB-003" → "orb-003". */
export function normalizeProductCode(code: string): string {
  return (code ?? "").trim().toLowerCase();
}

/** Caminho relativo do modelo dentro do catálogo. */
export function productPath(code: string): string {
  return `/produtos?modelo=${encodeURIComponent(normalizeProductCode(code))}`;
}

/** Endereço absoluto — é o que vai dentro do QR Code e no "copiar link". */
export function productUrl(code: string): string {
  return `${SITE_URL}${productPath(code)}`;
}

/**
 * Endereço da imagem do QR Code deste modelo.
 *
 * Caminho próprio (/api/product-qr/...) e não /api/products/[code]/qr: o Next
 * não permite dois nomes de slug no mesmo nível, e /api/products/[id] já existe.
 */
export function productQrUrl(code: string, format: "svg" | "png" = "svg", size?: number): string {
  const q = size ? `&size=${size}` : "";
  return `/api/product-qr/${encodeURIComponent(normalizeProductCode(code))}?format=${format}${q}`;
}
