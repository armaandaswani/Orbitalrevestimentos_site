/**
 * Who is this e-mail/phone among the architects we already know? Used when a meeting reaches the CRM
 * (booked by Ste, or created by the owner in Google Calendar with the architect as a guest).
 * Order: registered partner → prospect already in the rep's CRM → the professionals sheet (aniversarios).
 * Site leads are end clients, not architects, so they are not searched here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ArquitetoMatch = {
  base: "parceiro" | "crm" | "aniversarios" | "novo";
  via: "email" | "telefone" | "nome" | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  profession: string | null;
  office: string | null;
  partnerId: string | null;
  crmId: string | null;
  ref: string | null; // aniversarios.ref (P001…)
};

export type CrmRow = { id: string; partner_id: string | null; stage: string; first_contact_at: string | null; prospect_name: string | null; prospect_phone: string | null; prospect_email: string | null };

// "Arq. Thaís Dias" / "THAIS DIAS" → ["thais", "dias"] (accents, titles and "de/da/dos" out).
const nameTokens = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/^\s*(arq(uitet[ao])?|arq[ªº]|designer|eng(enheir[ao])?)\.?\s+/, "")
    .split(/[^a-z]+/).filter((t) => t.length > 1 && !["de", "da", "do", "das", "dos", "e"].includes(t));
/**
 * The calendar title has the person's name ("Thaís Dias"); the base may have the full name ("Thaís Dias
 * Ferreira"). Same first name and the title's last name somewhere in the base name. Needs two names in the
 * title, and the match must be the only one in that base: a namesake stays a new contact instead of a guess.
 */
export function sameName(title: unknown, full: unknown): boolean {
  const a = nameTokens(title), b = nameTokens(full);
  return a.length >= 2 && b.length >= 2 && a[0] === b[0] && b.slice(1).includes(a[a.length - 1]);
}
function onlyOne<T>(list: T[], pick: (x: T) => unknown, title: string): T | null {
  const hits = list.filter((x) => sameName(title, pick(x)));
  return hits.length === 1 ? hits[0] : null;
}

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
// Brazilian numbers come with or without 55 and the 9th digit: compare the last 8.
export const samePhone = (a: unknown, b: unknown) => {
  const x = digits(a), y = digits(b);
  return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8);
};
// Saved without ".com" by hand ("fulano@gmail"): a calendar invite always has the full address.
const BARE_PROVIDERS = new Set(["gmail", "hotmail", "outlook", "icloud", "yahoo", "live"]);
// Gmail ignores dots and +tags; everyone else only case.
export function normEmail(e: unknown): string {
  const v = String(e ?? "").trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return v;
  let [user, domain] = [v.slice(0, at), v.slice(at + 1)];
  if (BARE_PROVIDERS.has(domain)) domain += ".com";
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") user = user.split("+")[0].replace(/\./g, "");
  return `${user}@${domain}`;
}
const sameEmail = (a: unknown, b: unknown) => !!a && !!b && normEmail(a) === normEmail(b);

type PartnerRow = { id: string; name: string | null; email: string | null; phone: string | null; profession: string | null };
type SheetRow = { id: string; ref: string | null; nome: string | null; profissao: string | null; escritorio: string | null; whatsapp: string | null; email: string | null };

/**
 * Tries each e-mail in the order given (the first guest wins), then the phone, then the name typed in the
 * calendar title. `crmRows` are the rep's CRM rows, already loaded by the caller.
 * `knownEmail` is what the base has (may differ from the invite); `sheetId` (aniversarios.id) lets the caller save the invite e-mail the sheet was missing.
 */
export async function matchArquiteto(db: SupabaseClient, emails: string[], phone: string, crmRows: CrmRow[], name = ""): Promise<ArquitetoMatch & { sheetId: string | null; knownEmail: string | null }> {
  const list = emails.map((e) => e.trim()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  const guest = list[0] ?? null;
  const none = { base: "novo" as const, via: null, email: guest, name: null, phone: phone || null, profession: null, office: null, partnerId: null, crmId: null, ref: null, sheetId: null, knownEmail: null };
  if (!list.length && !phone && !name) return none;

  const { data: p } = await db.from("partners").select("id, name, email, phone, profession");
  const { data: s } = await db.from("aniversarios").select("id, ref, nome, profissao, escritorio, whatsapp, email").eq("ativo", true);
  const partners = (p ?? []) as PartnerRow[], sheet = (s ?? []) as SheetRow[];
  const prospects = crmRows.filter((r) => !r.partner_id);

  type Via = "email" | "telefone" | "nome";
  const ofPartner = (x: PartnerRow, via: Via, email: string | null) =>
    ({ ...none, base: "parceiro" as const, via, email: email || x.email, name: x.name, phone: x.phone || phone || null, profession: x.profession, partnerId: x.id, crmId: crmRows.find((r) => r.partner_id === x.id)?.id ?? null, knownEmail: x.email });
  const ofCrm = (x: CrmRow, via: Via, email: string | null) =>
    ({ ...none, base: "crm" as const, via, email: email || x.prospect_email, name: x.prospect_name, phone: x.prospect_phone || phone || null, crmId: x.id, knownEmail: x.prospect_email });
  const ofSheet = (x: SheetRow, via: Via, email: string | null) => {
    const ph = x.whatsapp || phone || null;
    // Someone from the sheet may already be a CRM prospect (same phone or same name).
    const crm = prospects.find((r) => (ph && samePhone(r.prospect_phone, ph)) || (x.nome && sameName(x.nome, r.prospect_name)));
    return { ...none, base: "aniversarios" as const, via, email: email || x.email, name: x.nome, phone: ph, profession: x.profissao, office: x.escritorio, crmId: crm?.id ?? null, ref: x.ref, sheetId: x.id, knownEmail: x.email };
  };

  for (const e of list) {
    const a = partners.find((x) => sameEmail(x.email, e)); if (a) return ofPartner(a, "email", e);
    const b = prospects.find((x) => sameEmail(x.prospect_email, e)); if (b) return ofCrm(b, "email", e);
    const c = sheet.find((x) => sameEmail(x.email, e)); if (c) return ofSheet(c, "email", e);
  }
  if (phone) {
    const a = partners.find((x) => samePhone(x.phone, phone)); if (a) return ofPartner(a, "telefone", guest);
    const b = prospects.find((x) => samePhone(x.prospect_phone, phone)); if (b) return ofCrm(b, "telefone", guest);
    const c = sheet.find((x) => samePhone(x.whatsapp, phone)); if (c) return ofSheet(c, "telefone", guest);
  }
  if (name) {
    const a = onlyOne(partners, (x) => x.name, name); if (a) return ofPartner(a, "nome", guest);
    const b = onlyOne(prospects, (x) => x.prospect_name, name); if (b) return ofCrm(b, "nome", guest);
    const c = onlyOne(sheet, (x) => x.nome, name); if (c) return ofSheet(c, "nome", guest);
  }
  return none;
}
