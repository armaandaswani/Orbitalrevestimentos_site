# Visualizador como app: design

Date: 04/11/2026. Owner: Armaan (Orbital Revestimentos). Status: design approved in chat; spec awaiting owner review.

## 1. Why

`/visualizador` is the page the public menu calls "Simulador". The owner says it works but feels clunky, not interactive, not smooth, not elegant and not minimal. He reported three specific problems:

1. **Camera.** On some Android phones (Motorola) the camera does not open; only the gallery does. This was fixed and published in 7078a52 ("Tirar foto" and "Galeria" buttons on touch devices), before this redesign.
2. **The photo steals the scroll.** On a phone, a finger that lands on the photo while scrolling marks a new area by mistake.
3. **The finish picker is cramped.** A 4-column grid of small squares sits in a 180 px scroll box, inside a card packed with a dropdown, a textarea and measurement fields.

The owner's decisions (04/11/2026, verbatim choices):

- Direction: "App-like, one step per screen".
- Marking: "Full-screen marking mode".
- Finish: "Large cards, one area at a time".
- AI description step: "Automatic, editable if needed".

## 2. What must not change

- **The detection and render engine:** SAM2/fal and Gemini detection, `detectInto` and its kin, compositing, `DETERMINISTIC_PROJECTION`, progress and errors.
- **Lead capture before the result is revealed:** name and WhatsApp in standalone mode, `/api` calls as today.
- **Saved rooms:** `savedAmbientes`, "Adicionar outro ambiente".
- **The quote handoff:** "Continuar para o orçamento" and `ORCAMENTO_INSTANTANEO_VISIVEL`.
- **Embedded mode:** inside `/simulador` ("Ver no ambiente"), with `simPrefills`, `onSkip`, the parent's prefilled lead, and the automatic advance to the quote.
- **Prices:** the visualizer shows none, and none are added.
- **Copy rules:** no em dashes, no competitors, "Painel Flexível em Fibra de Bambu" in full at first mention when the product is named, and honest AI wording.

## 3. Experience

### 3.1 Shell (phone first)

- The `/visualizador` hero shrinks to one short block: the h1 "Veja os acabamentos no seu ambiente" and one line. The tool starts right after it.
- On phones (< 768 px), each step is a screen that fills the viewport below the site header:
  - **Top:** a slim progress bar with four labels: Foto · Marcar · Acabamento · Resultado. "Voltar" sits top left from step 2 on.
  - **Bottom:** one fixed primary action, safe-area aware (`env(safe-area-inset-bottom)`).
  - **Between them:** the content, which scrolls on its own when it is taller than the space.

  > **Emenda 06/11/2026 (M1).** The primary action bar is `position: sticky; bottom: 0` inside the tool, not `position: fixed`. It stays in view the whole time the client is inside the Visualizador, and when the page scrolls on to "Como funciona" it leaves with the tool. Reason: a fixed bar would sit over "Como funciona" and the closing CTA; the code (`VizShell`) does this and the owner's rule ("the action is always in reach") still holds.
- **Step change:** the outgoing screen fades out and moves 16 px. The incoming one fades in from 16 px the other way. Duration is `--mv-base` with `--mv-chegada`. Transform and opacity only. Instant under reduced motion. Focus moves to the new step heading.

  > **Emenda 06/11/2026 (M7).** Only the incoming screen animates (fade plus 16 px, from the right going forward and from the left going back). The outgoing screen is removed at once, with no exit animation. Reason: this is what the code does (the step container is keyed by step); an exit animation would keep two screens mounted and shift the layout.
- The "Como funciona" block and the closing CTA section move below the tool. They are never between the steps.
- **Desktop (≥ 1024 px):** the same steps, two columns. The photo sits on the left and is sticky. Steps, cards and the primary action sit on the right. Marking happens in place on the photo, because a mouse has no scroll conflict. The bottom bar is not fixed on desktop.

  > **Emenda 06/11/2026 (M5).** Marking in place needs both a fine pointer and a width of at least 1024 px (`marcaNoLugar()`: `(min-width: 1024px)` and not `(pointer: coarse)`). A touch tablet, even in landscape at 1024 px or more, uses the full-screen editor. Reason: a finger on a tablet has the same scroll conflict as on a phone; the code was changed for this in Task 4 and the spec still said "≥ 1024 px".

