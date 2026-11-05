# Visualizador como app: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** turn `/visualizador` into an app-like, one-step-per-screen flow: Foto, then Marcar (a full-screen editor on phones), then Acabamento (large cards, one area at a time), then Resultado (a before/after slider). The detection, render, lead and quote engine stays unchanged.

**Architecture:** `src/components/VisualizadorWizard.tsx` keeps all state, effects and engine calls, and renders new presentational components from `src/components/visualizador/`. The pure flow rules live in `visualizador/fluxo.ts` with node tests. Old in-file subcomponents (`UploadStep`, `ZonesStep`, `ZoneCard`, `ResultStep`, `WizStepper`) are deleted as their replacements land.

**Tech stack:** Next.js 16.2.4 (App Router, Turbopack), React 19.2, Tailwind v4, TypeScript, Node built-in test runner (`*.test.mjs` importing `.ts`).

**Spec:** `docs/superpowers/specs/2026-11-04-visualizador-app-design.md`. Read it first. Every section number below refers to it.

## Global constraints

- The engine is untouched. That covers detection (`onTapPhoto`, `drawAddRect`, `addTextZone`, `confirmQuad`, `detectInto*`), `analyze`, `generate`, `handleLeadSubmit`, `download`, `addAnotherPhoto`, `falarComConsultor`, `goToSimulador`, `savedAmbientes`, `ORCAMENTO_INSTANTANEO_VISIVEL` and `DETERMINISTIC_PROJECTION`. Only call sites and presentation change.
- Embedded mode (`embeddedMode`, `simPrefills`, `onSkip`, prefilled lead, auto-advance on the first successful render) works exactly as today inside `/simulador`. In embedded mode the bottom action bar is not fixed: it renders in flow. There is no lead sheet in embedded mode.
- No prices are shown anywhere in the visualizer.
- Copy follows the spec strings. Humanizer applies to any new string. No em dashes, no eyebrow labels, no competitors. Technical labels ("SAM2", "Textura exata", "IA com referência", "Superfície detectada", "Redefinir cantos") never render unless the URL has `?debug=1`.
- Animation: transform and opacity only (`clip-path` only for the slider). Use the tokens `--mv-base` / `--mv-chegada`. `will-change` only while a transition runs. Under `prefers-reduced-motion: reduce` changes are instant.
- Touch targets are at least 44 px. Phone breakpoint < 768 px; desktop two-column ≥ 1024 px (768–1023 uses the phone layout).
- The camera fix from 7078a52 is kept (the "Tirar foto" input with `capture="environment"`, plus "Galeria" on coarse pointers).
- Browser checks run on the :3002 dev server from `/Users/armaandaswani/orbital-movimento`, using the Webdesign Playwright CLI written literally as `/Users/armaandaswani/Desktop/Webdesign/bin/playwright-cli`, plus the browser pane in mobile emulation.
  - Use a local test photo (`public/images/projetos/escritorio-depois.jpeg`).
  - Mock every detection, analysis and render endpoint with route interception. No paid API calls and no production uploads.
  - Never submit the lead form against a real API (intercept it).
- Safety: never read or copy `.env*` files; no shell variable as the executable; no Python heredocs; commit only, never push. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit subjects in Portuguese, no em dashes.

## Review focus

1. **A touch drag that starts on the photo outside the editor** (Acabamento, Resultado, desktop static view) scrolls the page and never creates a zone. Owned by Task 4: a Playwright touch-drag test.
2. **Leaving the full-screen editor any way other than "Pronto"** (✕, Esc, browser back, step change, unmount) always restores page scrolling. Owned by Task 4: a test for each exit path asserting `document.documentElement.style.overflow === ""`.
3. **Removing the area that is currently shown in Acabamento,** or removing the last area, never leaves an out-of-range current index or a blank screen. Owned by Task 1 (`areaSeguinte` and `ajustarAreaAtual` unit tests) and Task 5 (a browser check).
4. **Analysis fails or is offline.** Each area shows "Descreva onde aplicar", opens the Onde sheet, and "Gerar visualização" stays disabled until every area has text. Owned by Task 1 (`podeGerar` tests) and Task 5 (an intercepted 500 response).
5. **Embedded in `/simulador` on a phone.** No fixed bar overlapping the simulator's own controls, no lead sheet, and the quote still opens after the first render. Owned by Task 7: a browser check of the full embedded path with mocked endpoints.

