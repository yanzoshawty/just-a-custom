// Display copy, presets and style rules (docs/UX-SPEC.md section 2). Single source for every page.
import { PART_OPTIONS, type BuildConfig, type PartKey } from "./build-schema.ts";

export type Style = BuildConfig["style"];
export type Base = BuildConfig["base"];
export type Finish = BuildConfig["paint"]["finish"];
export type Parts = BuildConfig["parts"];

/** One group per part category; wheels + tires share one ("Roda & ban"). */
export type GroupId = Exclude<PartKey, "tires">;
export type SectionId = "kaki" | "mesin" | "bodi" | "lampu" | "kokpit";

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "kaki", label: "Rangka & kaki-kaki" },
  { id: "mesin", label: "Mesin & knalpot" },
  { id: "bodi", label: "Bodi" },
  { id: "lampu", label: "Lampu & kelistrikan" },
  { id: "kokpit", label: "Kokpit" },
];

type Group = { id: GroupId; no: string; label: string; heading: string; keys: PartKey[]; section: SectionId };

const g = (id: GroupId, no: string, label: string, heading: string, section: SectionId, keys: PartKey[] = [id]): Group => ({
  id,
  no,
  label,
  heading,
  keys,
  section,
});

/**
 * 01 to 07 are the landing story order (rangka to mesin) and must stay first.
 * 08 onwards are the v2 categories.
 */
export const GROUPS: Group[] = [
  g("frame", "01", "RANGKA", "Rangka (frame)", "kaki"),
  g("tank", "02", "TANGKI", "Tangki (tank)", "bodi"),
  g("seat", "03", "JOK", "Jok (seat)", "bodi"),
  g("handlebar", "04", "STANG", "Stang (handlebar)", "kokpit"),
  g("wheels", "05", "RODA & BAN", "Roda & ban", "kaki", ["wheels", "tires"]),
  g("exhaust", "06", "KNALPOT", "Knalpot (exhaust)", "mesin"),
  g("engine", "07", "MESIN", "Mesin (engine)", "mesin"),
  g("fork", "08", "SHOCK DEPAN", "Shock depan (fork)", "kaki"),
  g("rearShock", "09", "SHOCK BELAKANG", "Shock belakang (rear shock)", "kaki"),
  g("fenderFront", "10", "SPAKBOR DEPAN", "Spakbor depan (front fender)", "kaki"),
  g("fenderRear", "11", "SPAKBOR BELAKANG", "Spakbor belakang (rear fender)", "kaki"),
  g("kickStarter", "12", "SELAHAN", "Selahan (kick starter)", "mesin"),
  g("gasCap", "13", "TUTUP TANGKI", "Tutup tangki (gas cap)", "bodi"),
  g("sideCover", "14", "TUTUP SAMPING", "Tutup samping (side cover)", "bodi"),
  g("cowl", "15", "FAIRING", "Fairing (cowl)", "bodi"),
  g("sissyBar", "16", "SISSY BAR", "Sissy bar", "bodi"),
  g("luggage", "17", "BAGASI", "Bagasi (luggage)", "bodi"),
  g("headlamp", "18", "LAMPU DEPAN", "Lampu depan (headlamp)", "lampu"),
  g("taillight", "19", "STOPLAMP", "Stoplamp (taillight)", "lampu"),
  g("signals", "20", "SEIN", "Sein (turn signal)", "lampu"),
  g("gauges", "21", "SPIDOMETER", "Spidometer (gauges)", "kokpit"),
  g("grips", "22", "HANDGRIP", "Handgrip (grips)", "kokpit"),
  g("mirrors", "23", "SPION", "Spion (mirror)", "kokpit"),
  g("footControls", "24", "FOOTSTEP", "Footstep (foot controls)", "kokpit"),
];

/** The seven landing story groups. */
export const STORY_GROUPS = GROUPS.slice(0, 7);

export const groupOf = (k: PartKey): GroupId => (k === "tires" ? "wheels" : k);

