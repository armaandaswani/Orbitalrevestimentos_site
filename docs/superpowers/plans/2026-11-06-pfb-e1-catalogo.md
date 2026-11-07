# PFB, Etapa 1 (catálogo e contrato de links): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans, tarefa por tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** levar o catálogo do PFB de `/produtos/pfb` para `/produtos/pfb/catalogo`, com textos corrigidos, sem rolagem lateral, com `?linha=` e `?modelo=` na URL, redirecionamentos 307 que mantêm vivos os QR impressos e os eventos `consultor_clicado` e `manual_solicitado` chegando ao GA4.

**Arquitetura:** o contrato de links fica todo em `src/lib/product-link.ts`, um módulo puro (`catalogoPath`, `linhaDaUrl`, `productPath`), e o catálogo, os redirecionamentos e os scripts de verificação só o consomem. Os eventos passam por `src/lib/funnel.ts`, que ganha um envio ao `gtag` com fila (`src/lib/gtag-fila.ts`, puro). A página do catálogo é a atual, movida com `git mv` e alterada no lugar. O visual não muda, além da rolagem lateral.

**Tecnologia:** Next.js 16.2.4 (App Router), React 19.2, Tailwind v4, TypeScript, Node 24 (`node --test` com `*.test.mjs` importando `.ts`), Playwright pelo `PW_CORE` de `scripts/medir-movimento.mjs` (sem dependência nova).

**Spec:** `/Users/armaandaswani/orbital-movimento/.superpowers/sdd/2026-11-06-pagina-pfb/design_doc.md`, aceita pelo dono em 06/11/2026. Leia antes de cada tarefa as seções que ela cita. "Item N" é o item N de "Detailed Implementation Plan › Etapa 1"; "Catálogo" é a subseção "Catálogo em /produtos/pfb/catalogo"; "VP" é a "Verification Plan". Os números de linha da spec são de `478adb2`; a base desta branch é `284e60c`, que só mudou `src/lib/instagram-agenda.ts`, então eles valem para a versão de partida. **Depois de editado, o arquivo muda de número de linha.** Todo `:N` da spec e deste plano se refere a `git show 284e60c:<arquivo>` (para o catálogo, `git show 284e60c:src/app/produtos/pfb/page.tsx`): abrir essa versão, achar o elemento pelo conteúdo e então localizá-lo no arquivo atual.

## Restrições globais

- Repositório: `/Users/armaandaswani/orbital-movimento`, branch `pfb-e1-catalogo` (sem upstream). Git sempre como `/opt/homebrew/bin/git` (o `/usr/bin/git` falha pela licença do Xcode).
- Commit só na branch; nunca `push` para a `main`, nunca `git push --force`. Assunto do commit em português, sem travessão, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nenhum texto novo fora das tabelas da spec. Copiar os textos exatamente como estão em "Catálogo › Textos corrigidos", no item 4 e em "SEO por rota › /produtos/pfb/catalogo".
- Copy: sem travessão (— ou –) em texto, `alt`, `aria-label` ou `title` novo; "Painel Flexível em Fibra de Bambu (PFB)" por extenso na primeira menção; nada de preço, "mais caro", concorrentes ou outros materiais; a Orbital é fornecedora e não instala.
- Sem rolagem lateral em nenhuma largura de 320 px para cima.
- Animação só com `transform`/`opacity`. Esta etapa não cria animação.
- Segurança (hook cc-safety-net): nunca ler nem copiar `.env*`; nada de variável de shell como executável, de `python3 -c` com variável nem de heredoc em Python; nada de `rm -rf` fora de `/tmp`. Os testes locais nunca mandam nada ao GA4, ao Meta Pixel nem ao Vercel Analytics (itens 15 e 15c).
- Arquivos de teste de navegador e o mock ficam em `.superpowers/checks/` (fora do commit, nunca no scratchpad de `/private/tmp`). `scripts/verificar-pfb.mjs` e `scripts/fixtures/produtos-pfb.json` entram no commit.
- Antes de usar uma API do Next, ler o guia dela (regra do `AGENTS.md`; Passo 0 da spec): `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md`, `…/04-functions/generate-metadata.md` e `…/03-file-conventions/layout.md` (todos sob `node_modules/next/dist/docs/01-app/03-api-reference/`).
- Nada de push nem publicação antes da Tarefa 8.
- Nenhuma página do site é aberta num navegador sem o corte das análises (`context.route(...)` do item 15 e `orbital-intro` por `addInitScript`). O servidor local carrega o GA4 e o Meta Pixel. Por isso nada de abrir as páginas no painel do navegador nem no Chrome: conferência em navegador só pelos scripts Playwright com o corte; fora disso, `curl`.
- Toda tarefa termina com `npx next typegen`, `npx tsc --noEmit` e `npm run lint` sem erro novo em relação à base gravada no Passo 0 da Tarefa 1, mais os testes que já existem (`npm run test:movimento`) passando. O `typegen` vem antes porque o `tsconfig.json` inclui `.next/types/**` e `.next/dev/types/**`, e o validador gerado ali importa as rotas: depois de mover ou apagar uma rota, só ele tira as importações velhas. Se sobrar erro TS2307 em `.next/dev/types` apontando para `src/app/produtos/pfb/page.js` ou `layout.js`, ele some ao subir o `next dev` e não conta como erro novo.
- A branch só pode ir ao ar inteira, depois da Tarefa 6. Entre a Tarefa 1 e a 6 há estados intermediários que não são publicáveis: o `productPath` aponta para uma rota que ainda não existe e, depois da Tarefa 4, `/produtos/pfb` dá 404 até os redirecionamentos da Tarefa 6. Na conferência da Tarefa 4, esse 404 é esperado.
- Comandos `curl` sempre com a URL inteira entre aspas (por causa do `&`).

