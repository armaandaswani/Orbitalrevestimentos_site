-- Reusable presets for the Pedidos editor: saved "Condição de pagamento" texts
-- and custom "Forma de pagamento" labels, so the admin doesn't have to retype
-- the same wording on every order.
CREATE TABLE IF NOT EXISTS pedido_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('payment_terms', 'payment_method')),
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_presets_kind ON pedido_presets (kind);
