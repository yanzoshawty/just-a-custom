import { test } from "node:test";
import assert from "node:assert/strict";
import { BuildConfigSchema, DEFAULT_BUILD, PART_KEYS, PART_OPTIONS } from "./build-schema.ts";
import {
  BASES,
  GROUPS,
  HEX_RE,
  OPTION_NAMES,
  PRESETS,
  STYLES,
  STYLE_BLURB,
  STYLE_NAMES,
  SWATCHES,
  clashesFor,
  describeBuild,
  partsForBase,
  presetFor,
  specRows,
} from "./catalog.ts";

test("every style x base preset is a valid build", () => {
  for (const style of STYLES)
    for (const base of BASES) {
      const r = BuildConfigSchema.safeParse({ ...DEFAULT_BUILD, style, base, parts: presetFor(style, base) });
      assert.ok(r.success, `${style} on ${base}`);
    }
});

test("13 styles, each with a name and blurb", () => {
  assert.equal(STYLES.length, 13);
  for (const s of STYLES) assert.ok(STYLE_NAMES[s] && STYLE_BLURB[s], s);
});

test("style presets honour their own do-not-include list", () => {
  for (const style of STYLES) {
    const hits = clashesFor({ ...DEFAULT_BUILD, style, parts: PRESETS[style], paint: { ...DEFAULT_BUILD.paint, finish: "matte" } });
    assert.deepEqual(hits, [], style);
  }
});

test("clash check flags an off-style part", () => {
  const c = { ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, tires: "knobby" as const } };
  assert.deepEqual(clashesFor(c), [{ key: "tires", id: "knobby" }]);
});

test("cafe-racer preset equals DEFAULT_BUILD parts", () => {
  assert.deepEqual(PRESETS["cafe-racer"], DEFAULT_BUILD.parts);
});

test("every option id has a display name", () => {
  for (const ids of Object.values(PART_OPTIONS)) for (const id of ids) assert.ok(OPTION_NAMES[id], id);
});

test("every part key sits in exactly one group", () => {
  const keys = GROUPS.flatMap((g) => g.keys).sort();
  assert.deepEqual(keys, [...PART_KEYS].sort());
  assert.deepEqual(GROUPS.slice(0, 7).map((g) => g.id), ["frame", "tank", "seat", "handlebar", "wheels", "exhaust", "engine"]);
});

test("donor base keeps style signature but brings its engine", () => {
  assert.equal(presetFor("chopper", "w175").frame, "raked");
  assert.equal(presetFor("chopper", "w175").engine, "single");
  assert.equal(presetFor("cafe-racer", "xsr155").fork, "usd");
  const back = partsForBase(presetFor("cafe-racer", "ronin"), "cafe-racer", "custom");
  assert.deepEqual(back, PRESETS["cafe-racer"]);
});

test("spec rows cover every part plus the base", () => {
  assert.equal(specRows(DEFAULT_BUILD).length, PART_KEYS.length + 1);
});

test("swatches are schema-valid hex", () => {
  for (const s of SWATCHES) assert.ok(HEX_RE.test(s.hex), s.name);
});

test("display copy has no dashes", () => {
  const dashes = [0x2013, 0x2014].map((c) => String.fromCharCode(c)); // en dash, em dash
  const d = describeBuild(DEFAULT_BUILD, false, false);
  assert.ok(d.startsWith("Gambar 3D motor Cafe racer"));
  const copy = [d, ...Object.values(OPTION_NAMES), ...Object.values(STYLE_BLURB), ...GROUPS.map((g) => g.heading)];
  for (const s of copy) assert.ok(!dashes.some((ch) => s.includes(ch)), s);
});
