# PFB, Etapa 2+3 (página do produto, fim de /tecnologia, links e SEO): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans, tarefa por tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** pôr no ar, numa branch de prévia (sem publicar), a página nova do Painel Flexível em Fibra de Bambu (PFB) em `/produtos/pfb`, com as 6 seções e a cena das cinco camadas, e fechar a troca: `/tecnologia` em 301, `/produtos/pfb?modelo=` em 308, a regra provisória fora, a aba "Tecnologia" fora do menu, SEO e JSON-LD do layout raiz corrigidos, sitemap e links.

**Arquitetura:** a página é de servidor (`revalidate = 300`) e lê o banco por duas funções (`lerModelosPorLinha`, `carregarLugares`). Todo o texto vive em `src/lib/pfb-textos.ts` (e `pfb-linhas.ts`, da E1). A cena é decidida só pelo CSS (D5) e conduzida por `--p` (`useProgresso`); a geometria fica num módulo puro (`camadas.ts`) com teste de paridade contra o CSS. O nível de movimento é marcado antes da primeira pintura por uma string (`SCRIPT_NIVEL`) testada contra `decidirNivel`. O único componente de cliente novo é `CamadasPfb`.

**Tecnologia:** Next.js 16.2.4 (App Router), React 19.2, Tailwind v4, TypeScript, Node 24 (`node --test` com `*.test.mjs` importando `.ts`), Playwright pelo `PW_CORE` de `scripts/medir-movimento.mjs` (sem dependência nova).

**Spec:** `/Users/armaandaswani/orbital-movimento/.superpowers/sdd/2026-11-06-pagina-pfb/design_doc.md`, aceita pelo dono em 06/11/2026 (no worktree, o mesmo arquivo está em `.superpowers/sdd/2026-11-06-pagina-pfb/design_doc.md`, por link). "Item N" é o item N de "Detailed Implementation Plan › Etapa 2+3"; "Seção K" é a subseção "A página, seção por seção › Seção K"; "Movimento" é "Movimento: a cena das camadas"; "Arte" é "Arte das camadas"; "Links" é a tabela de "Continuidade de links"; "VP" é a "Verification Plan". Leia antes de cada tarefa as partes que ela cita. Os números de linha da spec são de `478adb2`; a base desta branch é `ad8340f` (E1 no ar), e alguns mudaram. **Ache cada lugar pelo conteúdo citado, não pelo número.** Os que mudaram e importam: `ChatWidget.tsx` `"/tecnologia"` está em `:28` (spec diz `:27`); a função `ConhecaPfb` começa em `ConhecaPfb.tsx:24` (spec diz `:19`).

## Restrições globais

- Repositório: worktree `/Users/armaandaswani/orbital-pfb-e2`, branch `pfb-e2-pagina` (a partir de `ad8340f`, sem upstream até a Tarefa 8). Git sempre como `/opt/homebrew/bin/git`. Nunca trocar de branch, nunca `stash`, nunca mexer em `/Users/armaandaswani/orbital-movimento` (o dono mantém um `next dev` em `:3002` lá; não derrubar).
- `.superpowers/checks` e `.superpowers/sdd` são links para os de `orbital-movimento` (o mock, os checks Playwright, a spec e os ledgers são os mesmos). `.superpowers/` está fora do Git e do lint.
- Commit só na branch; nunca `push` para a `main`, nunca `git push --force`, nunca merge. Assunto do commit em português, sem travessão, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nenhum texto novo fora das tabelas da spec (Seções 1 a 6, "SEO por rota", Links, itens 31, 32 e 36). Copiar exatamente. Texto que pareça errado volta ao controlador; nada é reescrito no código.
- Regras do dono para todo texto, `alt`, `aria-label` e `title` novo: sem travessão (— ou –), sem rótulo-sobrancelha, sem contador decorativo, sem preço, nunca "mais caro", sem concorrentes ou outros materiais, "Painel Flexível em Fibra de Bambu (PFB)" por extenso na primeira menção, a Orbital é fornecedora e não instala.
- Sem rolagem lateral em nenhuma largura de 320 px para cima. Animação só com `transform` e `opacity`, respeitando `prefers-reduced-motion`. Nenhum ouvinte de `wheel`, nenhum `preventDefault` de rolagem, nenhum `scroll-snap`.
- Sem sombra em cartão ou foto; separação só por espaço e tom, sem linha fina (Seção 3, Layout).
- Itens 37 (`termos/page.tsx`, `clausulas-pedido.ts`, linhas 29 a 31 de Links) **não entram** sem o OK explícito do dono, que o controlador pede. Sem OK, os dois arquivos não são tocados.
- Segurança (hook cc-safety-net): nunca ler nem copiar `.env*`; nada de variável de shell como executável; nada de heredoc em Python; nada de `rm -rf` fora de `/tmp`.
- Nenhuma página do site é aberta num navegador sem o corte das análises (`novoContexto` de `scripts/verificar-pfb.mjs`, ou o `medir-movimento.mjs`, que já cortam GA4, Meta Pixel e Vercel Analytics e marcam `orbital-intro`). Nada de abrir páginas no painel do navegador nem no Chrome do dono. Fora dos scripts, só `curl`, com a URL inteira entre aspas.
- Servidor local: mock com `node .superpowers/checks/pfb-mock/servidor.mjs` (127.0.0.1:54329; log em `.superpowers/checks/saida/pfb-mock.log`) e o site com `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_ANON_KEY=falsa SUPABASE_SERVICE_ROLE_KEY=falsa` na linha de comando ("variáveis do mock"), `npm run build` e `npx next start -p 3004`. Portas 3004 e 54329; nunca a 3002.
- Antes de usar uma API do Next, ler o guia dela em `node_modules/next/dist/docs/01-app/03-api-reference/` (regra do `AGENTS.md`): `05-config/01-next-config-js/redirects.md` (Tarefa 6), `04-functions/generate-metadata.md` (Tarefa 5). Para o JSON-LD, `node_modules/next/dist/docs/01-app/02-guides/json-ld.md` (Tarefa 5).
- Toda tarefa termina com `npx next typegen`, `npx tsc --noEmit` e `npm run lint` sem erro novo em relação à base do Passo 0 da Tarefa 1, mais `npm run test:movimento`, `npm run test:links` e `npm run test:funil` passando (e `npm run test:pfb` a partir da Tarefa 1). TS2307 em `.next/dev/types` apontando para rotas apagadas não conta.
- Estados intermediários não são publicáveis: entre a Tarefa 4 e a 6, `/produtos/pfb` ainda dá 307 para o catálogo (a regra provisória só sai na Tarefa 5). Nada de push antes da Tarefa 8.

