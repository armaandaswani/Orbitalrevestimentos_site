import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { breakdownForQuote, formalNumberFor } from "@/lib/orcamento-server";
import { generateQuotePdf, quotePdfFilename, COMPANY, INSTALLER, type QuoteSpace } from "@/lib/orcamento-pdf";
import { normalizePhone, sendText, smclickConfigured } from "@/lib/smclick";
import { getResend } from "@/lib/resend";
import { isMissingColumn } from "@/lib/db-compat";

export const runtime = "nodejs";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function clean(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// POST /api/orcamento/formalize — turn a saved SIMULATION into a FORMALIZED quote:
// persist the delivery address + chosen payment condition, stamp a formal number,
// and send ONE WhatsApp with the PDF link (idempotent). Body:
//   { slug, payment_condition: "pix"|"cartao", address: {...}, freteZoneValue? }
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = clean(body?.slug);
  if (!slug) return NextResponse.json({ error: "Orçamento inválido." }, { status: 400 });

  const addr = (body?.address ?? {}) as Record<string, unknown>;
  const zip = clean(addr.zip);
  const street = clean(addr.street);
  const number = clean(addr.number);
  const city = clean(addr.city);
  if (!street || !number || !city) {
    return NextResponse.json({ error: "Endereço incompleto (rua, número e cidade são obrigatórios)." }, { status: 400 });
  }

  const paymentId = body?.payment_condition === "cartao" ? "cartao" : "pix";
  const freteZoneValue = typeof body?.freteZoneValue === "number" ? (body.freteZoneValue as number) : null;

  const db = supabaseAdmin();
  const { data: quote, error } = await db.from("saved_quotes").select("*").eq("slug", slug).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  const q = quote as Record<string, unknown>;

  // Server-authoritative breakdown (frete confirmed by the CEP zone when known).
  const breakdown = await breakdownForQuote(db, q, freteZoneValue);
  const sel = breakdown.paymentOptions.find((o) => o.id === paymentId) ?? breakdown.paymentOptions[0];
  const total = sel?.total ?? breakdown.totalFull;
  const formalNumber = (q.formal_number as string) || formalNumberFor(slug, q.created_at as string);

  // Idempotency: a completed formalization with a WhatsApp already sent is not
  // re-sent on a duplicate click / refresh / retry. We still return success with
  // the same number + PDF link so the UI is consistent.
  const alreadySent = Boolean(q.whatsapp_sent_at);

  // Persist the formalization (retro-compatible: drop unknown columns if 043 not run).
  const patch: Record<string, unknown> = {
    stage: "formalizado",
    formal_number: formalNumber,
    formalized_at: (q.formalized_at as string) || new Date().toISOString(),
    client_zip: zip, client_address: street, client_number: number,
    client_complement: clean(addr.complement), client_neighborhood: clean(addr.neighborhood),
    client_city: city, client_state: clean(addr.state), client_condo: clean(addr.condo),
    delivery_notes: clean(addr.notes),
    payment_condition: paymentId,
    installments: sel?.id === "cartao" ? sel.installments ?? null : null,
    cola_tubos: breakdown.colaTubos,
    cola_subtotal: breakdown.colaSubtotal,
    frete_amount: breakdown.frete.value,
    frete_free: breakdown.frete.free,
    discount_amount: sel?.id === "pix" ? sel.discountAmount ?? 0 : 0,
    total_amount: total,
  };
  let { error: upErr } = await db.from("saved_quotes").update(patch).eq("slug", slug);
  if (isMissingColumn(upErr)) {
    // 043 not applied yet — persist only the guaranteed-existing client_* columns.
    ({ error: upErr } = await db.from("saved_quotes")
      .update({ client_name: q.client_name, client_email: q.client_email, client_phone: q.client_phone })
      .eq("slug", slug));
  }
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const origin = req.nextUrl.origin;
  const pdfUrl = `${origin}/api/orcamento/${slug}/pdf`;
  const clientName = (q.client_name as string) || "";
  const spaces = (Array.isArray(q.spaces) ? q.spaces : []) as QuoteSpace[];
  const productLabel = spaces.length === 1
    ? [spaces[0].productCode, spaces[0].productName].filter(Boolean).join(" ")
    : `${spaces.length} ambientes`;

  let whatsappOk = alreadySent;
  if (!alreadySent) {
    const phone = normalizePhone((q.client_phone as string) || null);
    if (phone && smclickConfigured()) {
      // ONE objective message — never split across several.
      const message = [
        `Olá, ${clientName || "tudo bem"}. Seu orçamento formalizado da Orbital foi gerado.`,
        `Nº ${formalNumber}`,
        `Produto: ${productLabel}`,
        `Quantidade: ${breakdown.plates} placa${breakdown.plates !== 1 ? "s" : ""}`,
        breakdown.colaAvailable && breakdown.colaTubos > 0 ? `Cola PU: ${breakdown.colaTubos} tubos` : null,
        `Pagamento: ${sel?.id === "pix" ? `PIX/espécie (${sel.discountPct}% de desconto)` : `cartão até ${sel?.installments}x sem juros`}`,
        `Frete: ${breakdown.frete.free ? "grátis" : fmtBRL(breakdown.frete.value)}`,
        `Total: ${fmtBRL(total)}`,
        `Documento completo (PDF): ${pdfUrl}`,
        `A Orbital não realiza instalação. Caso precise, fale diretamente com a empresa especializada indicada (${INSTALLER.name}, ${INSTALLER.phone}).`,
        `Para ajustar medidas, acabamento ou pagamento, responda a esta mensagem.`,
      ].filter(Boolean).join("\n");
      const res = await sendText(phone, message);
      whatsappOk = res.ok;
      if (res.ok) {
        await db.from("saved_quotes").update({ whatsapp_sent_at: new Date().toISOString() }).eq("slug", slug).then(() => {}, () => {});
      }
    }
  }

  // Best-effort e-mail copy with the PDF attached.
  let emailOk = false;
  const email = (q.client_email as string) || "";
  if (!alreadySent && email) {
    try {
      const pdf = await generateQuotePdf({
        formalNumber, createdAt: (q.created_at as string) || new Date().toISOString(),
        validUntil: (q.expires_at as string) || null, clientName: clientName || "Cliente",
        clientEmail: email, clientPhone: (q.client_phone as string) || null, couponCode: (q.coupon_code as string) || null,
        address: { zip, street, number, complement: clean(addr.complement), neighborhood: clean(addr.neighborhood), city, state: clean(addr.state), condo: clean(addr.condo) },
        spaces, breakdown, paymentId,
      });
      const resend = getResend();
      await resend.emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: email, cc: COMPANY.email,
        subject: `Orçamento formalizado nº ${formalNumber} — Orbital`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#1a1c1c">
          <h2 style="margin:0 0 8px;color:#002045">Orçamento formalizado nº ${formalNumber}</h2>
          <p style="line-height:1.6;color:#43474e">Olá, ${clientName || "cliente"}. Segue em anexo o seu orçamento formalizado da Orbital Revestimentos.</p>
          <p style="font-size:18px;color:#002045;font-weight:700">Total: ${fmtBRL(total)}</p>
          <p style="font-size:12px;color:#74777f">Você também pode acessar o PDF por este link: <a href="${pdfUrl}" style="color:#002045">${pdfUrl}</a></p>
          <p style="font-size:12px;color:#74777f;margin-top:24px">A Orbital não realiza instalação. Caso precise, fale com ${INSTALLER.name} (${INSTALLER.phone}).</p>
        </div>`,
        attachments: [{ filename: quotePdfFilename(formalNumber, clientName || "Cliente"), content: pdf.toString("base64") }],
      });
      emailOk = true;
    } catch {
      // e-mail is best-effort; the WhatsApp + PDF link are the primary channel.
    }
  }

  return NextResponse.json({ ok: true, formalNumber, pdfUrl, whatsappOk, emailOk, alreadySent });
}
