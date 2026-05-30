import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();
  const today = new Date();
  const thisMonth = today.getMonth() + 1;
  const thisDay = today.getDate();

  const { data: partners } = await db
    .from("partners")
    .select("id, name, email, phone, coupon_code, birthday")
    .eq("status", "active")
    .not("birthday", "is", null);

  if (!partners || partners.length === 0) return NextResponse.json({ sent: 0 });

  const birthdayToday = partners.filter((p: { birthday: string }) => {
    const bday = new Date(p.birthday);
    return bday.getUTCMonth() + 1 === thisMonth && bday.getUTCDate() === thisDay;
  });

  if (birthdayToday.length === 0) return NextResponse.json({ sent: 0 });

  try {
    const { getResend } = await import("@/lib/resend");
    const resend = getResend();

    for (const partner of birthdayToday as { name: string; email: string | null; phone: string | null; coupon_code: string; birthday: string }[]) {
      const birthYear = new Date(partner.birthday).getUTCFullYear();
      const age = today.getFullYear() - birthYear;
      const phone = partner.phone ? partner.phone.replace(/\D/g, "") : null;
      const phoneWithCountry = phone ? (phone.startsWith("55") ? phone : `55${phone}`) : null;
      const waLink = phoneWithCountry
        ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(`Feliz Aniversário, ${partner.name.split(" ")[0]}! 🎂`)}`
        : null;

      await resend.emails.send({
        from: "Orbital Revestimentos <orbitalrevestimentos@gmail.com>",
        to: "armaandaswani19@gmail.com",
        subject: `🎂 Aniversário hoje: ${partner.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
            <h2 style="font-size:20px;margin-bottom:4px;color:#002045">🎂 Aniversário hoje</h2>
            <p style="color:#555;margin-bottom:20px;font-size:14px">Um parceiro faz aniversário hoje!</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Nome</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right">${partner.name}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Cupom</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right;letter-spacing:0.1em">${partner.coupon_code}</td></tr>
              ${partner.email ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right">${partner.email}</td></tr>` : ""}
              ${partner.phone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Telefone</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right">${partner.phone}</td></tr>` : ""}
              <tr><td style="padding:8px 0;color:#555;font-size:14px">Idade</td><td style="padding:8px 0;font-weight:600;font-size:14px;text-align:right">${age} anos</td></tr>
            </table>
            ${waLink ? `<a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600;margin-bottom:16px">Parabenizar no WhatsApp</a>` : ""}
            <p style="color:#888;font-size:12px;margin-top:24px">Orbital Revestimentos · Sistema automático</p>
          </div>
        `,
      });
    }
  } catch (err) {
    console.error("Birthday email error:", err);
  }

  return NextResponse.json({ sent: birthdayToday.length });
}