## Foco da revisão

Casos que a spec implica e que a VP não cobre. Cada um ganhou uma verificação na tarefa dona:

1. **Link antigo de `/tecnologia` com query ou barra final** (`/tecnologia?utm_source=email`, `/tecnologia/`): chega a `/produtos/pfb` guardando a query, em no máximo dois saltos (barra final do Next, depois o 301). Dona: Tarefa 7, também em `--so-redirecionamentos`.
2. **Sem JavaScript** (robô de busca, bloqueador): a 1440 × 900 e a 390 × 844 com `javaScriptEnabled: false`, a página tem o `h1`, a seção `.pfb-cam` com altura menor que 2 × `innerHeight` (sem `scripting: enabled` não há cena), os cinco nomes com opacidade calculada 1 a 1440, e nenhuma rolagem lateral. Dona: Tarefa 7.
3. **Janela que muda de tamanho com a página aberta** (1440 × 900 para 1280 × 680, e de volta): ao cair abaixo de 45rem de altura, `.pfb-cam` fica com altura menor que 2 × `innerHeight` e todos os itens com opacidade 1; ao voltar, a cena volta (altura 4 × `innerHeight` ± 2 px) e o `--p` acompanha a rolagem (em p = 0,5 a camada 0 está 200 px acima da 4). Prova que `useProgresso({ ligado })` desliga e religa sem recarregar. Dona: Tarefa 7.
4. **Chegada por âncora no meio da cena** (`/produtos/pfb#tecnologia` a 1440 × 900): depois de 1500 ms, o `h2#pfb-camadas-titulo` está na tela, abaixo do cabeçalho, e cada item da lista tem o produto das opacidades ≥ 0,6. Dona: Tarefa 7.
5. **Miniatura da seção 4 abre o modelo certo** (a 390 × 844, clicar a primeira `[data-teste="miniatura"]`): a URL vira `catalogoPath({ modelo: <code dela> })` e `[data-teste="modal-modelo"]` abre com o nome do modelo daquela miniatura. Dona: Tarefa 7.

---

### Tarefa 1: Textos da página, agrupamento das linhas e script de nível

**Arquivos:**
- Criar: `src/lib/pfb-textos.ts` (item 16)
- Criar: `src/lib/pfb-modelos-puro.ts`, `src/lib/pfb-modelos-puro.test.mjs` (item 20a)
- Modificar: `package.json` (`scripts`, item 20a)
- Modificar: `src/lib/movimento/nivel.ts`, `src/lib/movimento/nivel.test.mjs` (item 19)

**Interfaces:**
- Produz, em `pfb-textos.ts` (sem `import` de componente; cada frase com `// fonte: <nota>` da coluna Fonte da spec):
  - `ABERTURA: { titulo; lead; estoque; botaoModelos: "Ver os modelos"; botaoConsultor: "Falar com um consultor"; legenda; alt }` (Seção 1)
  - `CAMADAS: { titulo; lead; nomes: readonly [string, string, string, string, string]; legenda }` (Seção 2; `nomes[0]` = "Película protetora", a de cima)
  - `FICHA: { titulo; lead; selos: ReadonlyArray<{ texto: string; ressalva?: string }>; numeros: ReadonlyArray<{ valor: string; frase: string }>; figura: { legenda; ariaLabel; largura: "1,20 m"; altura: "2,90 m" }; art: { titulo; texto }; durabilidade: { titulo; texto }; garantia: { titulo; texto } }` (Seção 3; 4 selos, só o primeiro com `ressalva`; 5 números na ordem da tabela)
  - `LINHAS: { titulo: "Três linhas"; lead; verModelos: (linha: string) => string; aviso }` (Seção 4; `verModelos("Classic")` = "Ver os modelos Classic"; as frases de cada linha vêm de `LINHAS_PFB`, não se repetem aqui)
  - `SERVE: { titulo; ondeUsar: { titulo; paragrafos: readonly string[] }; ondeNaoUsar: { titulo; paragrafos: readonly string[] }; comoAplicar: { titulo; paragrafos: readonly string[]; antesDoManual: string; manual: "Manual Técnico de Instalação"; depoisDoManual: "." }; video: { titulo: "Opinião de um instalador" } }` (Seção 5; `comoAplicar.paragrafos` são os três `p` antes do `p` com link; `antesDoManual` = "A Orbital fornece o material, e a aplicação fica com o profissional que você escolher e contratar. O passo a passo está no ")
  - `PEDIR: { titulo; frase; reserva: { frase: "Veja onde o PFB já foi aplicado."; link: "Ver projetos e showrooms" }; orcamento: { titulo: "Para pedir um orçamento"; paragrafos: readonly [string, string] }; botaoConsultor; botaoModelos }` (Seção 6)
