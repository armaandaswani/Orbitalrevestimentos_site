import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface SpaceBreakdownItem {
  spaceName: string;
  productName: string;
  dimLabel?: string;
  plates: number;
  area_m2: number;
  total: number;
}

async function sendNewBudgetEmails(opts: {
  partnerEmail: string | null;
  partnerName: string;
  repEmails: Array<{ email: string; name: string }>;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  space: string | null;
  productName: string | null;
  plates: number | null;
  areaSqm: number | null;
  total: number | null;
  discounted: number | null;
  couponCode: string;
  spaceBreakdown?: SpaceBreakdownItem[] | null;
  // When true, the rep made the sale directly (no partner) — adjusts the rep email copy.
  directSale?: boolean;
}) {
  const resend = getResend();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://orbitalrevestimentos.com.br";

  const budgetValue = opts.discounted ?? opts.total ?? 0;
  const hasBreakdown = opts.spaceBreakdown && opts.spaceBreakdown.length > 1;

  // Per-space breakdown table (multi-space only)
  const breakdownRows = hasBreakdown ? opts.spaceBreakdown!.map((sp, i) => `
<tr style="${i > 0 ? "border-top:1px solid #f0f0f0;" : ""}">
  <td style="padding:10px 0;vertical-align:top;">
    <p style="margin:0 0 2px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${sp.spaceName}</p>
    <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">${sp.productName}${sp.dimLabel ? ` · ${sp.dimLabel}` : ""}</p>
  </td>
  <td style="padding:10px 0 10px 12px;text-align:right;vertical-align:top;white-space:nowrap;">
    <p style="margin:0 0 2px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${fmtBRL(sp.total)}</p>
    <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">${sp.plates} placa${sp.plates !== 1 ? "s" : ""} · ${sp.area_m2.toFixed(1)} m²</p>
  </td>
</tr>`).join("") : "";

  const breakdownBlock = hasBreakdown ? `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-top:2px solid #002045;">
  ${breakdownRows}
  <tr style="border-top:2px solid #002045;">
    <td style="padding:12px 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Total material</td>
    <td style="padding:12px 0 4px;text-align:right;color:#002045;font-size:18px;font-weight:700;font-family:Arial,sans-serif;white-space:nowrap;">${fmtBRL(budgetValue)}</td>
  </tr>
</table>` : "";

  // Client summary (always shown)
  const waLink = opts.clientPhone
    ? `https://wa.me/55${String(opts.clientPhone).replace(/\D/g, "")}`
    : `https://wa.me/?text=${encodeURIComponent(`Olá ${opts.clientName}, vi que você fez um orçamento Orbital e gostaria de ajudar a avançar com o projeto!`)}`;

  const detailsHtml = `
    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#74777f;font-family:Arial,sans-serif;width:140px;">Cliente</td><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#002045;font-weight:600;font-family:Arial,sans-serif;">${opts.clientName}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#74777f;font-family:Arial,sans-serif;">E-mail do cliente</td><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#002045;font-family:Arial,sans-serif;"><a href="mailto:${opts.clientEmail}" style="color:#002045;">${opts.clientEmail}</a></td></tr>
      ${opts.clientPhone ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#74777f;font-family:Arial,sans-serif;">WhatsApp</td><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#002045;font-weight:700;font-family:Arial,sans-serif;"><a href="https://wa.me/55${String(opts.clientPhone).replace(/\D/g,"")}" style="color:#002045;">${opts.clientPhone}</a></td></tr>` : ""}
      ${!hasBreakdown && opts.space ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#74777f;font-family:Arial,sans-serif;">Ambiente</td><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#43474e;font-family:Arial,sans-serif;">${opts.space}</td></tr>` : ""}
      ${!hasBreakdown && opts.productName ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#74777f;font-family:Arial,sans-serif;">Produto</td><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#43474e;font-family:Arial,sans-serif;">${opts.productName}</td></tr>` : ""}
      ${!hasBreakdown && opts.areaSqm ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#74777f;font-family:Arial,sans-serif;">Área</td><td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#43474e;font-family:Arial,sans-serif;">${opts.areaSqm.toFixed(1)} m² · ${opts.plates ?? "—"} placas</td></tr>` : ""}
      ${!hasBreakdown ? `<tr><td style="padding:8px 0;font-size:12px;color:#74777f;font-family:Arial,sans-serif;">Valor do orçamento</td><td style="padding:8px 0;font-size:16px;color:#002045;font-weight:700;font-family:Georgia,serif;">${fmtBRL(budgetValue)}</td></tr>` : ""}
    </table>
    ${breakdownBlock}`;

  // Email to partner
  if (opts.partnerEmail) {
    const partnerHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px 0;">
    <table cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <tr><td style="background:#002045;padding:28px 32px;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#86a0cd;font-family:Arial,sans-serif;">Novo Orçamento</p>
        <p style="margin:0;font-size:22px;color:#ffffff;font-family:Georgia,serif;font-weight:400;">Seu cupom foi utilizado!</p>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e2e2e2;border-top:0;padding:28px 32px;">
        <p style="margin:0 0 16px;font-size:14px;color:#43474e;font-family:Arial,sans-serif;">Olá, <strong>${opts.partnerName}</strong> — um cliente usou o seu cupom <strong>${opts.couponCode}</strong> e gerou um orçamento.</p>
        ${detailsHtml}
        <p style="margin:16px 0 8px;font-size:12px;color:#74777f;font-family:Arial,sans-serif;">Entre em contato com o cliente para garantir que o projeto avance:</p>
        <a href="mailto:${opts.clientEmail}" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:10px 22px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;margin-right:8px;">Enviar e-mail</a>
        <a href="${waLink}" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:10px 22px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">WhatsApp</a>
      </td></tr>
      <tr><td style="background:#f0efec;border:1px solid #e2e2e2;border-top:0;padding:16px 32px;text-align:center;">
        <a href="${siteUrl}/parceiro" style="font-size:11px;color:#74777f;font-family:Arial,sans-serif;text-decoration:none;">Ver meu portal →</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: opts.partnerEmail,
      subject: `🎉 Novo orçamento via seu cupom ${opts.couponCode} — ${opts.clientName}`,
      html: partnerHtml,
    });
  }

  // Email to each rep
  for (const rep of opts.repEmails) {
    const repHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px 0;">
    <table cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <tr><td style="background:#1a365d;padding:28px 32px;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#86a0cd;font-family:Arial,sans-serif;">Novo Orçamento</p>
        <p style="margin:0;font-size:22px;color:#ffffff;font-family:Georgia,serif;font-weight:400;">${opts.directSale ? "Sua venda direta foi registrada" : `Orçamento gerado via parceiro ${opts.partnerName}`}</p>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e2e2e2;border-top:0;padding:28px 32px;">
        <p style="margin:0 0 16px;font-size:14px;color:#43474e;font-family:Arial,sans-serif;">${opts.directSale ? `Olá, <strong>${rep.name}</strong> — sua venda direta foi registrada e sua comissão será calculada sobre o valor com desconto.` : `Olá, <strong>${rep.name}</strong> — um dos seus parceiros (<strong>${opts.partnerName}</strong>) gerou um novo orçamento.`}</p>
        ${detailsHtml}
      </td></tr>
      <tr><td style="background:#f0efec;border:1px solid #e2e2e2;border-top:0;padding:16px 32px;text-align:center;">
        <a href="${siteUrl}/representante" style="font-size:11px;color:#74777f;font-family:Arial,sans-serif;text-decoration:none;">Ver meu portal →</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: rep.email,
      subject: `📋 Novo orçamento via ${opts.partnerName} — ${opts.clientName}`,
      html: repHtml,
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const couponCode = searchParams.get("coupon_code");
  const salesRepCode = searchParams.get("sales_rep_code");

  const db = supabaseAdmin();

  if (salesRepCode) {
    // Primary: fetch via coupon_use_commissions (new multi-rep table)
    const { data: commRows, error: commErr } = await db
      .from("coupon_use_commissions")
      .select("coupon_use_id, commission_owed, sales_rep_referral_code")
      .eq("sales_rep_referral_code", salesRepCode.toUpperCase());

    // Fallback: also fetch direct coupon_uses (legacy single-rep field)
    const { data: directUses } = await db
      .from("coupon_uses")
      .select("*")
      .eq("sales_rep_referral_code", salesRepCode.toUpperCase())
      .order("created_at", { ascending: false });

    if (commErr) return NextResponse.json({ error: commErr.message }, { status: 500 });

    const commissionByUseId: Record<string, number> = {};
    for (const r of (commRows ?? [])) {
      commissionByUseId[r.coupon_use_id as string] = r.commission_owed as number;
    }

    // Collect all coupon_use_ids from commissions table
    const commUseIds = (commRows ?? []).map((r) => r.coupon_use_id as string).filter(Boolean);

    let allUses: Record<string, unknown>[] = [];

    if (commUseIds.length > 0) {
      const { data: commUses } = await db
        .from("coupon_uses")
        .select("*")
        .in("id", commUseIds)
        .order("created_at", { ascending: false });
      allUses = (commUses ?? []) as Record<string, unknown>[];
    }

    // Merge with legacy direct uses (deduplicate by id)
    const seenIds = new Set(allUses.map((u) => u.id as string));
    for (const u of (directUses ?? []) as Record<string, unknown>[]) {
      if (!seenIds.has(u.id as string)) {
        allUses.push(u);
        seenIds.add(u.id as string);
      }
    }

    // Sort by created_at desc
    allUses.sort((a, b) => {
      const da = new Date(a.created_at as string).getTime();
      const db2 = new Date(b.created_at as string).getTime();
      return db2 - da;
    });

    // Enrich with partner name and override commission with rep-specific value
    const couponCodes = [...new Set(allUses.map((u) => u.coupon_code as string).filter(Boolean))];
    let nameMap: Record<string, string> = {};
    if (couponCodes.length > 0) {
      const { data: partners } = await db
        .from("partners")
        .select("coupon_code, name")
        .in("coupon_code", couponCodes);
      (partners ?? []).forEach((p: { coupon_code: string; name: string }) => {
        nameMap[p.coupon_code] = p.name;
      });
    }

    return NextResponse.json(
      allUses.map((u) => ({
        ...u,
        partner_name: nameMap[u.coupon_code as string] || null,
        // Override with this rep's specific commission if available
        sales_rep_commission_owed:
          commissionByUseId[u.id as string] !== undefined
            ? commissionByUseId[u.id as string]
            : u.sales_rep_commission_owed,
      }))
    );
  }

  // No sales_rep_code filter — standard query
  let query = db.from("coupon_uses").select("*").order("created_at", { ascending: false });
  if (couponCode) query = query.eq("coupon_code", couponCode.toUpperCase());

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = supabaseAdmin();

  const isRepDirect = body.source === "rep";

  // Look up the partner to get their sales_rep_referral_code
  let salesRepReferralCode: string | null = null;
  let salesRepCommissionOwed: number | null = null;
  // For rep direct sales: the rep record itself (used for commission + notification)
  let repDirect: { id: string; name: string; email: string | null; referral_code: string } | null = null;

  if (isRepDirect && body.sales_rep_referral_code) {
    const { data: rep } = await db
      .from("sales_reps")
      .select("id, name, email, referral_code, commission_type, commission_value, status")
      .eq("referral_code", (body.sales_rep_referral_code as string).toUpperCase())
      .eq("status", "active")
      .maybeSingle();

    if (rep) {
      repDirect = {
        id: rep.id as string,
        name: rep.name as string,
        email: (rep.email as string) ?? null,
        referral_code: rep.referral_code as string,
      };
      salesRepReferralCode = rep.referral_code as string;
      if (body.material_discounted != null) {
        salesRepCommissionOwed =
          rep.commission_type === "percentage"
            ? (body.material_discounted as number) * (rep.commission_value as number) / 100
            : (rep.commission_value as number);
      }
    }
  } else if (body.coupon_code) {
    const { data: partner } = await db
      .from("partners")
      .select("sales_rep_referral_code")
      .eq("coupon_code", (body.coupon_code as string).toUpperCase())
      .maybeSingle();

    if (partner?.sales_rep_referral_code) {
      salesRepReferralCode = partner.sales_rep_referral_code as string;

      const { data: salesRep } = await db
        .from("sales_reps")
        .select("commission_type, commission_value")
        .eq("referral_code", salesRepReferralCode)
        .eq("status", "active")
        .maybeSingle();

      if (salesRep && body.material_discounted != null) {
        salesRepCommissionOwed =
          salesRep.commission_type === "percentage"
            ? (body.material_discounted as number) * (salesRep.commission_value as number) / 100
            : (salesRep.commission_value as number);
      }
    }
  }

  const { data, error } = await db
    .from("coupon_uses")
    .insert({
      partner_id: body.partner_id,
      coupon_code: body.coupon_code,
      space: body.space,
      product_name: body.product_name,
      product_code: body.product_code,
      area_m2: body.area_m2,
      plates: body.plates,
      material_total: body.material_total,
      material_discounted: body.material_discounted,
      discount_applied: body.discount_applied,
      // Partner commission — zero for rep direct sales (no partner involved)
      commission_owed: isRepDirect ? 0 : body.commission_owed,
      architect_name: body.architect_name,
      client_email: body.client_email ?? null,
      client_phone: body.client_phone ?? null,
      sales_rep_referral_code: salesRepReferralCode,
      sales_rep_commission_owed: salesRepCommissionOwed,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create commission records for all reps linked to this partner
  if (data && body.partner_id) {
    try {
      const { data: linkedReps } = await db
        .from("partner_sales_reps")
        .select("sales_rep_id, sales_reps(id, referral_code, commission_type, commission_value, status)")
        .eq("partner_id", body.partner_id);

      if (linkedReps && linkedReps.length > 0) {
        const commissions = linkedReps
          .map((lr: Record<string, unknown>) => {
            const rep = lr.sales_reps as Record<string, unknown> | null;
            if (!rep || rep.status !== "active") return null;
            const commOwed =
              rep.commission_type === "percentage"
                ? ((body.material_discounted as number) ?? 0) * (rep.commission_value as number) / 100
                : (rep.commission_value as number);
            return {
              coupon_use_id: (data as Record<string, unknown>).id as string,
              sales_rep_id: rep.id as string,
              sales_rep_referral_code: rep.referral_code as string,
              commission_owed: commOwed,
            };
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

        if (commissions.length > 0) {
          await db.from("coupon_use_commissions").insert(commissions);
        }
      }
    } catch {
      // non-fatal
    }
  }

  // Send instant notification emails (non-fatal)
  if (data && body.partner_id && body.architect_name) {
    try {
      // Fetch partner email + name
      const { data: partner } = await db
        .from("partners")
        .select("email, name")
        .eq("id", body.partner_id)
        .maybeSingle();

      // Fetch all linked reps with email
      const { data: linkedReps } = await db
        .from("partner_sales_reps")
        .select("sales_reps(name, email, status)")
        .eq("partner_id", body.partner_id);

      const repEmails: Array<{ email: string; name: string }> = [];
      for (const lr of linkedReps ?? []) {
        const rep = (lr as Record<string, unknown>).sales_reps as Record<string, unknown> | null;
        if (rep && rep.status === "active" && rep.email) {
          repEmails.push({ email: rep.email as string, name: rep.name as string });
        }
      }

      await sendNewBudgetEmails({
        partnerEmail: partner?.email ?? null,
        partnerName: partner?.name ?? (body.coupon_code as string),
        repEmails,
        clientName: body.architect_name as string,
        clientEmail: (body.client_email as string) ?? "",
        clientPhone: (body.client_phone as string | null) ?? null,
        space: (body.space as string) ?? null,
        productName: (body.product_name as string) ?? null,
        plates: (body.plates as number) ?? null,
        areaSqm: (body.area_m2 as number) ?? null,
        total: (body.material_total as number) ?? null,
        discounted: (body.material_discounted as number) ?? null,
        couponCode: body.coupon_code as string,
        spaceBreakdown: Array.isArray(body.space_breakdown) ? body.space_breakdown as SpaceBreakdownItem[] : null,
      });
    } catch (err) {
      console.error("Notification email failed:", err);
      // non-fatal — budget was saved, just email failed
    }
  }

  // ── Rep direct sale: commission record + notification (non-fatal) ──────────
  if (data && isRepDirect && repDirect) {
    try {
      await db.from("coupon_use_commissions").insert({
        coupon_use_id: (data as Record<string, unknown>).id as string,
        sales_rep_id: repDirect.id,
        sales_rep_referral_code: repDirect.referral_code,
        commission_owed: salesRepCommissionOwed ?? 0,
      });
    } catch {
      // non-fatal
    }

    if (body.architect_name) {
      try {
        await sendNewBudgetEmails({
          partnerEmail: null,
          partnerName: repDirect.name,
          repEmails: repDirect.email
            ? [{ email: repDirect.email, name: repDirect.name }]
            : [],
          clientName: body.architect_name as string,
          clientEmail: (body.client_email as string) ?? "",
          clientPhone: (body.client_phone as string | null) ?? null,
          space: (body.space as string) ?? null,
          productName: (body.product_name as string) ?? null,
          plates: (body.plates as number) ?? null,
          areaSqm: (body.area_m2 as number) ?? null,
          total: (body.material_total as number) ?? null,
          discounted: (body.material_discounted as number) ?? null,
          couponCode: body.coupon_code as string,
          spaceBreakdown: Array.isArray(body.space_breakdown) ? body.space_breakdown as SpaceBreakdownItem[] : null,
          directSale: true,
        });
      } catch (err) {
        console.error("Rep notification email failed:", err);
        // non-fatal
      }
    }
  }

  return NextResponse.json(data, { status: 201 });
}
