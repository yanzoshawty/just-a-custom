# Just a custom: DESIGN.md

Visual language, tokens, 3D art direction and motion for the frontend. UX flows, copy and states live in `docs/UX-SPEC.md`. Logo files: `public/brand/logo.svg`, `public/brand/mark.svg`, `public/brand/favicon.svg`.

Antislop mode: DURING. Every decision below carries a one-line reason (R-31). No em dash or en dash appears in any UI string.

---

## 1. Design Read and dials

> Reading this as: a 3D custom-motorcycle configurator plus scroll-story landing for Indonesian bike builders and riders (anak bengkel, tongkrongan, people who plan a build before they spend money), in a technical-drawing / exploded-view blueprint language, dial ENERGY 3 / RHYTHM 3 / MOTION 3 on the landing, ENERGY 2 / RHYTHM 1 / MOTION 2 on `/garage` and `/b/[slug]`.

| Dial | Landing `/` | `/garage`, `/b/[slug]` | Reason |
|---|---|---|---|
| ENERGY | 3 | 2 | The landing has to say hello like a shop wall full of drawings; the tool pages must let the bike be the loudest thing. |
| RHYTHM | 3 | 1 | Landing sections are a story (pinned stage, breakdown, style tabs, title-block close) so they differ on purpose; tool screens stay uniform so controls are predictable. |
| MOTION | 3 | 2 | Owner asked for Lenis + pinned scrub; the breakdown is literally a motion story. Tool pages only animate state changes (explode, camera, render mode). |

## 2. Identity

- **Idea:** the site is a drafting table in a bengkel. Every bike is a drawing first: a side elevation, then an exploded view with leader lines and part numbers, then a painted render. Reason: a custom build really starts as a sketch on the workshop wall, and the owner chose this theme.
- **Motif (repeated everywhere):** drafting notation. Grid paper, dimension lines with filled arrowheads, leader lines with a dot and a horizontal shoulder, part numbers in mono, chain-dash centerlines, dashed assembly paths, and the **title block** (the bordered info box in the corner of every engineering sheet). Reason: one consistent notation system makes the site recognisable with the logo removed.
- **The revision triangle (Δ):** in engineering drawings a triangle marks a revision. A custom bike is a revision of a stock bike, so the logo uses Δ in place of the "A". The same Δ appears in the title block field "REVISI". Reason: it ties the name to drafting practice instead of decoration.
- **Language voice:** casual Indonesian as spoken in a bengkel, with the English part names riders actually use (tank, frame, clip-on, exhaust, V-twin) next to the local ones (rangka, mesin, knalpot, jok, stang, ban pacul, cat meni, doff). Reason: that mix is how builders talk; pure formal Indonesian or pure English would both feel foreign.
- **Not:** no SaaS hero gradient, no glass cards, no shadows, no rounded pill UI, no stat rows, no testimonial or logo walls. Reason: each would read as a tech product, not a workshop.

**R-07 purpose statement (background grid):** the grid and blueprint lines are not texture filler. They are the drafting surface the product draws on, they carry the brand, and the 3D bike is rendered onto the same field. The grid is allowed on the page ground and inside the 3D stage; it is suppressed under body text (see 3.4).

## 3. Color tokens

Two core colors (ink, drafting blue) plus paper neutrals and exactly one accent (red-lead primer, "cat meni"). Reason: real blueprints are one ink on one field; the meni orange is the primer every bengkel sprays on bare metal, so it marks "the part you are working on" and the main action.

### 3.1 Theme names

- Light = **Kalkir** (kertas kalkir, drafting tracing paper / vellum). Cool grey-green paper with navy-black ink. Reason: matches real vellum and avoids the banned warm-cream family.
- Dark = **Blueprint**. Deep prussian-blue field with chalk lines. Reason: the literal cyanotype blueprint look, and a legitimate dark mode rather than "dark looks tech".
- Default follows `prefers-color-scheme`; the user choice overrides and is stored. Reason: R-21, no forced theme.

### 3.2 CSS custom properties (paste into `globals.css`)