/** Option ids are unique across categories, except "none". */
// Null prototype: lookups by DB-sourced ids can never hit Object.prototype keys (audit-002 #3).
export const OPTION_NAMES: Record<string, string> = Object.assign(Object.create(null), {
  none: "Tanpa",
  // frame
  cradle: "Double cradle",
  "single-cradle": "Single cradle",
  trellis: "Trellis",
  backbone: "Backbone (deltabox)",
  hardtail: "Hardtail",
  raked: "Raked (stretch)",
  "board-track": "Board track rigid",
  softail: "Softail",
  // engine
  single: "Single silinder",
  "single-liquid": "Single liquid-cooled",
  "parallel-twin": "Parallel twin",
  "v-twin": "V-twin",
  boxer: "Boxer twin",
  "inline-four": "Inline four",
  // tank
  teardrop: "Teardrop",
  peanut: "Peanut",
  "flat-box": "Flat box",
  "cafe-dent": "Cafe (knee dent)",
  "cb-small": "CB kecil",
  coffin: "Coffin",
  fatbob: "Fat bob",
  airbox: "Airbox (sporty)",
  touring: "Touring besar",
  "board-slim": "Slim board track",
  // seat
  "cafe-hump": "Cafe hump",
  "bobber-solo": "Solo bobber",
  "brat-flat": "Brat flat",
  "jap-thin": "Japstyle tipis",
  "tracker-tail": "Tracker tail",
  "king-queen": "King & queen",
  "two-up": "Jok boncengan",
  "sf-kicked": "Buntut nungging",
  "board-saddle": "Sadel kulit",
  "touring-step": "Touring bertingkat",
  // exhaust
  "low-pipe": "Low pipe",
  "high-scrambler": "High pipe scrambler",
  fishtail: "Fishtail",
  "two-into-one": "2-into-1",
  shotgun: "Shotgun",
  "drag-pipes": "Drag pipe",
  megaphone: "Megaphone",
  "reverse-cone": "Reverse cone",
  underseat: "Underseat",
  stubby: "Stubby pendek",
  upswept: "Upswept (naik)",
  "true-duals": "True dual",
  // handlebar
  "clip-on": "Clip-on",
  clubman: "Clubman",
  drag: "Drag bar",
  tracker: "Tracker bar",
  "semi-hanger": "Semi hanger",
  camar: "Setang camar",
  ape: "Ape hanger",
  "z-bar": "Z-bar",
  beach: "Beach bar",
  drop: "Drop bar",
  // wheels
  spoke: "Jari-jari",
  cast: "Racing (cast)",
  disc: "Disc cover",
  mag: "Mag 70-an",
  billet: "Billet besar",
  // tires
  street: "Street",
  knobby: "Pacul (knobby)",
  "dual-sport": "Dual sport",
  "flat-track": "Flat track",
  gambot: "Gambot",
  whitewall: "Whitewall balon",
  radial: "Radial lebar",
  clincher: "Clincher tipis",
  // headlamp
  "round-7": "Bulat 7 inci",
  "round-575": "Bulat 5,75 inci",
  bates: "Bates kecil",
  "twin-lamp": "Lampu kembar",
  square: "Kotak",
  projector: "Projector LED",
  "plate-lamp": "Plat nomor + LED",
  // cowl
  "cafe-half": "Half fairing cafe",
  flyscreen: "Flyscreen (visor)",
  sharknose: "Sharknose",
  batwing: "Batwing",
  plate: "Plat nomor depan",
  // taillight
  lucas: "Lucas",
  "cat-eye": "Cat-eye",
  "led-strip": "LED strip",
  loop: "LED di loop",
  "side-mount": "Samping (side mount)",
  // signals
  bullet: "Bullet",
  "mini-led": "Mini LED",
  "bar-end-signal": "Ujung stang",
  // mirrors
  "bar-end-mirror": "Ujung stang",
  oval: "Oval",
  stem: "Tangkai bulat",
  // fork
  telescopic: "Teleskopik",
  gaiters: "Teleskopik + karet",
  usd: "Upside down (USD)",
  springer: "Springer",
  girder: "Girder",
  "leading-link": "Leading link",
  extended: "Teleskopik panjang",
  // rear shock
  "twin-shock": "Double shock",
  piggyback: "Piggyback",
  mono: "Monoshock",
  hidden: "Tersembunyi",
  // fenders
  short: "Pendek",
  high: "Tinggi (scrambler)",
  deep: "Dalam (valanced)",
  bobbed: "Bobbed",
  strut: "Strip rata",
  valanced: "Valanced",
  hugger: "Hugger",
  // side cover
  "oval-plate": "Plat oval",
  "rect-plate": "Plat kotak",
  "small-plate": "Plat kecil",
  "stock-tri": "Segitiga standar",
  // sissy bar
  tall: "Tinggi",
  pad: "Pakai sandaran",
  // gas cap
  monza: "Monza",
  aero: "Aero flush",
  flush: "Flush kecil",
  screw: "Ulir klasik",
  offset: "Monza geser kanan",
  // luggage
  rack: "Rak belakang",
  "hard-bags": "Hard bag",
  slant: "Tas kulit",
  ammo: "Kotak amunisi",
  // gauges
  chrono: "Bulat tunggal",
  "chrono-pair": "Bulat kembar",
  digital: "Digital kecil",
  nacelle: "Di batok lampu",
  // grips
  rubber: "Karet",
  closed: "Karet tutup ujung",
  knurled: "Alumunium knurling",
  leather: "Lilit kulit",
  // foot controls
  rearsets: "Underbone (rearsets)",
  mid: "Tengah (mid)",
  forward: "Maju (forward)",
  boards: "Papan (footboard)",
  "ft-peg": "Pendek flat track",
  // kick starter
  kick: "Pakai selahan",
});

