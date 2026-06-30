// Deterministic pixel-exact panel projection for the Visualizador.
//
// WHY: the generative render reinterprets the chosen finish — it cannot
// guarantee the installed surface is the EXACT product. This module instead
// draws the ACTUAL slab texture (a flat, rectified, glare-free image of the
// panel) onto the wall, so the material is the swatch itself, only re-projected
// into the wall's perspective. No model is in the material path → no drift.
//
// Pipeline (all client-side, dependency-free 2D canvas):
//   1. tileTexture()        — repeat the flat slab across the wall at panel scale
//   2. projectTextureToQuad — warp the tiled texture into the wall's 4-corner
//                             quad via a homography (perspective-correct, drawn
//                             as a fine triangle mesh so veining converges)
//   3. transferLuminance    — multiply the room's own shading onto the texture
//                             so light/shadow read naturally, colours unchanged
// The caller then clips the result to the SAM mask (existing compositor) so
// foreground objects stay in front.
//
// Coordinates: a "quad" is 4 corners in NORMALISED image space (0..1), ordered
// top-left, top-right, bottom-right, bottom-left.

export type Pt = [number, number];
export type Quad = [Pt, Pt, Pt, Pt]; // TL, TR, BR, BL

// ── Homography (DLT) ─────────────────────────────────────────────────────────
// Solves the 3x3 projective transform H mapping the 4 src points to the 4 dst
// points. Returns the 9 entries row-major (h8 fixed to 1). Pure math — unit-
// testable without a DOM.
export function solveHomography(src: Quad, dst: Quad): number[] {
  // Build the 8x8 linear system A·h = b for h = [h0..h7] (h8 = 1).
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solveLinear(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

// Gaussian elimination with partial pivoting for an n×n system.
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Augmented matrix.
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Pivot.
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-12) continue; // singular-ish; leave as-is
    [M[col], M[piv]] = [M[piv], M[col]];
    // Eliminate.
    const pivVal = M[col][col];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / pivVal;
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const d = M[i][i];
    x[i] = Math.abs(d) < 1e-12 ? 0 : M[i][n] / d;
  }
  return x;
}

// Applies homography H (9 entries row-major) to a point.
export function applyH(H: number[], x: number, y: number): Pt {
  const X = H[0] * x + H[1] * y + H[2];
  const Y = H[3] * x + H[4] * y + H[5];
  const W = H[6] * x + H[7] * y + H[8];
  return W !== 0 ? [X / W, Y / W] : [X, Y];
}

// ── Panel layout ─────────────────────────────────────────────────────────────
// How many panel modules across / rows down cover the wall, mirroring the
// server prompt's intent (large-format panels, full height, vertical seams).
export function panelLayout(
  wallWidthM: number | null,
  wallHeightM: number | null,
  panelWidthM: number,
  panelHeightM: number
): { cols: number; rows: number } {
  // Without real measurements, assume a single full-height row and a sensible
  // default width (3 modules ~ a typical feature wall). The caller can refine
  // from the quad's apparent size later.
  if (!wallWidthM || !wallHeightM || wallWidthM <= 0 || wallHeightM <= 0) {
    return { cols: 3, rows: 1 };
  }
  const cols = Math.max(1, Math.round(wallWidthM / panelWidthM));
  const rows = Math.max(1, Math.ceil(wallHeightM / panelHeightM));
  return { cols, rows };
}

// ── Canvas helpers (client-only) ─────────────────────────────────────────────
function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Tiles the flat slab texture into a cols×rows grid at the texture's native
// aspect. `flipAlternate` mirrors every other column to soften obvious vein
// repetition (a cheap stand-in for book-matching). Returns the tiled canvas.
export function tileTexture(
  texture: CanvasImageSource,
  texW: number,
  texH: number,
  cols: number,
  rows: number,
  flipAlternate = true
): HTMLCanvasElement {
  const c = makeCanvas(texW * cols, texH * rows);
  const ctx = c.getContext("2d")!;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      ctx.save();
      const flip = flipAlternate && col % 2 === 1;
      if (flip) {
        ctx.translate((col + 1) * texW, r * texH);
        ctx.scale(-1, 1);
        ctx.drawImage(texture, 0, 0, texW, texH);
      } else {
        ctx.drawImage(texture, col * texW, r * texH, texW, texH);
      }
      ctx.restore();
    }
  }
  return c;
}

// Warps the source canvas (the tiled texture, occupying its full rectangle)
// into the destination quad on an outW×outH transparent canvas, using a fine
// triangle mesh so the mapping is perspective-correct (veining converges to the
// wall's vanishing direction). Slight triangle overlap hides hairline seams.
export function projectTextureToQuad(
  source: HTMLCanvasElement,
  dstQuadNorm: Quad,
  outW: number,
  outH: number,
  grid = 24
): HTMLCanvasElement {
  const sw = source.width, sh = source.height;
  // Source-space corners of the tiled texture (TL, TR, BR, BL).
  const srcQuad: Quad = [
    [0, 0],
    [sw, 0],
    [sw, sh],
    [0, sh],
  ];
  // Destination quad in OUTPUT pixels.
  const dst: Quad = dstQuadNorm.map(([x, y]) => [x * outW, y * outH]) as Quad;
  // Homography from source-pixel space → output-pixel space.
  const H = solveHomography(srcQuad, dst);

  const out = makeCanvas(outW, outH);
  const ctx = out.getContext("2d")!;

  // Bilinear position of a grid node in source space.
  const srcAt = (i: number, j: number): Pt => [(i / grid) * sw, (j / grid) * sh];

  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const s00 = srcAt(i, j), s10 = srcAt(i + 1, j), s01 = srcAt(i, j + 1), s11 = srcAt(i + 1, j + 1);
      const d00 = applyH(H, s00[0], s00[1]);
      const d10 = applyH(H, s10[0], s10[1]);
      const d01 = applyH(H, s01[0], s01[1]);
      const d11 = applyH(H, s11[0], s11[1]);
      drawTriangle(ctx, source, s00, s10, s11, d00, d10, d11);
      drawTriangle(ctx, source, s00, s11, s01, d00, d11, d01);
    }
  }
  return out;
}

