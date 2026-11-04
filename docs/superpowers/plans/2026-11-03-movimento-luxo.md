# Movimento Orbital Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every public page of orbitalrevestimentos.com.br a luxe, smooth motion system that feels identical at 60, 90, 120 and 144 Hz, with an orbit intro, page transitions, a clean homepage hero, an automatic route journey and four immersive touches.

**Architecture:** Hybrid. Reveals and parallax stay on browser-native scroll-driven CSS (`animation-timeline`). One shared, time-based animation clock (`src/lib/movimento/relogio.ts`) drives everything that needs smoothing or pointer input. Page changes use React `<ViewTransition>` through Next 16's `experimental.viewTransition`.

**Tech Stack:** Next.js 16.2.4 (App Router, Turbopack), React 19.2, Tailwind v4, TypeScript 5, Node 24 built-in test runner (`node --test`, native TypeScript type stripping), Playwright via the Webdesign toolkit.

**Spec:** `docs/superpowers/specs/2026-11-03-movimento-luxo-design.md`

## Global Constraints

- No new npm dependencies. Unit tests run with `node --test`; test files are `*.test.mjs` importing the `.ts` module under test, so `tsc` never sees a `.ts` import extension.
- Next.js 16 is not the version in your training data: read the matching guide in `node_modules/next/dist/docs/` before touching config, layouts or `ViewTransition`.
- Code names, comments and UI copy in Brazilian Portuguese, matching the surrounding code. Visible copy: no em or en dashes, no eyebrow labels above headings, no `01 / 06` counters. New public text passes `humanizer`, then `revisor-tecnico` layer 1, before publishing.
- Brand rules (`AGENTS.md`, skill `orbital-marca`): "Painel Flexível em Fibra de Bambu" in full at first mention, no competitors, no prices, Orbital does not install.
- Animate only `transform`, `opacity`, `clip-path` (wipes) and CSS custom properties. Never width, height, top, left. No `backdrop-filter` on anything that moves during scroll. No `transition: all`.
- Motion tokens (spec 2.1), verbatim: `--mv-rapido: 180ms; --mv-base: 520ms; --mv-lento: 900ms; --mv-cinema: 1400ms; --mv-chegada: cubic-bezier(0.16, 1, 0.3, 1); --mv-percurso: cubic-bezier(0.65, 0, 0.35, 1); --mv-sobe: 24px` (16px under 640px).
- Clock: `tau` default 110 ms, `dt` clamped to 50 ms, pause on `document.hidden`, `tau = 0` under `prefers-reduced-motion: reduce`.
- Tiers: `leve` when `prefers-reduced-data`, `saveData`, `deviceMemory <= 4` or `hardwareConcurrency <= 4`; otherwise `completo`. The effect table in spec 2.4 is binding.
- Every effect has a reduced-motion state that is still and complete (nothing hidden, nothing half-revealed).
- Public site only. `/admin`, `/parceiro`, `/representante`, `/o` and API routes are untouched.
- Nothing goes to `main` without the owner's approval after the preview-link check (Task 14).

## Review Focus

1. **Tab switched away mid-animation, then back.** Expect values to resume from where they were, with no jump and no burst of catch-up frames. (Clock test: a 2000 ms gap yields one 50 ms step.)
2. **Storage blocked (Safari private mode, cookies off).** Expect no intro and no error. The site still renders normally. (Intro harness check with storage disabled.)
3. **Keyboard-only visitor in the journey.** Expect autoplay to pause while focus is inside, arrow keys and segment buttons to work, and the current step to be announced. (Reducer test for the `foco` pause reason, plus a harness keyboard run.)
4. **Touch device with a mouse attached (iPad with trackpad, touchscreen laptop).** Expect the custom cursor only when `(hover: hover) and (pointer: fine)` matches. Touch alone never hides the native cursor. (Cursor task test on the media query gate.)
5. **Very fast flick to the bottom of a long page.** Expect pinned sections to land in their final state (CTA visible, last step shown), not stuck mid-way. (Smoothing test: snapping at epsilon; harness check of the TechStone CTA after `scrollTo(bottom)`.)

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/movimento/suavizar.ts` | Pure math: time-based smoothing factor, approach with snap. |
| `src/lib/movimento/relogio.ts` | `criarRelogio(deps)` factory (testable) plus the browser singleton `relogio`. |
| `src/lib/movimento/nivel.ts` | Pure `decidirNivel(sinais)` plus browser `lerSinais()`. |
| `src/components/movimento/Movimento.tsx` | Client component mounted once in the root layout: applies the tier to `<html>`, mounts the cursor. |
| `src/components/movimento/IntroOrbita.tsx` | Orbit intro overlay, inline gate script, skip handling. |
| `src/components/movimento/Profundidade.tsx` | Layered hero planes driven by scroll and pointer. |
| `src/components/movimento/Lupa.tsx` + `src/lib/movimento/lente.ts` | Texture loupe and its pure positioning math. |
| `src/components/movimento/Cursor.tsx` + `src/lib/movimento/inclinacao.ts` | Custom cursor, leaning buttons and the pure lean math. |
| `src/components/home/Jornada.tsx` + `src/components/home/jornadaEstado.ts` | Route journey UI and its pure state reducer. |
| `src/components/ds/useProgresso.ts` | Existing hook, moved onto the clock (public behaviour unchanged). |
| `src/components/projetos/Revelar.tsx` | Existing reveal; gains an `efeito` prop. |
| `src/app/globals.css` | Tokens, retimed `mv-*` keyframes, new effect classes, view-transition rules. |
| `scripts/medir-movimento.mjs` | Playwright harness: frame timings, CLS, screenshots, device matrix. |

---

### Task 0: Isolated worktree outside iCloud

The Desktop checkout is synced by iCloud, which evicts files and stalls git and Turbopack. All work happens in a worktree in the home folder.

**Files:**
- Modify: `/Users/armaandaswani/Orbital/.claude/launch.json` (add config `orbital-movimento`, port 3002)

- [ ] **Step 1:** `git -C /Users/armaandaswani/Desktop/Orbital/orbital-site worktree add /Users/armaandaswani/orbital-movimento movimento-luxo`
  - Expected: worktree created on branch `movimento-luxo`, HEAD `f91b518` (spec commit).
- [ ] **Step 2:** Copy `.env.local` from the Desktop checkout into the worktree with `cp`. Do not read or print it.
- [ ] **Step 3:** In the worktree, run `npm ci --no-audit --no-fund`.
  - Expected: exit 0, no new packages beyond `package-lock.json`.
- [ ] **Step 4:** Add the launch config with runtimeArgs `["--prefix", "/Users/armaandaswani/orbital-movimento", "run", "dev", "--", "-p", "3002"]`, then start it with `preview_start`.
  - Expected: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/` prints `200`.
