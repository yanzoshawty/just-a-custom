# Just a custom: UX-SPEC.md

Flows, layouts, copy and states. Visual tokens, 3D art direction and the motion table (M1 to M14) are in `docs/DESIGN.md`. Data contract: `src/lib/build-schema.ts` (do not change it from the frontend side).

Copy rules: Indonesian bengkel register with English part names, no em dash or en dash, no invented numbers, no testimonials/FAQ/pricing/logo bars/stats. `<html lang="id">`.

---

## 1. Sitemap and navigation

| Route | Purpose | In header nav |
|---|---|---|
| `/` | Landing: the breakdown story, invite to the garage | Via logo |
| `/garage` | Configurator. Accepts `?style=<style>` (start from a style preset) and `?from=<slug>` (start from a saved build) | "Garasi" |
| `/b/[slug]` | Read-only shared build | Not in nav (reached by link) |

Nothing else exists, so nothing else is linked (R-24). No footer link columns.

### 1.1 Header (all pages)

- Height 64px desktop, 56px below 768px. Solid `--paper` with a 1px `--ink` bottom rule, not sticky on the landing (the stage needs the full viewport), sticky on `/garage` and `/b/[slug]`.
- Left: logo (wordmark from 640px up, mark below), links to `/`, accessible name "Just a custom, ke beranda".
- Right, in order: "Garasi" link (`aria-current="page"` on `/garage`), theme button, and on `/garage` only the primary button "Simpan & bagikan" (below 640px label shortens to "Simpan").
- Theme button: one button, visible text is the current mode name ("Kalkir" or "Blueprint") preceded by a 12px two-tone square showing paper/ink. `aria-label` "Mode tampilan: Kalkir. Ganti ke Blueprint." (and the reverse). Stores `jac:theme` = `light|dark` in localStorage and sets `data-theme` on `<html>`. A blocking inline script in `<head>` applies the stored value before paint; `<html suppressHydrationWarning>`. With nothing stored, the system preference applies.
- Skip link as the first focusable element: "Langsung ke isi" (landing, `/b`) or "Langsung ke konfigurator" (`/garage`), visible on focus.

### 1.2 Footer (all pages)

One row: mark (24px) + "Just a custom" + the line "Gambar di sini bukan gambar kerja. Ukuran asli tetap urusan bengkelmu." Reason: honest about a stylized model, in the shop voice. No links besides the logo.

### 1.3 Metadata

- `/`: title "Just a custom | Rakit motor custom-mu di meja gambar", description "Konfigurator motor custom 3D: pilih rangka, mesin, tangki sampai knalpot, lihat utuh atau dibongkar, lalu bagikan lewat link."
- `/garage`: title "Garasi | Just a custom".
- `/b/[slug]`: title "{name} | Just a custom", description "Build {style label} oleh {builder}" or "Build {style label}" when no builder. `notFound()` for unknown slugs.

---

## 2. Shared content tables (single source for every page)

### 2.1 to 2.3 Parts, names, styles, bases, presets (v2)

The single source is `src/lib/catalog.ts` (tested in `catalog.test.ts`); this spec no longer copies the tables.

- **Groups:** 24 numbered groups (01-07 keep the landing story order rangka, tangki, jok, stang, roda & ban, knalpot, mesin; 08-24 are the v2 categories), each in one rail section: Rangka & kaki-kaki, Mesin & knalpot, Bodi, Lampu & kelistrikan, Kokpit. Names are bengkel Indonesian with the English term in brackets.
- **Styles (13):** cafe racer, bobber, scrambler, brat, japstyle (Indonesian definition), chopper, flat tracker, street tracker, board tracker, rat bike, streetfighter, bagger, neo retro. Each has a full preset (`PRESETS`) and a one-line blurb (`STYLE_BLURB`).
- **Basis motor (5):** Custom, Harian 150, W175, XSR 155, Ronin (labelled 225,9cc, not 150). Picking a base swaps only the donor keys (engine, frame, fork, rear shock, wheels); a style's signature keys (`STYLE_SIGNATURE`, e.g. chopper frame and fork) win over the donor. Choosing a style on a donor uses `presetFor(style, base)`.
- Saved configs are schema v2; v1 drafts and rows still parse and are upgraded (`upgradeV1`).

### 2.4 Paint swatches (shared by Tangki, Rangka, Aksen)

| Name | Hex |
|---|---|
| Merah marun | #8A1F17 |
| Merah meni | #B3361A |
| Hijau army | #3B4A2F |
| Biru dongker | #1E2F4F |
| Emas pinstripe | #C9A227 |
| Putih tulang | #D8D2C4 |
| Abu primer | #6B6F72 |
| Hitam | #1A1A1A |

Plus "Warna lain": a native `<input type="color">` paired with a text field accepting `#RRGGBB` (validated by the same regex as the schema; invalid shows "Format warna harus #RRGGBB, contoh #8A1F17."). A custom hex shows as the name "Custom" with its hex. Every swatch has a visible name + hex in the legend under the group (never color-only).

---

## 3. Landing `/`

