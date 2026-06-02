import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();
  const now = new Date();

  // Last month range
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1).toISOString();
  const lastMonthEnd = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const lastMonthName = MONTHS_PT[lastMonthDate.getMonth()];
  const thisMonthName = MONTHS_PT[now.getMonth()];

  const [{ data: sales }, { data: partners }] = await Promise.all([
    db.from("coupon_uses").select("coupon_code, material_discounted, commission_owed, sales_rep_commission_owed").eq("sale_status", "concluido").gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd),
    db.from("partners").select("id, name, coupon_code, email, phone, birthday").eq("status", "active"),
  ]);

  const allSales = sales || [];
  const allPartners = partners || [];

  // Rankings
  const byCode: Record<string, { total: number; count: number; values: number[] }> = {};
  let totalValue = 0, totalCommission = 0, totalRepCommission = 0;

  for (const s of allSales) {
    if (!s.coupon_code) continue;
    if (!byCode[s.coupon_code]) byCode[s.coupon_code] = { total: 0, count: 0, values: [] };
    const val = s.material_discounted || 0;
    byCode[s.coupon_code].total += val;
    byCode[s.coupon_code].count++;
    if (val > 0) byCode[s.coupon_code].values.push(val);
    totalValue += val;
    totalCommission += s.commission_owed || 0;
    totalRepCommission += s.sales_rep_commission_owed || 0;
  }

  function getPartnerName(code: string) {
    return allPartners.find((p: { coupon_code: string }) => p.coupon_code === code)?.name || code;
  }

  function medianOf(arr: number[]) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  const topByValue = Object.entries(byCode).sort(([,a],[,b]) => b.total - a.total).slice(0, 5);
  const topByCount = Object.entries(byCode).sort(([,a],[,b]) => b.count - a.count).slice(0, 5);

  // Birthdays this month
  const thisMonth = now.getMonth() + 1;
  const birthdaysThisMonth = allPartners
    .filter((p: { birthday: string | null }) => p.birthday && new Date(p.birthday).getUTCMonth() + 1 === thisMonth)
    .sort((a: { birthday: string }, b: { birthday: string }) => new Date(a.birthday).getUTCDate() - new Date(b.birthday).getUTCDate());

  const { getResend } = await import("@/lib/resend");
  const resend = getResend();
  const adminEmail = "armaandaswani19@gmail.com";

  const topValueRows = topByValue.map(([code, s], i) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#002045">${i + 1}°</td><td style="padding:8px;border-bottom:1px solid #eee">${getPartnerName(code)}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;text-align:right">${fmt(s.total)}</td></tr>`
  ).join("") || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#74777f">Nenhuma venda</td></tr>';

  const topCountRows = topByCount.map(([code, s], i) =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#002045">${i + 1}°</td><td style="padding:8px;border-bottom:1px solid #eee">${getPartnerName(code)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${s.count}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(medianOf(s.values))}</td></tr>`
  ).join("") || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#74777f">Nenhuma venda</td></tr>';

  const bdayRows = birthdaysThisMonth.map((p: { birthday: string; name: string; email: string | null; phone: string | null }) => {
    const d = new Date(p.birthday);
    const age = new Date().getFullYear() - d.getUTCFullYear();
    return `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#002045">${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}</td><td style="padding:8px;border-bottom:1px solid #eee">${p.name}</td><td style="padding:8px;border-bottom:1px solid #eee;color:#002045;font-weight:600">${age} anos</td><td style="padding:8px;border-bottom:1px solid #eee;color:#555">${p.email || "—"}</td><td style="padding:8px;border-bottom:1px solid #eee;color:#555">${p.phone || "—"}</td></tr>`;
  }).join("") || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#74777f">Nenhum aniversariante</td></tr>';

  // Send monthly summary
  await resend.emails.send({
    from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
    to: adminEmail,
    subject: `Orbital — Resumo de ${lastMonthName} ${lastMonthDate.getFullYear()}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
      <h2 style="font-size:22px;margin-bottom:4px;color:#002045">Resumo de ${lastMonthName} ${lastMonthDate.getFullYear()}</h2>
      <p style="color:#555;margin-bottom:24px;font-size:14px">Desempenho da rede de parceiros no mês passado.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px">
        ${[["Total vendido",fmt(totalValue)],["Com. parceiros",fmt(totalCommission)],["Com. representantes",fmt(totalRepCommission)],["Vendas",String(allSales.length)]].map(([l,v]) =>
          `<div style="background:#f5f5f3;border:1px solid #e2e2e2;padding:14px 18px;flex:1;min-width:130px"><p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#74777f">${l}</p><p style="margin:0;font-size:22px;font-weight:bold;color:#002045">${v}</p></div>`
        ).join("")}
      </div>
      <h3 style="font-size:15px;margin-bottom:8px;color:#002045">Ranking por valor total</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#f5f5f3"><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">#</th><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">Parceiro</th><th style="padding:8px;text-align:right;font-size:10px;text-transform:uppercase;color:#74777f">Total</th></tr></thead><tbody>${topValueRows}</tbody></table>
      <h3 style="font-size:15px;margin-bottom:8px;color:#002045">Ranking por volume (ticket médio)</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px"><thead><tr style="background:#f5f5f3"><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">#</th><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">Parceiro</th><th style="padding:8px;text-align:center;font-size:10px;text-transform:uppercase;color:#74777f">Usos</th><th style="padding:8px;text-align:right;font-size:10px;text-transform:uppercase;color:#74777f">Ticket médio</th></tr></thead><tbody>${topCountRows}</tbody></table>
      <a href="https://orbitalrevestimentos.com.br/admin" style="display:inline-block;background:#002045;color:#fff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600">Ver painel admin</a>
      <p style="color:#888;font-size:12px;margin-top:32px">Orbital Revestimentos · Sistema automático</p>
    </div>`,
  });

  // Send birthdays this month
  await resend.emails.send({
    from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
    to: adminEmail,
    subject: `Orbital — Aniversariantes de ${thisMonthName}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
      <h2 style="font-size:22px;margin-bottom:4px;color:#002045">🎂 Aniversariantes de ${thisMonthName}</h2>
      <p style="color:#555;margin-bottom:20px;font-size:14px">${birthdaysThisMonth.length} parceiro${birthdaysThisMonth.length !== 1 ? "s fazem" : " faz"} aniversário este mês.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px"><thead><tr style="background:#f5f5f3"><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">Data</th><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">Nome</th><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">Idade</th><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">Email</th><th style="padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#74777f">Telefone</th></tr></thead><tbody>${bdayRows}</tbody></table>
      <p style="color:#888;font-size:12px;margin-top:24px">Orbital Revestimentos · Sistema automático</p>
    </div>`,
  });

  return NextResponse.json({ sent: 2, birthdaysThisMonth: birthdaysThisMonth.length });
}