## Foco da revisão

Casos que a spec implica e que a VP não cobre. Cada um ganhou uma verificação na tarefa que é dona do código:

1. **QR antigo com o código em maiúsculas** (`/produtos/pfb?modelo=ORB-003` e `/produtos?modelo=ORB-003`): o 307 mantém a query, e o catálogo abre o modelo ORB-003. Dona: Tarefa 7, verificações "QR em maiúsculas".
2. **QR ou link com parâmetros a mais** (`/produtos?modelo=orb-003&utm_source=qr`): o `Location` mantém `modelo` e `utm_source`, e o modelo abre. Dona: Tarefa 7, nos redirecionamentos.
3. **`?linha=` inválida com um modelo válido** (`?linha=xyz&modelo=<código Classic>`): o modelo abre, o filtro fica em "Todos" e a URL não muda (regra da subseção "Catálogo", URL). Dona: Tarefa 7.
4. **Sitemap não lista endereço que redireciona:** `/sitemap.xml` tem `/produtos/pfb/catalogo` e não tem `<loc>…/produtos/pfb</loc>`. Dona: Tarefa 6 (verificação no `next start`) e Tarefa 7 (verificação automática).
5. **Fechar o modelo depois de chegar por um QR** (`?modelo=<código>`, sem `linha`): a URL fica `/produtos/pfb/catalogo` e recarregar não reabre o modelo. Dona: Tarefa 7.

---

### Tarefa 1: Contrato de links e lint da pasta local

**Arquivos:**
- Modificar: `src/lib/product-link.ts` (todo o módulo)
- Criar: `src/lib/product-link.test.mjs`
- Modificar: `package.json` (`scripts`)
- Modificar: `eslint.config.mjs:9-15`

**Interfaces:**
- Produz: `type LinhaCatalogo = "todos" | "Classic" | "Brilliance" | "Elegance"`; `LINHA_SLUG: Record<"Classic" | "Brilliance" | "Elegance", string>`; `CATALOGO_PATH = "/produtos/pfb/catalogo"`; `linhaDaUrl(search: string): LinhaCatalogo`; `catalogoPath(o: { linha?: LinhaCatalogo | null; modelo?: string | null }): string`. `productPath(code)`, `productUrl(code)`, `productQrUrl(...)` e `normalizeProductCode(code)` mantêm a assinatura.

- [ ] **Passo 0: Base do lint e do tipo.** Antes de qualquer mudança: `npx tsc --noEmit > .superpowers/checks/saida/base-tsc.txt 2>&1` e `npm run lint > .superpowers/checks/saida/base-lint.txt 2>&1` (criar a pasta antes, se faltar). "Erro novo", daqui em diante, é o que não está nesses arquivos. O lint da base ainda inclui `.superpowers/`, e o Passo 6 tira isso.
- [ ] **Passo 1: Escrever o teste que falha.** `src/lib/product-link.test.mjs` exatamente como o item 2: `import test` e `import assert`, depois `delete process.env.NEXT_PUBLIC_SITE_URL;`, depois `const L = await import("./product-link.ts");`, e um `test` por caso, com os 11 casos do item 2 e os valores dele.
- [ ] **Passo 2: Acrescentar os scripts.** Em `package.json`, `"test:links": "node --test \"src/lib/product-link.test.mjs\""` e `"test:funil": "node --test \"src/lib/gtag-fila.test.mjs\""` (item 3). O `test:funil` só passa na Tarefa 2.
- [ ] **Passo 3: Rodar e ver falhar.** `npm run test:links`. Esperado: FAIL (`catalogoPath` não é função, `productPath` com o caminho antigo).
- [ ] **Passo 4: Implementar o item 1** em `src/lib/product-link.ts`, sem `import`: os novos nomes acima, `productPath(code)` devolvendo `catalogoPath({ modelo: code })` e o comentário do topo atualizado (o modelo agora vive no catálogo). Em `catalogoPath`, primeiro `linha` e depois `modelo`; `modelo` passa por `normalizeProductCode` e por `encodeURIComponent`; `linha` `"todos"`, nula ou ausente, e `modelo` vazio, ficam fora da query.
- [ ] **Passo 5: Rodar e ver passar.** `npm run test:links`. Esperado: 11 testes, todos `ok`.
- [ ] **Passo 6: Item 15d.** Em `eslint.config.mjs`, depois de `"next-env.d.ts"`, acrescentar `".superpowers/**"` com o comentário `// pasta local de desenho e de testes, fora do repositório`.
- [ ] **Passo 7: Conferir.** `npx tsc --noEmit` e `npm run lint`: nenhum erro novo. `productPath` ainda é importado pelo catálogo antigo; ele compila, só muda o destino.
- [ ] **Passo 8: Commit.** `/opt/homebrew/bin/git add src/lib/product-link.ts src/lib/product-link.test.mjs package.json eslint.config.mjs` e commit "Links do catálogo do PFB: catalogoPath, linhaDaUrl e productPath em /produtos/pfb/catalogo".

### Tarefa 2: Eventos do consultor e do manual, com fila do gtag

