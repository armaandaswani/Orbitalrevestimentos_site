// Client drip email sequence for Orbital Revestimentos
// 7 emails over 3 weeks + 2 conclusion emails
//
// Schedule:
//   Step 1 → immediate
//   Step 2 → Day 3
//   Step 3 → Day 5
//   Step 4 → Day 9
//   Step 5 → Day 12
//   Step 6 → Day 16
//   Step 7 → Day 19
//
// Special steps:
//   Step 99 → sent when sale_status = 'concluido'
//   Step 98 → sent when sale_status = 'cancelado'

const WA_PHONE = "5592988150149";

// Days to wait before sending the NEXT step (indexed by current step)
export const STEP_DELAYS_DAYS: Record<number, number> = {
  1: 3,  // after step 1, wait 3 days → step 2 on Day 3
  2: 2,  // after step 2, wait 2 days → step 3 on Day 5
  3: 4,  // after step 3, wait 4 days → step 4 on Day 9
  4: 3,  // after step 4, wait 3 days → step 5 on Day 12
  5: 4,  // after step 5, wait 4 days → step 6 on Day 16
  6: 3,  // after step 6, wait 3 days → step 7 on Day 19
};

export const TOTAL_STEPS = 7;

export interface EmailParams {
  clientName: string;
  space: string | null;
  model: string;        // Classic | Brilliance | Elegance
  plates: number;
  area: number;         // m²
  total: number;        // BRL
  partnerName: string;
  /** True when the client came through a partner coupon (i.e. already has an architect). */
  hasCoupon?: boolean;
  quoteUrl?: string | null;
  productImages?: Array<{ imageUrl: string; productName: string; spaceName: string }> | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtArea(n: number) {
  return n.toFixed(2).replace(".", ",");
}

const FINISH: Record<string, string> = {
  Classic: "Mármore Fosco",
  Brilliance: "Mármore Polido",
  Elegance: "Madeira Texturizada",
};

// Grammatical gender of the known simulator space labels (lowercased, as stored).
// Used to build article/possessive forms that agree with the noun. Anything not
// listed here (custom names, or a multi-ambiente concatenation) falls back to the
// gender-stable generic "espaço" forms below.
const SPACE_GENDER: Record<string, "f" | "m"> = {
  "parede": "f",
  "sala": "f",
  "cozinha": "f",
  "porta": "f",
  "roda-pia": "f",
  "roda-banca": "f",
  "fachada externa": "f",
  "teto": "m",
  "quarto": "m",
  "escritório": "m",
  "corredor": "m",
  "banheiro": "m",
  "lavabo": "m",
  "móvel / marcenaria": "m",
  "piso / chão": "m",
  "box / ducha": "m",
};

export interface SpaceForms {
  /** Possessive form without leading article — used after "para"/"de": "sua parede" / "seu espaço". */
  label: string;
  /** Article + possessive — object form: "a sua parede" / "o seu espaço". */
  para: string;
  /** Locative — "na sua parede" / "no seu espaço". */
  em: string;
  /** Sentence-start, capitalized: "Sua parede" / "Seu espaço". */
  subj: string;
}

const GENERIC_SPACE: SpaceForms = {
  label: "seu espaço",
  para: "o seu espaço",
  em: "no seu espaço",
  subj: "Seu espaço",
};

/**
 * Builds grammatically-correct article/possessive forms for the client's space.
 *
 * The simulator stores `space` as a single known label (e.g. "Parede") for one
 * ambiente, or several labels joined with ", " for a multi-ambiente simulation
 * (e.g. "Parede, Parede, Teto"). Interpolating that raw string into fixed-gender
 * phrases like `o seu ${space}` produced ungrammatical, broken-looking emails.
 *
 * Rules:
 *  - empty/null              → generic masculine "espaço" forms
 *  - exactly one known label → gender-correct personalized forms
 *  - multiple distinct, or an unknown/custom label → generic forms (always safe)
 */
export function spaceForms(space: string | null | undefined): SpaceForms {
  if (!space) return GENERIC_SPACE;
  const parts = space.split(",").map((s) => s.trim()).filter(Boolean);
  const unique = Array.from(new Set(parts.map((s) => s.toLowerCase())));
  if (unique.length !== 1) return GENERIC_SPACE; // 0 or 2+ distinct ambientes
  const name = parts[0];
  const gender = SPACE_GENDER[name.toLowerCase()];
  if (!gender) return GENERIC_SPACE; // custom/unknown name → stay safe
  const lower = name.toLowerCase();
  const cap = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return gender === "f"
    ? { label: `sua ${lower}`, para: `a sua ${lower}`, em: `na sua ${lower}`, subj: `Sua ${cap}` }
    : { label: `seu ${lower}`, para: `o seu ${lower}`, em: `no seu ${lower}`, subj: `Seu ${cap}` };
}

function waLink(clientName: string, partnerName: string, model: string, plates: number) {
  const msg = `Olá! Sou ${clientName.split(" ")[0]}, recebi um orçamento Orbital pelo parceiro ${partnerName} e tenho interesse. Modelo: ${model}, ${plates} placas.`;
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
}

function cta(label: string, url: string) {
  return `
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="${url}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">${label}</a>
    </td>
  </tr>
</table>`;
}

function quoteCard(p: EmailParams) {
  const finish = FINISH[p.model] || p.model;
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">SEU ORÇAMENTO</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${p.space ? `<tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:8px;font-family:Arial,sans-serif;">Ambiente</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:8px;font-family:Arial,sans-serif;">${p.space}</td></tr>` : ""}
      <tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:8px;font-family:Arial,sans-serif;">Modelo</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:8px;font-family:Arial,sans-serif;">${p.model} · ${finish}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:8px;font-family:Arial,sans-serif;">Quantidade</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:8px;font-family:Arial,sans-serif;">${p.plates} placa${p.plates !== 1 ? "s" : ""}</td></tr>
      <tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:16px;font-family:Arial,sans-serif;">Área coberta</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:16px;font-family:Arial,sans-serif;">${fmtArea(p.area)} m²</td></tr>
      <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.12);padding-top:16px;"></td></tr>
      <tr><td style="color:#ffffff;font-size:15px;font-weight:700;font-family:Arial,sans-serif;padding-top:4px;">Total do material</td><td style="color:#ffffff;font-size:22px;font-weight:700;text-align:right;font-family:Arial,sans-serif;padding-top:4px;">${fmtBRL(p.total)}</td></tr>
    </table>
  </td></tr>
</table>`;
}

function wrap(preheader: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orbital Revestimentos</title>
</head>
<body style="margin:0;padding:0;background:#f0eeeb;">
<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f0eeeb;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0eeeb;padding:40px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:580px;width:100%;">
      <!-- Header -->
      <tr><td style="background:#002045;padding:28px 36px;">
        <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">ORBITAL</p>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Revestimentos · Manaus</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:40px 36px;">${body}</td></tr>
      <!-- Footer -->
      <tr><td style="background:#f5f5f3;padding:24px 36px;border-top:1px solid #e2e2e2;">
        <p style="margin:0;color:#74777f;font-size:11px;line-height:1.7;font-family:Arial,sans-serif;">
          Orbital Revestimentos · Manaus, Amazonas<br>
          Dúvidas? <a href="https://wa.me/${WA_PHONE}" style="color:#002045;text-decoration:underline;">WhatsApp (92) 98815-0149</a><br>
          <span style="color:#b0b0b0;">Você recebe esta mensagem porque solicitou um orçamento Orbital.</span>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─── Email generators ────────────────────────────────────────────────────────

export function generateClientEmail(
  step: number,
  p: EmailParams
): { subject: string; html: string } {
  const first = p.clientName.split(" ")[0];
  const sf = spaceForms(p.space);
  const spaceLabel = sf.label;
  const spacePara = sf.para;
  const spaceEm   = sf.em;
  const spaceSubj = sf.subj;
  const spaceA    = sf.para; // "<art> <poss> X" object form (gender-correct)
  const finish = FINISH[p.model] || p.model;
  const wa = waLink(p.clientName, p.partnerName, p.model, p.plates);
  const partnerFirst = p.partnerName.split(" ")[0];

  // ── STEP 1 — Immediate: orçamento confirmado ──────────────────────────────
  if (step === 1) {
    const quoteLinkBlock = p.quoteUrl ? `
<table cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border:1px solid #e2e2e2;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#74777f;font-family:Arial,sans-serif;">Seu orçamento completo</p>
    <p style="margin:0 0 10px;font-size:13px;color:#43474e;font-family:Arial,sans-serif;line-height:1.6;">Todas as fotos, especificações e o detalhamento do seu projeto — válido por 7 dias.</p>
    <a href="${p.quoteUrl}" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Ver orçamento completo →</a>
  </td></tr>
</table>` : "";

    const imgs = p.productImages?.filter((i) => i.imageUrl) ?? [];
    const productImgBlock = imgs.length === 0 ? "" : imgs.length === 1 ? `
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
  <tr><td style="padding:0;text-align:center;">
    <img src="${imgs[0].imageUrl}" alt="${imgs[0].productName}" style="display:inline-block;width:auto;max-width:100%;max-height:320px;height:auto;border:0;" />
  </td></tr>
  <tr><td style="padding:6px 0 0;text-align:center;">
    <p style="margin:0;font-size:11px;color:#74777f;font-family:Arial,sans-serif;letter-spacing:0.05em;">${imgs[0].productName}</p>
  </td></tr>
</table>` : `
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    ${imgs.slice(0, 3).map((img) => `
    <td style="width:${Math.floor(100 / Math.min(imgs.length, 3))}%;vertical-align:top;padding:0 4px;">
      <img src="${img.imageUrl}" alt="${img.productName}" style="display:block;width:100%;height:auto;border:0;" />
      <p style="margin:4px 0 0;font-size:10px;color:#74777f;font-family:Arial,sans-serif;line-height:1.4;">${img.spaceName}<br><span style="color:#002045;font-weight:700;">${img.productName}</span></p>
    </td>`).join("")}
  </tr>
</table>`;

    return {
      subject: `${first}, seu orçamento Orbital está pronto`,
      html: wrap(
        `${p.plates} placas ${p.model} para ${spaceLabel} — ${fmtBRL(p.total)}. Veja todos os detalhes.`,
        `
<p style="font-size:26px;color:#002045;font-weight:700;margin:0 0 6px;font-family:Arial,sans-serif;">${first},</p>
<p style="font-size:24px;color:#002045;font-weight:300;margin:0 0 24px;font-family:Arial,sans-serif;">seu orçamento está aqui.</p>
${productImgBlock}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  ${p.plates} painel${p.plates !== 1 ? "is" : ""} <strong>${p.model} · ${finish}</strong>. ${fmtArea(p.area)} m² ${spaceEm}. Instalação sem obra, em 2 a 3 horas.
</p>
${quoteCard(p)}
${quoteLinkBlock}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:20px 0 4px;font-family:Arial,sans-serif;">
  Nos próximos dias vamos te mandar algumas informações que fazem a diferença antes de você decidir — especialmente sobre o que o clima de Manaus faz com os revestimentos convencionais.
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:12px 0 4px;font-family:Arial,sans-serif;">Qualquer dúvida, fala com a gente:</p>
${cta("Falar com um consultor", wa)}
`
      ),
    };
  }

  // ── STEP 2 — Day 3: O que o clima de Manaus faz com revestimentos ─────────
  if (step === 2) {
    return {
      subject: `${first}, o que o clima de Manaus faz com a maioria dos revestimentos`,
      html: wrap(
        `Tem algo que ninguém te conta na hora da reforma — e que faz toda a diferença aqui em Manaus.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Tem um problema que começa no dia seguinte à reforma, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  Manaus tem uma das maiores taxas de umidade relativa do ar do Brasil — e isso não é detalhe. É o motivo pelo qual revestimentos que duram 15 anos em outras cidades se deterioram aqui em 2, 3 anos.
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">
  A maioria dos materiais absorve umidade constantemente — pelo rejunte, pelas juntas, pela própria estrutura. Aqui em Manaus, com o clima que a gente tem, isso não é detalhe: é o que faz a reforma de hoje virar problema em 2, 3 anos. Rejunte que escurece. Borda que mofa. Material que descola.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">O que torna o PFB diferente nesse clima:</p>
    ${[
      ["Praticamente impermeável", "O material foi desenvolvido para resistir à umidade intensa — não absorve, não incha, não descola. Feito para o Norte do Brasil."],
      ["Anti-mofo e anti-cupim certificado", "Não é argumento de venda — é certificação técnica. O PFB não oferece substrato para desenvolvimento de mofo nem para proliferação de cupim."],
      ["Sem rejunte entre as placas", "Cada painel tem 1,2m × 2,9m. A superfície é contínua — sem as juntas onde a umidade normalmente se acumula e o mofo começa."],
    ].map(([title, desc]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="3" style="background:rgba(255,255,255,0.2);vertical-align:top;"></td>
        <td style="padding:0 0 0 14px;">
          <p style="margin:0 0 4px;color:#ffffff;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
          <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">${desc}</p>
        </td>
      </tr>
    </table>`).join("")}
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">
  É por isso que os painéis Orbital têm certificação técnica de engenharia — projetados especificamente para o clima do Norte do Brasil.
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">
  Ainda tem dúvidas sobre o que o ${p.model} entrega para ${spaceA}? Fala com a gente.
</p>
${cta("Tirar dúvidas agora", wa)}
`
      ),
    };
  }