export const FINISH_NAMES: Record<Finish, string> = {
  gloss: "Kilap",
  matte: "Doff",
  metal: "Metalik",
  candy: "Candy",
  flake: "Metalflake",
  satin: "Satin",
  patina: "Patina (rat)",
};
export const FINISHES = Object.keys(FINISH_NAMES) as Finish[];

export const STYLES: Style[] = [
  "cafe-racer",
  "bobber",
  "scrambler",
  "brat",
  "japstyle",
  "chopper",
  "flat-tracker",
  "street-tracker",
  "board-tracker",
  "rat-bike",
  "streetfighter",
  "bagger",
  "neo-retro",
];
export const STYLE_NAMES: Record<Style, string> = {
  "cafe-racer": "Cafe racer",
  bobber: "Bobber",
  scrambler: "Scrambler",
  brat: "Brat",
  japstyle: "Japstyle",
  chopper: "Chopper",
  "flat-tracker": "Flat tracker",
  "street-tracker": "Street tracker",
  "board-tracker": "Board tracker",
  "rat-bike": "Rat bike",
  streetfighter: "Streetfighter",
  bagger: "Bagger",
  "neo-retro": "Neo retro",
};

/** One line per style, for pickers and the landing (frontend may use or replace). */
export const STYLE_BLURB: Record<Style, string> = {
  "cafe-racer": "Garis tangki ke buntut jok lurus rata, clip-on rendah, footstep mundur.",
  bobber: "Rangka hardtail, jok solo di atas per, spakbor depan dicopot, ban balon.",
  scrambler: "Knalpot naik di samping, ban pacul, stang lebar, spakbor depan tinggi.",
  brat: "Jok rata panjang, tangki pendek, suspensi belakang tetap ada, knalpot naik.",
  japstyle: "Tangki kecil paling tinggi, jok tipis rata di bawahnya, ban gambot, sein dan spion tetap dipasang.",
  chopper: "Garpu panjang dengan rake curam, hardtail, ape hanger, sissy bar tinggi.",
  "flat-tracker": "Roda 19 depan belakang, plat nomor, tanpa lampu, tanpa spakbor depan.",
  "street-tracker": "Tracker yang legal di jalan: lampu di plat nomor, buntut naik, stang lebar.",
  "board-tracker": "Pembalap trek papan: rangka rigid panjang, roda besar tipis, stang turun.",
  "rat-bike": "Cat doff seadanya, part campur, kotak amunisi, tapi tetap utuh dan jalan.",
  streetfighter: "Motor sport tanpa fairing: lampu kembar, buntut tinggi, ban belakang lebar.",
  bagger: "Panjang dan rendah, batwing, hard bag, roda depan besar, satu warna menyatu.",
  "neo-retro": "Harian 150cc yang dibikin retro: lampu bulat LED, velg racing, buntut pendek rapi.",
};

