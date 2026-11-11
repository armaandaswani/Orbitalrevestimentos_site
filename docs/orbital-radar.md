# Orbital Radar · Obras & Prospecção

A aba `/admin?tab=radar` reúne as placas, as obras revisadas e a preparação comercial. A operação usa a sessão administrativa e o Supabase do site. No modo local de teste, os registros existem em memória até o servidor reiniciar.

## Operação

1. Selecione até 20 fotos de cada vez. O Radar valida o arquivo, identifica cópias exatas e registra o estado de cada foto. O limite é de 12 MB e 64 megapixels por foto. JPEG, PNG, WebP e HEIC dependem dos formatos que o Sharp consegue decodificar no ambiente.
2. Abra **Revisar** e compare os campos sugeridos com a foto original. O OCR separa o autor do projeto do responsável técnico, registra a origem e sinaliza alternativas conflitantes. Preencha manualmente os campos ausentes. A confirmação libera o cadastro.
3. O Radar compara alvará e processo dentro do mesmo município e UF. Uma segunda foto pode ser vinculada a uma obra existente. Se os dois identificadores apontarem para obras distintas, a operação exige resolução humana.
4. Abra **Ver oportunidade**. A prioridade mostra os fatores que compõem a pontuação. Registre a relevância comercial da obra e as fontes públicas consultadas. A confirmação de vínculo profissional exige evidências de dois domínios distintos e revisão humana.
5. Gere, revise e aprove um rascunho interno. A supressão por obra impede a preparação comercial. A aprovação fica no Radar. O Radar exporta um CSV com os registros revisados e o filtro aplicado.

## Arquitetura

| Camada | Implementação |
| --- | --- |
| Admin | Sessão existente, componentes compartilhados, `RadarTab.tsx` e `RadarResearch.tsx`. |
| APIs | `/api/admin/radar` para evidência, extração, cadastro e CSV. `/api/admin/radar/research` para pesquisa, rascunho e supressão. |
| Dados | Migração 081 para evidências, obras, identificadores, histórico, RPC transacional e bucket privado. Migração 082 para pesquisa e preparação comercial. |
| OCR | Apple Vision local em macOS e adaptador Tesseract em ambientes com binário e idioma disponíveis. Validação de imagem com Sharp. A revisão manual funciona sem um motor instalado. |
| Operação comercial | O Vault e o Orbital AI OS orientaram o contexto e a política de pesquisa manual. O Radar tem armazenamento próprio. A integração com CRM de representantes, Ste, SMClick, fila de agentes e automações depende de uma etapa posterior. |
| Fontes públicas | Consulta manual via CAU e CREA-AM, com links e notas anexados à obra. A presença de links permite auditar a decisão humana. Diretórios, geocodificação, redes sociais, pesquisa automatizada e validação de contatos seguem pendentes. |

Foram consultados Find Skills, Taste, Vercel Web Design Guidelines, Playwright CLI, Image to Code e a referência Linear da coleção DESIGN.md. A interface usa a linguagem do admin existente. A busca por OCR encontrou smart-ocr, PaddleOCR e opções de treinamento e nuvem. O primeiro recorte ficou com os motores locais, sem instalar dependências de terceiros no projeto. A comparação nas duas referências favoreceu o Apple Vision. O adaptador Tesseract com a configuração testada não recuperou os campos das duas referências.

## Validação

| Caso | Resultado |
| --- | --- |
| Lote real, 58 fotos | Vision executou em todas sem erro do motor. Em 40 encontrou pelo menos um candidato a alvará ou processo. Em 18, nenhum. Oito tiveram ambos os papéis lidos, três tiveram conflitos de campos e 23 tinham mais de 4 MB. Os números medem cobertura, sem estimativa de precisão. |
| Referência IMG_7706 | Candidatos a alvará e processo. Área normalizada 53,10 m² e data 09/08/2026. Papéis distintos. Registros profissionais e ART/RRT sugeridos para conferência. |
| Referência IMG_7762 | Candidatos a alvará e processo. Área normalizada 260,32 m² e data 01/09/2027. A mesma pessoa nos dois papéis. Registros por papel sugeridos, com RRT separado pendente. |
| Unidade | Normalização, layout do OCR, papéis, conflitos, privacidade, prioridade e exportação. |
| Ponta a ponta com placas sintéticas | Sessão, upload, OCR, revisão, duplicidade, evidência privada, conflitos de versão, CSV, pesquisa, aprovação e supressão. |
| Migrações | Executadas em PostgreSQL descartável via PGlite com esquema de Storage simulado. Testadas políticas, conflitos, revisões e idempotência. |
| Navegador | Fluxo de cadastro e abertura da oportunidade via Playwright. Sem overflow horizontal na aba testada em 1440, 768 e 390 px. |

