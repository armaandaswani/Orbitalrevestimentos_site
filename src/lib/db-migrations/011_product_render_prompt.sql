-- Per-model Visualizador render prompt fields. The render API composes the final
-- prompt from a fixed scaffold + these per-model values. All nullable so existing
-- rows keep working (the API falls back to per-line defaults when unset).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS render_finish_description TEXT,
  ADD COLUMN IF NOT EXISTS render_panel_width_m  NUMERIC DEFAULT 1.2,
  ADD COLUMN IF NOT EXISTS render_panel_height_m NUMERIC DEFAULT 2.9,
  ADD COLUMN IF NOT EXISTS render_context_image_path TEXT,
  ADD COLUMN IF NOT EXISTS render_extra_notes TEXT;