export const STYLE_CODE: Record<Style, string> = {
  "cafe-racer": "CR",
  bobber: "BB",
  scrambler: "SC",
  brat: "BR",
  japstyle: "JP",
  chopper: "CH",
  "flat-tracker": "TR",
  "street-tracker": "ST",
  "board-tracker": "BT",
  "rat-bike": "RB",
  streetfighter: "SF",
  bagger: "BG",
  "neo-retro": "NR",
};

/* ---------------- base bikes (basis motor) ---------------- */

export const BASES: Base[] = ["custom", "harian-150", "w175", "xsr155", "ronin"];

/**
 * Factual donor labels. Specs checked 2026-11 against Indonesian/Indian spec listings
 * (zigwheels.co.id, autofun.co.id, oto.com, 91wheels, autocarpro): W175 177cc air-cooled SOHC
 * single, twin shock, 17in spoke; XSR 155 155cc liquid-cooled SOHC VVA single, upside-down fork,
 * monoshock, 17in tubeless; TVS Ronin 225.9cc oil-air single, 41mm USD, monoshock, 17in alloy.
 */
export const BASE_NAMES: Record<Base, string> = {
  custom: "Custom",
  "harian-150": "Harian 150",
  w175: "W175",
  xsr155: "XSR 155",
  ronin: "Ronin",
};
/** Displacement in cc (harian-150 is the generic 150cc class). Custom has no donor. */
export const BASE_CC: Partial<Record<Base, number>> = { "harian-150": 150, w175: 177, xsr155: 155, ronin: 225.9 };
export const BASE_NOTES: Record<Base, string> = {
  custom: "Rangka bebas, proporsi ikut aliran.",
  "harian-150": "Naked 150cc harian: single, monoshock, velg racing 17.",
  w175: "Kelas W175: 177cc single berpendingin udara, double shock, jari-jari 17.",
  xsr155: "Kelas XSR 155: 155cc single berpendingin cairan, USD, monoshock, velg racing 17.",
  ronin: "Kelas Ronin: 225,9cc single, USD, monoshock, velg racing 17. Bukan 150cc.",
};

/** What a donor brings: its engine, frame and running gear. Paint and body parts are untouched. */
export const BASE_PARTS: Record<Exclude<Base, "custom">, Partial<Parts>> = {
  "harian-150": { frame: "backbone", engine: "single-liquid", fork: "telescopic", rearShock: "mono", wheels: "cast" },
  w175: { frame: "cradle", engine: "single", fork: "telescopic", rearShock: "twin-shock", wheels: "spoke" },
  xsr155: { frame: "backbone", engine: "single-liquid", fork: "usd", rearShock: "mono", wheels: "cast" },
  ronin: { frame: "cradle", engine: "single", fork: "usd", rearShock: "mono", wheels: "cast" },
};

/** Donor keys a style overrides because they are its signature (a chopper keeps its raked frame). */
export const STYLE_SIGNATURE: Record<Style, PartKey[]> = {
  "cafe-racer": [],
  bobber: ["frame", "fork"],
  scrambler: ["fork"],
  brat: [],
  japstyle: ["rearShock", "wheels"],
  chopper: ["frame", "fork", "wheels"],
  "flat-tracker": ["wheels"],
  "street-tracker": [],
  "board-tracker": ["frame", "fork", "wheels"],
  "rat-bike": [],
  streetfighter: ["frame"],
  bagger: ["frame", "wheels"],
  "neo-retro": [],
};

