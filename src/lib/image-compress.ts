/**
 * Compressão de imagem no NAVEGADOR, antes do upload.
 *
 * Precisa ser aqui e não no servidor: o painel envia os bytes direto para o
 * storage por URL assinada (/api/admin/upload-sign), justamente para não bater
 * no limite de corpo da Vercel — o servidor nunca vê o arquivo.
 *
 * Por que existe: as fotos vinham de câmera, em 8064×6048 e até 14 MB, e eram
 * servidas assim mesmo para o visitante. Em um mês isso consumiu 15,9 GB de
 * banda (cota: 5 GB) e encheu 1 GB de storage com 287 arquivos acima de 1 MB.
 *
 * 2400px no maior lado preserva nitidez para tela e para catálogo impresso;
 * numa amostra real a redução foi de 96% (37,1 MB → 1,6 MB) sem diferença
 * visível. O arquivo original NÃO é enviado — o que sobe já é o comprimido.
 */

export interface CompressOptions {
  /** Maior lado, em pixels. Acima disso a imagem é reduzida. */
  maxSide?: number;
  /** Qualidade JPEG, 0–1. */
  quality?: number;
  /** Abaixo disto não vale recomprimir (bytes). */
  skipBelow?: number;
  /**
   * "webp" gera arquivos ~25–35% menores que JPEG com a mesma aparência — use
   * para o que só aparece no site (fotos de projetos). E-mail fica em JPEG:
   * o Outlook não mostra WebP.
   */
  format?: "jpeg" | "webp";
}

const DEFAULTS: Required<CompressOptions> = {
  maxSide: 2400,
  // 0.86: sem diferença visível para o original numa tela, e ainda ~90% menor
  // que a foto de câmera.
  quality: 0.86,
  skipBelow: 300 * 1024,
  format: "jpeg",
};

/** HEIC/HEIF (padrão do iPhone): só o Safari abre. */
export function isHeic(file: File): boolean {
  return /^image\/(heic|heif)$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/** Formatos que sabemos recomprimir com segurança (HEIC: se o navegador abrir). */
function isCompressible(file: File): boolean {
  return /^image\/(jpeg|jpg|png|webp)$/i.test(file.type) || isHeic(file);
}

/**
 * true quando o arquivo, como está, não abre nos navegadores (HEIC que este
 * navegador não conseguiu converter). O painel deve recusar com uma mensagem
 * em vez de subir uma foto que o site não vai mostrar.
 */
export function isUnsupportedForWeb(file: File): boolean {
  return isHeic(file);
}

/**
 * Devolve uma versão reduzida do arquivo, ou o próprio arquivo quando não vale
 * a pena mexer.
 *
 * Nunca lança: se algo falhar (formato exótico, canvas indisponível, imagem
 * corrompida), devolve o original. Um upload que funciona vale mais que um
 * upload otimizado que quebra.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxSide, quality, skipBelow, format } = { ...DEFAULTS, ...opts };

  // HEIC sempre passa pela conversão, mesmo pequeno: como está, não abre no site.
  if (!isCompressible(file) || (file.size <= skipBelow && !isHeic(file))) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const escala = Math.min(1, maxSide / Math.max(width, height));
    const w = Math.round(width * escala);
    const h = Math.round(height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return file; }
    // O padrão do navegador é a redução mais rápida (e mais serrilhada); "high"
    // mantém a nitidez ao reduzir uma foto de 8000px para 2400px.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // PNG e WebP podem ter fundo transparente, e JPEG não tem canal alfa — um
    // logo salvo como JPEG sai com fundo PRETO. Nesses formatos a saída é WebP,
    // que comprime igual e preserva a transparência.
    const podeTerAlfa = /^image\/(png|webp)$/i.test(file.type);
    const toBlob = (tipo: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, quality));
    let saida = podeTerAlfa || format === "webp" ? "image/webp" : "image/jpeg";
    let blob = await toBlob(saida);
    // Navegador sem encoder WebP devolve PNG: tenta JPEG (sem alfa) antes de desistir.
    if ((!blob || blob.type !== saida) && saida === "image/webp" && !podeTerAlfa) {
      saida = "image/jpeg";
      blob = await toBlob(saida);
    }
    // Se ainda não saiu o formato pedido, fica com o original (melhor que um PNG gigante).
    if (!blob || blob.type !== saida) return file;

    // Se a "compressão" engordou o arquivo (acontece com PNG de poucas cores),
    // fica com o original — exceto HEIC, que precisa virar um formato da web.
    if (blob.size >= file.size && !isHeic(file)) return file;

    const nome = file.name.replace(/\.[a-z0-9]+$/i, "") + (saida === "image/webp" ? ".webp" : ".jpg");
    return new File([blob], nome, { type: saida, lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Resumo legível do ganho, para o painel mostrar enquanto envia. */
export function compressionSummary(antes: number, depois: number): string {
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1);
  if (depois >= antes) return "";
  return `${mb(antes)} MB → ${mb(depois)} MB (−${Math.round((1 - depois / antes) * 100)}%)`;
}
