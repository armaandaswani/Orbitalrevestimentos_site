import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeProductCode, productUrl } from "@/lib/product-link";

export const runtime = "nodejs";

/**
 * GET /api/product-qr/[code]?format=svg|png&size=1024
 *
 * QR Code de um modelo. Público de propósito: o conteúdo é apenas o endereço
 * público do produto, e a página de detalhes também o exibe em "Ver QR Code".
 *
 * Correção de erro em nível Q (25%): estes códigos vão para amostra, expositor e
 * etiqueta — superfícies que sujam, riscam e recebem luz ruim. O nível M
 * economizaria alguns módulos e falharia mais no balcão.
 *
 * O código só é gerado para produto ATIVO e existente: emitir QR de algo que não
 * abre é pior que não emitir.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeProductCode(code);
  if (!normalized) return NextResponse.json({ error: "Código ausente." }, { status: 400 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";
  // Teto de 4096 px: acima disso é papel de parede, não etiqueta, e o buffer
  // cresce sem necessidade.
  const size = Math.min(4096, Math.max(128, Number(url.searchParams.get("size")) || 1024));

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select("code, is_active")
    .ilike("code", normalized)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
  if ((data as { is_active?: boolean }).is_active === false) {
    return NextResponse.json({ error: "Modelo inativo — o QR Code não é gerado." }, { status: 409 });
  }

  const target = productUrl((data as { code: string }).code);

  const opts = {
    errorCorrectionLevel: "Q" as const,
    margin: 2,
    color: { dark: "#002045ff", light: "#ffffffff" },
  };

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(target, { ...opts, type: "svg", width: size });
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          // O conteúdo só muda se o código do produto mudar — e aí a URL muda junto.
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
    const png = await QRCode.toBuffer(target, { ...opts, type: "png", width: size });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao gerar o QR Code." },
      { status: 500 },
    );
  }
}