  // ── STEP 3 — Day 5: O ambiente que você não precisa aguentar ──────────────
  if (step === 3) {
    return {
      subject: `Sabe aquela sensação de abrir ${spaceA} e sentir bafo, ${first}?`,
      html: wrap(
        `Tem uma razão para isso acontecer — e uma razão para não acontecer mais.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Aquele cheiro de fechado tem um culpado, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  Sabe quando você fica alguns dias fora ou passa um tempo sem usar ${spaceA} — e quando volta, tem aquele bafo? Aquela energia pesada, aquele ar úmido?
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  Isso não é só a falta de circulação de ar. É o que os próprios materiais do ambiente absorvem e liberam de volta. Paredes que bebem umidade dia e noite — e soltam quando o ambiente fica fechado.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">O que muda quando ${spaceSubj.toLowerCase()} tem PFB:</p>
    ${[
      ["Ambiente mais seco naturalmente", "Com 0,2% de absorção de umidade, o PFB não retém nem devolve umidade para o ar. O ambiente se mantém mais seco e fresco — mesmo fechado."],
      ["Sem mofo, sem cheiro", "Sem umidade acumulada nos materiais, não tem substrato para mofo se desenvolver. Nem nas juntas, nem atrás dos painéis."],
      ["Superfície fácil de manter limpa", "Pano úmido com sabão neutro. Sem precisar de produtos especiais, sem rejunte para esfregar, sem nada que acumule com o tempo."],
      ["Visual que não envelhece", "O acabamento " + finish + " do " + p.model + " não oxida, não amarela, não descasca. Daqui a 10 anos vai estar exatamente igual ao dia da instalação."],
    ].map(([title, desc]) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="4" style="background:#002045;vertical-align:top;padding-top:4px;"></td>
        <td style="padding:0 0 0 16px;">
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">${desc}</p>
        </td>
      </tr>
    </table>`).join("")}
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">
  São ${fmtArea(p.area)} m² de ${spaceLabel}. Esse é o ambiente que você vai usar todos os dias — e que os seus convidados vão notar.
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Quer ver os painéis ao vivo no nosso showroom antes de decidir?</p>
${cta("Agendar uma visita", wa)}
`
      ),
    };
  }

  // ── STEP 4 — Day 9: Quanto custa reformar duas vezes ──────────────────────
  if (step === 4) {
    const perM2 = p.area > 0 ? p.total / p.area : 0;
    const reformaCheap = Math.round(perM2 * 0.45); // hypothetical cheaper option ~45% of cost
    const reformaDouble = reformaCheap * 2; // double because you do it twice

    return {
      subject: `${first}, quanto custa reformar ${spaceLabel} duas vezes?`,
      html: wrap(
        `A matemática que ninguém mostra antes de você escolher o revestimento.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">A conta que pouca gente faz antes de reformar, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  Opções mais baratas existem. Sempre vão existir. A pergunta certa não é "quanto custa agora" — é "quanto vou gastar ao longo dos próximos 15 anos".
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td width="48%" style="background:#fff5f5;border-top:3px solid #c0392b;padding:20px;vertical-align:top;">
      <p style="margin:0 0 8px;color:#c0392b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Opção convencional</p>
      <p style="margin:0 0 4px;color:#002045;font-size:22px;font-weight:700;font-family:Arial,sans-serif;">Menor agora.</p>
      <p style="margin:0 0 16px;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Em 2–3 anos em Manaus: rejunte escurecido, bordas com mofo, descolamento. Nova reforma necessária.</p>
      <p style="margin:0;color:#c0392b;font-size:12px;font-family:Arial,sans-serif;font-style:italic;">Custo real = material × 2 + mão de obra × 2 + desgaste do ambiente</p>
    </td>
    <td width="4%"></td>
    <td width="48%" style="background:#f0f9eb;border-top:3px solid #3b6934;padding:20px;vertical-align:top;">
      <p style="margin:0 0 8px;color:#3b6934;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Painéis Orbital PFB</p>
      <p style="margin:0 0 4px;color:#002045;font-size:22px;font-weight:700;font-family:Arial,sans-serif;">Uma vez.</p>
      <p style="margin:0 0 16px;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">10+ anos de durabilidade certificada. Anti-mofo, anti-cupim, resistente à umidade. Sem obra, sem retoque, sem refazer.</p>
      <p style="margin:0;color:#3b6934;font-size:12px;font-family:Arial,sans-serif;font-style:italic;">Aprovado com ART/CREA para parede e forro de teto</p>
    </td>
  </tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  Seu orçamento de <strong>${fmtBRL(p.total)}</strong> para ${spacePara} é uma decisão que você faz uma vez. Não tem segunda obra, não tem segunda mão de obra, não tem segundo mês sem usar ${spaceA}.
</p>
${quoteCard(p)}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Tem alguma dúvida sobre o produto antes de decidir?</p>
${cta("Falar com um consultor", wa)}
`
      ),
    };
  }

  // ── STEP 5 — Day 12: dynamic by coupon (architect referral) ───────────────
  // With a coupon the client already has an architect → reinforce why the pro
  // who is guiding them specified Orbital. Without one → show that Orbital
  // delivers a professional result with no architect needed.
  if (step === 5) {
    const items: [string, string][] = [
      ["Painéis de 2,9m × 1,2m", `Cada painel cobre ${fmtArea(3.48)} m² sem uma única emenda. São até 10× menos rejunte que um revestimento 60×60 — e o olho percebe. ${spaceSubj} com superfície contínua parece maior, mais limpa, mais intencional.`],
      ["Certificado ART/CREA", "Aprovação de engenharia civil para parede e forro de teto. Não é material de loja de construção: é produto de obra, com respaldo técnico e um responsável por trás."],
      ["Acabamento fotorrealístico", `O ${finish} do ${p.model} não é uma estampa colada sobre qualquer chapa. É um processo de alta definição que reproduz a textura real da pedra. De longe impressiona; de perto convence.`],
      ["Instalação em horas, não em dias", "Cola PU na parede, cola de contato no teto. Sem quebradeira, sem entulho, sem semana de obra. Um profissional cobre um cômodo inteiro em 2 a 3 horas."],
    ];

    const content = p.hasCoupon
      ? {
          subject: `${first}, sabe por que os arquitetos assinam projetos com a Orbital?`,
          preview: "Quando a reputação do profissional está em jogo, a escolha não é por acaso.",
          headline: `Arquiteto bom nunca aposta em algo em que não confia, ${first}.`,
          intro: `Quando um arquiteto especifica um material, ele assina embaixo — o nome dele fica naquele projeto por anos. Por isso não escolhe pelo mais barato nem pelo mais bonito na foto, e sim pelo que não vai decepcionar depois. O profissional que está te orientando escolheu Orbital pelo mesmo motivo.`,
        }
      : {
          subject: `${first}, quer um resultado de arquiteto sem precisar contratar um?`,
          preview: "Os painéis Orbital foram feitos para entregar um acabamento de alto padrão sem você depender de um projetista.",
          headline: `Um acabamento profissional com resultado de arquiteto, ${first}.`,
          intro: `Nem todo projeto tem um arquiteto por trás — e, com os painéis Orbital, você não precisa de um para ter um resultado de alto padrão. O produto foi pensado para que qualquer ambiente fique sofisticado, mesmo sem um profissional especificando cada detalhe.`,
        };

    return {
      subject: content.subject,
      html: wrap(
        content.preview,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">${content.headline}</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  ${content.intro}
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  ${items.map(([title, desc]) => `
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">${title}</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${desc}</p>
  </td></tr>`).join("")}
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">
  O seu orçamento para ${spacePara} continua de pé. ${p.plates} painel${p.plates !== 1 ? "is" : ""} em estoque aqui em Manaus, prontos para retirada — sem esperar frete de fora.
</p>
${cta("Garantir meu orçamento", wa)}
`
      ),
    };
  }

  // ── STEP 6 — Day 16: O custo de adiar ────────────────────────────────────
  if (step === 6) {
    return {
      subject: `${first}, ${spaceSubj.toLowerCase()} continua igual — e isso tem um custo`,
      html: wrap(
        `Cada mês que passa é mais um mês com o ambiente que você já decidiu mudar.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">${first}, uma pergunta direta.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  Já faz mais de duas semanas desde que você simulou o orçamento para ${spacePara}. Então vou direto ao ponto: o que está faltando para você seguir?
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">
  Na maioria das vezes não é o dinheiro, não é o produto, não é a entrega. É o ritmo da vida — o projeto fica para "depois", e o "depois" vira meses sem ninguém decidir nada.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">O que permanece igual enquanto você decide:</p>
    <p style="margin:16px 0 0;color:#ffffff;font-size:16px;font-weight:300;line-height:1.7;font-family:Arial,sans-serif;font-style:italic;">
      ${spaceSubj} continua como está. A umidade continua trabalhando por trás do revestimento. O material atual continua envelhecendo. E a transformação que você já imaginou continua só na sua cabeça.
    </p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">
  Você já fez a parte difícil — calculou, escolheu o modelo, viu o número. Falta um único passo: falar com a gente e fechar.
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">
  O resultado que você imaginou para ${spacePara} está a uma conversa de distância. A gente confirma o estoque, tira qualquer dúvida e organiza a retirada — você só precisa dizer "vamos".
</p>
${cta("Quero fechar meu orçamento agora", wa)}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Orçamento em aberto: <strong>${fmtBRL(p.total)}</strong> · ${p.plates} painel${p.plates !== 1 ? "is" : ""} ${p.model} · ${fmtArea(p.area)} m²</p>
`
      ),
    };
  }

  // ── STEP 7 — Day 19: Última mensagem ──────────────────────────────────────
  if (step === 7) {
    return {
      subject: `${first}, esta é a nossa última mensagem sobre este orçamento`,
      html: wrap(
        `Não vamos te mandar mais nada sobre este projeto. Mas a porta fica aberta.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Esta é a nossa última mensagem, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  Nas últimas semanas mostramos o que importa de verdade: o que o clima de Manaus faz com revestimento comum, a diferença que os painéis Orbital entregam, e o que significa investir uma vez em vez de duas.
</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">
  A decisão é completamente sua — e a gente respeita isso.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td width="48%" style="background:#f0f9eb;border-top:3px solid #3b6934;padding:20px;vertical-align:top;">
      <p style="margin:0 0 12px;color:#3b6934;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Se você avançar:</p>
      ${[
        fmtArea(p.area) + " m² de " + spaceLabel + " transformados de vez",
        "Um ambiente que não envelhece com o clima de Manaus",
        "Zero obra, zero entulho, resultado em poucas horas",
        "Material com ART/CREA e respaldo técnico",
      ].map(i => `<p style="margin:0 0 8px;color:#43474e;font-size:12px;font-family:Arial,sans-serif;">✓ ${i}</p>`).join("")}
    </td>
    <td width="4%"></td>
    <td width="48%" style="background:#f9f9f7;border-top:3px solid #c8c4be;padding:20px;vertical-align:top;">
      <p style="margin:0 0 12px;color:#74777f;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Se precisar de mais tempo:</p>
      ${[
        "Seu orçamento fica registrado conosco",
        "Quando estiver pronto, é só falar",
        "Retomamos de onde paramos, sem burocracia",
        "A porta Orbital fica sempre aberta",
      ].map(i => `<p style="margin:0 0 8px;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">· ${i}</p>`).join("")}
    </td>
  </tr>
</table>
${quoteCard(p)}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:24px 0 4px;font-family:Arial,sans-serif;">Se este for o momento, estamos aqui:</p>
${cta("Fechar com um consultor", wa)}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">
  Não enviaremos mais mensagens sobre este orçamento após hoje. Obrigado pelo seu tempo, ${first}.
</p>
`
      ),
    };
  }

  // ── STEP 99 — Concluído ────────────────────────────────────────────────────
  if (step === 99) {
    return {
      subject: `${first}, bem-vindo à família Orbital`,
      html: wrap(
        `Você fez a escolha certa. Agora é só aproveitar o resultado.`,
        `
<p style="font-size:26px;color:#002045;font-weight:700;margin:0 0 6px;font-family:Arial,sans-serif;">${first},</p>
<p style="font-size:24px;color:#002045;font-weight:300;margin:0 0 24px;font-family:Arial,sans-serif;">você fez a escolha certa.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  ${fmtArea(p.area)} m² de <strong>${p.model} · ${finish}</strong> para ${spacePara}. Esse ambiente vai ter uma vida completamente diferente do que você está acostumado.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9eb;border-left:3px solid #3b6934;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#3b6934;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">O que acontece agora:</p>
    ${[
      partnerFirst + " vai confirmar todos os detalhes do pedido com você",
      "Verificação de estoque e prazo de retirada",
      "Agendamento da retirada no depósito Orbital em Manaus",
      "Precisando de instalador? A Orbital pode indicar profissionais habilitados",
    ].map((item, i) => `<p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">${i + 1}.</strong> ${item}</p>`).join("")}
  </td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 12px;color:#002045;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">Para os seus painéis durarem décadas:</p>
    ${["Pano úmido com detergente neutro — isso é tudo o que precisa", "Sem produtos abrasivos, sem esponjas de aço, sem ácidos", "Sem manutenção especial, sem retoque, sem rejuntamento periódico"].map(i => `<p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· ${i}</p>`).join("")}
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Dúvidas durante o processo — fala com ${partnerFirst}:</p>
${cta(`Falar com ${partnerFirst}`, wa)}
<p style="color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;font-style:italic;">Obrigado pela confiança, ${first}. Cada projeto é um que acreditamos.</p>
`
      ),
    };
  }

  // ── STEP 98 — Cancelado ────────────────────────────────────────────────────
  if (step === 98) {
    return {
      subject: `Tudo bem, ${first} — a porta fica aberta`,
      html: wrap(
        `Sem pressão, sem julgamento. Quando o momento chegar, a gente retoma de onde paramos.`,
        `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Entendemos, ${first}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">
  O momento certo para um projeto nem sempre é agora — e isso é completamente válido. Não vamos te mandar mais mensagens sobre este orçamento.
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Seu orçamento fica guardado:</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· ${p.model} · ${finish}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· ${p.plates} painel${p.plates !== 1 ? "is" : ""} · ${fmtArea(p.area)} m² para ${spacePara}</p>
    <p style="margin:0 0 20px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· Referência: ${fmtBRL(p.total)}</p>
    <p style="margin:0;color:rgba(255,255,255,0.55);font-size:12px;font-family:Arial,sans-serif;line-height:1.6;">
      Quando o momento chegar — em semanas ou em meses — ${partnerFirst} retoma tudo exatamente de onde paramos. Sem recalcular, sem começar do zero.
    </p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Quando estiver pronto, é só falar:</p>
${cta(`Falar com ${partnerFirst}`, wa)}
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Esta é a última mensagem sobre este orçamento. Obrigado pela atenção, ${first}.</p>
`
      ),
    };
  }

  return { subject: "", html: "" };
}

// ─── Template interpolation ──────────────────────────────────────────────────

/**
 * Replace all {{key}} occurrences in template with the corresponding value.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`;
  });
}

