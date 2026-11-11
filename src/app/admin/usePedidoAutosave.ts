"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PEDIDO_DEVICE_KEY, deleteEditorDraft, isEditorContent, readEditorDrafts, writeEditorDraft, type EditorContent, type SavedEditorDraft } from "@/lib/pedido-draft-storage";

type SaveState = { kind: "saving" | "saved" | "local" | "error" | "conflict"; at?: string };
export function usePedidoAutosave(content: EditorContent | null, onRestore: (record: SavedEditorDraft) => void, blocked = false) {
  const [status, setStatus] = useState<SaveState>({ kind: "saving" });
  const [recoverable, setRecoverable] = useState<SavedEditorDraft[]>([]);
  const device = useRef("");
  const current = useRef<SavedEditorDraft | null>(null);
  const restore = useRef(onRestore);
  const active = useRef(content);
  const request = useRef<Promise<void> | null>(null);
  const stopped = useRef(new Set<string>());
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);
  const blockedRef = useRef(blocked);
  const localAvailable = useRef(true);
  const syncAgain = useRef<() => void>(() => {});
  const persist = useCallback((record: SavedEditorDraft) => {
    try { writeEditorDraft(localStorage, record); localAvailable.current = true; return true; }
    catch { localAvailable.current = false; return false; }
  }, []);
  useLayoutEffect(() => { restore.current = onRestore; active.current = content; blockedRef.current = blocked; });

  const sync = useCallback(async (keepalive = false): Promise<void> => {
    if (request.current) return request.current;
    const record = current.current;
    if (!record || stopped.current.has(record.id)) return;
    const serialized = JSON.stringify(record.content);
    if (record.synced === serialized) return;
    setStatus({ kind: "saving" });
    let acknowledged = false;
    const work = (async () => {
      try {
        const body = JSON.stringify({ id: record.id, device_id: record.device_id, content: record.content, revision: record.revision });
        const response = await fetch(`/api/admin/pedido-drafts/${record.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body,
          ...(keepalive && body.length < 55_000 ? { keepalive: true } : {}), signal: AbortSignal.timeout(12_000) });
        if (!response.ok) {
          if (response.status === 409 && current.current?.id === record.id) {
            // A reload can lose the ACK of an accepted write. Reconcile it first.
            const lookup = await fetch(`/api/admin/pedido-drafts?device_id=${record.device_id}`);
            const remote = lookup.ok ? (await lookup.json()).drafts?.find((r: SavedEditorDraft) => r.id === record.id) : null;
            if (remote && JSON.stringify(remote.content) === serialized) {
              const next = { ...current.current, revision: remote.revision, synced: serialized };
              current.current = next; persist(next); acknowledged = true;
              setStatus({ kind: JSON.stringify(next.content) === serialized ? "saved" : "saving", at: remote.updated_at });
              return;
            }
            // Preserve both versions instead of overwriting work from another tab.
            const copy: SavedEditorDraft = { ...current.current, id: crypto.randomUUID(), revision: 0, synced: undefined, updated_at: new Date().toISOString() };
            copy.content = { ...copy.content, draft: { ...copy.content.draft, _autosaveId: copy.id } };
            current.current = copy; persist(copy); restore.current(copy);
            setStatus({ kind: "saving" });
            return;
          }
          if (current.current?.id === record.id) setStatus({ kind: localAvailable.current ? "local" : "error", at: current.current.updated_at });
          return;
        }
        const saved = await response.json();
        if (!Number.isSafeInteger(saved.revision) || saved.revision < 1 || typeof saved.updated_at !== "string") throw new Error("Invalid draft acknowledgement");
        acknowledged = true;
        if (stopped.current.has(record.id)) {
          await fetch(`/api/admin/pedido-drafts/${record.id}?device_id=${record.device_id}`, { method: "DELETE" });
          return;
        }
        // An older response acknowledges its own revision, never replaces newer typing.
        const latest = current.current?.id === record.id ? current.current : readEditorDrafts(localStorage).find((r) => r.id === record.id);
        if (!latest) return;
        const next = { ...latest, revision: saved.revision, synced: serialized };
        persist(next);
        if (current.current?.id === record.id) {
          current.current = next;
          setStatus(JSON.stringify(next.content) === serialized ? { kind: "saved", at: saved.updated_at } : { kind: "saving" });
        }
      } catch { if (current.current?.id === record.id) setStatus({ kind: localAvailable.current ? "local" : "error", at: current.current.updated_at }); }
    })();
    request.current = work;
    await work;
    request.current = null;
    // Debounce may have fired during the request. Drain newer typing in order.
    if (current.current && (acknowledged || current.current.id !== record.id) && current.current.synced !== JSON.stringify(current.current.content)) syncAgain.current();
  }, [persist]);
  useLayoutEffect(() => { syncAgain.current = () => { void sync(); }; }, [sync]);

  useEffect(() => {
    device.current ||= crypto.randomUUID();
    try {
      device.current = localStorage.getItem(PEDIDO_DEVICE_KEY) || crypto.randomUUID();
      localStorage.setItem(PEDIDO_DEVICE_KEY, device.current);
      const local = readEditorDrafts(localStorage);
      hydrated.current = true;
      queueMicrotask(() => {
        setRecoverable(local);
        if (!active.current && !blockedRef.current && local[0]?.open) restore.current(local[0]);
      });
      fetch(`/api/admin/pedido-drafts?device_id=${device.current}`).then(async (r) => r.ok ? r.json() : null).then((data) => {
        if (!data?.drafts || !Array.isArray(data.drafts)) return;
        for (const remote of data.drafts) {
          if (!isEditorContent(remote.content) || stopped.current.has(remote.id)) continue;
          const local = readEditorDrafts(localStorage).find((r) => r.id === remote.id);
          if (local) {
            if (remote.revision > local.revision && local.synced === JSON.stringify(local.content)) {
              const next = { ...remote, open: local.open, synced: JSON.stringify(remote.content) };
              persist(next);
              if (current.current?.id === local.id && JSON.stringify(current.current.content) === JSON.stringify(local.content)) {
                current.current = next;
                restore.current(next);
                setStatus({ kind: "saved", at: remote.updated_at });
              }
              continue;
            }
            if (JSON.stringify(local.content) === JSON.stringify(remote.content)) {
              const next = { ...local, revision: Math.max(local.revision, remote.revision), synced: JSON.stringify(remote.content) };
              persist(next);
              if (current.current?.id === next.id && JSON.stringify(current.current.content) === next.synced) {
                current.current = { ...current.current, revision: next.revision, synced: next.synced };
                setStatus({ kind: "saved", at: remote.updated_at });
              }
            }
            continue;
          }
          persist({ ...remote, open: false, synced: JSON.stringify(remote.content) });
        }
        const all = readEditorDrafts(localStorage);
        setRecoverable(all);
      }).catch(() => {});
    } catch { hydrated.current = true; queueMicrotask(() => setStatus({ kind: "error" })); }
    const flush = () => { if (document.visibilityState === "hidden") void sync(true); };
    const retry = () => { if (document.visibilityState === "visible") void sync(); };
    const pagehide = () => { void sync(true); };
    document.addEventListener("visibilitychange", flush);
    document.addEventListener("visibilitychange", retry);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("online", retry);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
      void sync(true);
      document.removeEventListener("visibilitychange", flush);
      document.removeEventListener("visibilitychange", retry);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("online", retry);
    };
  }, [sync, persist]);

  // Layout effect persists each committed keystroke before paint or app switching.
  useLayoutEffect(() => {
    if (!content || !hydrated.current) return;
    const id = String(content.draft._autosaveId || "");
    if (!id || stopped.current.has(id)) return;
    try {
      const previous = current.current?.id === id ? current.current : readEditorDrafts(localStorage).find((r) => r.id === id);
      const serialized = JSON.stringify(content);
      if (previous && JSON.stringify(previous.content) === serialized) {
        current.current = { ...previous, open: true };
        const localOk = persist(current.current);
        setStatus(previous.synced === serialized ? { kind: "saved", at: previous.updated_at } : { kind: localOk ? "saving" : "error", at: previous.updated_at });
        if (previous.synced !== serialized) timeout.current = setTimeout(() => { void sync(); }, 1000);
        return;
      }
      const record: SavedEditorDraft = { id, device_id: device.current, content, revision: previous?.revision ?? 0, updated_at: new Date().toISOString(), open: true, synced: previous?.synced };
      current.current = record;
      const localOk = persist(record);
      setStatus({ kind: localOk ? "saving" : "error", at: record.updated_at });
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => { void sync(); }, 1000);
    } catch { setStatus({ kind: "error" }); }
  }, [content, sync, persist]);

  const clear = useCallback((id: string) => {
    stopped.current.add(id);
    if (current.current?.id === id) current.current = null;
    try { deleteEditorDraft(localStorage, id); setRecoverable(readEditorDrafts(localStorage)); } catch { /* report on the next edit */ }
    void fetch(`/api/admin/pedido-drafts/${id}?device_id=${device.current}`, { method: "DELETE" }).catch(() => {});
  }, []);
  const close = useCallback(() => {
    if (current.current) {
      current.current = { ...current.current, open: false };
      try { writeEditorDraft(localStorage, current.current); setRecoverable(readEditorDrafts(localStorage)); } catch { setStatus({ kind: "error" }); }
      void sync();
    }
  }, [sync]);
  return { status, recoverable, clear, close, retry: sync };
}
