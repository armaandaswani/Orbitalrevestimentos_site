# PFB Carbon (Luxury Line) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/pfb-carbon` e catálogo `/pfb-carbon/catalogo` do PFB Carbon, em telas que tocam sozinhas, com lista de espera por modelo.

**Architecture:** Dados e textos num módulo puro (`src/lib/pfb-carbon.ts`). As telas são componentes cliente em `src/components/pfb-carbon/`, movidas pelo `--p` que o `useToque` escreve; todo o movimento é CSS (`calc()` sobre `--p`, só `transform` e `opacity`) num bloco `pc-` do `globals.css`. Encaixe, botão de pausa e folha da lista de espera são os da TechStone, sem alteração.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, `sharp` (já no `node_modules`) para tratar imagens, Playwright fora do repo para a bateria.

**Spec:** `docs/superpowers/specs/2026-11-15-pfb-carbon-design.md`

**Execução:** nesta sessão, sem subagentes (pedido do dono: poupar uso).

## Global Constraints

- Termos fixos das camadas, de cima para baixo: `Filme PET`, `Adesivo de alta aderência`, `SPC`, `Substrato em fibra de bambu carbonizado`, `SPC`. Nunca "cola".
- Medida `2,80 × 1,20 m`, espessura `5 mm`, densidade da base `650 kg/m³`, placa com o filme PET `cerca de 720 kg/m³`.
- Modelos, nesta ordem: Louro Freijó, Carvalho Natural, Imbuia, Jatobá, Pau Ferro.
- Proibido em texto público: preço, data de chegada, °C, %, MPa, "cola", "curva", "banheiro", "área úmida", "fachada" como uso, nome de concorrente, "instalamos/medimos/projetamos", a palavra "TechStone".
- "Painel Flexível em Fibra de Bambu" por extenso na primeira menção de cada página.
- Paleta: fundo `#131211`, marfim `#F2EEE6`, latão `#B08D57`. Noto Serif em títulos, Inter no resto, sem sombras.
- Premium e elegante (dono, 15/11): uma ideia por tela, pouco texto, muito espaço escuro, movimento lento.
- Só `transform` e `opacity` animam. Com `prefers-reduced-motion`, cada tela mostra o quadro final com todo o texto e sem botão de pausa.
- Classes novas com prefixo `pc-`; nenhuma regra `ts-` é alterada. `Navbar.tsx` e `Footer.tsx` não são editados.
- Imagem nova = nome com sufixo `-v1` (cache de 1 ano).

## Review Focus

1. Tela baixa (celular deitado, altura < 600 px): as telas ▶ não podem cortar texto; viram layout parado.
2. Sem JavaScript: `--p` nunca anda; todo texto precisa estar visível (bloco `@media (scripting: none)`).
3. Deslize forte com o dedo no Safari: não pular tela nem prender no fim.
4. Folha da lista de espera aberta a partir do catálogo com modelo marcado: o nome enviado precisa estar em `MODELOS_VALIDOS.carbon` (senão a rota descarta em silêncio).
5. Texto longo de modelo ("Carvalho Natural") a 390 px: sem quebra feia nem vazamento lateral.

---

### Task 1: Imagens

**Files:**
- Create: `scripts/pfb-carbon/imagens.mjs`
- Create: `public/images/pfb-carbon/texturas/<slug>-v1.webp` (600 × 1400), `public/images/pfb-carbon/download/pfb-carbon-<slug>.jpg` (original, sem recorte), `public/images/pfb-carbon/miolo-close-v1.webp`, `miolo-mao-v1.webp`, `miolo-faixa-v1.webp`

- [ ] Script com `sharp`: recorta cada textura no centro para 3:7, gera webp q82 e jpg q90. Entradas por argumento (pasta do dono, pasta das fotos do miolo).
- [ ] Fotos do miolo: balanço de branco (neutraliza o amarelo pelas camadas de SPC, que são brancas), níveis, nitidez leve, recorte; `faixa` é a foto 1 ou 3 girada até a placa ficar horizontal.
- [ ] Conferir cada saída olhando a imagem. Commit.

### Task 2: Dados, lista de espera, linhas, sitemap

**Files:**
- Create: `src/lib/pfb-carbon.ts`, `src/lib/pfb-carbon.test.mjs`
- Modify: `src/app/api/lista-espera/route.ts` (`MODELOS_VALIDOS`), `src/lib/linhas.ts` (entrada `carbon`), `src/app/sitemap.ts`

