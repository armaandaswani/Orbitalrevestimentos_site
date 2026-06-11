# Spec: Per-model dynamic prompts for the Visualizador

**Status:** Ready to implement. No part of this has been built yet.
**Audience:** A developer (or Cowork agent) picking this up cold.

---

## 1. Goal

The Visualizador (`/visualizador`) lets a client upload a photo of their wall, pick
a panel model, and get an AI render of that wall covered in that panel — same angle,
perspective and lighting as the original photo.

**What we want:** the prompt sent to the image model must be **pre-encoded per model
and bound to it** ("atrelado ao modelo"). The client writes **nothing**. They pick a
model; the system already has that model's curated instructions and runs them in the
background. Same model → same instructions → **standardized, repeatable renders we
control.**

**Why it isn't that today:** the prompt is generic **per line** (matte / polished /
wood), not per model. Two models in the same line (e.g. two Classic marbles) get the
**identical text prompt** and differ only by reference image. We want each model to
carry its own prompt.

**Chosen approach:** **structured fields** stored on each product. The server composes
the final prompt from a fixed scaffold (the invariant rules) plus the per-model fields.
Fixed scaffold = consistency; per-model fields = specificity.

---

## 2. Current state (files to know)

| File | Role |
|---|---|
| `src/app/visualizador/page.tsx` | Client UI. Uploads wall photo, lists products from `/api/products`, maps each product's `linha` → a `finish` keyword (`matte`/`polished`/`wood`), and POSTs `{ photo, referenceUrl, finish }` to the render API. |
| `src/app/api/visualizador/render/route.ts` | Calls Google Gemini image model (`gemini-2.5-flash-image`, key `FREE_LLM_API_KEY`, model overridable via `GEMINI_IMAGE_MODEL`). Builds the prompt with `buildPrompt(finish)` and `finishDescription(kind)` — **both hardcoded, per-line**. Sends [prompt text, wall image, reference image] and returns the generated image as a data URL. |
| `src/app/api/products/route.ts` | `GET` returns `select("*, product_images(...)")` filtered to `is_active` — **so any new product columns automatically reach the front-end, no change needed for reads.** `POST` inserts the raw body. |
| `src/app/api/products/[id]/route.ts` | `PUT` does `.update(body)` — **so any new fields in the admin form body persist automatically.** |
| `src/app/admin/page.tsx` | Admin "Produtos" tab. `productForm` state (line ~333) holds the editable fields; the form submits `JSON.stringify(productForm)` via POST (create, ~line 983) or PUT (edit, ~line 989). `DbProduct` interface at line ~42. |

The `products` table is **not** in `supabase-schema.sql` (it was created directly in
Supabase). Known columns: `id, code, name, linha, finish, price, price_per_m2,
description, image_path, is_active, sort_order, created_at`, plus a `product_images`
relation.

---

## 3. Data model change

New migration `src/lib/db-migrations/011_product_render_prompt.sql`:

```sql
-- Per-model Visualizador render prompt fields. The render API composes the final
-- prompt from a fixed scaffold + these per-model values. All nullable so existing
-- rows keep working (the API falls back to per-line defaults when unset).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS render_finish_description TEXT,
  ADD COLUMN IF NOT EXISTS render_panel_width_m  NUMERIC DEFAULT 1.2,
  ADD COLUMN IF NOT EXISTS render_panel_height_m NUMERIC DEFAULT 2.9,
  ADD COLUMN IF NOT EXISTS render_context_image_path TEXT,
  ADD COLUMN IF NOT EXISTS render_extra_notes TEXT;
```

Field meanings:
- `render_finish_description` — the textual description of THIS model's finish, e.g.
  *"polished Carrara marble, cool white background with soft grey veining, glossy
  reflective sheen"*. Replaces the generic per-line text. **This is the main field.**
- `render_panel_width_m` / `render_panel_height_m` — panel dimensions in metres
  (defaults 1.2 × 2.9). Per-model in case a model ships in a different size.
- `render_context_image_path` — optional **second** reference image showing the panel
  applied in a real ambience. If present, it's sent as an extra reference so the model
  sees the finish in context, not just as a flat swatch.
- `render_extra_notes` — optional free-text addendum appended to the prompt for special
  cases (e.g. *"this finish has directional grain — keep it vertical"*).

> Apply this migration manually in the Supabase SQL editor, same as the other
> `db-migrations/*.sql` files (they are not auto-run).

---

## 4. Render API change — `src/app/api/visualizador/render/route.ts`

**New input:** accept `productId` in the POST body. Keep `photo` (the wall data URL).
`referenceUrl` and `finish` become optional legacy fallbacks.

**New flow:**
1. Read `productId` from body. If present, load the product server-side:
   ```ts
   const sb = supabaseAdmin();
   const { data: product } = await sb
     .from("products")
     .select("image_path, linha, render_finish_description, render_panel_width_m, render_panel_height_m, render_context_image_path, render_extra_notes")
     .eq("id", productId)
     .single();
   ```