export const PRESETS: Record<Style, Parts> = {
  "cafe-racer": {
    frame: "cradle", engine: "parallel-twin", tank: "cafe-dent", seat: "cafe-hump", exhaust: "reverse-cone", handlebar: "clip-on",
    wheels: "spoke", tires: "street", headlamp: "round-7", cowl: "none", taillight: "lucas", signals: "bar-end-signal",
    mirrors: "bar-end-mirror", fork: "telescopic", rearShock: "twin-shock", fenderFront: "short", fenderRear: "hugger",
    sideCover: "none", sissyBar: "none", gasCap: "monza", luggage: "none", gauges: "chrono-pair", grips: "rubber",
    footControls: "rearsets", kickStarter: "none",
  },
  bobber: {
    frame: "hardtail", engine: "v-twin", tank: "peanut", seat: "bobber-solo", exhaust: "fishtail", handlebar: "drag",
    wheels: "spoke", tires: "whitewall", headlamp: "bates", cowl: "none", taillight: "cat-eye", signals: "bullet",
    mirrors: "stem", fork: "springer", rearShock: "hidden", fenderFront: "none", fenderRear: "bobbed",
    sideCover: "none", sissyBar: "none", gasCap: "screw", luggage: "none", gauges: "nacelle", grips: "leather",
    footControls: "forward", kickStarter: "kick",
  },
  scrambler: {
    frame: "single-cradle", engine: "single", tank: "teardrop", seat: "two-up", exhaust: "high-scrambler", handlebar: "tracker",
    wheels: "spoke", tires: "knobby", headlamp: "round-575", cowl: "none", taillight: "led-strip", signals: "bullet",
    mirrors: "stem", fork: "gaiters", rearShock: "piggyback", fenderFront: "high", fenderRear: "bobbed",
    sideCover: "small-plate", sissyBar: "none", gasCap: "screw", luggage: "rack", gauges: "chrono", grips: "rubber",
    footControls: "mid", kickStarter: "kick",
  },
  brat: {
    frame: "cradle", engine: "parallel-twin", tank: "flat-box", seat: "brat-flat", exhaust: "upswept", handlebar: "tracker",
    wheels: "spoke", tires: "street", headlamp: "round-7", cowl: "none", taillight: "loop", signals: "mini-led",
    mirrors: "bar-end-mirror", fork: "gaiters", rearShock: "twin-shock", fenderFront: "short", fenderRear: "bobbed",
    sideCover: "stock-tri", sissyBar: "none", gasCap: "monza", luggage: "none", gauges: "digital", grips: "knurled",
    footControls: "mid", kickStarter: "none",
  },
  japstyle: {
    frame: "cradle", engine: "single", tank: "cb-small", seat: "jap-thin", exhaust: "low-pipe", handlebar: "semi-hanger",
    wheels: "spoke", tires: "gambot", headlamp: "round-575", cowl: "none", taillight: "led-strip", signals: "bullet",
    mirrors: "stem", fork: "gaiters", rearShock: "twin-shock", fenderFront: "short", fenderRear: "bobbed",
    sideCover: "stock-tri", sissyBar: "none", gasCap: "monza", luggage: "rack", gauges: "chrono", grips: "rubber",
    footControls: "mid", kickStarter: "kick",
  },
  chopper: {
    frame: "raked", engine: "v-twin", tank: "coffin", seat: "king-queen", exhaust: "drag-pipes", handlebar: "ape",
    wheels: "spoke", tires: "whitewall", headlamp: "bates", cowl: "none", taillight: "cat-eye", signals: "mini-led",
    mirrors: "stem", fork: "extended", rearShock: "hidden", fenderFront: "none", fenderRear: "strut",
    sideCover: "none", sissyBar: "tall", gasCap: "flush", luggage: "none", gauges: "nacelle", grips: "leather",
    footControls: "forward", kickStarter: "kick",
  },
  "flat-tracker": {
    frame: "single-cradle", engine: "single", tank: "cb-small", seat: "tracker-tail", exhaust: "two-into-one", handlebar: "tracker",
    wheels: "spoke", tires: "flat-track", headlamp: "none", cowl: "plate", taillight: "none", signals: "none",
    mirrors: "none", fork: "telescopic", rearShock: "piggyback", fenderFront: "none", fenderRear: "none",
    sideCover: "rect-plate", sissyBar: "none", gasCap: "monza", luggage: "none", gauges: "digital", grips: "knurled",
    footControls: "ft-peg", kickStarter: "kick",
  },
  "street-tracker": {
    frame: "cradle", engine: "parallel-twin", tank: "cb-small", seat: "tracker-tail", exhaust: "two-into-one", handlebar: "tracker",
    wheels: "cast", tires: "flat-track", headlamp: "plate-lamp", cowl: "none", taillight: "led-strip", signals: "mini-led",
    mirrors: "bar-end-mirror", fork: "usd", rearShock: "mono", fenderFront: "none", fenderRear: "hugger",
    sideCover: "oval-plate", sissyBar: "none", gasCap: "aero", luggage: "none", gauges: "digital", grips: "knurled",
    footControls: "rearsets", kickStarter: "none",
  },
  "board-tracker": {
    frame: "board-track", engine: "v-twin", tank: "board-slim", seat: "board-saddle", exhaust: "megaphone", handlebar: "drop",
    wheels: "spoke", tires: "clincher", headlamp: "none", cowl: "none", taillight: "none", signals: "none",
    mirrors: "none", fork: "girder", rearShock: "hidden", fenderFront: "none", fenderRear: "none",
    sideCover: "none", sissyBar: "none", gasCap: "screw", luggage: "none", gauges: "chrono", grips: "leather",
    footControls: "mid", kickStarter: "kick",
  },
  "rat-bike": {
    frame: "single-cradle", engine: "single", tank: "flat-box", seat: "bobber-solo", exhaust: "drag-pipes", handlebar: "z-bar",
    wheels: "spoke", tires: "gambot", headlamp: "square", cowl: "none", taillight: "side-mount", signals: "bullet",
    mirrors: "stem", fork: "leading-link", rearShock: "twin-shock", fenderFront: "none", fenderRear: "strut",
    sideCover: "none", sissyBar: "short", gasCap: "screw", luggage: "ammo", gauges: "chrono", grips: "rubber",
    footControls: "mid", kickStarter: "kick",
  },
  streetfighter: {
    frame: "trellis", engine: "inline-four", tank: "airbox", seat: "sf-kicked", exhaust: "underseat", handlebar: "tracker",
    wheels: "cast", tires: "radial", headlamp: "twin-lamp", cowl: "none", taillight: "led-strip", signals: "mini-led",
    mirrors: "bar-end-mirror", fork: "usd", rearShock: "mono", fenderFront: "none", fenderRear: "hugger",
    sideCover: "none", sissyBar: "none", gasCap: "aero", luggage: "none", gauges: "digital", grips: "knurled",
    footControls: "rearsets", kickStarter: "none",
  },
  bagger: {
    frame: "softail", engine: "v-twin", tank: "touring", seat: "touring-step", exhaust: "true-duals", handlebar: "semi-hanger",
    wheels: "billet", tires: "radial", headlamp: "round-7", cowl: "batwing", taillight: "led-strip", signals: "bullet",
    mirrors: "stem", fork: "telescopic", rearShock: "hidden", fenderFront: "deep", fenderRear: "valanced",
    sideCover: "stock-tri", sissyBar: "none", gasCap: "flush", luggage: "hard-bags", gauges: "nacelle", grips: "leather",
    footControls: "boards", kickStarter: "none",
  },
  "neo-retro": {
    frame: "backbone", engine: "single-liquid", tank: "teardrop", seat: "two-up", exhaust: "stubby", handlebar: "tracker",
    wheels: "cast", tires: "dual-sport", headlamp: "projector", cowl: "flyscreen", taillight: "led-strip", signals: "mini-led",
    mirrors: "bar-end-mirror", fork: "usd", rearShock: "mono", fenderFront: "short", fenderRear: "hugger",
    sideCover: "stock-tri", sissyBar: "none", gasCap: "aero", luggage: "rack", gauges: "digital", grips: "knurled",
    footControls: "mid", kickStarter: "none",
  },
};

