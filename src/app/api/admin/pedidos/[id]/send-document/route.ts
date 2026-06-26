import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import path from "path";
import { isAdminRequest } from "@/lib/admin-auth";
import { getResend } from "@/lib/resend";
import { normalizePhone, sendText, smclickConfigured } from "@/lib/smclick";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type DocumentType = "orcamento" | "pedido" | "nota" | "recibo";
type Channel = "email" | "whatsapp";

const DOC_LABEL: Record<DocumentType, string> = {
  orcamento: "Orçamento",
  pedido: "Pedido de Venda",
  nota: "Nota de Venda",
  recibo: "Recibo",
};

const COMPANY = {
  name: "Orbital Materiais de Construção LTDA",
  cnpj: "58.013.651/0001-04",
  address: "Avenida Visconde de Porto Alegre, 130, Sala 1 - Centro",
  city: "69010-125 - Manaus/AM",
  email: "orbitalrevestimentos@gmail.com",
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

function docNumber(pedido: Record<string, unknown>) {
  const createdAt = typeof pedido.created_at === "string" ? pedido.created_at : new Date().toISOString();
  const year = new Date(createdAt).getFullYear().toString().slice(-2);
  return `${String(pedido.id).slice(0, 8).toUpperCase()}-${year}`;
}

function cleanDocType(v: unknown): DocumentType {
  return v === "pedido" || v === "nota" || v === "recibo" ? v : "orcamento";
}

function wrapText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, options: PDFKit.Mixins.TextOptions = {}) {
  doc.text(text, x, y, options);
  return doc.y;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed = 80) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

