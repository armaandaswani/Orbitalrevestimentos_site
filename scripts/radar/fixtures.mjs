import sharp from "sharp";
export async function syntheticSign(format = 1, color = "#ffffff") {
  const common = [
    "IMPLURB", "MUNICÍPIO: Manaus", "UF: AM",
    `PROCESSO: 910${format}/2026`, `ALVARÁ: 920${format}/2026`,
    `VALIDADE: ${format===1?"09/08/2026":"01/09/2027"}`,
    "USO: Residencial unifamiliar", "PAVIMENTOS: 2",
    `ÁREA CONSTRUÍDA: ${format===1?"53,10":"260,32"}`,
    "ENDEREÇO: Rua Exemplo", "AUTOR DO PROJETO: Profissional Sintético",
    `RESPONSÁVEL TÉCNICO: ${format===1?"Outra Pessoa Sintética":"Profissional Sintético"}`,
    "CPF: 111.222.333-44",
  ];
  return sharp(Buffer.from(`<svg width="1320" height="1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/><g font-family="Arial" font-size="37" fill="#101010">
    ${common.map((line,i)=>`<text x="70" y="${75+72*i}">${line}</text>`).join("")}
    </g></svg>`)).png().toBuffer();
}
