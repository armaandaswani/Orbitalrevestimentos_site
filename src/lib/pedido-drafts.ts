/** Incomplete editor state only. Never an order, inventory operation, or message. */
export const MAX_PEDIDO_DRAFT_BYTES = 250 * 1024;
export const PEDIDO_DRAFT_COLUMNS = "id,device_id,content,revision,updated_at";
export const isDraftUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function validPedidoDraftContent(value: unknown): value is Record<string, unknown> {
  if (!record(value) || !record(value.draft) || !Array.isArray(value.items) || value.items.length > 1000 || !value.items.every(record)) return false;
  if (!Number.isInteger(value.step) || Number(value.step) < 1 || Number(value.step) > 4 || (value.ui !== undefined && !record(value.ui))) return false;
  if (Object.keys(value).some((key) => !["draft", "items", "step", "ui"].includes(key))) return false;
  function safe(node: unknown, depth: number): boolean {
    if (depth > 30) return false;
    if (node === null || typeof node === "string" || typeof node === "boolean") return true;
    if (typeof node === "number") return Number.isFinite(node);
    if (Array.isArray(node)) return node.every((child) => safe(child, depth + 1));
    if (record(node)) return Object.entries(node).every(([key, child]) => !["__proto__", "prototype", "constructor"].includes(key) && safe(child, depth + 1));
    return false;
  }
  return safe(value, 0) && new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_PEDIDO_DRAFT_BYTES;
}
/** Limit actual streamed bytes, including requests without Content-Length. */
export async function readPedidoDraftBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_PEDIDO_DRAFT_BYTES) throw new Error("TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_PEDIDO_DRAFT_BYTES) { await reader.cancel(); throw new Error("TOO_LARGE"); }
    chunks.push(chunk.value);
  }
  const buffer = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); } catch { throw new Error("INVALID_JSON"); }
}