/** Parts for `style` built on `base`: the donor's running gear unless the style's signature needs its own. */
export function presetFor(style: Style, base: Base): Parts {
  const p = { ...PRESETS[style] };
  if (base === "custom") return p;
  const keep = STYLE_SIGNATURE[style];
  for (const [k, v] of Object.entries(BASE_PARTS[base]) as [PartKey, string][]) if (!keep.includes(k)) (p as Record<string, string>)[k] = v;
  return p;
}

/** Re-applies the donor-controlled keys when the base changes; everything else the user picked stays. */
export function partsForBase(parts: Parts, style: Style, base: Base): Parts {
  const next = presetFor(style, base);
  const out = { ...parts };
  const donorKeys = new Set(Object.values(BASE_PARTS).flatMap((b) => Object.keys(b)) as PartKey[]);
  for (const k of donorKeys) (out as Record<string, string>)[k] = next[k];
  return out;
}

/* ---------------- style rules (soft constraints, report "do not include" lists) ---------------- */

type Clash = Partial<Record<PartKey | "finish", readonly string[]>>;
const all = (k: PartKey, except: string[] = ["none"]) => PART_OPTIONS[k].filter((o) => !except.includes(o));

export const CLASHES: Record<Style, Clash> = {
  "cafe-racer": {
    handlebar: ["tracker", "ape", "beach", "z-bar", "semi-hanger"],
    tires: ["knobby", "dual-sport", "flat-track"],
    exhaust: ["high-scrambler"],
    sideCover: ["oval-plate", "rect-plate"],
    seat: ["brat-flat", "two-up", "touring-step", "king-queen"],
    fenderFront: ["high"],
    footControls: ["forward", "boards"],
    cowl: ["batwing"],
    fork: ["extended", "springer"],
  },
  bobber: {
    fenderFront: ["short", "high", "deep"],
    fork: ["extended"],
    wheels: ["billet"],
    sissyBar: ["tall", "pad"],
    cowl: ["batwing", "cafe-half"],
    luggage: ["hard-bags"],
    handlebar: ["ape"],
    frame: ["raked", "trellis"],
  },
  scrambler: {
    handlebar: ["clip-on", "clubman"],
    footControls: ["rearsets"],
    seat: ["cafe-hump"],
    sideCover: ["oval-plate"],
    tires: ["flat-track", "radial"],
  },
  brat: {
    seat: ["cafe-hump", "bobber-solo"],
    handlebar: ["clip-on"],
    frame: ["hardtail", "raked", "board-track"],
    sideCover: ["oval-plate"],
  },
  japstyle: {
    cowl: ["cafe-half", "batwing"],
    handlebar: ["clip-on", "ape"],
    seat: ["sf-kicked", "cafe-hump"],
    exhaust: ["underseat"],
    tires: ["radial", "knobby"],
    fork: ["extended"],
    signals: ["none"],
    mirrors: ["none"],
    taillight: ["none"],
    fenderFront: ["high"],
  },
  chopper: {
    frame: ["cradle", "single-cradle", "trellis", "backbone"],
    fenderFront: ["short", "high", "deep"],
    cowl: all("cowl"),
    luggage: ["hard-bags"],
    fenderRear: ["valanced"],
    tires: ["radial"],
  },
  "flat-tracker": {
    fenderFront: ["short", "high", "deep"],
    headlamp: all("headlamp"),
    signals: all("signals"),
    tires: ["knobby"],
    handlebar: ["clip-on"],
    seat: ["cafe-hump", "brat-flat"],
    cowl: ["cafe-half", "batwing", "flyscreen", "sharknose"],
  },
  "street-tracker": {
    handlebar: ["clip-on"],
    seat: ["cafe-hump", "brat-flat"],
    fenderFront: ["high"],
    cowl: ["batwing"],
    luggage: ["hard-bags"],
  },
  "board-tracker": {
    fork: ["telescopic", "gaiters", "usd", "extended"],
    frame: ["cradle", "single-cradle", "trellis", "backbone", "softail"],
    headlamp: all("headlamp"),
    signals: all("signals"),
    mirrors: all("mirrors"),
    fenderFront: all("fenderFront"),
    fenderRear: ["bobbed", "valanced", "hugger"],
    wheels: ["cast", "mag", "billet"],
    tires: ["radial", "gambot", "knobby"],
    handlebar: ["ape", "tracker", "beach"],
    seat: ["king-queen", "touring-step", "two-up"],
  },
  "rat-bike": {
    finish: ["gloss", "candy", "flake"],
    cowl: ["batwing"],
  },
  streetfighter: {
    cowl: ["cafe-half", "batwing", "plate"],
    wheels: ["spoke"],
    tires: ["knobby", "gambot", "whitewall", "clincher", "dual-sport"],
    rearShock: ["twin-shock"],
    seat: ["brat-flat"],
    handlebar: ["clip-on", "drop", "ape"],
  },
  bagger: {
    sissyBar: ["tall"],
    handlebar: ["ape"],
    fenderRear: ["bobbed", "strut", "hugger", "none"],
    tires: ["knobby", "dual-sport", "flat-track"],
  },
  "neo-retro": {
    cowl: ["batwing", "cafe-half"],
    handlebar: ["ape", "drop"],
    tires: ["whitewall", "clincher"],
    frame: ["raked", "board-track", "hardtail"],
    seat: ["king-queen"],
  },
};