- Produz: `ModeloVitrine`, `agruparPorLinha(linhas, porLinha)` exatamente como no item 20a; script `"test:pfb": "node --test \"src/lib/pfb-modelos-puro.test.mjs\""`.
- Produz: `export const SCRIPT_NIVEL: string` em `nivel.ts`, com o texto exato do item 19.

- [ ] **Passo 0: Base do lint e do tipo.** `mkdir -p .superpowers/checks/saida/e2` (vai para a pasta compartilhada), depois `npx tsc --noEmit > .superpowers/checks/saida/e2/base-tsc.txt 2>&1` e `npm run lint > .superpowers/checks/saida/e2/base-lint.txt 2>&1`. "Erro novo", daqui em diante, é o que não está nesses arquivos.
- [ ] **Passo 1: Testes que falham.** `pfb-modelos-puro.test.mjs`: `"porLinha 2 corta 0, 1 e 3 modelos em 0, 1 e 2"` (Classic com 0, Brilliance com 1, Elegance com 3; as três chaves presentes; ordem recebida mantida) e `"linha fora das três é descartada"` (um modelo `linha: "Outra"` não aparece em nenhuma lista). Em `nivel.test.mjs`, acrescentar `"SCRIPT_NIVEL dá o mesmo nível que decidirNivel"`: para cada uma das 2 × 3 × 4 × 4 = 96 combinações do item 19, roda a string em `node:vm` com um `document.documentElement.dataset` vazio, um `navigator` montado (`deviceMemory` e `hardwareConcurrency` ausentes quando "ausente"; `connection` ausente ou `{ saveData }`) e `window.matchMedia = () => ({ matches: poucosDados })`, e compara `dataset.mvNivel` com `decidirNivel({ poucosDados, economiaDados, memoriaGB, nucleos })`; e `"SCRIPT_NIVEL não muda nível já marcado"` (`dataset.mvNivel = "leve"` com sinais de "completo" continua `"leve"`).
- [ ] **Passo 2: Ver falhar.** `npm run test:pfb` (falta o módulo) e `npm run test:movimento` (falta `SCRIPT_NIVEL`). Esperado: FAIL nos dois.
- [ ] **Passo 3: Implementar** `pfb-modelos-puro.ts` (sem `import`), `SCRIPT_NIVEL` em `nivel.ts` (com o comentário "se mudar `decidirNivel`, mude esta string; o teste confere") e `pfb-textos.ts` com as formas acima e os textos da spec, letra por letra.
- [ ] **Passo 4: Ver passar.** `npm run test:pfb` (2 testes ok) e `npm run test:movimento` (todos ok, inclusive os 2 novos).
- [ ] **Passo 5: Conferir o texto.** `grep -n "[—–]" src/lib/pfb-textos.ts` só pode achar comentários (nenhuma string). Conferir à mão, contra as tabelas da spec, cada string de `pfb-textos.ts`.
- [ ] **Passo 6: Conferir e commit.** Rotina de fim de tarefa (Restrições globais). Commit "PFB: textos da página, agrupamento das linhas e script de nível antes da pintura".

### Tarefa 2: Leituras de servidor (modelos por linha e lugares)

**Arquivos:**
- Criar: `src/lib/pfb-modelos.ts` (item 20)
- Modificar: `src/app/api/products/route.ts` (o filtro de `:55-56`)
- Modificar: `src/lib/projetos-dados.ts` (item 21)

**Interfaces:**
- Consome: `agruparPorLinha`, `ModeloVitrine` (Tarefa 1).
- Produz: `visivelNoCatalogo(p: Record<string, unknown>): boolean`; `lerModelosPorLinha(porLinha = 2): Promise<Record<"Classic" | "Brilliance" | "Elegance", ModeloVitrine[]>>`; reexporta `ModeloVitrine`; `carregarLugares(): Promise<Showroom[]>` em `projetos-dados.ts` (showrooms primeiro, depois revendas ou `REVENDA_RESERVA`).

- [ ] **Passo 1: Implementar** os três arquivos pelo item 20 e pelo item 21, ponto por ponto: `select("*")`, descarte de `image_path` nulo ou vazio **antes** de `String()`, erro vira listas vazias com `console.error("[pfb-modelos]", …)`; `carregarLugares` com `Promise.all([lerLinhasShowrooms(db), lerProjetos(db)])`, `console.error("[lugares]", r.erro)` e exceção vira `[...REVENDA_RESERVA]`. `pfb-modelos.ts` importa `supabaseAdmin` de `@/lib/supabase`, como `projetos-dados.ts` (sem `server-only`, que o projeto não usa).
- [ ] **Passo 2: A rota não muda de resultado.** Mock no ar, `npm run build` e `npx next start -p 3004` com as variáveis do mock. `curl -s "http://localhost:3004/api/products"` devolve a mesma lista de `code`, na mesma ordem, que `scripts/fixtures/produtos-pfb.json` (comparar com um `node -e` que lê os dois e imprime `iguais` ou a diferença). Parar o `next start`.
- [ ] **Passo 3: Conferir e commit.** Rotina de fim de tarefa. Commit "PFB: leitura dos modelos por linha e dos lugares no servidor".

