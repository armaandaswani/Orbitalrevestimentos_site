import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { generateClientEmail, STEP_DELAYS_DAYS } from "@/lib/client-email-content";
import { upsertLeadFromSource, touchLeadContacted } from "@/lib/leads";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";
import {
  clientOrcamentoCtaMessage,
  clientOrcamentoMessage,
  ownerHighValueMessage,
  productEducationMessage,
} from "@/lib/smclick-messages";

const ADMIN_EMAIL = "armaandaswani19@gmail.com";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtArea(n: number) {
  return n.toFixed(2).replace(".", ",");
}

interface SpaceBreakdownItem {
  spaceName: string;
  productName: string;
  dimLabel: string;
  plates: number;
  area_m2: number;
  total: number;
  imageUrl?: string;
}

interface VizRender {
  url: string;
  local: string | null;
  productName: string | null;
  productCode: string | null;
}

// Load the Visualizador renders the client saved before the handoff. Returns []
// for a missing id, an unknown session, or if the table doesn't exist yet —
// never throws, so it can't break the orçamento submit.
async function loadVizRenders(
  db: ReturnType<typeof supabaseAdmin>,
  id: unknown
): Promise<VizRender[]> {
  if (!id || typeof id !== "string") return [];
  try {
    const { data, error } = await db
      .from("visualizador_renders")
      .select("images")
      .eq("id", id)
      .single();
    if (error || !data) return [];
    const imgs = (data as { images?: unknown }).images;
    if (!Array.isArray(imgs)) return [];
    return imgs
      .filter((r): r is VizRender => !!r && typeof (r as VizRender).url === "string")
      .map((r) => ({
        url: r.url,
        local: r.local ?? null,
        productName: r.productName ?? null,
        productCode: r.productCode ?? null,
      }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    coupon_use_id, client_name, client_email, client_phone,
    space, model, plates, area_m2, total, dim_label, product_images,
    space_breakdown, partner_name, quote_url, sim_id, sim_session_id,
    viz_render_id,
  } = body;

  if (!client_name || !client_email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Visualizador renders the client generated before coming to the Simulador
  // (carried over as ?viz_render=…). Best-effort: a missing/empty session just
  // means no renders to attach.
  const vizRenders = await loadVizRenders(db, viz_render_id);

  // Next email at: step 2 scheduled in STEP_DELAYS_DAYS[1] days
  const delayDays = STEP_DELAYS_DAYS[1] ?? 3;
  const nextEmailAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: seq, error } = await db
    .from("client_email_sequences")
    .insert({
      coupon_use_id: coupon_use_id ?? null,
      client_name,
      client_email,
      client_phone: client_phone ?? null,
      space: space || null,
      model,
      plates,
      area_m2,
      total,
      dim_label: dim_label ?? null,
      partner_name,
      current_step: 1,
      next_email_at: nextEmailAt,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Persist the Visualizador renders on the sequence row so they show in admin.
  // Separate, non-fatal update: keeps the critical insert above decoupled from
  // the render_images column (migration 018) — if the column is missing, the
  // orçamento still saves.
  if (vizRenders.length > 0) {
    try {
      await db.from("client_email_sequences").update({ render_images: vizRenders }).eq("id", seq.id);
    } catch { /* non-fatal — column may not exist yet */ }
  }

  // Auto-ingest into the CRM (non-fatal, deduped by email). A website orçamento
  // that used a partner coupon is attributed to that partner; otherwise it's an
  // inbound "de fora" website lead.
  const leadId = await upsertLeadFromSource({
    name: client_name,
    email: client_email,
    phone: client_phone ?? null,
    source: coupon_use_id ? "partner" : "website",
    partnerName: partner_name && partner_name !== "Orbital" ? partner_name : null,
    couponUseId: coupon_use_id ?? null,
    clientEmailSequenceId: seq.id,
    space: space || null,
    productName: model ?? null,
    estimatedValue: typeof total === "number" ? total : null,
  });

  // Feature 6 — mark the abandoned-simulador session complete so the recovery
  // cron never nudges someone who actually finished (non-fatal).
  if (sim_session_id) {
    try {
      await db
        .from("simulador_sessions")
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq("id", sim_session_id);
    } catch { /* non-fatal */ }
  }

  // Feature 1 — instant orçamento confirmation to the customer on WhatsApp.
  // Within WhatsApp's 24h window because they just engaged. Non-fatal: the email
  // drip above still runs regardless.
  try {
    const phone = normalizePhone(client_phone as string | null);
    if (smclickConfigured() && phone) {
      const res = await sendText(
        phone,
        clientOrcamentoMessage({
          name: client_name as string,
          total: typeof total === "number" ? total : null,
          space: (space as string | null) || null,
          model: (model as string | null) || null,
          dimLabel: (dim_label as string | null) || null,
          quoteUrl: (quote_url as string | null) ?? null,
          renderUrls: vizRenders.map((r) => r.url),
        })
      );
      if (res.ok && leadId) await touchLeadContacted(leadId);
      else if (!res.ok) console.error("[smclick] client orçamento WhatsApp failed", { status: res.status, error: res.error });

      // Message 2 — product education / qualification, right after the
      // orçamento confirmation. Teaches the lead what the bamboo panels are and
      // why they suit the Amazonian climate. Non-fatal.
      if (res.ok) {
        const edu = await sendText(phone, productEducationMessage());
        if (!edu.ok) console.error("[smclick] product education WhatsApp failed", { status: edu.status, error: edu.error });
        const cta = await sendText(phone, clientOrcamentoCtaMessage());
        if (!cta.ok) console.error("[smclick] client CTA WhatsApp failed", { status: cta.status, error: cta.error });
      }
    } else {
      console.warn("[smclick] client orçamento WhatsApp skipped", { configured: smclickConfigured(), hasPhone: Boolean(phone) });
    }
  } catch (e) { console.error("[smclick] client orçamento WhatsApp threw", e); }

  // Feature 4 — real-time owner ping for high-value orçamentos. Threshold (BRL)
  // is configurable; alerts are off until SMCLICK_HIGH_VALUE_THRESHOLD is set.
  try {
    const threshold = Number(process.env.SMCLICK_HIGH_VALUE_THRESHOLD || "0");
    const ownerPhone = normalizePhone(process.env.SMCLICK_REMINDER_TO);
    if (
      smclickConfigured() &&
      ownerPhone &&
      threshold > 0 &&
      typeof total === "number" &&
      total >= threshold
    ) {
      await sendText(
        ownerPhone,
        ownerHighValueMessage({
          name: client_name as string,
          phone: (client_phone as string | null) ?? null,
          total,
          space: (space as string | null) || null,
          model: (model as string | null) || null,
          quoteUrl: (quote_url as string | null) ?? null,
        })
      );
    }
  } catch { /* non-fatal */ }

  // Mark the partner simulation as converted (non-fatal)
  if (sim_id) {
    try {
      await db
        .from("partner_simulations")
        .update({
          status: "converted",
          converted_at: new Date().toISOString(),
          client_email_sequence_id: seq.id,
        })
        .eq("id", sim_id)
        .eq("status", "pending"); // only update if still pending
    } catch { /* non-fatal */ }
  }

  const resend = getResend();

  // Send step 1 to client immediately (non-fatal)
  try {
    const { subject, html } = generateClientEmail(1, {
      clientName: client_name as string,
      space: space as string | null,
      model: model as string,
      plates: plates as number,
      area: area_m2 as number,
      total: total as number,
      partnerName: partner_name as string,
      hasCoupon: Boolean(coupon_use_id),
      quoteUrl: (quote_url as string | null) ?? null,
      productImages: Array.isArray(product_images) ? product_images as Array<{ imageUrl: string; productName: string; spaceName: string }> : null,
    });
    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: client_email as string,
      subject,
      html,
    });
  } catch {
    // email failure is non-fatal — sequence record already created
  }

  // Send the client their Visualizador render(s) (non-fatal). A short, separate
  // email so it lands even if the drip content lib changes.
  if (vizRenders.length > 0) {
    try {
      const firstName = String(client_name).trim().split(/\s+/)[0] || "Olá";
      const renderImgs = vizRenders
        .map(
          (r) => `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
  <tr><td style="padding:0;"><img src="${r.url}" alt="${r.productName ?? "Render"}" style="display:block;width:100%;max-width:520px;height:auto;border:0;" /></td></tr>
  ${r.local || r.productName ? `<tr><td style="padding:6px 0 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">${[r.local, r.productName].filter(Boolean).join(" · ")}</td></tr>` : ""}
</table>`
        )
        .join("");
      await getResend().emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: client_email as string,
        subject: "Seu ambiente com o revestimento Orbital 🖼️",
        html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0eeeb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">
      <tr><td style="background:#002045;padding:20px 28px;">
        <p style="margin:0;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Orbital Revestimentos</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;">Seu ambiente, transformado</p>
      </td></tr>
      <tr><td style="padding:28px;">
        <p style="margin:0 0 18px;color:#002045;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">${firstName}, aqui está a simulação que você gerou no nosso Visualizador. É só uma prévia — na instalação real o acabamento fica ainda melhor.</p>
        ${renderImgs}
        <p style="margin:18px 0 0;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Quer ver pessoalmente ou tirar dúvidas? É só responder este e-mail ou chamar a gente no WhatsApp. 🙌</p>
      </td></tr>
      <tr><td style="background:#f5f5f3;padding:16px 28px;border-top:1px solid #e2e2e2;">
        <p style="margin:0;color:#b0b0b0;font-size:10px;font-family:Arial,sans-serif;">Orbital Revestimentos · Manaus</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
      });
    } catch {
      // non-fatal
    }
  }

  // Send internal notification to Orbital team (non-fatal)
  try {
    const totalFmt = fmtBRL(total as number);
    const breakdown: SpaceBreakdownItem[] = Array.isArray(space_breakdown) ? space_breakdown : [];
    const hasBreakdown = breakdown.length > 0;
    const couponLine = partner_name && partner_name !== "Orbital"
      ? `<tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">Cupom parceiro</td><td style="padding:5px 0 5px 16px;color:#002045;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">${partner_name}</td></tr>`
      : "";

    // ── Product thumbnails (unique by imageUrl, max 3) ──────────────────────
    const uniqueImgs: SpaceBreakdownItem[] = [];
    const seenUrls = new Set<string>();
    for (const sp of breakdown) {
      if (sp.imageUrl && !seenUrls.has(sp.imageUrl)) {
        seenUrls.add(sp.imageUrl);
        uniqueImgs.push(sp);
      }
    }
    const thumbItems = uniqueImgs.slice(0, 3);
    const thumbBlock = thumbItems.length === 0 ? "" : `
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    ${thumbItems.map((img) => `
    <td style="width:${Math.floor(100 / thumbItems.length)}%;vertical-align:top;padding:0 4px;">
      <img src="${img.imageUrl}" alt="${img.productName}" style="display:block;width:100%;height:auto;border:0;" />
      <p style="margin:4px 0 0;font-size:10px;color:#74777f;font-family:Arial,sans-serif;line-height:1.4;">${img.spaceName ?? img.productName}<br><span style="color:#002045;font-weight:700;">${img.productName}</span></p>
    </td>`).join("")}
  </tr>
</table>`;

    // ── Per-space breakdown table ────────────────────────────────────────────
    const breakdownRows = hasBreakdown ? breakdown.map((sp, i) => `
<tr style="${i > 0 ? "border-top:1px solid #f0f0f0;" : ""}">
  <td style="padding:10px 0;vertical-align:top;">
    <p style="margin:0 0 2px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${sp.spaceName}</p>
    <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">${sp.productName}${sp.dimLabel ? ` · ${sp.dimLabel}` : ""}</p>
  </td>
  <td style="padding:10px 0 10px 12px;text-align:right;vertical-align:top;white-space:nowrap;">
    <p style="margin:0 0 2px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${fmtBRL(sp.total)}</p>
    <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">${sp.plates} placa${sp.plates !== 1 ? "s" : ""} · ${fmtArea(sp.area_m2)} m²</p>
  </td>
</tr>`).join("") : "";

    const breakdownBlock = hasBreakdown ? `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-top:2px solid #002045;">
  ${breakdownRows}
  <tr style="border-top:2px solid #002045;">
    <td style="padding:12px 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Total material</td>
    <td style="padding:12px 0 4px;text-align:right;color:#002045;font-size:18px;font-weight:700;font-family:Arial,sans-serif;white-space:nowrap;">${totalFmt}</td>
  </tr>
</table>` : `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
  <tr><td style="padding:6px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">Total material</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${totalFmt}</td></tr>
</table>`;

    // ── Quote link button ────────────────────────────────────────────────────
    const quoteLinkBlock = quote_url ? `
<table cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
  <tr><td style="background:#f5f5f3;border:1px solid #e2e2e2;padding:0;">
    <a href="${quote_url}" style="display:inline-block;padding:12px 24px;color:#002045;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Ver orçamento como o cliente →</a>
  </td></tr>
</table>` : "";

    // ── WA + quote buttons ───────────────────────────────────────────────────
    const waHref = client_phone ? `https://wa.me/55${String(client_phone).replace(/\D/g, "")}` : null;
    const ctaBlock = (waHref || quote_url) ? `
<table cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    ${waHref ? `<td style="background:#002045;padding:0;"><a href="${waHref}" style="display:inline-block;padding:13px 24px;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">WhatsApp do cliente</a></td>` : ""}
    ${quote_url ? `<td style="background:#f5f5f3;border:1px solid #e2e2e2;padding:0;"><a href="${quote_url}" style="display:inline-block;padding:13px 24px;color:#002045;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Ver orçamento →</a></td>` : ""}
  </tr>
</table>` : "";

    // ── Visualizador renders the client generated ───────────────────────────
    const renderThumbs = vizRenders.slice(0, 3);
    const renderBlock = renderThumbs.length === 0 ? "" : `
<p style="margin:0 0 8px;color:#002045;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,sans-serif;">Renders do cliente (Visualizador)</p>
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    ${renderThumbs.map((r) => `
    <td style="width:${Math.floor(100 / renderThumbs.length)}%;vertical-align:top;padding:0 4px;">
      <a href="${r.url}"><img src="${r.url}" alt="${r.productName ?? "Render"}" style="display:block;width:100%;height:auto;border:0;" /></a>
      <p style="margin:4px 0 0;font-size:10px;color:#74777f;font-family:Arial,sans-serif;line-height:1.4;">${r.local ?? ""}${r.productName ? `<br><span style="color:#002045;font-weight:700;">${r.productName}</span>` : ""}</p>
    </td>`).join("")}
  </tr>
</table>`;

    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: ADMIN_EMAIL,
      subject: `🆕 Novo orçamento — ${client_name} (${totalFmt})`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0eeeb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#002045;padding:20px 28px;">
        <p style="margin:0;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Orbital Revestimentos</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;">Novo orçamento recebido</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:28px;">

        ${renderBlock}

        ${thumbBlock}

        <!-- Client info -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
          <tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;width:110px;">Cliente</td><td style="padding:5px 0 5px 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${client_name}</td></tr>
          <tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">E-mail</td><td style="padding:5px 0 5px 16px;font-size:12px;font-family:Arial,sans-serif;"><a href="mailto:${client_email}" style="color:#002045;">${client_email}</a></td></tr>
          ${client_phone ? `<tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">WhatsApp</td><td style="padding:5px 0 5px 16px;font-size:12px;font-weight:700;font-family:Arial,sans-serif;"><a href="https://wa.me/55${String(client_phone).replace(/\D/g,"")}" style="color:#002045;">${client_phone}</a></td></tr>` : ""}
          ${couponLine}
        </table>

        <!-- Breakdown -->
        ${breakdownBlock}

        <!-- CTAs -->
        ${ctaBlock}

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f5f5f3;padding:16px 28px;border-top:1px solid #e2e2e2;">
        <p style="margin:0;color:#b0b0b0;font-size:10px;font-family:Arial,sans-serif;">Orbital Revestimentos · Notificação interna</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
    });
  } catch {
    // notification failure is non-fatal
  }

  return NextResponse.json(seq, { status: 201 });
}
