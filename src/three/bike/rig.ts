// Chassis rig: six dials per style (report "one parametric rig builds twelve custom styles"),
// adjusted by the donor base. Every part recipe places itself from these points.
// Units are meters, bike faces +X, origin on the ground midway between the axles.
import type { Base, Parts, Style } from "@/lib/catalog";
import type { V2 } from "./kit";

type Wheel = { inch: number; sec: number; asp: number };
type StyleRig = {
  wb: number;
  /** steering-neck rake from vertical, degrees */
  rake: number;
  F: Wheel;
  R: Wheel;
  /** seat surface height */
  seat: number;
  /** top clamp height */
  head: number;
  /** engine / pivot height offset (stance) */
  ride: number;
  /** tail end behind the rear axle (+ = further back) and its rise above the seat rail */
  tailOver: number;
  tailRise: number;
};

const w = (inch: number, sec: number, asp: number): Wheel => ({ inch, sec: sec / 1000, asp: asp / 100 });

// [EST] modelling values from the report's per-style table; sourced numbers noted there.
export const STYLE_RIG: Record<Style, StyleRig> = {
  "cafe-racer": { wb: 1.42, rake: 26, F: w(18, 100, 90), R: w(18, 110, 90), seat: 0.79, head: 0.95, ride: 0, tailOver: 0.0, tailRise: 0.0 },
  bobber: { wb: 1.56, rake: 30, F: w(16, 130, 90), R: w(16, 130, 90), seat: 0.67, head: 0.93, ride: -0.03, tailOver: -0.08, tailRise: -0.08 },
  scrambler: { wb: 1.445, rake: 26, F: w(19, 100, 90), R: w(17, 130, 80), seat: 0.84, head: 1.02, ride: 0.05, tailOver: 0.06, tailRise: 0.0 },
  brat: { wb: 1.43, rake: 26, F: w(18, 120, 90), R: w(18, 130, 90), seat: 0.73, head: 0.92, ride: -0.02, tailOver: 0.04, tailRise: 0.0 },
  japstyle: { wb: 1.32, rake: 27, F: w(18, 120, 80), R: w(18, 130, 80), seat: 0.71, head: 0.95, ride: -0.01, tailOver: -0.02, tailRise: 0.0 },
  chopper: { wb: 1.86, rake: 40, F: w(21, 90, 90), R: w(16, 150, 80), seat: 0.6, head: 1.02, ride: -0.04, tailOver: -0.04, tailRise: -0.04 },
  "flat-tracker": { wb: 1.42, rake: 25, F: w(19, 130, 80), R: w(19, 140, 80), seat: 0.86, head: 1.0, ride: 0.04, tailOver: 0.02, tailRise: 0.06 },
  "street-tracker": { wb: 1.43, rake: 26, F: w(19, 110, 80), R: w(18, 140, 70), seat: 0.82, head: 0.98, ride: 0.02, tailOver: 0.06, tailRise: 0.08 },
  "board-tracker": { wb: 1.5, rake: 27, F: w(23, 76, 95), R: w(23, 76, 95), seat: 0.7, head: 0.9, ride: -0.02, tailOver: -0.14, tailRise: -0.03 },
  "rat-bike": { wb: 1.43, rake: 27, F: w(18, 110, 90), R: w(18, 120, 90), seat: 0.78, head: 0.95, ride: 0, tailOver: -0.02, tailRise: 0.0 },
  streetfighter: { wb: 1.44, rake: 24, F: w(17, 120, 70), R: w(17, 190, 55), seat: 0.84, head: 0.98, ride: 0.02, tailOver: 0.1, tailRise: 0.2 },
  bagger: { wb: 1.63, rake: 28, F: w(21, 130, 60), R: w(18, 180, 55), seat: 0.67, head: 0.95, ride: -0.05, tailOver: 0.16, tailRise: 0.02 },
  "neo-retro": { wb: 1.34, rake: 26, F: w(17, 110, 70), R: w(17, 140, 70), seat: 0.8, head: 0.97, ride: 0.01, tailOver: 0.06, tailRise: 0.05 },
};

/** Donor proportions [SRC spec sheets: W175 1,320 mm, XSR 155 1,330 mm, Ronin 1,357 mm; harian 150 EST]. */
const BASE_RIG: Record<Exclude<Base, "custom">, { wb: number; F: Wheel; R: Wheel; eng: number }> = {
  "harian-150": { wb: 1.32, F: w(17, 100, 80), R: w(17, 130, 70), eng: 0.78 },
  w175: { wb: 1.32, F: w(17, 80, 100), R: w(17, 100, 90), eng: 0.8 },
  xsr155: { wb: 1.33, F: w(17, 110, 70), R: w(17, 140, 70), eng: 0.8 },
  ronin: { wb: 1.357, F: w(17, 110, 70), R: w(17, 130, 70), eng: 0.88 },
};