### Tarefa 3: A cena das camadas (geometria, CSS, hook e componente)

**Arquivos:**
- Criar: `src/lib/movimento/camadas.ts` (item 17), `src/lib/movimento/camadas.test.mjs` (item 18)
- Modificar: `src/app/globals.css` (item 30: bloco novo logo depois do bloco "TechStone: clima pela pedra", isto é, antes da linha `/* ── TechStone: galeria de ideias`)
- Modificar: `src/components/ds/useProgresso.ts` (item 22a)
- Criar: `src/components/pfb/CamadasPfb.tsx` (item 23)

**Interfaces:**
- Consome: `CAMADAS` (Tarefa 1), `Revelar` (`src/components/projetos/Revelar.tsx`, `como="li"`, `ordem`).
- Produz: de `camadas.ts`, `BASE`, `VAO`, `DESLOCA_ATIVA`, `VIEWBOX`, `PASSO_INICIO`, `PASSO`, `CAMADAS_DESENHO`, `VEIOS`, `FIBRAS`, `deslocamentoFechado(i)`, `elevacao(i)`, `inicioDoPasso(i)`, `poligonos(i, d = 0): { topo: string; frente: string; lado: string }`. `useProgresso<T>(opcoes?: { margem?: string; ligado?: boolean })`. `CamadasPfb` (default, sem props).
- Seletores que a Tarefa 7 usa: `section#tecnologia.pfb-cam`, `.pfb-cam-quadro`, `.pfb-cam-palco`, `svg.pfb-cam-svg`, `g.pfb-cam-g` (cinco, na ordem do DOM 4, 3, 2, 1, 0, cada um com `data-camada="<i>"`), `ol.pfb-cam-lista > li` (cinco, na ordem 0 a 4), `.pfb-cam-item`, `p.pfb-cam-legenda`.

- [ ] **Passo 1: Teste que falha.** `camadas.test.mjs` com todos os casos do item 18, um `test` por marcador (polígonos, deslocamentos e soma 29, caixa aberta dentro do `viewBox`, `inicioDoPasso` e `elevacao`, paridade dos tempos com o CSS, paridade de `VAO` e `DESLOCA_ATIVA` com o CSS). O recorte do bloco é exatamente o do item 18 (`/* ── PFB: a placa por dentro` até o próximo `/* ── `).
- [ ] **Passo 2: Ver falhar.** `npm run test:movimento`. Esperado: FAIL (módulo ausente e bloco CSS ausente).
- [ ] **Passo 3: `camadas.ts`** pelo item 17 e pela Arte (sem `import`, sem texto).
- [ ] **Passo 4: Bloco CSS** pelo item 30 e pelo bloco de Movimento, letra por letra, com o cabeçalho que lista os tempos e as medidas e diz "se um mudar, mude as duas pontas" (nenhum comentário interno começa por `/* ── `). Inclui `.pfb-abertura-foto` e a regra `@media (min-width: 64rem)` da lista.
- [ ] **Passo 5: Ver passar.** `npm run test:movimento`: todos ok.
- [ ] **Passo 6: `useProgresso`** pelo item 22a (padrão `ligado = true`; dependências `[margem, ligado]`; com `false`, retorna antes de criar observador, assinante ou ouvinte). O `Clima` não muda.
- [ ] **Passo 7: `CamadasPfb`** pelo item 23, pela marcação de Movimento (com `useSyncExternalStore`, `CONSULTA_CENA`, `assinarCena`, `lerCena` no topo do módulo, exatamente como lá) e pela Arte (estrutura de cada grupo; `<svg viewBox={VIEWBOX} aria-hidden="true" focusable="false" className="pfb-cam-svg mx-auto w-full max-w-[28rem] lg:max-w-none h-auto max-h-[70svh]">`; grupos desenhados na ordem 4, 3, 2, 1, 0, com `style={{ "--a": inicioDoPasso(i), "--k": 4 - i }}` e `data-camada={i}`; contorno `#36A35C` traço 2,5). `useProgresso<HTMLElement>({ margem: "50% 0px 50% 0px", ligado: cena })`. Nada focável dentro da seção. (O peso do SVG, menos de 6 KB, é conferido na Tarefa 5, Passo 4.)
- [ ] **Passo 8: Conferir e commit.** Rotina de fim de tarefa. Commit "PFB: a placa por dentro, cena das cinco camadas presa pela rolagem".

### Tarefa 4: Componentes das seções 1, 3, 4, 5 e 6

**Arquivos:**
- Criar: `src/components/pfb/AberturaPfb.tsx` (item 22, Seção 1)
- Criar: `src/components/pfb/PlacaEmEscala.tsx` (item 24, "Placa em escala")
- Criar: `src/components/pfb/FichaPfb.tsx` (item 25, Seção 3)
- Criar: `src/components/pfb/LinhasPfb.tsx` (item 26, Seção 4)
- Criar: `src/components/pfb/ServePfb.tsx` (item 27, Seção 5)
- Criar: `src/components/pfb/FechamentoPfb.tsx` (item 28, Seção 6)
- Modificar: `src/components/SolicitarManual.tsx` (item 31)
- Modificar: `src/components/VideoShort.tsx` (item 32)

