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

  // Cliente + endereço
  doc.y = 132;
  doc.font("Helvetica").fontSize(14).fillColor("#555").text("Dados do Cliente");
  doc.moveTo(42, doc.y + 2).lineTo(390, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#1a1c1c").text(clientName || "Cliente");
  doc.font("Helvetica").fontSize(10);
  if (input.clientEmail) doc.text(input.clientEmail);
  if (input.clientPhone) doc.text(input.clientPhone);
  const a = input.address;
  if (a) {
    const l1 = [a.street, a.number].filter(Boolean).join(", ");
    const l2 = [a.complement, a.condo].filter(Boolean).join(" · ");
    const l3 = [a.neighborhood, a.city && a.state ? `${a.city}/${a.state}` : a.city || a.state, a.zip].filter(Boolean).join(" - ");
    for (const line of [l1, l2, l3].filter(Boolean)) doc.text(String(line));
  }

  const metaY = 138;
  doc.font("Helvetica").fontSize(10).fillColor("#333");
  doc.text(`Data: ${fmtDate(input.createdAt)}`, 410, metaY, { width: 140, align: "right" });
  doc.text(`Validade: ${fmtDate(input.validUntil)}`, 410, metaY + 17, { width: 140, align: "right" });
  doc.text(`No.: ${formalNumber}`, 410, metaY + 34, { width: 140, align: "right" });
  if (input.couponCode) doc.text(`Parceiro: ${input.couponCode}`, 410, metaY + 51, { width: 140, align: "right" });

  doc.y = Math.max(doc.y, 216);
  doc.rect(42, doc.y, 511, 22).fill("#002045");
  doc.fillColor("#fff").font("Helvetica").fontSize(14).text(`ORÇAMENTO FORMALIZADO No. ${formalNumber}`, 42, doc.y + 5, { width: 511, align: "center" });
  doc.y += 42;

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

  // Cola PU (item separado)
  if (breakdown.colaAvailable && breakdown.colaTubos > 0) {
    ensureSpace(doc, 34);
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1a1c1c").text("Cola PU recomendada", cols.name, y, { width: 268 });
    doc.font("Helvetica").fontSize(7.5).fillColor("#777").text("~1,5 tubo por placa — fixação segura no clima de Manaus", cols.name, y + 11, { width: 268 });
    doc.font("Helvetica").fontSize(9).fillColor("#1a1c1c")
      .text(String(breakdown.colaTubos), cols.qty, y, { width: 44, align: "right" })
      .text("Tubo", cols.unit, y, { width: 44, align: "right" })
      .text(fmtBRL(breakdown.colaUnitPrice), cols.price, y, { width: 58, align: "right" })
      .text(fmtBRL(breakdown.colaSubtotal), cols.total, y, { width: 53, align: "right" });
    doc.y = y + 26;
    doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor("#eeeeee").stroke();
    doc.y += 6;
  }

  // Totais
  const sel = breakdown.paymentOptions.find((o) => o.id === paymentId) ?? breakdown.paymentOptions[0];
  const grandTotal = sel?.total ?? breakdown.totalFull;
  ensureSpace(doc, 140);
  doc.x = 360;
  doc.font("Helvetica").fontSize(10).fillColor("#333");
  doc.text("Subtotal placas", 340, doc.y, { width: 100 });
  doc.font("Helvetica-Bold").text(fmtBRL(breakdown.platesSubtotal), 450, doc.y - 12, { width: 103, align: "right" });
  if (breakdown.colaAvailable && breakdown.colaSubtotal > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica").text("Cola PU", 340, doc.y, { width: 100 });
    doc.font("Helvetica-Bold").text(fmtBRL(breakdown.colaSubtotal), 450, doc.y - 12, { width: 103, align: "right" });
  }
  doc.moveDown(0.5);
  doc.font("Helvetica").text("Frete", 340, doc.y, { width: 100 });
  doc.font("Helvetica-Bold").text(breakdown.frete.free ? "Grátis" : fmtBRL(breakdown.frete.value), 450, doc.y - 12, { width: 103, align: "right" });
  if (sel?.id === "pix" && sel.discountAmount) {
    doc.moveDown(0.5);
    doc.font("Helvetica").fillColor("#3b6934").text(`Desconto à vista (${sel.discountPct}%)`, 340, doc.y, { width: 100 });
    doc.font("Helvetica-Bold").fillColor("#3b6934").text(`- ${fmtBRL(sel.discountAmount)}`, 450, doc.y - 12, { width: 103, align: "right" });
    doc.fillColor("#333");
  }
  doc.moveDown(0.8);
  doc.moveTo(340, doc.y).lineTo(553, doc.y).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#002045").text("Total", 340, doc.y, { width: 100 });
  doc.text(fmtBRL(grandTotal), 450, doc.y - 16, { width: 103, align: "right" });
  if (sel?.id === "cartao" && sel.installments) {
    doc.font("Helvetica").fontSize(9).fillColor("#555").text(`${sel.installments}x de ${fmtBRL(sel.installmentValue ?? 0)} sem juros`, 340, doc.y + 2, { width: 213, align: "right" });
  }

  // Condição escolhida
  ensureSpace(doc, 60);
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(12).fillColor("#555").text("Condição de pagamento");
  doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(9.5).fillColor("#1a1c1c").text(
    sel?.id === "pix"
      ? `PIX ou espécie — ${sel.discountPct}% de desconto. Total à vista ${fmtBRL(sel.total)}.`
      : sel
        ? `Cartão de crédito — até ${sel.installments}x de ${fmtBRL(sel.installmentValue ?? 0)} sem juros. Total ${fmtBRL(sel.total)}.`
        : "A combinar.",
    { width: 511 }
  );

  // Instalação (secundário, nunca item financeiro)
  ensureSpace(doc, 80);
  doc.moveDown(1.2);
  doc.font("Helvetica").fontSize(12).fillColor("#555").text("Instalação");
  doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(8.5).fillColor("#555").text(
    `A Orbital não realiza serviços de instalação, e a mão de obra não está incluída neste orçamento. ` +
    `Caso necessite, o cliente poderá entrar em contato diretamente com a empresa especializada indicada, ` +
    `${INSTALLER.name} (${INSTALLER.phone}). Valores, prazos e disponibilidade são definidos pelo prestador.`,
    { width: 511, lineGap: 1 }
  );

  // Rodapé
  ensureSpace(doc, 60);
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(8).fillColor("#777").text("*** Não é válido como documento fiscal ***", 42, doc.y, { width: 511, align: "center" });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#777").text(`Página ${i + 1} de ${range.count}`, 42, 810, { width: 511, align: "center" });
  }

  doc.end();
  return done;
}

// ASCII-safe filename token.
export function quotePdfFilename(formalNumber: string, clientName: string) {
  const s = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `Orcamento_${s(formalNumber)}_Cliente-${s(clientName || "Cliente")}.pdf`;
}
