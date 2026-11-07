/**
 * Link permanente de um modelo do catálogo.
 *
 * O modelo vive no catálogo (/produtos/pfb/catalogo?modelo=orb-003) e o endereço
 * é montado a partir do CÓDIGO do produto (ORB-003), não do nome nem do id do
 * banco. É essa escolha que faz um QR Code já impresso continuar funcionando
 * depois de renomear o modelo, mudar o preço, trocar as fotos ou reescrever a
 * descrição, coisas que acontecem e que não podem invalidar material que já
 * está na rua. Os QR impressos com o endereço antigo (/produtos/pfb?modelo=...)
 * seguem vivos por redirecionamento.
 *
 * Módulo puro, sem import: roda também no node --test.
 */

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://orbitalrevestimentos.com.br").replace(/\/+$/, "");

/** Normaliza o código para uso em URL: "ORB-003" → "orb-003". */
export function normalizeProductCode(code: string): string {
  return (code ?? "").trim().toLowerCase();
}

export type LinhaCatalogo = "todos" | "Classic" | "Brilliance" | "Elegance";

/** Slug de cada linha na URL (?linha=classic). */
export const LINHA_SLUG: Record<"Classic" | "Brilliance" | "Elegance", string> = {
  Classic: "classic",
  Brilliance: "brilliance",
  Elegance: "elegance",
};

export const CATALOGO_PATH = "/produtos/pfb/catalogo";

/** Linha pedida na URL (?linha=), sem diferenciar maiúsculas; o resto vira "todos". */
export function linhaDaUrl(search: string): LinhaCatalogo {
  const valor = (new URLSearchParams(search).get("linha") ?? "").trim().toLowerCase();
  for (const chave of Object.keys(LINHA_SLUG) as Array<keyof typeof LINHA_SLUG>) {
    if (LINHA_SLUG[chave] === valor) return chave;
  }
  return "todos";
}

/** Caminho do catálogo; a query sai na ordem linha, modelo, e só com o que tem valor. */
export function catalogoPath(o: { linha?: LinhaCatalogo | null; modelo?: string | null }): string {
  const partes: string[] = [];
  if (o.linha && o.linha !== "todos") partes.push(`linha=${LINHA_SLUG[o.linha]}`);
  const modelo = normalizeProductCode(o.modelo ?? "");
  if (modelo) partes.push(`modelo=${encodeURIComponent(modelo)}`);
  return partes.length ? `${CATALOGO_PATH}?${partes.join("&")}` : CATALOGO_PATH;
}

/** Caminho relativo do modelo dentro do catálogo. */
export function productPath(code: string): string {
  return catalogoPath({ modelo: code });
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
