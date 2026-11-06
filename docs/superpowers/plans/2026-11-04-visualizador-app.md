# Visualizador como app: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** turn `/visualizador` into an app-like, one-step-per-screen flow: Foto, then Marcar (a full-screen editor on phones), then Acabamento (large cards, one area at a time), then Resultado (a before/after slider). The detection, render, lead and quote engine stays unchanged.

**Architecture:** `src/components/VisualizadorWizard.tsx` keeps all state, effects and engine calls, and renders new presentational components from `src/components/visualizador/`. The pure flow rules live in `visualizador/fluxo.ts` with node tests. Old in-file subcomponents (`UploadStep`, `ZonesStep`, `ZoneCard`, `ResultStep`, `WizStepper`) are deleted as their replacements land.

**Tech stack:** Next.js 16.2.4 (App Router, Turbopack), React 19.2, Tailwind v4, TypeScript, Node built-in test runner (`*.test.mjs` importing `.ts`).

**Spec:** `docs/superpowers/specs/2026-11-04-visualizador-app-design.md`. Read it first. Every section number below refers to it.

## Global constraints

- The engine is untouched. That covers detection (`onTapPhoto`, `drawAddRect`, `addTextZone`, `confirmQuad`, `detectInto*`), `analyze`, `generate`, `handleLeadSubmit`, `download`, `addAnotherPhoto`, `falarComConsultor`, `goToSimulador`, `savedAmbientes`, `ORCAMENTO_INSTANTANEO_VISIVEL` and `DETERMINISTIC_PROJECTION`. Only call sites and presentation change.
- **[Superado em 06/11/2026: modo embutido removido]** Embedded mode (`embeddedMode`, `simPrefills`, `onSkip`, prefilled lead, auto-advance on the first successful render) works exactly as today inside `/simulador`. In embedded mode the bottom action bar is not fixed: it renders in flow. There is no lead sheet in embedded mode.

  > **Emenda 06/11/2026 (decisão do dono: modo embutido removido).** The embedded mode is gone. Step 5 of `/simulador` ("Ver no ambiente") rendered the Visualizador only when `step === 5 && !showResult`, but "Ver meu investimento" sets `step = 5` and `showResult = true` together, the stepper only goes backwards and no URL parameter sets the step, so no client could reach it (Task 7 report, `.superpowers/sdd/2026-11-04-visualizador-app/task-7-report.md`). The owner decided on 06/11/2026 to remove it as dead code (`visualizador-goldfish-resolucao.md`, last section). Removed: the step-5 block and `buildVizPrefills` in `src/app/simulador/page.tsx`; in the wizard and `visualizador/*`, `embeddedMode`, the `simPrefills`, `products`, `loadingProducts`, `prefilledLeadName`/`prefilledLeadPhone`, `onComplete` and `onSkip` props, the auto-advance, the prefilled-lead effect, `suppressWhatsapp` from the wizard's save-render call, the B2 "Trocar foto"/"Voltar" links (`rotuloVoltar`, `data-viz-voltar-embutido`), "Pular esta etapa" and every `embutido` prop and branch. `VisualizadorWizard` now takes no props and only `/visualizador` uses it. Kept: what `/simulador` shows a client today (steps 1 to 4, "Ver meu investimento", the result and quote screen, one quote send, e-mails), the standalone Visualizador and its engine, the `?src=sim` URL prefill from the Simulador link ("Vindo do Simulador: …") and the `?src=viz…&viz_render=` handoff back to the Simulador. The `suppressWhatsapp` option of `/api/visualizador/save-render` stays in the API, unused by the client.
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
   > **Emenda 06/11/2026 (B3).** The assertion is `document.body.style.overflow === ""`. The lock is the site's `travarRolagem()` (`src/components/ds/useDialogo.ts`, counted, on `body`), per Ruling 2 of the ledger (04/11); `useTravaRolagem` was never created. `checks/viz-marcar.mjs` already asserts on `body`. Reason: the plan kept the pre-ruling wording.