**Arquivos:**
- Criar: `src/lib/gtag-fila.ts`, `src/lib/gtag-fila.test.mjs`
- Modificar: `src/lib/funnel.ts`
- Modificar: `src/components/ContatoCta.tsx`
- Modificar: `src/components/SolicitarManual.tsx`

**Interfaces:**
- Produz: `FILA_MAX = 20`; `criarEnvioGtag(o: { lerGtag: () => ((...a: unknown[]) => void) | undefined; agendar: (fn: () => void, ms: number) => unknown; max?: number }): { enviar(evento: string, props?: Record<string, unknown>): void; pendentes(): number }`. `FunnelEvent` ganha `"consultor_clicado"` e `"manual_solicitado"`. `ContatoCta` ganha a prop opcional `origem?: string`.
- A Tarefa 5 usa `<ContatoCta origem="catalogo-modelo" …>`.

- [ ] **Passo 1: Escrever o teste que falha.** `src/lib/gtag-fila.test.mjs` com os quatro casos do item 12a, usando `lerGtag` e `agendar` falsos. O `agendar` guarda a função, e o teste a chama na mão. Nomes: `"envia direto quando o gtag existe"`, `"guarda na fila e esvazia na ordem quando o gtag aparece"`, `"fila limitada a 20, descarta os novos"`, `"erro do gtag não escapa de enviar"`. Acrescentar um quinto caso, `"uma tentativa agendada por vez"`: sem `gtag`, três `enviar` seguidos chamam o `agendar` falso uma vez só.
- [ ] **Passo 2: Rodar e ver falhar.** `npm run test:funil`. Esperado: FAIL (módulo ausente).
- [ ] **Passo 3: Implementar `src/lib/gtag-fila.ts`** pelo item 12a: sem `import` e sem ler `window`; nova tentativa a cada 250 ms, no máximo 40 seguidas; cada chamada ao `gtag` num `try/catch`; um evento que deu erro não volta para a fila; o próximo `enviar` depois da 40ª tentativa recomeça a contagem.
- [ ] **Passo 4: Rodar e ver passar.** `npm run test:funil`. Esperado: 5 testes, todos `ok`.
- [ ] **Passo 5: Item 12 em `src/lib/funnel.ts`.** Os dois eventos novos no tipo, o `declare global` do `window.gtag`, `const envioGtag = criarEnvioGtag({ … })` no topo do módulo (exatamente como no item 12) e `envioGtag.enviar(event, props)` dentro de `trackFunnel`, num `try/catch` próprio, depois do `track` do Vercel.
- [ ] **Passo 6: Item 13 em `ContatoCta.tsx`.** Prop `origem?: string`. O `onClick` (`:22`) passa a ser `() => { trackFunnel("consultor_clicado", { origem: origem ?? null, pagina: window.location.pathname }); onClick?.(); abrirContato(produtos ?? []); }`.
- [ ] **Passo 7: Item 14 em `SolicitarManual.tsx`.** No `onClick` de "Solicitar pelo WhatsApp", quando `pronto`: `trackFunnel("manual_solicitado", { pagina: window.location.pathname, perfil: perfil ?? "" })`. O visual não muda.
- [ ] **Passo 8: Conferir.** `npx tsc --noEmit`, `npm run lint`, `npm run test:links`, `npm run test:funil` e `npm run test:movimento`. Esperado: tudo verde.
- [ ] **Passo 9: Commit.** "Funil: consultor_clicado e manual_solicitado também no GA4, com fila até o gtag carregar".

### Tarefa 3: Fixture dos produtos, mock do Supabase e portão de movimento

Vem antes do catálogo porque o `npm run build` e o servidor local das tarefas seguintes leem o Supabase pelo mock (VP › Ambiente).

**Arquivos:**
- Criar: `scripts/fixtures/produtos-pfb.json` (item 15b)
- Criar, fora do commit: `.superpowers/checks/pfb-mock/servidor.mjs` e `.superpowers/checks/pfb-mock/dados/{products,partner_showrooms,project_photos}.json` (item 15a)
- Modificar: `scripts/medir-movimento.mjs` (item 15c e os comentários de `:20` e `:251` do item 10)

**Interfaces:**
- Produz: o mock em `http://127.0.0.1:54329`, que se sobe com `node .superpowers/checks/pfb-mock/servidor.mjs` e grava o log em `.superpowers/checks/saida/pfb-mock.log` (linhas no formato `<ISO 8601> <método> <caminho>?<query> <status>`). O site o lê com `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_ANON_KEY=falsa SUPABASE_SERVICE_ROLE_KEY=falsa` na linha de comando. Daqui em diante, "variáveis do mock" quer dizer essas três.

