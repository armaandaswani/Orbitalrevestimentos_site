import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtBRL(n: number | null) {
  if (n == null) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function escapeCsv(v: string | number | null | undefined): string {
  if (v == null) return "";
  const str = String(v);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("client_email_sequences")
    .select(
      "client_name, client_email, space, model, plates, area_m2, total, partner_name, status, current_step, next_email_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const headers = [
    "Nome",
    "Email",
    "Espaço",
    "Modelo",
    "Placas",
    "Área m²",
    "Total",
    "Parceiro",
    "Status",
    "Passo Atual",
    "Próximo Email",
    "Data de Cadastro",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((r: Record<string, unknown>) =>
      [
        escapeCsv(r.client_name as string),
        escapeCsv(r.client_email as string),
        escapeCsv(r.space as string | null),
        escapeCsv(r.model as string),
        escapeCsv(r.plates as number),
        escapeCsv(r.area_m2 as number | null),
        escapeCsv(fmtBRL(r.total as number | null)),
        escapeCsv(r.partner_name as string),
        escapeCsv(r.status as string),
        escapeCsv(r.current_step as number),
        escapeCsv(fmtDate(r.next_email_at as string | null)),
        escapeCsv(fmtDate(r.created_at as string | null)),
      ].join(",")
    ),
  ];

  const csv = lines.join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-orbital-${date}.csv"`,
    },
  });
}
