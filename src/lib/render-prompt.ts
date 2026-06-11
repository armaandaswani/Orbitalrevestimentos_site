// Shared Visualizador render-prompt composition. Used by the render API
// (server) to build the actual Gemini prompt, and by the admin page (client)
// to show a live preview of exactly what the AI will receive for a model.

export type FinishKind = "matte" | "polished" | "wood";

export const DEFAULT_PANEL_WIDTH_M = 1.2;
export const DEFAULT_PANEL_HEIGHT_M = 2.9;

export function finishDescription(kind: FinishKind): string {
  switch (kind) {
    case "polished":
      return "polished marble with a glossy, reflective sheen and rich veining";
    case "wood":
      return "warm textured wood with natural grain";
    case "matte":
    default:
      return "matte marble with a soft, non-reflective surface and subtle veining";
  }
}

// How many whole panels cover a wall of the given size (grid layout —
// same formula the Simulador uses to count plates).
export function panelGrid(
  wallWidthM: number,
  wallHeightM: number,
  panelWidthM = DEFAULT_PANEL_WIDTH_M,
  panelHeightM = DEFAULT_PANEL_HEIGHT_M
): { cols: number; rows: number; count: number } {
  const cols = Math.max(1, Math.ceil(wallWidthM / panelWidthM));
  const rows = Math.max(1, Math.ceil(wallHeightM / panelHeightM));
  return { cols, rows, count: cols * rows };
}

// Fixed scaffold: every invariant rule lives here. Per-model (or per-line
// fallback) specifics are injected as parameters.
export function composePrompt(opts: {
  finishText: string;
  panelWidthM: number;
  panelHeightM: number;
  extraNotes?: string | null;
  hasContextImage?: boolean;
  // Real wall measurements typed by the client (optional). When present the
  // prompt states the true scale and how many panels cover the wall.
  wallWidthM?: number | null;
  wallHeightM?: number | null;
}): string {
  const lines = [
    "You are an architectural visualization engine.",
    "The FIRST image is a real photo of a client's wall.",
    "The SECOND image is the product reference: a PFB wall panel with a",
    `${opts.finishText} finish.`,
  ];
  if (opts.hasContextImage) {
    lines.push(
      "The THIRD image shows this panel installed in a real room — use it as",
      "a guide for how the finish reads in context (scale, sheen, light response)."
    );
  }
  lines.push(
    "",
    "Re-render the FIRST photo so the wall is fully covered with this exact",
    "panel finish, as if the panels were physically installed on it.",
    "Rules:",
    "- Keep the EXACT same camera angle, viewpoint, framing and room as the original photo.",
    "- Apply the finish from the reference image precisely — same texture, color and tonality.",
    "- Cover the entire wall, floor to ceiling, respecting the panel proportions.",
    `- Panel size reference: ${opts.panelWidthM}m wide x ${opts.panelHeightM}m tall. Do not distort the texture.`,
    "- The whole wall must read as one continuous finish: no mixed textures or tones.",
    ...(opts.wallWidthM && opts.wallHeightM
      ? (() => {
          const g = panelGrid(opts.wallWidthM, opts.wallHeightM, opts.panelWidthM, opts.panelHeightM);
          return [
            `- The client measured this wall: ${opts.wallWidthM}m wide x ${opts.wallHeightM}m tall. ` +
              `It takes about ${g.count} panel${g.count !== 1 ? "s" : ""} (${g.cols} across x ${g.rows} high) ` +
              "laid edge-to-edge to cover it — use these real dimensions to scale the texture and any visible panel seams correctly.",
          ];
        })()
      : []),
    "- Preserve the real perspective, the room's existing furniture, floor, ceiling and lighting.",
    "- Keep the wall's natural shadows and light falloff so it looks photorealistic.",
    "- Ray-trace the result, cinematic studio lighting, soft shadows, ultra-realistic, ultra HD."
  );
  const notes = opts.extraNotes?.trim();
  if (notes) {
    lines.push(`Additional model-specific notes: ${notes}`);
  }
  lines.push("Output only the edited photo.");
  return lines.join("\n");
}
