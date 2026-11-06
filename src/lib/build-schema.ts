import { z } from "zod";

// Skip zod's `new Function` feature probe, which the CSP blocks and reports (audit-001 #11).
z.config({ jitless: true });

// Shared contract between configurator (frontend) and /api/builds (backend). Change both sides together.

export const PART_OPTIONS = {
  frame: ["cradle", "trellis", "hardtail"],
  engine: ["single", "parallel-twin", "v-twin"],
  tank: ["teardrop", "peanut", "flat-box"],
  seat: ["cafe-hump", "bobber-solo", "brat-flat"],
  exhaust: ["low-pipe", "high-scrambler", "fishtail"],
  handlebar: ["clip-on", "drag", "tracker"],
  wheels: ["spoke", "cast", "disc"],
  tires: ["street", "knobby"],
} as const;

export type PartKey = keyof typeof PART_OPTIONS;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const option = <K extends PartKey>(k: K) =>
  z.enum(PART_OPTIONS[k] as unknown as [string, ...string[]]);

export const BuildConfigSchema = z
  .object({
    version: z.literal(1),
    style: z.enum(["cafe-racer", "bobber", "scrambler", "brat"]),
    parts: z
      .object({
        frame: option("frame"),
        engine: option("engine"),
        tank: option("tank"),
        seat: option("seat"),
        exhaust: option("exhaust"),
        handlebar: option("handlebar"),
        wheels: option("wheels"),
        tires: option("tires"),
      })
      .strict(),
    paint: z
      .object({
        tank: hex,
        frame: hex,
        accent: hex,
        finish: z.enum(["gloss", "matte", "metal"]),
      })
      .strict(),
  })
  .strict();

export type BuildConfig = z.infer<typeof BuildConfigSchema>;

// Rejects control chars (NUL, newline), zero-width space, LRM/RLM, bidi overrides/isolates and BOM.
// ZWJ (U+200D) stays allowed so emoji sequences work.
const SAFE_TEXT = /^[^\p{Cc}​‎‏‪-‮⁦-⁩﻿]*$/u;

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
  version: 1,
  style: "cafe-racer",
  parts: {
    frame: "cradle",
    engine: "parallel-twin",
    tank: "teardrop",
    seat: "cafe-hump",
    exhaust: "low-pipe",
    handlebar: "clip-on",
    wheels: "spoke",
    tires: "street",
  },
  paint: { tank: "#8a1f17", frame: "#1a1a1a", accent: "#c9a227", finish: "gloss" },
};
