-- Editable work in progress only. No relation/trigger to pedidos, stock, or messages.
CREATE TABLE IF NOT EXISTS public.admin_pedido_drafts (
  id uuid PRIMARY KEY,
  device_id uuid NOT NULL,
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object' AND octet_length(content::text) <= 262144),
  revision integer NOT NULL CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
CREATE INDEX IF NOT EXISTS admin_pedido_drafts_device_updated ON public.admin_pedido_drafts (device_id, updated_at DESC);
ALTER TABLE public.admin_pedido_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_pedido_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_pedido_drafts TO service_role;
-- No public/authenticated policy: every request must pass the admin API.
CREATE OR REPLACE FUNCTION public.touch_admin_pedido_draft() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_admin_pedido_draft() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS admin_pedido_draft_updated ON public.admin_pedido_drafts;
CREATE TRIGGER admin_pedido_draft_updated BEFORE UPDATE ON public.admin_pedido_drafts
FOR EACH ROW EXECUTE FUNCTION public.touch_admin_pedido_draft();
COMMENT ON TABLE public.admin_pedido_drafts IS 'Rascunhos incompletos do editor admin; salvar não cria pedido nem movimenta estoque ou envia mensagens.';