---

### Task 1: Flow rules (`fluxo.ts`) with tests

**Files:**
- Create: `src/components/visualizador/fluxo.ts`
- Create: `src/components/visualizador/fluxo.test.mjs`
- Modify: `package.json`: add `"src/components/visualizador/*.test.mjs"` to the `test:movimento` globs.

**Interfaces:**
- Consumes: the `Zone` and `VizStep` types (`export` them from `VisualizadorWizard.tsx` if they are not exported already; `VizStep` is already exported).
- Produces:
  - `type EtapaVisivel = 0 | 1 | 2 | 3`, labels `ETAPAS = ["Foto", "Marcar", "Acabamento", "Resultado"] as const`.
  - `etapaVisivel(step: VizStep, phase: "mark" | "confirm" | "model"): EtapaVisivel`. upload→0; zones+mark→1; zones+confirm or model→2; result→3.
  - `podeConcluirMarcacao(zones: Pick<Zone,"detecting">[]): boolean`. True when there is at least 1 zone and none is detecting.
  - `areaPronta(z: Pick<Zone,"productChosen"|"instruction">): boolean`. True when `productChosen` is set and `instruction.trim()` is non-empty.
  - `podeGerar(zones, base: { canGenerate: boolean }): boolean`. Equals `base.canGenerate && zones.length > 0 && zones.every(areaPronta)`.
  - `areaSeguinte(atual: number, total: number): number | null`. The next index, or `null` when `atual` is the last.
  - `ajustarAreaAtual(atual: number, total: number): number`. Clamps to `[0, total-1]`, and returns 0 when `total === 0`.
  - `limitarDivisor(v: number): number`. Clamps the slider position to `[0, 100]`.
  - `passoTeclado(v: number, tecla: "ArrowLeft"|"ArrowRight"|"Home"|"End"): number`. ±5, Home→0, End→100, always clamped.

- [ ] **Step 1: Write the failing tests** in `fluxo.test.mjs`, named exactly as follows:
  - `etapaVisivel mapeia os passos`: asserts the four mappings above, plus `("zones","confirm")→2`.
  - `podeConcluirMarcacao`: `[]→false`, `[{detecting:true}]→false`, `[{detecting:false}]→true`.
  - `podeGerar exige modelo e descrição em todas`: false when one area has `instruction:"  "`; false when one has `productChosen:false`; false when `canGenerate:false`; true when all are ready.
  - `areaSeguinte`: `(0,2)→1`, `(1,2)→null`, `(0,1)→null`.
  - `ajustarAreaAtual`: `(2,2)→1`, `(0,0)→0`, `(-1,3)→0`.
  - `limitarDivisor e passoTeclado`: `limitarDivisor(130)→100`, `limitarDivisor(-4)→0`, `passoTeclado(98,"ArrowRight")→100`, `passoTeclado(3,"ArrowLeft")→0`, `passoTeclado(40,"Home")→0`, `passoTeclado(40,"End")→100`.
- [ ] **Step 2: Run** `npm run test:movimento`. Expected: the new tests FAIL (module not found).
- [ ] **Step 3: Implement** `fluxo.ts` with the exact signatures above. The functions are pure, with no React import.
- [ ] **Step 4: Run** `npm run test:movimento`. Expected: all pass (68 existing plus the new ones).
- [ ] **Step 5: Commit** `Visualizador: regras do fluxo com testes`.

### Task 2: Shell, bottom sheet, page layout

