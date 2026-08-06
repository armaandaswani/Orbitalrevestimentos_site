/**
 * Recomprime as imagens já existentes no storage.
 *
 *   node scripts/comprimir-storage.ts              # SIMULAÇÃO — não escreve nada
 *   node scripts/comprimir-storage.ts --aplicar    # aplica de verdade
 *   node scripts/comprimir-storage.ts --aplicar --sem-backup
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
 * Segurança: por padrão copia o original para o prefixo `_originais/` ANTES de
 * sobrescrever. Passe --sem-backup para pular (o storage já está no limite, e a
 * cópia ocupa espaço enquanto existir).
 */
import fs from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const APLICAR = process.argv.includes("--aplicar");
const SEM_BACKUP = process.argv.includes("--sem-backup");
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
const alvos = todos.filter((f) => f.size >= MIN_BYTES && /^image\/(jpeg|jpg|png|webp)$/i.test(f.mime));

console.log(`\nModo: ${APLICAR ? "APLICAR (escreve no storage)" : "SIMULAÇÃO (não escreve nada)"}`);
console.log(`Backup dos originais: ${APLICAR && !SEM_BACKUP ? "sim, em _originais/" : "não"}`);
console.log(`\n${todos.length} arquivos no bucket · ${alvos.length} candidatos (≥ ${mb(MIN_BYTES)} MB)\n`);

let antes = 0, depois = 0, ok = 0, pulados = 0, erros = 0;

for (const [i, f] of alvos.entries()) {
  try {
    const { data: blob, error } = await db.storage.from(BUCKET).download(f.path);
    if (error || !blob) { erros++; console.log(`  ✗ ${f.path} — download: ${error?.message}`); continue; }
    const buf = Buffer.from(await blob.arrayBuffer());

    const out = await sharp(buf)
      .rotate() // aplica a orientação EXIF antes de descartar os metadados
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

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

    if (!SEM_BACKUP) {
      const up = await db.storage.from(BUCKET).upload(`_originais/${f.path}`, buf, {
        contentType: f.mime, upsert: true,
      });
      if (up.error) { erros++; console.log(`      ✗ backup falhou: ${up.error.message} — NÃO sobrescrevi`); continue; }
    }

    // Sobrescreve no MESMO caminho: a URL pública continua válida.
    const rep = await db.storage.from(BUCKET).upload(f.path, out, {
      contentType: "image/jpeg", upsert: true,
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
