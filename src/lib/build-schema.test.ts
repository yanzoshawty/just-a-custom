import { test } from "node:test";
import assert from "node:assert/strict";
import { CreateBuildSchema, DEFAULT_BUILD } from "./build-schema.ts";

const valid = { name: "Night Café", builder: "yeet", config: DEFAULT_BUILD };
const ok = (v: unknown) => CreateBuildSchema.safeParse(v).success;

test("default build passes", () => {
  assert.ok(ok(valid));
});

test("unknown part id fails", () => {
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, engine: "rocket" } } }));
});

test("extra keys fail at every level", () => {
  assert.ok(!ok({ ...valid, admin: true }));
  assert.ok(!ok({ ...valid, config: { ...DEFAULT_BUILD, extra: 1 } }));
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
  for (const name of ["a\u0000b", "‮abc", "​", "line\nbreak", "tab\there", "x﻿y"]) {
    assert.ok(!ok({ ...valid, name }), JSON.stringify(name));
    assert.ok(!ok({ ...valid, builder: name }), JSON.stringify(name));
  }
  assert.ok(ok({ ...valid, name: "Café \u{1F3CD}️" }));
  assert.ok(ok({ ...valid, name: "Bengkel \u{1F468}‍\u{1F527}" }));
});

