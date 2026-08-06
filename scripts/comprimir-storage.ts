/**
 * Recomprime as imagens já existentes no storage.
 *
 *   node scripts/comprimir-storage.ts                          # SIMULAÇÃO
 *   node scripts/comprimir-storage.ts --aplicar --backup ~/dir # aplica guardando originais
 *   node scripts/comprimir-storage.ts --aplicar                # aplica sem guardar nada
 *   node scripts/comprimir-storage.ts --amostra 5              # simula só 5 arquivos
 *
 * Por que existe: as fotos foram subidas cruas, direto da câmera (8064×6048, até
 * 14,29 MB). São 287 arquivos acima de 1 MB somando ~1.045 MB, servidos assim
 * mesmo para o visitante — o que consumiu 15,9 GB de banda num mês (cota: 5 GB)
 * e estourou também o limite de 1 GB de storage.
 *
 * O que faz: reduz para 2400px no maior lado, qualidade 82, mantendo a
 * orientação EXIF. A URL pública NÃO muda — o arquivo é sobrescrito no mesmo
 * caminho, então nada no banco precisa ser atualizado e nenhum link quebra.
 *
 * Segurança: --backup <dir> grava o original em disco ANTES de sobrescrever.
 * O backup vai para o disco local e não para o próprio bucket — o storage já
 * está acima da cota, e uma cópia lá dobraria justamente o que queremos reduzir.
 * Sem --backup, o original é perdido.
 *
 * Cada arquivo é baixado UMA vez: o mesmo buffer serve para o backup e para a
 * compressão. Download é egress, e a conta está estourada — não dá para baixar
 * duas vezes. Por isso também existe --amostra, para conferir o resultado em
 * poucos arquivos antes de gastar banda com os 297.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const APLICAR = process.argv.includes("--aplicar");
const BACKUP_DIR = (() => {
  const i = process.argv.indexOf("--backup");
  return i >= 0 ? process.argv[i + 1]?.replace(/^~/, process.env.HOME ?? "~") : undefined;
})();
const AMOSTRA = (() => {
  const i = process.argv.indexOf("--amostra");
  return i >= 0 ? Number(process.argv[i + 1]) : undefined;
})();

if (APLICAR && !BACKUP_DIR) {
  console.log("\n  AVISO: sem --backup <dir>, os originais serão perdidos.\n");
}
const BUCKET = "site-images";
const MAX_SIDE = 2400;
const QUALITY = 82;
/** Abaixo disto não vale mexer. */
const MIN_BYTES = 400 * 1024;

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const mb = (b: number) => (b / 1024 / 1024).toFixed(2);

async function listar(prefix = "", acc: Array<{ path: string; size: number; mime: string }> = []) {
  const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) { console.error("erro ao listar", prefix, error.message); return acc; }
  for (const f of data ?? []) {
    const p = prefix ? `${prefix}/${f.name}` : f.name;
    // Nunca desce no backup — senão recomprime a própria cópia de segurança.
    if (p.startsWith("_originais")) continue;
    if (f.id === null) await listar(p, acc);
    else acc.push({ path: p, size: f.metadata?.size ?? 0, mime: f.metadata?.mimetype ?? "" });
  }
  return acc;
}

const todos = await listar();
let alvos = todos.filter((f) => f.size >= MIN_BYTES && /^image\/(jpeg|jpg|png|webp)$/i.test(f.mime));
const total = alvos.length;
if (AMOSTRA) alvos = alvos.slice(0, AMOSTRA);

console.log(`\nModo: ${APLICAR ? "APLICAR (escreve no storage)" : "SIMULAÇÃO (não escreve nada)"}`);
console.log(`Backup dos originais: ${BACKUP_DIR ?? "NÃO — originais serão perdidos"}`);
console.log(`\n${todos.length} arquivos no bucket · ${total} candidatos (≥ ${mb(MIN_BYTES)} MB)`);
console.log(AMOSTRA ? `Processando amostra de ${alvos.length}.\n` : "");

let antes = 0, depois = 0, ok = 0, pulados = 0, erros = 0;

for (const [i, f] of alvos.entries()) {
  try {
    const { data: blob, error } = await db.storage.from(BUCKET).download(f.path);
    if (error || !blob) { erros++; console.log(`  ✗ ${f.path} — download: ${error?.message}`); continue; }
    const buf = Buffer.from(await blob.arrayBuffer());

    // Imagem com transparência NÃO pode virar JPEG — o JPEG não tem canal alfa
    // e o fundo transparente vira preto. Nesses casos sai WebP, que comprime
    // tão bem quanto e preserva o alfa. 180 dos 297 arquivos são PNG.
    const meta = await sharp(buf).metadata();
    const comAlfa = meta.hasAlpha === true;
    const mimeSaida = comAlfa ? "image/webp" : "image/jpeg";

    const base = sharp(buf)
      .rotate() // aplica a orientação EXIF antes de descartar os metadados
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    const out = await (comAlfa
      ? base.webp({ quality: QUALITY })
      : base.jpeg({ quality: QUALITY, mozjpeg: true })
    ).toBuffer();

    if (out.length >= buf.length) {
      pulados++;
      console.log(`  – ${f.path} — já está otimizado (${mb(buf.length)} MB)`);
      continue;
    }

    antes += buf.length;
    depois += out.length;
    ok++;

    const pct = Math.round((1 - out.length / buf.length) * 100);
    console.log(`  ${APLICAR ? "✓" : "·"} [${i + 1}/${alvos.length}] ${f.path}`);
    console.log(`      ${mb(buf.length)} MB → ${mb(out.length)} MB  (−${pct}%)`);

    if (!APLICAR) continue;

    // Grava o original em disco ANTES de sobrescrever. Se isto falhar, não
    // sobrescreve — perder a foto original é pior que continuar acima da cota.
    if (BACKUP_DIR) {
      try {
        const destino = path.join(BACKUP_DIR, f.path);
        fs.mkdirSync(path.dirname(destino), { recursive: true });
        fs.writeFileSync(destino, buf);
      } catch (e) {
        erros++;
        console.log(`      ✗ backup falhou: ${e instanceof Error ? e.message : "erro"} — NÃO sobrescrevi`);
        continue;
      }
    }

    // Sobrescreve no MESMO caminho: a URL pública continua válida.
    const rep = await db.storage.from(BUCKET).upload(f.path, out, {
      contentType: mimeSaida, upsert: true,
    });
    if (rep.error) { erros++; console.log(`      ✗ gravação falhou: ${rep.error.message}`); }
  } catch (e) {
    erros++;
    console.log(`  ✗ ${f.path} — ${e instanceof Error ? e.message : "erro"}`);
  }
}

console.log(`\n${"─".repeat(64)}`);
console.log(`  processados : ${ok}`);
console.log(`  já ótimos   : ${pulados}`);
console.log(`  erros       : ${erros}`);
console.log(`  antes       : ${mb(antes)} MB`);
console.log(`  depois      : ${mb(depois)} MB`);
if (antes > 0) console.log(`  redução     : ${Math.round((1 - depois / antes) * 100)}%`);
if (!APLICAR) console.log(`\n  Nada foi escrito. Para aplicar: node scripts/comprimir-storage.ts --aplicar`);
console.log();