### 3.2 Foto

- One large surface: "Envie uma foto do seu ambiente", with the two buttons from 7078a52 on touch devices (Tirar foto, Galeria), and click or drag on desktop. One tip line: "Foto de frente e bem iluminada funciona melhor."
- Choosing a photo goes straight to Marcar. The full-screen editor opens on phones; desktop goes to its Marcar layout.
- Keep: the existing error handling and file reading, and the `simPrefills` banner (restyled as one quiet line).

### 3.3 Marcar (full-screen editor on phones)

- A fixed overlay (`position: fixed; inset: 0`, dark `#0B1F45` background) with the photo fitted (contain) in the middle.
  - Page scroll is locked while it is open: the `overflow: hidden` on `html` is restored on close.

    > **Emenda 06/11/2026 (B3).** The lock is the site's own `travarRolagem()` (`src/components/ds/useDialogo.ts`). It sets `overflow: hidden` on `body`, not on `html`, and it counts locks, so the editor and a sheet can overlap safely. There is no `useTravaRolagem`. The check after every exit is `document.body.style.overflow === ""`. Reason: Ruling 2 in the SDD ledger (04/11) chose to reuse the site's lock; the spec was never updated. The real risk (iOS Safari with a body-only lock) stays for the test on a real phone.
  - `touch-action: none` applies on the photo only.
  - Top bar: ✕ (close and discard new marks only if the client confirms) and "Pronto".
- **Tap** marks a surface, using the existing `onTapPhoto` and detection pipeline, and outlines it in its zone colour. While detection runs there is a soft pulse at the tap point. No spinner overlay over the whole photo.
- **Bottom sheet:**
  - The hint "Toque em cada parede, teto ou móvel que quer revestir".
  - A horizontal row of chips, one per area ("Parede 1", "Teto"...), each with its colour dot and ✕. Tapping a chip selects the area. The secondary action "Refazer" shows on the selected chip.
  - Small text links: "Desenhar uma área" (the existing draw mode) and "Descrever em texto" (the existing text zone).