**Files:**
- Create: `src/components/visualizador/VizShell.tsx`, `src/components/visualizador/Folha.tsx`
- Modify: `src/components/VisualizadorWizard.tsx`: render via `VizShell` and delete `WizStepper`.
- Modify: `src/app/visualizador/page.tsx`: shorter hero; the "Como funciona" content and the closing CTA section go below the tool.
- Modify: `src/app/globals.css`: add a `/* ── Visualizador */` block (step transitions, sheet).

**Interfaces:**
- Consumes: `ETAPAS` and `etapaVisivel` from Task 1.
- Produces:
  - `VizShell(props: { etapa: EtapaVisivel; embutido: boolean; onVoltar?: () => void; acao?: { rotulo: string; onClick: () => void; desabilitada?: boolean; tom?: "primaria" | "verde" }; lateral?: React.ReactNode; children: React.ReactNode })`.
    - Progress bar with the 4 labels, current one highlighted. "Voltar" when `onVoltar` is set.
    - The `acao` button sits in a bottom bar: fixed with `env(safe-area-inset-bottom)` on < 1024 px when not `embutido`; in flow otherwise.
    - `lateral` renders as a sticky left column on ≥ 1024 px (the photo).
    - On step change, content enters with a fade plus 16 px slide (`data-etapa` attribute, CSS), and focus moves to the step `h2` (`tabIndex={-1}`).
    - **No scroll hunting (owner, 04/11: "I click next, then I start all the way down, then I have to scroll up").** On every step change, the window scrolls so the shell's top sits just under the site header: smooth, or instant under reduced motion; embedded mode scrolls to the shell top inside `/simulador`. Export `rolarParaTopo(el: HTMLElement): void` from `VizShell.tsx` so Task 5 can reuse it for "Próxima área".
    - **The primary action is always visible on phones** (fixed bar), so the client never scrolls to find "Continuar".
    - Owner, 04/11: "there are some spaces that are like dead, I can't scroll". No element outside the full-screen editor may have `touch-action: none` or block vertical pan.
  - `Folha(props: { aberta: boolean; titulo: string; onFechar: () => void; children: React.ReactNode })`.
    - `role="dialog"`, `aria-modal`, labelled by its title.
    - Focus trap, Esc closes, ✕ closes, and a downward swipe of more than 80 px on the handle closes.
    - Backdrop fades in; the panel slides up with transform. Instant under reduced motion.
- `/visualizador` hero copy: keep the h1 "Veja os acabamentos no seu ambiente". The subtitle becomes "Envie uma foto, marque as paredes e veja o acabamento aplicado." "Como funciona" (moved from `UploadStep` into the page, below the tool) keeps its three items.

- [ ] **Step 1: Write the failing check.** Run a Playwright script (scratchpad `checks/viz-shell.mjs`, run with node) that loads `/visualizador` at 390×844 and asserts:
  - a progressbar-like element with the 4 labels exists;
  - the "Foto" label is current;
  - the h1 sits within the first 400 px of the page;
  - the upload surface top is above 844 px (the tool starts within the first screen).
- [ ] **Step 2: Run it.** Expected: FAIL (today the hero pushes the tool below the fold).
- [ ] **Step 3: Implement** `VizShell` and `Folha`, the wizard wiring (existing step components passed as children for now) and the page changes.
- [ ] **Step 4: Run the check and `npx tsc --noEmit -p .`.** Expected: PASS. Take screenshots at 390×844 and 1440×900 (`viz-t2-*`).
- [ ] **Step 5: Commit** `Visualizador: moldura de app, folha e página mais enxuta`.

### Task 3: EtapaFoto

**Files:**
- Create: `src/components/visualizador/EtapaFoto.tsx`
- Modify: `src/components/VisualizadorWizard.tsx`: replace `UploadStep` with `EtapaFoto`, then delete `UploadStep`.

