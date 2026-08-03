// Régua de e-mails do orçamento.
//
// O CONTEÚDO dos 7 passos vive em @/lib/drip-steps — fonte única, lida também
// pelo painel. Aqui ficam o envio, a interpolação dos tokens e os dois e-mails
// transacionais que não fazem parte da régua:
//   passo 99 → venda concluída
//   passo 98 → orçamento encerrado
//
// Calendário atual (dias desde a simulação): 0, 4, 10, 17, 23, 30 e 60.

import { DRIP_DELAYS, DRIP_STEPS } from "@/lib/drip-steps";

const WA_PHONE = "5592988150149";

// Espera até o PRÓXIMO passo, derivada da régua (@/lib/drip-steps) para não
// existirem dois calendários. Hoje: dias 0, 4, 10, 17, 23, 30 e 60.
export const STEP_DELAYS_DAYS: Record<number, number> = DRIP_DELAYS;

export const TOTAL_STEPS = 7;

/**
 * Passos DESLIGADOS — não são enviados a ninguém.
 *
 * Vale acima do banco E do conteúdo padrão: apagar a linha de
 * email_campaign_steps não bastaria, porque o envio cai no texto do código.
 *
 * Vazio hoje. O passo 4 esteve aqui enquanto mostrava o custo por m² acima da
 * faixa de preço dos convencionais — apresentando o PFB como o mais caro. Foi
 * reescrito em @/lib/drip-steps e voltou.
 */
export const DISABLED_STEPS = new Set<number>([]);

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
      <tr><td style="color:rgba(255,255,255,0.55);font-size:12px;padding-bottom:8px;font-family:Arial,sans-serif;">Modelo</td><td style="color:#ffffff;font-size:12px;font-weight:700;text-align:right;padding-bottom:8px;font-family:Arial,sans-serif;">${finish && finish !== p.model ? `${p.model} · ${finish}` : p.model}</td></tr>
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

/**
 * Tokens da régua — usados tanto pelo texto do banco quanto pelo padrão do
 * código, para os dois renderizarem exatamente igual.
 *
 * Não expõe custo por m² nem custo por dia: a comparação do PFB é por custo
 * total de aplicação (AGENTS.md), e foi por expor R$/m² que o passo 4 antigo
 * apresentava o produto como o mais caro.
 */
function templateVars(
  p: EmailParams,
  ctx: { first: string; spaceLabel: string; spacePara: string; spaceEm: string; spaceSubj: string; finish: string; wa: string; partnerFirst: string },
): Record<string, string> {
  return {
    firstName: ctx.first,
    clientName: p.clientName,
    spaceLabel: ctx.spaceLabel,
    spacePara: ctx.spacePara,
    spaceEm: ctx.spaceEm,
    spaceSubj: ctx.spaceSubj,
    model: p.model,
    finish: ctx.finish,
    plates: String(p.plates),
    area: `${fmtArea(p.area)} m²`,
    total: fmtBRL(p.total),
    partnerFirst: ctx.partnerFirst,
    partnerName: p.partnerName,
    waLink: ctx.wa,
    quoteCard: quoteCard(p),
    quoteLink: quoteLinkBlock(p),
    productImages: productImagesBlock(p),
  };
}

/** Botão para o orçamento completo; vazio quando o link não existe. */
function quoteLinkBlock(p: EmailParams): string {
  if (!p.quoteUrl) return "";
  return `
<table cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0;border:1px solid #e2e2e2;">
  <tr><td style="padding:18px 22px;">
    <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#74777f;font-family:Arial,sans-serif;">Orçamento completo</p>
    <p style="margin:0 0 12px;font-size:13px;color:#43474e;font-family:Arial,sans-serif;line-height:1.6;">Fotos, especificações e o detalhamento do projeto.</p>
    <a href="${p.quoteUrl}" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:13px 26px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Abrir orçamento</a>
  </td></tr>
</table>`;
}

/** Até três fotos do modelo escolhido; vazio quando não há imagem. */
function productImagesBlock(p: EmailParams): string {
  const imgs = (p.productImages ?? []).filter((i) => i.imageUrl).slice(0, 3);
  if (imgs.length === 0) return "";
  const w = imgs.length === 1 ? "100%" : imgs.length === 2 ? "49%" : "32%";
  const cells = imgs
    .map((i) => `<td width="${w}" style="padding:0 1%;"><img src="${i.imageUrl}" alt="${p.model}" width="100%" style="display:block;width:100%;border:0;"></td>`)
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>${cells}</tr></table>`;
}

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

  // Passos 1..7: renderizados a partir da régua única (@/lib/drip-steps). Antes
  // havia uma segunda cópia do texto aqui, que divergia do painel e continuava
  // sendo enviada quando o banco não tinha a linha.
  const dripStep = DRIP_STEPS.find((d) => d.step_number === step);
  if (dripStep) {
    const vars = templateVars(p, { first, spaceLabel, spacePara, spaceEm, spaceSubj, finish, wa, partnerFirst });
    const subject = interpolate(dripStep.subject, vars);
    return { subject, html: wrap(subject, interpolate(dripStep.body_html, vars)) };
  }

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
      "Agendamento da retirada no depósito da Orbital em Manaus",
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
  const vars = templateVars(p, { first, spaceLabel, spacePara, spaceEm: sf.em, spaceSubj: sf.subj, finish, wa, partnerFirst });

  const subject = interpolate(dbRow.subject, vars);
  const bodyHtml = interpolate(dbRow.body_html, vars);
  const html = wrap(subject, bodyHtml);

  return { subject, html };
}
