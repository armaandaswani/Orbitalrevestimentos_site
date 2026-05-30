/*
 * Weekly Open Budgets Reminder Cron
 * Schedule: Every Wednesday at 13:00 UTC (9:00 Manaus)
 * For each partner with open (non-concluded, non-cancelled) budgets,
 * sends a reminder email listing those budgets so they can follow up.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();

  // Fetch all open coupon_uses (not concluded, not cancelled)
  const { data: openUses, error } = await db
    .from("coupon_uses")
    .select(`
      id, coupon_code, created_at, product_name, space, plates, area_m2,
      material_discounted, material_total, architect_name, sale_status,
      partner_id,
      partners!inner ( id, name, email )
    `)
    .not("sale_status", "eq", "concluido")
    .not("sale_status", "eq", "cancelado")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type UseRow = {
    id: string;
    coupon_code: string;
    created_at: string;
    product_name: string | null;
    space: string | null;
    plates: number | null;
    area_m2: number | null;
    material_discounted: number | null;
    material_total: number | null;
    architect_name: string | null;
    sale_status: string | null;
    partner_id: string | null;
    partners: { id: string; name: string; email: string | null } | null;
  };

  const rows = (openUses ?? []) as unknown as UseRow[];

  if (rows.length === 0) {
    return NextResponse.json({ success: true, message: "No open budgets." });
  }

  // Fetch client emails from client_email_sequences
  const useIds = rows.map((r) => r.id);
  const { data: sequences } = await db
    .from("client_email_sequences")
    .select("coupon_use_id, client_name, client_email")
    .in("coupon_use_id", useIds);

  const clientByUseId: Record<string, { name: string; email: string }> = {};
  for (const seq of sequences ?? []) {
    const s = seq as { coupon_use_id: string; client_name: string; client_email: string };
    if (s.coupon_use_id) {
      clientByUseId[s.coupon_use_id] = { name: s.client_name, email: s.client_email };
    }
  }

  // Group by partner
  const byPartner = new Map<string, { partner: { id: string; name: string; email: string | null }; uses: UseRow[] }>();
  for (const row of rows) {
    const p = row.partners as { id: string; name: string; email: string | null } | null;
    if (!p || !p.email) continue; // skip partners without email
    if (!byPartner.has(p.id)) {
      byPartner.set(p.id, { partner: p, uses: [] });
    }
    byPartner.get(p.id)!.uses.push(row);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://orbitalrevestimentos.com.br";
  const resend = getResend();
  let emailsSent = 0;

  for (const { partner, uses } of byPartner.values()) {
    const statusLabel = (s: string | null) => {
      if (s === "em_contato") return "Em contato";
      if (s === "visita_agendada") return "Visita agendada";
      if (s === "proposta_enviada") return "Proposta enviada";
      return "Pendente";
    };

    const rowsHtml = uses.map((u) => {
      const client = clientByUseId[u.id];
      const clientName = client?.name ?? u.architect_name ?? "—";
      const clientEmail = client?.email ?? "—";
      const value = u.material_discounted ?? u.material_total ?? 0;
      return `
        <tr style="border-bottom:1px solid #f0efec;">
          <td style="padding:10px 12px;font-size:12px;color:#002045;font-weight:600;font-family:Arial,sans-serif;">${clientName}</td>
          <td style="padding:10px 12px;font-size:12px;color:#43474e;font-family:Arial,sans-serif;"><a href="mailto:${clientEmail}" style="color:#002045;">${clientEmail}</a></td>
          <td style="padding:10px 12px;font-size:12px;color:#43474e;font-family:Arial,sans-serif;">${u.product_name ?? "—"}</td>
          <td style="padding:10px 12px;font-size:12px;font-weight:700;color:#002045;font-family:Georgia,serif;">${value ? fmtBRL(value) : "—"}</td>
          <td style="padding:10px 12px;font-size:11px;color:#74777f;font-family:Arial,sans-serif;">${fmtDate(u.created_at)}</td>
          <td style="padding:10px 12px;">
            <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:Arial,sans-serif;">${statusLabel(u.sale_status)}</span>
          </td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px 0;">
    <table cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
      <tr><td style="background:#002045;padding:28px 32px;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#86a0cd;font-family:Arial,sans-serif;">Lembrete Semanal</p>
        <p style="margin:0;font-size:22px;color:#ffffff;font-family:Georgia,serif;font-weight:400;">Você tem ${uses.length} orçamento${uses.length > 1 ? "s" : ""} em aberto</p>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e2e2e2;border-top:0;padding:24px 32px;">
        <p style="margin:0 0 20px;font-size:14px;color:#43474e;font-family:Arial,sans-serif;">Olá, <strong>${partner.name}</strong> — estes orçamentos ainda estão em aberto. Entre em contato com os clientes para garantir que os projetos avancem.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #e2e2e2;background:#fafafa;">
              ${["Cliente","E-mail","Produto","Valor","Data","Status"].map(h => `<th style="text-align:left;padding:8px 12px;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#74777f;font-weight:700;font-family:Arial,sans-serif;white-space:nowrap;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </td></tr>
      <tr><td style="background:#f0efec;border:1px solid #e2e2e2;border-top:0;padding:20px 32px;text-align:center;">
        <a href="${siteUrl}/parceiro" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:10px 24px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">Ver meu portal →</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    try {
      await resend.emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: partner.email!,
        subject: `📋 ${uses.length} orçamento${uses.length > 1 ? "s" : ""} em aberto — lembrete semanal`,
        html,
      });
      emailsSent++;
    } catch (err) {
      console.error(`Failed to send open-budget reminder to ${partner.email}:`, err);
    }
  }

  return NextResponse.json({ success: true, emailsSent, openBudgets: rows.length });
}
