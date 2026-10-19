import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { linkCadastroWhatsapp, linkConvite, novoTokenConvite } from "@/lib/partner-invite";

/**
 * POST /api/admin/parceiros/[id]/link-cadastro — gera (ou renova) o link para
 * o parceiro com cadastro pendente completar e-mail, aniversário e senha.
 * Link novo invalida o anterior. Parceiro que já criou senha não precisa.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: p, error } = await db.from("partners").select("id, name, status, portal_password").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!p) return NextResponse.json({ error: "Parceiro não encontrado." }, { status: 404 });
  if (p.portal_password) {
    return NextResponse.json({ error: `${p.name} já completou o cadastro e acessa o portal com a própria senha.` }, { status: 409 });
  }
  if (p.status === "inactive") return NextResponse.json({ error: "Parceiro inativo." }, { status: 409 });

  const { token, expiresAt } = novoTokenConvite();
  const { error: upd } = await db.from("partners").update({ reset_token: token, reset_token_expires_at: expiresAt }).eq("id", id);
  if (upd) return NextResponse.json({ error: upd.message }, { status: 500 });

  const link = linkConvite(token);
  return NextResponse.json({ link, whatsapp_text: linkCadastroWhatsapp(p.name as string, link) });
}
