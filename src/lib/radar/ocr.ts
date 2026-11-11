import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { parseLayout, parseLines, type Line } from "./domain";

const exec = promisify(execFile);
const MIME: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heif: "image/heic" };
export class InvalidImage extends Error {}
export async function prepareImage(buffer: Buffer) {
  try {
    const image = sharp(buffer, { limitInputPixels: 64_000_000, failOn: "error" });
    const meta = await image.metadata();
    const mime = MIME[meta.format ?? ""];
    if (!mime || (meta.pages ?? 1) !== 1 || (meta.width ?? 0) < 160 || (meta.height ?? 0) < 120) throw new Error();
    const { data, info } = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).greyscale().normalise().sharpen().png().toBuffer({ resolveWithObject: true });
    return { mime, data, original: buffer, width: info.width, height: info.height };
  } catch { throw new InvalidImage("Imagem inválida ou incompatível. Use JPG, PNG ou WebP; HEIC depende do servidor."); }
}
export function readTsv(tsv: string, width: number, height: number): Line[] {
  const groups = new Map<string, { words: string[]; confidence: number; left: number; top: number; right: number; bottom: number }>();
  for (const row of tsv.split("\n")) {
    const c = row.split("\t");
    if (c[0] !== "5" || !c[11]?.trim()) continue;
    const [left, top, w, h, conf] = c.slice(6, 11).map(Number);
    if (![left, top, w, h, conf].every(Number.isFinite) || conf < 0) continue;
    const key = c.slice(1, 5).join(":");
    const g = groups.get(key) ?? { words: [], confidence: 0, left, top, right: left+w, bottom: top+h };
    g.words.push(c[11]); g.confidence += conf;
    g.left = Math.min(g.left, left); g.top = Math.min(g.top, top);
    g.right = Math.max(g.right, left+w); g.bottom = Math.max(g.bottom, top+h);
    groups.set(key, g);
  }
  return [...groups.values()].map(g => ({ text: g.words.join(" "), confidence: g.confidence / g.words.length / 100,
    box: [g.left/width, g.top/height, g.right/width, g.bottom/height] }));
}
let active = 0;
export async function extract(prepared: Awaited<ReturnType<typeof prepareImage>>) {
  if (!["tesseract","vision"].includes(process.env.RADAR_OCR ?? "")) throw new Error("OCR indisponível neste ambiente. A revisão manual está disponível.");
  if (active >= (process.env.RADAR_OCR === "vision" ? 1 : 2)) throw new Error("OCR ocupado. Tente novamente em instantes.");
  active++;
  let dir: string | undefined;
  try {
    dir = await mkdtemp(join(tmpdir(), "orbital-radar-"));
    const native = process.env.RADAR_OCR === "vision";
    const file = join(dir, native ? "sign-original" : "sign.png");
    await writeFile(file, native ? prepared.original : prepared.data, { mode: 0o600 });
    if (process.env.RADAR_OCR === "vision") {
      if (process.platform !== "darwin" || !process.env.RADAR_VISION_BIN) throw new Error("OCR Vision precisa do executável local no macOS.");
      const result = await exec(process.env.RADAR_VISION_BIN, [file], { timeout: 25_000, maxBuffer: 1_000_000 })
        .catch(() => { throw new Error("OCR Vision não concluiu. Revise a placa manualmente."); });
      return parseLayout(JSON.parse(result.stdout) as Line[]);
    }
    const result = await exec(process.env.RADAR_TESSERACT_BIN || "tesseract", [file, "stdout", "-l", process.env.RADAR_TESSERACT_LANG || "por", "--psm", "6", "tsv"], {
      timeout: 25_000, maxBuffer: 1_000_000, env: { ...process.env, OMP_THREAD_LIMIT: "1" },
    }).catch(() => { throw new Error("OCR não concluiu. Confira o idioma instalado ou revise a placa manualmente."); });
    return parseLines(readTsv(result.stdout, prepared.width, prepared.height));
  } finally {
    active--;
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