One persistent fixed canvas (`--z-canvas`) renders the bike behind sections 3.1 to 3.3. Sections are transparent over it; text sits in zones the camera view offset keeps clear (DESIGN 7.4). Section 3.4 has a solid background and covers the canvas. Text blocks with body-size muted text sit on `--paper-raised` plates (DESIGN 3.4).

### 3.1 Hero: assembled side elevation (`#mulai`)

- **Desktop (>= 1024):** copy in the left 5 of 12 columns, top-aligned (`pt` 96px under the header); bike side elevation fills the right 60%. Under the bike, the SVG overlay draws the ground line and a dimension line between the axles labelled `JARAK SUMBU RODA` (mono label, no number). Bottom-right of the stage: the title block.
- **Below 1024:** headline + subtext + CTAs on top, bike in the lower area (min 44dvh), title block hidden below 640px (it repeats in 3.4). Section `min-height: 100dvh`.
- Copy:
  - H1: **Gambar dulu, gerinda belakangan.**
  - Subtext: "Pilih rangka, mesin, tangki sampai knalpot. Lihat motornya utuh atau dibongkar per part, lalu kirim link-nya ke bengkel langgananmu."
  - Primary CTA: **Mulai rakit** to `/garage`.
  - Secondary CTA: **Lihat bongkarannya** to `#bongkar` (smooth scroll via Lenis; native anchor jump if reduced motion).
- Title block (2 x 2 cells): `JUDUL` "Cafe racer standar garasi" / `GAYA` "Cafe racer" / `SKALA` "Tidak diskala" / `REVISI` Δ symbol (with `aria-label="revisi"`). Reason: "tidak diskala" is the real drafting note NTS and is honest about a stylized model.
- Motion: M2, M3.

### 3.2 Breakdown, pinned (`#bongkar`)

- Pinned stage per M4. Layout during the pin:
  - Desktop: intro block top-left for the first step, then a caption plate (max width 420px) bottom-left that swaps per part (M5). Bike right, in 3/4 view, parts exploding in order.
  - Below 1024: bike in the top 58%, caption plate docked to the bottom of the viewport (full width, `--paper-raised`, 2px `--ink` top rule, padding 16px, `padding-bottom: max(16px, env(safe-area-inset-bottom))`).
  - Progress indicator: a thin horizontal dimension-style line inside the caption plate whose filled segment shows step x of 7, with `aria-hidden="true"` (the caption text already says which part). Reason: shows how much story is left without a "Step 1/7" label.
- Intro (visible at step 0):
  - H2: **Dibongkar dari rangka sampai mesin.**
  - Body: "Tiap part dilepas satu per satu, lengkap dengan pilihan yang bisa kamu pasang di garasi."
- Captions (mono label, then H3, then body, then the options as a plain comma list in `--text-data`):

| Step | Label | H3 | Body | Options line |
|---|---|---|---|---|
| 1 | 01 RANGKA | Semua mulai dari rangka. | "Rangka nentuin posisi semua part lain. Double cradle buat cafe racer klasik, trellis yang rangkanya sengaja kelihatan, atau hardtail tanpa per belakang buat bobber." | Double cradle, Trellis, Hardtail |
| 2 | 02 TANGKI | Tangki bikin siluet. | "Dari samping, tangki yang paling dulu kelihatan. Teardrop yang membulat, peanut yang ramping, atau flat box ala brat." | Teardrop, Peanut, Flat box |
| 3 | 03 JOK | Jok ngatur garis belakang. | "Cafe hump dengan buntut naik, solo bobber yang duduk di atas per, atau brat flat yang rata sampai ujung." | Cafe hump, Solo bobber, Brat flat |
| 4 | 04 STANG | Stang ngatur posisi badan. | "Clip-on bikin nunduk, drag bar lurus dan rendah, tracker bar lebar buat jalan tanah." | Clip-on, Drag bar, Tracker bar |
| 5 | 05 RODA & BAN | Roda dan ban, beda jalan. | "Pelek jari-jari, racing, atau disc cover. Ban street buat aspal, ban pacul buat yang suka trabas." | Jari-jari, Racing (cast), Disc cover. Street, Pacul (knobby) |
| 6 | 06 KNALPOT | Knalpot, lewat mana jalurnya. | "Low pipe lewat bawah, high pipe scrambler naik di samping jok, atau fishtail yang ujungnya melebar." | Low pipe, High pipe scrambler, Fishtail |
| 7 | 07 MESIN | Jantungnya dipasang terakhir. | "Single silinder, parallel twin, atau V-twin. Mesin yang kamu pilih ikut ngubah bentuk rangka di sekitarnya." | Single silinder, Parallel twin, V-twin |

  The step 7 body claims the engine changes the frame look; the frontend must make that true by keeping the frame's engine mounts aligned to the chosen engine width. If that is not built, replace the second sentence with "Pilih yang paling cocok sama aliran yang kamu kejar."
- End of pin: reassemble (M6).
- Reduced motion / no WebGL: no pin; a static exploded drawing (or nothing if no WebGL) followed by the intro and all 7 captions as a list (`<ol>`), each with its label.