**Interfaces — Produces:**
- `MODELOS_CARBON: { slug: string; nome: string }[]`
- `MEDIDA = "2,80 × 1,20 m"`, `ESPESSURA = "5 mm"`, `DENSIDADE_BASE = "650 kg/m³"`, `DENSIDADE_PLACA = "720 kg/m³"`
- `CAMADAS_CARBON: readonly string[]` (5 nomes)
- `textura(m): string`, `texturaDownload(m): string`
- `CATALOGO_ESPERA_CARBON: { nome: string; imagem: string; detalhe?: string }[]`
- `PAGINA_CARBON = "/pfb-carbon"`, `CATALOGO_CARBON = "/pfb-carbon/catalogo"`
- `TEXTOS` (abertura, miolo, clima, números, perguntas): todo texto público mora aqui.

- [ ] Teste (`npm run test:pfb` já pega `pfb-*.test.mjs`): 5 modelos na ordem; camadas iguais às do Global Constraints; nenhum texto exportado contém termo proibido; cada arquivo de `textura()`/`texturaDownload()` existe em `public/`.
- [ ] Implementar; `linhas.ts`: `href: "/pfb-carbon"`, `imagem` = textura Louro Freijó, resumo novo, `usos: []`.
- [ ] `npm run test:pfb` e `npm run test:pedidos` verdes. Commit.

### Task 3: Página `/pfb-carbon`

**Files:**
- Create: `src/app/pfb-carbon/page.tsx` (metadata + breadcrumb), `src/components/pfb-carbon/PfbCarbon.tsx` (casca: Encaixe, telas, folha), `Abertura.tsx`, `Camadas.tsx`, `ClimaCarbon.tsx`, `Modelos.tsx`
- Modify: `src/app/globals.css` (bloco `── PFB Carbon ──` no fim do arquivo)

- [ ] Abertura (`.pc-abertura`, 8500 ms): parede de placas Louro Freijó espelhadas duas a duas, escurecida; rótulo "Luxury Line"; nome; três frases; convite.
- [ ] Miolo: foto real e uma linha; estática, duas colunas no computador.
- [ ] Camadas (`.pc-camadas`, 10000 ms): cinco lâminas em perspectiva que se afastam; nome de cada uma ao lado, um por vez; no fim todas nomeadas.
- [ ] Clima (`.pc-clima`, 10000 ms): título e três frases, uma por vez; no fim a frase da composição fica.
- [ ] Números: quatro valores, estática, `Revelar`.
- [ ] Modelos (`.pc-modelos`, 10000 ms): cinco placas em pé; uma acende por vez; no celular a fila desliza por `transform`; no fim todas acesas. Marcas para pular (`ir`). Cada placa é link para `CATALOGO_CARBON#<slug>`.
- [ ] Lista de espera e Perguntas (`data-encaixe="solto"`).
- [ ] Blocos `prefers-reduced-motion`, `scripting: none` e `max-height: 600px` para cada tela ▶.
- [ ] `npx tsc --noEmit` e `npx eslint` nos arquivos tocados. Commit.

### Task 4: Catálogo

**Files:**
- Create: `src/app/pfb-carbon/catalogo/page.tsx`, `src/components/pfb-carbon/CatalogoCarbon.tsx`

- [ ] Grade de 5 cartões (`id=<slug>`), `Lupa`, "Baixar textura", "Tenho interesse" → `ListaEsperaSheet linha="carbon"` com o modelo marcado. Fundo escuro.
- [ ] tsc, eslint. Commit.

### Task 5: Textos finais

- [ ] Passar `TEXTOS` por `orbital-marca` e `humanizer`; reescrever no módulo; `npm run test:pfb`. Commit.

### Task 6: Bateria

**Files (fora do repo):** `~/orbital-movimento/.superpowers/checks/pfb-carbon.mjs`, `pfb-carbon-bateria.sh`

- [ ] Para 1440 × 900, 390 × 844 e 390 × 844 reduzido: espera a intro sair; cada tela ▶ chega a `--p` = 1; `scrollWidth <= innerWidth` em cada parada; pausa e retoma; lista de espera abre; no catálogo "Tenho interesse" abre a folha com o modelo marcado e "Baixar textura" responde 200; envio de inscrição interceptado (sem gravar no Supabase de produção) com `modelos: ["Imbuia"]`; nenhum erro de console; prints de cada tela.
- [ ] Altura 500 (deitado) e sem JavaScript: todo texto visível.
- [ ] Olhar os prints, corrigir, repetir até verde.

### Task 7: Safari, checagens finais, publicação

- [ ] Safari do simulador de iPhone: deslize com inércia tela a tela, ida e volta.
- [ ] `npx tsc --noEmit`, `npx eslint <tocados>`, `npm run test:movimento`, `npm run test:pfb`.
- [ ] Merge em `main` (fast-forward a partir de `origin/main` atual), push, `esperar-deploy.sh /pfb-carbon "<texto novo>"`, bateria contra produção.
