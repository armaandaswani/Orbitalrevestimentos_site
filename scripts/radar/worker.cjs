const { setTimeout: delay } = require("node:timers/promises");
const { supabaseAdmin } = require("./supabase.js");
const { evidence, transition } = require("./radar/store.js");
const { extract, prepareImage } = require("./radar/ocr.js");

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RADAR_OCR) {
  throw new Error("Configure o Supabase e o motor OCR do Radar.");
}
const db = supabaseAdmin();
const legacyError = "OCR indisponível neste ambiente. A revisão manual está disponível.";

async function processQueue() {
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data, error } = await db.from("radar_assets").select("*")
    .or(`status.eq.pending,and(status.eq.failed,error.eq."${legacyError}"),and(status.eq.processing,updated_at.lt.${cutoff})`)
    .order("created_at").limit(20);
  if (error) throw new Error("Não foi possível consultar a fila.");
  for (const asset of data) {
    if (asset.attempts >= 5 && asset.error !== legacyError) {
      await transition(asset, { status:"failed", error:"Limite de tentativas atingido. Revise a foto ou tente novamente." });
      continue;
    }
    const claimed = await transition(asset, { status:"processing", attempts:asset.error === legacyError ? 1 : asset.attempts+1, error:null });
    if (!claimed) continue;
    try {
      const result = await extract(await prepareImage(await evidence(claimed)));
      const fields = Object.keys(result.observations).length;
      const note = result.ambiguous ? "Há valores conflitantes. Confira a placa." :
        fields ? null : "Nenhum campo reconhecido. Preencha a revisão manual.";
      if (await transition(claimed, { status:"review", observations:result.observations, error:note })) {
        console.log(fields ? "Leitura disponível para revisão." : "Foto encaminhada para revisão manual.");
      }
    } catch {
      await transition(claimed, { status:"failed", error:"Falha na leitura. Revise a foto ou tente novamente." });
      console.warn("Não foi possível ler uma foto.");
    }
  }
}

async function run() {
  for (;;) {
    try { await processQueue(); }
    catch { console.warn("Fila indisponível. Nova tentativa em instantes."); }
    await delay(8000);
  }
}
void run();