- "Pronto" is enabled once at least one area is marked. It closes the editor and moves to Acabamento.
- Everywhere outside the editor, the photo is a plain image with no tap handlers, so scrolling over it never marks anything. On phones, reopening the editor goes through an "Editar áreas" button.
- **Automatic description:** the existing analysis (the `confirm` phase's call and its `zones[].instruction` and `keepText`) runs in the background as soon as marking is done.
  - In Acabamento, each area shows one line, "Onde: <instruction>", with an "Editar" link that opens a small sheet holding the existing textarea. "Manter igual" lives in the same sheet.
  - If the analysis fails, the line says "Descreva onde aplicar" and opens the sheet. Generation stays blocked until every area has a text, as today.

    > **Emenda 06/11/2026 (N1).** "As today" was wrong: before this redesign an empty description was optional in the model phase. Now an empty description blocks "Gerar visualização". This is intentional (review focus 4): the render must never go out with an empty description. When the analysis fails and the area has no text, the whole "Descreva onde aplicar" line is a button that opens the Onde sheet (N4). "Próxima área" needs only a chosen finish; the description can be written later, and "Gerar visualização" stays blocked until every area has one (M2).

### 3.4 Acabamento (one area at a time)

- **Top:** the photo, with the current area tinted in its colour (existing overlay), and the area name ("Parede 1 de 2").
- **Line tabs:** Classic · Brilliance · Elegance. Default is the line of the prefilled model, else the first line.
- **Cards:** a horizontal scroll-snap row. Each card is about 70% of the viewport width on phones and about 220 px on desktop, and shows:
  - the panel photo, large (`p.image_path`, `object-cover`, no 1.35 zoom crop);
  - the finish name;
  - the code (ORB-003).
  - Selected state: a 2 px `#0B1F45` frame, a check badge, and the card scaled to 1.02.
  - Tapping a card chooses it for this area (`productId`, `productChosen: true`).

  > **Emenda 06/11/2026 (B4, decisão do dono).** The card shows the product's flat texture (`render_texture_path`) when it exists, and otherwise the catalogue photo (`image_path`) with a 1.8 zoom crop centred on the panel. It does not show the uncropped catalogue photo. Reason: the owner chose the texture on 06/11/2026, so the client sees the finish up close; the 1.8 crop of products without a texture may still show a strip of wall until a texture is registered for them (owner data). (Moved here from under "Hidden from clients" on 06/11/2026, second review round R2-N7, so it sits under the item it changes.)
- **Primary action:** "Próxima área" (the next area becomes current; the photo tint follows), and "Gerar visualização" on the last area. It is disabled until the current area has a chosen finish.

  > **Emenda 06/11/2026 (R2-M1, the line "Falta dizer onde aplicar na/no …").** On the last area, when "Gerar visualização" is disabled only because another area has no description, a short line sits right above the button, inside the action bar: "Falta dizer onde aplicar na Área 1.".
  > - **When it shows:** the current area has a description, every other generation condition holds (`canGenerate`), the analysis is not running, and some other area has no text. `areaSemDescricao(zones, atual, { canGenerate })` in `fluxo.ts` returns the first such area. If the current area itself has no text, the line does not show (its own "Descreva onde aplicar" row applies).
  > - **Wording** (`avisoFaltaDescricao`): "na" before a feminine type or "Área N" ("na Parede 2"), "no" before a masculine type ("no Teto 1"), and "na área “…”" for a name the client typed. One line only: a long name is cut with an ellipsis, never wrapped.
  > - **Tap:** the whole line is a 44 px button. It goes to that area by zone id (the same rule as M3) and opens its Onde sheet once; closing the sheet does not reopen it. Closing it returns focus to the area heading, because the line that opened it is gone (R2-N1).
  > - **Chat bubble:** while the line shows, `html[data-viz-barra-aviso]` lifts the site's chat bubble by the measured bar height (`--viz-barra-h`, set by `VizShell`), so it covers neither the line nor the button (R2-N2).
  > - **Phone fit:** the screen still fits one viewport at 390×844 and 375×667. The 52 px the line adds come out of the photo band and the card photo. While the line shows, their minimums drop to 56 px and 88 px, and the band gives way first (R2-M2).
  >
  > Reason: the second review (06/11/2026) found this line in the code with no text in the spec.
- **"Ajustes" link per area:** a small sheet with surface type (the existing select) and measurements (width and height, optional, the existing fields).
- Hidden from clients: "SAM2", "Textura exata", "IA com referência", "Superfície detectada", "Redefinir cantos". Keep them only behind `?debug=1` if they are useful to the owner. Corner reset stays reachable through "Ajustes" when it applies.

  > **Emenda 06/11/2026 (M4).** The corner reset in "Ajustes" is labelled "Refazer os cantos" and shows for every client (no `?debug=1`) only when it applies: the chosen finish has a `render_texture_path` and the area has a 4-corner quad. It clears the quad (`quad: null`), the same call as the old "Redefinir cantos". The technical label "Redefinir cantos" never renders. Reason: the final review found the reset had ended up behind `?debug=1`, so a client could not reach it.
  >
  > **Emenda 06/11/2026 (R2-M3, corrects M4).** "Refazer os cantos" also needs the 4-corner projection to be on (`DETERMINISTIC_PROJECTION` and `useProjection` both true), or `?debug=1`. Today the projection is off, so the client never sees it. Reason: with the projection off the corners do not reach the render, and the button would let a client erase the quad that the detection fallback seeds, with nothing gained. `generate`, `confirmQuad`, detection and the fallback quad seeding do not change.
  >
  > **Emenda 06/11/2026 (M3).** The current area is kept by zone id, not by index. Coming back from the editor keeps the same zone even when an area before it was removed; if the current zone itself was removed, the next one takes its place (the last one when it was the last). Reason: with an index, removing an earlier area made the screen jump to another zone.

### 3.5 Resultado

- **While generating:** the photo stays. A thin progress line shows "Aplicando <acabamento> em <área> (1 de 2)", using the existing `progress`. Calm: no blocking spinner modal.
- **Lead capture (standalone, before reveal):** a bottom sheet over the blurred result with name and WhatsApp. Same validation and API as today.

  > **Emenda 06/11/2026 (B1a, decisão do dono).** The lead sheet is mandatory and cannot be closed: the client sees the result only after sending name and WhatsApp. "Falar com um consultor" appears only after the reveal. In 7078a52 a client with a finished render could tap the consultant button under the image and go to WhatsApp without filling the form; that path is removed on purpose. Reason: the owner chose on 06/11/2026 to keep the form mandatory so every client who sees a result arrives as a lead.
- **Reveal:** a before/after slider. Drag a vertical handle; it starts at 50%. The handle is a ≥ 44 px target and keyboard operable (arrows). The slider is implemented with `clip-path: inset()` on the "depois" layer, driven by a CSS var.
- **Actions:**
  - primary "Falar com um consultor" (existing WhatsApp flow with the per-zone caption);
  - "Baixar imagem" (existing `onDownload`);
  - "Testar outro acabamento" (back to Acabamento, keeping the areas);
  - "Adicionar outro ambiente" (existing `onAddPhoto`);
  - "Continuar para o orçamento" where it exists today.
- **Embedded mode:** keeps the automatic advance to the quote after the first successful render. No lead sheet.

  > **Emenda 06/11/2026 (B1c, B2, N7, Q2).** "Falar com um consultor" (in Resultado and in the shortcut of the next room) shows only while `ORCAMENTO_INSTANTANEO_VISIVEL` is false; with the flag on, only the quote block shows, as in 7078a52. In embedded mode the shell has no stepper and no full-page "Voltar"; Marcar shows a compact in-flow link "Trocar foto" and Acabamento a compact "Voltar", both calling the wizard's `voltar`, with nothing fixed. The lead sheet button reads "Salvar e aguardar" while the render is still generating and "Ver resultado" once it is ready. The generated image's alt is "Simulação gerada por IA da mesma foto com o acabamento escolhido", and the note "A imagem gerada é uma simulação e pode diferir do resultado real." sits right under the before/after control in the site's secondary text colour. Reason: final review (06/11/2026); the engine outcomes do not change.

## 4. Architecture

`src/components/VisualizadorWizard.tsx` is 2907 lines. The redesign splits the presentation from the engine without changing the engine.

- **`VisualizadorWizard.tsx`** keeps all state, effects, engine calls, lead logic and embedded-mode wiring. It renders a `VizShell` and passes it props and callbacks. The old `UploadStep`, `ZonesStep`, `ZoneCard`, `ResultStep` and `WizStepper` are removed once they are replaced.
- **New folder `src/components/visualizador/`.** One clear job per file, presentational, typed props, no engine imports:
  - `VizShell.tsx`: progress bar, step transitions, fixed bottom action bar, desktop two-column layout.
  - `EtapaFoto.tsx`: the upload surface and the two touch buttons, reusing the 7078a52 logic.
  - `EditorMarcacao.tsx`: the full-screen overlay (scroll lock, chips sheet). It reuses `SurfaceCanvas` for drawing the photo and zones, which moves to `visualizador/SurfaceCanvas.tsx` unchanged except for a `interativo` prop that turns off all pointer handlers.
  - `EtapaAcabamento.tsx`: area header, line tabs, card row, Ajustes and Onde sheets.
  - `CartaoAcabamento.tsx`: one finish card.
  - `EtapaResultado.tsx`: progress state, lead sheet, before/after, actions.
  - `AntesDepois.tsx`: the slider.
  - `Folha.tsx`: a small accessible bottom sheet (dialog role, focus trap, Esc, swipe-down or ✕ to close) used by Onde, Ajustes and the lead form.
- **Styling:** Tailwind plus a small `/* ── Visualizador */` block in `globals.css` for transitions and the slider. Use the site's motion tokens.
- **`/visualizador/page.tsx`:** short hero, then the tool, then "Como funciona" and the closing CTA. The `/simulador` embed uses the same components through `embeddedMode`.

## 5. Accessibility and quality

- Every control is a real button or input, with targets ≥ 44 px on touch.
- The full-screen editor is a dialog with focus trap, Esc to close and an `aria-label`. Chips are buttons with `aria-pressed`.
- Live region announcements for "Área marcada", detection done or failed, and generation progress.

  > **Emenda 06/11/2026 (R2-N3, R2-N4).** The transparent 44 px hit area around the small controls on the photo (area labels, the draw-mode resize handle: `.viz-alvo-toque::before`) applies only under `(pointer: coarse)`. With a mouse it would take a click meant for the photo right next to a label. The whole "Onde" row in Acabamento is one `aria-live="polite"` region, so "Lendo a foto…", the description and "Descreva onde aplicar" are announced when they change, including inside the failure-state button. Reason: second review round (06/11/2026).
- Reduced motion: no step slide, no card scale, an instant slider.
- No layout shift on step change. Transform and opacity only, `will-change` only while a transition runs.
- Brand and copy: humanizer on all new strings; no em dashes, no eyebrow labels, no counters beyond "1 de 2" step context.

## 6. Testing and acceptance

- `npx tsc --noEmit -p .`, `npx eslint` on the new and changed files (no new problems), and `npm run test:movimento` all pass.
- **Unit tests (node runner) for the pure parts:**
  - step/phase mapping;
  - "can advance" rules for Marcar, Acabamento and Gerar;
  - the slider value clamp and keyboard step.
- **Browser checks** with the Webdesign Playwright CLI and the browser pane in mobile emulation:
  - 390×844, 375×667 and 1440×900;
  - a local test photo (no production uploads);
  - detection and render endpoints mocked with route interception (no paid API calls).
- **Checks:**
  - Scrolling with a touch drag that starts on the photo, in Acabamento and Resultado, never creates a zone.
  - The editor locks page scroll and restores it on close.
  - Tap → zone → chip → remove → Pronto.
  - Card selection advances areas; Gerar is enabled only when all areas have a finish and a description.
  - The lead sheet blocks reveal in standalone mode but not in embedded mode.
  - The before/after drag and arrow keys work.
  - Embedded mode in `/simulador` still reaches the quote.
- **Harness:** `scripts/medir-movimento.mjs` on `/visualizador` at upload state, iphone-15-pro and desktop-1440, `--cpu 4`. No regression against the current page.
- **Review:** task reviews per SDD, then a final whole-branch review before publishing. Publishing to `main` needs the owner's explicit OK.

## 6a. Behaviour in the code that this spec did not describe

> **Emenda 06/11/2026 (N3, N11 and the Goldfish list of uncovered code).** These behaviours exist in the branch and are intended. They are recorded here so the spec matches the code. Reason: the final whole-branch review found them in the code with no line in the spec.

- **`AtalhoConsultor`.** With a room already saved, the Foto, Marcar and Acabamento steps of the next room keep a discreet shortcut at the end of the step content, above the action bar: "Falar com um consultor" while the instant quote is hidden, or only "Continuar para o orçamento" when `ORCAMENTO_INSTANTANEO_VISIVEL` is on. Resultado has its own button and does not show it.
- **`rotuloZona`.** An area is called "Área N" until the client chooses its surface type in "Ajustes". After that it is the type plus its order among areas of that type ("Parede 1", "Teto 1"), or the client's own text for "Outro…". A label the client typed wins. Display only: the zone `label` sent to the analysis and the render does not change.
- **`FaixaFoto`.** On phones the Acabamento photo is a band of fixed height, the width of the content, cropped like `object-fit: cover` and centred on the current area with a transform. Only the current area has full colour, the others are almost faded, and there are no text labels (the name is in the heading below). On "Próxima área" the photo slides to the new area (instant under reduced motion). Desktop shows the whole photo in the left column.
- **A sheet that cannot be closed.** The lead sheet that unlocks the result is a `Folha` with `fechavel={false}`: no ✕, no Esc and no swipe-down close it while it blocks the reveal.
- **`AcabamentoSemAreas`.** If every area is removed in the editor, Acabamento shows "Nenhuma área marcada" with a "Marcar as áreas" link, never a blank screen, and the action bar reopens the marking.
- **The "Outros" tab.** Products whose line is outside Classic, Brilliance and Elegance appear under an "Outros" tab, so they never disappear. A line with no products has no tab. The default tab follows the finish already chosen for the area.
- **Editor history.** Opening the full-screen editor pushes one history entry. The browser back button closes the editor and keeps the client on the page; closing by ✕, Esc or "Pronto" removes that entry. While the entry exists, scroll restoration is manual, so leaving it never sends the page back to an old position.
- **Chat bubble above the bar.** While the standalone action bar is shown, `html[data-viz-barra-presa]` lifts the site's chat bubble so it does not cover the primary button. In embedded mode there is no lift.

## 7. Out of scope

- Changes to the AI engine, prompts or detection models.
- The price simulator `/simulador` page, beyond keeping its embed working.
- New copy on the closing CTA section. Note for the owner: it says "instalação sem obra em poucas horas"; the brand rule says Orbital is a supplier, not an installer, so the owner may want to reword it later.
