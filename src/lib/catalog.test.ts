import { test } from "node:test";
import assert from "node:assert/strict";
import { BuildConfigSchema, DEFAULT_BUILD, PART_OPTIONS } from "./build-schema.ts";
import { OPTION_NAMES, PRESETS, STYLES, SWATCHES, HEX_RE, describeBuild } from "./catalog.ts";

test("every preset is a valid build", () => {
  for (const style of STYLES) {
    const r = BuildConfigSchema.safeParse({ ...DEFAULT_BUILD, style, parts: PRESETS[style] });
    assert.ok(r.success, style);
  }
});

test("cafe-racer preset equals DEFAULT_BUILD parts", () => {
  assert.deepEqual(PRESETS["cafe-racer"], DEFAULT_BUILD.parts);
});

test("every option id has a display name", () => {
  for (const ids of Object.values(PART_OPTIONS)) for (const id of ids) assert.ok(OPTION_NAMES[id], id);
});

test("swatches are schema-valid hex", () => {
  for (const s of SWATCHES) assert.ok(HEX_RE.test(s.hex), s.name);
});

test("description has no dashes", () => {
  const d = describeBuild(DEFAULT_BUILD, false, false);
  assert.ok(d.startsWith("Gambar 3D motor Cafe racer"));
  const dashes = [0x2013, 0x2014].map((c) => String.fromCharCode(c)); // en dash, em dash
  assert.ok(!dashes.some((ch) => d.includes(ch)));
});
