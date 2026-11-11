# Cadastro de produtos em chegada — fevereiro/2027

O manifesto `chegada-2027-02.json` transcreve as três capturas enviadas pelo dono em 10/11/2026, cruza os nove nomes TechStone com `src/lib/techstone.ts` e aponta para as texturas reais já presentes em `public/images/techstone/`. Nenhum preço, custo ou estoque foi cadastrado por esta preparação.

## Mapa para revisão

| SKU canônico | Item fornecedor | Nome comercial | Referência fornecedor | Quantidade planejada |
|---|---|---|---|---:|
| ORB-020 | ORB0020 | PFB Carbon — Louro Freijó | KL553-56-113 | 700 |
| ORB-021 | ORB0021 | PFB Carbon — Imbuia | KL417-8-103 | 300 |
| ORB-022 | ORB0022 | PFB Carbon — Nogueira | GF849-2-160 | 300 |
| ORB-023 | ORB0023 | PFB Carbon — Jatobá | GF849-1-160 | 300 |
| ORB-024 | ORB0024 | TechStone — Taj Mahal | DS6A1112 | 160 |
| ORB-025 | ORB0025 | TechStone — Travertino Alabastrino | DS6A1113 | 160 |
| ORB-026 | ORB0026 | TechStone — Travertino Romano Clássico | DS6A1083 | 160 |
| ORB-027 | ORB0027 | TechStone — Travertino Silver | DS6A1071 | 160 |
| ORB-028 | ORB0028 | TechStone — Branco Pitaya | Ausente na captura | 160 |
| ORB-029 | ORB0029 | TechStone — Travertino Navona Clássico | DS6A1072 | 100 |
| ORB-030 | ORB0030 | TechStone — Travertino Bianco Trevi | **Conflito: DS6A1072 / DS6A1011** | 100 |
| ORB-031 | ORB0031 | TechStone — Nogueira Americana | M7 | 100 |
| ORB-032 | ORB0032 | TechStone — Imbuia | M10 | 100 |
| ORB-033 | ORB0033 | Perfil de acabamento em alumínio T — 3 m | — | 1.700 |
| ORB-034 | ORB0034 | Perfil de acabamento em alumínio L — 3 m | — | 200 |
| ORB-035 | ORB0035 | Perfil de acabamento em alumínio M — 3 m | — | 200 |
| ORB-036 | ORB0036 | Perfil de acabamento em alumínio W — 3 m | — | 200 |

O padrão `ORB-020` segue os códigos reais da API pública (`ORB-001`, `ORB-002` etc.), consultada somente para leitura. A identificação **comercial** dos nove modelos TechStone é uma correspondência visual da captura com as texturas locais, submetida à revisão final. Ela não transforma um código conflitante do fornecedor em código confirmado.

## Medidas, imagens e pendências

- Carbon: **2,80 × 1,22 m** por placa, conforme captura. Não usar o padrão 2,90 × 1,20 m do PFB existente. Fotografias próprias aguardam a pasta de produtos; nenhuma imagem de outro PFB será reaproveitada.
- TechStone 024–028: **1,20 × 0,60 m**; 029–032: **2,40 × 1,20 m**. Os campos de render usam a orientação vertical das texturas (largura 0,60/1,20; altura 1,20/2,40). Cada linha tem miniatura WebP e download JPG conferidos no disco.
- **Espessura TechStone pendente:** captura registra 2,7 ± 0,2 mm, enquanto vault/site registra 3,5 mm. O script não grava nenhuma dessas espessuras e não modifica informação pública.
- Perfil T: preto 450, dourado 450, cor ORB-020 350, ORB-021/022/023 150 cada. Perfis L, M e W: preto 100 e dourado 100 cada. Barras de **3 m**, espessura de origem **0,7 mm**. A subdivisão fica no manifesto; novos SKUs por cor não foram aprovados.
- O cabeçalho do fornecedor chama Carbon de “WALL PANEL PVC”. Não serve como laudo de composição nem altera o posicionamento comercial aprovado para o Painel Flexível em Fibra de Bambu.
- Códigos 028 ausente e 030 conflitante continuam nulos. Não bloqueiam o cadastro pelo SKU Orbital; exigem confirmação antes de comprar por referência do fornecedor.

## Executar com segurança

Prévia local, sem acessar banco, sem credenciais e sem gravar:

```sh
node scripts/provisionar-catalogo-chegada.mjs
```

Conferir o catálogo completo (ativos e inativos) somente para leitura, com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já fornecidas pelo ambiente:

```sh
node scripts/provisionar-catalogo-chegada.mjs --inspect
```

O script apresenta o SHA-256 do arquivo exato. Depois da revisão do responsável, a aplicação exige o mesmo hash:

```sh
node scripts/provisionar-catalogo-chegada.mjs --apply --approved-sha256=HASH_EXATO_REVISADO
```

O modo `--apply` exige a migração **078** para `products.expected_delivery_month`, preços/custos anuláveis e índice/constraint **UNIQUE em `products.code`**. Não altera schema nem tenta contornar falha de unicidade. Faz uma inserção com `ignoreDuplicates`; não atualiza produtos existentes. Aliases equivalentes (`ORB0020` e `ORB-020`) são detectados antes da gravação. Duas linhas existentes para o mesmo código bloqueiam a aplicação.

Produtos novos entram ativos para o admin, **fora da vitrine pública**, com linha própria `Carbon`, `TechStone` ou `Perfis`, preços/custos nulos, `stock_on_hand=0`, `stock_reserved=0` e previsão mensal `2027-02`. Quantidades da captura não vão para estoque nem criam movimentos, compras, recebimentos, preços ou variações. Dados existentes, inclusive IDs, nomes, imagens, preços, estoques e datas, são preservados integralmente; divergências aparecem na prévia.

Verificação offline:

```sh
node --test src/lib/catalog-provision.test.mjs
```
