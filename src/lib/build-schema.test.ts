import { test } from "node:test";
import assert from "node:assert/strict";
import { BuildConfigSchema, CreateBuildSchema, DEFAULT_BUILD, PART_KEYS, PART_OPTIONS } from "./build-schema.ts";

const valid = { name: "Night Café", builder: "yeet", config: DEFAULT_BUILD };
const ok = (v: unknown) => CreateBuildSchema.safeParse(v).success;

const V1 = {
  version: 1,
  style: "bobber",
  parts: { frame: "hardtail", engine: "v-twin", tank: "peanut", seat: "bobber-solo", exhaust: "fishtail", handlebar: "drag", wheels: "spoke", tires: "street" },
  paint: { tank: "#8a1f17", frame: "#1a1a1a", accent: "#c9a227", finish: "matte" },
};

test("default build passes", () => {
  assert.ok(ok(valid));
});

test("v1 config upgrades to v2 and keeps its choices", () => {
  const r = BuildConfigSchema.safeParse(V1);
  assert.ok(r.success);
  const c = r.data!;
  assert.equal(c.version, 2);
  assert.equal(c.base, "custom");
  assert.equal(c.style, "bobber");
  for (const [k, v] of Object.entries(V1.parts)) assert.equal(c.parts[k as keyof typeof c.parts], v);
  assert.deepEqual(Object.keys(c.parts).sort(), [...PART_KEYS].sort());
  assert.deepEqual(c.paint, V1.paint);
  // the upgraded config is itself a valid v2 config
  assert.ok(BuildConfigSchema.safeParse(c).success);
  assert.ok(ok({ ...valid, config: V1 }));
});

test("v1 stays strict: v2-only values and extra keys fail", () => {
  assert.ok(!BuildConfigSchema.safeParse({ ...V1, style: "chopper" }).success);
  assert.ok(!BuildConfigSchema.safeParse({ ...V1, parts: { ...V1.parts, fork: "usd" } }).success);
  assert.ok(!BuildConfigSchema.safeParse({ ...V1, base: "custom" }).success);
  assert.ok(!BuildConfigSchema.safeParse({ ...V1, version: 3 }).success);
});

test("every option id of every category parses", () => {
  for (const k of PART_KEYS)
    for (const id of PART_OPTIONS[k]) assert.ok(BuildConfigSchema.safeParse({ ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, [k]: id } }).success, `${k}=${id}`);
});

test("unknown part id or missing category fails", () => {
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, engine: "rocket" } } }));
  const noFork: Record<string, string> = { ...DEFAULT_BUILD.parts };
  delete noFork.fork;
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, parts: noFork } }));
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, base: "harley" } }));
});

test("largest config stays far under the 4096-byte DB check", () => {
  const longest = Object.fromEntries(PART_KEYS.map((k) => [k, [...PART_OPTIONS[k]].sort((a, b) => b.length - a.length)[0]]));
  const config = { ...DEFAULT_BUILD, style: "street-tracker", base: "harian-150", parts: longest };
  assert.ok(BuildConfigSchema.safeParse(config).success);
  const bytes = new TextEncoder().encode(JSON.stringify(config)).length;
  assert.ok(bytes < 4096, String(bytes));
  console.log(`largest config: ${bytes} bytes`);
});

test("extra keys fail at every level", () => {
  assert.ok(!ok({ ...valid, admin: true }));
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, extra: 1 } }));
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, turbo: "yes" } } }));
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, paint: { ...DEFAULT_BUILD.paint, glow: "#ffffff" } } }));
});

test("bad hex fails", () => {
  for (const tank of ["red", "#fff", "#gggggg", "#1234567"]) {
    assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, paint: { ...DEFAULT_BUILD.paint, tank } } }), tank);
  }
});

test("oversize or empty name fails", () => {
  assert.ok(!ok({ ...valid, name: "x".repeat(61) }));
  assert.ok(!ok({ ...valid, name: "   " }));
  assert.ok(ok({ ...valid, name: "x".repeat(60) }));
});

test("control, bidi and invisible characters in name/builder fail", () => {
  // leading/trailing BOM is stripped by trim(), so the BOM case sits mid-string
  for (const name of ["a\u0000b", "\u202Eabc", "\u200B", "line\nbreak", "tab\there", "x\uFEFFy", "a\u061Cb", "a\u2028b", "soft\u00ADhyphen", "a\u2060b"]) {
    assert.ok(!ok({ ...valid, name }), JSON.stringify(name));
    assert.ok(!ok({ ...valid, builder: name }), JSON.stringify(name));
  }
  assert.ok(ok({ ...valid, name: "Café \u{1F3CD}\uFE0F" }));
  assert.ok(ok({ ...valid, name: "Bengkel \u{1F468}\u200D\u{1F527}" }));
});
