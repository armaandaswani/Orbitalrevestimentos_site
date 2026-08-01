/**
 * Gerador de ZIP mínimo, sem dependência externa.
 *
 * Usa o método STORE (sem compressão) de propósito: o conteúdo são JPEG/PNG, que
 * já estão comprimidos — deflate gastaria CPU para ganhar quase nada, e às vezes
 * até aumenta o arquivo. Sem compressão, o ZIP é só um envelope.
 *
 * Cobre o necessário e nada além: cabeçalho local, diretório central e EOCD, com
 * nomes em UTF-8. Sem Zip64 — o limite de 4 GB por arquivo e 65.535 entradas é
 * ordens de grandeza maior que a galeria de um produto.
 */

export interface ZipEntry {
  /** Nome dentro do arquivo (pode conter "/" para criar pastas). */
  name: string;
  data: Uint8Array;
}

// Tabela de CRC-32 (polinômio 0xEDB88320), montada uma vez.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Data/hora no formato MS-DOS que o ZIP exige. */
function dosDateTime(d: Date): { time: number; date: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

export function createZip(entries: ZipEntry[], now: Date = new Date()): Buffer {
  const { time, date } = dosDateTime(now);
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data);
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);   // assinatura
    local.writeUInt16LE(20, 4);           // versão necessária (2.0)
    local.writeUInt16LE(0x0800, 6);       // flag: nome em UTF-8
    local.writeUInt16LE(0, 8);            // método: 0 = STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // tamanho comprimido
    local.writeUInt32LE(data.length, 22); // tamanho original
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);           // sem campo extra

    chunks.push(local, nameBytes, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);              // versão que criou
    cd.writeUInt16LE(20, 6);              // versão necessária
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt16LE(0, 30);              // extra
    cd.writeUInt16LE(0, 32);              // comentário
    cd.writeUInt16LE(0, 34);              // disco
    cd.writeUInt16LE(0, 36);              // atributos internos
    cd.writeUInt32LE(0, 38);              // atributos externos
    cd.writeUInt32LE(offset, 42);         // deslocamento do cabeçalho local
    central.push(cd, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);                    // disco
  eocd.writeUInt16LE(0, 6);                    // disco do início do diretório
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);                   // comentário

  return Buffer.concat([...chunks, centralBuf, eocd]);
}

/** Nome de arquivo seguro para qualquer sistema, preservando a extensão. */
export function safeFileName(name: string, fallback = "arquivo"): string {
  const cleaned = name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return cleaned || fallback;
}
