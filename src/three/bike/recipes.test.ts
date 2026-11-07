import { test } from "node:test";
import assert from "node:assert/strict";
import { BASES, STYLES, STYLE_SIGNATURE, presetFor } from "../../lib/catalog.ts";
import { PART_OPTIONS, PART_KEYS, DEFAULT_BUILD } from "../../lib/build-schema.ts";
import { Kit, finish } from "./kit.ts";
import { makeRig } from "./rig.ts";
import { RECIPES, tire, wheel } from "./recipes.ts";

type P = typeof DEFAULT_BUILD.parts;
const ALL = [...Object.values(RECIPES), (k: Kit, c: never) => wheel(k, c, true), (k: Kit, c: never) => wheel(k, c, false), (k: Kit, c: never) => tire(k, c, true), (k: Kit, c: never) => tire(k, c, false)];

function check(style: (typeof STYLES)[number], base: (typeof BASES)[number], parts: P, label: string, merge = true) {
  const r = makeRig(style, base, parts, STYLE_SIGNATURE[style].includes("wheels"));
  for (const v of Object.values(r).flat(2)) if (typeof v === "number") assert.ok(Number.isFinite(v), `${label}: rig`);
  let verts = 0;
  for (const build of ALL) {
    const k = new Kit(0.6);
    build(k, { r, p: parts, style } as never);
    if (!merge) {
      for (const pc of k.pieces) for (const v of pc.geo.attributes.position.array) if (!Number.isFinite(v)) assert.fail(`${label}: NaN in ${build.name}`);
      continue;
    }
    const b = finish(k);
    for (const g of b.bySlot.values()) {
      const a = g.attributes.position.array;
      for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) assert.fail(`${label}: NaN in ${build.name}`);
    }
    verts += b.stats.vertices;
    b.dispose();
  }
  return verts;
}

test("every style x base preset builds finite geometry without three.js errors", () => {
  const errors: unknown[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => void errors.push(a.join(" "));
  try {
    let max = 0;
    for (const style of STYLES) for (const base of BASES) max = Math.max(max, check(style, base, presetFor(style, base), `${style}/${base}`));
    console.log(`max low-tier vertices per bike: ${max}`);
  } finally {
    console.error = orig;
  }
  assert.deepEqual(errors, []);
});

test("every option of every category builds on the default bike", () => {
  const errors: unknown[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => void errors.push(a.join(" "));
  try {
    for (const k of PART_KEYS)
      for (const id of PART_OPTIONS[k]) check("cafe-racer", "custom", { ...DEFAULT_BUILD.parts, [k]: id } as P, `${k}=${id}`, false);
  } finally {
    console.error = orig;
  }
  assert.deepEqual(errors, []);
});