**Interfaces:**
- Produces: `EtapaFoto(props: { onArquivo: (f: File | undefined | null) => void; erro: string | null; temAmbienteSalvo: boolean; resumoSimulador: string | null; embutido: boolean; onPular?: () => void })`.
  - It owns its two file inputs: gallery `accept="image/*"`, camera `accept="image/*" capture="environment"`. Both reset their `value` after change.
  - The touch buttons ("Tirar foto", "Galeria") show on `(pointer: coarse)`. On desktop: click or drag on the surface.
  - Copy: title "Envie uma foto do seu ambiente" (or "Envie a foto do próximo ambiente" when `temAmbienteSalvo`); tip "Foto de frente e bem iluminada funciona melhor."; `resumoSimulador` as one quiet line; "Pular esta etapa" when `onPular` is set.
- The wizard computes `resumoSimulador` with the existing `simBanner` logic. Move that logic into the wizard.

- [ ] **Step 1: Failing check** (`checks/viz-foto.mjs`):
  - In mobile emulation (browser pane or Playwright `hasTouch`, `isMobile`), assert two buttons named "Tirar foto" and "Galeria" and an input with `capture="environment"`.
  - At desktop, assert the buttons are hidden.
  - Use `setInputFiles` with the test photo on the gallery input and assert the step becomes "Marcar".
- [ ] **Step 2: Run it.** Expected: FAIL on the component and step labels.
- [ ] **Step 3: Implement** `EtapaFoto` and the wiring.
- [ ] **Step 4: Run the check, tsc and eslint** on the changed files (no new problems compared with the 3 pre-existing ones in the wizard). Expected: PASS.
- [ ] **Step 5: Commit** `Visualizador: etapa da foto no novo formato`.

### Task 4: Full-screen marking editor and the non-interactive photo

**Files:**
- Create: `src/components/visualizador/SurfaceCanvas.tsx` (moved from the wizard, unchanged except the new prop)
- Create: `src/components/visualizador/EditorMarcacao.tsx`
- Create: `src/components/visualizador/useTravaRolagem.ts`
- Modify: `src/components/VisualizadorWizard.tsx`: mark phase via the editor on phones and in place on desktop; delete the visible "confirm" screen; add `concluirMarcacao`.