**Interfaces:**
- Consome: `ABERTURA`, `FICHA`, `LINHAS`, `SERVE`, `PEDIR` (Tarefa 1); `LINHAS_PFB` (`src/lib/pfb-linhas.ts`); `ModeloVitrine` (Tarefa 2); `catalogoPath`, `CATALOGO_PATH` (`src/lib/product-link.ts`); `ContatoCta` (prop `origem`), `Revelar`, `LugarCard` (`{ lugar, agora, compacto }`), `Showroom` (`src/lib/projetos-tipos.ts`).
- Produz: `AberturaPfb()`, `FichaPfb()`, `ServePfb()` sem props; `LinhasPfb({ modelos })`; `FechamentoPfb({ lugares, agora }: { lugares: Showroom[]; agora: number })`; `SolicitarManual({ variant?, tom?: "escuro" | "claro" })`; `VideoShort({ …, estilo?: "padrao" | "limpo" })`.
- Seletores e atributos que a Tarefa 7 usa: `section[aria-labelledby="pfb-titulo"]` com `h1#pfb-titulo`; `section#ficha` com `h2#pfb-ficha-titulo` e, dentro, o cartão do manual (o `button` do `SolicitarManual tom="claro"` variante cartão); `section#linhas` com `h2#pfb-linhas-titulo`, `[data-teste="miniatura"]` (o `Link` de cada miniatura) e um link por linha com `href` `catalogoPath({ linha })` (`data-teste="ver-linha"`, também na reserva sem modelos e no botão do celular, que levam o mesmo atributo); `section#onde-usar` com `h2#pfb-serve-titulo`; `section#como-pedir` com `h2#pfb-pedir-titulo` e `[data-teste="lugar"]` em volta de cada `LugarCard`; `data-texto-banco` no nome de cada miniatura, na `Image` de cada miniatura e no envoltório de cada `LugarCard`; `[data-teste="ver-modelos"]` no botão "Ver os modelos" da abertura.

- [ ] **Passo 1: `SolicitarManual` e `VideoShort`** pelos itens 31 e 32. No `claro`, o cartão usa os textos do item 31 (sem "Orbital + Werk Engenharia") e o botão é `ds-botao ds-botao-vazado min-h-11`; o `escuro` continua como hoje. No `limpo`, o rótulo é `Assistir: {titulo}`; o padrão continua como hoje (a Academia não muda). Comentário do topo do `SolicitarManual`: "o bloco da página do PFB" (linha 34 de Links).
- [ ] **Passo 2: `AberturaPfb`** pela Seção 1 (layout exato; `Image` de `public/images/projetos/escada-madeira-pfb-2026-10.jpg` com `fill priority sizes="(min-width: 1024px) 50vw, 100vw"`; `div.pfb-abertura-foto.mv-parallax-topo` com `absolute inset-0 lg:-top-[20%]`; texto sem `Revelar`; `ContatoCta origem="pfb-abertura"`). A legenda aparece uma vez por largura: sobre a foto a partir de `lg` e abaixo dela no celular (duas cópias no DOM só se uma delas for `hidden`/`lg:hidden`; preferir uma `figcaption` só, reposicionada por classes).
- [ ] **Passo 3: `PlacaEmEscala` e `FichaPfb`** pela "Placa em escala" e pela Seção 3 (`dl` com `dt` depois do `dd` visualmente por `flex flex-col-reverse`; sem `AnimatedStat`; `SolicitarManual tom="claro"`).
- [ ] **Passo 4: `LinhasPfb`** pela Seção 4: duas miniaturas por linha, bloco-link na terceira célula a partir de `sm`, botão vazado abaixo no celular, reserva sem modelos; `mv-brilho` na foto; `alt` `${nome}, linha ${linha}`; nenhum código impresso. A frase de cada linha vem de `LINHAS_PFB` (`frases.join(" ")`).
- [ ] **Passo 5: `ServePfb`** pela Seção 5 (`VideoShort id="hpgoCY8L2PI" poster="/images/videos/opiniao-instalador-adam-werk.jpg" estilo="limpo" titulo={SERVE.video.titulo}`; `SolicitarManual variant="link" tom="claro"` no meio do último parágrafo; `Revelar efeito="surge"` `ordem` 0 e 1).
- [ ] **Passo 6: `FechamentoPfb`** pela Seção 6 (grade de `/projetos#parceiros`; `LugarCard compacto` sem `onAbrir`; reserva sem lugares com link para `/projetos#parceiros`; `ContatoCta origem="pfb-fechamento"`).
- [ ] **Passo 7: Conferir o texto fixo.** `grep -rn "[—–]" src/components/pfb src/components/SolicitarManual.tsx src/components/VideoShort.tsx`: só comentários. Nenhuma string de texto visível nos componentes novos fora das constantes de `pfb-textos.ts` e `LINHAS_PFB` (exceções: os textos dos itens 31 e 32, que vivem nos próprios componentes).
- [ ] **Passo 8: Conferir e commit.** Rotina de fim de tarefa (os componentes ainda não são usados; o `tsc` os compila). Commit "PFB: seções da página do produto, manual em tom claro e vídeo limpo".

### Tarefa 5: A página em /produtos/pfb, redirecionamentos da E2/3 e SEO da rota

