// Shared Visualizador render-prompt composition. Used by the render API
// (server) to build the actual Gemini prompt, and by the admin page (client)
// to show a live preview of exactly what the AI will receive for a model.
//
// PHILOSOPHY: this is a *precision visualization tool*, not a creative image
// generator. The client's photo is ground truth and must survive almost
// untouched — only the chosen surface gets the panel. The prompt is engineered
// around a strict priority order: preserve the environment > reproduce the exact
// panel > respect the target area > respect scale > realism > visual polish.

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
  // Real measurements typed by the client (optional). When present the prompt
  // states the true scale and how many panels cover the area.
  wallWidthM?: number | null;
  wallHeightM?: number | null;
  // WHERE to apply the panel (optional). A short phrase describing the target
  // surface, e.g. "the ceiling", "the wall behind the TV", "the right-side
  // wall". When omitted, defaults to the main wall facing the camera. Future
  // guided-flow / drawing steps pass the client's chosen area here.
  applicationArea?: string | null;
}): string {
  const area = opts.applicationArea?.trim();
  const areaPhrase =
    area && area.length > 0
      ? area
      : "the main wall directly facing the camera (the single largest uninterrupted wall surface visible in the photo)";

  const lines: string[] = [
    "You are a precision interior-visualization tool for a wall-panel company.",
    "Your ONLY task is to show how ONE specific panel product would look installed",
    "on ONE specific surface of the client's REAL photo. This is a localized,",
    "masked photo edit — NOT a creative re-render and NOT a new image. Treat the",
    "client's photo as ground truth that must survive almost completely untouched.",
    "",
    "IMAGES:",
    "- IMAGE 1 = the client's real photo. This is the scene; preserve it.",
    "- IMAGE 2 = the exact panel product to install. Replicate it precisely:",
    `  its pattern, color, veining/grain, texture and ${opts.finishText}.`,
    "  IMAGE 2 is the source of truth for how the panel looks — if any wording",
    "  below seems to conflict with IMAGE 2, IMAGE 2 wins.",
  ];
  if (opts.hasContextImage) {
    lines.push(
      "- IMAGE 3 = the same panel already installed in another room, provided ONLY",
      "  as a guide for how the finish reads in real light (sheen, scale, reflection).",
      "  Do NOT copy IMAGE 3's room, layout, furniture, colors or framing."
    );
  }

  lines.push(
    "",
    `TASK: Apply the IMAGE 2 panel onto ${areaPhrase} of IMAGE 1, as if the panels`,
    "were physically installed there. Change NOTHING else in the photo.",
    "",
    "ENVIRONMENT PRESERVATION — highest priority:",
    "- Edit ONLY the target surface named above. Every other pixel must stay",
    "  identical to IMAGE 1.",
    "- Do NOT alter furniture, décor, objects, plants, rugs, art, the floor, the",
    "  ceiling, other walls, windows, doors, trim, or any architectural element.",
    "- Do NOT change the room's colors, white balance, exposure, proportions,",
    "  camera angle, viewpoint, framing, crop or resolution.",
    "- Keep the room's existing lighting, shadows and reflections exactly as they are.",
    "- Success test: if the newly applied panel were erased from your output, the",
    "  rest of the image must be indistinguishable from the original IMAGE 1.",
    "",
    "PANEL FIDELITY:",
    "- Use the EXACT panel from IMAGE 2. Do not invent, restyle, reinterpret or",
    "  beautify it. Do not change its pattern, color, texture or proportions.",
    "- Do not mix in other materials or models — one panel product, on this area only.",
    "- The panel in your output must be visually identical to IMAGE 2, only adapted",
    "  to the target surface's perspective and lighting.",
    "",
    "INSTALLATION REALISM — applies only inside the target area:",
    "- Follow the real surface geometry, perspective and wall/ceiling angles of IMAGE 1.",
    "- Light the panel with the room's existing light; cast natural, soft contact",
    "  shadows where the surface meets adjacent surfaces.",
    "- Anything currently in front of the area (furniture, switches, outlets, frames,",
    "  plants) stays in front and occludes the panel — the panel goes BEHIND it.",
    `- Panel module size: ${opts.panelWidthM}m wide x ${opts.panelHeightM}m tall. Keep`,
    "  this aspect ratio; never stretch or squash the pattern to fit. Show the real",
    "  seams/joints between panels laid edge-to-edge, at the correct scale.",
    ...(opts.wallWidthM && opts.wallHeightM
      ? (() => {
          const g = panelGrid(opts.wallWidthM, opts.wallHeightM, opts.panelWidthM, opts.panelHeightM);
          return [
            `- The client measured this area: ${opts.wallWidthM}m wide x ${opts.wallHeightM}m tall, ` +
              `≈ ${g.count} panel${g.count !== 1 ? "s" : ""} (${g.cols} across x ${g.rows} high) ` +
              "laid edge-to-edge. Use these real dimensions to scale the texture and seams correctly.",
          ];
        })()
      : []),
    "",
    "PRIORITY ORDER (never sacrifice an earlier item to satisfy a later one):",
    "1. Preserve the original environment.",
    "2. Reproduce the exact panel from IMAGE 2.",
    "3. Apply it to the target area only.",
    "4. Respect real scale, proportions and seams.",
    "5. Make the installation look realistic.",
    "6. Improve visual quality ONLY when it does not alter the environment or product.",
  );

  const notes = opts.extraNotes?.trim();
  if (notes) lines.push("", `Model-specific notes: ${notes}`);

  lines.push(
    "",
    "Output ONLY the edited version of IMAGE 1, at the same framing and resolution."
  );
  return lines.join("\n");
}