**Interfaces:**
- Produces:
  - `SurfaceCanvas` keeps today's props and adds `interativo: boolean`. When `false`: no pointer or click handlers are attached, the root has no `touch-action: none`, the zone label buttons are not rendered as buttons, and the photo is a plain image (`touch-action: auto`).
  - `useTravaRolagem(ativa: boolean): void`. While `ativa`, it sets `document.documentElement.style.overflow = "hidden"` and `overscrollBehavior = "none"`, and restores the previous values on deactivate and unmount.
  - `EditorMarcacao(props: { aberto: boolean; photoData: string; zones: Zone[]; activeZoneId: string | null; setActiveZoneId: (id: string | null) => void; onTapPhoto; onDrawRect; onAddTextZone: () => void; onConfirmQuad; updateZone; removeZone: (id: string) => void; retargetId: string | null; setRetargetId: (id: string | null) => void; ocupado: boolean; onPronto: () => void; onFechar: () => void })`. The handler types are the same as today's `ZonesStep` props.
    - A fixed overlay with `#0B1F45` background and `role="dialog"`, labelled "Marcar as áreas".
    - Uses `useTravaRolagem(aberto)`.
    - Top bar: ✕ (asks "Descartar as novas marcações?" only when zones were added since opening) and "Pronto" (disabled unless `podeConcluirMarcacao(zones)`).
    - The photo is fitted with contain, `SurfaceCanvas interativo`, and a pulse at the tap point while detecting (CSS only).
    - Bottom panel: the hint "Toque em cada parede, teto ou móvel que quer revestir"; a horizontal row of chips per zone (colour dot, label, ✕ remove, "Refazer" on the selected chip); links "Desenhar uma área" (switches the canvas mode to draw) and "Descrever em texto" (`onAddTextZone`).
    - Esc closes. Browser back closes the editor and stays on the page (push a history state when opening and pop it on close).
    - An `aria-live="polite"` region announces "Área marcada", "Área detectada" and "Não foi possível detectar, desenhe a área" as zones change.
  - Wizard: `concluirMarcacao()`. It closes the editor, sets `zonePhase` to `"model"`, sets the current area to 0, and calls `analyze()` in the background when `analysis.sig !== marksSig || analysis.status === "error"` (the same rule as today's `goConfirm`).
    - Phones (< 1024 px): after a photo, open the editor automatically. "Editar áreas" in Acabamento reopens it.
    - Desktop: the mark phase shows the photo in the left column with `SurfaceCanvas interativo` in place, and the right column holds the hint, chips and the action "Continuar" (calls `concluirMarcacao`).

- [ ] **Step 1: Failing tests:**
  - `checks/viz-marcar.mjs` (Playwright, `hasTouch`, 390×844, mocked detection endpoint returning a polygon), with these cases:
    1. After a photo, a dialog named "Marcar as áreas" is visible and `documentElement.style.overflow === "hidden"`.
    2. A tap on the photo creates the chip "Parede 1"; the chip's ✕ removes it.
    3. "Pronto" is enabled only with ≥ 1 non-detecting zone. Clicking it closes the dialog, restores `overflow === ""`, and the step label is "Acabamento".
    4. Review focus 2: reopen the editor and close it via ✕, then Esc, then `page.goBack()`. After each, `overflow === ""` and the URL path is still `/visualizador`.
    5. Review focus 1: in Acabamento, `page.touchscreen` drag from the photo centre upward by 300 px changes `scrollY` and leaves the zone count unchanged.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement** the files above. Move `SurfaceCanvas` verbatim first, then add `interativo`, then the editor, then the wizard wiring. Remove the confirm screen JSX; keep `analysis`, `keepText` and `analyze` state and logic.
- [ ] **Step 4: Run the check, tsc, eslint and `npm run test:movimento`.** Expected: PASS. Screenshots `viz-t4-*` at 390×844 (editor with 2 zones) and 1440×900 (in-place marking).
- [ ] **Step 5: Commit** `Visualizador: marcação em tela cheia no celular e foto que não rouba a rolagem`.

### Task 5: Acabamento, one area at a time

**Files:**
- Create: `src/components/visualizador/EtapaAcabamento.tsx`, `src/components/visualizador/CartaoAcabamento.tsx`
- Modify: `src/components/VisualizadorWizard.tsx`: add `areaAtual` state; replace the model phase (`ZoneCard` list) with `EtapaAcabamento`; delete `ZoneCard` and `ZonesStep`.

**Interfaces:**
- Consumes: `areaSeguinte`, `ajustarAreaAtual`, `areaPronta` and `podeGerar` (Task 1); `Folha` (Task 2); `SurfaceCanvas interativo={false}` (Task 4).
- Produces:
  - `CartaoAcabamento(props: { produto: VizProduct; selecionado: boolean; onEscolher: () => void })`.
    - A button with `aria-pressed`, about 70vw wide on phones and 220 px on desktop, `scroll-snap-align: start`.
    - Shows `produto.image_path` with `object-cover` (no 1.35 zoom), the name and the code.
    - Selected: a 2 px `#0B1F45` frame, a check badge, and `scale(1.02)` (none under reduced motion).
  - `EtapaAcabamento(props: { zona: Zone; indice: number; total: number; produtos: VizProduct[]; carregando: boolean; analise: "idle"|"loading"|"done"|"error"; depurar: boolean; onEscolher: (productId: string) => void; onAtualizar: (patch: Partial<Zone>) => void; keepText: string; setKeepText: (v: string) => void; onEditarAreas: () => void })`.
    - Header "<label> · <indice+1> de <total>".
    - Line tabs: `LINE_ORDER`, defaulting to the line of the zone's current product, else the first; a tab with zero products is hidden.
    - A scroll-snap row of cards.
    - The "Onde:" line shows `zona.instruction`. While `analise === "loading"` it reads "Lendo a foto…". When the text is empty it reads "Descreva onde aplicar", and "Editar" opens the Onde `Folha` (the instruction textarea plus "Manter igual" bound to `keepText`).
    - The "Ajustes" link opens a `Folha` with the surface select (`VIZ_SPACES`, "Outro…" with a custom label) and the width/height fields (existing sanitizing), plus "Redefinir cantos" only when it applies today.
    - Technical labels render only when `depurar` is set.
    - "Editar áreas" calls `onEditarAreas`.
  - Wizard: `areaAtual: number`, kept valid with `ajustarAreaAtual` whenever `zones.length` changes.
    - The photo in the left column or top highlights `zones[areaAtual]` (pass `activeZoneId`).
    - Shell action: "Próxima área" when `areaSeguinte` is not null and `areaPronta(zona)`; else "Gerar visualização" (green), enabled by `podeGerar(zones, { canGenerate })` and calling `generate`.
    - **Phone fit:** on phones the Acabamento screen fits one viewport without vertical scrolling at 390×844 and 375×667:
      - the photo is capped at about 34svh (contain);
      - then the area header, the line tabs, the card row (horizontal scroll only) and the "Onde" line;
      - the fixed action bar sits below.
    - "Próxima área" swaps the content in place (fade) and calls `rolarParaTopo`, so the next area starts with the photo and the cards in view. Add to the Step 1 check: after "Próxima área", the shell top is within 8 px of the header bottom and the first card is fully visible without scrolling.
    - `depurar` = the URL search param `debug === "1"`.

- [ ] **Step 1: Failing check** (`checks/viz-acabamento.mjs`, two mocked zones, mocked products list with 2 lines, mocked analysis):
  - The cards are large: the first card's width is ≥ 60% of 390 px.
  - Choosing a card sets `aria-pressed="true"`.
  - "Próxima área" moves to "2 de 2"; the last area shows "Gerar visualização", disabled until a card is chosen.
  - Review focus 3: removing the current area through "Editar áreas" leaves a valid "1 de 1" screen.
  - Review focus 4: with analysis mocked as a 500, "Descreva onde aplicar" shows, and "Gerar visualização" stays disabled until text is typed in the Onde sheet.
  - The technical labels are absent, and present with `?debug=1`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the check, tsc, eslint and tests.** Expected: PASS. Screenshots `viz-t5-*` at 390×844 and 1440×900.
- [ ] **Step 5: Commit** `Visualizador: acabamento em cartões grandes, uma área por vez`.

### Task 6: Resultado with before/after

**Files:**
- Create: `src/components/visualizador/EtapaResultado.tsx`, `src/components/visualizador/AntesDepois.tsx`
- Modify: `src/components/VisualizadorWizard.tsx`: replace `ResultStep` and the two standalone panels below it (consultant and quote) with `EtapaResultado`, then delete `ResultStep`.
- Modify: `src/app/globals.css`: the slider styles in the Visualizador block.

**Interfaces:**
- Consumes: `limitarDivisor` and `passoTeclado` (Task 1); `Folha` (Task 2).
- Produces:
  - `AntesDepois(props: { antes: string; depois: string; rotuloAntes?: string; rotuloDepois?: string })`.
    - Two stacked images; the "depois" layer is clipped with `clip-path: inset(0 0 0 calc(var(--div) * 1%))`. `--div` starts at 50.
    - A handle that is a `role="slider"` with `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow` and a ≥ 44 px target.
    - Pointer drag uses pointer capture on the handle only, so the image itself keeps `touch-action: pan-y` and vertical scroll works.
    - Keys use `passoTeclado`. Labels "Antes" and "Depois".
  - `EtapaResultado(props: { photoData: string; resultado: string | null; previa: string | null; gerando: boolean; progresso: { i: number; total: number; label: string } | null; erro: string | null; embutido: boolean; leadEnviado: boolean; leadNome: string; leadTelefone: string; onNome: (v: string) => void; onTelefone: (v: string) => void; onEnviarLead: () => void; onConsultor: () => void; onBaixar: () => void; onOutroAcabamento: () => void; onOutroAmbiente: () => void; orcamento: null | { pronto: boolean; preparando: boolean; resumo: string; onContinuar: () => void } })`.
    - While generating: the photo plus a thin line "Aplicando <progresso.label> (i de total)", inside an `aria-live="polite"` region.
    - Standalone and not `leadEnviado`: a `Folha` (it cannot be closed while it blocks the reveal) with name and WhatsApp, using today's validation (8–13 digits) and the copy "Informe seus dados para ver o resultado." with the button "Ver resultado".
    - After the reveal: `AntesDepois(photoData, resultado)`, then the actions: primary "Falar com um consultor" (`onConsultor`), then "Baixar imagem", "Testar outro acabamento", "Adicionar outro ambiente", and the `orcamento` block when it is not null.
    - The error state keeps today's message, with a "Tentar de novo" button that calls the existing regenerate.
- Wizard mapping:
  - `onOutroAcabamento` sets `zonePhase` to `"model"`, `areaAtual` to 0 and the step to `"zones"`.
  - `orcamento` is built only when `ORCAMENTO_INSTANTANEO_VISIVEL && !embeddedMode`, from today's `quoteReady`, `proceeding`, `allAmbientes` and `goToSimulador`.
  - Embedded auto-advance stays as it is.

- [ ] **Step 1: Failing check** (`checks/viz-resultado.mjs`, mocked render returning a data URL, mocked lead endpoint):
  - Standalone: the lead dialog blocks the reveal; with valid name and phone it closes and shows the slider at `aria-valuenow="50"`.
  - ArrowRight ×3 gives 65.
  - A touch drag on the handle changes the value.
  - A vertical touch drag on the image scrolls the page.
  - The four actions are present.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the check, tsc, eslint and tests.** Expected: PASS. Screenshots `viz-t6-*` at 390×844 and 1440×900.
- [ ] **Step 5: Commit** `Visualizador: resultado com antes e depois e ações claras`.

### Task 7: Embedded mode, cleanup, harness

**Files:**
- Modify: `src/components/VisualizadorWizard.tsx`: remove dead code (unused imports, `useProjection` warning only if it is now trivially removable without touching the engine).
- Modify: `src/app/simulador/page.tsx` only if the embed needs a prop rename (prefer none).

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Embedded check** (`checks/viz-embutido.mjs`, review focus 5): on `/simulador` at 390×844 with mocked products, capture, detection, analysis and render endpoints, walk the simulator to "Ver no ambiente" and assert:
  - the shell's action bar is in flow (not `position: fixed`);
  - there is no lead dialog;
  - after the mocked render, the quote step opens (today's `onComplete` path);
  - "Pular esta etapa" works.
- [ ] **Step 2: Run it** and fix any wiring gap until PASS.
- [ ] **Step 3: Grep and clean.** Confirm none of `UploadStep`, `ZonesStep`, `ZoneCard`, `ResultStep` or `WizStepper` remain. eslint shows no new problems versus the 3 pre-existing ones. `npx tsc --noEmit -p .` is clean. `npm run test:movimento` passes.
- [ ] **Step 4: Harness.** Run `node scripts/medir-movimento.mjs --url http://localhost:3002/visualizador --dispositivo iphone-15-pro --cpu 4 --repeticoes 3` and the same with `desktop-1440`, before (main at 7078a52, measured in the spare worktree `/Users/armaandaswani/orbital-mv-jornada` on :3004) and after. Gate: ruling 27 (a median increase within the run-to-run spread is accepted). Record the load average for each run.
- [ ] **Step 5: Commit** `Visualizador: modo embutido conferido e limpeza`.