- [ ] **Step 5:** Add `"test:movimento": "node --test src/lib/movimento/ src/components/home/"` to `package.json` scripts, then commit: `git commit -am "Worktree e script de testes do movimento"`.

---

### Task 1: Motion foundations (tokens, smoothing, clock, tiers)

**Files:**
- Create: `src/lib/movimento/suavizar.ts`, `src/lib/movimento/suavizar.test.mjs`
- Create: `src/lib/movimento/relogio.ts`, `src/lib/movimento/relogio.test.mjs`
- Create: `src/lib/movimento/nivel.ts`, `src/lib/movimento/nivel.test.mjs`
- Create: `src/components/movimento/Movimento.tsx`
- Modify: `src/components/ds/useProgresso.ts` (whole file), `src/app/layout.tsx` (mount `<Movimento />` inside the first `<SiteChrome>`), `src/app/globals.css` (tokens in `@theme`/`:root`, map `--ease-orbital` to `--mv-chegada`, retime the `mv-*` keyframes and transitions to the tokens)

**Interfaces:**
- Produces:
  - `TAU_PADRAO_MS = 110`, `DT_MAX_MS = 50`
  - `fatorSuavizacao(dtMs: number, tauMs: number): number`
  - `aproximar(atual: number, alvo: number, dtMs: number, tauMs: number, epsilon?: number): number`: epsilon defaults to 0.0004 and returns `alvo` exactly once within epsilon.
  - `interface Assinante { tick(dtMs: number): boolean }`: returns `true` while still moving.
  - `criarRelogio(deps: { agendar(cb: (t: number) => void): number; cancelar(id: number): void; agora(): number; oculto(): boolean }): { assinar(a: Assinante): () => void; acordar(): void }`
  - `relogio`: browser singleton built on `requestAnimationFrame`, `performance.now` and `document.hidden`. It calls `acordar()` on `visibilitychange`, resetting the time base so the first frame back gets `dt = 0`.
  - `type NivelMovimento = "completo" | "leve"`
  - `interface SinaisDispositivo { poucosDados?: boolean; economiaDados?: boolean; memoriaGB?: number; nucleos?: number }`
  - `decidirNivel(s: SinaisDispositivo): NivelMovimento`
  - `lerSinais(): SinaisDispositivo`
  - `<html data-mv-nivel="completo|leve">`
  - `tauAtual(): number`, exported from `relogio.ts`: returns 0 under reduced motion, else `TAU_PADRAO_MS`.
  - `data-ativo` on any `useProgresso` section while it intersects the viewport: the only state in which its children carry `will-change`.

