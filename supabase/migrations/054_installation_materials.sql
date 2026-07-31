-- Materiais de instalação por tipo de aplicação.
--
-- Cria os três produtos internos que o orçamento passa a calcular sozinho em
-- teto/forro, espelhados no ORB-PU (Cola PU-40): ativos para o motor precificar,
-- mas FORA do catálogo público. A visibilidade usa o mesmo mecanismo já existente
-- — show_in_catalog = false + lista de SKUs de suporte no /api/products.
--
-- PREÇOS FICAM EM ZERO de propósito. Não invento preço de venda: enquanto
-- estiverem zerados o motor escolhe a embalagem pela MENOR SOBRA e sinaliza o
-- aviso, em vez de decidir por um número inventado. Preencha em
-- Produtos → editar, e a escolha passa a ser pelo menor custo.
--
-- Idempotente: pode rodar mais de uma vez.

insert into products (code, name, linha, finish, price, price_per_m2, description,
                      image_path, is_active, show_in_catalog, sort_order,
                      cost_price, stock_on_hand, stock_reserved, reorder_point,
                      sale_unit, icms_rate)
select v.code, v.name, 'Classic', 'Fosco', 0, 0, v.description,
       '', true, false, 0,
       0, 0, 0, 0,
       v.sale_unit, 7
  from (values
    ('ORB-CC26', 'Cola de Contato — 2,6 L',
     'Cola de contato adequada para aplicação de PFB (Placa de Fibra de Bambu) em teto e forro. Embalagem de 2,6 litros. Rendimento de 0,25 L por placa. Produto interno de instalação, incluído automaticamente no orçamento.',
     'lata'),
    ('ORB-CC14', 'Cola de Contato — 14 L',
     'Cola de contato adequada para aplicação de PFB (Placa de Fibra de Bambu) em teto e forro. Embalagem de 14 litros. Rendimento de 0,25 L por placa. Produto interno de instalação, incluído automaticamente no orçamento.',
     'lata'),
    ('ORB-ESP', 'Espuma Expansiva — tubo',
     'Espuma expansiva adequada para aplicação de PFB (Placa de Fibra de Bambu) em teto e forro. Consumo de 0,75 tubo por placa. Produto interno de instalação, incluído automaticamente no orçamento.',
     'tubo')
  ) as v(code, name, description, sale_unit)
 where not exists (select 1 from products p where p.code = v.code);

-- Garante a regra de visibilidade também em quem já existia (reexecução ou SKU
-- criado à mão pelo painel com o padrão show_in_catalog = true).
update products
   set show_in_catalog = false
 where code in ('ORB-PU', 'ORB-CC26', 'ORB-CC14', 'ORB-ESP')
   and show_in_catalog is distinct from false;

-- Parâmetros do cálculo no mesmo singleton que já guarda a configuração do
-- orçamento (orcamento_settings.config), para o painel poder editá-los sem
-- alterar código. O que não estiver aqui cai no padrão do motor.
update orcamento_settings
   set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
     'pu40TubesPerPanel',      1.5,
     'adhesiveLitersPerPanel', 0.25,
     'foamTubesPerPanel',      0.75,
     'foamCode',               'ORB-ESP',
     'pu40Code',               'ORB-PU',
     'pu40AppliesTo',          jsonb_build_array('parede'),
     'adhesiveAppliesTo',      jsonb_build_array('teto', 'forro'),
     'adhesivePackages',       jsonb_build_array(
        jsonb_build_object('code', 'ORB-CC26', 'liters', 2.6, 'label', '2,6 L'),
        jsonb_build_object('code', 'ORB-CC14', 'liters', 14,  'label', '14 L')
     )
   )
 where id = 1;