**Arquivos:**
- Criar: `src/app/produtos/pfb/page.tsx` (item 29, "SEO por rota › /produtos/pfb")
- Modificar: `next.config.ts` (item 33, mapa de redirecionamentos, coluna E2/3)

**Interfaces:**
- Consome: tudo das Tarefas 1 a 4; `SCRIPT_NIVEL`.
- Produz: `GET /produtos/pfb` 200, com `<script id="pfb-nivel">` como primeiro filho do `main`, os quatro JSON-LD (`BreadcrumbList` e três `Product`, cada um num `<script type="application/ld+json">`) e as seis seções na ordem.

- [ ] **Passo 1: Ler os guias** de `redirects.md` (com `statusCode`) e `generate-metadata.md`.
- [ ] **Passo 2: `page.tsx`** pelo item 29: `revalidate = 300`, `metadata` exatamente como em "SEO por rota › /produtos/pfb" (título, descrição, `keywords`, canônico, `openGraph`, `twitter`), schemas com URLs absolutas `https://orbitalrevestimentos.com.br/...` (`BreadcrumbList` com `position` 1 a 3, no padrão de `src/app/projetos/layout.tsx`), `Promise.all([lerModelosPorLinha(2), carregarLugares()])`, `agora` com o comentário de lint de `src/app/projetos/page.tsx`, `<main className="escala-contida pt-20">`.
- [ ] **Passo 3: `next.config.ts`** pelo item 33: `/guias/mdf-manaus` → `/produtos/pfb` (`permanent: true`); `/produtos/pfb` com `has modelo` → `permanent: true`; sai a regra com `missing modelo` (e o comentário "Provisório"); entra `{ source: "/tecnologia", destination: "/produtos/pfb", statusCode: 301 }`. O comentário do bloco passa a dizer que `/produtos/pfb` é a página do produto.
- [ ] **Passo 4: Conferir no servidor local.** Mock no ar, `npm run build` e `npx next start -p 3004` com as variáveis do mock. Com `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n"`: `"http://localhost:3004/produtos/pfb"` dá `200`; `"…/produtos/pfb?modelo=orb-003"` dá `308` para `/produtos/pfb/catalogo?modelo=orb-003`; `"…/tecnologia"` dá `301` para `/produtos/pfb`; `"…/guias/mdf-manaus"` dá `308` para `/produtos/pfb`. No HTML de `/produtos/pfb` (`curl -s`): `id="pfb-nivel"` aparece antes de `id="pfb-titulo"`; há 4 `application/ld+json` próprios da página além dos do layout raiz; `<title>` é "Painel Flexível em Fibra de Bambu (PFB) em Manaus | Orbital Revestimentos"; o `<svg class="pfb-cam-svg …">…</svg>` tem menos de 6144 bytes (medir com `node -e` sobre o HTML salvo em `.superpowers/checks/saida/e2/pfb.html`); `data-teste="miniatura"` aparece pelo menos 2 vezes e `data-teste="lugar"` pelo menos 1. Parar o `next start`.
- [ ] **Passo 5: Conferir e commit.** Rotina de fim de tarefa. Commit "PFB: página do produto em /produtos/pfb, 308 do QR e 301 de /tecnologia".

### Tarefa 6: Fim de /tecnologia, menu, links, chat, SEO do layout raiz e sitemap

**Arquivos:**
- Remover (`git rm`): `src/app/tecnologia/page.tsx`, `src/components/TecnologiaComparison.tsx`, `src/components/ARTAccordion.tsx`, `src/components/FichaTecnicaAccordion.tsx`, `public/images/catalogue/pfb-mdf-0h.png`, `public/images/catalogue/pfb-mdf-24h.png`, `public/images/catalogue/pfb-mdf-48h.png` (item 34)
- Modificar: `src/components/ConhecaPfb.tsx` (item 35), `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/app/page.tsx`, `src/components/ChatWidget.tsx`, `src/app/api/chat/route.ts`, `src/lib/comunicado-metropolitano-email.ts` (item 36), `src/app/layout.tsx` (item 38), `src/app/sitemap.ts`, `src/lib/assets.ts` (item 39)
- Só com OK do dono (o controlador avisa no brief): `src/app/termos/page.tsx`, `src/lib/clausulas-pedido.ts` (item 37)

**Interfaces:**
- Consome: a rota `/produtos/pfb` (Tarefa 5) e a âncora `#ficha` (Tarefa 4).
- Produz: nenhum `href` ou texto do site aponta para `/tecnologia`, a não ser os de `termos/page.tsx` e `clausulas-pedido.ts` sem o OK.