3. **Removing the area that is currently shown in Acabamento,** or removing the last area, never leaves an out-of-range current index or a blank screen. Owned by Task 1 (`areaSeguinte` and `ajustarAreaAtual` unit tests) and Task 5 (a browser check).
   > **Emenda 06/11/2026 (R2-N6).** The current area is kept by zone id, and `indiceDaArea` (Task 1, with tests) now also owns this focus. It finds the same zone after a removal, takes the next one when the current zone was removed, and returns 0 with no areas. `ajustarAreaAtual` still clamps. Reason: since M3 the index comes from `indiceDaArea`, and the plan cited only `ajustarAreaAtual`.
4. **Analysis fails or is offline.** Each area shows "Descreva onde aplicar", opens the Onde sheet, and "Gerar visualização" stays disabled until every area has text. Owned by Task 1 (`podeGerar` tests) and Task 5 (an intercepted 500 response).
   > **Emenda 06/11/2026 (N1, N4, M2).** Blocking "Gerar" on an empty description is a change from before the redesign (it used to be optional in the model phase), and it is intentional. In the failure case the whole "Descreva onde aplicar" line is a button that opens the Onde sheet. "Próxima área" needs only a chosen finish (`podeIrParaProximaArea`); "Gerar visualização" keeps the full `podeGerar` gate. Reason: final review (06/11/2026); the earlier per-area gate stopped a client who wanted to pick every finish first.
