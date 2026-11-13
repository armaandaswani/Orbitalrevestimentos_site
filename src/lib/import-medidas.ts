/**
 * Lista de medidas colada no "Importar" do pedido, sem IA:
 *
 *   Ambiente 1:
 *   Altura 2.87
 *   Largura 1.81
 *
 *   Ambiente 2:
 *   altura: 2.59
 *   Largura: 2.05 + 1.34
 *
 *   Ambos 004
 *
 * Cada ambiente vira uma linha com as placas contadas pela regra do site
 * (parede pela largura; teto/forro pelo maior entre m² e largura, como a Ste).
 * Larguras somadas ("2.05 + 1.34") contam como uma faixa contínua. O modelo
 * vem de uma linha "Ambos/Todos/Modelo <código>" (vale para todos) ou de uma
 * dentro do ambiente. O resultado passa pelo reviewImportedQuantities: o admin
 * confere antes de adicionar.
 *
 * Sem imports para rodar no node --test; o route passa o panelGrid.
 */

type Produto = { id: string; name: string; code?: string | null };
type Grade = (w: number, h: number, pw: number, ph: number) => { cols: number; fullRows: number; extraPanels: number; count: number };

const PLACA_W = 1.2, PLACA_H = 2.9, PLACA_M2 = 3.48;
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const sem = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const num = (v: string) => Number(v.replace(",", "."));
const br = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** "2.05 + 1.34" → [2.05, 1.34]; aceita m, cm não. */
function medidas(resto: string): number[] | null {
  const lista = resto.replace(/m\b/gi, "").split("+").map((p) => p.trim()).filter(Boolean);
  if (!lista.length || !lista.every((p) => new RegExp(`^${NUM}$`).test(p))) return null;
  const v = lista.map(num);
  return v.every((n) => n > 0 && n < 100) ? v : null;
}

/** Código do produto no catálogo: exato ou pelo número ("004" acha "ORB-004"), se for único. */
function codigoDoCatalogo(bruto: string, produtos: ReadonlyArray<Produto>): string {
  const norm = (v: string) => sem(v).replace(/[^a-z0-9]/g, "");
  const exato = produtos.filter((p) => p.code && norm(p.code) === norm(bruto));
  if (exato.length === 1) return exato[0].code as string;
  const digitos = bruto.replace(/\D/g, "");
  if (!digitos) return bruto;
  const porNumero = produtos.filter((p) => p.code && Number(p.code.replace(/\D/g, "") || NaN) === Number(digitos));
  return porNumero.length === 1 ? (porNumero[0].code as string) : bruto;
}

type Bloco = { nome: string; altura?: number[]; largura?: number[]; comprimento?: number[]; codigo?: string; linhas: string[] };

export function parseMeasurementList(text: string, produtos: ReadonlyArray<Produto>, grade: Grade): Array<Record<string, unknown>> | null {
  const blocos: Bloco[] = [];
  let atual: Bloco | null = null;
  let codigoGeral = "";
  const reMedida = new RegExp(`^(altura|alt|largura|larg|comprimento|comp)\\.?\\s*[:=]?\\s*(.+)$`);
  const reModelo = /^(ambos|ambas|todos|todas|modelo|produto|codigo|cod|ref|referencia)\b\.?\s*[:=]?\s*(?:o\s+|a\s+|modelo\s+|cod(?:igo)?\s+)?([a-z]*-?\s?\d{1,6}[a-z]?)\s*$/;

  for (const original of text.split(/\r?\n/)) {
    const linha = original.trim();
    if (!linha) continue;
    const l = sem(linha);
    const m = l.match(reMedida);
    if (m) {
      const v = medidas(m[2]);
      if (!v) return null;
      if (!atual) { atual = { nome: "", linhas: [] }; blocos.push(atual); }
      const campo = m[1].startsWith("alt") ? "altura" : m[1].startsWith("larg") ? "largura" : "comprimento";
      atual[campo] = v;
      atual.linhas.push(linha);
      continue;
    }
    const mod = l.match(reModelo);
    if (mod) {
      const codigo = mod[2].replace(/\s/g, "").toUpperCase();
      if (/^(ambos|ambas|todos|todas)$/.test(mod[1]) || !atual) codigoGeral = codigo;
      else atual.codigo = codigo;
      continue;
    }
    // Qualquer outra linha curta abre um ambiente ("Ambiente 1:", "Lavabo", "Teto da sala").
    if (linha.length > 60) return null;
    atual = { nome: linha.replace(/:\s*$/, "").trim(), linhas: [] };
    blocos.push(atual);
  }

  const comMedidas = blocos.filter((b) => b.altura || b.largura || b.comprimento);
  if (!comMedidas.length) return null;

  return comMedidas.map((b, i) => {
    const nome = b.nome || `Ambiente ${i + 1}`;
    const teto = /\b(teto|forro)\b/.test(sem(nome));
    const codigoBruto = b.codigo || codigoGeral;
    const code = codigoBruto ? codigoDoCatalogo(codigoBruto, produtos) : "";
    const larguras = b.largura ?? [];
    const w = larguras.reduce((s, n) => s + n, 0);
    const h = teto ? (b.comprimento ?? b.altura ?? []).reduce((s, n) => s + n, 0) : Math.max(0, ...(b.altura ?? []));
    const somada = larguras.length > 1 ? `${larguras.map(br).join(" + ")} = ${br(w)} m` : `${br(w)} m`;
    let quantity: number | null = null, conta = "medidas incompletas: informe largura e altura";
    if (w > 0 && h > 0) {
      if (teto) {
        const porArea = Math.max(1, Math.round((w * h) / PLACA_M2)), porLargura = Math.max(1, Math.round(w / PLACA_W));
        quantity = Math.max(porArea, porLargura);
        conta = `teto ${somada} × ${br(h)} m: por m² ${porArea}, por largura ${porLargura}; usado ${quantity}`;
      } else {
        const g = grade(w, h, PLACA_W, PLACA_H);
        quantity = g.count;
        conta = g.fullRows === 0
          ? `parede ${somada} × ${br(h)} m: ${g.cols} placa(s) lado a lado pela largura`
          : `parede ${somada} × ${br(h)} m: ${g.cols} coluna(s) × ${g.fullRows} fileira(s)${g.extraPanels ? ` + ${g.extraPanels} para completar a altura` : ""} = ${g.count}`;
      }
    }
    return { description: "", code, quantity, unit: "placa", space: nome, evidence: `${b.linhas.join(" · ")} → ${conta}` };
  });
}
