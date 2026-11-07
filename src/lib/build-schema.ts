import { z } from "zod";

// Skip zod's `new Function` feature probe, which the CSP blocks and reports (audit-001 #11).
z.config({ jitless: true });

// Shared contract between configurator (frontend) and /api/builds (backend). Change both sides together.
// Version 2 (current). Version 1 configs still parse: BuildConfigSchema upgrades them (see upgradeV1).

export const STYLE_IDS = [
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
] as const;

/** custom = free frame (v1 behaviour); the rest are donor bikes the build is based on. */
export const BASE_IDS = ["custom", "harian-150", "w175", "xsr155", "ronin"] as const;

export const FINISH_IDS = ["gloss", "matte", "metal", "candy", "flake", "satin", "patina"] as const;

export const PART_OPTIONS = {
  frame: ["cradle", "single-cradle", "trellis", "backbone", "hardtail", "raked", "board-track", "softail"],
  engine: ["single", "single-liquid", "parallel-twin", "v-twin", "boxer", "inline-four"],
  tank: ["teardrop", "peanut", "flat-box", "cafe-dent", "cb-small", "coffin", "fatbob", "airbox", "touring", "board-slim"],
  seat: ["cafe-hump", "bobber-solo", "brat-flat", "jap-thin", "tracker-tail", "king-queen", "two-up", "sf-kicked", "board-saddle", "touring-step"],
  exhaust: ["low-pipe", "high-scrambler", "fishtail", "two-into-one", "shotgun", "drag-pipes", "megaphone", "reverse-cone", "underseat", "stubby", "upswept", "true-duals"],
  handlebar: ["clip-on", "clubman", "drag", "tracker", "semi-hanger", "camar", "ape", "z-bar", "beach", "drop"],
  wheels: ["spoke", "cast", "disc", "mag", "billet"],
  tires: ["street", "knobby", "dual-sport", "flat-track", "gambot", "whitewall", "radial", "clincher"],
  headlamp: ["round-7", "round-575", "bates", "twin-lamp", "square", "projector", "plate-lamp", "none"],
  cowl: ["none", "cafe-half", "flyscreen", "sharknose", "batwing", "plate"],
  taillight: ["lucas", "cat-eye", "led-strip", "loop", "side-mount", "none"],
  signals: ["bullet", "mini-led", "bar-end-signal", "none"],
  mirrors: ["bar-end-mirror", "oval", "stem", "none"],
  fork: ["telescopic", "gaiters", "usd", "springer", "girder", "leading-link", "extended"],
  rearShock: ["twin-shock", "piggyback", "mono", "hidden"],
  fenderFront: ["short", "high", "deep", "none"],
  fenderRear: ["bobbed", "strut", "valanced", "hugger", "none"],
  sideCover: ["oval-plate", "rect-plate", "small-plate", "stock-tri", "none"],
  sissyBar: ["none", "short", "tall", "pad"],
  gasCap: ["monza", "aero", "flush", "screw", "offset"],
  luggage: ["none", "rack", "hard-bags", "slant", "ammo"],
  gauges: ["chrono", "chrono-pair", "digital", "nacelle"],
  grips: ["rubber", "closed", "knurled", "leather"],
  footControls: ["rearsets", "mid", "forward", "boards", "ft-peg"],
  kickStarter: ["none", "kick"],
} as const;

export type PartKey = keyof typeof PART_OPTIONS;
export const PART_KEYS = Object.keys(PART_OPTIONS) as PartKey[];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const option = <K extends PartKey>(k: K) => z.enum(PART_OPTIONS[k] as unknown as [string, ...string[]]);

const PartsSchema = z
  .object(Object.fromEntries(PART_KEYS.map((k) => [k, option(k)])) as { [K in PartKey]: ReturnType<typeof option<K>> })
  .strict();

const BuildConfigV2 = z
  .object({
    version: z.literal(2),
    style: z.enum(STYLE_IDS),
    base: z.enum(BASE_IDS),
    parts: PartsSchema,
    paint: z.object({ tank: hex, frame: hex, accent: hex, finish: z.enum(FINISH_IDS) }).strict(),
  })
  .strict();

type V2 = z.infer<typeof BuildConfigV2>;
export type BuildConfig = Omit<V2, "parts"> & { parts: { [K in PartKey]: (typeof PART_OPTIONS)[K][number] } };

