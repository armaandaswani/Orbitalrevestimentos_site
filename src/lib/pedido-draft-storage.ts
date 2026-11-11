/** Local recovery is written before the network debounce, including incomplete forms. */
export const PEDIDO_DRAFT_KEY = "orbital:pedido-drafts:v1";
export const PEDIDO_DEVICE_KEY = "orbital:pedido-device:v1";
export type EditorContent = { draft: Record<string, unknown>; items: Record<string, unknown>[]; step: number; ui: Record<string, unknown> };
export type SavedEditorDraft = { id: string; device_id: string; content: EditorContent; revision: number; updated_at: string; open: boolean; synced?: string };
export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function isEditorContent(value: unknown): value is EditorContent {
  if (!value || typeof value !== "object") return false;
  const v = value as EditorContent;
  return !!v.draft && typeof v.draft === "object" && !Array.isArray(v.draft) && Array.isArray(v.items) && v.items.length <= 500 && Number.isInteger(v.step) && v.step >= 1 && v.step <= 4 && !!v.ui && typeof v.ui === "object";
}
export function readEditorDrafts(storage: DraftStorage, now = Date.now()): SavedEditorDraft[] {
  try {
    const rows = JSON.parse(storage.getItem(PEDIDO_DRAFT_KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter((r): r is SavedEditorDraft => r && typeof r.id === "string" && isEditorContent(r.content) && Number.isFinite(Date.parse(r.updated_at)) && now - Date.parse(r.updated_at) < 30 * 86400_000).sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 10);
  } catch { return []; }
}
export function writeEditorDraft(storage: DraftStorage, record: SavedEditorDraft): void {
  const records = [record, ...readEditorDrafts(storage).filter((r) => r.id !== record.id)].slice(0, 10);
  storage.setItem(PEDIDO_DRAFT_KEY, JSON.stringify(records));
}
export function deleteEditorDraft(storage: DraftStorage, id: string): void {
  storage.setItem(PEDIDO_DRAFT_KEY, JSON.stringify(readEditorDrafts(storage).filter((r) => r.id !== id)));
}