- [ ] **Passo 1: Fixture (15b).** Gravar `GET https://orbitalrevestimentos.com.br/api/products` uma vez, sem edição, em `scripts/fixtures/produtos-pfb.json`. Só leitura pública.
- [ ] **Passo 2: Mock (15a).** `servidor.mjs` em `node:http`, em `127.0.0.1:54329`, seguindo o item 15a ponto por ponto: tabelas, filtros `eq.`/`ilike.`, `order`, objeto único com 406 `PGRST116`, 404 `{}` fora de `/rest/v1/`, formato exato do log, `mkdirSync` antes de zerar o log. Os dados vêm das três fontes públicas do item 15a, com `is_active`, `active` e `sort_order` acrescentados como lá.
- [ ] **Passo 3: Conferir o mock.** Com o mock no ar: `curl -s "http://127.0.0.1:54329/rest/v1/products?is_active=eq.true"` devolve a lista; `curl -s -H "Accept: application/vnd.pgrst.object+json" "http://127.0.0.1:54329/rest/v1/products?code=ilike.orb-003"` devolve um objeto só; `curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:54329/rest/v1/xyz?id=eq.1" -H "Accept: application/vnd.pgrst.object+json"` dá `406`; o log tem uma linha por pedido no formato acima.
- [ ] **Passo 4: Site lendo o mock.** Na `HEAD` atual: `npm run build` e `npx next start -p 3004`, os dois com as variáveis do mock. `curl -s "http://localhost:3004/api/products"` devolve a mesma lista de `code` da fixture, na mesma ordem (a rota remonta cada linha, então os outros campos podem diferir), e o log ganha uma linha ` GET /rest/v1/products`. O `next start` continua no ar para o passo 5.
- [ ] **Passo 5: Portão (15c).** Em `medir-movimento.mjs`, por padrão: corte das análises, nível completo e cortina da abertura desligada, no lugar e na ordem do item 15c; `altura`/`alturaTelas` por faixa e `innerHeight` por dispositivo; os comentários de `:20` e `:251` passam a citar `/produtos/pfb/catalogo`. Comentário no topo explicando os três. Conferir com `node --check scripts/medir-movimento.mjs` e com uma medição curta: `node scripts/medir-movimento.mjs --url http://localhost:3004/produtos --dispositivo desktop-1440 --saida .superpowers/checks/saida/portao-teste` (com o `next start` do passo 4 no ar). O `resumo.json` tem `innerHeight`, e no código o `ctx.route(...)` das análises e o `ctx.addInitScript(...)` vêm antes do `page.goto` (`:256`). Depois, parar o `next start` (o mock pode continuar no ar).
- [ ] **Passo 6: Commit.** Entram `scripts/fixtures/produtos-pfb.json` e `scripts/medir-movimento.mjs`; o mock não entra. Mensagem: "Portão de movimento sem análises nem cortina, e fixture dos produtos do PFB".

### Tarefa 4: Catálogo em /produtos/pfb/catalogo, com URL, linha e bloco com chave

**Arquivos:**
- Criar: `src/lib/pfb-linhas.ts`
- Mover: `src/app/produtos/pfb/page.tsx` → `src/app/produtos/pfb/catalogo/page.tsx` (`/opt/homebrew/bin/git mv`)
- Criar: `src/app/produtos/pfb/catalogo/layout.tsx`
- Remover: `src/app/produtos/pfb/layout.tsx` (`git rm`)

**Interfaces:**
- Consome: `catalogoPath` e `linhaDaUrl` (Tarefa 1). O `type Linha` da página (`:14`) fica como está: ele é igual a `LinhaCatalogo`, e a spec não pede para importá-lo.
- Produz: `LINHAS_PFB: ReadonlyArray<{ chave: "Classic" | "Brilliance" | "Elegance"; acabamento: string; frases: readonly [string, string] }>`, que a E2/3 e a E4 também leem.

- [ ] **Passo 1: Item 4.** `src/lib/pfb-linhas.ts` com os três textos exatos do item 4 e um comentário com as fontes. Sem campo `slug`.
- [ ] **Passo 2: Mover e remover.** `git mv` da página. `git rm src/app/produtos/pfb/layout.tsx` (item 7: os `Product` saem do catálogo e voltam na E2/3).
- [ ] **Passo 3: Item 6.** Ler o guia de `metadata` e o de `layout` em `node_modules/next/dist/docs/`. Criar `catalogo/layout.tsx` com `export const metadata` exatamente como em "SEO por rota › /produtos/pfb/catalogo" (título, descrição, `keywords` copiadas de `git show HEAD:src/app/produtos/pfb/layout.tsx` nas linhas 7 a 21, canônico, `openGraph` com a imagem da escada) e o `BreadcrumbList` (Home › Produtos › Painel Flexível em Fibra de Bambu › Catálogo, `ListItem` com `position` de 1 a 4 e `item` em URL absoluta `https://orbitalrevestimentos.com.br/...`, no padrão de `src/app/projetos/layout.tsx:46-58`) em `<script id="ld-catalogo" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }} />`, depois de `{children}`.
- [ ] **Passo 4: Lógica de URL na página** (item 5, primeiro e terceiro marcadores; "Catálogo", marcador URL). Imports: `catalogoPath` e `linhaDaUrl` entram, `productPath` sai. `syncUrl` fica com dependências vazias e lê a linha de `location.search`. Ao trocar a linha, `replaceState` com `catalogoPath({ linha, modelo: selected?.code })`. Na montagem, num efeito com `const t = setTimeout(() => setActiveLinha(linhaDaUrl(location.search)), 0)` e limpeza `clearTimeout(t)` (o padrão do arquivo, que evita o aviso do lint de `setState` dentro de efeito). O `popstate` relê `linha` e `modelo`. Na chegada com `?modelo=`, a correção da linha segue as três regras do marcador URL, inclusive o aviso de modelo indisponível com `?linha=X`.
- [ ] **Passo 5: Bloco com chave** (item 5, quarto marcador). Trocar o ternário de `:811` pela estrutura exata de "Catálogo › Cabeçalho da linha filtrada só depois dos modelos" (`key="esqueleto"` / `key="grade"`, com o cabeçalho dentro do bloco `grade`).
- [ ] **Passo 6: `LINHA_INFO` a partir de `LINHAS_PFB`** (item 5, segundo marcador). `material` = `` `1,20 × 2,90 m × 5 mm · ${acabamento}` ``; `color` sem mudança; o campo `differentials` sai do objeto e do tipo.
- [ ] **Passo 7: Conferir no servidor de desenvolvimento.** `npx next typegen`. Com o mock da Tarefa 3 no ar, `npm run dev -- -p 3005` com as variáveis do mock. Esperar o servidor ficar pronto, pedir a página uma vez com `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3005/produtos/pfb/catalogo?linha=classic"` (esperado `200`; isso também regenera `.next/dev/types`) e só então rodar `npx tsc --noEmit` e `npm run lint`. `curl` em `"http://localhost:3005/produtos/pfb"` dá `404`, o que é esperado até a Tarefa 6. A aba marcada pela URL é conferida na Tarefa 7, pelo `verificar-pfb` com o corte das análises; aqui não se abre navegador. Parar o servidor no fim.
- [ ] **Passo 8: Commit.** "Catálogo do PFB em /produtos/pfb/catalogo, com ?linha= e o cabeçalho da linha dentro da grade".

