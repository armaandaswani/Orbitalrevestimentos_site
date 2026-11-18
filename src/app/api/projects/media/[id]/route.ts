import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
function checkAuth(req: NextRequest) {
  return isAdminRequest(req);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const sb = supabaseAdmin();
  // A capa sempre aparece: não se oculta, e a foto oculta que vira capa volta.
  if (body.is_hidden === true || body.is_cover === true) {
    const { data: atual } = await sb.from("project_media").select("*").eq("id", id).single();
    if (body.is_hidden === true && atual?.is_cover) {
      return NextResponse.json({ error: "A capa não pode ser ocultada. Escolha outra capa antes." }, { status: 409 });
    }
    if (body.is_cover === true && atual?.is_hidden) body.is_hidden = false;
  }
  const { data, error } = await sb.from("project_media").update(body).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // A foto "antes" antiga vai no HTML de /projetos e dos showrooms (5 min).
  if ("is_hidden" in body) revalidatePath("/projetos", "layout");
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = supabaseAdmin();
  const { error } = await sb.from("project_media").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