### 3.3 Styles (`#aliran`), v2: pinned horizontal walk

Page order (v2): 3.1 Hero, 3.2 Breakdown, 3.3 Aliran, 3.5 Gudang part, 3.6 Motor harian, 3.4 Closing.

- Every aliran comes from the catalog (`STYLES`, `STYLE_NAMES`, `PRESETS`); nothing is hardcoded, so new styles appear by themselves. Copy per card lives in `src/components/landing/copy.ts`; a style without hand-written copy shows its real preset ("Set awalnya: rangka ..., tangki ..., jok ..., stang ...") instead of invented character.
- Pinned (`h-dvh`, ScrollTrigger `start: "top top"`, scrub 0.6): heading top-left, then a horizontal row of cards (width `min(84vw, 330px)`). Vertical scroll pans the row left (M15). The card in the left slot is the active aliran: it lifts (M16), gets a 2px ink frame and `aria-current`, and the fixed bike swaps to that preset in Cat mode (M7 pop on changed parts). A dimension-style ruler under the row fills as the walk progresses (M17), `aria-hidden`.
- Card: H3 style name, the style copy (max 3 lines; first four styles use the v1 copy below, the rest `STYLE_BLURB`), from 640px up four preset rows (Rangka, Tangki, Jok, Stang) as a `dl`, CTA **Mulai rakit** (`aria-label` "Mulai rakit dari preset {style}") to `/garage?style={style}`.
- Desktop: the card row runs inside the left 44% column (clipped, the next card fades out at the column edge) and the bike stays clear in the right 60% (same framing as the hero). Phone/tablet: full-width row at the bottom, the bike framed into the window between heading and cards.
- Keyboard: Tab into an off-screen card's CTA scrolls the walk so that card sits in the active slot (focus is never on an invisible element).
- Reduced motion / no WebGL: no pin. The v1 tabs below stay as the fallback, now listing every catalog style (2 columns, 3 from 640px).

#### v1 tabs (fallback only)

- Bike reassembled in 3/4 view, shown in **Cat** mode (the only place the landing shows paint, so visitors learn both modes exist). Default paint `DEFAULT_BUILD.paint`.
- Layout desktop: tab list (4 tabs) left column, the active style's copy under it, bike right. Below 1024: tabs as a 2 x 2 grid of 44px+ buttons above the bike, copy below the bike on a plate.
- H2: **Pilih alirannya dulu.**
- Body: "Tiap aliran memasang satu set part awal. Setelah itu semuanya bisa kamu ganti di garasi."
- Tabs (WAI-ARIA tabs pattern) and panel copy:
  - Cafe racer: "Nunduk, ramping, buntut jok naik. Clip-on dan tangki teardrop, dibikin buat ngebut pendek dari satu kafe ke kafe lain."
  - Bobber: "Yang nggak perlu dipotong. Hardtail, jok solo di atas per, stang drag, posisi rendah."
  - Scrambler: "Knalpot naik ke samping, ban pacul, stang lebar. Siap lewat jalan tanah."
  - Brat: "Jok rata panjang, tangki flat box, tampilan bersih tanpa basa-basi."
- Each panel has one CTA, visible text **Mulai rakit**, `aria-label` "Mulai rakit dari preset {style}", to `/garage?style={style}`. Reason: same intent and same label as the hero CTA (no duplicate-intent labels).
- Tab change: M7; the bike swaps to that preset's parts.

### 3.4 Closing title block (`#garasi`)

- Solid `--paper` background (covers the fixed canvas), section padding 128 / 64.
- A large title block (full content width, max 1080px), 2px ink frame:
  - Top cell spanning full width: H2 **Meja gambar sudah siap.** and body "Rakit di garasi, simpan, lalu kirim satu link ke bengkel atau ke grup tongkrongan. Nggak pakai daftar akun."
  - Bottom row cells: `DIGAMBAR OLEH` "Kamu" / `DIPERIKSA` "Bengkel langgananmu" / `SKALA` "Tidak diskala" / a cell holding the primary CTA **Mulai rakit** to `/garage`.
  - Below 640px the cells stack, CTA cell last and full width.
- No motion beyond hover/press.

### 3.5 Gudang part (`#gudang`)

- Purpose: the whole parts catalog in one place, and which aliran use each option as a starting part. All data is derived: groups from `GROUPS`, options from `PART_OPTIONS`, names from `OPTION_NAMES`, "Part awal aliran" from `PRESETS`. No counts, no ratings.
- H2: **Isi gudang part.** Body: "Semua yang bisa kamu pasang di garasi, per grup. Tiap pilihan ditandai aliran mana yang memakainya dari awal."
- Section tabs (WAI-ARIA tabs, automatic activation) from `SECTIONS` (Rangka & kaki-kaki, Mesin & knalpot, Bodi, Lampu & kelistrikan, Kokpit), wrapping chips. Inside the tab panel (a 2px ink plate) a row of group buttons for that section (`aria-pressed`, mono number + name, e.g. "01 Rangka"); opening a section selects its first group.
- Option plates for the selected group (2 columns from 640px): option name in display 600, mono label "Part awal aliran", then the aliran names, or "Belum ada. Pasang sendiri di garasi." when no preset uses it. Groups with two keys (Roda & ban) show sub-labels from `PART_KEY_LABEL`.
- Desktop (>= 1024): the section is transparent and sits in the left 40% (so the 3D callout plate is never covered); while it is on screen the selected group is the highlighted part on the fixed bike (accent edges and callout), so picking a group points at the part. Below 1024 the section has a solid `--paper` ground (the bike is framed elsewhere there).
- Motion: M18 on tab change, M19 highlight.

