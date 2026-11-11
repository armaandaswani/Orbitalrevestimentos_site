import "./build-test.mjs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {prepareImage,extract} = require("../../.next/radar-check/ocr.js");
const folder = process.argv[2];
if (!folder) throw new Error("Informe a pasta de fotos.");
const files = (await readdir(folder)).filter(n=>/\.(jpg|jpeg|png|webp|heic)$/i.test(n)).sort();
let identified=0, both=0, error=0, large=0, ambiguous=0;
for (const filename of files) {
  try {
    const bytes=await readFile(join(folder,filename));
    if (bytes.length>4_000_000) large++;
    const result=await extract(await prepareImage(bytes));
    const o=result.observations;
    if (o.permit||o.process) identified++;
    if (o.author&&o.supervisor) both++;
    if (result.ambiguous) ambiguous++;
    if (/^IMG_(7706|7762)\.JPG$/i.test(filename)) {
      console.log(JSON.stringify({
        filename, fields:Object.keys(o), floors:o.floors?.value, area:o.area?.value, expires:o.expires?.value,
        distinctRoles:o.author&&o.supervisor?o.author.value!==o.supervisor.value:null, permitFound:!!o.permit, processFound:!!o.process,
      }));
    }
  } catch { error++; } // Never print text, filenames outside references, or provider stderr.
}
console.log(JSON.stringify({ files:files.length, identified,both,ambiguous,error,large }));
