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

### 2.1 Part order, numbers, names

| No. | Mono label | Schema key(s) | Rail heading |
|---|---|---|---|
| 01 | RANGKA | `frame` | Rangka (frame) |
| 02 | TANGKI | `tank` | Tangki (tank) |
| 03 | JOK | `seat` | Jok (seat) |
| 04 | STANG | `handlebar` | Stang (handlebar) |
| 05 | RODA & BAN | `wheels`, `tires` | Roda & ban (two radio groups: "Pelek" and "Ban") |
| 06 | KNALPOT | `exhaust` | Knalpot (exhaust) |
| 07 | MESIN | `engine` | Mesin (engine) |

### 2.2 Option display names

| Key | id | Display name |
|---|---|---|
| frame | cradle | Double cradle |
| frame | trellis | Trellis |
| frame | hardtail | Hardtail |
| engine | single | Single silinder |
| engine | parallel-twin | Parallel twin |
| engine | v-twin | V-twin |
| tank | teardrop | Teardrop |
| tank | peanut | Peanut |
| tank | flat-box | Flat box |
| seat | cafe-hump | Cafe hump |
| seat | bobber-solo | Solo bobber |
| seat | brat-flat | Brat flat |
| exhaust | low-pipe | Low pipe |
| exhaust | high-scrambler | High pipe scrambler |
| exhaust | fishtail | Fishtail |
| handlebar | clip-on | Clip-on |
| handlebar | drag | Drag bar |
| handlebar | tracker | Tracker bar |
| wheels | spoke | Jari-jari |
| wheels | cast | Racing (cast) |
| wheels | disc | Disc cover |
| tires | street | Street |
| tires | knobby | Pacul (knobby) |
| finish | gloss | Kilap |
| finish | matte | Doff |
| finish | metal | Metalik |

Style labels: `cafe-racer` Cafe racer, `bobber` Bobber, `scrambler` Scrambler, `brat` Brat.

### 2.3 Style presets (choosing a style applies these parts; paint is left untouched)

| Style | frame | engine | tank | seat | exhaust | handlebar | wheels | tires |
|---|---|---|---|---|---|---|---|---|
| cafe-racer | cradle | parallel-twin | teardrop | cafe-hump | low-pipe | clip-on | spoke | street |
| bobber | hardtail | v-twin | peanut | bobber-solo | fishtail | drag | spoke | street |
| scrambler | cradle | single | peanut | brat-flat | high-scrambler | tracker | spoke | knobby |
| brat | trellis | parallel-twin | flat-box | brat-flat | low-pipe | tracker | cast | street |

`cafe-racer` equals `DEFAULT_BUILD.parts`. Reason for leaving paint alone: style is structure, paint is personal taste.

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

### 3.3 Styles (`#aliran`)

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

### 3.5 Landing rhythm check

Four different layout families: pinned split stage (3.1), pinned stage with docked caption (3.2), tabs + model (3.3), full-width title block form (3.4). Only one eyebrow-like element (mono step labels inside 3.2, which are part numbers, not section eyebrows).

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
  - "Aliran" radio group of 4 chips (style labels). Selecting a style applies the preset (2.3) immediately and shows an undo toast: "Preset Bobber dipasang." with button **Batalkan** (restores the previous parts), auto-dismiss after 8s, `role="status"`. Reason: undo beats a confirm dialog and never silently destroys custom picks.
  - If the user changes any part afterwards, the style stays as chosen (the schema stores it as the declared aliran).
  - Part groups in 2.1 order. Each group: header row with mono number + rail heading + current option name (right-aligned, ink-muted); below it a radio group of option chips (wrap). Roda & ban has two radio groups with sub-labels "Pelek" and "Ban".
  - Focusing or hovering a group (`focusin`/`pointerenter`) sets it as the **active part**: accent edges in 3D and its callout plate. Leaving the rail clears it. Reason: the user always sees which part a control drives.
- **Cat tab:** three swatch groups "Tangki", "Rangka", "Aksen" (8 swatches + "Warna lain" each), then "Finish" radio chips Kilap / Doff / Metalik. Changing any paint switches the render to **Cat** if it was on Garis, with the toolbar toggle updating. Reason: paint picks are invisible in Garis mode.
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
