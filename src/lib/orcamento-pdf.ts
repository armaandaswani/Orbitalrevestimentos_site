// Formal quote PDF (orçamento formalizado do fluxo público). Mirrors the
// institutional look of the admin pedido document (src/app/api/admin/pedidos/
// [id]/send-document) so the two are visually consistent — logo, navy accents,
// product table, totals, commercial blocks, installation notice. Fed by the
// central pricing engine breakdown (OrcamentoBreakdown) so numbers here are
// identical to the site, the WhatsApp message and the admin panel.

import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import path from "path";
import type { OrcamentoBreakdown } from "@/lib/orcamento-pricing";
import { firstName } from "@/lib/name";
import { applicationReasonLabel, materialDisplayName } from "@/lib/orcamento-materials";

export const COMPANY = {
  name: "Orbital Materiais de Construção LTDA",
  cnpj: "58.013.651/0001-04",
  address: "Avenida Visconde de Porto Alegre, 130, Sala 1 - Centro",
  city: "69010-125 - Manaus/AM",
  email: "orbitalrevestimentos@gmail.com",
};

// Terceirizado de instalação — dados iniciais (Fase 8 os torna configuráveis).
export const INSTALLER = {
  name: "Werk Engenharia",
  phone: "(92) 99397-4821",
};

export interface QuoteSpace {
  spaceName?: string;
  productCode?: string;
  productName?: string;
  linha?: string;
  plates?: number;
  area?: number;
  dimLabel?: string;
  pricePerPlate?: number;
  total?: number;
}

export interface QuotePdfInput {
  formalNumber: string;
  createdAt: string;
  validUntil?: string | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  couponCode?: string | null;
  address?: {
    zip?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    condo?: string | null;
  };
  spaces: QuoteSpace[];
  breakdown: OrcamentoBreakdown;
  paymentId: "pix" | "cartao";
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}
function ensureSpace(doc: PDFKit.PDFDocument, needed = 80) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

