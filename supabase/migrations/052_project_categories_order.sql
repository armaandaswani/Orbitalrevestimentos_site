-- A página /projetos montava as seções e os filtros a partir de listas fixas no
-- código, ignorando project_categories.sort_order — o painel dizia "a ordem vale
-- no site" e não valia. Agora a página lê a tabela; esta migração prepara o dado
-- para que a troca não mude nada visualmente (exceto a ordem, que passa a ser sua).
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.

-- Descrição da seção (o subtítulo ao lado do nome na galeria), editável no painel.
alter table project_categories add column if not exists description text;

-- Rótulos com acento e descrições das seções que antes viviam no código.
update project_categories set label = 'Residencial',  description = coalesce(description, 'Ambientes residenciais revestidos sem obra')            where slug = 'residencial';
update project_categories set label = 'Comercial',    description = coalesce(description, 'Restaurantes, escritórios e espaços de uso coletivo')    where slug = 'comercial';
update project_categories set label = 'Áreas Úmidas', description = coalesce(description, 'Lavabos, banheiros e cozinhas — sem inchar, sem mofar')  where slug = 'umido';
update project_categories set label = 'Showroom',     description = coalesce(description, 'Ambientes em exposição — visite e veja de perto')        where slug = 'showroom';
update project_categories set label = 'Náutico',      description = coalesce(description, 'Revestimento homologado para embarcações')               where slug = 'nautico';

-- O projeto "hall" aparecia na seção Comercial porque o slug estava escrito à mão
-- naquela lista, embora esteja marcado só como "residencial". Com as seções vindo
-- da tabela ele mudaria de lugar sozinho — marcamos como comercial para manter
-- exatamente o que o site mostra hoje.
update project_photos
   set categories = array_append(categories, 'comercial')
 where slug = 'hall' and not (categories @> array['comercial']);
