/**
 * Baixar a textura de um modelo (dono, 28/11/2026): no celular a pessoa escolhe
 * entre gravar na galeria (folha de compartilhar do sistema com o arquivo; no
 * iPhone, "Salvar imagem" grava em Fotos) e baixar o JPG em Arquivos. No
 * computador não há galeria: baixa o JPG direto.
 *
 * O arquivo fica pronto antes do toque em "Salvar na galeria": o Safari só abre
 * a folha dentro do gesto, e esperar um fetch no meio perde o gesto.
 * Sem imports com "@/" para rodar no node --test.
 */

/** Nome do arquivo sem acento nem espaço, sempre .jpg. */
export function nomeDaTextura(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.(jpe?g|png|webp)$/i, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "orbital-textura"}.jpg`;
}

/** Celular com folha de compartilhar que aceita arquivo de imagem. */
export function temGaleria(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "t.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

/** Qualquer imagem → JPEG (o PNG/WebP do painel vira JPG pelo canvas). */
async function comoJpg(blob: Blob): Promise<Blob> {
  if (blob.type === "image/jpeg") return blob;
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return new Promise((ok) => canvas.toBlob((b) => ok(b ?? blob), "image/jpeg", 0.92));
}

/** Busca a textura e devolve o arquivo .jpg pronto. null se a rede falhar. */
export async function prepararTextura(url: string, nome: string): Promise<File | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const jpg = await comoJpg(await r.blob());
    return new File([jpg], nomeDaTextura(nome), { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/** Baixa o arquivo; sem ele (rede falhou), abre a textura numa aba. */
export function baixarArquivo(arquivo: File | null, url: string): void {
  if (!arquivo) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const obj = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = obj;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(obj), 10_000);
}

/**
 * Chamar direto no toque. Só o arquivo na folha, sem texto nem link: com texto
 * junto, o iPhone tira o "Salvar imagem" da lista. true = foi (ou a pessoa
 * fechou a folha); false = não deu, quem chamou baixa o arquivo.
 */
export async function mandarParaGaleria(arquivo: File): Promise<boolean> {
  try {
    await navigator.share({ files: [arquivo] });
    return true;
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError";
  }
}