- [ ] **Passo 1: Remoções** do item 34 e a poda do item 35 (fica `PFB_SELOS` e `DiferenciaisPfb`; saem os `import` que só a função removida usava). `src/app/academia/page.tsx` continua compilando.
- [ ] **Passo 2: Links** do item 36, cada um exatamente como lá (o `"/tecnologia"` do `ChatWidget` está em `:28`; `PAGINAS_ANTIGAS` e a conversão em `parseBotText`; o `[PAGE: /tecnologia]` de `route.ts:17` e a lista de `:27` como as linhas 26 e 27 de Links).
- [ ] **Passo 3: Layout raiz.** As doze trocas de "SEO por rota › Layout raiz", uma a uma, achando cada uma pelo texto de hoje. Depois: `grep -n "[—–]\|mpermeáv\|15 acabamentos\|instalado em 2\|8 acabamentos\|4 acabamentos" src/app/layout.tsx` não acha nada dentro do `metadata` nem dos schemas (comentário de código não conta).
- [ ] **Passo 4: Sitemap e manifesto.** Sitemap como "SEO por rota › Sitemap" (E2/3): entra `/produtos/pfb` (`priority 0.9`, `monthly`), fica o catálogo, sai `/tecnologia`. `assets.ts`: saem as quatro entradas.
- [ ] **Passo 5: Nada mais aponta para /tecnologia.** `grep -rn "/tecnologia\|página Tecnologia" src` acha só: `src/app/termos/page.tsx`, `src/lib/clausulas-pedido.ts` (sem o OK do dono), a chave de `PAGINAS_ANTIGAS` em `ChatWidget.tsx`, a regra do 301 em `next.config.ts` (fora de `src`, não aparece) e os comentários históricos de `src/components/projetos/Revelar.tsx` e `src/app/globals.css` (linha 37 de Links). Qualquer outro resultado é corrigido.
- [ ] **Passo 6: Conferir no servidor local.** Build com as variáveis do mock e `next start -p 3004`; `curl -s "http://localhost:3004/sitemap.xml"` tem `<loc>https://orbitalrevestimentos.com.br/produtos/pfb</loc>` e o catálogo, e não tem `/tecnologia`; `curl -s "http://localhost:3004/" | grep -c 'href="/tecnologia"'` dá `0`. Parar o `next start`.
- [ ] **Passo 7: Conferir e commit.** Rotina de fim de tarefa. Commit "PFB: fim da página Tecnologia, menu, links, chat, SEO do layout raiz e sitemap". Com o OK do dono para o item 37, um commit separado: "Termos: Manual Técnico solicitado pela página do PFB".

### Tarefa 7: verificar-pfb --etapa 2

**Arquivos:**
- Modificar: `scripts/verificar-pfb.mjs` (item 40, VP › Etapa 2, Foco da revisão)

**Interfaces:**
- Consome: os seletores das Tarefas 3 e 4; o mock; `catalogoPath`, `normalizeProductCode`, `CATALOGO_PATH`.
- Produz: `node scripts/verificar-pfb.mjs --base <url> --etapa 2 [--saida <dir>] [--so-redirecionamentos]`, com o mesmo `resultado.json` e o mesmo código de saída da Etapa 1. `--etapa 4` continua "não verificado: etapa ainda não implementada".

Convenções: o código da Etapa 1 continua igual para `--etapa 1` (o site no ar até 21/11 ainda é a E1, e o `--so-redirecionamentos` da E1 tem de continuar passando lá). As diferenças por etapa ficam em dados, não em cópias de função:
- `redirecionamentos(etapa)`: na 1, como hoje; na 2, `/produtos/pfb?modelo=orb-003` 308, `/produtos?modelo=orb-003` 307, `/produtos/pfb` 200 sem `Location`, `/tecnologia` 301 para `/produtos/pfb`, `/guias/mdf-manaus` 308 para `/produtos/pfb`, Foco 2 da E1 (`utm_source`) e Foco 1 desta etapa (`/tecnologia?utm_source=email` → 301, `Location` com `pathname` `/produtos/pfb` e `utm_source=email`; `/tecnologia/` → até 2 saltos seguidos à mão, sem seguir automático, terminando em `/produtos/pfb` com 200). Sitemap na 2: tem `/produtos/pfb` e `CATALOGO_PATH`, e nenhum `<loc>` com `/tecnologia`.
- `etapa1Navegador(browser, produtos, etapa)`: na 2, o evento do manual vai para `/produtos/pfb` (cartão de `section#ficha`, `pagina: "/produtos/pfb"`), e o resto é igual.
- `etapa2Navegador(browser, produtos)`: as verificações da VP › Etapa 2 que são da página, na ordem da VP, mais os Focos 2 a 5 desta etapa. `novoContexto` ganha um terceiro parâmetro opcional `{ memoria?: number; js?: boolean; reduzido?: boolean }` (padrão: memória 8, núcleos 8, JS ligado, sem movimento reduzido), em vez de contextos montados à mão.
- Capturas: `<saida>/pfb-<estado>-<L>x<A>.png` (por exemplo `pfb-cena-p050-1440x900.png`).
- Auxiliar único para "rolar até p": `topo + p × (altura − innerHeight)` com `behavior: "instant"` e a espera da VP (600 ms nos casos de cena).
- Larguras da VP para a página: as sete de `LARGURAS`.

