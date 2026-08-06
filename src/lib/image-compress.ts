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
}

const DEFAULTS: Required<CompressOptions> = {
  maxSide: 2400,
  quality: 0.82,
  skipBelow: 300 * 1024,
};

/** Formatos que sabemos recomprimir com segurança. */
function isCompressible(file: File): boolean {
  return /^image\/(jpeg|jpg|png|webp)$/i.test(file.type);
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
  const { maxSide, quality, skipBelow } = { ...DEFAULTS, ...opts };

  if (!isCompressible(file) || file.size <= skipBelow) return file;

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
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    // Se a "compressão" engordou o arquivo (acontece com PNG de poucas cores),
    // fica com o original.
    if (blob.size >= file.size) return file;

    const nome = file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg", lastModified: Date.now() });
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
