/**
 * Baixar foto de projeto pelo painel. O arquivo vem de outro domínio (storage),
 * onde o atributo download do link é ignorado: busca o arquivo e baixa com um
 * nome legível. Sem imports com "@/" para rodar no node --test.
 */

const EXTENSOES = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "avif", "gif"]);

/** "casa-lago-03.webp": slug do projeto, posição na galeria e extensão do arquivo. */
export function nomeDaFoto(slug: string | null | undefined, posicao: number, url: string): string {
  const caminho = String(url ?? "").split(/[?#]/)[0];
  const ext = caminho.includes(".") ? caminho.slice(caminho.lastIndexOf(".") + 1).toLowerCase() : "";
  const base = String(slug ?? "").trim() || "foto-projeto";
  return `${base}-${String(posicao).padStart(2, "0")}.${EXTENSOES.has(ext) ? ext : "jpg"}`;
}

/** Devolve false se não deu para baixar (o painel avisa). */
export async function baixarFoto(url: string, nome: string): Promise<boolean> {
  try {
    const r = await fetch(url);
    if (!r.ok) return false;
    const objeto = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = objeto;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objeto), 10_000);
    return true;
  } catch {
    return false;
  }
}