async function fetchPedido(id: string) {
  const db = supabaseAdmin();
  const { data: pedido, error } = await db.from("pedidos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!pedido) throw new Error("Pedido não encontrado.");

  let items: Array<Record<string, unknown>> = [];
  try {
    const { data } = await db
      .from("pedido_items")
      .select("id, product_id, product_name, plates, unit_price, unit_label")
      .eq("pedido_id", id);
    items = (data ?? []) as Array<Record<string, unknown>>;
  } catch {
    items = [];
  }

  const productIds = items.map((it) => it.product_id).filter(Boolean) as string[];
  if (productIds.length > 0) {
    try {
      const { data: products } = await db
        .from("products")
        .select("id, description, image_path, product_images(image_path, sort_order)")
        .in("id", productIds);
      const byId = new Map((products ?? []).map((p) => [p.id as string, p as Record<string, unknown>]));
      items = items.map((it) => {
        const product = it.product_id ? byId.get(it.product_id as string) : null;
        const images = (product?.product_images as Array<{ image_path?: string; sort_order?: number }> | undefined) ?? [];
        const sorted = images.filter((img) => img.image_path).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return {
          ...it,
          product_description: product?.description ?? null,
          product_image_path: sorted[0]?.image_path ?? product?.image_path ?? null,
        };
      });
    } catch {
      // Product enrichment is optional.
    }
  }

  if (items.length === 0) {
    items = [{
      id: "fallback",
      product_name: [pedido.space, pedido.product_name].filter(Boolean).join(" - ") || "Produto Orbital",
      plates: 1,
      unit_price: Number(pedido.total) || 0,
      unit_label: "un",
    }];
  }

  return { pedido: pedido as Record<string, unknown>, items };
}

function maybeLocalImage(imagePath: unknown) {
  if (typeof imagePath !== "string" || !imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return null;
  const clean = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  const local = path.join(process.cwd(), "public", clean);
  return existsSync(local) ? local : null;
}

async function generatePedidoPdf(input: {
  pedido: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  docType: DocumentType;
  includeImages: boolean;
  includeDescriptions: boolean;
}) {
  const { pedido, items, docType, includeImages, includeDescriptions } = input;
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const num = docNumber(pedido);
  const label = DOC_LABEL[docType];
  const logoPath = path.join(process.cwd(), "public/images/logo.png");

  if (existsSync(logoPath)) doc.image(logoPath, 42, 42, { width: 58 });
  doc.font("Helvetica-Bold").fontSize(14).text(COMPANY.name, 118, 44);
  doc.font("Helvetica").fontSize(10)
    .text(COMPANY.cnpj, 118)
    .text(COMPANY.address, 118)
    .text(COMPANY.city, 118);
  doc.text(COMPANY.email, 385, 48, { align: "right", width: 165 });

  doc.moveTo(42, 118).lineTo(553, 118).strokeColor("#d8d8d8").stroke();
  doc.y = 132;
  doc.font("Helvetica").fontSize(14).fillColor("#555").text("Dados do Cliente");
  doc.moveTo(42, doc.y + 2).lineTo(390, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#1a1c1c").text(String(pedido.client_name ?? "Cliente"));
  doc.font("Helvetica").fontSize(10);
  if (pedido.client_email) doc.text(String(pedido.client_email));
  if (pedido.client_phone) doc.text(String(pedido.client_phone));
  for (const line of [
    pedido.client_address,
    pedido.client_address_complement,
    [pedido.client_zip, pedido.client_city, pedido.client_state].filter(Boolean).join(" - "),
  ].filter(Boolean)) doc.text(String(line));

  const metaY = 138;
  doc.font("Helvetica").fontSize(10).fillColor("#333");
  doc.text(`Data: ${fmtDate(pedido.created_at as string)}`, 410, metaY, { width: 140, align: "right" });
  if (docType === "orcamento") doc.text(`Validade: ${fmtDate(pedido.quote_valid_until as string | null)}`, 410, metaY + 17, { width: 140, align: "right" });
  doc.text(`No.: ${num}`, 410, metaY + 34, { width: 140, align: "right" });

  doc.y = Math.max(doc.y, 216);
  doc.rect(42, doc.y, 511, 22).fill("#8d8d8d");
  doc.fillColor("#fff").font("Helvetica").fontSize(14).text(`${label.toUpperCase()} No. ${num}`, 42, doc.y + 5, { width: 511, align: "center" });
  doc.y += 42;

  doc.fillColor("#555").fontSize(14).text("Produtos");
  doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.5);
  const tableTop = doc.y;
  const cols = { name: 42, qty: 318, unit: 382, price: 430, total: 500 };
  doc.rect(42, tableTop, 511, 20).fill("#e1e1e1");
  doc.fillColor("#1a1c1c").font("Helvetica").fontSize(9)
    .text("Nome", cols.name, tableTop + 6)
    .text("Qtd.", cols.qty, tableTop + 6, { width: 44, align: "right" })
    .text("Un.", cols.unit, tableTop + 6, { width: 32, align: "right" })
    .text("Vlr. unit.", cols.price, tableTop + 6, { width: 58, align: "right" })
    .text("Total", cols.total, tableTop + 6, { width: 53, align: "right" });
  doc.y = tableTop + 26;

  let subtotal = 0;
  for (const item of items) {
    ensureSpace(doc, includeImages || includeDescriptions ? 96 : 26);
    const y = doc.y;
    const qty = Number(item.plates) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const lineTotal = qty * unitPrice;
    subtotal += lineTotal;
    doc.font("Helvetica").fontSize(9).fillColor("#1a1c1c")
      .text(String(item.product_name ?? "Produto Orbital"), cols.name, y, { width: 260 })
      .text(String(qty), cols.qty, y, { width: 44, align: "right" })
      .text(String(item.unit_label ?? "un"), cols.unit, y, { width: 32, align: "right" })
      .text(fmtBRL(unitPrice), cols.price, y, { width: 58, align: "right" })
      .text(fmtBRL(lineTotal), cols.total, y, { width: 53, align: "right" });
    doc.y = y + 18;

    const localImage = includeImages ? maybeLocalImage(item.product_image_path) : null;
    if (localImage || (includeDescriptions && item.product_description)) {
      ensureSpace(doc, 92);
      const detailY = doc.y + 2;
      if (localImage) doc.image(localImage, 52, detailY, { width: 58, height: 58 });
      if (includeDescriptions && item.product_description) {
        wrapText(doc, String(item.product_description), localImage ? 120 : 52, detailY, { width: localImage ? 405 : 470, lineGap: 1 });
      }
      doc.y = Math.max(doc.y, detailY + (localImage ? 66 : 22));
    }
    doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor("#eeeeee").stroke();
    doc.y += 6;
  }

  const discount = Number(pedido.discount_amount) || 0;
  const freight = Number(pedido.freight_amount) || 0;
  const total = Number(pedido.total) || Math.max(0, subtotal - discount + freight);
  ensureSpace(doc, 104);
  doc.x = 360;
  doc.font("Helvetica").fontSize(10).fillColor("#333");
  doc.text("Subtotal", 360, doc.y, { width: 80 });
  doc.font("Helvetica-Bold").text(fmtBRL(subtotal || total + discount - freight), 450, doc.y - 12, { width: 103, align: "right" });
  if (discount > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica").text("Desconto", 360, doc.y, { width: 80 });
    doc.font("Helvetica-Bold").text(`- ${fmtBRL(discount)}`, 450, doc.y - 12, { width: 103, align: "right" });
  }
  if (freight > 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica").text("Frete/desp.", 360, doc.y, { width: 80 });
    doc.font("Helvetica-Bold").text(fmtBRL(freight), 450, doc.y - 12, { width: 103, align: "right" });
  }
  doc.moveDown(0.8);
  doc.moveTo(360, doc.y).lineTo(553, doc.y).strokeColor("#d8d8d8").stroke();
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(13).text("Total", 360, doc.y, { width: 80 });
  doc.text(fmtBRL(total), 450, doc.y - 16, { width: 103, align: "right" });

  ensureSpace(doc, 92);
  doc.moveDown(2);
  const commercialY = doc.y;
  const blockWidth = 160;
  const blocks = [
    ["Formas de pagamento", Array.isArray(pedido.payment_methods) && pedido.payment_methods.length ? pedido.payment_methods.join(", ") : "Pix"],
    ["Condições de pagamento", String(pedido.payment_terms ?? "PIX ou dinheiro à vista")],
    ["Garantia", String(pedido.warranty_terms ?? "Garantia legal conforme Código de Defesa do Consumidor.")],
  ];
  blocks.forEach(([title, value], i) => {
    const x = 42 + i * 170;
    doc.font("Helvetica").fontSize(12).fillColor("#555").text(title, x, commercialY, { width: blockWidth });
    doc.moveTo(x, commercialY + 16).lineTo(x + blockWidth, commercialY + 16).strokeColor("#d8d8d8").stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#1a1c1c").text(value, x, commercialY + 22, { width: blockWidth });
  });
  doc.y = commercialY + 72;

  const notes = String(pedido.document_notes ?? "").trim();
  if (notes) {
    ensureSpace(doc, 120);
    doc.font("Helvetica").fontSize(12).fillColor("#555").text("Condições");
    doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor("#d8d8d8").stroke();
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(8.5).fillColor("#555").text(notes, { width: 511, lineGap: 1 });
  }

  ensureSpace(doc, 90);
  doc.moveDown(3);
  const sigY = doc.y;
  doc.moveTo(110, sigY).lineTo(250, sigY).strokeColor("#aaaaaa").stroke();
  doc.moveTo(345, sigY).lineTo(485, sigY).strokeColor("#aaaaaa").stroke();
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#333").text(COMPANY.name, 70, sigY + 8, { width: 220, align: "center" });
  doc.font("Helvetica").text(String(pedido.client_name ?? "Cliente"), 305, sigY + 8, { width: 220, align: "center" });
  doc.font("Helvetica").fontSize(8).fillColor("#777").text("*** Não é válido como documento fiscal ***", 42, sigY + 38, { width: 511, align: "center" });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(8).fillColor("#777").text(`Página ${i + 1} de ${range.count}`, 42, 810, { width: 511, align: "center" });
  }

  doc.end();
  return done;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const channel = body?.channel === "whatsapp" ? "whatsapp" : body?.channel === "email" ? "email" : null;
  if (!channel) return NextResponse.json({ error: "Canal inválido." }, { status: 400 });

  const docType = cleanDocType(body?.tipo);
  const includeImages = body?.include_images === true;
  const includeDescriptions = body?.include_descriptions === true;
  const documentUrl = typeof body?.document_url === "string" ? body.document_url : null;

  try {
    const { pedido, items } = await fetchPedido(id);
    const label = DOC_LABEL[docType];
    const number = docNumber(pedido);
    const total = Number(pedido.total) || 0;

    if (channel === "email") {
      const to = typeof pedido.client_email === "string" ? pedido.client_email : "";
      if (!to) return NextResponse.json({ error: "Pedido sem e-mail do cliente." }, { status: 400 });
      const pdf = await generatePedidoPdf({ pedido, items, docType, includeImages, includeDescriptions });
      const resend = getResend();
      await resend.emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to,
        cc: COMPANY.email,
        subject: `${label} Orbital ${number}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#1a1c1c">
            <h2 style="margin:0 0 8px;color:#002045">${label} Orbital</h2>
            <p style="line-height:1.6;color:#43474e">Olá, ${pedido.client_name ?? "cliente"}. Segue em anexo o ${label.toLowerCase()} formal da Orbital Revestimentos.</p>
            <p style="font-size:18px;color:#002045;font-weight:700">Total: ${fmtBRL(total)}</p>
            ${documentUrl ? `<p style="font-size:12px;color:#74777f">Documento revisado internamente: <a href="${documentUrl}" style="color:#002045">${documentUrl}</a></p>` : ""}
            <p style="font-size:12px;color:#74777f;margin-top:24px">Orbital Revestimentos · Manaus, AM</p>
          </div>
        `,
        attachments: [{
          filename: `${label.toLowerCase().replace(/\s+/g, "-")}-${number}.pdf`,
          content: pdf.toString("base64"),
        }],
      });
      return NextResponse.json({ ok: true });
    }

    const phone = normalizePhone(typeof pedido.client_phone === "string" ? pedido.client_phone : null);
    if (!phone) return NextResponse.json({ error: "Pedido sem WhatsApp válido." }, { status: 400 });
    if (!smclickConfigured()) return NextResponse.json({ error: "SM Click não configurado." }, { status: 400 });
    const message = [
      `Olá, ${pedido.client_name ?? ""}!`,
      `Segue o resumo do seu ${label.toLowerCase()} Orbital ${number}.`,
      `Total: ${fmtBRL(total)}.`,
      documentUrl ? `Documento revisado: ${documentUrl}` : null,
      `Também podemos enviar o PDF formal por e-mail.`,
    ].filter(Boolean).join("\n\n");
    const res = await sendText(phone, message);
    if (!res.ok) return NextResponse.json({ error: res.error || "Falha ao enviar WhatsApp." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao enviar documento." }, { status: 500 });
  }
}
