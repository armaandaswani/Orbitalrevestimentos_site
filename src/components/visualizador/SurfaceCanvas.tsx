"use client";

// Foto do ambiente com as áreas marcadas por cima (máscara, polígono, caixa e
// rótulo de cada zona). Movida do VisualizadorWizard sem mudar o desenho nem os
// gestos. Com `interativo` falso a foto é uma imagem comum: nenhum handler de
// toque, clique ou ponteiro, sem touch-action:none e sem botões, para a rolagem
// da página passar por cima dela (fora do editor de marcação).
import React, { useRef, useState } from "react";
import type { Quad } from "@/lib/texture-projection";
import type { Rect, Zone } from "../VisualizadorWizard";
import { ZONE_COLORS } from "./fluxo";

export type ZoneMode = "tap" | "draw";

export default function SurfaceCanvas({
  photoData, zones, activeZoneId, setActiveZoneId, mode: modoPedido, onTapPhoto, onDrawRect, updateZone, busy, retargeting, onConfirmQuad,
  interativo, rotulos, destaque = "todas",
}: {
  photoData: string; zones: Zone[]; activeZoneId: string | null; setActiveZoneId: (id: string | null) => void;
  mode: ZoneMode; onTapPhoto: (nx: number, ny: number) => void; onDrawRect: (rect: Rect) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void; busy: boolean; retargeting: boolean;
  onConfirmQuad: (id: string) => void;
  /** Falso fora do editor: a foto vira imagem comum e a rolagem passa por cima. */
  interativo: boolean;
  /** Nome de cada área para o cliente (Parede 1…), na ordem das zonas; sem ele, o label. */
  rotulos?: string[];
  /**
   * "atual": só a área ativa com cor cheia, as outras quase apagadas e nenhum
   * rótulo de texto (faixa da foto do Acabamento no celular). Padrão "todas".
   */
  destaque?: "todas" | "atual";
}) {
  const soAtual = destaque === "atual";
  // Sem interação não há desenho: as caixas ficam paradas e sem alças.
  const mode: ZoneMode = interativo ? modoPedido : "tap";
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<null | { kind: "create"; sx: number; sy: number } | { kind: "move"; id: string; offX: number; offY: number; w: number; h: number } | { kind: "resize"; id: string; x: number; y: number } | { kind: "corner"; id: string; idx: number }>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  const draftRef = useRef<Rect | null>(null);
  const setDraftBoth = (r: Rect | null) => { draftRef.current = r; setDraft(r); };

  const norm = (cx: number, cy: number) => {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (cx - r.left) / r.width)), y: Math.min(1, Math.max(0, (cy - r.top) / r.height)) };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode !== "tap") return;
    const p = norm(e.clientX, e.clientY);
    onTapPhoto(p.x, p.y);
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (mode !== "draw") return;
    const p = norm(e.clientX, e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { kind: "create", sx: p.x, sy: p.y };
    setDraftBoth({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = norm(e.clientX, e.clientY);
    if (d.kind === "create") {
      setDraftBoth({ x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) });
    } else if (d.kind === "move") {
      updateZone(d.id, { rect: { x: Math.min(1 - d.w, Math.max(0, p.x - d.offX)), y: Math.min(1 - d.h, Math.max(0, p.y - d.offY)), w: d.w, h: d.h } });
    } else if (d.kind === "resize") {
      updateZone(d.id, { rect: { x: d.x, y: d.y, w: Math.max(0.03, Math.min(1 - d.x, p.x - d.x)), h: Math.max(0.03, Math.min(1 - d.y, p.y - d.y)) } });
    } else if (d.kind === "corner") {
      const zone = zones.find((z) => z.id === d.id);
      if (zone?.quad) {
        const nq = zone.quad.map((pt, i) => (i === d.idx ? ([p.x, p.y] as [number, number]) : pt)) as Quad;
        updateZone(d.id, { quad: nq });
      }
    }
  };
  const onPointerUp = () => {
    const d = drag.current;
    const f = draftRef.current;
    if (d?.kind === "create" && f && f.w > 0.03 && f.h > 0.03) onDrawRect(f);
    drag.current = null; setDraftBoth(null);
  };

  return (
    <div ref={ref} data-surface-canvas data-interativo={interativo ? "" : undefined}
      {...(interativo ? {
        onClick: handleClick, onPointerDown: onBgPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp,
        style: { WebkitTouchCallout: "none", WebkitUserSelect: "none", touchAction: "none" } as React.CSSProperties,
      } : {})}
      className={interativo
        ? `relative bg-[#11151b] rounded-sm overflow-hidden select-none touch-none ${mode === "draw" || retargeting ? "cursor-crosshair" : "cursor-pointer"}`
        : "relative bg-[#11151b] rounded-sm overflow-hidden"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoData} alt="Seu ambiente" className={`block w-full h-auto ${interativo ? "pointer-events-none" : "touch-auto"}`} />
      {zones.map((z) => z.maskUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={z.id} src={z.maskUrl} alt="" data-zona-atual={z.id === activeZoneId ? "" : undefined}
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity ${z.id === activeZoneId ? "opacity-100" : soAtual ? "opacity-15" : "opacity-75"}`} />
      ) : null)}
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        {zones.map((z, i) => {
          if (!z.polygon || z.polygon.length < 3) return null;
          const color = ZONE_COLORS[i % ZONE_COLORS.length];
          const active = z.id === activeZoneId;
          return <polygon key={z.id} data-zona-atual={active ? "" : undefined} points={z.polygon.map(([x, y]) => `${x},${y}`).join(" ")} fill={color}
            fillOpacity={active ? 0.42 : soAtual ? 0.07 : 0.26} stroke={color} strokeOpacity={active || !soAtual ? 1 : 0.25}
            strokeWidth={active ? 0.007 : 0.004} strokeLinejoin="round" />;
        })}
      </svg>
      {zones.map((z, i) => {
        if (!z.rect || soAtual) return null;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        return (
          interativo ? (
          <button key={z.id} onClick={(e) => { e.stopPropagation(); setActiveZoneId(z.id); }}
            style={z.point
              ? { left: `calc(${(z.rect.x + z.rect.w / 2) * 100}% + 16px)`, top: `${(z.rect.y + z.rect.h / 2) * 100}%`, background: color }
              : { left: `${z.rect.x * 100}%`, top: `${z.rect.y * 100}%`, background: color }}
            className="absolute -translate-y-1/2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
            {rotulos?.[i] ?? z.label}
          </button>
          ) : (
          <span key={z.id} aria-hidden
            style={z.point
              ? { left: `calc(${(z.rect.x + z.rect.w / 2) * 100}% + 16px)`, top: `${(z.rect.y + z.rect.h / 2) * 100}%`, background: color }
              : { left: `${z.rect.x * 100}%`, top: `${z.rect.y * 100}%`, background: color }}
            className="absolute -translate-y-1/2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm pointer-events-none">
            {rotulos?.[i] ?? z.label}
          </span>
          )
        );
      })}
      {zones.map((z, i) => {
        // Once a manually-drawn box gets upgraded to a precise mask/polygon,
        // show only that (like a tap-detected zone) — the raw box outline
        // underneath it is now stale and just visual clutter.
        if (!z.manual || !z.rect || z.maskUrl || (z.polygon && z.polygon.length >= 3)) return null;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        const rect = z.rect;
        const active = z.id === activeZoneId;
        if (z.point) {
          // Toque: um alvo no ponto — a IA descobre a superfície inteira depois.
          return (
            <span key={z.id} aria-hidden
              style={{ left: `${(rect.x + rect.w / 2) * 100}%`, top: `${(rect.y + rect.h / 2) * 100}%`, borderColor: color, background: `${color}55` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-[3px] pointer-events-none shadow ${active ? "ring-2 ring-white" : ""} ${soAtual && !active ? "opacity-25" : ""}`}>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: color }} />
            </span>
          );
        }
        return (
          <div key={z.id}
            onPointerDown={(e) => {
              if (mode !== "draw") return;
              e.stopPropagation(); setActiveZoneId(z.id);
              const p = norm(e.clientX, e.clientY);
              // Capture on the STABLE container, not the handle: the handle
              // re-renders as it moves (its style changes every frame), which
              // drops capture on the handle element and makes the drag stop
              // after a few px. The root never remounts mid-drag.
              try { ref.current?.setPointerCapture(e.pointerId); } catch {}
              drag.current = { kind: "move", id: z.id, offX: p.x - rect.x, offY: p.y - rect.y, w: rect.w, h: rect.h };
            }}
            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, borderColor: color, background: `${color}22` }}
            className={`absolute border-2 ${active ? "ring-2 ring-white/70" : ""} ${soAtual && !active ? "opacity-25" : ""} ${mode === "draw" ? "cursor-move" : "pointer-events-none"}`}>
            {mode === "draw" && (
              <span onPointerDown={(e) => {
                  e.stopPropagation(); setActiveZoneId(z.id);
                  // Capture on the STABLE container, not the handle: the handle
              // re-renders as it moves (its style changes every frame), which
              // drops capture on the handle element and makes the drag stop
              // after a few px. The root never remounts mid-drag.
              try { ref.current?.setPointerCapture(e.pointerId); } catch {}
                  drag.current = { kind: "resize", id: z.id, x: rect.x, y: rect.y };
                }}
                style={{ background: color }}
                className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 border-white cursor-nwse-resize" />
            )}
          </div>
        );
      })}
      {/* Pixel-exact projection: 4-corner quad for the active zone.
          - Not confirmed → draggable handles + "Atualizar pontos" (re-runs SAM2).
          - Confirmed → handles hidden, just an "Editar cantos" pill to recall. */}
      {(() => {
        if (!interativo) return null;
        const az = zones.find((z) => z.id === activeZoneId);
        if (!az?.quad) return null;
        const q = az.quad;
        const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
        const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;

        if (az.quadConfirmed) {
          // Collapsed: only a small recall pill at the centre.
          return (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); updateZone(az.id, { quadConfirmed: false }); }}
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/85 text-white text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-md">
              ✎ Editar cantos
            </button>
          );
        }
        return (
          <>
            <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon points={q.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#ffffff" strokeWidth={0.004} strokeDasharray="0.014 0.009" strokeLinejoin="round" />
            </svg>
            {q.map(([x, y], idx) => (
              // Large transparent hit area (finger-friendly) wrapping a small dot.
              <span key={idx}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // Capture on the STABLE container, not the handle: the handle
              // re-renders as it moves (its style changes every frame), which
              // drops capture on the handle element and makes the drag stop
              // after a few px. The root never remounts mid-drag.
              try { ref.current?.setPointerCapture(e.pointerId); } catch {}
                  drag.current = { kind: "corner", id: az.id, idx };
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none">
                <span className="w-5 h-5 rounded-full bg-white border-2 border-[#0B1F45] shadow-md" />
              </span>
            ))}
            {/* Confirm button at the quad centre — re-runs SAM2, then hides handles. */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onConfirmQuad(az.id); }}
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-[#36A35C] hover:bg-[#4BB571] text-[#0B1F45] text-[11px] font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-lg">
              ✓ Atualizar pontos
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
              Arraste os 4 cantos e toque em “Atualizar pontos”
            </div>
          </>
        );
      })()}
      {draft && draft.w > 0 && (
        <div style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}
          className="absolute border-2 border-dashed border-white bg-white/10 pointer-events-none" />
      )}
      {busy && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full">
            <div className="w-4 h-4 border-2 border-white/30 border-t-[#36A35C] rounded-full animate-spin" />
            <span className="text-white text-xs">Detectando superfície…</span>
          </div>
        </div>
      )}
    </div>
  );
}
