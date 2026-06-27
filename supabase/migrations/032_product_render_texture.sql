-- Flat, front-on, glare-free slab texture per product, used by the Visualizador's
-- deterministic pixel-exact projection (distinct from image_path, which is a
-- styled/angled catalogue photo, and from render_context_image_path, the
-- in-ambience reference). Nullable: products without it fall back to the
-- generative render path.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS render_texture_path TEXT;