- [ ] **Passo 1a: Redirecionamentos e sitemap da Etapa 2** (inclui o Foco 1). Com mock e `next start -p 3004` da `HEAD`: `node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 2 --so-redirecionamentos` sai com código 0, e `--etapa 1 --so-redirecionamentos` contra a mesma base sai com código 1 (prova de que as expectativas mudam por etapa: a 1 espera 307 em `/produtos/pfb`).
- [ ] **Passo 1b: Página, larguras e dados.** Rolagem lateral, `#tecnologia` e `#ficha`, "Ver os modelos" e os três links de linha, `#ficha` a 390 e 1440, dados (≥ 2 miniaturas, ≥ 1 lugar), celular (375, 390, 430 e 768: altura < 2,5 × `innerHeight`, figura visível, cada `li` com opacidade 1 no meio da tela, retângulos sem sobreposição), texto proibido (lista da VP, "UV" e "MDF" como palavra inteira, `script[type="application/ld+json"]` todos, `document.title`, atributos fora de `[data-texto-banco]`), JavaScript transferido ≤ o de `/techstone`, evento do manual em `/produtos/pfb`, Focos 2 e 5.
- [ ] **Passo 1c: A cena.** 1440 × 900 (altura 4 × `innerHeight` ± 2 px; p de 0 a 1 em passos de 0,1; produto das opacidades ≥ 0,6; item dentro de `[0, innerHeight]`; em p = 0,5 a camada 0 ≥ 200 px acima da 4, medido pelos `getBoundingClientRect().top` de `g[data-camada="0"]` e `g[data-camada="4"]`; em p = 1 legenda com opacidade 1), 1024 × 720 e 1280 × 720 (lista dentro do quadro em p 0, 0,5 e 1), 1440 com `fontSize` 20 px, fallback sem `animation-timeline`, nível leve (com `clsCarga < 0,001` e opacidade 1 em três posições), 1280 × 680, movimento reduzido, Focos 3 e 4.
- [ ] **Passo 2: Rodar tudo.** `node --check scripts/verificar-pfb.mjs`, `npm run lint`, e com mock e `next start -p 3004` da `HEAD`: `node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 2`. Toda falha é investigada (`superpowers:systematic-debugging`): ou o script mede errado e é corrigido aqui, ou o site está errado e a correção vai para a tarefa dona, num commit próprio, com revisão. Parar o servidor no fim.
- [ ] **Passo 3: Commit.** "verificar-pfb: verificações da Etapa 2 do PFB (página, cena, redirecionamentos e texto)".

### Tarefa 8: Verificação da Etapa 2, portão, revisões e prévia (controlador)

Não muda código, a não ser para corrigir o que esta tarefa encontrar; cada correção vai a um implementador, passa por revisão e vira um commit próprio, e a verificação roda de novo.

- [ ] **Passo 1: Estática.** `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm run test:movimento`, `npm run test:links`, `npm run test:funil`, `npm run test:pfb`. Tudo verde.
- [ ] **Passo 2: Servidor local com o mock** (VP › Ambiente), com as portas 3004 e 54329 livres antes. Conferir o log `escutando em` e a linha ` GET /rest/v1/products` depois de `curl -s "http://localhost:3004/api/products"`.
- [ ] **Passo 3: Verificação E2.** `node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 2`: código 0 e todas as entradas de `.superpowers/checks/saida/pfb-etapa-2/resultado.json` com `"ok"`. Ler as capturas a 320, 390 e 1440 e as da cena.
- [ ] **Passo 4: Reservas das seções 4 e 6** (VP › Unit Tests): `dados/products.json` do mock reduzido a 1 modelo Classic e nenhum Elegance (cópia do original guardada antes em `.superpowers/checks/saida/e2/products.original.json`), mock reiniciado, build e `next start` de novo; pelo HTML (`curl`), a linha Classic tem 1 miniatura e o bloco-link, a Brilliance e a Elegance mostram a reserva (só o link `data-teste="ver-linha"`). Voltar o arquivo original, reiniciar o mock e repetir o build antes do passo 5.
- [ ] **Passo 5: Portão de movimento**, os três comandos da VP, com `--saida .superpowers/checks/saida/pfb-portao-e2/{cena,reduzido,catalogo}`. Passa pelos critérios da VP (inclui `faixas.camadas.alturaTelas`). Ler as `folha.png`. Um quadro de 33 ms no `ipad-mini` com altura útil em 4199-4200 px é o artefato conhecido (`.superpowers/checks/saida/diag-ipad-mini.md`), não falha da página; qualquer outro é falha.
- [ ] **Passo 6: Conferência de sentimento** (VP, `feel.md` §6) pelas folhas de contato e capturas: uma palavra por seção, comparada com a curva da spec, registrada no ledger.
- [ ] **Passo 7: Revisões.** `humanizer` e `orbital-marca` sobre `src/lib/pfb-textos.ts`, `src/lib/pfb-linhas.ts`, os textos dos itens 31, 32 e 36 e o SEO da rota e do layout raiz (achado vira pergunta ao dono: o texto foi aceito na spec e só muda com OK); `code-review` sobre `ad8340f..HEAD`; `revisor-tecnico`; `qa-revisor` (agente de `/Users/armaandaswani/orbital-ai-os/.claude/agents/direcao/qa-revisor.md`, chamado como `Agent` com essa definição no pedido).
- [ ] **Passo 8: Prévia.** `/opt/homebrew/bin/git push -u origin pfb-e2-pagina` (push de branch para a prévia da Vercel é permitido; nunca na `main`). Parar o `next start` e o mock.
- [ ] **Passo 9: Conferência manual (dono), fora do Chromium** (VP): Safari no Mac a 1440 × 900 e iPhone do dono na prévia, com capturas em `.superpowers/checks/saida/pfb-etapa-2/manual/` e uma linha por item em `resultado.md` ali. Sem as capturas, o item fica "não verificado" e a E2/3 não é dada como pronta. O relatório ao dono traz o roteiro dessa conferência.
- [ ] **Passo 10: Relatório ao dono e ledger.** Sem merge: a E2/3 só vai ao ar a partir de 21/11/2026, com OK explícito do dono. Anotar no ledger e atualizar a memória `project_site_redesign_2026_11`.