/**
 * Generate a client email from a DB template row, or fall back to the
 * built-in generateClientEmail if no DB row is provided.
 */
export async function generateClientEmailFromTemplate(
  step: number,
  p: EmailParams,
  dbRow: { subject: string; body_html: string } | null
): Promise<{ subject: string; html: string }> {
  if (!dbRow) {
    return generateClientEmail(step, p);
  }

  const first = p.clientName.split(" ")[0];
  const sf = spaceForms(p.space);
  const spaceLabel = sf.label;
  const spacePara = sf.para;
  const finish = FINISH[p.model] || p.model;
  const wa = waLink(p.clientName, p.partnerName, p.model, p.plates);
  const partnerFirst = p.partnerName.split(" ")[0];
  const perM2 = p.area > 0 ? p.total / p.area : 0;
  const perDay = p.total / (20 * 12 * 30);

  const vars: Record<string, string> = {
    firstName: first,
    clientName: p.clientName,
    spaceLabel,
    spacePara,
    spaceEm: sf.em,
    spaceSubj: sf.subj,
    model: p.model,
    finish,
    plates: String(p.plates),
    area: `${fmtArea(p.area)} m²`,
    total: fmtBRL(p.total),
    partnerFirst,
    partnerName: p.partnerName,
    waLink: wa,
    quoteCard: quoteCard(p),
    perM2: fmtBRL(perM2),
    perDay: fmtBRL(Math.ceil(perDay)),
  };

  const subject = interpolate(dbRow.subject, vars);
  const bodyHtml = interpolate(dbRow.body_html, vars);
  const html = wrap(subject, bodyHtml);

  return { subject, html };
}