export function generateQuotePdf(input: QuotePdfInput): Promise<Buffer> {
  const { formalNumber, clientName, spaces, breakdown, paymentId } = input;
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const logoPath = path.join(process.cwd(), "public/images/logo.png");
  if (existsSync(logoPath)) doc.image(logoPath, 42, 42, { width: 58 });
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#002045").text(COMPANY.name, 118, 44);
  doc.font("Helvetica").fontSize(10).fillColor("#333")
    .text(COMPANY.cnpj, 118).text(COMPANY.address, 118).text(COMPANY.city, 118);
  doc.text(COMPANY.email, 385, 48, { align: "right", width: 165 });

  doc.moveTo(42, 118).lineTo(553, 118).strokeColor("#d8d8d8").stroke();

  // Duas colunas independentes (cliente à esquerda, meta à direita). Cada coluna
  // controla seu próprio Y; o conteúdo seguinte começa abaixo da MAIS BAIXA, sem
  // sobreposição.
  const colTop = 132;
  // Coluna esquerda — Dados do cliente
  doc.y = colTop; doc.x = 42;
  doc.font("Helvetica").fontSize(12).fillColor("#555").text("Dados do Cliente", 42, colTop, { width: 300 });
  doc.moveTo(42, doc.y + 2).lineTo(300, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#1a1c1c").text(clientName || "Cliente", 42, doc.y, { width: 300 });
  doc.font("Helvetica").fontSize(9.5).fillColor("#333");
  if (input.clientPhone) doc.text(input.clientPhone, 42, doc.y, { width: 300 });
  if (input.clientEmail) doc.text(input.clientEmail, 42, doc.y, { width: 300 });
  const a = input.address;
  if (a) {
    const l1 = [a.street, a.number].filter(Boolean).join(", ");
    const l2 = [a.complement, a.condo].filter(Boolean).join(" · ");
    const l3 = [a.neighborhood, a.city && a.state ? `${a.city}/${a.state}` : a.city || a.state, a.zip].filter(Boolean).join(" - ");
    for (const line of [l1, l2, l3].filter(Boolean)) doc.text(String(line), 42, doc.y, { width: 300 });
  }
  const clientBottom = doc.y;

  // Coluna direita — metadados
  let metaY = colTop;
  doc.font("Helvetica").fontSize(9.5).fillColor("#333");
  doc.text(`Data: ${fmtDate(input.createdAt)}`, 380, metaY, { width: 171, align: "right" }); metaY += 15;
  doc.text(`Validade: ${fmtDate(input.validUntil)}`, 380, metaY, { width: 171, align: "right" }); metaY += 15;
  doc.text(`Nº: ${formalNumber}`, 380, metaY, { width: 171, align: "right" }); metaY += 15;
  if (input.couponCode) { doc.text(`Parceiro: ${input.couponCode}`, 380, metaY, { width: 171, align: "right" }); metaY += 15; }

  // Título personalizado + faixa, abaixo das duas colunas.
  const fn = firstName(clientName);
  doc.y = Math.max(clientBottom, metaY) + 16;
  doc.x = 42;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#002045")
    .text(fn ? `${fn}, seu projeto em Fibra de Bambu` : "Seu projeto em Fibra de Bambu", 42, doc.y, { width: 511 });
  doc.y += 8;
  doc.rect(42, doc.y, 511, 22).fill("#002045");
  doc.fillColor("#fff").font("Helvetica").fontSize(12).text(`ORÇAMENTO FORMALIZADO Nº ${formalNumber}`, 42, doc.y + 6, { width: 511, align: "center" });
  doc.y += 40;

  // Tabela de produtos (placas por ambiente)
  doc.fillColor("#555").fontSize(14).text("Material");
  doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.5);
  const tableTop = doc.y;
  const cols = { name: 42, qty: 318, unit: 382, price: 430, total: 500 };
  doc.rect(42, tableTop, 511, 20).fill("#e1e1e1");
  doc.fillColor("#1a1c1c").font("Helvetica").fontSize(9)
    .text("Ambiente / Acabamento", cols.name, tableTop + 6)
    .text("Qtd.", cols.qty, tableTop + 6, { width: 44, align: "right" })
    .text("Un.", cols.unit, tableTop + 6, { width: 44, align: "right" })
    .text("Vlr. unit.", cols.price, tableTop + 6, { width: 58, align: "right" })
    .text("Total", cols.total, tableTop + 6, { width: 53, align: "right" });
  doc.y = tableTop + 26;

  for (const sp of spaces) {
    ensureSpace(doc, 40);
    const y = doc.y;
    const qty = Number(sp.plates) || 0;
    const unitPrice = Number(sp.pricePerPlate) || 0;
    const lineTotal = Number(sp.total) || qty * unitPrice;
    const sub = [sp.productCode ? `Modelo: ${sp.productCode}` : null, sp.linha, sp.dimLabel].filter(Boolean).join("  ·  ");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1c1c")
      .text(`${sp.spaceName ?? "Ambiente"} — ${sp.productName ?? "PFB"}`, cols.name, y, { width: 268 });
    doc.font("Helvetica").fontSize(7.5).fillColor("#777").text(sub, cols.name, y + 11, { width: 268 });
    doc.font("Helvetica").fontSize(9).fillColor("#1a1c1c")
      .text(String(qty), cols.qty, y, { width: 44, align: "right" })
      .text("Placa", cols.unit, y, { width: 44, align: "right" })
      .text(fmtBRL(unitPrice), cols.price, y, { width: 58, align: "right" })
      .text(fmtBRL(lineTotal), cols.total, y, { width: 53, align: "right" });
    doc.y = y + 26;
    doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor("#eeeeee").stroke();
    doc.y += 6;
  }

  // Materiais de instalação — um item por linha. Quais entram depende do tipo de
  // aplicação de cada espaço: parede leva PU-40; teto e forro, cola de contato e
  // espuma. O cliente vê só unidades inteiras vendáveis.
  for (const m of (breakdown.materials ?? [])) {
    if (m.quantity <= 0) continue;
    ensureSpace(doc, 34);
    const y = doc.y;
    const title = materialDisplayName(m);
    const unitLabel = m.unit.charAt(0).toUpperCase() + m.unit.slice(1);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1c1c").text(title, cols.name, y, { width: 268 });
    doc.font("Helvetica").fontSize(7.5).fillColor("#777")
      .text(`Calculado automaticamente para ${applicationReasonLabel(m.reasons).toLowerCase()}`, cols.name, y + 11, { width: 268 });
    doc.font("Helvetica").fontSize(9).fillColor("#1a1c1c")
      .text(String(m.quantity), cols.qty, y, { width: 44, align: "right" })
      .text(unitLabel, cols.unit, y, { width: 44, align: "right" })
      .text(m.unitPrice > 0 ? fmtBRL(m.unitPrice) : "—", cols.price, y, { width: 58, align: "right" })
      .text(m.unitPrice > 0 ? fmtBRL(m.total) : "—", cols.total, y, { width: 53, align: "right" });
    doc.y = y + 26;
    doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor("#eeeeee").stroke();
    doc.y += 6;
  }

  // Totais — coluna direita, linhas sequenciais e alinhadas (label esq / valor dir).
  const sel = breakdown.paymentOptions.find((o) => o.id === paymentId) ?? breakdown.paymentOptions[0];
  const grandTotal = sel?.total ?? breakdown.totalFull;
  ensureSpace(doc, 130);
  doc.y += 6;
  const totLabelX = 330, totValX = 430, totValW = 123;
  const totRow = (label: string, value: string, color = "#333") => {
    const yy = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor(color).text(label, totLabelX, yy, { width: 90 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(color).text(value, totValX, yy, { width: totValW, align: "right" });
    doc.y = yy + 16;
  };
  totRow("Subtotal placas", fmtBRL(breakdown.platesSubtotal));
  if (breakdown.colaAvailable && breakdown.colaSubtotal > 0) totRow("Cola PU", fmtBRL(breakdown.colaSubtotal));
  totRow("Frete", breakdown.frete.free ? "Grátis" : fmtBRL(breakdown.frete.value));
  if (sel?.id === "pix" && sel.discountAmount) totRow(`Desconto à vista (${sel.discountPct}%)`, `- ${fmtBRL(sel.discountAmount)}`, "#3b6934");
  doc.moveTo(totLabelX, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.y += 8;
  const totY = doc.y;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#002045").text("Total", totLabelX, totY, { width: 90 });
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#002045").text(fmtBRL(grandTotal), totValX, totY, { width: totValW, align: "right" });
  doc.y = totY + 18;
  if (sel?.id === "cartao" && sel.installments) {
    doc.font("Helvetica").fontSize(9).fillColor("#555").text(`${sel.installments}x de ${fmtBRL(sel.installmentValue ?? 0)} sem juros`, totLabelX, doc.y, { width: totValX + totValW - totLabelX, align: "right" });
    doc.y += 14;
  }

  // Condição escolhida — volta a coluna para a esquerda (o total ficou à direita).
  doc.x = 42;
  doc.y += 24;
  ensureSpace(doc, 60);
  doc.font("Helvetica").fontSize(12).fillColor("#555").text("Condição de pagamento", 42, doc.y, { width: 511 });
  doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(9.5).fillColor("#1a1c1c").text(
    sel?.id === "pix"
      ? `PIX ou espécie — ${sel.discountPct}% de desconto. Total à vista ${fmtBRL(sel.total)}.`
      : sel
        ? `Cartão de crédito — até ${sel.installments}x de ${fmtBRL(sel.installmentValue ?? 0)} sem juros. Total ${fmtBRL(sel.total)}.`
        : "A combinar.",
    42, doc.y, { width: 511 }
  );

  // Instalação (secundário, nunca item financeiro)
  doc.x = 42;
  doc.y += 18;
  ensureSpace(doc, 80);
  doc.font("Helvetica").fontSize(12).fillColor("#555").text("Instalação", 42, doc.y, { width: 511 });
  doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(8.5).fillColor("#555").text(
    `A Orbital não realiza serviços de instalação, e a mão de obra não está incluída neste orçamento. ` +
    `Caso necessite, o cliente poderá entrar em contato diretamente com a empresa especializada indicada, ` +
    `${INSTALLER.name} (${INSTALLER.phone}). Valores, prazos e disponibilidade são definidos pelo prestador.`,
    42, doc.y, { width: 511, lineGap: 1 }
  );

  // Rodapé — nota inline (sem ensureSpace que empurraria para uma 2ª página).
  doc.moveDown(1.5);
  doc.font("Helvetica").fontSize(8).fillColor("#777").text("*** Não é válido como documento fiscal ***", 42, doc.y, { width: 511, align: "center", lineBreak: false });

  // Numeração — dentro da área imprimível (evita criar página fantasma).
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#777").text(`Página ${i + 1} de ${range.count}`, 42, 788, { width: 511, align: "center", lineBreak: false });
  }

  doc.end();
  return done;
}

// ASCII-safe filename token.
export function quotePdfFilename(formalNumber: string, clientName: string) {
  const s = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `Orcamento_${s(formalNumber)}_Cliente-${s(clientName || "Cliente")}.pdf`;
}