```css
:root {
  color-scheme: light;
  /* Kalkir (light) */
  --paper:        #E9ECE6; /* page ground, 3D stage ground */
  --paper-raised: #F6F7F3; /* plates: panels, callout labels, dialog, text plates */
  --paper-sunk:   #DCE1DA; /* control rail background, input well */
  --ink:          #16202B; /* primary text, outlines, 3D edge lines, focus ring */
  --ink-muted:    #4A5866; /* secondary text, mono labels, dashed assembly paths */
  --line-strong:  #6E7C86; /* component borders (inputs, chips, unselected swatches) */
  --grid-minor:   #D3D9D3; /* 24px grid, decorative */
  --grid-major:   #BCC5C0; /* 120px grid, decorative */
  --accent:       #B3361A; /* red-lead primer: primary CTA, highlighted part, redline errors */
  --accent-hover: #9A2E15;
  --on-accent:    #F6F7F3; /* text on accent */
  --scrim:        rgb(22 32 43 / 0.55); /* dialog backdrop */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper:        #0F2A44;
    --paper-raised: #14365A;
    --paper-sunk:   #0B2238;
    --ink:          #E6ECEF;
    --ink-muted:    #9FB3C4;
    --line-strong:  #6A8AA6;
    --grid-minor:   #173857;
    --grid-major:   #22496F;
    --accent:       #FF7A52;
    --accent-hover: #FF916F;
    --on-accent:    #0F2A44;
    --scrim:        rgb(11 34 56 / 0.72);
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --paper:        #0F2A44;
  --paper-raised: #14365A;
  --paper-sunk:   #0B2238;
  --ink:          #E6ECEF;
  --ink-muted:    #9FB3C4;
  --line-strong:  #6A8AA6;
  --grid-minor:   #173857;
  --grid-major:   #22496F;
  --accent:       #FF7A52;
  --accent-hover: #FF916F;
  --on-accent:    #0F2A44;
  --scrim:        rgb(11 34 56 / 0.72);
}
```

The dark block is duplicated on purpose: once for system preference (unless the user picked light), once for an explicit user pick. Reason: works with no JS and with the toggle.

Tailwind v4 mapping (in `@theme inline`): `--color-paper`, `--color-paper-raised`, `--color-paper-sunk`, `--color-ink`, `--color-ink-muted`, `--color-line-strong`, `--color-accent`, `--color-accent-hover`, `--color-on-accent`, each `var(--token)`. Never use raw hex in components. Reason: one theme switch drives every surface and the 3D scene.