/** Engine crankcase half width per engine type, before the base scale. */
export const ENGINE_HALF: Record<Parts["engine"], number> = {
  single: 0.08,
  "single-liquid": 0.08,
  "parallel-twin": 0.12,
  "v-twin": 0.095,
  boxer: 0.1,
  "inline-four": 0.16,
};

export type Tire = { rim: number; r: number; sec: number; h: number };

export type Rig = {
  wb: number;
  rake: number;
  /** unit fork axis from the front axle upward, and its normal pointing forward */
  d: V2;
  n: V2;
  aF: V2;
  aR: V2;
  tF: Tire;
  tR: Tire;
  /** fork clamps (on the fork axis) and steering head (behind it) */
  clampLo: V2;
  clampHi: V2;
  headLo: V2;
  headHi: V2;
  forkLen: number;
  pivot: V2;
  seatTop: number;
  rail: number;
  seatFront: number;
  tail: V2;
  eng: { x: number; y: number; s: number; half: number };
  /** frame rail half width around the engine */
  wz: number;
  /** max top-tube slope: rigid frames carry the backbone high and level-ish, then drop to the axle */
  spineSlope: number;
  /** scene scale so long bikes fit the camera framing */
  scale: number;
  length: number;
};

const tire = (t: Wheel): Tire => {
  const rim = (t.inch * 0.0254) / 2;
  const h = t.sec * t.asp;
  return { rim, h, r: rim + h, sec: t.sec };
};

export function makeRig(style: Style, base: Base, parts: Parts, keepWheels: boolean): Rig {
  const S = STYLE_RIG[style];
  const B = base === "custom" ? null : BASE_RIG[base];
  // donor wheelbase plus the style's stretch relative to a classic donor
  const wb = B ? B.wb + (S.wb - 1.43) * 0.7 : S.wb;
  const tF = tire(B && !keepWheels ? B.F : S.F);
  const tR = tire(B && !keepWheels ? B.R : S.R);
  let rake = S.rake;
  if (parts.fork === "extended") rake = Math.max(rake, 36);
  if (parts.frame === "raked") rake = Math.max(rake, 38);
  const rk = (rake * Math.PI) / 180;
  const d: V2 = [-Math.sin(rk), Math.cos(rk)];
  const n: V2 = [Math.cos(rk), Math.sin(rk)];
  const aF: V2 = [wb / 2, tF.r];
  const aR: V2 = [-wb / 2, tR.r];
  // donors sit a little lower than the big classics they stand in for
  const drop = B ? -0.03 : 0;
  const headTop = S.head + drop + (parts.fork === "extended" ? 0.06 : 0);
  const off = 0.05; // clamp offset: head tube sits this far behind the fork axis
  const tHi = (headTop - aF[1] + n[1] * off) / d[1];
  const at = (t: number, back: number): V2 => [aF[0] + d[0] * t - n[0] * back, aF[1] + d[1] * t - n[1] * back];
  const clampHi = at(tHi, 0);
  const clampLo = at(tHi - 0.16, 0);
  const headHi = at(tHi + 0.01, off);
  const headLo = at(tHi - 0.17, off);
  const ride = S.ride + drop;
  const pivot: V2 = [-wb * 0.1, Math.max(tR.r + 0.04, 0.36) + ride];
  const seatTop = S.seat + drop;
  const rail = seatTop - 0.07;
  const engS = B ? B.eng : style === "bagger" || style === "chopper" ? 1.08 : 1;
  const half = ENGINE_HALF[parts.engine] * (B ? 0.9 : 1);
  const eng = { x: (pivot[0] + headLo[0]) / 2 + 0.02, y: 0.35 + ride * 0.8 + (B ? 0.01 : 0), s: engS, half };
  const tail: V2 = [aR[0] + S.tailOver, rail + S.tailRise];
  const seatFront = pivot[0] + 0.04;
  const front = aF[0] + tF.r + 0.05;
  const back = Math.min(aR[0] - tR.r, tail[0] - 0.08);
  const length = front - back;
  return {
    wb,
    rake,
    d,
    n,
    aF,
    aR,
    tF,
    tR,
    clampLo,
    clampHi,
    headLo,
    headHi,
    forkLen: tHi - 0.16,
    pivot,
    seatTop,
    rail,
    seatFront,
    tail,
    eng,
    wz: half + 0.035,
    spineSlope: ["hardtail", "raked", "softail", "board-track"].includes(parts.frame) ? 0.5 : 99,
    scale: Math.min(1, 2.3 / length),
    length,
  };
}

/** Point along the fork axis at distance t from the front axle (z = 0). */
export const onFork = (r: Rig, t: number, back = 0): V2 => [
  r.aF[0] + r.d[0] * t - r.n[0] * back,
  r.aF[1] + r.d[1] * t - r.n[1] * back,
];

export const lerp2 = (a: V2, b: V2, t: number): V2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
