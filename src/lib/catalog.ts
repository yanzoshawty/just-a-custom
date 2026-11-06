// Display copy and presets from docs/UX-SPEC.md section 2. Single source for every page.
import type { BuildConfig, PartKey } from "./build-schema";

export type Style = BuildConfig["style"];
export type Finish = BuildConfig["paint"]["finish"];
export type Parts = BuildConfig["parts"];

/** The 7 story groups (wheels + tires share one: "Roda & ban"). */
export type GroupId = "frame" | "tank" | "seat" | "handlebar" | "wheels" | "exhaust" | "engine";

export const GROUPS: { id: GroupId; no: string; label: string; heading: string; keys: PartKey[] }[] = [
  { id: "frame", no: "01", label: "RANGKA", heading: "Rangka (frame)", keys: ["frame"] },
  { id: "tank", no: "02", label: "TANGKI", heading: "Tangki (tank)", keys: ["tank"] },
  { id: "seat", no: "03", label: "JOK", heading: "Jok (seat)", keys: ["seat"] },
  { id: "handlebar", no: "04", label: "STANG", heading: "Stang (handlebar)", keys: ["handlebar"] },
  { id: "wheels", no: "05", label: "RODA & BAN", heading: "Roda & ban", keys: ["wheels", "tires"] },
  { id: "exhaust", no: "06", label: "KNALPOT", heading: "Knalpot (exhaust)", keys: ["exhaust"] },
  { id: "engine", no: "07", label: "MESIN", heading: "Mesin (engine)", keys: ["engine"] },
];

export const groupOf = (k: PartKey): GroupId => (k === "tires" ? "wheels" : (k as GroupId));

export const OPTION_NAMES: Record<string, string> = {
  cradle: "Double cradle",
  trellis: "Trellis",
  hardtail: "Hardtail",
  single: "Single silinder",
  "parallel-twin": "Parallel twin",
  "v-twin": "V-twin",
  teardrop: "Teardrop",
  peanut: "Peanut",
  "flat-box": "Flat box",
  "cafe-hump": "Cafe hump",
  "bobber-solo": "Solo bobber",
  "brat-flat": "Brat flat",
  "low-pipe": "Low pipe",
  "high-scrambler": "High pipe scrambler",
  fishtail: "Fishtail",
  "clip-on": "Clip-on",
  drag: "Drag bar",
  tracker: "Tracker bar",
  spoke: "Jari-jari",
  cast: "Racing (cast)",
  disc: "Disc cover",
  street: "Street",
  knobby: "Pacul (knobby)",
};

export const FINISH_NAMES: Record<Finish, string> = { gloss: "Kilap", matte: "Doff", metal: "Metalik" };

export const STYLES: Style[] = ["cafe-racer", "bobber", "scrambler", "brat"];
export const STYLE_NAMES: Record<Style, string> = {
  "cafe-racer": "Cafe racer",
  bobber: "Bobber",
  scrambler: "Scrambler",
  brat: "Brat",
};

export const PRESETS: Record<Style, Parts> = {
  "cafe-racer": { frame: "cradle", engine: "parallel-twin", tank: "teardrop", seat: "cafe-hump", exhaust: "low-pipe", handlebar: "clip-on", wheels: "spoke", tires: "street" },
  bobber: { frame: "hardtail", engine: "v-twin", tank: "peanut", seat: "bobber-solo", exhaust: "fishtail", handlebar: "drag", wheels: "spoke", tires: "street" },
  scrambler: { frame: "cradle", engine: "single", tank: "peanut", seat: "brat-flat", exhaust: "high-scrambler", handlebar: "tracker", wheels: "spoke", tires: "knobby" },
  brat: { frame: "trellis", engine: "parallel-twin", tank: "flat-box", seat: "brat-flat", exhaust: "low-pipe", handlebar: "tracker", wheels: "cast", tires: "street" },
};

export const SWATCHES: { name: string; hex: string }[] = [
  { name: "Merah marun", hex: "#8A1F17" },
  { name: "Merah meni", hex: "#B3361A" },
  { name: "Hijau army", hex: "#3B4A2F" },
  { name: "Biru dongker", hex: "#1E2F4F" },
  { name: "Emas pinstripe", hex: "#C9A227" },
  { name: "Putih tulang", hex: "#D8D2C4" },
  { name: "Abu primer", hex: "#6B6F72" },
  { name: "Hitam", hex: "#1A1A1A" },
];

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const swatchName = (hex: string) =>
  SWATCHES.find((s) => s.hex.toLowerCase() === hex.toLowerCase())?.name ?? "Custom";

export const PART_KEY_LABEL: Record<PartKey, string> = {
  frame: "rangka",
  engine: "mesin",
  tank: "tangki",
  seat: "jok",
  exhaust: "knalpot",
  handlebar: "stang",
  wheels: "pelek",
  tires: "ban",
};

/** Accessible description of the 3D drawing (UX-SPEC 4.2). */
export function describeBuild(c: BuildConfig, exploded: boolean, painted: boolean) {
  const p = c.parts;
  const order: PartKey[] = ["frame", "engine", "tank", "seat", "exhaust", "handlebar", "wheels", "tires"];
  const list = order.map((k) => `${PART_KEY_LABEL[k]} ${OPTION_NAMES[p[k]]}`).join(", ");
  return `Gambar 3D motor ${STYLE_NAMES[c.style]}: ${list}. Tampilan ${exploded ? "dibongkar" : "utuh"}, mode ${painted ? "cat" : "garis"}.`;
}