- [ ] **Step 1: Write failing tests.**
  - `suavizar.test.mjs`:
    - `fatorSuavizacao(16.667, 110)` is within 0.001 of `0.1406`.
    - `fatorSuavizacao(x, 0) === 1`.
    - `fatorSuavizacao(1000, 110) === fatorSuavizacao(50, 110)`.
    - Refresh parity: six `aproximar` steps from 0 toward 1 at 16.667 ms land within 0.002 of twelve steps at 8.333 ms.
    - `aproximar(0.99975, 1, 16, 110) === 1`.
  - `relogio.test.mjs`, with fake deps (a manual frame queue, a settable clock and a settable hidden flag):
    - nothing is scheduled with no subscribers;
    - scheduling stops once every `tick` returns false;
    - a clock jump of 2000 ms delivers `dt === 50`;
    - `acordar()` after sleep schedules one frame;
    - while `oculto()` is true, `tick` is never called;
    - the unsubscribe function removes the subscriber.
  - `nivel.test.mjs`:
    - `{}` returns `"completo"`;
    - `{economiaDados: true}`, `{poucosDados: true}`, `{memoriaGB: 4}` and `{nucleos: 4}` each return `"leve"`;
    - `{memoriaGB: 8, nucleos: 8}` returns `"completo"`.
- [ ] **Step 2:** Run `npm run test:movimento`.
  - Expected: FAIL (modules not found).
- [ ] **Step 3:** Implement `suavizar.ts`, `relogio.ts` and `nivel.ts` with the signatures above. In `relogio.ts`, `dt = min(agora - anterior, DT_MAX_MS)`, and the browser singleton is created lazily on first `assinar`, so the module is safe to import on the server.
- [ ] **Step 4:** Run `npm run test:movimento`.
  - Expected: all pass.
- [ ] **Step 5:** Rewrite `useProgresso` to subscribe to `relogio`.
  - Inside `tick(dt)`: measure the section, `atual = aproximar(atual, alvo, dt, tauAtual())`, write `--p` (4 decimals) and `data-p10` exactly as today, and return `atual !== alvo`.
  - Scroll, resize and IntersectionObserver entry call `relogio.acordar()`.
  - The IntersectionObserver also toggles `data-ativo`.
  - Unsubscribe on unmount.
- [ ] **Step 6:** Implement `Movimento.tsx`. On mount it sets `document.documentElement.dataset.mvNivel = decidirNivel(lerSinais())`. Mount it in `layout.tsx`.
- [ ] **Step 7:** Add the tokens and retimed keyframes to `globals.css`.
  - Under `[data-mv-nivel="leve"]`, halve the parallax distances (`mv-parallax`, `mv-parallax-topo`) and set `--mv-sobe` to half.
  - Move every static `will-change` in the TechStone and home blocks under `[data-ativo]` selectors.
  - Add `.mv-adiado { content-visibility: auto; contain-intrinsic-size: auto 900px; }` and apply it to the homepage FAQ and contact sections and the TechStone FAQ.
- [ ] **Step 8:** Verify with `npx tsc --noEmit`, `npx eslint src/lib/movimento src/components/movimento src/components/ds/useProgresso.ts`, and both pages returning 200 on port 3002.
  - Then run `scripts/medir-movimento.mjs` from Task 2 once it exists. Until then, check by eye that the TechStone opening still reaches its CTA.
- [ ] **Step 9:** Commit: `Movimento: tokens, relógio por tempo e níveis de dispositivo`.

---

### Task 2: Measurement harness and device matrix

**Files:**
- Create: `scripts/medir-movimento.mjs`

**Interfaces:**
- Produces: CLI `node scripts/medir-movimento.mjs --url <url> [--dispositivo <nome>|--matriz] [--cpu 4] [--reduzido] [--saida <dir>]`.
  - It loads `playwright-core` with `createRequire` from `process.env.PW_CORE || "/Users/armaandaswani/Desktop/Webdesign/tools/playwright-runtime/node_modules/playwright-core"`.
  - Devices, by name: `iphone-se 375x667@2`, `iphone-15-pro 393x852@3`, `pixel-8 412x915@2.625`, `ipad-mini 768x1024@2`, `ipad-pro 1366x1024@2`, `desktop-1280 1280x800@1`, `desktop-1440 1440x900@1`, `desktop-1920 1920x1080@1`. Touch is on for the first five.
  - Per run it scrolls the page top to bottom with `mouse.wheel` in 120 px steps every 16 ms, records `requestAnimationFrame` deltas and `layout-shift` entries, and screenshots at 0, 20, 40, 60, 80 and 100% of scroll.
  - The six-position screenshots follow scroll-craft's verification method (`~/Desktop/Webdesign/skills/scroll-craft/references/verify.md`), and are stitched into one contact sheet per device.
  - It writes `resultado.json` as `{ dispositivo, quadros, p95Ms, maxMs, acima33, cls, scrollWidth, larguraJanela }` and prints one summary line per device.
  - CPU throttling uses CDP `Emulation.setCPUThrottlingRate`. `--reduzido` sets `reducedMotion: "reduce"`. `--webkit` and `--firefox` switch the engine when the runtime has it, and otherwise print "motor indisponível" and skip.