Accent is lighter in Blueprint (#FF7A52 vs #B3361A) because the dark field needs more luminance for the same 4.5:1. It is the same hue family, so it is still one accent.

### 3.3 Verified contrast (WCAG 2.x, computed with antislop-human `contrast-check.py`)

Text pairs (need 4.5:1 normal, 3:1 large):

| Pair (fg on bg) | Kalkir | Blueprint | Verdict |
|---|---|---|---|
| ink on paper | 13.80 | 12.27 | Pass |
| ink on paper-raised | 15.30 | 10.33 | Pass |
| ink on paper-sunk | 12.41 | 13.54 | Pass |
| ink-muted on paper | 6.12 | 6.77 | Pass |
| ink-muted on paper-raised | 6.78 | 5.70 | Pass |
| ink-muted on paper-sunk | 5.50 | 7.48 | Pass |
| accent on paper | 5.09 | 5.68 | Pass |
| accent on paper-raised | 5.64 | 4.78 | Pass |
| accent on paper-sunk | 4.57 | 6.27 | Pass |
| on-accent on accent (CTA) | 5.64 | 5.68 | Pass |
| on-accent on accent-hover | 7.03 | 6.64 | Pass |
| paper on ink (selected chip, inverted) | 13.80 | 12.27 | Pass |
| ink on grid-major (text crossing a major grid line) | 9.32 | 7.82 | Pass |
| ink-muted on grid-major | 4.13 | 4.32 | Large text only |
| accent on grid-major | 3.44 | 3.62 | Large text only |

Non-text pairs (need 3:1):

| Pair | Kalkir | Blueprint | Verdict |
|---|---|---|---|
| line-strong on paper | 3.60 | 4.04 | Pass |
| line-strong on paper-raised | 3.99 | 3.40 | Pass |
| line-strong on paper-sunk | 3.24 | 4.46 | Pass |
| focus ring (ink) on any surface | 12.41+ | 10.33+ | Pass |
| accent highlight edges on paper | 5.09 | 5.68 | Pass |

Grid lines (`--grid-minor`, `--grid-major`) are decorative and exempt; they never carry meaning.

### 3.4 Color usage rules

- **Accent appears only at:** primary CTA ("Mulai rakit", "Simpan build"), the highlighted part in 3D (edges + its callout part number), and redline error text/borders. Nowhere else: not links, not icons, not hover tints on secondary buttons. Reason: one deliberate accent; red-lead is also the drafter's correction color, so errors in meni are native to the theme.
- **Focus ring is ink, not accent.** Reason: keeps accent scarce and ink gives the higher ratio.
- **Body-size `ink-muted` and `accent` text never sit on bare gridded paper.** Put them on a `--paper-raised` plate (solid, no grid) or on `--paper-sunk`. Ink text and display-size text may sit on the grid. Reason: the major grid line drops muted text to 4.13:1.
- **Success is ink, not green.** "Link tersalin" uses ink text plus the label change. Reason: no extra color; status is carried by words (color-only feedback is banned anyway).
- **Paint swatches** in the configurator are user content (bike paint), not UI palette. They live only inside swatch chips and the 3D model. Reason: R-29 counts UI colors, not the product being configured.

## 4. Typography

All via `next/font/google`, `subsets: ["latin"]`, `display: "swap"`.

| Role | Family (next/font import) | Weights | CSS var | Reason |
|---|---|---|---|---|
| Display, headings | `Barlow_Condensed` | 600, 700 | `--font-display` | DIN-lineage condensed grotesk, the lettering family of stamped part plates and road signage; condensed width fits long Indonesian headlines on phones. |
| Body, UI | `Barlow` | 400, 500, 600 | `--font-body` | Same superfamily as the display, so headings and body feel cut from one plate; open, readable at 16px. |
| Annotation, data | `IBM_Plex_Mono` | 400, 500 | `--font-mono` | Engineering heritage, tabular figures and a slashed zero, so part codes like `JAC-07` and hex values read unambiguously. Used only small, never as big "terminal" headings. |

Remove the scaffold Geist imports and the `font-family: Arial` body rule from `src/app/globals.css` / `layout.tsx`. Reason: the scaffold defaults are the AI default stack.

Type scale (fluid, `clamp`, rem based so 200% zoom reflows):

| Token | Value | Font / weight | Line height | Use |
|---|---|---|---|---|
| `--text-display` | `clamp(2.75rem, 1.6rem + 5.2vw, 6rem)` | display 700 | 0.95 | Landing hero H1 only |
| `--text-h2` | `clamp(2rem, 1.4rem + 2.6vw, 3.5rem)` | display 700 | 1.0 | Landing section headings |
| `--text-h3` | `clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)` | display 600 | 1.1 | Part group names, dialog title, build name |
| `--text-body-lg` | `1.1875rem` | body 400 | 1.55 | Landing paragraphs |
| `--text-body` | `1rem` | body 400 / 500 | 1.55 | UI text, option names |
| `--text-small` | `0.875rem` | body 400 | 1.5 | Helper text, captions |
| `--text-label` | `0.75rem` | mono 500, uppercase, `letter-spacing: 0.06em` | 1.3 | Part numbers, title-block field names, BOM headers |
| `--text-data` | `0.875rem` | mono 400 | 1.4 | Hex values, option ids, URLs |

- Headlines are **sentence case**. Reason: Indonesian sentences in all caps are slow to read.
- Uppercase is reserved for mono drafting labels at 0.06em tracking, never wide tracking. Reason: drafting lettering standards are capitals; modest tracking avoids the "HOW IT WORKS" tell.
- Body measure max `65ch`. Display headline max 2 lines on desktop.
- `font-variant-numeric: tabular-nums` on all mono.

## 5. Spacing, layout grid, radius, lines

### 5.1 Spacing scale (4px base)

`--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px; --space-9: 96px; --space-10: 128px;`

Reason: 4px steps line up with the 24px minor grid (6 steps) so plates and controls snap to the drawing grid.

- Landing section padding: `--space-10` desktop, `--space-8` below 768px. Reason: whitespace separates story beats; halved on phones to avoid empty deserts.
- Page gutters: 16px below 640, 24px 640 to 1023, 48px from 1024. Max content width 1320px.
- Control rail inner padding 24px; group gap 32px; option chip gap 8px.

### 5.2 Background grid (the drafting surface)

```css
body {
  background-color: var(--paper);
  background-image:
    linear-gradient(var(--grid-major) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-major) 1px, transparent 1px),
    linear-gradient(var(--grid-minor) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-minor) 1px, transparent 1px);
  background-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px;
  background-position: -1px -1px;
}
```

Plain CSS gradients, no image, no blur. Reason: cheap to paint and themes automatically through tokens.

### 5.3 Radius (shape lock: sharp)

- Panels, plates, dialog, swatches, canvas frame, title block: `0`.
- Buttons, inputs, option chips: `2px`.
- Nothing is pill-shaped or circular except the leader-line dot.
Reason: drawings and cut steel plate have hard corners; 2px on controls only softens the touch edge, a single documented rule.

### 5.4 Line weights (borrowed from ISO 128 line types)

| Token | Value | Use | Reason |
|---|---|---|---|
| `--line-thick` | 2px solid `--ink` | Title block frame, dialog frame, primary button border, selected chip/swatch, the 3D ground line | Visible outlines are the thick line in drafting. |
| `--line-thin` | 1px solid `--ink` | Dimension lines, leader lines, title-block inner rules, BOM rules | Thin line type for annotation. |
| `--line-border` | 1px solid `--line-strong` | Input, chip, unselected swatch borders | Meets 3:1 non-text contrast. |
| Dashed | 1px, dash 6 gap 4, `--ink-muted` | Exploded-view assembly paths (3D and SVG) | Drafting convention for assembly/travel paths. |
| Chain (centerline) | 1px, dash 14 3 3 3, `--ink-muted` | Wheel axle centerlines, bike vertical datum | Centerline convention. |

No box-shadows anywhere. Elevation is shown with a 2px ink frame and a solid offset plate (`box-shadow: 4px 4px 0 0 var(--ink)`) used only on the open dialog and the primary CTA. Reason: a hard offset reads like a stacked paper sheet, not a floating SaaS card; limited to two elements.

### 5.5 Components (visual tokens only; behavior in UX-SPEC)

- **Primary button:** bg `--accent`, text `--on-accent`, font body 600 16px, height 48px, padding 0 20px, 2px solid `--ink` border, offset plate `4px 4px 0 var(--ink)`. Hover: bg `--accent-hover`. Active: `translate(2px, 2px)` and plate shrinks to `2px 2px` (physically pressed). Disabled/busy: bg `--paper-sunk`, text `--ink-muted`, border `--line-strong`, no plate (ink-muted on paper-sunk 5.50 / 7.48).
- **Secondary button:** transparent bg, 2px `--ink` border, text `--ink`, height 48px. Hover: bg `--paper-sunk`.
- **Text button / link:** `--ink`, underline 1px offset 3px; hover underline 2px.
- **Option chip (radio):** height 44px, padding 0 14px, 1px `--line-strong` border, bg `--paper-raised`, text `--ink`. Selected: bg `--ink`, text `--paper`, border 2px `--ink`. Reason: inversion is the clearest selected state without using accent.
- **Swatch:** 44 x 44px square, 1px `--line-strong` border; selected: 2px `--ink` border plus 2px inner gap (`outline` inset) and the swatch name in the legend below. Never color-only: the selected name is always printed.
- **Input:** height 48px, bg `--paper-raised`, 1px `--line-strong` border, label above (body 500 14px), helper below (small, ink-muted), error below (small, accent, prefixed "Gagal:" or the specific message). Focus: border 2px `--ink` plus focus ring.
- **Focus ring (all focusables):** `outline: 2px solid var(--ink); outline-offset: 2px;` on `:focus-visible`. Never `outline: none` without this.
- **Title block:** 2px ink frame, grid of cells with 1px inner rules, each cell = mono label (`--text-label`, ink-muted) above a value (body 600 or display 600). Bg `--paper-raised`.
- **Callout plate (3D labels):** bg `--paper-raised`, 1px `--ink` border (2px `--accent` when active), padding 6px 8px, line 1 mono label `07  MESIN` (two spaces, no middle dot), line 2 body 500 14px option name. Max width 180px.

## 6. Iconography

No icon library. Controls are labelled with words; the only glyphs are drafting symbols built from the same line primitives as the drawing, defined here so nothing is improvised:

| Symbol | SVG (viewBox 0 0 24 24, `stroke="currentColor"`, `stroke-width="2"`, `fill="none"`) | Used for |
|---|---|---|
| Close | `<path d="M6 6 18 18M18 6 6 18"/>` | Dialog close button (with visible text "Tutup" on desktop, `aria-label="Tutup"` always) |
| Revision Δ | `<path d="M12 4 21 20H3Z"/>` | Title-block "REVISI" value, logo |
| Center mark | `<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="7"/>` | "Reset kamera" button prefix |
| Arrowhead (dimension) | `<path d="M4 12h16M4 12l5-3v6zM20 12l-5-3v6z" fill="currentColor"/>` | Hero dimension line only |

Reason: these are notation, not a glyph set; they come from the brand's own drafting vocabulary, so no generic library look (R-04). No sparkle, lightning, star, magic or emoji anywhere. No arrows on buttons (R-08): CTAs are specific enough without them.

## 7. 3D art direction

The bike is built procedurally from Three.js primitives. Lean into that: it is a **technical drawing that happens to be 3D**, not a failed photoreal render.

### 7.1 Units, axes, anchors (v2)

- 1 unit is roughly 1 meter. Bike faces **+X**, up is **+Y**, the rider's left (+Z) faces the default camera, so chain, exhaust and kick lever sit on +Z on purpose. Origin: ground, midway between axles.
- **Rig** (`src/three/bike/rig.ts`): every style sets six dials from the report's per-style table: wheelbase, neck rake, wheel/tire sizes (rim inch, section, aspect), seat height, top-clamp height, stance, tail overhang/rise. A donor **base** (harian-150, w175, xsr155, ronin) replaces wheelbase and 17 in wheels with the donor's spec-sheet values (unless the style's signature keeps its own wheels) and scales the engine down. The rig derives the fork axis, clamps, steering head, pivot, seat rail and tail; every recipe places itself from those points, never from fixed coordinates. Bikes longer than 2.3 units are scaled down so the camera framing still fits (chopper, bagger).
- Each category is one part group (`PartGroup`) with an explode offset; the front/rear rim and tire are four groups that share the "Roda & ban" callout.

### 7.2 Part modelling (v2)

- Recipes live in `src/three/bike/recipes.ts`, one function per category; option ids and names are in `src/lib/catalog.ts`. Every option produces its own geometry (25 categories, 151 options). Silhouette rules from the report drive the defaults: cafe tank top and seat base level, japstyle tank highest point over a thin flat seat, chopper rake 38+ with long forks, streetfighter tail kicked high, bagger one painted mass from batwing to bags.
- **Kit** (`kit.ts`): recipes push primitives (rod, tube, lathe, loft, extrude with 1-2 bevel segments, sector shells for fenders) into a Kit that merges them **per material slot**: one draw call per slot per part, spokes, fins, tread blocks and bolts included. Line mode merges all fill pieces into one mesh plus one ink mesh, one silhouette hull and one fat-line edge set per part.
- Slots: paint `tank` / `frame` / `accent`; fixed `chrome`, `alloy` (brushed), `engine`, `black` (powder coat), `rubber`, `leather`, `lens`, `lamp`, `red`, `amber`, `plate` (number boards, whitewalls).
- Soft style rules: `CLASHES` in catalog.ts encodes each style's "do not include" list. The rail warns ("Keluar pakem ...") and dashes the chip border; nothing is blocked, so hybrids (brat tracker) stay possible. Presets are tested to never clash with their own style.
- Budget: Low tier under ~100 draw calls; measured 70-85 per bike (see 7.7).

### 7.3 Render modes

Two modes, user-switchable (labels: **Garis** = blueprint line drawing, **Cat** = painted). The landing uses Garis throughout and shows Cat once in the styles section.

**Garis (default everywhere):**
- Every mesh: `MeshBasicMaterial` colored `--paper`, with `polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1`. Reason: the fill occludes lines behind it, giving hidden-line removal like a real drawing.
- Edges: drei `<Edges threshold={20} />` on every mesh, color `--ink`, lineWidth 1.5 (falls back to 1 where wide lines are not supported). Reason: crease-angle edges look like pen outlines, not a wireframe mess.
- Highlighted part: edges `--accent`, lineWidth 2.5. Fill stays `--paper`.
- Ground: one thick line (`--ink`, 2px) at y = 0 from x = -1.4 to 1.4. Axle centerlines: chain-dash vertical and horizontal lines through each axle (`LineDashedMaterial`, `--ink-muted`, dash 0.06, gap 0.015). No shadows, no lights needed.
- Canvas is transparent (`gl={{ alpha: true }}`, no scene background) so the CSS grid shows through. Reason: one drafting surface for page and model.

**Cat (painted):**
- Painted surfaces use the build's paint. `tank` color = `paint.tank` on the tank; `paint.frame` on frame tubes, swingarm and fork lowers; `paint.accent` on a thin pinstripe band around the tank, the inner rim band, and the engine head covers.
- Finish mapping (applies to all three paint colors):
  - `gloss` (label "Kilap"): `MeshPhysicalMaterial`, roughness 0.30, metalness 0, clearcoat 1, clearcoatRoughness 0.05.
  - `matte` (label "Doff"): roughness 0.85, metalness 0, clearcoat 0.
  - `metal` (label "Metalik"): metalness 0.65, roughness 0.35, clearcoat 0.6.
- Fixed materials (not user paint, real-world material colors): chrome (exhaust, handlebar, spokes, fork tubes) `#C8CDD0` metalness 1 roughness 0.2; engine block `#4A4E52` metalness 0.6 roughness 0.45; seat `#2B2B2B` roughness 0.7; tires `#1B1B1B` roughness 0.9.
- Edges stay on at `--ink`, opacity 0.18. Reason: the drawing is still visible under the paint, so both modes feel like one brand.
- Lighting: `hemisphereLight` (sky `#FFFFFF`, ground `#1A2430`, 0.5); key `directionalLight` at (3, 4, 2) intensity 2.0; rim at (-3, 2, -2) intensity 0.8. Reflections from drei `<Environment resolution={256} frames={1}>` built only from local `<Lightformer>`s: one long thin rectangle overhead like a bengkel TL tube lamp (`form="rect"`, intensity 2, scale [4, 0.15], y = 3), two dim side panels (intensity 0.6). No HDR preset download. Reason: no network fetch for the scene, and the TL-tube reflection streak is the bengkel look.
- drei `<ContactShadows>` under the bike: opacity 0.38 (Kalkir) / 0.5 (Blueprint), blur 2.4, far 1, color `--ink`. Low tier bakes it once per build (`frames={1}`); High re-renders it so exploded parts lift off.
- v2 PBR (`materials.ts`): finishes `gloss`, `matte`, `metal`, `candy` (metal 0.9 under clearcoat), `flake` (generated noise normal map on the base layer only, High tier), `satin`, `patina` (generated rust blotches multiplied over the paint, roughness 0.92). Fixed: chrome metal 1 / rough 0.1; brushed alloy with anisotropy 0.75 (High); leather with sheen 0.35 (High); lens transparent 0.38; lamp and taillight emissive. The environment is generated from Lightformers inside a dim room shell (no HDR file, nothing from a CDN: the CSP blocks drei presets).

Theme changes recolor the scene in the same frame: read tokens with `getComputedStyle(document.documentElement)` on mount and whenever `data-theme` or the `prefers-color-scheme` media query changes.

### 7.4 Cameras

`PerspectiveCamera` fov 24 (narrow, close to orthographic, so the side view reads like an elevation drawing), near 0.1, far 50. Target (0, 0.5, 0).

| Preset (UI label) | Position | Use |
|---|---|---|
| Samping | (0, 0.55, 6.2) | Default; hero; side elevation |
| 3/4 | (3.6, 1.6, 4.6) | Exploded story, style tabs |
| Depan | (6.2, 0.6, 0) | Front view |
| Atas | (0, 6.4, 0.01) | Plan view |

- Fit to aspect: after computing the bike bounding box, scale preset distance by `max(1, (boxWidth / boxHeight) / aspect * 0.9)` so the full bike fits on portrait phones.
- Landing frames the subject off-center with `camera.setViewOffset`: desktop (>= 1024) shifts the bike into the right 60% (`offsetX = -0.18 * width`); below 1024 shifts it into the top 58% (`offsetY = +0.16 * height`). Reason: text and drawing never overlap.
- `/garage` OrbitControls: `enablePan={false}`, minDistance 3.5, maxDistance 10, minPolarAngle 0.05, maxPolarAngle `Math.PI / 2 - 0.02` (never under the ground), damping 0.08. Disabled during camera tweens.
- `frameloop="demand"` on all pages; call `invalidate()` from scroll/tween updates. `dpr={[1, 2]}`. Reason: battery and heat on phones.

### 7.5 Exploded view

Order is the story order and the part-number order. Offsets are added to each group's home position.

| No. | Label (ID / EN) | Part key(s) | Explode offset (x, y, z) |
|---|---|---|---|
| 01 | RANGKA / frame | `frame` (+ fixed parts) | (0, 0, 0), the datum, never moves |
| 02 | TANGKI / tank | `tank` | (0.10, 0.65, 0) |
| 03 | JOK / seat | `seat` | (-0.30, 0.55, 0) |
| 04 | STANG / handlebar | `handlebar` | (0.30, 0.60, 0) |
| 05 | RODA & BAN / wheels & tires | `wheels`, `tires` | front rim (0.55, 0, 0), front tire (0.85, 0, 0.25); rear rim (-0.55, 0, 0), rear tire (-0.85, 0, 0.25) |
| 06 | KNALPOT / exhaust | `exhaust` | (-0.30, -0.10, 0.55) |
| 07 | MESIN / engine | `engine` | (0, -0.55, 0.35) |

- The engine is last on purpose: the story builds from the frame out and ends at "jantung" (the heart). Reason: owner asked for a breakdown from rangka to mesin.
- Each moved part draws a dashed assembly path (`--ink-muted`) from home anchor to exploded anchor. Reason: drafting convention that shows how the part goes back on.
- Tween: `power3.inOut`, 700ms in `/garage`; scroll-scrubbed on the landing.

### 7.6 Callout labels

- drei `<Html>` plate (style in 5.5) positioned at `anchor + labelOffset`; drei `<Line>` leader from a filled dot (radius 0.012, `--ink`) on the part anchor to the plate, ending in a 0.12-unit horizontal shoulder. Reason: textbook leader-line form.
- Label text: line 1 the part number and name in mono, `07  MESIN` (two spaces as separator); line 2 the current option display name (e.g. "Parallel twin"). The longer code form `JAC-07` is used only in the `/b/[slug]` BOM table.
- Active part: accent edges, accent leader, plate border 2px accent, part number text accent (4.78 to 5.64:1 on the plate).
- Desktop shows all labels in exploded view; below 768px only the active part's label. Reason: eight plates on a 375px canvas collide.
- Labels are `aria-hidden="true"` and `pointer-events: none`; the same information is in the control rail / caption text. Reason: one accessible source, no duplicate tab stops.

### 7.7 Quality tiers

| Tier | When | Settings |
|---|---|---|
| High | default on desktop | DPR [1, 2], MeshPhysicalMaterial clearcoat paint, anisotropic alloy, env 512, live contact shadow, faint painted-mode outlines |
| Low | phones with coarse pointer and small screen, <=4 GB / <=4 cores, PerformanceMonitor decline, WebGL context lost, or user pick | DPR [1, 1.25], MeshStandardMaterial only, ~60% segment counts, env 128, contact shadow baked once, no painted-mode outlines |
| Fallback | no WebGL | existing CanvasFailed plate; part list stays usable |

State lives in `src/three/stage-store.ts`: `useQuality()` returns `{ mode, tier, dpr }`, `setQualityMode("auto" | "high" | "low")` is the hook for the frontend's toggle (persisted in `localStorage["jac:quality"]`), `reportSlow()` is what the monitor calls. `localStorage["jac:debug3d"] = "1"` exposes `window.__jac3d` (R3F state) for renderer.info checks.

## 8. Motion spec

Global: GSAP + ScrollTrigger (`@gsap/react` `useGSAP` for cleanup), Lenis on the landing only. Default UI ease `power3.out` (CSS equivalent `cubic-bezier(0.16, 1, 0.3, 1)`); scroll-scrubbed tweens use `ease: "none"` because the scroll position is the easing. Animate only `transform`, `opacity`, and 3D object transforms/uniforms.

Lenis wiring (landing): `const lenis = new Lenis({ lerp: 0.1 })`; `lenis.on("scroll", ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t * 1000))`; `gsap.ticker.lagSmoothing(0)`; destroy on unmount. Not created at all when `prefers-reduced-motion: reduce`.

Reduced motion is checked with `gsap.matchMedia()` (`"(prefers-reduced-motion: reduce)"`) so every timeline has an explicit fallback branch.

| # | Element | Trigger | Animation | Duration / ease | UX purpose | Reduced-motion fallback |
|---|---|---|---|---|---|---|
| M1 | Landing scroll | Wheel / touch | Lenis smoothing | lerp 0.1 | Makes the scrubbed explode continuous instead of jumping in wheel steps | Native scroll, Lenis not created |
| M2 | Hero dimension line + ground line (SVG overlay) | Page load, after canvas ready | `stroke-dashoffset` draw-in, left to right | 900ms `power2.out` | Announces "this is a drawing being drafted" and confirms the 3D is ready | Drawn instantly |
| M3 | Hero bike edges | Canvas ready | Edge material opacity 0 to 1 | 600ms `power2.out`, starts with M2 | Avoids a hard pop of the model | Opacity 1 instantly |
| M4 | Stage pin (`#bongkar`) | ScrollTrigger `start: "top top"`, `end: "+=700%"` desktop / `"+=500%"` below 768, `pin: true`, `scrub: 0.6` | Master timeline: camera Samping to 3/4 (first 10%), then 7 equal steps, one per part in 7.5 order: part moves to explode offset, dashed path grows, leader + plate appear | Scroll-mapped, `ease: "none"` | Storytelling: scroll position equals breakdown progress, rangka to mesin | No pin. Section renders the fully exploded bike statically (one frame, all labels) followed by the 7 captions as a normal list |
| M5 | Breakdown caption plate | Step boundary inside M4 (toggle via `onUpdate` index, not scrubbed) | Old caption out (opacity 0, y -8px), new in (opacity 1, y 12px to 0) | 300ms `power3.out` | Text is never half-visible while scrubbing, so it stays readable | Captions shown as a static list, no swap |
| M6 | Reassemble | Last 8% of M4 | All parts return home, camera to 3/4 | Scroll-mapped | Bridges into the styles section with a whole bike again | Bike shown assembled in styles section |
| M7 | Style tabs (landing) | Tab change | Changed part groups scale 0.92 to 1 and fade in; unchanged parts stay | 450ms `power3.out` | Shows exactly which parts differ between aliran | Instant swap |
| M8 | Part option change (`/garage`) | Option selected | New part mesh appears with accent edges, which hold 600ms then return to normal (unless the part is still the active row) | 600ms hold, 200ms fade | Feedback: confirms which part changed on the model | Accent edges shown while the row is active, no timed fade |
| M9 | Utuh / Bongkar toggle | Toggle | Parts tween between home and explode offsets, dashed paths fade | 700ms `power3.inOut` | State transition that keeps each part spatially traceable | Instant |
| M10 | Garis / Cat toggle | Toggle | Crossfade: painted materials opacity 0 to 1 over line fill | 400ms `power2.out` | Shows the same object changing representation, not a new object | Instant |
| M11 | Camera presets | Preset button | Tween camera position and target | 800ms `power2.inOut` | Keeps orientation while the view changes | Instant cut |
| M12 | Primary button press | `:active` | `translate(2px,2px)` and plate 4px to 2px | 80ms `ease-out` | Physical press feedback | Same (non-motion state change, kept) |
| M13 | Dialog open / close | Open / close | Opacity 0 to 1, y 8px to 0; scrim fades | 200ms `power3.out` / 150ms | Shows arrival of a layer above the drawing | Opacity only, 0ms |
| M14 | Theme switch | Toggle | None, instant | 0ms | Avoids a half-themed frame mid-scroll; 3D recolors in the same frame | Same |
| M15 | Aliran walk (landing v2) | ScrollTrigger on `#aliran`, `start: "top top"`, `end: +=max(1.15 x track travel, 2 x viewport)`, `pin: true`, `scrub: 0.6` | Card row `x` from 0 to minus the distance between the first and last card | Scroll-mapped, `ease: "none"` | Storytelling: the visitor walks past every aliran in the catalog and the bike changes with each one | No pin; v1 tabs |
| M16 | Active aliran card | Card enters the left slot (index from M15 progress) | Card `translateY(-10px)` + 2px ink frame; bike swaps preset (M7 pop on changed parts) | 300ms `cubic-bezier(0.16, 1, 0.3, 1)` | Hierarchy: one card is clearly the one on the drawing | Instant |
| M17 | Aliran ruler | Same timeline as M15 | Fill `scaleX` 1/n to 1 | Scroll-mapped | Shows how much of the catalog is left without a counter | Not rendered |
| M18 | Gudang tab change | Tab selected | Option plates `y` 14px to 0, opacity 0 to 1, stagger 50ms | 350ms `power3.out` | State transition: the new shelf is set down, so the swap reads as new content | Instant |
| M19 | Gudang highlight (desktop) | `#gudang` between 55% and 45% of the viewport | Selected group becomes the highlighted part on the fixed bike | Instant (3D highlight) | Points from the list to the real part | Same (no motion involved) |
| M20 | Motor harian headline | `#harian` top hits 70%, once | Two lines rise out of their masks, `yPercent` 105 to 0, stagger 120ms | 800ms `power3.out` | The one loud beat that marks the switch from catalog to culture | Static |
| M21 | Base sheets | Each sheet top hits 85% (once) / 80% to 45% (scrub) | Sheet `x` 48px to 0 + fade; displacement dimension line `scaleX` 0 to 1 | 600ms `power3.out` / scroll-mapped | Sheets laid on the table, then each spec is drafted to scale so the size difference is read, not just stated | Static, lines drawn |
| M22 | Closing title block | `#garasi` top hits 70%, once | Cells fade in, `y` 8px to 0, stagger 80ms | 350ms `power3.out` | Echoes the loader's title block filling in: the sheet is complete, sign it | Static |
| M23 | Tour coachmark | Step change | Frame and plate glide to the next target (transform, width, height), leader line redraws with `stroke-dashoffset` after the glide | 380ms `cubic-bezier(0.16, 1, 0.3, 1)` + 260ms | Keeps the eye travelling from one control to the next instead of a jump cut | Instant cut, line shown |
| L1 | Loader sheet (`/garage`, `/b`) | Mount | Sheet border, ground line, wheels, frame/tank/seat/fork/engine/exhaust/bar draw in with `stroke-dashoffset` (`pathLength=1`), staggered | 0.5 to 1.2s `power2.out` | Says "the drawing is being drafted" while the canvas starts, in the brand's notation | Drawn complete |
| L2 | Loader annotation | After L1 | Centerlines, wheelbase dimension, arrowheads, leaders and labels; title block cells fade in, `y` 6px to 0 | about 0.9s, `power3.out` | Fills the title block like a real sheet; status text is the live region | Shown complete |
| L3 | Loader finish | Canvas ready or failed (900ms floor) | Remaining drawing plays at 3x | Rest of the timeline / 3 | Real signal, never a fake timer; no half-drawn sheet left behind | Skipped |
| L4 | Loader lift | After L3, or focus/press (skip) | Sheet `opacity` 1 to 0, `y` 0 to -16px, then removed | 350ms `power2.in` | The paper lifts off and the live 3D drawing is underneath | Opacity only, 150ms |

`stroke-dashoffset` (L1, L2, M23 leader) is the one paint property animated on purpose: a few SVG strokes, the owner asked for drawn lines. Everything else is transform/opacity. M23's width/height glide runs only during the 380ms step change on one empty frame element.

No endless loops, no floating, no bounce, no parallax beyond M4 and M15. Reason: every motion above maps to a story beat or a state change.

## 9. Z-index scale

`--z-canvas: 0` (fixed landing stage), `--z-content: 10`, loader sheet 15 (below the header, so navigation and the theme button stay reachable), `--z-header: 20`, `--z-toast: 30` (also the tour frame and plate), `--z-dialog: 40`. Reason: systemic layers only, no arbitrary 9999.

## 10. Logo usage

- `logo.svg`: stroke wordmark "JUST Δ CUSTOM" lettered like technical-pen capitals, with a full-width dimension line underneath. All strokes and fills are `currentColor`. Use at 28 to 36px tall in the header (inline it as a React component so `currentColor` follows `--ink`). Minimum height 24px.
- `mark.svg`: two wheels with center marks and a wheelbase dimension line above them, the most basic drawing of any motorcycle. `currentColor`. Use below 640px in the header (32px) and anywhere the wordmark is too wide.
- `favicon.svg`: same as `mark.svg` but with fixed ink colors and a `prefers-color-scheme` style, because an `<img>`/favicon cannot inherit `currentColor`. Wire it as `metadata.icons = { icon: "/brand/favicon.svg" }` and delete `src/app/favicon.ico`.
- The Δ path in `logo.svg` has `class="jac-rev"` so an inlined version may color it `--accent` on the landing hero only. Reason: one optional accent moment, the "revision" is the custom.
- Clear space: one Δ width on every side. Never stretch, never add effects.