### Tarefa 5: Textos, rolagem lateral, modal como diálogo e atributos do catálogo

**Arquivos:**
- Modificar: `src/app/produtos/pfb/catalogo/page.tsx`

**Interfaces:**
- Consome: `ContatoCta` com `origem` (Tarefa 2).
- Produz os seletores que a Tarefa 7 usa: `data-teste="abas-linha"`, `data-teste="cartao-modelo"` + `data-linha`, `data-teste="modal-modelo"` (com `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-modelo-titulo"`), `data-teste="miniaturas-modal"`, `data-teste="linha-consultor"` (filhos diretos `p` e `button`), `data-texto-banco`, e a raiz `<main className="pt-20">`.

- [ ] **Passo 1: Textos.** Todas as linhas da tabela "Catálogo › Textos corrigidos", na ordem da tabela, com os ícones dos quatro cartões do modal exatamente como lá. `ContatoCta` do modal com `origem="catalogo-modelo"`.
- [ ] **Passo 2: Sem rolagem lateral.** Abas em `grid grid-cols-2 sm:grid-cols-4 -mx-3 sm:-mx-5`, cada botão sem `flex-shrink-0`, com `min-w-0` e `break-words`; miniaturas do modal com a classe final do item 5; linha do consultor e botão com as classes exatas de "Catálogo › Linha do consultor no modal a 320 px". O `ContatoCta` desenha um `<button>` (`ContatoCta.tsx:19`), então o seletor `[data-teste="linha-consultor"] > button` da Tarefa 7 vale.
- [ ] **Passo 3: Cartão.** A linha `{code} · {linha}` (`:876`) desce para baixo do nome, em `text-legenda text-[#74777f]`, sem `uppercase` e sem `tracking`.
- [ ] **Passo 4: `data-texto-banco`** no `<p>` da descrição (modal e cartão) e na lista exata de "Catálogo › Outros dados do banco no catálogo".
- [ ] **Passo 5: Diálogo e atributos de teste.** Item 5, últimos três marcadores: a raiz vira `<main className="pt-20">`, os atributos `data-teste` entram (o `data-teste="cartao-modelo"` e o `data-linha` vão no `<article>` de `:836`, não no `<Revelar>` de `:831`, que não repassa atributos) e o cartão do modal ganha os atributos de diálogo, com `id="modal-modelo-titulo"` no `h2`. O cartão é o `div` com `className="relative w-full h-[100dvh] overflow-y-auto overscroll-contain lg:h-auto …"` (`:366-369`). Não confundir com o `div` da foto ampliada (`:283`, `className="relative w-full h-[100dvh]"`), que também tem `onClick={(e) => e.stopPropagation()}`, nem com o envoltório de `:336-338`.
- [ ] **Passo 6: Varredura de travessão.** `grep -nE "[—–]" src/app/produtos/pfb/catalogo/page.tsx` só pode achar comentários (`//`, `/* */` ou `{/* */}`, inclusive as linhas do meio de um comentário de várias linhas, como as de `:384`, `:494` e `:538` da versão de partida). A regex de "Texto fixo de atributos" do item 15 vai num arquivo, para não brigar com as aspas do shell: gravar `.superpowers/checks/regex-atributos.mjs` com `import fs from "node:fs";` e uma volta pelas linhas de `fs.readFileSync(process.argv[2], "utf8").split("\n")` que imprime o número e o texto de cada linha que casa com a regex do item 15 (`/(alt|aria-label|title)\s*[=:]\s*\{?\s*[`"'][^`"']*[—–]/`, escrita literalmente no arquivo), e rodar `node .superpowers/checks/regex-atributos.mjs src/app/produtos/pfb/catalogo/page.tsx`. Esperado: nenhuma linha.
- [ ] **Passo 7: Conferir.** `npx tsc --noEmit` e `npm run lint`, sem import sem uso.
- [ ] **Passo 8: Commit.** "Catálogo do PFB: textos corrigidos, sem rolagem lateral e modal como diálogo".

### Tarefa 6: Redirecionamentos, sitemap, links, chat e cabeçalho

**Arquivos:**
- Modificar: `next.config.ts` (`redirects()`)
- Modificar: `src/app/sitemap.ts:20`
- Modificar: os arquivos do item 10 nas linhas citadas, mais `src/components/Navbar.tsx:82`
- Modificar: `src/components/ChatWidget.tsx` (`PAGE_LABELS`), `src/app/api/chat/route.ts:27`

**Interfaces:** nenhuma nova. Os `href` passam a ser o literal `/produtos/pfb/catalogo`, como na tabela do item 10. Não trocar por `catalogoPath()`: a spec pede só a troca de `href`.

- [ ] **Passo 1: Item 8.** Ler o guia de `redirects` em `node_modules/next/dist/docs/`. Deixar `redirects()` com as cinco regras do item 8, nessa ordem, e o comentário "sai quando a página do produto entrar" na regra `missing`. O comentário que existe em `next.config.ts:75-77` ("para /produtos/pfb") é reescrito para dizer que `/produtos?modelo=` e `/produtos/pfb?modelo=` vão para `/produtos/pfb/catalogo`, guardando a query, para os QR impressos.
- [ ] **Passo 2: Item 9.** Sitemap: a entrada vira `/produtos/pfb/catalogo`, com `priority: 0.85` e `changeFrequency: "monthly"`.
- [ ] **Passo 3: Item 10.** Os nove `href` e o comentário de `src/app/produtos/page.tsx:27` (os dois de `medir-movimento.mjs` já mudaram na Tarefa 3); o `aria-label` de `Navbar.tsx:82` vira `Orbital Revestimentos: início`. Conferir com `grep -rn '"/produtos/pfb"' src`: só ficam `src/lib/linhas.ts:53` (linha 23 da tabela "Continuidade de links", sem mudança) e `src/components/ChatWidget.tsx:24` (a chave antiga de `PAGE_LABELS`, que a E2/3 troca).
- [ ] **Passo 4: Item 11.** `"/produtos/pfb/catalogo": "Ver o catálogo"` em `PAGE_LABELS`, sem tirar a chave antiga; em `DEFAULT_SYSTEM_PROMPT`, `/produtos/pfb (catálogo do PFB)` vira `/produtos/pfb/catalogo (catálogo do PFB: os modelos)`.
- [ ] **Passo 5: Build e redirecionamentos.** Com o mock da Tarefa 3 no ar: `npm run build`, depois `npx next start -p 3004`, os dois com as variáveis do mock. Com `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n"`:
  - `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3004/produtos/pfb?modelo=orb-003"` → `307 http://localhost:3004/produtos/pfb/catalogo?modelo=orb-003`
  - o mesmo com `"http://localhost:3004/produtos?modelo=orb-003&utm_source=qr"` → `307 http://localhost:3004/produtos/pfb/catalogo?modelo=orb-003&utm_source=qr`
  - o mesmo com `"http://localhost:3004/produtos/pfb"` → `307 http://localhost:3004/produtos/pfb/catalogo`
  - o mesmo com `"http://localhost:3004/produtos/pfb/catalogo"` → `200` (sem `redirect_url`)
  - `curl -s "http://localhost:3004/sitemap.xml"` tem `/produtos/pfb/catalogo` e não tem `/produtos/pfb</loc>` (Foco 4).

  Parar o servidor no fim.
- [ ] **Passo 6: Commit.** "Redirecionamentos 307 para o catálogo, sitemap, links e chat apontando para /produtos/pfb/catalogo".

### Tarefa 7: verificar-pfb (verificações da Etapa 1 no navegador)

**Arquivos:**
- Criar: `scripts/verificar-pfb.mjs` (item 15, só `--etapa 1` e `--so-redirecionamentos`; as etapas 2 e 4 respondem "não verificado: etapa ainda não implementada" e saem com código 1)

**Interfaces:**
- Consome: `catalogoPath` e `normalizeProductCode` (Tarefa 1, importados de `../src/lib/product-link.ts`), o mock e o log da Tarefa 3, e os seletores da Tarefa 5.
- Produz: `node scripts/verificar-pfb.mjs --base <url> --etapa 1 [--saida <dir>] [--so-redirecionamentos]`, que grava o `resultado.json` no formato exato do item 15 e sai com código 1 se alguma verificação não ficar `"ok"`.

Convenções do script: as abas são achadas por `[data-teste="abas-linha"] > button:nth-child(n)`, com `n` = 1 Todos, 2 Classic, 3 Brilliance e 4 Elegance (a ordem de `linhas`); as capturas vão para `<saida>/<estado>-<L>x<A>.png` (por exemplo `catalogo-linha-classic-390x844.png`); cada verificação grava uma entrada por largura no `resultado.json`, com o valor medido em `detalhe`. O `--so-redirecionamentos` faz, além das três primeiras verificações da VP (o que a spec pede no item 15), as do Foco 2 e do Foco 4: é uma extensão de propósito, só por HTTP, sem navegador.

- [ ] **Passo 1a: Esqueleto e redirecionamentos.** Argumentos, `resultado.json`, código de saída, motor, conferência do mock no ar e `--so-redirecionamentos` (as três verificações de redirecionamento da VP, mais o Foco 2 e o Foco 4). Com o mock e um `next start -p 3004` novo (build da `HEAD`, com as variáveis do mock), rodar `node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 1 --so-redirecionamentos`: código 0.
- [ ] **Passo 1b: Eventos e modal.** Diálogo do modal, `?linha=` e `history.back()`, chegada com linha errada, modelo inexistente, QR, os dois eventos e os Focos 1, 3 e 5.
- [ ] **Passo 1c: Larguras e texto.** Rolagem lateral em cada largura, miniaturas e linha do consultor a 320 × 568, CLS da chegada filtrada, texto proibido nos quatro estados e texto fixo de atributos no código-fonte.

Regras do item 15 que valem para os três passos acima: mock no ar primeiro, texto fixo de atributos no código-fonte, espera de `/api/products` registrada antes do `goto`, códigos normalizados, análises cortadas no contexto, nível 8/8, `orbital-intro`, CLS de carregamento, texto proibido em minúsculas, motor Chrome e depois Chromium, `context.route` para o WhatsApp, espera do `gtag` antes de cada clique de evento. As verificações são as da VP › Etapa 1, nessa ordem (menos o "Manual" de QR físico, que é do dono), mais as do Foco da revisão:
  - Foco 1: `/produtos/pfb?modelo=ORB-003` e `/produtos?modelo=ORB-003` seguidos no navegador abrem `[data-teste="modal-modelo"]` com o nome do ORB-003.
  - Foco 2: `/produtos?modelo=orb-003&utm_source=qr` → 307, e o `Location` resolvido tem `modelo=orb-003` e `utm_source=qr` (também em `--so-redirecionamentos`).
  - Foco 3: `?linha=xyz&modelo=<primeiro Classic>`: o modal abre, o primeiro botão das abas (`[data-teste="abas-linha"] > button:nth-child(1)`, o "Todos") fica com `aria-pressed="true"` e a URL não muda.
  - Foco 4: `GET <base>/sitemap.xml` tem `<loc>…/produtos/pfb/catalogo</loc>` e nenhum `<loc>` que termine em `/produtos/pfb` (também em `--so-redirecionamentos`).
  - Foco 5: `?modelo=<primeiro código>`; fechar o modal pelo botão de fechar deixa a URL em `/produtos/pfb/catalogo`; recarregar não abre `[data-teste="modal-modelo"]`.
- [ ] **Passo 2: Conferir.** `node --check scripts/verificar-pfb.mjs` e `npm run lint`. Com o mock no ar e um `next start -p 3004` novo (build da `HEAD`, com as variáveis do mock), rodar `node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 1` uma vez. Toda falha é investigada (`superpowers:systematic-debugging`): ou o script mede errado, e ele é corrigido aqui, ou o site está errado, e a correção vai para a tarefa dona, num commit próprio. Parar o servidor no fim.
- [ ] **Passo 3: Commit.** `scripts/verificar-pfb.mjs`, com a mensagem "verificar-pfb: verificações da Etapa 1 do PFB no navegador".

### Tarefa 8: Verificação da Etapa 1 e revisões antes de publicar

Não muda código, a não ser para corrigir o que esta tarefa encontrar. Cada correção é um commit próprio, e a verificação roda de novo.

- [ ] **Passo 1: Estática.** `npx tsc --noEmit`, `npm run lint`, `npm run test:links`, `npm run test:funil` e `npm run test:movimento`. Tudo verde.
- [ ] **Passo 2: Servidor local com o mock** (VP › Ambiente). Se o mock ou algum `next start` ainda estiver no ar de uma tarefa anterior, pará-lo antes (a porta 54329 e a 3004 precisam estar livres; o log é zerado quando o mock sobe). Subir `node .superpowers/checks/pfb-mock/servidor.mjs`, depois `npm run build` e `npx next start -p 3004`, os dois com as variáveis do mock. Conferir que o log mostra `escutando em` e que `curl -s localhost:3004/api/products` acrescenta uma linha ` GET /rest/v1/products`.
- [ ] **Passo 3: Verificação E1.** `node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 1`. Esperado: código 0 e todas as entradas de `.superpowers/checks/saida/pfb-etapa-1/resultado.json` com `"ok"`. Ler as capturas a 320, 390 e 1440.
- [ ] **Passo 4: Portão de movimento, comando 3.** `node scripts/medir-movimento.mjs --url http://localhost:3004/produtos/pfb/catalogo --matriz --cpu 4 --repeticoes 3 --api-produtos scripts/fixtures/produtos-pfb.json --saida .superpowers/checks/saida/pfb-portao-e1`. Passa se, em cada dispositivo, `acima33 = 0`, `max(cls, clsAquecimento) < 0,05`, `clsCarga < 0,05` e `scrollWidth ≤ larguraJanela`. Ler as `folha.png`.
- [ ] **Passo 5: Revisões de texto.** Passar `humanizer` e `orbital-marca` sobre `src/lib/pfb-linhas.ts` e os textos novos do catálogo. Se algum texto mudar, ele muda primeiro na spec, com o OK do dono, e só depois no código.
- [ ] **Passo 6: Revisão do branch.** `code-review` sobre o diff `284e60c..HEAD`; a skill `revisor-tecnico`; e o `qa-revisor`, que é o agente definido em `/Users/armaandaswani/orbital-ai-os/.claude/agents/direcao/qa-revisor.md` (chamado como `Agent` com essa definição no pedido, porque aqui ele não é um tipo de agente instalado). Regra do brief.
- [ ] **Passo 7: Prévia.** `git push -u origin pfb-e1-catalogo` (push de branch para gerar a prévia é permitido; nunca na `main`). Parar o `next start` e o mock.
- [ ] **Passo 8: Antes de publicar (dono).**
  - O dono confirma no chat que criou as três dimensões do GA4 (`origem`, `pagina`, `perfil`).
  - O dono roda no Supabase, ou pede, a contagem de contatos da base (Métricas › Base), com datas fixas em vez de `now()`: `select pagina, count(*) from site_contatos where created_at >= '<data do deploy − 28 dias>' and created_at < '<data do deploy>' and pagina in ('/tecnologia', '/produtos/pfb', '/produtos/pfb/catalogo') group by pagina;`. O resultado é anotado no ledger.
  - O dono dá o OK explícito para publicar. Só então a branch entra na `main` com um commit de merge (`/opt/homebrew/bin/git merge --no-ff pfb-e1-catalogo` a partir da `main` atualizada, e push da `main`), no padrão dos merges anteriores do site. O SHA desse merge é anotado no ledger.
- [ ] **Passo 9: Depois do deploy, em até 30 minutos.**
  - Redirecionamentos: `node scripts/verificar-pfb.mjs --base https://orbitalrevestimentos.com.br --etapa 1 --so-redirecionamentos`.
  - QR impressos: o dono escaneia um QR no formato `/produtos/pfb?modelo=` e um no formato `/produtos?modelo=`; os dois têm de abrir o modelo certo.
  - Se um redirecionamento ou um QR falhar: reversão da E1 (Rollout & Rollback), num deploy só: `git revert -m 1 <SHA do merge>` e, no mesmo commit, a regra `{ source: "/produtos/pfb/catalogo", destination: "/produtos/pfb", permanent: false }` em `next.config.ts`.
  - Eventos: o dono abre o catálogo no ar, abre um modelo e toca "Falar com um consultor"; em `/tecnologia`, pede o manual e toca "Solicitar pelo WhatsApp"; no GA4 Tempo real, filtrando o host `orbitalrevestimentos.com.br`, `consultor_clicado` e `manual_solicitado` aparecem. Se não aparecerem, **não há reversão**: o envio é corrigido, e os 14 dias de base só começam a contar depois que o dono vê os eventos (VP › Ambiente).
  - No fim, anotar no ledger (`.superpowers/sdd/2026-11-04-visualizador-app/progress.md`) e atualizar a memória `project_site_redesign_2026_11`.

---

## Revisão Goldfish do plano (06/11/2026)

Dois revisores sem contexto e só com leitura, em paralelo, com o padrão `implementation-readiness-standard`: o de prontidão (persona `implementation_readiness`) e o de base de código (persona `codebase_details`). Nenhum dos dois achou bloqueio. Todos os achados foram aplicados no texto acima, e nenhum ficou aberto.

| Achado | Onde entrou |
|---|---|
| C-M1 (`tsc` quebra depois do `git mv` pelo validador de `.next/types`) | Restrições globais (`npx next typegen` antes do `tsc`); Tarefa 4, Passo 7 |
| C-M2 / R-M5 (o `next start` parava no Passo 4 da Tarefa 3, e o 5 precisava dele) | Tarefa 3, Passos 4 e 5 |
| C-N1 / R-N1 (conferência do corte das análises não decidia nada) | Tarefa 3, Passo 5 (conferência no código, antes do `page.goto`) |
| C-N2 (`eslint.config.mjs:9-15`) | Tarefa 1, Arquivos |
| C-N3 (atributos do cartão no `<article>`, não no `<Revelar>`) | Tarefa 5, Passo 5 |
| C-N4 / R-N9 (seletor das abas, nomes das capturas, Tarefa 7 em partes) | Tarefa 7, Convenções e Passos 1a a 1c; Foco 3 |
| C-N5 (`LinhaCatalogo` não é importado) | Tarefa 4, Interfaces |
| C-N6 (a API remonta as linhas: comparar a lista de `code`) | Tarefa 3, Passo 4 |
| C-N7 (comandos `curl` inteiros e entre aspas) | Restrições globais; Tarefa 6, Passo 5 |
| C-N8 / R-N15 (estados intermediários não publicáveis; nada de push antes da Tarefa 8) | Restrições globais |
| R-M1 (evento ausente no GA4 se corrige, não se reverte) | Tarefa 8, Passo 9 |
| R-M2 (QR impresso escaneado depois do deploy) | Tarefa 8, Passo 9 |
| R-M3 (como a E1 chega à `main` e como se reverte) | Tarefa 8, Passos 8 e 9 (merge `--no-ff`, `git revert -m 1` e a regra de volta no mesmo deploy) |
| R-M4 (números de linha valem para `284e60c`; modal identificado pela classe) | Cabeçalho (Spec); Tarefa 5, Passo 5 |
| R-M6 (nada de abrir página sem o corte das análises) | Restrições globais; Tarefa 4, Passo 7 (só `curl`) |
| R-N2 (`setTimeout(…, 0)` com `clearTimeout` na montagem) | Tarefa 4, Passo 4 |
| R-N3 (`BreadcrumbList` com URL absoluta, no padrão de `/projetos`) | Tarefa 4, Passo 3 |
| R-N4 (caminhos dos guias do Next) | Restrições globais |
| R-N5 (comentário de `next.config.ts:75-77`) | Tarefa 6, Passo 1 |
| R-N6 (resultado exato do `grep`) | Tarefa 6, Passo 3 |
| R-N7 (regex dos atributos num arquivo; comentários de várias linhas) | Tarefa 5, Passo 6 |
| R-N8 (ordem do `onClick` do `ContatoCta`) | Tarefa 2, Passo 6 |
| R-N10 (`--so-redirecionamentos` vai além da spec de propósito) | Tarefa 7, Convenções |
| R-N11 (base do lint e do `tsc` gravada antes) | Tarefa 1, Passo 0; Restrições globais |
| R-N12 (portas livres antes da Tarefa 8) | Tarefa 8, Passo 2 |
| R-N13 (como chamar o `qa-revisor`) | Tarefa 8, Passo 6 |
| R-N14 (contagem de `site_contatos` antes da E1, com datas fixas) | Tarefa 8, Passo 8 |
