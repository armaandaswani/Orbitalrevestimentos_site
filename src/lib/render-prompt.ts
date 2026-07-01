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

// Maps a Visualizador "Local de aplicação" choice to the English surface phrase
// the render prompt needs. Keys are the spaceId values from the client's
// VIZ_SPACES list (kept in sync with the Simulador). Whole-room choices are
// deliberately absent → applicationAreaFor returns null and composePrompt falls
// back to its default ("the main wall facing the camera"): in a photo of a room
// the panel still belongs on the main wall. Only true surfaces override it.
const APPLICATION_AREA_PHRASES: Record<string, string> = {
  teto: "the ceiling",
  movel:
    "the cabinetry / millwork unit facing the camera (only its visible front faces and panels)",
  porta: "the door (the full face of the door leaf facing the camera)",
  box: "the shower-enclosure walls (the wet-area walls of the box/ducha)",
};

// Resolves the chosen local into an applicationArea phrase for composePrompt.
// `spaceId` is the VIZ_SPACES id (e.g. "teto"); for the "Outro…" option pass
// "__custom__" with the client's typed text in `customLabel`. Returns null for
// "parede"/whole-room choices so the prompt uses its default target surface.
export function applicationAreaFor(
  spaceId: string | null | undefined,
  customLabel?: string | null
): string | null {
  if (!spaceId || spaceId === "__custom__" || spaceId === "custom") {
    const t = customLabel?.trim();
    return t ? t : null;
  }
  return APPLICATION_AREA_PHRASES[spaceId] ?? null;
}

// How many whole panels cover a wall of the given size, accounting for cut
// reuse. A wall that is slightly taller than the panel height should not double
// the full wall count; the extra horizontal band can be cut from fewer panels.
export function panelGrid(
  wallWidthM: number,
  wallHeightM: number,
  panelWidthM = DEFAULT_PANEL_WIDTH_M,
  panelHeightM = DEFAULT_PANEL_HEIGHT_M
): { cols: number; rows: number; fullRows: number; extraPanels: number; remainderHeightM: number; count: number } {
  const cols = Math.max(1, Math.ceil(wallWidthM / panelWidthM));
  const fullRows = Math.max(0, Math.floor(wallHeightM / panelHeightM));
  const remainderHeightM = Math.max(0, wallHeightM - fullRows * panelHeightM);
  const hasRemainder = remainderHeightM > 0.001;
  const stripsPerPanel = hasRemainder ? Math.max(1, Math.floor(panelHeightM / remainderHeightM)) : 0;
  const extraPanels = hasRemainder ? Math.ceil(cols / stripsPerPanel) : 0;
  const rows = fullRows + (extraPanels > 0 ? 1 : 0);
  const count = fullRows * cols + extraPanels;
  return { cols, rows: Math.max(1, rows), fullRows, extraPanels, remainderHeightM, count: Math.max(1, count) };
}