/** Picked options that push the build out of its style (shown as a soft warning, never blocked). */
export function clashesFor(c: BuildConfig): { key: PartKey | "finish"; id: string }[] {
  const rules = CLASHES[c.style];
  const out: { key: PartKey | "finish"; id: string }[] = [];
  for (const [k, ids] of Object.entries(rules) as [PartKey | "finish", readonly string[]][]) {
    const v = k === "finish" ? c.paint.finish : c.parts[k];
    if (ids.includes(v)) out.push({ key: k, id: v });
  }
  return out;
}

/* ---------------- paint ---------------- */

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
  headlamp: "lampu depan",
  cowl: "fairing",
  taillight: "stoplamp",
  signals: "sein",
  mirrors: "spion",
  fork: "shock depan",
  rearShock: "shock belakang",
  fenderFront: "spakbor depan",
  fenderRear: "spakbor belakang",
  sideCover: "tutup samping",
  sissyBar: "sissy bar",
  gasCap: "tutup tangki",
  luggage: "bagasi",
  gauges: "spidometer",
  grips: "handgrip",
  footControls: "footstep",
  kickStarter: "selahan",
};

/** Row label for a part key inside its group (the /b spec sheet and the panel use it). */
export const partLabel = (gr: Group, k: PartKey) =>
  gr.keys.length > 1 ? (k === "wheels" ? "Pelek" : "Ban") : gr.heading.split(" (")[0];

/** Spec sheet rows, data-driven from GROUPS so new categories show up without page edits. */
export function specRows(c: BuildConfig) {
  return [
    { no: "JAC-00", part: "Basis motor", choice: BASE_NAMES[c.base] },
    ...GROUPS.flatMap((gr) => gr.keys.map((k) => ({ no: `JAC-${gr.no}`, part: partLabel(gr, k), choice: OPTION_NAMES[c.parts[k]] }))),
  ];
}

/** Accessible description of the 3D drawing (UX-SPEC 4.2). */
export function describeBuild(c: BuildConfig, exploded: boolean, painted: boolean) {
  const list = GROUPS.flatMap((gr) => gr.keys)
    .filter((k) => c.parts[k] !== "none")
    .map((k) => `${PART_KEY_LABEL[k]} ${OPTION_NAMES[c.parts[k]]}`)
    .join(", ");
  return `Gambar 3D motor ${STYLE_NAMES[c.style]}, basis ${BASE_NAMES[c.base]}: ${list}. Tampilan ${exploded ? "dibongkar" : "utuh"}, mode ${painted ? "cat" : "garis"}.`;
}
