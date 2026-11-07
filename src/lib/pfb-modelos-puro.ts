/**
 * Parte pura da vitrine de modelos do PFB (sem `import`: roda em `node --test`).
 * A leitura do banco fica em `pfb-modelos.ts`, que reexporta estes tipos.
 */

export type LinhaPfb = "Classic" | "Brilliance" | "Elegance";

export interface ModeloVitrine {
  code: string;
  name: string;
  linha: "Classic" | "Brilliance" | "Elegance";
  image_path: string;
}

const LINHAS: readonly LinhaPfb[] = ["Classic", "Brilliance", "Elegance"];

/**
 * Agrupa os modelos por linha. As três chaves sempre existem; cada lista
 * mantém a ordem recebida e é cortada em `porLinha`; linha fora das três é
 * descartada.
 */
export function agruparPorLinha(
  linhas: Array<{ code: string; name: string; linha: string; image_path: string }>,
  porLinha: number,
): Record<"Classic" | "Brilliance" | "Elegance", ModeloVitrine[]> {
  const grupos: Record<LinhaPfb, ModeloVitrine[]> = {
    Classic: [],
    Brilliance: [],
    Elegance: [],
  };
  for (const m of linhas) {
    const linha = LINHAS.find((l) => l === m.linha);
    if (!linha) continue;
    if (grupos[linha].length >= porLinha) continue;
    grupos[linha].push({
      code: m.code,
      name: m.name,
      linha,
      image_path: m.image_path,
    });
  }
  return grupos;
}
