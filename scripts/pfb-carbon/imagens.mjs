// Gera as imagens de /pfb-carbon a partir dos arquivos do dono.
//
// Texturas: recorte central na proporção da placa (1,20 × 2,80 m = 3:7), webp
// para a tela e jpg inteiro (sem recorte) para o arquiteto baixar.
// Fotos do miolo (celular, luz amarela): o tom é neutralizado pelo SPC, que é
// branco; depois níveis, nitidez leve e recorte. Nada é desenhado nem gerado:
// só cor, giro e recorte da foto real.
//
// Uso: node scripts/pfb-carbon/imagens.mjs <pasta das texturas> <pasta das fotos do miolo>
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [pastaTexturas, pastaMiolo] = process.argv.slice(2);
if (!pastaTexturas || !pastaMiolo) throw new Error("uso: node scripts/pfb-carbon/imagens.mjs <texturas> <miolo>");

const SAIDA = path.join(import.meta.dirname, "../../public/images/pfb-carbon");
mkdirSync(path.join(SAIDA, "texturas"), { recursive: true });
mkdirSync(path.join(SAIDA, "download"), { recursive: true });

const MODELOS = [
  ["louro-freijo", "Louro Freijó.png"],
  ["carvalho-natural", "Carvalho Natural.png"],
  ["imbuia", "Imbuia.png"],
  ["jatoba", "Jatobá.png"],
  ["pau-ferro", "Pau Ferro.png"],
];

for (const [slug, arquivo] of MODELOS) {
  const origem = path.join(pastaTexturas, arquivo);
  await sharp(origem).resize(600, 1400, { fit: "cover", position: "centre" }).webp({ quality: 84 })
    .toFile(path.join(SAIDA, "texturas", `${slug}-v1.webp`));
  await sharp(origem).jpeg({ quality: 92, mozjpeg: true })
    .toFile(path.join(SAIDA, "download", `pfb-carbon-${slug}.jpg`));
}

/**
 * Ganho por canal que leva os pixels mais claros (o SPC) a um branco quase
 * neutro, um nada quente. `fracao` = parte mais clara da imagem usada na conta.
 */
async function ganhosDoBranco(imagem, fracao) {
  const { data, info } = await imagem.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const luz = new Uint8Array(n);
  for (let i = 0; i < n; i++) luz[i] = (data[i * 3] * 299 + data[i * 3 + 1] * 587 + data[i * 3 + 2] * 114) / 1000;
  const corte = Uint8Array.from(luz).sort()[Math.floor(n * (1 - fracao))];
  let r = 0, g = 0, b = 0, k = 0;
  for (let i = 0; i < n; i++) {
    if (luz[i] < corte) continue;
    r += data[i * 3]; g += data[i * 3 + 1]; b += data[i * 3 + 2]; k++;
  }
  r /= k; g /= k; b /= k;
  const alvo = (r * 299 + g * 587 + b * 114) / 1000;
  return [(alvo * 1.015) / r, alvo / g, (alvo * 0.975) / b];
}

/** Escurece o que fica fora da faixa da placa (linhas acima de y0 e abaixo de y1), com transição suave. */
function veuForaDaFaixa(largura, altura, y0, y1, borda) {
  const a = (y) => (y / altura).toFixed(4);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
      <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#131211" stop-opacity="1"/>
        <stop offset="${a(Math.max(0, y0 - borda))}" stop-color="#131211" stop-opacity="1"/>
        <stop offset="${a(y0)}" stop-color="#131211" stop-opacity="0"/>
        <stop offset="${a(y1)}" stop-color="#131211" stop-opacity="0"/>
        <stop offset="${a(Math.min(altura, y1 + borda))}" stop-color="#131211" stop-opacity="1"/>
        <stop offset="1" stop-color="#131211" stop-opacity="1"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
    </svg>`,
  );
}

// Faixa: o close (foto 2) girado até a placa ficar deitada, só o corte.
{
  const girada = sharp(await sharp(path.join(pastaMiolo, "2.jpg")).rotate(11.4, { background: "#131211" }).toBuffer());
  const recorte = { left: 330, top: 970, width: 1190, height: 550 };
  const faixa = sharp(await girada.extract(recorte).toBuffer());
  const ganhos = await ganhosDoBranco(faixa, 0.06);
  const tratada = await faixa
    .linear(ganhos, [0, 0, 0])
    .modulate({ saturation: 0.3 })
    .linear(1.26, -24)
    .sharpen({ sigma: 1.1, m1: 0.6, m2: 2.2 })
    .toBuffer();
  await sharp(tratada)
    .composite([{ input: veuForaDaFaixa(recorte.width, recorte.height, 40, 518, 14) }])
    .webp({ quality: 86 })
    .toFile(path.join(SAIDA, "miolo-faixa-v1.webp"));

  // Grão: só o miolo da mesma foto, sem as faixas de SPC, espelhado em 2 × 2
  // para repetir sem emenda. É a cara do substrato no desenho das camadas.
  const miolo = sharp(tratada).extract({ left: 0, top: 110, width: recorte.width, height: 340 });
  const [a, b, c, d] = await Promise.all([
    miolo.clone().toBuffer(), miolo.clone().flop().toBuffer(), miolo.clone().flip().toBuffer(), miolo.clone().flip().flop().toBuffer(),
  ]);
  await sharp({ create: { width: recorte.width * 2, height: 680, channels: 3, background: "#131211" } })
    .composite([
      { input: a, left: 0, top: 0 }, { input: b, left: recorte.width, top: 0 },
      { input: c, left: 0, top: 340 }, { input: d, left: recorte.width, top: 340 },
    ])
    .png().toBuffer()
    .then((mosaico) => sharp(mosaico).resize({ width: 1024 }).webp({ quality: 80 }).toFile(path.join(SAIDA, "miolo-grao-v1.webp")));
}

// Mão: a placa inteira segurada de lado (foto 5), sem o folheto do canto.
{
  const corte = sharp(await sharp(path.join(pastaMiolo, "5.jpg")).extract({ left: 0, top: 500, width: 1400, height: 1050 }).toBuffer());
  const ganhos = await ganhosDoBranco(corte, 0.012);
  await corte
    .linear(ganhos, [0, 0, 0])
    .modulate({ saturation: 0.8 })
    .linear(1.12, -10)
    .sharpen({ sigma: 0.9, m1: 0.5, m2: 1.8 })
    .webp({ quality: 84 })
    .toFile(path.join(SAIDA, "miolo-mao-v1.webp"));
}

console.log("imagens em", SAIDA);