5. **[Superado em 06/11/2026: modo embutido removido]** **Embedded in `/simulador` on a phone.** No fixed bar overlapping the simulator's own controls, no lead sheet, and the quote still opens after the first render. Owned by Task 7: a browser check of the full embedded path with mocked endpoints.
   > **Emenda 06/11/2026 (decisão do dono: modo embutido removido).** Focus 5 is now: `/simulador` on a phone (390×844, touch) has no Visualizador element anywhere; steps 1 to 4 and "Ver meu investimento" open the result screen; the quote is sent exactly once; no horizontal scroll; no console errors. Owned by `checks/simulador-sem-visualizador.mjs` (replaces `viz-embutido.mjs`, kept as `.bak`), run on this branch and on main (:3004) with the same result. See the Global constraints emenda.

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

  > **Emenda 06/11/2026 (R2-M1, R2-N5).** `fluxo.ts` also produces:
  > - `areaSemDescricao(zones: Pick<Zone,"instruction">[], atual: number, base: { canGenerate: boolean }): number | null`. The first area without a description, but only when `canGenerate` holds, the current area has text, and that area is not the current one; otherwise `null`. It drives the line "Falta dizer onde aplicar…" above "Gerar visualização".
  > - `avisoFaltaDescricao(rotulo: string): string`. The text of that line: "na" before a feminine type or "Área N", "no" before a masculine type, and "na área “…”" for a name the client typed.
  > - Both have tests. The list also gained `podeIrParaProximaArea` (M2), `indiceDaArea` (M3) and `rotuloZona`.
  > - `etapaVisivel` takes `phase: "mark" | "model"`. The dead `"confirm"` phase is gone, and the test no longer passes it.
  >
  > Reason: second review round (06/11/2026). The functions were in the code but missing from the interface list, and `"confirm"` had already left `zonePhase` (N8).

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
      > **Emenda 06/11/2026 (M7).** Only the incoming screen animates; the outgoing one is removed at once (the step container is keyed by step). Reason: the spec described an exit animation the code never had.
    - **No scroll hunting (owner, 04/11: "I click next, then I start all the way down, then I have to scroll up").** On every step change, the window scrolls so the shell's top sits just under the site header: smooth, or instant under reduced motion; embedded mode scrolls to the shell top inside `/simulador` **[Superado em 06/11/2026: modo embutido removido, this clause no longer applies]**. Export `rolarParaTopo(el: HTMLElement): void` from `VizShell.tsx` so Task 5 can reuse it for "Próxima área".
      > **Emenda 06/11/2026 (R3-N2).** The embedded-mode scroll is gone with the embed; only the `/visualizador` scroll under the site header remains. Reason: third review round (06/11/2026); the line still described a removed mode. See the Global constraints emenda.
    - **The primary action is always visible on phones** (fixed bar), so the client never scrolls to find "Continuar".
      > **Emenda 06/11/2026 (M1).** The bar is `sticky` (bottom 0) inside the tool, not `fixed`: always in view while the client is in the Visualizador, and it leaves with the tool when the page scrolls on to "Como funciona". In embedded mode it is in flow. Reason: this is what `VizShell` does; a fixed bar would cover the content below the tool.
      > **Emenda 06/11/2026 (decisão do dono: modo embutido removido).** The `embutido` prop of `VizShell` and its in-flow bar, and the B2 links below (`rotuloVoltar`, `data-viz-voltar-embutido`), are removed: the bar is always the sticky one. The B2 emenda below is superseded. See the Global constraints emenda.
      > **Emenda 06/11/2026 (B2).** In embedded mode the shell has no stepper and no full-page "Voltar", but Marcar shows a compact in-flow link "Trocar foto" and Acabamento a compact "Voltar" (`rotuloVoltar`), both calling the wizard's `voltar`. Nothing is fixed and the simulator's own controls stay uncovered. Reason: final review found no way back inside the embed.
    - Owner, 04/11: "there are some spaces that are like dead, I can't scroll". No element outside the full-screen editor may have `touch-action: none` or block vertical pan.
    > **Emenda 06/11/2026 (R3-N2, signature as in the code).** `VizShell(props: { etapa: EtapaVisivel; onVoltar?: () => void; acao?: AcaoShell; lateral?: React.ReactNode; children: React.ReactNode })`, with `AcaoShell = { rotulo: string; onClick: () => void; desabilitada?: boolean; tom?: "primaria" | "verde"; aviso?: { texto: string; onClick: () => void } }`. `aviso` is the line "Falta dizer onde aplicar…" above the button (spec §3.4, R2-M1); `embutido` is gone. Reason: third review round (06/11/2026); the signature above predates `aviso` and the embed removal.
  - `Folha(props: { aberta: boolean; titulo: string; onFechar: () => void; children: React.ReactNode })`.
    > **Emenda 06/11/2026 (R3-N2, signature as in the code).** `Folha` also takes `fechavel?: boolean` (default `true`). With `fechavel={false}` (the lead sheet that unlocks the result) there is no ✕, and Esc, the backdrop and the swipe do not close it; it leaves when the wizard sets `aberta` to false (spec §6a, "A sheet that cannot be closed"). Reason: third review round (06/11/2026).
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
  > **Emenda 06/11/2026 (decisão do dono: modo embutido removido).** `embutido` and `onPular` are removed: `EtapaFoto(props: { onArquivo; erro; temAmbienteSalvo; resumoSimulador })`. "Pular esta etapa" no longer exists and the summary line always reads "Vindo do Simulador: …". See the Global constraints emenda.
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

