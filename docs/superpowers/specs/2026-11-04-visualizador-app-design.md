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
- **Step change:** the outgoing screen fades out and moves 16 px. The incoming one fades in from 16 px the other way. Duration is `--mv-base` with `--mv-chegada`. Transform and opacity only. Instant under reduced motion. Focus moves to the new step heading.
- The "Como funciona" block and the closing CTA section move below the tool. They are never between the steps.
- **Desktop (≥ 1024 px):** the same steps, two columns. The photo sits on the left and is sticky. Steps, cards and the primary action sit on the right. Marking happens in place on the photo, because a mouse has no scroll conflict. The bottom bar is not fixed on desktop.

### 3.2 Foto

- One large surface: "Envie uma foto do seu ambiente", with the two buttons from 7078a52 on touch devices (Tirar foto, Galeria), and click or drag on desktop. One tip line: "Foto de frente e bem iluminada funciona melhor."
- Choosing a photo goes straight to Marcar. The full-screen editor opens on phones; desktop goes to its Marcar layout.
- Keep: the existing error handling and file reading, and the `simPrefills` banner (restyled as one quiet line).

### 3.3 Marcar (full-screen editor on phones)

- A fixed overlay (`position: fixed; inset: 0`, dark `#0B1F45` background) with the photo fitted (contain) in the middle.
  - Page scroll is locked while it is open: the `overflow: hidden` on `html` is restored on close.
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

### 3.4 Acabamento (one area at a time)

- **Top:** the photo, with the current area tinted in its colour (existing overlay), and the area name ("Parede 1 de 2").
- **Line tabs:** Classic · Brilliance · Elegance. Default is the line of the prefilled model, else the first line.
- **Cards:** a horizontal scroll-snap row. Each card is about 70% of the viewport width on phones and about 220 px on desktop, and shows:
  - the panel photo, large (`p.image_path`, `object-cover`, no 1.35 zoom crop);
  - the finish name;
  - the code (ORB-003).
  - Selected state: a 2 px `#0B1F45` frame, a check badge, and the card scaled to 1.02.
  - Tapping a card chooses it for this area (`productId`, `productChosen: true`).
- **Primary action:** "Próxima área" (the next area becomes current; the photo tint follows), and "Gerar visualização" on the last area. It is disabled until the current area has a chosen finish.
- **"Ajustes" link per area:** a small sheet with surface type (the existing select) and measurements (width and height, optional, the existing fields).
- Hidden from clients: "SAM2", "Textura exata", "IA com referência", "Superfície detectada", "Redefinir cantos". Keep them only behind `?debug=1` if they are useful to the owner. Corner reset stays reachable through "Ajustes" when it applies.

### 3.5 Resultado

- **While generating:** the photo stays. A thin progress line shows "Aplicando <acabamento> em <área> (1 de 2)", using the existing `progress`. Calm: no blocking spinner modal.
- **Lead capture (standalone, before reveal):** a bottom sheet over the blurred result with name and WhatsApp. Same validation and API as today.
- **Reveal:** a before/after slider. Drag a vertical handle; it starts at 50%. The handle is a ≥ 44 px target and keyboard operable (arrows). The slider is implemented with `clip-path: inset()` on the "depois" layer, driven by a CSS var.
- **Actions:**
  - primary "Falar com um consultor" (existing WhatsApp flow with the per-zone caption);
  - "Baixar imagem" (existing `onDownload`);
  - "Testar outro acabamento" (back to Acabamento, keeping the areas);
  - "Adicionar outro ambiente" (existing `onAddPhoto`);
  - "Continuar para o orçamento" where it exists today.
- **Embedded mode:** keeps the automatic advance to the quote after the first successful render. No lead sheet.

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

## 7. Out of scope

- Changes to the AI engine, prompts or detection models.
- The price simulator `/simulador` page, beyond keeping its embed working.
- New copy on the closing CTA section. Note for the owner: it says "instalação sem obra em poucas horas"; the brand rule says Orbital is a supplier, not an installer, so the owner may want to reword it later.
