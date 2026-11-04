# Movimento Orbital: luxe motion across the public site

Date: 2026-11-03 · Owner: Armaan (Orbital) · Status: design approved in chat, spec awaiting review

## 1. Intent

Orbital is an upscale brand. Every public page should feel smooth, weighted and quiet from the first second, on phones, tablets, laptops and large screens, and animations must look their best on high refresh rate screens (90, 120, 144 Hz).

Success means:
- the same motion feel on a 60 Hz laptop and a 120 Hz iPhone, with more frames (not faster motion) on the faster screen;
- no visible stutter in the hero, the pinned sequences or galleries on a mid-range phone;
- one motion vocabulary across pages, with each page keeping its own rhythm;
- nobody is ever blocked: the intro can be skipped, scrolling is never hijacked, reduced motion gets a calm static site.

### Decisions taken in the brainstorm (owner's answers)

| Topic | Decision |
|---|---|
| Scroll feel | Native scroll, every animation smoothed on top. No smooth-scroll library. |
| First moment | Orbit intro on the first page of a visit only. |
| Page changes | Dissolve plus image morph (React View Transitions). |
| Immersion | All four: light across material, depth in the hero, texture loupe, refined cursor and buttons. |
| Architecture | Hybrid: browser-native scroll-driven CSS for reveals and parallax; one shared time-based clock for pinned sequences, pointer effects, intro. |
| Homepage hero | Cleaner. Headline is the tagline "Novas possibilidades para seus projetos." |
| "Da fábrica até a sua obra" | Automatic journey the visitor can control, shown as an animated route. |

Out of scope: admin, partner and representative portals, the chat widget's internals, copy rewrites beyond what is listed here.

## 2. Motion foundations

### 2.1 Tokens (globals.css)

```css
--mv-rapido: 180ms;   --mv-base: 520ms;   --mv-lento: 900ms;   --mv-cinema: 1400ms;
--mv-chegada: cubic-bezier(0.16, 1, 0.3, 1);     /* long soft ease-out, things arriving */
--mv-percurso: cubic-bezier(0.65, 0, 0.35, 1);   /* ease-in-out, things travelling */
--mv-sobe: 24px;  /* 16px under 640px */
```

No bounce, no overshoot. Existing `--ease-orbital` maps to `--mv-chegada`; the existing `mv-*` keyframes are retimed to these tokens.

### 2.2 The shared clock (`src/lib/movimento/relogio.ts`)

One `requestAnimationFrame` loop for the whole site.

