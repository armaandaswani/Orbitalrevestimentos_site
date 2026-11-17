/**
 * Salvar a imagem gerada. No celular vai pela folha de compartilhar do sistema
 * (Web Share com o arquivo): no iPhone, "Salvar imagem" grava direto em Fotos;
 * no Android, a galeria aparece entre os destinos. Um site não grava na
 * galeria sem esse toque. No computador, ou sem suporte, baixa o arquivo.
 *
 * O arquivo fica pronto antes do toque: o Safari só abre a folha dentro do
 * gesto, e esperar um fetch no meio pode perder o gesto (NotAllowedError).
 * Sem imports com "@/" para rodar no node --test.
 */

export const NOME_ARQUIVO = "orbital-visualizacao";

const EXTENSAO: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const nome = (tipo: string) => `${NOME_ARQUIVO}.${EXTENSAO[tipo] ?? "png"}`;

/** data: URL → File, sem rede (síncrono). null se não for data: de imagem. */
export function arquivoDeDataUrl(src: string): File | null {
  const m = /^data:(image\/[a-z+.-]+)?(;base64)?,([\s\S]*)$/i.exec(src);
  if (!m) return null;
  const tipo = (m[1] || "image/png").toLowerCase();
  let bytes: Uint8Array;
  try {
    if (m[2]) {
      const bin = atob(m[3]);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(m[3]));
    }
  } catch {
    return null;
  }
  return new File([bytes as BlobPart], nome(tipo), { type: tipo });
}

/** Prepara o arquivo: na hora para data:, buscando para uma URL. */
export async function prepararArquivo(src: string): Promise<File | null> {
  const local = arquivoDeDataUrl(src);
  if (local || src.startsWith("data:")) return local;
  try {
    const r = await fetch(src);
    if (!r.ok) return null;
    const blob = await r.blob();
    const tipo = blob.type.startsWith("image/") ? blob.type : "image/png";
    return new File([blob], nome(tipo), { type: tipo });
  } catch {
    return null;
  }
}

/** Celular com a folha de compartilhar aceitando este arquivo. */
export function vaiParaGaleria(arquivo: File | null): arquivo is File {
  if (!arquivo || typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare?.({ files: [arquivo] }) ?? false;
  } catch {
    return false;
  }
}

function baixar(src: string, arquivo: File | null) {
  const a = document.createElement("a");
  const url = arquivo ? URL.createObjectURL(arquivo) : src;
  a.href = url;
  a.download = arquivo?.name ?? `${NOME_ARQUIVO}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (arquivo) setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Chamar direto no clique. Só o arquivo na folha (sem texto nem link): com
 * texto junto, o iPhone tira o "Salvar imagem" da lista.
 */
export async function salvarImagem(src: string, arquivo: File | null): Promise<void> {
  if (vaiParaGaleria(arquivo)) {
    try {
      await navigator.share({ files: [arquivo] });
      return;
    } catch (e) {
      // Fechou a folha: não faz nada. Outro erro: baixa o arquivo.
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }
  baixar(src, arquivo);
}