### 3.6 Motor harian (`#harian`)

- Purpose: Indonesian daily custom culture. Custom is not only for old bikes; 150-class daily bikes are built up slowly.
- H2 (two masked lines, M20): **Motor harian juga layak digambar.**
- Body: "Custom nggak harus nunggu motor tua. Motor 150-an yang tiap hari dipakai ke kantor atau kampus juga bisa digarap pelan-pelan: jok dulu, lalu stang, knalpot, dan ban."
- Note (ink-muted, solid paper ground): "Motor dasar ini bisa kamu pilih sebagai basis di garasi. Isi silinder sesuai spesifikasi pabrik; gambarnya tetap gambar gaya, bukan replika pabrik."
- One sheet per donor base in the catalog (`BASES` minus `custom`), stepped like sheets laid on a table (indent i x 6% on desktop, flush on phones). Each is a small title block: `MOTOR DASAR` `BASE_NAMES` (factual base name only, no logos), `CATATAN` `BASE_NOTES` (the catalog's checked specs), and `ISI SILINDER` with a dimension line drawn to scale against the largest base (M21). The cc numbers for the line live in Landing.tsx next to a comment pointing at `BASE_NOTES`:

| Base | Isi silinder |
|---|---|
| Harian 150 | 150 cc |
| W175 | 177 cc |
| XSR 155 | 155 cc |
| Ronin | 225,9 cc |

  Ronin is not 150cc (its note says so), which is why the body copy says "150-an" for the class, not for every base.

### 3.7 Landing rhythm check

Six layout families: pinned split stage (3.1), pinned stage with docked caption (3.2), pinned horizontal walk (3.3), tabs + plate grid beside the model (3.5), editorial split with stepped sheets (3.6), full-width title block form (3.4). Only one eyebrow-like element (mono step labels inside 3.2, which are part numbers, not section eyebrows). No FAQ, testimonials, stats or logo bars.

---

## 4. Configurator `/garage`

### 4.1 Initial config resolution

1. `?from=<slug>`: fetch `GET /api/builds/<slug>`; on success use its `config`; on 404 show the "build tidak ditemukan" banner (6.6) and fall back to step 3.
2. `?style=<style>`: `DEFAULT_BUILD` with that style and its preset parts (2.3).
3. Draft in localStorage `jac:draft:v1`, parsed with `BuildConfigSchema.safeParse`; invalid drafts are discarded silently.
4. `DEFAULT_BUILD`.

Every config change is written to `jac:draft:v1` (debounced 300ms). Reason: a refresh never loses a build (error handling that prevents data loss). After resolving params, remove them from the URL with `router.replace("/garage")` so a refresh uses the draft.

### 4.2 Layout: desktop (>= 1024)

```
+--------------------------------------------------------------------------+
| header: logo | Garasi | Kalkir/Blueprint | [Simpan & bagikan]             |
+---------------------------------------------------+----------------------+
| CANVAS (fills, min 600px wide)                    | RAIL 400px (440 at   |
|  top-left: title block (Gaya, Revisi Δ,           |   >=1440), --paper-  |
|            build name or "Belum diberi nama")     |   sunk bg, own scroll|
|                                                   |                      |
|                                                   | [Part] [Cat] tabs    |
|                                                   |  Part tab:           |
|                                                   |   Aliran (4 chips)   |
|                                                   |   01 Rangka ...      |
|  bottom toolbar (plate):                          |   ... 07 Mesin       |
|  [Utuh|Bongkar] [Garis|Cat] [Samping 3/4 Depan    |  Cat tab:            |
|   Atas] [Reset kamera]                            |   Tangki/Rangka/Aksen|
+---------------------------------------------------+   Finish             |
                                                    +----------------------+
```

- Canvas height `calc(100dvh - 64px)`, rail same height with `overflow-y: auto`. No Lenis on this page.
- Rail tabs: "Part" and "Cat" (WAI-ARIA tabs). Reason: keeps both groups one click away without a long scroll.
- **Part tab:**
  - "Aliran" radio group of 13 chips (2 columns) with the style blurb under it, then "Basis motor" (5 chips + donor note). Selecting a style applies the preset (2.3) immediately and shows an undo toast: "Preset Bobber dipasang." with button **Batalkan** (restores the previous parts), auto-dismiss after 8s, `role="status"`. Reason: undo beats a confirm dialog and never silently destroys custom picks.
  - If the user changes any part afterwards, the style stays as chosen (the schema stores it as the declared aliran).
  - Below that a soft-rule status line ("Keluar pakem Cafe racer: ban Pacul (knobby). Boleh, asal disengaja.") when picks break the style's "do not include" list; the offending chip gets a dashed border and its accessible name says so.
  - v2: the 24 groups sit in five collapsible sections (button headers with `aria-expanded`, part count, +/-): Rangka & kaki-kaki, Mesin & knalpot, Bodi, Lampu & kelistrikan, Kokpit. The section holding the active group starts open; any number can be open. Same on every breakpoint, which keeps the phone scroll short. Each group: header row with mono number + rail heading + current option name (right-aligned, ink-muted); below it a radio group of option chips (wrap). Roda & ban has two radio groups with sub-labels "Pelek" and "Ban".
  - Focusing or hovering a group (`focusin`/`pointerenter`) sets it as the **active part**: accent edges in 3D and its callout plate. Leaving the rail clears it. Reason: the user always sees which part a control drives.
- **Cat tab:** three swatch groups "Tangki", "Rangka", "Aksen" (8 swatches + "Warna lain" each), then "Finish" radio chips Kilap / Doff / Metalik. Changing any paint switches the render to **Cat** if it was on Garis, with the toolbar toggle updating. Reason: paint picks are invisible in Garis mode.
- **Kualitas** (garage toolbar, after the camera controls): radio group "Otomatis / Tinggi / Rendah" (arrow keys, 44px targets), drives `setQualityMode`, remembered per viewer in localStorage; wraps to its own row at 390px.
- **Toolbar** (plate at canvas bottom-left, 16px inset): segmented "Utuh | Bongkar" (`aria-pressed` pair), segmented "Garis | Cat", camera presets as four buttons, "Reset kamera" (center-mark symbol + text). All 44px tall.
- Canvas region: `role="img"` wrapper with `aria-label` built from the config, e.g. "Gambar 3D motor Cafe racer: rangka Double cradle, mesin Parallel twin, tangki Teardrop, jok Cafe hump, knalpot Low pipe, stang Clip-on, pelek Jari-jari, ban Street. Tampilan utuh, mode garis." The interactive canvas element inside is focusable (`tabindex="0"`) for keyboard orbit (7.2).

### 4.3 Layout: tablet (640 to 1023)

- Canvas full width, sticky under the header, height 52dvh. Toolbar at its bottom edge, wraps to two rows if needed.
- Below it the rail content in a two-column grid: left column Part tab content, right column Cat content, no tabs. Reason: at this width both fit side by side and tabs would hide half the controls.

### 4.4 Layout: mobile (< 640)

- Canvas sticky under the header, height 45dvh (min 280px). Toolbar compact inside the canvas bottom: "Utuh | Bongkar", "Garis | Cat", and a "Kamera" button that opens a small menu (Samping, 3/4, Depan, Atas, Reset). Each target 44px.
- Below the canvas: tabs "Part" / "Cat" (full width, 48px), then the content in page flow (the page scrolls, the canvas stays visible). Part groups are an accordion: only the active group is expanded; tapping a group header expands it and makes it the active part. Reason: the drawing stays in view while the thumb works below.
- Only the active part's callout plate is shown (DESIGN 7.6).
- No fixed bottom bar; "Simpan" lives in the header.

### 4.5 Save and share flow

Trigger: header "Simpan & bagikan". Opens a modal `<dialog>` (native `showModal()`), title **Simpan build**.

Form (step 1):
- "Nama build" (required, 1 to 60 chars, live counter "12/60" in mono under the field, prefilled with the last used name if any). Validation on submit and on blur: empty shows "Kasih nama dulu, minimal satu huruf."
- "Nama builder atau bengkel" (optional, max 40, helper "Boleh dikosongkan. Muncul di halaman build.").
- Buttons: **Simpan build** (primary), **Batal** (secondary). Enter submits.
- Note under buttons (small, ink-muted): "Tiap simpan bikin link baru. Link lama tetap menampilkan versi lamanya." Reason: builds are immutable; say it before they share.
- Request: `POST /api/builds` with `CreateBuildSchema` payload (`builder` omitted when empty).

Saving: button label "Menyimpan...", `aria-busy="true"`, fields `readonly`, Batal disabled, Escape ignored until the request settles (max 15s client timeout, then treated as an error). Reason: closing mid-request would hide the result.

Success (step 2, same dialog, focus moves to the URL field):
- Title **Build tersimpan.**
- Read-only text field with the full URL `${origin}/b/${slug}` (mono), selected on focus.
- Buttons: **Salin link** (primary), **Buka halaman build** (secondary link to `/b/{slug}`, same tab), and when `navigator.share` exists, **Bagikan...** (calls `navigator.share({ title: name, url })`, AbortError ignored).
- After copy: button text becomes "Link tersalin" for 2.5s, and a polite live region announces "Link tersalin ke clipboard." If the Clipboard API fails: select the field text and show "Nggak bisa nyalin otomatis. Link sudah ditandai, tekan Ctrl+C atau tahan lalu pilih Salin."
- **Tutup** closes. Focus returns to the header button.

Errors (inline at the top of the form, `role="alert"`, redline style: `--paper-raised` plate with a 2px `--accent` frame, message text in `--ink`, prefixed by the word "Gagal" in accent mono label style; never a colored left stripe):

| Response | Message | Action |
|---|---|---|
| 400 / validation | "Ada isian yang belum pas." plus the field message under the field | Fix and resubmit |
| 429 | "Terlalu sering menyimpan. Tunggu sebentar, lalu coba lagi." | **Coba lagi** |
| 503 `{ error: "backend_not_configured" }` | "Simpan belum aktif di server ini, jadi link belum bisa dibuat. Build-mu tetap tersimpan di browser ini." | Only **Tutup** (no retry) |
| other 5xx, network, timeout | "Gagal menyimpan. Koneksi atau server lagi bermasalah. Build-mu masih ada di sini, coba simpan lagi." | **Coba lagi** |

The 503 `backend_not_configured` code is the backend contract for "Supabase env missing" (confirmed in src/app/api/builds). Note: `getBuild()` throws when env is missing, so `/b/[slug]` must catch that and show this state.

### 4.7 Panduan (guided tour)

- Purpose: first-visit orientation for the control areas, pointing at the real controls.
- Opens automatically on the first visit, once the config is resolved and the canvas has settled (ready or failed), so it never competes with the loader. Done state: `localStorage["jac:tour:v1"] = "done"` (read and write in try/catch; blocked storage means it may show again, which is harmless). Finishing, skipping, or Escape all mark it done.
- Reopen: **Panduan** button (44px, `btn-tool`) at the top-right of the canvas on every width.
- Steps (targets are `data-tour` attributes, first visible match wins):

| # | Target | Title | Body |
|---|---|---|---|
| 1 | `style` (falls back to `parts`) | Mulai dari aliran. | Pilih aliran di sini. Satu set part awal langsung terpasang, dan masih bisa dibatalkan dari notifikasi yang muncul. |
| 2 | `parts` | Ganti part satu per satu. | Tiap grup dari rangka sampai mesin punya pilihannya sendiri. Part yang lagi kamu atur ditandai warna meni di gambar. |
| 3 | `paint` (Cat tab on phone/desktop, Cat column on tablet) | Cat tangki, rangka, dan aksen. | Warna dan finish ada di bagian Cat. Begitu kamu pilih warna, gambarnya pindah ke mode Cat. |
| 4 | `explode` | Utuh atau dibongkar. | Bongkar memisahkan tiap part lengkap dengan garis rakitnya, jadi kelihatan apa nempel di mana. |
| 5 | `render` | Garis atau Cat. | Garis menampilkan gambar teknik. Cat menampilkan warna dan finish pilihanmu. |
| 6 | `camera` (preset group, or the Kamera menu on phones) | Ganti sudut pandang. | Pilih Samping, 3/4, Depan, atau Atas. Gambarnya juga bisa digeser buat diputar. |
| 7 | `save` | Simpan, lalu kirim link-nya. | Kasih nama build-mu, lalu salin link-nya buat bengkel langganan atau grup tongkrongan. |

- Coachmark: a 2px ink frame around the target (clipped to the viewport for tall panels), a leader line with a dot from the frame to the plate (DESIGN 7.6 form), and the plate (`--paper-raised`, 2px ink, offset plate) placed below the target, else above, else docked to the bottom of the viewport. Width `min(380px, 100vw - 32px)`, 16px from every edge. It follows the target every frame (sticky canvas, rail scroll). The target is scrolled into view with `block: "nearest"` so the rail's scroll margins keep it clear of the sticky canvas.
- Plate content: mono "Panduan 3/7" (screen readers hear "Panduan, langkah 3 dari 7"), title (h3 size), body, then buttons: **Lewati panduan** (text button, hidden on the last step), **Kembali** (from step 2), **Lanjut** / **Selesai** (solid ink, not accent). All 44px.
- Accessibility: non-modal `role="dialog"` (`aria-modal="false"`) labelled by the title and described by the body; the page stays usable, nothing is trapped. Focus moves to the plate on open; step text sits in a polite live region so changes are announced; Escape closes (unless the native save dialog is open, which owns Escape); focus returns to the Panduan button on close.
- If the page is hidden by Activity (navigation), the step resets.

### 4.6 3D interaction on `/garage`

- Pointer: drag to orbit, wheel/pinch to zoom (limits in DESIGN 7.4). No click-to-select on meshes. Reason: selection lives in the rail where it is accessible; avoids accidental picks while orbiting.
- Any part/paint change re-renders (demand frameloop) and plays M8.

---

## 5. Shared build `/b/[slug]`

Server component fetches the build (`GET /api/builds/[slug]` or the same data function), validates `config` with `BuildConfigSchema.safeParse`.

Layout desktop (>= 1024): two columns. Left 7/12: canvas (height 70dvh) with the same toolbar as `/garage` but no rail, orbit enabled. Right 5/12: title block and BOM.
Below 1024: canvas on top (52dvh), then title block, then BOM, full width.

- Title block: `JUDUL` build name (H1, `--text-h2` size), `DIRAKIT OLEH` builder or "Tanpa nama", `GAYA` style label, `TANGGAL` `created_at` formatted with `Intl.DateTimeFormat("id-ID", { dateStyle: "long" })`, `REVISI` Δ.
- BOM "Daftar part" (a real `<table>`, caption "Daftar part"): columns `NO.` (`JAC-01`...), `PART`, `PILIHAN`. Rows follow 2.1; Roda & ban is two rows (Pelek, Ban). Then a "Cat" table: Tangki, Rangka, Aksen each with a 24px swatch, name (if it matches a swatch in 2.4, else "Custom") and hex in mono; plus Finish. Rules: 1px ink outer frame, 1px column rules, header row bottom rule only (no hairline under every row). Reason: a bill of materials is the drafting artifact; column rules keep it scannable.
- Actions under the BOM: **Salin link** (same copy behavior as 4.5) and **Rakit versi saya** (secondary, to `/garage?from={slug}`, loads it as the starting point; the original stays unchanged).

---

## 6. UI states (all pages)

| # | State | Where | What the user sees | Notes |
|---|---|---|---|---|
| 6.1 | Loading 3D | Any canvas | The grid ground plus a centered mono line "Menyiapkan meja gambar..." and the ground line drawing in (M2) | `role="status"`. No spinner. Replaced on R3F `onCreated`. Page text and controls render immediately (canvas is `next/dynamic` with `ssr: false`). |
| 6.2 | WebGL unsupported or context lost | Any canvas | Plate in the canvas area: "Browser ini nggak bisa menampilkan 3D (WebGL mati atau nggak didukung). Pilihan part dan cat tetap bisa diatur dan disimpan." On `/b`: "...Daftar part di bawah tetap lengkap." | Detect with a WebGL context probe before mounting and an error boundary around `<Canvas>`. `/garage` keeps the rail fully working; landing falls back to the static list layout of 3.2. |
| 6.3 | Saving | Save dialog | 4.5 saving state | |
| 6.4 | Save error | Save dialog | 4.5 error table | Draft is never cleared on error. |
| 6.5 | Link copied | Save dialog, `/b` | "Link tersalin" label for 2.5s + live region | |
| 6.6 | Build not found | `/b/[slug]` (404) and `/garage?from=` | `/b`: page with header, title block reading `JUDUL` "Build nggak ketemu" and body "Link-nya mungkin salah ketik atau kepotong. Coba cek lagi ke yang ngirim." with **Mulai rakit** to `/garage`. `/garage`: dismissible banner above the rail "Build dari link itu nggak ketemu. Kamu mulai dari draft terakhir." | Use Next `not-found.tsx` for `/b/[slug]`, HTTP 404. |
| 6.7 | Backend not configured | Save dialog (503), `/b/[slug]` | `/b`: "Halaman build belum bisa dibuka karena penyimpanan di server ini belum disambungkan." with **Mulai rakit** | HTTP 503 page, not 404. |
| 6.8 | Stored build fails schema | `/b/[slug]` | "Data build ini rusak, jadi nggak bisa digambar." with **Mulai rakit** | Log server-side. |
| 6.9 | Fetch error | `/b/[slug]`, `/garage?from=` | "Build belum bisa dimuat. Coba muat ulang halaman ini." with **Muat ulang** button (`router.refresh()`) | `/b` uses `error.tsx`. |
| 6.10 | Empty | n/a | The configurator always has a full config (DEFAULT_BUILD), so there is no empty build; the only "empty" field is the build name, shown in the canvas title block as "Belum diberi nama". | |
| 6.11 | Preset applied | `/garage` | Undo toast (4.2) | |
| 6.13 | Opening the drawing (loader) | `/garage`, `/b/[slug]` (first load and client navigation) | Full-width sheet below the header: a side-elevation drawing drafts itself (sheet border, ground, wheels, frame, centerlines, wheelbase dimension, leader lines 01 RANGKA / 07 MESIN) above a title block `JUDUL` (Garasi, or the build name; "Build kiriman" while `/b` data loads), `SKALA` Tidak diskala, `REVISI` revision symbol, `STATUS` "Menyiapkan meja gambar..." then "Meja gambar siap." | Ends on the canvas ready/failed signal from `BikeStage`, never on a fixed timer; 900ms floor against a flash. WebGL off or context lost ends it into 6.2. The status cell is `role="status"`. It never traps focus: focus moving into the page, or any press on it, removes it at once. The header stays above it. The `/b` Suspense fallback and the stage loader share one drawing (the second resumes the first). `<noscript>` hides it. Reduced motion: drawing shown complete, 150ms fade out. Motion L1 to L4. |
| 6.12 | Invalid custom hex | Cat tab | Field error "Format warna harus #RRGGBB, contoh #8A1F17." The previous color stays applied | |

---

## 7. Keyboard and focus

### 7.1 General

- Tab order follows visual order: skip link, header (logo, Garasi, theme, Simpan), then main. On `/garage`: canvas toolbar, canvas, rail tabs, rail content. On `/b`: canvas toolbar, canvas, title block, BOM actions.
- Focus ring per DESIGN 5.5 on every focusable, both themes.
- Radio groups (Aliran, part options, finish, swatches): one tab stop per group, arrow keys move and select (roving `tabindex`), `role="radiogroup"` with `aria-labelledby` the group heading. Swatches: `role="radio"`, `aria-label` "Merah marun, #8A1F17".
- Tabs (rail, landing styles): arrow keys move, Home/End jump, automatic activation.
- Segmented toggles (Utuh/Bongkar, Garis/Cat): two buttons with `aria-pressed`, each its own tab stop. Reason: only two options; simple buttons are clearer than a radiogroup.
- Accordion headers (mobile parts): `<button aria-expanded aria-controls>`.
- Kamera menu (mobile): button with `aria-haspopup="menu"`, arrow keys within, Escape closes and returns focus.
- Toast "Batalkan": reachable by Tab while visible; does not steal focus; timer pauses while it has focus or hover.

### 7.2 Canvas keyboard (when the canvas element has focus)

| Key | Action |
|---|---|
| Left / Right | Orbit 15 degrees around Y |
| Up / Down | Tilt 10 degrees (within polar limits) |
| `+` / `-` | Zoom in / out one step |
| `1` `2` `3` `4` | Samping, 3/4, Depan, Atas |
| `0` | Reset kamera |
| `E` | Toggle Utuh / Bongkar |

A visually hidden hint is the canvas `aria-describedby`: "Panah untuk memutar, plus dan minus untuk zoom, angka 1 sampai 4 untuk sudut pandang." Keys are ignored when focus is elsewhere. Lenis/scroll must not capture arrows while the canvas is focused (`preventDefault` only for handled keys).

### 7.3 Dialog

- Opens with focus on "Nama build". Focus trapped (native `showModal()`). Escape and Tutup/Batal close, except while saving. Backdrop click closes only in step 1 and step 2, not while saving. Focus returns to the trigger.
- `aria-labelledby` the dialog title; the error plate is `role="alert"`; copy feedback uses a separate `aria-live="polite"` region.

### 7.4 Landing with keyboard

- During the pinned breakdown, all captions exist in the DOM as an `<ol>` that is visually swapped; focus is not moved by scroll. Screen readers read the full list (inactive captions are visually hidden with a clip technique, not `display: none`). Reason: the story is fully available without scrolling precision.
- "Lihat bongkarannya" moves focus to the `#bongkar` heading (`tabindex="-1"` on the heading).

---

## 8. Tap targets and touch

- Every interactive element is at least 44 x 44px (chips 44px tall, swatches 44px, toolbar buttons 44px, header controls 44px hit area even when the logo art is 32px), with at least 8px between adjacent targets.
- No hover-only behavior: active-part highlight also triggers on focus and on tap/expand.
- Canvas uses `touch-action: none` only on `/garage` and `/b` canvases (orbit needs it). The landing canvas is `pointer-events: none` so touch scrolling always works.
- Inputs: 16px font minimum (prevents iOS zoom); the dialog uses `max-height: 100dvh` with internal scroll so the on-screen keyboard never hides the focused field (`scrollIntoView({ block: "center" })` on focus).

## 9. Breakpoints

Set where the content breaks, mapped onto Tailwind defaults:

| Range | Name | What changes | Why here |
|---|---|---|---|
| < 640 | phone | Mark instead of wordmark; garage canvas 45dvh + tabbed controls with accordion; only active callout; title block cells stack; "Simpan" short label | The wordmark plus header controls stop fitting one row below about 600px. |
| 640 to 1023 | tablet | Wordmark; garage canvas 52dvh + two-column controls; landing stacks copy over the bike | The rail (360px min) plus a usable canvas (600px min) do not fit side by side. |
| >= 1024 | desktop | Side rail 400px; landing split stage with view offset | First width where rail + canvas both fit. |
| >= 1440 | wide | Rail 440px, content max 1320px | Keeps line length under 65ch and the bike from getting tiny relative to the screen. |

Verify at 360, 390, 768, 1024, 1280 and 1440 widths, both themes, and at 200% zoom: no horizontal scroll, no clipped text.

## 10. Frontend must not miss

1. Replace the scaffold: Geist fonts, `font-family: Arial`, `lang="en"`, "Create Next App" metadata, `src/app/favicon.ico`.
2. One accent only, at the places listed in DESIGN 3.4. Focus ring is ink.
3. Reduced motion: no Lenis, no pin, static exploded drawing plus caption list.
4. Draft autosave `jac:draft:v1` and the undo toast for presets.
5. 503 `backend_not_configured` handling in both the save dialog and `/b/[slug]`.
6. The landing canvas never receives pointer events; the garage canvas is keyboard operable.
7. All strings in this doc are final copy. If new copy is needed, keep the bengkel voice and run a dash check (no em dash U+2014, no en dash U+2013).
