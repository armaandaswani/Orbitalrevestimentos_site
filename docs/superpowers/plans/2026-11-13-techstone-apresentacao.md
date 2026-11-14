# /techstone como apresentação: plano de implementação

> Execução nativa nesta sessão (o dono aprovou construir e só ver o resultado no ar).

**Objetivo:** as quatro seções de quadro preso da /techstone passam a tocar sozinhas numa tela só, com encaixe firme, e os modelos vão para `/techstone/catalogo`.

**Arquitetura:** um tocador puro (`criarToque`) calcula o progresso pelo tempo. O hook `useToque` liga esse tocador ao relógio do site e escreve `--p`, `data-ativo` e `data-p10` no elemento, os mesmos sinais do `useProgresso`. O CSS das seções não muda de lógica, só de altura.

**Pilha:** Next.js 16, React 19, Tailwind, `node --test` para lógica pura, Playwright (runtime em `~/Desktop/Webdesign/tools/playwright-runtime`) para a página.

**Design:** `docs/superpowers/specs/2026-11-13-techstone-apresentacao-design.md`

## Restrições globais

- Textos novos passam por `orbital-marca` e `humanizer`. Não citar concorrentes e não dizer que a Orbital instala.
- `transform` e `opacity` só. Nada de `transition: all`. `:focus-visible` em todo controle novo.
- `prefers-reduced-motion: reduce`: `--p = 1` direto, sem botão de pausa.
- Sem JavaScript: valem os `CSS_SEM_JS` que já existem.
- `IdeiaAmpliada` não muda.
- Commit com o e-mail `129905818+armaandaswani@users.noreply.github.com`.

## Foco de revisão

1. Rolar durante a animação leva à próxima seção, e a seção que saiu volta a 0.
2. O rodapé e as perguntas são alcançáveis com o encaixe ligado (roda, trackpad e toque).
3. Uma âncora ou um "voltar" do navegador que cai no meio da página não deixa a seção travada em `--p` parcial.
4. Aba oculta pausa a animação (o relógio já dorme) e ela continua ao voltar.
5. O encaixe sai do `html` ao navegar para outra página (SPA).

---

### Tarefa 1: tocador puro

**Arquivos:** criar `src/lib/movimento/toque.ts` e `src/lib/movimento/toque.test.mjs`, e incluir no `test:movimento` (o glob já cobre).

**Interface:** `criarToque(duracaoMs: number)` → `{ tocar(): void; pausar(): void; zerar(): void; terminar(): void; avancar(dtMs: number): number; readonly p: number; readonly estado: "parado" | "tocando" | "pausado" | "fim" }`.

Testes:
- `avancar` em "parado" não anda.
- Depois de `tocar()`, `avancar(dur/2)` dá p = 0,5 e `avancar(dur)` dá 1 com estado "fim".
- `pausar()` congela p. `tocar()` em "fim" recomeça do 0.
- `zerar()` volta a p = 0, "parado". `terminar()` vai a p = 1, "fim".

### Tarefa 2: hook `useToque` e botão

**Arquivos:** criar `src/components/ds/useToque.ts` e `src/components/techstone/BotaoToque.tsx`.

**Interface:** `useToque<T>(duracaoMs, opcoes?: { limiar?: number })` → `{ ref, estado, alternar }`.
- Começa a tocar quando a fração visível é ≥ `limiar` (padrão 0,6) e a rolagem parou (`scrollend`, ou 180 ms sem `scroll`).
- Zera quando a fração visível cai abaixo de 0,15. `data-ativo` segue a interseção com margem `100% 0px`.
- Com movimento reduzido, chama `terminar()` e escreve p = 1.
- `BotaoToque({ estado, alternar, rotulo })` fica no canto inferior esquerdo e mostra pausar, tocar ou tocar de novo, com `aria-label` e um ícone SVG de traço fino.

### Tarefa 3: encaixe

**Arquivos:** criar `src/components/techstone/Encaixe.tsx`, que no mount põe a classe `ts-encaixe` no `<html>` e a tira no unmount. CSS em `globals.css`: `html.ts-encaixe { scroll-snap-type: y mandatory; scroll-padding-top: 0 }`, `.ts-encaixe-ponto { scroll-snap-align: start }`, e o rodapé `html.ts-encaixe footer { scroll-snap-align: end }`.

### Tarefa 4: converter as quatro seções

- `Apresentacao.tsx`: `Abertura` e `Sequencia` passam a usar `useToque`, com altura `h-[100svh]` (sem sticky). Abertura dura 7000 ms e ganha o botão "Ver os modelos". Sequência dura 14000 ms, e as marcas do trilho viram botões que pulam para o quadro (pausam e põem p no início do quadro).
- `Clima.tsx`: `useToque(10000)`, `h-[100svh]`.
- `Tamanhos.tsx`: a `Revelacao` usa `useToque(9000)` com `h-[100svh]`. A `Grade` sai daqui. Ao fim, o link "Ver os modelos" leva a `/techstone/catalogo`.
- Conferir que `Profundidade rolagem="externa"` continua lendo o `--p` do pai.

### Tarefa 5: catálogo

- Criar `src/components/techstone/CatalogoTechStone.tsx` com abas Todos / 1200 × 600 / 2400 × 1200 (estado inicial vindo de `?tamanho=`), cartões com Lupa, "Baixar textura", "Tenho interesse" e `ListaEsperaSheet`.
- Criar `src/app/techstone/catalogo/page.tsx` com metadata, breadcrumb e `<Suspense>` para `useSearchParams`. Adicionar a rota ao `sitemap.ts`.
- `Ideias`: `verTamanho` vira navegação para `/techstone/catalogo?tamanho=…`.

### Tarefa 6: verificação

- `npm run test:movimento`, `npx tsc --noEmit`, `npm run lint` e `npm run build`.
- Playwright (`.superpowers/checks/techstone-apresentacao.mjs`) a 390 × 844 e 1440 × 900:
  - cada seção chega a `--p = 1` sozinha;
  - não há rolagem horizontal;
  - a altura total fica abaixo de 14 telas;
  - a ideia em tela cheia abre;
  - com reduced-motion, `--p = 1` direto;
  - o catálogo lista os 9 modelos e o filtro funciona;
  - o rodapé é alcançável.
- Hallmark `sloplint --render --url` na /techstone e na /techstone/catalogo.
- Commit, push e `esperar-deploy.sh /techstone "Ver os modelos"`.
