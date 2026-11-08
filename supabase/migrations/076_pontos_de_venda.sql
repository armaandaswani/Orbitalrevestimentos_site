-- Migration 076: pontos de venda da página /onde-comprar (nov/2026)
--
-- A página /onde-comprar mostra cada revenda com bairro, mapa, WhatsApp,
-- Instagram e horário. Esta migração:
--   1. cria as colunas novas em partner_showrooms (todas opcionais);
--   2. cadastra 3 revendas novas, INATIVAS: o site em produção mostra toda
--      revenda ativa (home, /projetos, /produtos/pfb), então o dono liga cada
--      uma no admin depois do merge. Reverter = desativar;
--   3. completa a Casa do Eletricista (só o que estiver vazio) e corrige o
--      nome do produto na descrição, se o dono ainda não a tiver editado.
--
-- Pode rodar antes do merge: com as lojas novas inativas nada muda no site.
-- Idempotente: pode rodar mais de uma vez e nunca apaga edição feita no admin.

-- ─── 1. Colunas novas ────────────────────────────────────────────────────────
ALTER TABLE partner_showrooms ADD COLUMN IF NOT EXISTS lat       double precision;  -- coordenada da porta da loja
ALTER TABLE partner_showrooms ADD COLUMN IF NOT EXISTS lng       double precision;
ALTER TABLE partner_showrooms ADD COLUMN IF NOT EXISTS bairro    text;              -- "Centro", "Dom Pedro", "Parque 10"
ALTER TABLE partner_showrooms ADD COLUMN IF NOT EXISTS whatsapp  text;              -- só dígitos, com 55 e DDD (12–13 dígitos)
ALTER TABLE partner_showrooms ADD COLUMN IF NOT EXISTS instagram text;              -- usuário, sem @
ALTER TABLE partner_showrooms ADD COLUMN IF NOT EXISTS horario   text;              -- texto livre

-- ─── 2. Três revendas novas (inativas até o dono ligar no admin) ─────────────
-- Coordenadas conferidas pelo dono em 07/11/2026 (Nominatim, ponto na via).
INSERT INTO partner_showrooms (slug, name, kind, address, maps_url, bairro, lat, lng, whatsapp, instagram, horario, sort_order, active)
VALUES
  ('casa-do-piso-vinilico', 'Casa do Piso Vinílico', 'revenda',
   'R. Pedro Álvares Cabral, 328, Dom Pedro', 'https://maps.app.goo.gl/qH3trQEDs6TRN2HG9',
   'Dom Pedro', -3.0897271, -60.0428509, '5592991525177', 'casadopisovinilico',
   'Seg–Sex 8h–17h · Sáb 8h–12h', 110, false),
  ('imperio-do-piso-vinilico', 'Império do Piso Vinílico', 'revenda',
   'Av. Maneca Marques, 155, Parque 10', 'https://maps.app.goo.gl/42Pt3PyZ6zLNTVMS7',
   'Parque 10', -3.0884093, -60.0147925, '5592984944374', 'imperiorevest',
   'Seg–Sex 8h–17h · Sáb 8h–12h', 120, false),
  ('rwa-comercio-de-pisos', 'RWA Comércio de Pisos', 'revenda',
   'R. Alexandre Magno, 1332, Parque 10', 'https://maps.app.goo.gl/yHEG8BcJww7Q2TSb7',
   'Parque 10', -3.0729976, -60.0021491, '5592991554911', 'rwa_revestimentos',
   'Seg–Sex 8h–17h · Sáb 8h–12h', 130, false)
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. Casa do Eletricista: completa só o que está vazio ────────────────────
-- Coordenada do link do Waze h6xmq60jmj. WhatsApp e endereço exato seguem no admin.
UPDATE partner_showrooms
SET bairro  = COALESCE(bairro, 'Centro'),
    horario = COALESCE(horario, 'Seg–Sex 8h–17h · Sáb 8h–14h'),
    lat     = COALESCE(lat, -3.11924),
    lng     = COALESCE(lng, -60.02185)
WHERE slug = 'casa-do-eletricista-centro';

-- Nome do produto por extenso na descrição criada pela 063. O WHERE exige o
-- texto exato da 063: se o dono já editou a descrição, a linha não muda.
UPDATE partner_showrooms
SET description = 'Todos os modelos do Painel Flexível em Fibra de Bambu em display, no tamanho real.'
WHERE slug = 'casa-do-eletricista-centro'
  AND description = 'Todos os modelos do Painel Flexível Fibra de Bambu em display, no tamanho real.';
