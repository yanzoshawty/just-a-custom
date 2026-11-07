import { PART_OPTIONS, type PartKey } from "@/lib/build-schema";
import { OPTION_NAMES, PRESETS, STORY_GROUPS, STYLE_BLURB, STYLE_NAMES, STYLES, type GroupId, type Style } from "@/lib/catalog";

// Final copy from docs/UX-SPEC.md 3.2. Option lists are derived from the catalog, so new parts show up by themselves.
const CAPTION_COPY: Partial<Record<GroupId, { title: string; body: string }>> = {
  frame: {
    title: "Semua mulai dari rangka.",
    body: "Rangka nentuin posisi semua part lain. Double cradle buat cafe racer klasik, trellis yang rangkanya sengaja kelihatan, atau hardtail tanpa per belakang buat bobber.",
  },
  tank: {
    title: "Tangki bikin siluet.",
    body: "Dari samping, tangki yang paling dulu kelihatan. Teardrop yang membulat, peanut yang ramping, atau flat box ala brat.",
  },
  seat: {
    title: "Jok ngatur garis belakang.",
    body: "Cafe hump dengan buntut naik, solo bobber yang duduk di atas per, atau brat flat yang rata sampai ujung.",
  },
  handlebar: {
    title: "Stang ngatur posisi badan.",
    body: "Clip-on bikin nunduk, drag bar lurus dan rendah, tracker bar lebar buat jalan tanah.",
  },
  wheels: {
    title: "Roda dan ban, beda jalan.",
    body: "Pelek jari-jari, racing, atau disc cover. Ban street buat aspal, ban pacul buat yang suka trabas.",
  },
  exhaust: {
    title: "Knalpot, lewat mana jalurnya.",
    body: "Low pipe lewat bawah, high pipe scrambler naik di samping jok, atau fishtail yang ujungnya melebar.",
  },
  engine: {
    title: "Jantungnya dipasang terakhir.",
    // second sentence holds: frame engine mounts follow the engine width (ENGINE_HALF in parts.tsx)
    body: "Single silinder, parallel twin, atau V-twin. Mesin yang kamu pilih ikut ngubah bentuk rangka di sekitarnya.",
  },
};

export const optionName = (id: string) => OPTION_NAMES[id] ?? id;
export const optionList = (k: PartKey) => (PART_OPTIONS[k] as readonly string[]).map((id) => ({ id, name: optionName(id) }));
export const optionsOf = (k: PartKey) => optionList(k).map((o) => o.name);

export const CAPTIONS = STORY_GROUPS.map((g) => ({
  id: g.id,
  label: `${g.no} ${g.label}`,
  title: CAPTION_COPY[g.id]?.title ?? g.heading,
  body: CAPTION_COPY[g.id]?.body ?? "",
  options: g.keys.map((k) => optionsOf(k).join(", ")).join(". "),
}));

// UX-SPEC 3.3 final copy for the first four; the rest use the catalog's STYLE_BLURB.
const STYLE_COPY: Partial<Record<Style, string>> = {
  "cafe-racer":
    "Nunduk, ramping, buntut jok naik. Clip-on dan tangki teardrop, dibikin buat ngebut pendek dari satu kafe ke kafe lain.",
  bobber: "Yang nggak perlu dipotong. Hardtail, jok solo di atas per, stang drag, posisi rendah.",
  scrambler: "Knalpot naik ke samping, ban pacul, stang lebar. Siap lewat jalan tanah.",
  brat: "Jok rata panjang, tangki flat box, tampilan bersih tanpa basa-basi.",
};

/** Parts that shape the silhouette most, shown on each aliran card. */
const SPEC_KEYS: { key: PartKey; label: string }[] = [
  { key: "frame", label: "Rangka" },
  { key: "tank", label: "Tangki" },
  { key: "seat", label: "Jok" },
  { key: "handlebar", label: "Stang" },
  { key: "exhaust", label: "Knalpot" },
  { key: "engine", label: "Mesin" },
];

export const ALIRAN = STYLES.map((s) => {
  const p = PRESETS[s] as Record<string, string>;
  const spec = SPEC_KEYS.filter((x) => p[x.key]).map((x) => ({ label: x.label, value: optionName(p[x.key]) }));
  return {
    id: s,
    name: STYLE_NAMES[s],
    blurb: STYLE_COPY[s] ?? STYLE_BLURB[s],
    spec,
  };
});

/** Which aliran start with this option, read from the presets (real data, nothing invented). */
export function presetsUsing(k: PartKey, option: string) {
  return STYLES.filter((s) => (PRESETS[s] as Record<string, string>)[k] === option).map((s) => STYLE_NAMES[s]);
}