// Fixed scaffold: every invariant rule lives here. Per-model (or per-line
// fallback) specifics are injected as parameters.
export function composePrompt(opts: {
  finishText: string;
  panelWidthM: number;
  panelHeightM: number;
  extraNotes?: string | null;
  hasContextImage?: boolean;
  // When true, a black-and-white MASK image is supplied to the model (white =
  // the exact target surface, black = leave untouched). This is far more precise
  // than the rectangle: the model follows the masked surface's real perspective
  // and shape, and never bleeds the panel onto foreground objects (a mirror,
  // frame, plant) that sit in front of the surface. The mask is the #1 spatial
  // signal whenever present; the rectangle below becomes a redundant hint.
  hasMaskImage?: boolean;
  // Real measurements typed by the client (optional). When present the prompt
  // states the true scale and how many panels cover the area.
  wallWidthM?: number | null;
  wallHeightM?: number | null;
  // WHERE to apply the panel (optional). A short phrase describing the target
  // surface, e.g. "the ceiling", "the wall behind the TV", "the right-side
  // wall". When omitted, defaults to the main wall facing the camera. The
  // guided-flow / drawing steps pass the client's chosen area here.
  applicationArea?: string | null;
  // Optional rectangular region the client drew on the photo, normalized 0..1
  // (x,y = top-left corner; w,h = size). When present the panel is confined to
  // this rectangle — used by the multi-zone flow so each panel stays in its zone.
  rect?: { x: number; y: number; w: number; h: number } | null;
  // True when IMAGE 2 is a FLAT, rectified, front-on slab texture (the exact
  // sample) rather than a styled/angled catalogue photo. Tells the model to
  // reproduce that texture's pattern/colour exactly, tiled at panel scale.
  referenceIsFlatTexture?: boolean;
}): string {
  // Dynamic image numbering: IMAGE 1 = photo, IMAGE 2 = panel always. The mask
  // (when present) and the context image follow, in that order — matching the
  // order the render route appends them to the request parts.
  let imgIdx = 2;
  const maskIdx = opts.hasMaskImage ? ++imgIdx : null;
  const ctxIdx = opts.hasContextImage ? ++imgIdx : null;

  const area = opts.applicationArea?.trim();
  const areaPhrase = opts.hasMaskImage
    ? `the surface marked by the WHITE region of the mask (IMAGE ${maskIdx})`
    : area && area.length > 0
      ? area
      : "the main wall directly facing the camera (the single largest uninterrupted wall surface visible in the photo)";

  // Turn a normalized rect into a human percentage description for the prompt.
  // Only used as a fallback when no mask image is supplied — the mask is far
  // more precise, so we don't muddy the prompt with a rectangle alongside it.
  const r = opts.rect;
  const rectPhrase =
    !opts.hasMaskImage && r && r.w > 0 && r.h > 0
      ? (() => {
          const pct = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100);
          const x1 = pct(r.x), y1 = pct(r.y), x2 = pct(r.x + r.w), y2 = pct(r.y + r.h);
          return `the rectangular region of IMAGE 1 spanning ${x1}%–${x2}% horizontally and ${y1}%–${y2}% vertically (measured from the top-left corner)`;
        })()
      : null;

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
    ...(opts.referenceIsFlatTexture
      ? [
          "  IMAGE 2 is a FLAT, straight-on, edge-to-edge sample of the real slab",
          "  (no perspective, no environment). Reproduce THIS exact pattern and",
          "  colour on the target surface — same veins, same tones — only adapting",
          "  it to the wall's perspective and the room's light. Do not invent a",
          "  different marble or a generic look-alike; copy IMAGE 2's material.",
        ]
      : []),
  ];
  if (maskIdx) {
    lines.push(
      `- IMAGE ${maskIdx} = a black-and-white MASK aligned pixel-for-pixel to IMAGE 1.`,
      "  The WHITE region marks the EXACT real surface to apply the panel to. Apply",
      "  the panel ONLY under the white region, following that surface's true",
      "  perspective, angle, curvature and contours as seen in IMAGE 1 — do NOT",
      "  flatten it into a frontal rectangle. Every pixel where the mask is BLACK",
      "  must stay EXACTLY as in IMAGE 1: do not extend the panel past the white",
      "  region, do not change the wall's shape, and keep anything that sits IN",
      "  FRONT of the surface (a mirror, picture frame, plant, furniture, switch)",
      "  fully visible on top of the panel, occluding it.",
    );
  }
  if (ctxIdx) {
    lines.push(
      `- IMAGE ${ctxIdx} = the same panel already installed in another room, provided ONLY`,
      "  as a guide for how the finish reads in real light (sheen, scale, reflection).",
      `  Do NOT copy IMAGE ${ctxIdx}'s room, layout, furniture, colors or framing.`
    );
  }

  lines.push(
    "",
    `TASK: Apply the IMAGE 2 panel onto ${areaPhrase} of IMAGE 1, as if the panels`,
    "were physically installed there. Change NOTHING else in the photo.",
    ...(maskIdx
      ? [
          `- The white region of the mask (IMAGE ${maskIdx}) is the ONLY area you may`,
          "  change. Treat its boundary as the exact edge of the installed panel.",
          "  Leave every black-mask pixel identical to IMAGE 1. If a previous panel",
          "  was already installed elsewhere in the photo, keep it untouched.",
        ]
      : []),
    ...(rectPhrase
      ? [
          `- Confine the panel STRICTLY to ${rectPhrase}. That rectangle is the target`,
          "  area: apply the panel only to the real surface inside it, and leave every",
          "  pixel outside the rectangle exactly as in IMAGE 1. If a previous panel was",
          "  already installed elsewhere in the photo, keep it untouched.",
        ]
      : []),
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
    "SURFACE REPLACEMENT — the old finish is DEMOLISHED and re-clad, not painted over:",
    "- The target surface may currently be tiled, papered, painted or bare. REMOVE",
    "  that existing finish entirely and clad the surface with the IMAGE 2 panel.",
    "- The original tiles, grout lines, joints, seams or wallpaper pattern must NOT",
    "  remain visible, show through, or be merely recolored. If the wall was tiled,",
    "  there must be NO tile grid left — it is replaced by a smooth, continuous",
    "  large-format panel surface.",
    "- Do not tint or texture-map the panel onto the old surface; render the panel as",
    "  a brand-new continuous slab covering the whole target area.",
    "",
    "PANEL FIDELITY — the installed surface MUST look like IMAGE 2 and nothing else:",
    "- Use the EXACT panel from IMAGE 2. Do not invent, restyle, reinterpret or",
    "  beautify it. Do not change its pattern, color, texture or proportions.",
    "- Match IMAGE 2's specific material, color and veining/grain — the SAME stone or",
    "  wood, the same vein layout, the same color temperature and tonality. It cannot",
    "  have different textures or tonalities. Do NOT substitute a generic marble, a",
    "  whiter/greyer slab, or a different pattern. If in doubt, copy IMAGE 2 literally",
    "  pixel-for-pixel and only re-project it onto the surface.",
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
    "- Render the panel itself in ultra-high definition with detailed, lifelike",
    "  textures and soft, realistic (ray-traced) contact shadows. Aim for photoreal,",
    "  not stylized — but keep the room's OWN lighting, white balance and exposure",
    "  unchanged; do not add studio or cinematic lighting that wasn't in IMAGE 1.",
    "",
    "PANEL SCALE & LAYOUT — this is the #1 thing renders get wrong, read it twice:",
    `- These are LARGE-FORMAT panels. Each module is ${opts.panelWidthM}m wide x ${opts.panelHeightM}m`,
    "  tall — roughly the height of a whole wall. They are NOT tiles, bricks, slabs",
    "  or mosaic. Do NOT chop the surface into a grid of small repeated squares.",
    "- Cover the ENTIRE target surface, edge to edge and floor to ceiling — leave no",
    "  part of it unpanelled and do not float the panels in the middle of the wall.",
    `- A ${opts.panelHeightM}m-tall panel is essentially floor-to-ceiling in a normal room`,
    "  (ceilings are usually ~2.6–2.9m). Unless the target surface is visibly taller",
    "  than that, render the panels at FULL HEIGHT: a single row running from the floor",
    "  (or skirting) to the ceiling, with NO horizontal seam across the middle.",
    `- Lay the panels VERTICALLY and side by side, edge-to-edge. The ONLY joints are the`,
    `  thin vertical seams every ${opts.panelWidthM}m. Use the FEWEST panels the real width`,
    "  needs — never multiply into many narrow strips, and never add seams that aren't there.",
    "- Keep the module aspect ratio; never stretch, squash, zoom or shrink the pattern",
    "  to make it fit. Adjust how many panels you use, not the size of the pattern.",
    "- Calibrate scale against real references visible in the photo: a standard door is",
    "  ~2.1m tall, light switches/outlets ~1.1m and ~0.3m off the floor, countertops",
    "  ~0.9m. The veining must read at life-size against these — if the pattern looks",
    "  tiny next to a door or socket, your scale is wrong; make the panels bigger.",
    ...(opts.wallWidthM && opts.wallHeightM
      ? (() => {
          const g = panelGrid(opts.wallWidthM, opts.wallHeightM, opts.panelWidthM, opts.panelHeightM);
          const rowsPhrase =
            g.fullRows === 0
              ? "cut to the measured height"
              : g.extraPanels === 0
              ? "a SINGLE full-height row (no horizontal seam)"
              : `${g.fullRows} full-height row${g.fullRows !== 1 ? "s" : ""} plus a ${g.remainderHeightM.toFixed(2)}m high cut band using ${g.extraPanels} extra panel${g.extraPanels !== 1 ? "s" : ""}`;
          return [
            `- The client measured this exact area: ${opts.wallWidthM}m wide x ${opts.wallHeightM}m tall.`,
            `  That is ${g.cols} panel${g.cols !== 1 ? "s" : ""} across and ${rowsPhrase}` +
              ` — ${g.count} panel${g.count !== 1 ? "s" : ""} total, laid edge-to-edge. Match this`,
            "  layout and scale precisely; do not add or remove seams.",
          ];
        })()
      : [
          "- No measurements were given. Assume a standard room: render the panels",
          "  full-height in a single row and use only as many vertical panels as the",
          "  wall's real width needs at the module width above.",
        ]),
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

// ── Relight prompt (hybrid Stage 2) ──────────────────────────────────────────
// Used by the render route in mode="relight". The panel is ALREADY installed,
// pixel-exact, in IMAGE 1 (the deterministic projection output). Downstream we
// keep ONLY the LUMINANCE of this output, mean-normalized, and map it back onto
// the exact texture — so this prompt's job is narrow: produce a version of the
// panel that shows WHERE the room's light lands on it (its highlight/sheen
// pattern). It must brighten, not darken, and must never redraw the material.
//
// Written clean/standalone (no legacy layout/scale rules — those belong to the
// APPLY prompt, not here) because mixing them made the model darken and
// restyle the panel instead of simply adding shine.
export function composeRelightPrompt(opts: {
  finish: FinishKind;
  finishText?: string | null;
  hasMaskImage?: boolean;
  hasTextureRef?: boolean;
}): string {
  let imgIdx = 1;
  const texIdx = opts.hasTextureRef ? ++imgIdx : null;
  const maskIdx = opts.hasMaskImage ? ++imgIdx : null;

  const finishBlock =
    opts.finish === "polished"
      ? [
          "The panel is POLISHED / GLOSSY. Add clear, bright specular SHINE:",
          "- bright highlight streaks and soft glossy reflections where the room's",
          "  lights (ceiling spots, windows, lamps) fall on the surface,",
          "- a gentle glossy gradient so it reads as a reflective stone slab,",
          "- keep it bright and clean — this is a shiny showroom finish.",
        ]
      : opts.finish === "wood"
        ? [
            "The panel is WOOD. Give it at most a soft satin sheen — NO glossy",
            "mirror highlights, NO wet look. Keep it natural and matte-ish.",
          ]
        : [
            "The panel is MATTE. Keep it soft and non-reflective — NO glossy",
            "highlights, NO shine, NO mirror reflections. Only the faintest light",
            "gradient from the room.",
          ];

  const lines: string[] = [
    "You are a photo RELIGHTING tool — NOT an image generator, NOT a restyler.",
    "IMAGE 1 is a real room photo with a wall panel ALREADY installed. Its",
    "pattern, veining, colour, scale and position are FINAL and CORRECT.",
    texIdx ? `IMAGE ${texIdx} is the exact panel material (reference only — the true look of the stone).` : "",
    maskIdx ? `IMAGE ${maskIdx} is a mask: only the WHITE region (the installed panel) may be relit.` : "",
    "",
    "YOUR ONLY JOB: show how the room's light plays across that panel.",
    ...finishBlock,
    "",
    "BRIGHTNESS RULE (critical):",
    "- Keep the panel AT LEAST as bright as it is now. You may ADD highlights;",
    "  do NOT darken it, do NOT drape it in shadow, do NOT make it moody or",
    "  dramatic. Only a light touch of soft shading in genuine corners/contact",
    "  edges is allowed — the overall panel must stay light and clearly visible.",
    "",
    "ABSOLUTE RULES:",
    "- Do NOT change the panel's pattern, veining, design, scale or colour. Do NOT",
    "  redraw, invent, sharpen, beautify or hallucinate any pattern. Only light.",
    "- Do NOT alter anything OUTSIDE the panel — furniture, plants, mirrors, the",
    "  floor, ceiling, walls and the rest of the photo stay pixel-identical.",
    "- Keep the camera, viewpoint, framing, crop and resolution identical.",
    opts.finishText ? `Material note: ${opts.finishText}` : "",
    "",
    "Output ONLY the relit version of IMAGE 1, same framing and resolution.",
  ];
  return lines.filter(Boolean).join("\n");
}
