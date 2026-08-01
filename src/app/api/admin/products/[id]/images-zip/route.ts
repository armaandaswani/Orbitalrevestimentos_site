import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createZip, safeFileName, type ZipEntry } from "@/lib/zip";

export const runtime = "nodejs";
// As imagens são buscadas no storage a cada chamada — nada a pré-renderizar.
export const dynamic = "force-dynamic";

/** Extensão a partir da URL; sem ela, o arquivo sai sem extensão e ninguém abre. */
function extFromUrl(url: string): string {
  const path = url.split("?")[0];
  const m = path.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? `.${m[1].toLowerCase()}` : ".jpg";
}

/**
 * GET /api/admin/products/[id]/images-zip
 *
 * Baixa TODAS as fotos de um modelo num único .zip. A capa vai primeiro, como
 * "00-capa"; as demais seguem a ordem da galeria, numeradas — assim o pacote
 * chega ao fotógrafo/designer já na ordem em que o site as mostra.
 *
 * Uma foto que falhe ao baixar não derruba o pacote: ela fica de fora e o
 * cabeçalho X-Orbital-Falhas informa quantas, para o painel avisar em vez de
 * entregar um zip silenciosamente incompleto.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("products")
    .select("code, name, image_path, product_images(image_path, sort_order)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const product = data as {
    code: string; name: string; image_path: string | null;
    product_images: Array<{ image_path: string | null; sort_order: number | null }> | null;
  };

  // Capa primeiro; galeria na ordem do painel. Sem duplicar quando a capa também
  // está na galeria — baixar o mesmo arquivo duas vezes só confunde.
  const gallery = [...(product.product_images ?? [])]
    .filter((g) => (g.image_path ?? "").trim())
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // A numeração segue a POSIÇÃO NA GALERIA, igual à que o painel mostra sob cada
  // miniatura — assim "05" no zip é a foto 5 na tela. A capa ganha o sufixo
  // "-capa" na própria posição; só recebe "00" quando não está na galeria.
  const cover = (product.image_path ?? "").trim();
  const urls: Array<{ url: string; label: string }> = [];
  const seen = new Set<string>();

  gallery.forEach((g, i) => {
    const u = (g.image_path ?? "").trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    const pos = String(i + 1).padStart(2, "0");
    urls.push({ url: u, label: u === cover ? `${pos}-capa` : pos });
  });

  if (cover && !seen.has(cover)) {
    seen.add(cover);
    urls.unshift({ url: cover, label: "00-capa" });
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: "Este modelo não tem imagens." }, { status: 404 });
  }

  const base = safeFileName(`${product.code || "modelo"}-${product.name || ""}`, "modelo");

  const results = await Promise.all(urls.map(async ({ url, label }): Promise<ZipEntry | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length === 0) return null;
      // Preserva o nome original do arquivo depois do prefixo de ordem, para o
      // admin reconhecer a foto que já conhece do storage.
      const original = safeFileName(decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? ""), "foto");
      const stripped = original.replace(/^\d{10,}-/, ""); // tira o timestamp do upload
      return { name: `${base}/${label}-${stripped || `foto${extFromUrl(url)}`}`, data: buf };
    } catch {
      return null;
    }
  }));

  const entries = results.filter((e): e is ZipEntry => e !== null);
  const failed = results.length - entries.length;

  if (entries.length === 0) {
    return NextResponse.json({ error: "Nenhuma imagem pôde ser baixada do storage." }, { status: 502 });
  }

  const zip = createZip(entries);

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${base}-fotos.zip"`,
      "Content-Length": String(zip.length),
      "X-Orbital-Total": String(entries.length),
      "X-Orbital-Falhas": String(failed),
      "Cache-Control": "no-store",
    },
  });
}
