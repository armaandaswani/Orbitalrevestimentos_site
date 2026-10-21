import { NextRequest, NextResponse } from "next/server";

/**
 * Short link to a quote sheet, for WhatsApp alerts: /o/<pedido id without dashes>.
 * WhatsApp reads a raw UUID inside a link as a Pix key ("Pix key copied") and the link stops opening,
 * so the assistant sends the id without dashes and this route rebuilds it. Only a redirect: the sheet
 * itself stays behind the admin login.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const hex = code.toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return NextResponse.redirect(new URL("/admin", req.url));
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return NextResponse.redirect(new URL(`/admin/pedidos/${id}/documento?tipo=orcamento`, req.url));
}
