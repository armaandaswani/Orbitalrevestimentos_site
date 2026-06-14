/**
 * SM Click (WhatsApp multi-attendance) API client.
 *
 * SM Click authenticates every request with a single `X-API-KEY` header.
 * The base URL ("gtw_url" in the published Postman collection) and the
 * sending instance id are NOT discoverable from the public docs — they live
 * in the account's SM Click panel (Integrações e Documentação API). Configure:
 *
 *   SMCLICK_API_URL      base gateway URL, e.g. https://api.smclick.com.br
 *   SMCLICK_API_KEY      the account API key (X-API-KEY header)
 *   SMCLICK_INSTANCE_ID  the WhatsApp instance to send messages from
 *   SMCLICK_DEFAULT_TAGS optional comma-separated tag ids applied to pushed contacts
 *   SMCLICK_WEBHOOK_SECRET  shared secret the inbound webhook must present
 *
 * Every function is defensive: it returns a typed result and never throws, so
 * callers (lead capture, reminder cron, etc.) can treat SM Click as best-effort.
 */

const API_URL = () => (process.env.SMCLICK_API_URL || "").replace(/\/+$/, "");
const API_KEY = () => process.env.SMCLICK_API_KEY || "";
const INSTANCE_ID = () => process.env.SMCLICK_INSTANCE_ID || "";

export function smclickConfigured(): boolean {
  return Boolean(API_URL() && API_KEY());
}

export function smclickDefaultTags(): string[] {
  return (process.env.SMCLICK_DEFAULT_TAGS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SmClickResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Normalize a phone number into the digits-only international form SM Click
 * expects (e.g. "5592999998888"). Best-effort for Brazilian numbers:
 *  - strips everything but digits
 *  - drops a leading "00" international prefix
 *  - prepends Brazil's country code (55) when a bare 10/11-digit local number
 *    is given. Returns null when there aren't enough digits to be a real number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D+/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length < 8) return null;
  // 10 (landline) or 11 (mobile) digits without a country code → assume Brazil.
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
}

async function call<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<SmClickResult<T>> {
  if (!smclickConfigured()) {
    return { ok: false, status: 0, error: "SM Click não configurado (SMCLICK_API_URL / SMCLICK_API_KEY)." };
  }
  try {
    const res = await fetch(`${API_URL()}${path}`, {
      method,
      headers: {
        "X-API-KEY": API_KEY(),
        ...(body != null ? { "Content-Type": "application/json" } : {}),
      },
      ...(body != null ? { body: JSON.stringify(body) } : {}),
    });
    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && "message" in data
          ? String((data as Record<string, unknown>).message)
          : null) || `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: msg, data: data as T };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "erro de rede" };
  }
}

// ── Instances ───────────────────────────────────────────────────────────────

export function listInstances(): Promise<SmClickResult> {
  return call("GET", "/instances");
}

// ── Contacts ──────────────────────────────────────────────────────────────-

export interface CreateContactInput {
  name: string;
  telephone: string; // already normalized
  tags?: string[];
}

/** POST /contacts — create (or, in SM Click, upsert) a contact. */
export function createContact(input: CreateContactInput): Promise<SmClickResult<{ id?: string; _id?: string }>> {
  return call("POST", "/contacts", {
    name: input.name,
    telephone: input.telephone,
    tags: input.tags ?? [],
  });
}

export function updateContact(
  contactId: string,
  patch: Partial<CreateContactInput>
): Promise<SmClickResult> {
  return call("PATCH", `/contacts/${encodeURIComponent(contactId)}/`, patch);
}

export function listContacts(): Promise<SmClickResult> {
  return call("GET", "/contacts");
}

export function assignTag(contactId: string, tagId: string): Promise<SmClickResult> {
  return call("POST", `/contacts/${encodeURIComponent(contactId)}/tag/${encodeURIComponent(tagId)}/`);
}

// ── Messages ────────────────────────────────────────────────────────────────

/** POST /instances/messages — send a plain text WhatsApp message. */
export function sendText(telephone: string, message: string): Promise<SmClickResult> {
  const instance = INSTANCE_ID();
  if (!instance) {
    return Promise.resolve({ ok: false, status: 0, error: "SMCLICK_INSTANCE_ID não configurado." });
  }
  return call("POST", "/instances/messages", {
    instance,
    type: "text",
    content: { telephone, message },
  });
}

/** POST /instances/messages — send an approved WhatsApp template message. */
export function sendTemplate(
  telephone: string,
  templateName: string,
  variables?: Record<string, string>
): Promise<SmClickResult> {
  const instance = INSTANCE_ID();
  if (!instance) {
    return Promise.resolve({ ok: false, status: 0, error: "SMCLICK_INSTANCE_ID não configurado." });
  }
  return call("POST", "/instances/messages", {
    instance,
    type: "template",
    content: { telephone, template: templateName, variables: variables ?? {} },
  });
}

/** Pull a contact id out of SM Click's create/update response, whatever its shape. */
export function extractContactId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const candidate = o.id ?? o._id ?? o.contact_id ?? (o.contact as Record<string, unknown> | undefined)?.id;
  return candidate != null ? String(candidate) : null;
}