2. Compose the prompt from a **fixed scaffold** + the product's fields. The scaffold
   holds every invariant rule that is currently in `buildPrompt` (keep exact camera
   angle / viewpoint / framing, cover the wall floor-to-ceiling, one continuous finish,
   preserve furniture/floor/ceiling/lighting and natural shadows, ray-trace, cinematic
   studio lighting, soft shadows, ultra-HD, output only the edited photo). Inject:
   - finish text ← `render_finish_description` (fallback: existing `finishDescription(finishFromLinha)`)
   - panel size ← `render_panel_width_m` × `render_panel_height_m` (fallback 1.2 × 2.9)
   - append `render_extra_notes` if non-empty.
3. Reference images sent to Gemini:
   - image #1 = wall photo (as today)
   - image #2 = `product.image_path` (the panel swatch)
   - image #3 = `render_context_image_path` **if set** (the in-ambience reference).
     Add a prompt line like *"The THIRD image shows this panel installed in a real
     room — use it as a guide for how the finish reads in context."*
4. **Fallback:** if `productId` is missing or the product has no `render_finish_description`,
   fall back to the current per-line `buildPrompt(finish)` path so nothing breaks during
   rollout.

Keep `maxDuration = 60`, the `FREE_LLM_API_KEY` / `GEMINI_IMAGE_MODEL` handling, the
base64 fetch helper, and the existing error/safety handling unchanged.

---

## 5. Front-end change — `src/app/visualizador/page.tsx`

In `generate()` (~line 96), change the POST body from `{ photo, referenceUrl, finish }`
to include the model id:

```ts
body: JSON.stringify({
  photo: photoData,
  productId: selected.id,        // NEW — the system resolves the prompt from this
  referenceUrl: selected.image_path, // keep as fallback during rollout
  finish: FINISH_BY_LINE[selected.linha], // keep as fallback
}),
```

No UI change is required for the client (they already just pick a model). The
`FINISH_BY_LINE` mapping can stay as a fallback. Optionally remove it once every model
has `render_finish_description` set.

---

## 6. Admin editor change — `src/app/admin/page.tsx`

The form already persists the whole `productForm` body via PUT/POST (the route does
`.update(body)` / `.insert(body)`), so the only work is exposing the new fields.

1. Add to `DbProduct` interface (~line 42):
   `render_finish_description?: string; render_panel_width_m?: number; render_panel_height_m?: number; render_context_image_path?: string; render_extra_notes?: string;`
2. Add the same keys to the `productForm` initial state (~line 333) with sensible
   defaults (`render_panel_width_m: 1.2`, `render_panel_height_m: 2.9`, others `""`).
3. When opening a product for edit, populate these from the loaded product (wherever
   `setProductForm({...})` is called on edit).
4. Add a **"Visualizador / Render"** section to the product form UI (near the existing
   fields, before the Salvar button at ~line 4129):
   - `textarea` → `render_finish_description` (label: "Descrição do acabamento para o render")
   - two `number` inputs → `render_panel_width_m`, `render_panel_height_m` (label: "Tamanho da placa (m)")
   - `text` input → `render_context_image_path` (label: "Imagem de contexto (opcional)") — reuse the existing image-path / upload pattern used for `image_path`
   - `textarea` → `render_extra_notes` (label: "Notas extras (opcional)")

This is admin-only (the form is gated by `x-admin-auth`). Clients never see or edit it.

---

## 7. Rollout / backward compatibility

- The migration columns are nullable with defaults → existing products keep rendering
  via the per-line fallback until you fill in `render_finish_description` per model.
- Ship order: (1) migration in Supabase, (2) render API with fallback, (3) admin fields,
  (4) fill in each model's finish description, (5) optionally drop the `finish` fallback.
- Nothing here touches the simulator, coupons, drip emails, or orçamentos.

---

## 8. Acceptance criteria

1. In Admin → Produtos, editing a model's "Descrição do acabamento para o render" and
   saving **persists** (reload shows the value).
2. On `/visualizador`, picking that model and generating produces a render driven by the
   **per-model** description (not the generic per-line text).
3. **Two models in the same linha** with different `render_finish_description` values
   produce **visibly different prompts** (verify by temporarily logging the composed
   prompt server-side, or by clearly different output).
4. A model with **no** render fields set still renders fine (fallback path).
5. If `render_context_image_path` is set, the request to Gemini includes a **third**
   image and the prompt references it.

## 9. Manual test plan (run the app)

1. Apply migration 011 in Supabase.
2. `npm install && npm run dev`.
3. Admin → Produtos → edit one Classic model → set a distinctive finish description →
   Salvar → reload → confirm it stuck.
4. `/visualizador` → upload any well-lit, head-on wall photo → pick that model →
   "Gerar visualização" → confirm an image returns and reflects the finish.
5. Repeat with a model whose render fields are empty → confirm fallback still renders.
6. (If used) set a context image on a model → generate → confirm server sends 3 images
   (log the Gemini payload parts count).

---

## 10. Env vars (already in use, no change)

- `FREE_LLM_API_KEY` — Google Generative Language API key (required).
- `GEMINI_IMAGE_MODEL` — optional model override (default `gemini-2.5-flash-image`).