// Draws the texture triangle (src) into the destination triangle (dst) via the
// affine transform that maps one to the other, clipped to the dst triangle.
// Affine-per-triangle approximates the projective map; with a fine grid the
// error is sub-pixel. The clip path is expanded by ~0.5px to avoid seams.
function drawTriangle(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  s0: Pt, s1: Pt, s2: Pt,
  d0: Pt, d1: Pt, d2: Pt
): void {
  ctx.save();
  // Expand the destination triangle slightly around its centroid to overlap
  // neighbours (kills hairline gaps from antialiased edges).
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
  const grow = 0.6;
  const e = (p: Pt): Pt => {
    const dx = p[0] - cx, dy = p[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / len) * grow, p[1] + (dy / len) * grow];
  };
  const e0 = e(d0), e1 = e(d1), e2 = e(d2);
  ctx.beginPath();
  ctx.moveTo(e0[0], e0[1]);
  ctx.lineTo(e1[0], e1[1]);
  ctx.lineTo(e2[0], e2[1]);
  ctx.closePath();
  ctx.clip();

  // Solve the affine A mapping src→dst for this triangle.
  const a = affineFromTriangles(s0, s1, s2, d0, d1, d2);
  if (a) {
    ctx.setTransform(a[0], a[1], a[2], a[3], a[4], a[5]);
    ctx.drawImage(source, 0, 0);
  }
  ctx.restore();
}

// Affine [a,b,c,d,e,f] such that dst = A·src for three correspondences.
function affineFromTriangles(s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt): number[] | null {
  const x0 = s0[0], y0 = s0[1], x1 = s1[0], y1 = s1[1], x2 = s2[0], y2 = s2[1];
  const det = x0 * (y1 - y2) - x1 * (y0 - y2) + x2 * (y0 - y1);
  if (Math.abs(det) < 1e-9) return null;
  const u0 = d0[0], v0 = d0[1], u1 = d1[0], v1 = d1[1], u2 = d2[0], v2 = d2[1];
  const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / det;
  const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / det;
  const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / det;
  const d = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / det;
  const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / det;
  const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / det;
  return [a, b, c, d, e, f];
}

// ── Luminance transfer ───────────────────────────────────────────────────────
// Multiplies the room's own low-frequency shading (extracted from the original
// photo under the projected area) onto the flat projected texture, so the panel
// picks up the room's light gradient and soft shadows WITHOUT changing its
// colours. `projected` and `photo` must share the out dimensions.
export function transferLuminance(
  projected: HTMLCanvasElement,
  photo: CanvasImageSource,
  outW: number,
  outH: number,
  strength = 0.85
): HTMLCanvasElement {
  // 1. Low-frequency luminance of the photo: downscale heavily then upscale.
  const small = makeCanvas(Math.max(1, outW / 16), Math.max(1, outH / 16));
  const sctx = small.getContext("2d")!;
  sctx.drawImage(photo, 0, 0, small.width, small.height);

  const shade = makeCanvas(outW, outH);
  const shctx = shade.getContext("2d")!;
  shctx.imageSmoothingEnabled = true;
  shctx.drawImage(small, 0, 0, outW, outH);

  // Mean luminance, to centre the multiplier around 1.0 (so we modulate, not
  // darken). Grayscale the upscaled shade in place.
  const id = shctx.getImageData(0, 0, outW, outH);
  const px = id.data;
  let sum = 0;
  const n = outW * outH;
  for (let i = 0; i < px.length; i += 4) {
    const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    sum += l;
  }
  const mean = n > 0 ? sum / n : 128;
  for (let i = 0; i < px.length; i += 4) {
    const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    // Modulation factor around the mean, damped by `strength`, clamped so we
    // never blow out or crush the texture.
    let f = mean > 0 ? l / mean : 1;
    f = 1 + (f - 1) * strength;
    f = Math.min(1.3, Math.max(0.55, f));
    // Pack the factor so the MEAN luminance maps to 255 → multiply ×1.0 (texture
    // unchanged at average light). Darker-than-average areas (<1) darken; lighter
    // areas clamp at 255 (multiply can't brighten). The earlier /1.6 darkened the
    // whole panel ~40%, washing the marble grey — that was the bug.
    const g = Math.round(Math.min(255, Math.max(0, 255 * f)));
    px[i] = px[i + 1] = px[i + 2] = g;
    px[i + 3] = 255;
  }
  shctx.putImageData(id, 0, 0);

  // 2. Multiply the shading over the projected texture.
  const out = makeCanvas(outW, outH);
  const octx = out.getContext("2d")!;
  octx.drawImage(projected, 0, 0);
  octx.globalCompositeOperation = "multiply";
  octx.globalAlpha = 1;
  octx.drawImage(shade, 0, 0);
  // Restore brightness lost to the /1.6 pack via an additive screen pass would
  // be ideal; in practice the clamp range keeps it visually balanced. Re-clip
  // to the projected alpha so multiply didn't tint the transparent area.
  octx.globalCompositeOperation = "destination-in";
  octx.drawImage(projected, 0, 0);
  octx.globalCompositeOperation = "source-over";
  return out;
}