> **Emenda 06/11/2026 (B3).** `useTravaRolagem.ts` does not exist. Per Ruling 2 of the ledger (04/11), the editor locks scrolling through `useDialogo` and the site's `travarRolagem()` (counted, `overflow: hidden` on `body`). Wherever this task says `useTravaRolagem` or `documentElement.style.overflow`, read `travarRolagem()` and `document.body.style.overflow`. Reason: the ruling was taken before Task 4 and the plan text was not updated. The dead `"confirm"` phase was also removed from `zonePhase` on 06/11/2026 (N8), with the scroll effect that only ran on it.

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
  - Wizard: `concluirMarcacao()`. It closes the editor, sets `zonePhase` to `"model"`, sets the current area to 0 **[Superado em 06/11/2026: see the R3-N2 emenda below]**, and calls `analyze()` in the background when `analysis.sig !== marksSig || analysis.status === "error"` (the same rule as today's `goConfirm`).
    > **Emenda 06/11/2026 (R3-N2).** `concluirMarcacao` no longer resets the current area to 0. The current area is kept by zone id (M3, Task 5): back from "Editar áreas" the client stays on the same area, or the next one if it was removed; area 1 becomes current again only with a new photo. Reason: third review round (06/11/2026); this line predates M3.
    - Phones (< 1024 px): after a photo, open the editor automatically. "Editar áreas" in Acabamento reopens it.
    - Desktop: the mark phase shows the photo in the left column with `SurfaceCanvas interativo` in place, and the right column holds the hint, chips and the action "Continuar" (calls `concluirMarcacao`).
    > **Emenda 06/11/2026 (M5).** "Desktop" means a fine pointer and at least 1024 px (`marcaNoLugar()`). Any touch device, a tablet in landscape included, uses the full-screen editor. Reason: the code was changed in the Task 4 review (coarse-pointer touch flow); the plan still split by width only.

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
      > **Emenda 06/11/2026 (B4, decisão do dono).** The card shows the product's flat texture (`render_texture_path`) when it exists, and otherwise the catalogue photo (`image_path`) with a 1.8 zoom crop centred on the panel. It does not show the uncropped catalogue photo. Reason: the owner chose the texture on 06/11/2026, so the client sees the finish up close; the 1.8 crop of products without a texture may still show a strip of wall until a texture is registered for them (owner data).
    - Selected: a 2 px `#0B1F45` frame, a check badge, and `scale(1.02)` (none under reduced motion).
  - `EtapaAcabamento(props: { zona: Zone; indice: number; total: number; produtos: VizProduct[]; carregando: boolean; analise: "idle"|"loading"|"done"|"error"; depurar: boolean; onEscolher: (productId: string) => void; onAtualizar: (patch: Partial<Zone>) => void; keepText: string; setKeepText: (v: string) => void; onEditarAreas: () => void })`.
    - Header "<label> · <indice+1> de <total>".
    - Line tabs: `LINE_ORDER`, defaulting to the line of the zone's current product, else the first; a tab with zero products is hidden.
    - A scroll-snap row of cards.
    - The "Onde:" line shows `zona.instruction`. While `analise === "loading"` it reads "Lendo a foto…". When the text is empty it reads "Descreva onde aplicar", and "Editar" opens the Onde `Folha` (the instruction textarea plus "Manter igual" bound to `keepText`).
    - The "Ajustes" link opens a `Folha` with the surface select (`VIZ_SPACES`, "Outro…" with a custom label) and the width/height fields (existing sanitizing), plus "Redefinir cantos" only when it applies today.
      > **Emenda 06/11/2026 (M4).** The button reads "Refazer os cantos" and shows without `?debug=1`, only when the chosen finish has a `render_texture_path` and the zone has a `quad`. It calls the same `quad: null` update. Reason: it had ended up behind `?debug=1`, out of the client's reach.
      > **Emenda 06/11/2026 (R2-M3, corrects M4).** It also needs the projection on (`DETERMINISTIC_PROJECTION && useProjection`, passed as `projecao`), or `?debug=1`. With the projection off, as today, the client does not see it and cannot erase the fallback quad. `generate`, `confirmQuad`, detection and the fallback quad seeding are unchanged. Reason: second review round; with the projection off the corners do not reach the render.
    - Technical labels render only when `depurar` is set.
    - "Editar áreas" calls `onEditarAreas`.
  - Wizard: `areaAtual: number`, kept valid with `ajustarAreaAtual` whenever `zones.length` changes.
    > **Emenda 06/11/2026 (M3).** The wizard keeps the current area by zone id plus its last index (`indiceDaArea` in `fluxo.ts`, with tests). Back from the editor it stays on the same zone even if an earlier area was removed; if the current zone was removed, the next one takes its place. Reason: an index made the screen jump to another zone after a removal.
    - The photo in the left column or top highlights `zones[areaAtual]` (pass `activeZoneId`).
    - Shell action: "Próxima área" when `areaSeguinte` is not null and `areaPronta(zona)`; else "Gerar visualização" (green), enabled by `podeGerar(zones, { canGenerate })` and calling `generate`.
      > **Emenda 06/11/2026 (M2).** "Próxima área" is enabled by `podeIrParaProximaArea(zona)` (a chosen finish), not `areaPronta`. "Gerar visualização" keeps `podeGerar` plus "analysis not running". Reason: final review; review focus 4 is unchanged.
    - **Phone fit:** on phones the Acabamento screen fits one viewport without vertical scrolling at 390×844 and 375×667:
      - the photo is capped at about 34svh (contain);
      - then the area header, the line tabs, the card row (horizontal scroll only) and the "Onde" line;
      - the fixed action bar sits below.
      > **Emenda 06/11/2026 (R2-M2).** The same fit holds while the line "Falta dizer onde aplicar…" makes the bar 52 px taller. Under `max-width: 1023.98px`, `html[data-viz-barra-aviso]` takes the 52 px out of `--viz-acab-livre`, which feeds both the photo band and the card photo. It also lowers their minimums to 56 px and 88 px, the band giving way first; `[data-erro]` still takes its 40 px off the card photo. The check covers 390×844 and 375×667, with the analysis failed and with it fine. Reason: second review round; the line covered the selected card's name.
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
      > **Emenda 06/11/2026 (B1c, N7, Q2).** `onConsultor` is optional: the wizard passes it only while `ORCAMENTO_INSTANTANEO_VISIVEL` is false (the rule of 7078a52), and the same applies to `AtalhoConsultor`; with the flag on only the quote block shows. The lead button reads "Salvar e aguardar" while generating and "Ver resultado" when the render is ready. The generated image's alt is "Simulação gerada por IA da mesma foto com o acabamento escolhido", and the simulation note sits right under `AntesDepois`, in the site's secondary text colour (`text-on-surface-variant`). Reason: final review (06/11/2026); engine outcomes unchanged.
    - The error state keeps today's message, with a "Tentar de novo" button that calls the existing regenerate.
    > **Emenda 06/11/2026 (R3-N2, signature as in the code).** `EtapaResultado(props: { photoData: string; resultado: string | null; previa: string | null; gerando: boolean; progresso: { i: number; total: number; label: string } | null; erro: string | null; leadEnviado: boolean; leadNome: string; leadTelefone: string; onNome: (v: string) => void; onTelefone: (v: string) => void; onEnviarLead: () => void; onConsultor?: () => void; onBaixar: () => void; onOutroAcabamento: () => void; onOutroAmbiente: () => void; onTentarDeNovo: () => void; orcamento: null | { pronto: boolean; preparando: boolean; resumo: string; onContinuar: () => void } })`. `onTentarDeNovo` is the "Tentar de novo" of the error state (the wizard passes `generate`); `onConsultor` is optional (B1c emenda above); `embutido` is gone. Reason: third review round (06/11/2026); the signature above predates these props.
- Wizard mapping:
  - `onOutroAcabamento` sets `zonePhase` to `"model"`, `areaAtual` to 0 and the step to `"zones"`.
  - `orcamento` is built only when `ORCAMENTO_INSTANTANEO_VISIVEL && !embeddedMode`, from today's `quoteReady`, `proceeding`, `allAmbientes` and `goToSimulador`.
  - **[Superado em 06/11/2026: modo embutido removido]** Embedded auto-advance stays as it is.
  > **Emenda 06/11/2026 (decisão do dono: modo embutido removido).** `EtapaResultado` has no `embutido` prop: the lead sheet always blocks the reveal, and `orcamento` is built when `ORCAMENTO_INSTANTANEO_VISIVEL` alone. The auto-advance is removed. See the Global constraints emenda.

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

> **Emenda 06/11/2026 (decisão do dono: modo embutido removido).** Task 7 was done (commit 7fca40f) and found the embed unreachable. Its embedded parts are superseded: Step 1 (`checks/viz-embutido.mjs`, now `viz-embutido.mjs.bak`) and Step 2 no longer apply, and `src/app/simulador/page.tsx` was changed after all, to remove the step-5 block. The replacement check is `checks/simulador-sem-visualizador.mjs`. The cleanup and harness steps stand. Report: `.superpowers/sdd/2026-11-04-visualizador-app/remocao-embutido-report.md`. See the Global constraints emenda.

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