- Subscribers register `tick(dt)`; the loop runs only while at least one subscriber is unsettled.
- Time-based smoothing: `atual += (alvo - atual) * (1 - Math.exp(-dt / tau))`. Default `tau = 110 ms` (close to today's feel at 60 Hz). Same arrival time at any refresh rate.
- `dt` is clamped to 50 ms, so a tab switch or a long frame never produces a jump.
- Pauses on `document.hidden`; resumes cleanly.
- Reduced motion: `tau = 0` (values follow input instantly).
- `useProgresso` (src/components/ds/useProgresso.ts) moves onto the clock; its public behaviour (`--p`, `data-p10`) does not change, so TechStone and the manifesto keep working.

### 2.3 Frame budget rules

- Scroll and pointer handlers only read; all writes happen in the clock tick.
- Animate `transform`, `opacity`, `clip-path` (wipes only) and CSS variables. Never width, height, top, left.
- `will-change` is added only while an element is inside its active range and removed after.
- `content-visibility: auto` with `contain-intrinsic-size` on long below-the-fold sections.
- No `backdrop-filter` on anything that moves during scroll.

### 2.4 Device tiers (`src/lib/movimento/nivel.ts`)

`completo` by default. `leve` when any of: `prefers-reduced-data`, `navigator.connection.saveData`, `deviceMemory <= 4`, `hardwareConcurrency <= 4`. Set once as `data-mv-nivel` on `<html>`.

| Effect | completo | leve | reduced motion |
|---|---|---|---|
| Reveals, parallax (CSS) | yes | yes, half distance | none |
| Pinned sequences | smoothed | smoothed | follow scroll, no scale/translate |
| Light across material | yes | no | no |
| Hero depth | scroll + pointer | scroll only, half | static layered composition |
| Cursor and leaning buttons | pointer:fine only | no | no |
| Orbit intro | first visit | first visit | skipped |
| Page transitions | dissolve + morph | dissolve | 200 ms crossfade |

## 3. First visit and page changes

### 3.1 Orbit intro (`src/components/movimento/IntroOrbita.tsx`)

- Rendered in the root layout's HTML with a tiny inline script that checks `sessionStorage['orbital-intro']`. Already seen, or storage unavailable: the overlay is never shown.
- Sequence (about 1.6 s): navy `#0B1F45` field; the symbol's blue band, then green band, revealed along their arcs by animated SVG masks over the official `orbital-simbolo.svg` shapes (0.9 s); wordmark fades in (0.3 s); the navy lifts like a curtain (`clip-path: inset()` from the bottom, 0.4 s) while the hero below settles from `scale(1.04)`.
- Any pointer, touch or key skips to the curtain lift.
- Safety: a pure CSS animation removes the overlay at 2.2 s even if JavaScript never runs; `pointer-events: none` during the lift.
- Measure LCP on production after release; shorten the sequence if it hurts the score.

### 3.2 Page transitions (React `<ViewTransition>`)

- Enable `experimental.viewTransition` in `next.config.ts` (read `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` first).
- Page content wrapped in a `ViewTransition` with enter and exit classes: exit fades and lifts 8 px in 260 ms; enter rises 16 px and fades in over 520 ms with `--mv-chegada`.
- The header gets its own `view-transition-name` so it stays anchored.
- Direction: back navigation reverses the motion.
- Morphs (shared names): line photo in `SeletorLinhas` ↔ hero of that line's page; `ProjetoCard` ↔ the opened project.
- No View Transitions support: instant swap as today. Reduced motion: 200 ms crossfade.

## 4. Homepage changes

### 4.1 Clean hero

- `h1`: "Novas possibilidades para seus projetos." (the main tagline).
- One supporting line: "Orbital Revestimentos · Manaus". One button: "Conhecer as soluções". The consultant CTA stays in the navbar.
- The hero photo gets depth planes (section 5.2). The sr-only SEO text stays.
- "A Amazônia merece revestimentos feitos para ela." moves to open "Por que fazemos isso".

### 4.2 "Da fábrica até a sua obra": automatic route journey (`src/components/home/Jornada.tsx`)

- Full-screen section. When at least 60% visible, it plays the six existing steps automatically, about 4 s each.
- Visual: a fine-line map drawn in SVG (geometry, not a picture). A point travels from the factory in China across the ocean to Manaus, then to a project; the route draws itself in step with the text. Six stops: Curadoria, Fabricação com padrão Orbital, Importação e logística própria, Estoque em Manaus, Validação na região, Formação. The map is a simplified, honest schematic, not to scale; no invented locations.
- Controls: a six-segment progress bar (tap or click a segment to jump), swipe and arrow keys to move, a pause/play button, pause on hover and on touch, stops when off-screen, resumes from where it was.
- Scrolling past is never blocked: the section is one screen tall, not pinned.
- Accessibility: the steps are a real ordered list in the DOM; the live region announces the current step; autoplay pauses while keyboard focus is inside; reduced motion shows the six steps as a static list beside the full route.
- Copy: the six step texts already on the homepage.

## 5. Immersive touches

### 5.1 Light across material (`.mv-brilho`)

A pseudo-element with a soft linear gradient (opacity about 0.12 to 0.18, `mix-blend-mode: soft-light`) whose position comes from a CSS variable. It is driven by a `view()` scroll timeline, plus pointer X on desktop through the clock. Applied to: TechStone model textures, PFB catalogue model cards, the line selector photos. Never on photos of people.

### 5.2 Depth in the hero (`src/components/movimento/Profundidade.tsx`)

- Homepage hero and TechStone opening scene only, to start.
- Assets: background plate plus foreground cut-out (sofa on the homepage, bench on TechStone) made with Canva's background removal from the existing images. Each plate is checked visually before use (no halos, clean edges).
- Movement: background 0.85×, subject 1×, foreground 1.12× of scroll; desktop pointer shift up to 12 px, smoothed by the clock. Phones: scroll only, no gyroscope (iOS permission prompt).
- If the cut-outs are not clean enough, the hero keeps a single plane and this item is reported as not done.

### 5.3 Texture loupe (`src/components/movimento/Lupa.tsx`)

- TechStone models (Tamanhos) and PFB catalogue models.
- Desktop (`pointer: fine`): hover shows a 160 px round lens at 2.5× using the high-resolution texture file. Touch: press and hold for 250 ms; the lens floats 90 px above the finger.
- The high-resolution file loads only on the first interaction. Decorative: `aria-hidden`; existing download links stay the accessible path.

### 5.4 Refined cursor and leaning buttons (`src/components/movimento/Cursor.tsx`)

- Only with `(hover: hover) and (pointer: fine)` and tier `completo`.
- An 8 px navy dot that follows the pointer through the clock; over `[data-cursor="ver"]` (images, cards) it opens into a 64 px ring labelled "Ver"; shrinks to 0.85 on press. Native cursor hidden except over inputs, textareas and selects, and restored instantly if the custom cursor fails.
- Main buttons (`.ds-botao`) lean up to 6 px toward the pointer within an 80 px radius and ease back with `--mv-chegada`.

## 6. Rollout order

1. Foundations: tokens, clock, tiers, reduced motion; `useProgresso` on the clock.
2. Orbit intro and page transitions, with the two morphs.
3. Homepage: clean hero with depth, route journey, conviction line moved.
4. Immersive touches: light, loupe, cursor and buttons.
5. Every other public page: /produtos, /produtos/pfb, /techstone, /projetos, /tecnologia, /nossa-historia, /sobre, /academia, /parcerias, /contato, /orcamento, /visualizador; legal pages get only the calm basics. Same vocabulary, varied devices (photo unveils, heading rises, gallery glides), never the identical entrance on every section.

Each stage builds, passes lint and type check, and is verified before the next.

## 7. Testing

- Device matrix (Playwright, `~/Desktop/Webdesign/bin/playwright-cli`): iPhone SE 375×667, iPhone 15 Pro 393×852 @3x, Pixel 8 412×915, iPad mini 768×1024, iPad Pro landscape 1366×1024, desktops 1280×800, 1440×900, 1920×1080. Chromium, plus WebKit and Firefox where the runtime provides them.
- Smoothness: frame timings recorded from `requestAnimationFrame` during a scripted scroll with 4× CPU throttling. Target: no frame over about 33 ms in the hero, the journey and pinned sections; CLS under 0.05.
- Visual: scroll-craft's contact-sheet harness at six positions per section; reduced-motion run; keyboard-only run (focus order, skip intro, journey controls).
- Real devices: deploy to a preview branch first; Armaan checks the Vercel preview link on his own phone and tablet (120 Hz, touch momentum, iOS behaviour) before anything goes to main.
- Gates before publishing: `revisor-tecnico` layer 1 on any changed copy, humanizer on new public text, owner approval for the push to main.

## 8. Risks

- The orbit intro may count against LCP; measured after release, shortened if needed.
- `experimental.viewTransition` is experimental in Next 16; if it misbehaves with the App Router, page transitions are dropped and everything else ships.
- Background removal quality decides whether hero depth ships.
- Headless browsers cannot reproduce an iPhone's 120 Hz screen or touch momentum; the preview-link check on real devices covers that.