const BuildConfigV1 = z
  .object({
    version: z.literal(1),
    style: z.enum(["cafe-racer", "bobber", "scrambler", "brat"]),
    parts: z
      .object({
        frame: z.enum(["cradle", "trellis", "hardtail"]),
        engine: z.enum(["single", "parallel-twin", "v-twin"]),
        tank: z.enum(["teardrop", "peanut", "flat-box"]),
        seat: z.enum(["cafe-hump", "bobber-solo", "brat-flat"]),
        exhaust: z.enum(["low-pipe", "high-scrambler", "fishtail"]),
        handlebar: z.enum(["clip-on", "drag", "tracker"]),
        wheels: z.enum(["spoke", "cast", "disc"]),
        tires: z.enum(["street", "knobby"]),
      })
      .strict(),
    paint: z.object({ tank: hex, frame: hex, accent: hex, finish: z.enum(["gloss", "matte", "metal"]) }).strict(),
  })
  .strict();

type V1 = z.infer<typeof BuildConfigV1>;
type NewKey = Exclude<PartKey, keyof V1["parts"]>;

/**
 * v1 bikes had these parts fixed in the frame (round chrome lamp, telescopic fork, rear fender,
 * twin shocks, no front fender). Filling them in keeps an old build looking like it did.
 */
const V1_FILL: Record<V1["style"], { [K in NewKey]: BuildConfig["parts"][K] }> = Object.fromEntries(
  (["cafe-racer", "bobber", "scrambler", "brat"] as const).map((s) => [
    s,
    {
      headlamp: "round-7",
      cowl: "none",
      taillight: s === "bobber" ? "cat-eye" : "lucas",
      signals: "none",
      mirrors: "none",
      fork: "telescopic",
      rearShock: "twin-shock",
      fenderFront: "none",
      fenderRear: "bobbed",
      sideCover: "none",
      sissyBar: "none",
      gasCap: s === "bobber" ? "screw" : "monza",
      luggage: "none",
      gauges: "chrono",
      grips: "rubber",
      footControls: s === "cafe-racer" ? "rearsets" : "mid",
      kickStarter: "none",
    },
  ]),
) as never;

export function upgradeV1(c: V1): BuildConfig {
  return {
    version: 2,
    style: c.style,
    base: "custom",
    parts: { ...c.parts, ...V1_FILL[c.style] },
    paint: { ...c.paint },
  };
}

/** Accepts v2, and v1 (drafts in localStorage `jac:draft:v1`, rows saved before v2) upgraded to v2. */
export const BuildConfigSchema: z.ZodType<BuildConfig, unknown> = z.union([
  BuildConfigV2,
  BuildConfigV1.transform(upgradeV1),
]) as never;

// Rejects control (Cc) and format (Cf) chars, incl. NUL, bidi overrides/isolates, ZWSP, soft hyphen,
// BOM, and line/paragraph separators (Zl/Zp). ZWJ (U+200D) stays allowed so emoji sequences work.
const SAFE_TEXT = /^(?:\u200D|[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}])*$/u;

// Payload POSTed to /api/builds
export const CreateBuildSchema = z
  .object({
    name: z.string().normalize("NFC").trim().min(1).max(60).regex(SAFE_TEXT),
    builder: z.string().normalize("NFC").trim().max(40).regex(SAFE_TEXT).optional(),
    config: BuildConfigSchema,
  })
  .strict();

export type CreateBuild = z.infer<typeof CreateBuildSchema>;

// Shape returned by GET /api/builds/[slug] and POST /api/builds
export type SavedBuild = {
  slug: string;
  name: string;
  builder: string | null;
  config: BuildConfig;
  created_at: string;
};

export const DEFAULT_BUILD: BuildConfig = {
  version: 2,
  style: "cafe-racer",
  base: "custom",
  parts: {
    frame: "cradle",
    engine: "parallel-twin",
    tank: "cafe-dent",
    seat: "cafe-hump",
    exhaust: "reverse-cone",
    handlebar: "clip-on",
    wheels: "spoke",
    tires: "street",
    headlamp: "round-7",
    cowl: "none",
    taillight: "lucas",
    signals: "bar-end-signal",
    mirrors: "bar-end-mirror",
    fork: "telescopic",
    rearShock: "twin-shock",
    fenderFront: "short",
    fenderRear: "hugger",
    sideCover: "none",
    sissyBar: "none",
    gasCap: "monza",
    luggage: "none",
    gauges: "chrono-pair",
    grips: "rubber",
    footControls: "rearsets",
    kickStarter: "none",
  },
  paint: { tank: "#8a1f17", frame: "#1a1a1a", accent: "#c9a227", finish: "gloss" },
};
