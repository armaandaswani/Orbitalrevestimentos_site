-- Migration 063: showroom parceiro x ponto de revenda
--
-- Os dois são lugares físicos onde o cliente vê o Painel Flexível Fibra de
-- Bambu ao vivo, com endereço e mapa — por isso ficam na mesma tabela e na mesma
-- tela do admin (Projetos → Organização). "kind" diz em que seção da página
-- /projetos cada um aparece:
--   showroom → ambiente decorado numa empresa parceira (Ornare, Sierra…)
--   revenda  → loja que revende, com os modelos em display no tamanho real
--
-- Idempotente: pode rodar mais de uma vez.

ALTER TABLE partner_showrooms ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'showroom';
ALTER TABLE partner_showrooms DROP CONSTRAINT IF EXISTS partner_showrooms_kind_check;
ALTER TABLE partner_showrooms ADD CONSTRAINT partner_showrooms_kind_check CHECK (kind IN ('showroom', 'revenda'));

-- Novo showroom parceiro (endereço, mapa e fotos: preencher no admin).
INSERT INTO partner_showrooms (slug, name, kind, sort_order)
SELECT 'foston-home', 'Foston Home', 'showroom', COALESCE((SELECT MAX(sort_order) + 1 FROM partner_showrooms), 0)
WHERE NOT EXISTS (SELECT 1 FROM partner_showrooms WHERE slug = 'foston-home');

-- Primeiro ponto de revenda (endereço e mapa: preencher no admin).
INSERT INTO partner_showrooms (slug, name, kind, description, sort_order)
SELECT 'casa-do-eletricista-centro', 'Casa do Eletricista — Centro', 'revenda',
       'Todos os modelos do Painel Flexível Fibra de Bambu em display, no tamanho real.',
       COALESCE((SELECT MAX(sort_order) + 1 FROM partner_showrooms), 0)
WHERE NOT EXISTS (SELECT 1 FROM partner_showrooms WHERE slug = 'casa-do-eletricista-centro');
