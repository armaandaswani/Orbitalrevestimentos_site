import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { breakdownForQuote, formalNumberFor } from "@/lib/orcamento-server";
import { generateQuotePdf, quotePdfFilename, type QuoteSpace } from "@/lib/orcamento-pdf";

export const runtime = "nodejs";

// GET /api/orcamento/[slug]/pdf — the formal quote PDF, regenerated on demand.
// Access is gated by the unguessable slug (no sequential ids), so a client can
// open their own document but never enumerate others'. Always reflects the
// latest saved values (regenerated, never a stale file).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin();
  const { data: quote, error } = await db.from("saved_quotes").select("*").eq("slug", slug).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

  const q = quote as Record<string, unknown>;
  const freteZone = typeof q.frete_amount === "number" && !q.frete_free ? (q.frete_amount as number) : null;
  const breakdown = await breakdownForQuote(db, q, freteZone);
  const formalNumber = (q.formal_number as string) || formalNumberFor(slug, q.created_at as string);
  const paymentId = q.payment_condition === "cartao" ? "cartao" : "pix";
  const spaces = (Array.isArray(q.spaces) ? q.spaces : []) as QuoteSpace[];

  const pdf = await generateQuotePdf({
    formalNumber,
    createdAt: (q.created_at as string) || new Date().toISOString(),
    validUntil: (q.expires_at as string) || null,
    clientName: (q.client_name as string) || "Cliente",
    clientEmail: (q.client_email as string) || null,
    clientPhone: (q.client_phone as string) || null,
    couponCode: (q.coupon_code as string) || null,
    address: {
      zip: q.client_zip as string, street: q.client_address as string, number: q.client_number as string,
      complement: q.client_complement as string, neighborhood: q.client_neighborhood as string,
      city: q.client_city as string, state: q.client_state as string, condo: q.client_condo as string,
    },
    spaces,
    breakdown,
    paymentId,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotePdfFilename(formalNumber, (q.client_name as string) || "Cliente")}"`,
      "Cache-Control": "no-store",
    },
  });
}
