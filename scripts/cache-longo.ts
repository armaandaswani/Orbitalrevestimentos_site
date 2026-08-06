/**
 * Sobe o cache das imagens do storage de 1 hora para 1 ano.
 *
 *   node scripts/cache-longo.ts             # SIMULAÇÃO
 *   node scripts/cache-longo.ts --aplicar
 *
 * Por que: os objetos são servidos com `public, max-age=3600`. Um visitante que
 * volta no dia seguinte rebaixa o catálogo inteiro, e cada rebaixa conta no
 * medidor de Cached Egress. Os nomes têm timestamp e nunca são reescritos com
 * conteúdo diferente, então são imutáveis na prática — 1 ano é seguro.
 *
 * O Supabase só grava o cacheControl no upload; não há API para editar o
 * metadado sozinho. Então cada arquivo precisa ser reenviado. Para não gastar
 * egress, as imagens que têm original no backup local são REGERADAS aqui
 * (mesmos parâmetros do comprimir-storage.ts) em vez de baixadas. Só o que não
 * está no backup é baixado — são os arquivos pequenos, poucos MB no total.
 *
 * NÃO toca em nada que não seja imagem. O assets/manifest.json muda quando os
 * assets mudam; cache de 1 ano nele deixaria o site preso numa versão velha.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const APLICAR = process.argv.includes("--aplicar");
const BUCKETS = ["site-images", "campaign-images"];
const BACKUP = path.join(process.env.HOME ?? "", "Desktop/Orbital/originais-storage-backup");
const UM_ANO = "31536000";
const MAX_SIDE = 2400;
const QUALITY = 82;

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const mb = (b: number) => (b / 1024 / 1024).toFixed(1);

/** Mesma transformação do comprimir-storage.ts, para regerar sem baixar. */
async function comprimir(buf: Buffer) {
  const meta = await sharp(buf).metadata();
  const comAlfa = meta.hasAlpha === true;
  const base = sharp(buf).rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
  const out = await (comAlfa ? base.webp({ quality: QUALITY }) : base.jpeg({ quality: QUALITY, mozjpeg: true })).toBuffer();
  return { out, mime: comAlfa ? "image/webp" : "image/jpeg" };
}

async function listar(bucket: string, prefix = "", acc: Array<{ path: string; mime: string; size: number }> = []) {
  const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) { console.error("erro ao listar", bucket, prefix, error.message); return acc; }
  for (const f of data ?? []) {
    const p = prefix ? `${prefix}/${f.name}` : f.name;
    if (p.startsWith("_teste")) continue;
    if (f.id === null) await listar(bucket, p, acc);
    else acc.push({ path: p, mime: f.metadata?.mimetype ?? "", size: f.metadata?.size ?? 0 });
  }
  return acc;
}

console.log(`\nModo: ${APLICAR ? "APLICAR" : "SIMULAÇÃO (não escreve nada)"}\n`);

let regerados = 0, baixados = 0, pulados = 0, erros = 0, bytesBaixados = 0;

for (const bucket of BUCKETS) {
  const todos = await listar(bucket);
  const imagens = todos.filter((f) => /^image\//i.test(f.mime));
  const outros = todos.filter((f) => !/^image\//i.test(f.mime));
  console.log(`${bucket}: ${todos.length} arquivos · ${imagens.length} imagens · ${outros.length} ignorados`);
  for (const o of outros) console.log(`   ignorado (não é imagem): ${o.path}`);

  for (const f of imagens) {
    try {
      const local = path.join(BACKUP, f.path);
      let corpo: Buffer, mime: string;

      if (bucket === "site-images" && fs.existsSync(local)) {
        const r = await comprimir(fs.readFileSync(local));
        corpo = r.out; mime = r.mime;
        regerados++;
      } else {
        // sem original em disco: baixa (são os arquivos pequenos)
        const { data, error } = await db.storage.from(bucket).download(f.path);
        if (error || !data) { erros++; console.log(`   ✗ ${f.path} — download: ${error?.message}`); continue; }
        corpo = Buffer.from(await data.arrayBuffer());
        mime = f.mime;
        bytesBaixados += corpo.length;
        baixados++;
      }

      if (!APLICAR) continue;

      const { error } = await db.storage.from(bucket).upload(f.path, corpo, {
        contentType: mime, upsert: true, cacheControl: UM_ANO,
      });
      if (error) { erros++; console.log(`   ✗ ${f.path} — upload: ${error.message}`); }
    } catch (e) {
      erros++;
      console.log(`   ✗ ${f.path} — ${e instanceof Error ? e.message : "erro"}`);
    }
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`  regerados do backup (0 egress) : ${regerados}`);
console.log(`  baixados (pequenos)            : ${baixados}  =  ${mb(bytesBaixados)} MB de egress`);
console.log(`  ignorados                      : ${pulados}`);
console.log(`  erros                          : ${erros}`);
if (!APLICAR) console.log(`\n  Nada foi escrito. Para aplicar: node scripts/cache-longo.ts --aplicar`);
console.log();