As duas fotos reais passaram pelo OCR e pelo parser. As fotos do lote ficaram na pasta de origem. Nenhuma obra real foi cadastrada durante a validação. Os dados acima excluem nomes, endereços e identificadores de pessoas.

## Execução local

```sh
npm ci
swiftc -O scripts/radar/vision.swift -o /tmp/orbital-radar-vision
RADAR_SANDBOX=1 RADAR_OCR=vision RADAR_VISION_BIN=/tmp/orbital-radar-vision \
  ADMIN_PASSWORD=radar-test-only ADMIN_SESSION_SECRET=radar-test-only-local \
  npm run dev -- --port 3166
```

Use `http://127.0.0.1:3166/admin?tab=radar`. O sandbox exige ambiente de desenvolvimento e ausência de configuração Supabase. As telas legadas que consultam o banco podem registrar erros nesse modo. Para Tesseract, instale o binário e o idioma português, use `RADAR_OCR=tesseract` e configure `RADAR_TESSERACT_BIN` ou `RADAR_TESSERACT_LANG` apenas se precisar substituir o padrão.

```sh
node scripts/radar/unit.mjs
node scripts/radar/e2e.mjs
RADAR_OCR=vision RADAR_VISION_BIN=/tmp/orbital-radar-vision \
  node scripts/radar/benchmark.mjs "$HOME/Desktop/Placas Implurb"
```

Para repetir o teste de migrações, instale `@electric-sql/pglite` em um diretório temporário e execute `node scripts/radar/migrations.mjs` com `RADAR_PGLITE_PATH` apontando para `node_modules/@electric-sql/pglite/dist/index.js`.

## Homologação e ativação

- Em um projeto Supabase de homologação, aplique `081_orbital_radar.sql` e `082_radar_intelligence.sql` na ordem. Confira RLS, bucket privado e leitura após expiração da URL assinada.
- Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `ADMIN_SESSION_SECRET` usando a infraestrutura existente. Defina `RADAR_ENABLED=1` apenas no ambiente escolhido.
- Em Vercel, homologue o upload assinado ao Storage para fotos maiores que 4 MB. O caminho depende do Storage real e ficou pendente de teste integrado. O processamento nativo requer um runtime que execute Vision no macOS ou Tesseract com português. A Vercel sem esse runtime permite revisão manual. Um worker separado continua pendente.
- A imagem original privada pode conter dados pessoais. Defina responsáveis, base legal e retenção antes de carregar a operação real. URLs temporárias, controles de acesso e minimização de campos reduzem exposição. A filtragem de OCR é heurística. A autenticação compartilhada identifica o administrador genericamente no histórico. Supressão e auditoria por pessoa, expurgo e permissões individualizadas ainda exigem implementação.
- As fontes manuais atuais dispensam credenciais de provedores. Conectores comerciais futuros dependem de acesso autorizado, termos, quotas e regras de consentimento e supressão. O Radar atual encerra o fluxo na aprovação interna.

## Próximos passos

| Prioridade | Melhoria | Impacto | Esforço e custo | Risco |
| --- | --- | --- | --- | --- |
| 1 | Homologar upload direto, acesso, expurgo e OCR persistente | Alto | Médio | Tratar acesso e dados pessoais antes da ativação |
| 2 | Rotular uma amostra e medir precisão por campo e tempo de revisão | Alto | Baixo a médio | Evitar uso de candidatos como dados confirmados |
| 3 | Identidade individual, supressão por pessoa e integração com CRM | Alto | Médio | Evitar duplicidade e violação de preferências |
| 4 | Validar conectores de pesquisa e preparação comercial assistida | Médio | Variável por provedor | Depende de termos, credenciais e aprovação humana |
