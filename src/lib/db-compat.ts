/**
 * Schema-compat helpers. Lets new code ship before its migration has run on a
 * given environment: a query that references a not-yet-created column or table
 * can detect that specific failure and fall back, instead of 500-ing a feature
 * that worked before. Mirrors the column-fallback pattern already used in
 * /api/admin/clients.
 */

type DbError = { code?: string | null; message?: string | null } | null | undefined;

/** True when the error is "column does not exist" (Postgres 42703 / PostgREST schema-cache miss). */
export function isMissingColumn(e: DbError): boolean {
  if (!e) return false;
  const code = e.code ?? "";
  const msg = (e.message ?? "").toLowerCase();
  if (code === "42703" || code === "PGRST204") return true;
  return msg.includes("column") && (msg.includes("does not exist") || msg.includes("not found") || msg.includes("schema cache"));
}

/** True when the error is "relation/table does not exist" (Postgres 42P01 / PostgREST schema-cache miss). */
export function isMissingTable(e: DbError): boolean {
  if (!e) return false;
  const code = e.code ?? "";
  const msg = (e.message ?? "").toLowerCase();
  if (code === "42P01" || code === "PGRST205") return true;
  if (msg.includes("relation") && msg.includes("does not exist")) return true;
  return msg.includes("table") && (msg.includes("not found") || msg.includes("does not exist") || msg.includes("schema cache"));
}