- [ ] **Step 1:** Implement the script.
- [ ] **Step 2:** Run the baseline: `node scripts/medir-movimento.mjs --url http://localhost:3002/techstone --matriz --cpu 4 --saida /private/tmp/claude-501/-Users-armaandaswani-Orbital/270e07df-6a0d-4ecc-bb9d-d98361b91754/scratchpad/medicao/base`.
  - Expected: eight summary lines, `scrollWidth === larguraJanela` on every device.
  - Save the numbers as the baseline in the task report.
- [ ] **Step 3:** Commit: `Script de medição de movimento por dispositivo`.

---

### Task 3: Orbit intro

**Files:**
- Create: `src/components/movimento/IntroOrbita.tsx`
- Modify: `src/app/layout.tsx` (render `<IntroOrbita />` as the first child of `<body>`, outside `SiteChrome` but skipped under `/admin` by the gate script's pathname check), `src/app/globals.css` (intro block)

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces:
  - `sessionStorage` key `orbital-intro` (value `"1"`);
  - `<html data-intro="1">` while the intro plays;
  - a `orbital:intro-fim` event dispatched on `window` when the curtain finishes. Task 5's hero settle listens for it.

- [ ] **Step 1:** Write `IntroOrbita` as a server component that outputs three things.
  - (a) An inline `<script>`, before paint, that sets `data-intro="1"` only if: the path does not start with `/admin`, reduced motion does not match, storage works, and `orbital-intro` is unset. It then sets the key. Any thrown error leaves the attribute unset.
  - (b) An overlay `div[aria-hidden]` with the official symbol paths copied from `public/images/brand/orbital-simbolo.svg`. Each band (blue `#2347A0`-family paths, green `#36A35C` paths) sits under an SVG mask whose stroke circle animates `stroke-dashoffset` to reveal it along its arc. The wordmark comes from `orbital-assinatura-negativo.svg`.
  - (c) A tiny client child that skips to the curtain on `pointerdown` or `keydown`, then removes `data-intro` and dispatches `orbital:intro-fim` on `animationend` of the curtain.
- [ ] **Step 2:** Add the CSS.
  - The overlay shows only under `html[data-intro="1"]`.
  - Timings: blue band 0 to 0.45 s, green 0.45 to 0.9 s, wordmark 0.9 to 1.2 s, curtain `clip-path: inset(0 0 0 0)` to `inset(0 0 100% 0)` 1.2 to 1.6 s with `--mv-percurso`.
  - A CSS-only safety animation hides the overlay and sets `pointer-events: none` at 2.2 s.
  - `body` scroll is not locked.
- [ ] **Step 3:** Verify with the harness and a Playwright eval.
  - First load of `/` in a fresh context: overlay visible at 300 ms, gone by 2300 ms.
  - Reload in the same context: no overlay.
  - New context with storage disabled (`context.addInitScript` making `sessionStorage` throw): no overlay, page renders.
  - `--reduzido`: no overlay.
  - Pressing a key at 300 ms: overlay gone by 800 ms.
  - With JavaScript disabled: overlay never shows, because the attribute is never set.
- [ ] **Step 4:** Commit: `Intro da órbita na primeira visita`.

---

### Task 4: Page transitions and morphs

**Files:**
- Modify: `next.config.ts` (`experimental: { viewTransition: true }`), `src/app/layout.tsx` (wrap `{children}` in `<ViewTransition enter="mv-entra" exit="mv-sai" default="none">`), `src/components/Navbar.tsx` (header `style={{ viewTransitionName: "cabecalho" }}`), `src/components/linhas/SeletorLinhas.tsx` (TechStone panel image in `<ViewTransition name="linha-techstone">`), `src/components/techstone/Apresentacao.tsx` (the `Abertura` photo in `<ViewTransition name="linha-techstone">`), `src/components/projetos/ProjetoCard.tsx` and the main photo of the open project rendered through `VisorProjetos` (`<ViewTransition name={\`projeto-${slug}\`}>`), `src/app/globals.css`

Read first: `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` and `.../05-config/01-next-config-js/viewTransition.md`.

- [ ] **Step 1:** Add the config flag and the layout wrapper.
- [ ] **Step 2:** Add the CSS.
  - `::view-transition-old(.mv-sai)`: fade and translateY(-8px), 260 ms.
  - `::view-transition-new(.mv-entra)`: from translateY(16px) and opacity 0, 520 ms, `--mv-chegada`.
  - `::view-transition-group(cabecalho)`: `animation: none`.
  - Back navigation uses the transition type the guide documents (`addTransitionType("voltar")` on back) to swap the direction.
  - Reduced motion: both become a 200 ms opacity crossfade.
- [ ] **Step 3:** Add the morph names.
  - The PFB catalogue has no hero image matching its selector photo, so only TechStone gets the line morph; PFB navigations dissolve.
  - The project morph depends on `VisorProjetos` opening the project inside the navigation transition. If it opens after (from an effect), wrap its open in `startTransition`. If the morph still does not fire, remove the project names and note it in the report.
- [ ] **Step 4:** Verify in Chromium with the harness:
  - navigating `/produtos` → `/techstone` via the TechStone panel shows `::view-transition` pseudo-elements in `document.getAnimations()` during the change;
  - the header element keeps its bounding box through it;
  - `/` → `/projetos` dissolves;
  - with `--reduzido` the only animation is opacity.
- [ ] **Step 5:** Commit: `Transições de página e morph da TechStone`.

---

### Task 5: Clean homepage hero and the conviction line

**Files:**
- Modify: `src/app/page.tsx` (hero section), `src/components/home/PorQue.tsx` (heading)

**Interfaces:**
- Consumes: `orbital:intro-fim` (Task 3).

- [ ] **Step 1:** Rebuild the hero.
  - `h1` text exactly "Novas possibilidades para seus projetos." (keep the existing sr-only prefix).
  - One line under it: "Orbital Revestimentos · Manaus".
  - One button, "Conhecer as soluções", linking to `#solucoes`. Remove the hero's `ContatoCta`; the navbar keeps "Falar com um consultor".
  - Remove the paragraph "A Orbital é uma marca amazônica…".
  - The photo settles from `scale(1.04)` to `1` over `--mv-cinema`, starting on load, or on `orbital:intro-fim` when `data-intro` is set.
- [ ] **Step 2:** In `PorQue`, the `h2` becomes "A Amazônia merece revestimentos feitos para ela." and the current heading "Por que fazemos isso." is removed. Keep the paragraph and tabs.
- [ ] **Step 3:** Run `humanizer` on the two changed lines.
  - Verify: `tsc`, `eslint`, harness on `/` at `iphone-15-pro` and `desktop-1440`.
  - The hero's first screenshot shows only headline, line and button; there is no horizontal overflow.
- [ ] **Step 4:** Commit: `Home: hero limpo com o slogan e a convicção no porquê`.

---

### Task 6: Depth in the hero

**Files:**
- Create: `src/components/movimento/Profundidade.tsx`
- Create assets: `public/images/movimento/home-fundo-v1.webp`, `home-frente-v1.webp`, `techstone-fundo-v1.webp`, `techstone-frente-v1.webp`
- Modify: `src/app/page.tsx` (hero image), `src/components/techstone/Apresentacao.tsx` (`Abertura` photo)

**Interfaces:**
- Consumes: `relogio`, `aproximar`, `tauAtual` (Task 1); `data-mv-nivel`.
- Produces: `<Profundidade camadas={[{ src, alt, fator }, ...]} prioridade?: boolean />`.
  - `fator` is the scroll multiplier: background 0.85, subject 1, foreground 1.12.
  - Desktop pointer shift: up to 12 px for the foreground, 6 px for the background, inverse directions, smoothed by the clock.
  - Pointer is off unless `(hover: hover) and (pointer: fine)` and tier `completo`. Under `leve`, scroll factors move halfway to 1.
  - Reduced motion: planes stacked, no movement.

- [ ] **Step 1: Make the plates.**
  - Upload the two source images to Canva and run background removal to cut out the sofa (`/images/catalogue/hero-cover.png`) and the bench (`curva-v3-desktop.webp`).
  - Download the results, convert to WebP (`cwebp -q 80`), and look at each plate at 100%.
  - Reject plates with halos or chewed edges. If both attempts for a hero fail, that hero stays single-plane and the report says so.
- [ ] **Step 2:** Implement `Profundidade` and wire both heroes, keeping the existing alt text on the background plate. The foreground plate is `alt=""`.
- [ ] **Step 3:** Verify with the harness at `iphone-15-pro`, `ipad-pro` and `desktop-1440`.
  - `p95Ms` is not worse than the Task 2 baseline by more than 2 ms.
  - Screenshots at 0 and 20% scroll show visible plane separation with no gaps at the edges.
- [ ] **Step 4:** Commit: `Profundidade nos heróis da home e da TechStone`.

---

### Task 7: The route journey

**Files:**
- Create: `src/components/home/jornadaEstado.ts`, `src/components/home/jornadaEstado.test.mjs`, `src/components/home/Jornada.tsx`
- Delete: `src/components/home/OQueFazemos.tsx` (its `ETAPAS` data moves into `Jornada.tsx` unchanged)
- Modify: `src/app/page.tsx` (replace `<OQueFazemos />` with `<Jornada />`), `src/app/globals.css`

**Interfaces:**
- Produces:
  - `DURACAO_PASSO_MS = 4000`, `TOTAL_PASSOS = 6`
  - `type MotivoPausa = "usuario" | "foco" | "ponteiro" | "foraDaTela"`
  - `interface EstadoJornada { passo: number; decorrido: number; pausas: Record<MotivoPausa, boolean> }`
  - `type AcaoJornada = { tipo: "tick"; dtMs: number } | { tipo: "ir"; passo: number } | { tipo: "proximo" } | { tipo: "anterior" } | { tipo: "pausa"; motivo: MotivoPausa; ativa: boolean }`
  - `estadoInicial(): EstadoJornada`: starts with `foraDaTela: true`.
  - `reduzirJornada(e: EstadoJornada, a: AcaoJornada): EstadoJornada`
  - `pausada(e: EstadoJornada): boolean`
  - `progresso(e: EstadoJornada): number` (0 to 1)

- [ ] **Step 1:** Write failing tests in `jornadaEstado.test.mjs`:
  - a tick of 1000 ms gives `decorrido` 1000;
  - ticking past 4000 advances `passo` by one and keeps the remainder;
  - a tick on step 5 crossing 4000 wraps to step 0;
  - any active pause makes `tick` a no-op;
  - `foco` and `usuario` pauses are independent: clearing one keeps the other paused;
  - `ir` sets `passo` and resets `decorrido`;
  - `anterior` from 0 goes to 5;
  - `progresso` at 2000 ms is 0.5;
  - `ir` clamps out-of-range values to 0 to 5.
- [ ] **Step 2:** Run `npm run test:movimento`.
  - Expected: FAIL.
- [ ] **Step 3:** Implement the reducer.
- [ ] **Step 4:** Run the tests.
  - Expected: PASS.
- [ ] **Step 5:** Implement `Jornada.tsx`.
  - A one-screen section (`min-h-[100svh]`, not pinned) on navy, with heading "Da fábrica até a sua obra." and the existing lead line.
  - **Map:** an inline SVG schematic with two coast outlines (simplified paths, labelled only "China" and "Manaus") and a route path through six stop points. The drawn length follows the step: `stroke-dashoffset` driven by `(passo + progresso) / 6` through a CSS variable. A dot rides the path with `offset-path` and `offset-distance`.
  - **Text:** one step title and text visible at a time, crossfading over `--mv-base`. The six steps also exist as an `<ol>` (visually hidden except under reduced motion).
  - **Controls:**
    - six segment buttons (`aria-label="Passo n de 6: <título>"`, `aria-current` on the active one) with fill = `progresso`;
    - a pause/continue button ("Pausar" / "Continuar");
    - swipe (pointer events, 40 px threshold) and ArrowLeft/ArrowRight.
  - **Pauses:** `pointerenter`/`pointerleave` set `ponteiro`; `focusin`/`focusout` set `foco`; an IntersectionObserver at 0.6 sets `foraDaTela`.
  - **Live region:** `aria-live="polite"` announces the step title.
  - **Ticking:** a `relogio` subscriber dispatches `tick`, sleeping while paused.
  - **Reduced motion:** no autoplay, the full route drawn, and the `<ol>` shown beside it.
- [ ] **Step 6:** Verify with the harness at `iphone-se`, `ipad-mini` and `desktop-1440`.
  - After 4.5 s in view, step 2 is active.
  - Tabbing into it stops progress (two reads 1 s apart are equal).
  - ArrowRight advances.
  - Scrolling past is unobstructed: total page height changes by less than 1 viewport compared with before.
  - No horizontal overflow.
- [ ] **Step 7:** Commit: `Home: jornada automática da fábrica até a obra em rota animada`.

---

### Task 8: Light across material

**Files:**
- Modify: `src/app/globals.css` (`.mv-brilho`), `src/components/techstone/Tamanhos.tsx` (texture tiles), `src/components/linhas/SeletorLinhas.tsx` (panel image wrapper), `src/app/produtos/pfb/page.tsx` (model card image wrappers in the grid)

**Interfaces:**
- Produces: class `.mv-brilho` on a positioned wrapper. It renders `::after` with `linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.16) 50%, transparent 65%)`, `mix-blend-mode: soft-light`, `transform: translateX(var(--mv-luz, -60%))`.
  - `--mv-luz` comes from a `view()` timeline (from -60% to 60%).
  - On `pointer: fine` and tier `completo`, a single delegated `pointermove` listener in `Movimento.tsx` nudges `--mv-luz` toward the pointer through the clock.
  - Hidden under `leve` and reduced motion.

- [ ] **Step 1:** Implement the class and the delegated pointer nudge.
- [ ] **Step 2:** Apply it to the three surfaces. No photos of people.
- [ ] **Step 3:** Verify with screenshots at three scroll positions on `/techstone#tamanhos` and `/produtos/pfb`: the sheen moves and the texture stays legible.
  - The harness `p95Ms` on `/produtos/pfb` at `pixel-8 --cpu 4` stays within 2 ms of baseline.
- [ ] **Step 4:** Commit: `Luz sobre o material nas texturas`.

---

### Task 9: Texture loupe

**Files:**
- Create: `src/lib/movimento/lente.ts`, `src/lib/movimento/lente.test.mjs`, `src/components/movimento/Lupa.tsx`
- Modify: `src/components/techstone/Tamanhos.tsx` (texture tiles; source = `texturaDownload(m)`), the PFB model image in the model sheet of `src/app/produtos/pfb/page.tsx` (source = the model's largest image URL already in the data)

**Interfaces:**
- Produces:
  - `posicaoLente(p: { x: number; y: number }, caixa: { left: number; top: number; width: number; height: number }, opcoes?: { tamanho?: number; zoom?: number; toque?: boolean }): { left: number; top: number; fundoX: number; fundoY: number }`
    - Defaults: `tamanho` 160, `zoom` 2.5.
    - On touch the lens centre sits 90 px above the point.
    - `fundoX/Y` are background-position values in px so the point under the finger or cursor appears at the lens centre.
    - The point is clamped to the box.
  - `<Lupa fonte={string}>{children}</Lupa>`: wraps an image; `aria-hidden` lens.

- [ ] **Step 1:** Write failing tests.
  - The box centre with no touch gives a lens centred on the point.
  - Touch moves `top` up by 90.
  - A point outside the box clamps to its edge.
  - `fundoX` at the box's left edge equals `tamanho / 2`.
  - Zoom 2.5 scales the offsets by 2.5.
- [ ] **Step 2:** Run the tests.
  - Expected: FAIL.
- [ ] **Step 3:** Implement `lente.ts`.
- [ ] **Step 4:** Run the tests.
  - Expected: PASS.
- [ ] **Step 5:** Implement `Lupa`.
  - Desktop: hover shows the lens.
  - Touch: press and hold 250 ms; `touch-action: none` only while the lens is open, so normal scrolling is untouched.
  - The high-res file preloads on first interaction only.
  - Position updates go through the clock.
- [ ] **Step 6:** Verify with Playwright.
  - Hovering a tile on `desktop-1440` shows the lens with the background image set.
  - On `iphone-15-pro` (touch), a 300 ms press shows it and a quick swipe scrolls the page without showing it.
- [ ] **Step 7:** Commit: `Lupa de textura nos modelos`.

---

### Task 10: Refined cursor and leaning buttons

**Files:**
- Create: `src/lib/movimento/inclinacao.ts`, `src/lib/movimento/inclinacao.test.mjs`, `src/components/movimento/Cursor.tsx`
- Modify: `src/components/movimento/Movimento.tsx` (mount `<Cursor />`), image and card links that should show "Ver" (`ProjetoCard`, `SeletorLinhas` image, `Ideias` cards, `Tamanhos` tiles) get `data-cursor="ver"`; `src/app/globals.css`

**Interfaces:**
- Produces:
  - `inclinacao(ponteiro: { x: number; y: number }, centro: { x: number; y: number }, raio?: number, maximo?: number): { x: number; y: number }`
    - Defaults `raio` 80, `maximo` 6.
    - Zero at distance ≥ `raio`; otherwise `(ponteiro - centro) * maximo / raio`, length capped at `maximo`.
  - `html.mv-cursor`: present only while the custom cursor is active.

- [ ] **Step 1:** Write failing tests:
  - 100 px away gives `{0,0}`;
  - 40 px right gives `{3,0}`;
  - 79 px down gives a `y` within 0.1 of 5.925;
  - a diagonal at 60 px keeps its direction with length 4.5;
  - the centre gives `{0,0}`.
- [ ] **Step 2:** Run the tests.
  - Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests.
  - Expected: PASS.
- [ ] **Step 5:** Implement `Cursor`.
  - It activates only if `matchMedia("(hover: hover) and (pointer: fine)")` matches, tier is `completo` and reduced motion does not match. Activation adds `html.mv-cursor`; the CSS hides the native cursor under it except on `input, textarea, select, [contenteditable]`.
  - Dot: 8 px navy.
  - Over `[data-cursor="ver"]` it becomes a 64 px ring with the text "Ver". Press scales to 0.85.
  - It follows through the clock with `tau` 60 ms.
  - `.ds-botao` elements get `translate` from `inclinacao`, eased back with `--mv-chegada` on leave.
  - If anything throws, remove `html.mv-cursor`.
- [ ] **Step 6:** Verify with Playwright.
  - `desktop-1440`: `html.mv-cursor` present, the ring label appears over a project card.
  - `ipad-pro` with touch: no `html.mv-cursor`.
  - `--reduzido`: no `html.mv-cursor`.
- [ ] **Step 7:** Commit: `Cursor refinado e botões que se inclinam`.

---

### Task 11: Reveal vocabulary and product pages

**Files:**
- Modify: `src/components/projetos/Revelar.tsx` (prop `efeito?: "sobe" | "desvela" | "surge"`, default `"sobe"`), `src/app/globals.css` (new keyframes `mv-desvela-recorte`: `clip-path: inset(12% 0 0 0)` plus `scale(1.06)` to none; `mv-surge` opacity only; each with `view()` timeline and the existing IntersectionObserver fallback classes), `src/app/produtos/pfb/page.tsx`, `src/app/projetos/ProjetosVitrine.tsx`

| Page | Treatment |
|---|---|
| `/produtos/pfb` | Model grid cards: `efeito="sobe"` with `ordem` by column; line header photos `desvela`; light (Task 8) and loupe (Task 9) already applied. |
| `/projetos` | Heading `sobe`; first row of project photos `desvela`; the rest `surge`; showroom list `sobe` with `ordem`. |

- [ ] **Step 1:** Add the `efeito` prop and CSS.
- [ ] **Step 2:** Apply the table.
- [ ] **Step 3:** Verify with the harness `--matriz` on both pages.
  - No `acima33` regressions versus baseline, CLS < 0.05.
  - `--reduzido` screenshots show every element fully visible.
- [ ] **Step 4:** Commit: `Vocabulário de revelação e páginas de produto`.

---

### Task 12: Institutional pages

**Files:**
- Modify: `src/app/tecnologia/page.tsx`, `src/app/nossa-historia/page.tsx`, `src/app/sobre/page.tsx`, `src/app/academia/page.tsx`, `src/app/parcerias/page.tsx`

| Page | Treatment |
|---|---|
| `/tecnologia` | Section headings `sobe`; technical tables and accordions `surge`; diagrams or photos `desvela`. |
| `/nossa-historia` | Photos `desvela`; the conviction quote `surge` over `--mv-lento`; partner portraits `sobe` with `ordem`. |
| `/sobre` | Same as `/nossa-historia`, without the quote treatment. |
| `/academia` | Hero heading `sobe`; before/after photos `desvela`; form section untouched. |
| `/parcerias` | Headings `sobe`; benefit list `sobe` with `ordem`; form untouched. |

- [ ] **Step 1:** Apply the table. Never put two adjacent sections on the same effect: alternate when the table allows it.
- [ ] **Step 2:** Verify with the harness at `iphone-se`, `ipad-mini` and `desktop-1440` per page (CLS < 0.05, no overflow, reduced motion all visible).
- [ ] **Step 3:** Commit: `Movimento nas páginas institucionais`.

---

### Task 13: Form and legal pages

**Files:**
- Modify: `src/app/contato/page.tsx`, `src/app/visualizador/page.tsx`, `src/app/orcamento/[slug]` page, `src/app/privacidade/page.tsx`, `src/app/termos/page.tsx`, `src/app/globals.css`

- [ ] **Step 1:** No scroll reveals on these pages.
  - Add focus-ring and field-state transitions using `--mv-rapido` on inputs, selects and buttons (a `:focus-visible` outline offset easing in).
  - Legal pages keep only the page transition.
- [ ] **Step 2:** Verify with Playwright: tabbing through `/contato` shows the eased focus ring, and no element has an entrance animation (`document.getAnimations().length` is 0 after load, view transition excluded).
- [ ] **Step 3:** Commit: `Formulários e páginas legais: só o essencial`.

---

### Task 14: Full matrix, copy gate, preview link

**Files:**
- No source changes unless a check fails.

- [ ] **Step 1:** Run `node scripts/medir-movimento.mjs --matriz --cpu 4` on `/`, `/produtos`, `/produtos/pfb`, `/techstone`, `/projetos`, `/tecnologia` and `/nossa-historia`, plus a `--reduzido` pass and a `--webkit`/`--firefox` pass where available.
  - Expected: `acima33 === 0` inside the hero, journey and pinned ranges; CLS < 0.05; no overflow.
  - Record any engine skipped as unavailable.
- [ ] **Step 2:** Run the Review Focus checks:
  - tab-switch resume on `/techstone` mid-opening (`page.evaluate` dispatching `visibilitychange` with a 3 s wait);
  - storage-blocked intro;
  - keyboard-only journey;
  - an iPad with fine pointer (`hasTouch: true` plus the fine-pointer media emulation) showing the cursor only when fine pointer is emulated;
  - `scrollTo(document.body.scrollHeight)` on `/techstone`, then back to the opening's end, showing the CTA at full opacity.
- [ ] **Step 3:** Run `humanizer` on all new visible copy, then `revisor-tecnico` layer 1 against the Orbital rules manual (`manual_secoes.py site --nucleo`), and fix what it finds.
- [ ] **Step 4:** Run `/Users/armaandaswani/.claude/skills/impeccable/scripts/impeccable detect --json` on every changed UI file.
  - Expected: `[]` or findings fixed.
- [ ] **Step 5:** `git push origin movimento-luxo` and wait for the Vercel preview deployment.
  - Send the owner the preview URL and the device screenshots.
  - Ask them to try it on their own phone and tablet: 120 Hz feel, touch momentum, intro, journey, loupe.
- [ ] **Step 6:** Apply the owner's feedback, re-run Step 1 on changed pages, and only on explicit approval push `movimento-luxo` to `main`.
  - After release, read LCP for `/` from Vercel Speed Insights or PageSpeed Insights over the first days.
  - If LCP is worse than before the release by more than 300 ms, shorten the intro (spec risk 1) and report it.
- [ ] **Step 7:** Close the round:
  - update the vault (`06 Site e Sistema/Site — mapa de páginas.md`, decision log);
  - run `registrar-aprendizado` for any corrections;
  - remove the worktree with `git worktree remove` only after the owner confirms.
