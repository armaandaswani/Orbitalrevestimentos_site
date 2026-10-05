import { compressImage, isUnsupportedForWeb, type CompressOptions } from "@/lib/image-compress";

/**
 * Envio de imagem pelo painel: comprime no navegador e sobe direto para o
 * storage por URL assinada (/api/admin/upload-sign) — os bytes não passam pela
 * Vercel. Devolve a URL pública. Lança Error com mensagem legível.
 */
export async function uploadAdminImage(original: File, folder: string, opts?: CompressOptions): Promise<string> {
  const file = await compressImage(original, opts);
  if (isUnsupportedForWeb(file)) {
    throw new Error("Foto em HEIC (iPhone) que este navegador não converte. Abra no Safari ou exporte como JPG.");
  }
  const sign = await fetch("/api/admin/upload-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, filename: file.name, contentType: file.type }),
  });
  if (!sign.ok) throw new Error(`Não foi possível preparar o envio (${sign.status}).`);
  const { signedUrl, publicUrl } = await sign.json();
  const put = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type, "Cache-Control": "max-age=31536000" },
    body: file,
  });
  if (!put.ok) throw new Error(`O envio falhou (${put.status}).`);
  return publicUrl as string;
}
