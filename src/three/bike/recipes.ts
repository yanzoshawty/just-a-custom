// Procedural part recipes (DESIGN 7.2). Each recipe reads the rig and pushes primitives into a Kit.
// Sizes follow the report's catalog ([SRC]/[TYP]/[EST] tags there); stylized, never a copy of a build.
// Bike faces +X, rider's left (+Z) faces the default camera, so chain, exhaust and kick lever sit on +Z.
import type { Parts, Style } from "@/lib/catalog";
import { Kit, type Slot, type V2, type V3 } from "./kit.ts";
import { lerp2, onFork, type Rig, type Tire } from "./rig.ts";

const DEG = Math.PI / 180;
const P = (p: V2, z = 0): V3 => [p[0], p[1], z];
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + b[0] * k, a[1] + b[1] * k];

type Ctx = { r: Rig; p: Parts; style: Style };

const RIGID = new Set<Parts["frame"]>(["hardtail", "raked", "board-track", "softail"]);
export const isRigid = (p: Parts) => RIGID.has(p.frame);

/* ---------------- shared layout helpers ---------------- */

/** Top tube line from the steering head back to the seat. */
function spine(r: Rig) {
  const A: V2 = [r.headHi[0] - 0.01, r.headHi[1] - 0.035];
  const B: V2 = [r.seatFront, Math.max(r.rail - 0.02, A[1] - r.spineSlope * (A[0] - r.seatFront))];
  const y = (x: number) => A[1] + ((x - A[0]) / (B[0] - A[0])) * (B[1] - A[1]);
  return { A, B, y };
}

type TankShape = { len: number; h: number; w: number; lift: number; exp: number; front: number };
const TANKS: Record<Parts["tank"], TankShape> = {
  teardrop: { len: 0.52, h: 0.17, w: 0.14, lift: 0.0, exp: 2.4, front: 0.35 },
  peanut: { len: 0.42, h: 0.15, w: 0.095, lift: 0.04, exp: 2.2, front: 0.2 },
  "flat-box": { len: 0.5, h: 0.13, w: 0.13, lift: 0.0, exp: 6, front: 0.1 },
  "cafe-dent": { len: 0.6, h: 0.16, w: 0.15, lift: 0.0, exp: 2.6, front: 0.25 },
  "cb-small": { len: 0.38, h: 0.13, w: 0.11, lift: 0.04, exp: 2.4, front: 0.3 },
  coffin: { len: 0.46, h: 0.13, w: 0.12, lift: 0.03, exp: 8, front: 0.6 },
  fatbob: { len: 0.56, h: 0.16, w: 0.18, lift: 0.0, exp: 2.8, front: 0.15 },
  airbox: { len: 0.5, h: 0.2, w: 0.16, lift: 0.0, exp: 5, front: 0.05 },
  touring: { len: 0.62, h: 0.15, w: 0.2, lift: 0.0, exp: 3.2, front: 0.1 },
  "board-slim": { len: 0.56, h: 0.1, w: 0.075, lift: 0.0, exp: 5, front: 0.05 },
};

export function tankInfo(r: Rig, type: Parts["tank"]) {
  const s = spine(r);
  const t = TANKS[type];
  const x0 = r.headHi[0] - 0.035;
  const x1 = x0 - t.len;
  // bottom hugs the top tube; the top runs near level (cafe rule: tank top and seat base on one line)
  const base = (x: number) => s.y(x) + t.lift - 0.012;
  // level referenced a third of the way back: on steep top tubes the front stays slim, the rear does not balloon
  const level = base(x0 - t.len * 0.32) + t.h * 0.85;
  const boxy = type === "board-slim" || type === "flat-box" || type === "coffin";
  const crown = (u: number) => (type === "airbox" ? 0.25 - 0.55 * u : boxy ? 0 : 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.1)) - t.front * 0.25 * u);
  const round = (u: number) => (boxy ? Math.min(1, 0.6 + Math.min(u, 1 - u) * 6) : Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.06 + u * 0.91)), 0.35));
  // steep top tubes (chopper, raked frames) get a tank parallel to the tube instead of a level top
  const slope = (s.A[1] - s.B[1]) / Math.max(0.05, s.A[0] - s.B[0]);
  const w = Math.min(1, Math.max(0, (0.85 - slope) / 0.3));
  /** height above `base` at u (0 front, 1 rear) */
  const top = (u: number) => {
    const x = x0 - u * t.len;
    const lvl = Math.min(t.h * 1.35, level + t.h * crown(u) - base(x));
    const par = t.h * (0.85 + crown(u));
    return Math.max(0.05, (w * lvl + (1 - w) * par) * round(u));
  };
  const capU = 0.3;
  const capX = x0 - capU * t.len;
  return { x0, x1, base, top, t, capX, capY: base(capX) + top(capU) + 0.004 };
}

/** Where the seat starts (behind the tank). */
const seatStart = (r: Rig, p: Parts) => Math.min(r.seatFront, tankInfo(r, p.tank).x1 + 0.015);

/** Rail line from the seat front to the tail. */
function railAt(r: Rig, x: number) {
  const a: V2 = [r.seatFront, r.rail];
  const k = (x - a[0]) / (r.tail[0] - a[0]);
  return a[1] + k * (r.tail[1] - a[1]);
}

const forkZ = (p: Parts, style: Style) => (style === "bagger" ? 0.095 : p.fork === "springer" || p.fork === "girder" ? 0.07 : 0.08);

/** Headlamp center: ahead of the fork, a little under the lower clamp. */
const lampAt = (r: Rig): V2 => add(add(r.clampLo, r.n, 0.13), r.d, -0.06);

/* ---------------- frame (+ swingarm, chain) ---------------- */

export function frame(k: Kit, { r, p, style }: Ctx) {
  const s = spine(r);
  const wz = r.wz;
  const { x: ex, y: ey, s: es } = r.eng;
  const front: V2 = [ex + 0.22 * es, ey + 0.0];
  const bottomY = ey - 0.12 * es;
  const tube = 0.018;
  const big = p.frame === "backbone" ? 0.034 : 0.022;
  k.rod(P(r.headLo), P(r.headHi), 0.03, "frame", { seg: 16 });

  // top tube / spine (board track uses twin tubes, backbone its own spars)
  if (p.frame === "board-track") {
    k.sides((sd) => k.rod(P(s.A, sd * 0.04), [r.tail[0] + 0.12, s.B[1] - 0.02, sd * 0.05], 0.015, "frame"));
  } else if (p.frame !== "backbone" && p.frame !== "trellis") {
    k.tube([P(s.A), P(lerp2(s.A, s.B, 0.5)), P(s.B)], big, "frame");
  }

  const subframe = (from: V2) =>
    k.sides((sd) => {
      k.tube([P(s.B, sd * 0.04), [r.seatFront - 0.12, r.rail - 0.015, sd * 0.085], [r.tail[0] + 0.03, r.tail[1] - 0.015, sd * 0.085]], 0.014, "frame");
      k.rod(P(from, sd * wz), [lerp2([r.seatFront, r.rail], r.tail, 0.45)[0], railAt(r, lerp2([r.seatFront, r.rail], r.tail, 0.45)[0]) - 0.02, sd * 0.085], 0.012, "frame");
    });
  const hoop = () => k.tube([[r.tail[0] + 0.03, r.tail[1] - 0.015, -0.085], [r.tail[0] - 0.03, r.tail[1] - 0.012, -0.05], [r.tail[0] - 0.045, r.tail[1] - 0.01, 0], [r.tail[0] - 0.03, r.tail[1] - 0.012, 0.05], [r.tail[0] + 0.03, r.tail[1] - 0.015, 0.085]], 0.013, "frame");

  const cradleLoop = (sd: 1 | -1, zf = wz) =>
    k.tube(
      [
        [r.headLo[0], r.headLo[1] + 0.02, sd * 0.03],
        [front[0] + 0.03, front[1] + 0.2, sd * zf * 0.8],
        [front[0], front[1], sd * zf],
        [front[0] - 0.06, bottomY, sd * zf],
        [r.pivot[0] + 0.06, bottomY - 0.005, sd * zf],
        [r.pivot[0] - 0.01, r.pivot[1] - 0.03, sd * zf],
        [r.pivot[0] + 0.01, r.pivot[1] + 0.12, sd * zf * 0.9],
        [s.B[0], s.B[1], sd * 0.045],
      ],
      tube,
      "frame",
    );

  switch (p.frame) {
    case "cradle":
      k.sides((sd) => cradleLoop(sd));
      k.rod([front[0] - 0.06, bottomY, -wz], [front[0] - 0.06, bottomY, wz], 0.012, "frame");
      subframe([r.pivot[0], r.pivot[1] + 0.1]);
      hoop();
      break;
    case "single-cradle": {
      const split: V2 = [front[0] + 0.01, bottomY + 0.08];
      k.tube([P([r.headLo[0], r.headLo[1] + 0.02]), P([front[0] + 0.04, front[1] + 0.16]), P(split)], 0.021, "frame");
      k.sides((sd) =>
        k.tube([P(split, sd * 0.01), [split[0] - 0.05, bottomY, sd * wz], [r.pivot[0] + 0.06, bottomY, sd * wz], [r.pivot[0] - 0.01, r.pivot[1] - 0.03, sd * wz], [r.pivot[0] + 0.01, r.pivot[1] + 0.12, sd * wz * 0.9], P(s.B, sd * 0.045)], tube, "frame"),
      );
      // split gusset
      k.extrude([[0, 0], [0.05, 0.05], [-0.05, 0.05]], 0.02, P(split), "frame", { rot: [0, 0, 0] });
      subframe([r.pivot[0], r.pivot[1] + 0.1]);
      hoop();
      break;
    }
    case "trellis": {
      k.sides((sd) => {
        const A: V2 = [r.headHi[0], r.headHi[1] - 0.02];
        const Bq: V2 = r.headLo;
        const C: V2 = lerp2(s.A, s.B, 0.35);
        const D: V2 = [lerp2(r.headLo, r.pivot, 0.4)[0], lerp2(r.headLo, r.pivot, 0.4)[1] - 0.02];
        const E: V2 = [s.B[0] + 0.02, s.B[1]];
        const F: V2 = [r.pivot[0] + 0.01, r.pivot[1] + 0.03];
        const z = (q: V2, f = 1): V3 => [q[0], q[1], sd * wz * f];
        const segs: [V3, V3][] = [
          [z(A, 0.4), z(C)],
          [z(Bq, 0.4), z(C)],
          [z(Bq, 0.4), z(D)],
          [z(C), z(D)],
          [z(C), z(E)],
          [z(D), z(E)],
          [z(D), z(F)],
          [z(E), z(F)],
        ];
        for (const [a, b] of segs) k.rod(a, b, 0.013, "frame", { seg: 8 });
        k.box([0.1, 0.12, 0.012], [F[0] + 0.02, F[1] - 0.02, sd * (wz + 0.006)], "frame", { radius: 0.01 });
      });
      k.rod([s.B[0] + 0.02, s.B[1], -wz], [s.B[0] + 0.02, s.B[1], wz], 0.012, "frame");
      subframe([r.pivot[0] + 0.01, r.pivot[1] + 0.03]);
      break;
    }
    case "backbone": {
      // twin-spar (deltabox) beams from the head to the pivot plates
      k.sides((sd) => {
        const a: V2 = [r.headHi[0] - 0.02, r.headHi[1] - 0.06];
        const b: V2 = [r.pivot[0] + 0.03, r.pivot[1] + 0.08];
        const d: V2 = [b[0] - a[0], b[1] - a[1]];
        const len = Math.hypot(...d);
        k.box([len + 0.04, 0.075, 0.03], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, sd * (wz + 0.01)], "frame", { rot: [0, 0, Math.atan2(d[1], d[0])], radius: 0.012 });
        k.box([0.11, 0.2, 0.03], [r.pivot[0] + 0.02, r.pivot[1] + 0.02, sd * (wz + 0.01)], "frame", { radius: 0.014 });
      });
      subframe([r.pivot[0] + 0.02, r.pivot[1] + 0.1]);
      break;
    }
    case "hardtail":
    case "softail":
      k.sides((sd) => {
        k.tube([[r.headLo[0], r.headLo[1] + 0.02, sd * 0.03], [front[0] + 0.03, front[1] + 0.2, sd * wz * 0.8], [front[0], front[1], sd * wz], [front[0] - 0.06, bottomY, sd * wz], [r.pivot[0] + 0.02, bottomY + 0.01, sd * wz]], tube, "frame");
        k.rod([r.pivot[0] + 0.02, bottomY + 0.01, sd * wz], [s.B[0], s.B[1], sd * 0.05], tube, "frame");
        k.rod([r.pivot[0] + 0.02, bottomY + 0.03, sd * wz], [r.aR[0], r.aR[1], sd * 0.09], 0.016, "frame");
        k.rod([s.B[0], s.B[1] - 0.02, sd * 0.05], [r.aR[0], r.aR[1] + 0.01, sd * 0.09], 0.015, "frame");
        k.box([0.09, 0.07, 0.012], [r.aR[0], r.aR[1], sd * 0.095], "frame", { radius: 0.006 });
      });
      if (p.frame === "softail") {
        // pivot boss and the shocks hidden under the gearbox
        k.cyl(0.03, 0.03, 2 * wz + 0.04, [r.pivot[0] + 0.02, bottomY + 0.03, 0], "frame", { rot: [90 * DEG, 0, 0] });
        k.sides((sd) => k.rod([r.pivot[0] + 0.1, bottomY - 0.02, sd * 0.05], [r.pivot[0] - 0.12, bottomY - 0.02, sd * 0.05], 0.022, "chrome"));
      }
      break;
    case "raked": {
      // stretched rigid: single down tube, gusseted neck, backbone falling to the axle
      k.tube([P([r.headLo[0], r.headLo[1] + 0.02]), P([front[0] + 0.05, front[1] + 0.2]), P([front[0], front[1] - 0.02])], 0.022, "frame");
      k.extrude([[0, 0], [-0.16, -0.02], [-0.05, -0.16]], 0.02, P(r.headHi, 0), "frame", { rot: [0, 0, 0] });
      k.sides((sd) => {
        k.tube([[front[0], front[1] - 0.02, sd * 0.01], [front[0] - 0.06, bottomY, sd * wz], [r.pivot[0] + 0.02, bottomY + 0.01, sd * wz], [r.aR[0], r.aR[1], sd * 0.09]], tube, "frame");
        k.rod([r.pivot[0] + 0.02, bottomY + 0.01, sd * wz], [s.B[0], s.B[1], sd * 0.05], tube, "frame");
        k.rod([s.B[0], s.B[1] - 0.02, sd * 0.05], [r.aR[0], r.aR[1] + 0.01, sd * 0.09], 0.015, "frame");
        k.box([0.09, 0.07, 0.012], [r.aR[0], r.aR[1], sd * 0.095], "frame", { radius: 0.006 });
      });
      break;
    }
    case "board-track": {
      const seatPost: V2 = [r.seatFront - 0.05, s.B[1] - 0.02];
      k.tube([P([r.headLo[0], r.headLo[1] + 0.02]), P([front[0] + 0.03, front[1] + 0.12]), P([front[0] - 0.04, bottomY]), P([r.pivot[0], bottomY + 0.01])], 0.019, "frame");
      k.rod(P([r.pivot[0], bottomY + 0.01]), P(seatPost), 0.019, "frame");
      k.sides((sd) => {
        k.rod([r.pivot[0], bottomY + 0.01, sd * 0.03], [r.aR[0], r.aR[1], sd * 0.08], 0.014, "frame");
        k.rod([seatPost[0], seatPost[1], sd * 0.03], [r.aR[0], r.aR[1] + 0.01, sd * 0.08], 0.013, "frame");
      });
      break;
    }
  }

  // swingarm for every sprung frame
  if (!isRigid(p)) {
    const boxArm = p.frame === "backbone" || p.frame === "trellis" || p.rearShock === "mono";
    k.sides((sd) => {
      const a: V3 = [r.pivot[0], r.pivot[1], sd * 0.085];
      const b: V3 = [r.aR[0], r.aR[1], sd * 0.09];
      if (boxArm) {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        k.box([Math.hypot(dx, dy) + 0.04, 0.05, 0.022], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, sd * 0.09], "frame", { rot: [0, 0, Math.atan2(dy, dx)], radius: 0.01 });
      } else k.rod(a, b, 0.02, "frame");
    });
    k.rod([r.pivot[0], r.pivot[1], -0.1], [r.pivot[0], r.pivot[1], 0.1], 0.022, "frame");
  }

  // chain run and front sprocket (left side, towards the camera)
  const spF: V2 = [r.pivot[0] + 0.06, r.pivot[1] - 0.01];
  const zc = 0.115;
  k.cyl(0.035, 0.035, 0.01, P(spF, zc), "black", { rot: [90 * DEG, 0, 0], kind: "ink" });
  const rs = r.tR.rim * 0.62;
  const ang = Math.atan2(r.aR[1] - spF[1], r.aR[0] - spF[0]) + Math.PI / 2;
  const up: V2 = [Math.cos(ang), Math.sin(ang)];
  k.rod([spF[0] + up[0] * 0.035, spF[1] + up[1] * 0.035, zc], [r.aR[0] + up[0] * rs, r.aR[1] + up[1] * rs, zc], 0.004, "black", { kind: "ink", seg: 4 });
  k.rod([spF[0] - up[0] * 0.035, spF[1] - up[1] * 0.035, zc], [r.aR[0] - up[0] * rs, r.aR[1] - up[1] * rs, zc], 0.004, "black", { kind: "ink", seg: 4 });
  void style;
}

/* ---------------- rear suspension ---------------- */

function shock(k: Kit, a: V3, b: V3, o: { body: Slot; spring: Slot; reservoir?: boolean; r?: number }) {
  const rr = o.r ?? 0.022;
  k.rod(a, b, 0.008, "chrome");
  const m = (t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  k.rod(m(0.45), m(0.95), rr, o.body);
  // spring coil: a stack of thin rings along the shock
  const turns = k.n(9, 5);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const tilt = Math.atan2(dy, dx) - Math.PI / 2;
  for (let i = 0; i < turns; i++) k.torus(rr + 0.004, 0.0035, m(0.1 + (i / (turns - 1)) * 0.5), o.spring, { rot: [90 * DEG, 0, 0], kind: "ink", seg: 16, radial: 4, scale: [1, 1, 1] });
  void tilt;
  k.sphere(0.012, a, "chrome", { seg: 8 });
  k.sphere(0.012, b, "chrome", { seg: 8 });
  if (o.reservoir) k.rod(m(0.62), m(0.95), 0.013, "alloy");
}

export function rearShock(k: Kit, { r, p }: Ctx) {
  if (isRigid(p)) {
    if (p.frame === "softail" && p.rearShock !== "hidden") {
      // a softail can only hide its shocks; show a small linkage cover instead
      k.box([0.12, 0.05, 0.12], [r.pivot[0] - 0.05, r.eng.y - 0.12 * r.eng.s, 0], "black", { radius: 0.01 });
    }
    return;
  }
  const top = (x: number) => [x, railAt(r, x) - 0.03] as V2;
  if (p.rearShock === "twin-shock" || p.rearShock === "piggyback") {
    const lo = lerp2(r.pivot, r.aR, 0.86);
    const hx = lo[0] + 0.1;
    k.sides((sd) => shock(k, [lo[0], lo[1] + 0.02, sd * 0.11], [hx, top(hx)[1], sd * 0.105], { body: p.rearShock === "piggyback" ? "alloy" : "chrome", spring: p.rearShock === "piggyback" ? "accent" : "chrome", reservoir: p.rearShock === "piggyback" }));
  } else if (p.rearShock === "mono") {
    const lo = lerp2(r.pivot, r.aR, 0.25);
    const hi: V2 = [r.seatFront - 0.02, r.rail - 0.08];
    shock(k, [lo[0], lo[1] + 0.03, 0], P(hi), { body: "black", spring: "accent", reservoir: true, r: 0.026 });
    k.box([0.07, 0.04, 0.06], [lo[0], lo[1] + 0.01, 0], "black", { radius: 0.008 });
  } else {
    // hidden cantilever: only a linkage box under the seat shows
    k.box([0.14, 0.05, 0.1], [r.pivot[0] - 0.02, r.pivot[1] + 0.12, 0], "black", { radius: 0.012 });
  }
}

/* ---------------- engine ---------------- */

function jug(k: Kit, base: V3, tilt: number, rad: number, fins: boolean, s: number, h = 0.21, axis: "y" | "z" = "y") {
  const rot: V3 = axis === "y" ? [0, 0, -tilt * DEG] : [(tilt * DEG) as number, 0, 0];
  k.at(base, rot, s, () => {
    k.cyl(rad * 0.62, rad * 0.66, h, [0, h / 2, 0], "engine", { seg: 18 });
    if (fins) {
      const n = k.n(7, 4);
      for (let i = 0; i < n; i++) k.cyl(rad, rad, 0.009, [0, 0.03 + (i * (h - 0.05)) / (n - 1), 0], "engine", { seg: 22, kind: "hard" });
    } else {
      k.cyl(rad * 0.82, rad * 0.82, h * 0.55, [0, h * 0.42, 0], "engine", { seg: 22 });
    }
    k.box([rad * 2.05, 0.048, rad * 2.05], [0, h + 0.022, 0], "accent", { radius: 0.012 });
  });
}

export function enginePorts(r: Rig, type: Parts["engine"]): V3[] {
  const { x, y, s, half } = r.eng;
  const head = (tilt: number, z: number, hgt = 0.2): V3 => [x + 0.06 * s + Math.sin(tilt * DEG) * hgt * s + 0.04 * s, y + 0.09 * s + Math.cos(tilt * DEG) * hgt * s * 0.8, z];
  switch (type) {
    case "parallel-twin":
      return [head(12, 0.06 * s), head(12, -0.06 * s)];
    case "v-twin":
      return [head(32, 0.03 * s), [x - 0.02 * s, y + 0.27 * s, 0.03 * s]];
    case "boxer":
      return [[x + 0.1 * s, y + 0.04 * s, half + 0.17 * s]];
    case "inline-four":
      return [head(14, 0.11 * s), head(14, 0.04 * s), head(14, -0.04 * s), head(14, -0.11 * s)];
    default:
      return [head(12, 0)];
  }
}

export function engine(k: Kit, { r, p }: Ctx) {
  const { x, y, s, half } = r.eng;
  const t = p.engine;
  const hw = t === "inline-four" ? half : half;
  k.box([0.36 * s, 0.17 * s, hw * 2], [x, y, 0], "engine", { radius: 0.035 * s });
  // gearbox hump behind, side covers
  k.box([0.16 * s, 0.13 * s, hw * 1.7], [x - 0.2 * s, y - 0.01 * s, 0], "engine", { radius: 0.03 * s });
  k.cyl(0.072 * s, 0.072 * s, 0.022, [x - 0.03 * s, y - 0.01 * s, hw + 0.006], "chrome", { rot: [90 * DEG, 0, 0], seg: 28 });
  k.cyl(0.05 * s, 0.05 * s, 0.018, [x + 0.11 * s, y - 0.02 * s, -hw - 0.004], "chrome", { rot: [90 * DEG, 0, 0], seg: 24 });
  // oil sump fins
  for (let i = 0; i < 4; i++) k.box([0.2 * s, 0.006, hw * 1.6], [x + 0.02 * s, y - 0.09 * s - i * 0.012, 0], "engine", { kind: "ink" });
  const base = (dx: number, z: number): V3 => [x + dx * s, y + 0.085 * s, z];
  switch (t) {
    case "single":
      jug(k, base(0.06, 0), 12, 0.075, true, s);
      break;
    case "single-liquid": {
      jug(k, base(0.06, 0), 14, 0.07, false, s);
      // radiator between the down tubes, with hoses to the head
      const rad: V3 = [x + 0.25 * s, y + 0.2 * s, 0];
      k.box([0.035, 0.2 * s, 0.22 * s], rad, "black", { rot: [0, 0, -12 * DEG], radius: 0.006 });
      for (let i = 0; i < k.n(9, 4); i++) k.box([0.004, 0.18 * s, 0.2 * s], [rad[0] + 0.019, rad[1] - 0.08 * s + i * 0.018 * s, 0], "alloy", { kind: "ink", rot: [0, 0, -12 * DEG] });
      k.tube([[rad[0] - 0.01, rad[1] + 0.09 * s, 0.04], [x + 0.16 * s, y + 0.31 * s, 0.05], [x + 0.08 * s, y + 0.3 * s, 0.03]], 0.01, "rubber", { seg: 6 });
      break;
    }
    case "parallel-twin":
      k.sides((sd) => jug(k, base(0.06, sd * 0.06 * s), 12, 0.058, true, s));
      break;
    case "v-twin":
      jug(k, base(0.03, 0), 22.5, 0.07, true, s, 0.23);
      jug(k, base(-0.03, 0), -22.5, 0.07, true, s, 0.23);
      // primary cover (left) and round air cleaner (right)
      k.at([x - 0.12 * s, y - 0.02 * s, hw + 0.02], [0, 0, 8 * DEG], s, () => k.lathe([[0.001, -0.01], [0.09, -0.01], [0.1, 0.0], [0.09, 0.012], [0.001, 0.016]], [0, 0, 0], "chrome", { rot: [90 * DEG, 0, 0], scale: [1.5, 1, 1] }));
      k.cyl(0.085 * s, 0.085 * s, 0.035, [x, y + 0.22 * s, -hw - 0.04], "chrome", { rot: [90 * DEG, 0, 0], seg: 32 });
      break;
    case "boxer":
      k.sides((sd) => {
        k.at([x + 0.1 * s, y + 0.03 * s, sd * hw], [sd * -90 * DEG, 0, 0], s, () => {
          k.cyl(0.05, 0.05, 0.16, [0, 0.08, 0], "engine", { seg: 18 });
          const n = k.n(7, 4);
          for (let i = 0; i < n; i++) k.cyl(0.072, 0.072, 0.008, [0, 0.02 + i * 0.018, 0], "engine", { kind: "hard", seg: 20 });
          k.box([0.15, 0.05, 0.13], [0, 0.18, 0], "accent", { radius: 0.02 });
        });
      });
      break;
    case "inline-four": {
      k.at(base(0.07, 0), [0, 0, -14 * DEG], s, () => {
        k.box([0.13, 0.18, 0.3], [0, 0.09, 0], "engine", { radius: 0.01 });
        const n = k.n(7, 4);
        for (let i = 0; i < n; i++) k.box([0.15, 0.007, 0.32], [0, 0.03 + i * 0.022, 0], "engine");
        k.box([0.15, 0.05, 0.31], [0, 0.205, 0], "accent", { radius: 0.015 });
      });
      break;
    }
  }
  // carb / throttle body with pod or bell
  const intake: V3 = t === "boxer" ? [x - 0.06 * s, y + 0.1 * s, hw + 0.08] : [x - 0.06 * s, y + 0.25 * s, 0.07];
  if (t !== "v-twin") {
    k.cyl(0.022, 0.026, 0.06, intake, "alloy", { rot: [0, 0, 70 * DEG], seg: 12 });
    k.cyl(0.032, 0.04, 0.06, [intake[0] - 0.055, intake[1] - 0.02, intake[2]], "black", { rot: [0, 0, 70 * DEG], seg: 14 });
  }
}

/* ---------------- exhaust ---------------- */

export function exhaust(k: Kit, { r, p }: Ctx) {
  const ports = enginePorts(r, p.engine);
  const s = r.eng.s;
  const lowY = r.eng.y - 0.17 * s;
  const zOut = 0.17;
  const pr = 0.021;
  const header = (q: V3, side: 1 | -1 = 1): V3[] => [q, [q[0] + 0.07, q[1] - 0.1, q[2] + side * 0.05], [r.eng.x + 0.26 * s, r.eng.y - 0.06 * s, side * (zOut - 0.03)]];
  const can = (a: V3, b: V3, rad: number, slot: Slot = "chrome") => {
    k.rod(a, b, rad, slot, { seg: 20 });
    k.cyl(rad * 0.6, rad * 0.6, 0.02, b, "black", { rot: [0, 0, 90 * DEG] });
  };
  const ax = r.aR[0];
  const t = p.exhaust;

  const lowRun = (q: V3, side: 1 | -1, endX: number, endY: number) => {
    const pts = [...header(q, side), [r.eng.x + 0.05, lowY, side * zOut] as V3, [r.pivot[0] - 0.05, lowY + 0.04, side * (zOut + 0.02)] as V3, [endX, endY, side * (zOut + 0.02)] as V3];
    k.tube(pts, pr, "chrome");
    return pts[pts.length - 1];
  };

  switch (t) {
    case "low-pipe": {
      const e = lowRun(ports[0], 1, ax + 0.32, lowY + 0.1);
      can(e, [ax - 0.08, lowY + 0.14, e[2]], 0.042);
      if (ports[1]) lowRun(ports[1], 1, ax + 0.32, lowY + 0.06);
      break;
    }
    case "high-scrambler": {
      for (const [i, q] of ports.slice(0, 2).entries()) {
        const z = 0.2 + i * 0.045;
        const pts: V3[] = [q, [q[0] + 0.06, q[1] - 0.08, z - 0.06], [r.eng.x + 0.12, r.eng.y + 0.05, z], [r.eng.x - 0.1, r.eng.y + 0.16, z], [r.seatFront - 0.05, r.rail - 0.04, z]];
        k.tube(pts, pr, "chrome");
        const end: V3 = [ax + 0.06, railAt(r, ax + 0.06) - 0.02 - i * 0.06, z];
        can(pts[4], end, 0.04);
        // perforated heat shield (half shell) on the outside
        k.cyl(0.05, 0.05, 0.22, [r.eng.x - 0.02, r.eng.y + 0.12, z], "chrome", { rot: [0, 0, 58 * DEG], open: true, theta: [-Math.PI / 2, Math.PI], seg: 14 });
        for (let j = 0; j < 5; j++) k.cyl(0.007, 0.007, 0.004, [r.eng.x + 0.06 - j * 0.04, r.eng.y + 0.07 + j * 0.026, z + 0.052], "black", { rot: [90 * DEG, 0, 0], kind: "ink", seg: 6 });
      }
      break;
    }
    case "fishtail": {
      const e = lowRun(ports[0], 1, ax + 0.36, lowY + 0.07);
      k.at([ax - 0.02, lowY + 0.09, e[2]], [0, 0, 90 * DEG], [0.45, 1, 1.3], () => k.cyl(0.0, 0.075, 0.34, [0, 0, 0], "chrome", { open: true }));
      break;
    }
    case "two-into-one": {
      const col: V3 = [r.eng.x - 0.02, lowY - 0.005, 0.1];
      for (const [i, q] of ports.entries()) k.tube([q, [q[0] + 0.07, q[1] - 0.12, q[2] * 1.4 + 0.02], [r.eng.x + 0.12, lowY + 0.01, 0.06 + i * 0.01], col], pr * 0.9, "chrome");
      const up: V3 = [r.pivot[0] - 0.02, r.pivot[1] + 0.08, 0.15];
      k.tube([col, [r.pivot[0] + 0.06, lowY + 0.03, 0.14], up], pr * 1.1, "chrome");
      can(up, [r.tail[0] + 0.22, railAt(r, r.tail[0] + 0.22) - 0.05, 0.15], 0.045, "alloy");
      break;
    }
    case "shotgun":
    case "drag-pipes": {
      const long = t === "shotgun";
      const pts = ports.length > 1 ? ports.slice(0, 2) : [ports[0], [ports[0][0] - 0.05, ports[0][1] - 0.02, ports[0][2]] as V3];
      pts.forEach((q, i) => {
        const y0 = r.eng.y + 0.02 - i * 0.075;
        const z = 0.17 + i * 0.01;
        const turn: V3 = [r.eng.x + 0.12 - i * 0.12, y0, z];
        const end: V3 = long ? [ax - 0.05, y0 + 0.02 + (1 - i) * 0.02, z] : [r.pivot[0] - 0.1, y0 + 0.01, z];
        k.tube([q, [q[0] + 0.05, q[1] - 0.06, z * 0.7], turn], pr, "chrome");
        k.rod(turn, end, long ? 0.022 : 0.024, "chrome");
        if (!long) k.cyl(0.026, 0.026, 0.006, end, "black", { rot: [0, 0, 70 * DEG], kind: "ink" });
      });
      break;
    }
    case "megaphone": {
      const e = lowRun(ports[0], 1, r.pivot[0] - 0.05, lowY + 0.08);
      k.at([(e[0] + ax - 0.05) / 2, lowY + 0.12, e[2]], [0, 0, 93 * DEG], null, () => k.cyl(0.055, 0.022, Math.abs(e[0] - ax) + 0.05, [0, 0, 0], "chrome", { seg: 22 }));
      break;
    }
    case "reverse-cone": {
      const e = lowRun(ports[0], 1, r.pivot[0] - 0.08, lowY + 0.1);
      if (ports[1]) lowRun(ports[1], 1, r.pivot[0] - 0.08, lowY + 0.06);
      const len = Math.abs(e[0] - (ax - 0.1));
      k.at([e[0] - len / 2, e[1] + 0.03, e[2]], [0, 0, 84 * DEG], null, () =>
        k.lathe([[0.001, -len / 2], [0.024, -len / 2], [0.042, -len * 0.3], [0.045, len * 0.25], [0.03, len / 2 - 0.02], [0.028, len / 2], [0.001, len / 2]], [0, 0, 0], "chrome", { seg: 24 }),
      );
      break;
    }
    case "underseat": {
      const col: V3 = [r.eng.x - 0.05, lowY - 0.01, 0.04];
      for (const q of ports) k.tube([q, [q[0] + 0.07, q[1] - 0.12, q[2]], [r.eng.x + 0.1, lowY, q[2] * 0.6], col], pr * 0.9, "chrome");
      k.tube([col, [r.pivot[0] - 0.02, lowY + 0.02, 0.05], [r.pivot[0] - 0.12, r.pivot[1] + 0.14, 0.05]], pr * 1.1, "chrome");
      k.sides((sd) => {
        const a: V3 = [r.tail[0] + 0.3, railAt(r, r.tail[0] + 0.3) - 0.07, sd * 0.06];
        const b: V3 = [r.tail[0] + 0.02, r.tail[1] - 0.055, sd * 0.06];
        k.rod(a, b, 0.035, "alloy", { seg: 14 });
        k.cyl(0.024, 0.024, 0.02, b, "black", { rot: [0, 0, Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2] });
      });
      break;
    }
    case "stubby": {
      const e = lowRun(ports[0], 1, r.pivot[0] + 0.02, lowY + 0.02);
      if (ports[1]) lowRun(ports[1], 1, r.pivot[0] + 0.02, lowY + 0.02);
      k.box([0.24, 0.1, 0.09], [e[0] - 0.12, e[1] + 0.03, e[2] + 0.02], "black", { rot: [0, 0, 12 * DEG], radius: 0.03 });
      k.cyl(0.02, 0.02, 0.04, [e[0] - 0.25, e[1] + 0.06, e[2] + 0.02], "alloy", { rot: [0, 0, 100 * DEG] });
      break;
    }
    case "upswept": {
      const e = lowRun(ports[0], 1, r.pivot[0] - 0.02, lowY + 0.06);
      if (ports[1]) lowRun(ports[1], 1, r.pivot[0] - 0.02, lowY + 0.03);
      can(e, [ax - 0.12, r.aR[1] + 0.2, e[2]], 0.04);
      break;
    }
    case "true-duals": {
      for (const sd of [1, -1] as const) {
        const q = ports[sd === 1 ? 0 : Math.min(1, ports.length - 1)];
        const pts: V3[] = [[q[0], q[1], sd * Math.abs(q[2])], [q[0] + 0.06, q[1] - 0.12, sd * 0.1], [r.eng.x + 0.1, lowY, sd * 0.16], [r.pivot[0], lowY + 0.03, sd * 0.19], [ax + 0.25, lowY + 0.08, sd * 0.2]];
        k.tube(pts, pr, "chrome");
        k.rod(pts[4], [ax - 0.25, lowY + 0.12, sd * 0.2], 0.04, "chrome");
        k.cyl(0.04, 0.04, 0.004, [ax - 0.25, lowY + 0.12, sd * 0.2], "black", { rot: [0, 0, 60 * DEG], kind: "ink" });
      }
      break;
    }
  }
}

/* ---------------- tank + gas cap ---------------- */

export function tank(k: Kit, { r, p }: Ctx) {
  const info = tankInfo(r, p.tank);
  const { t } = info;
  const n = k.n(14, 8);
  const sections: [number, number, number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = info.x0 - u * t.len;
    const ht = info.top(u);
    const taper = Math.pow(Math.sin(Math.PI * Math.min(0.995, 0.05 + u * 0.95)), p.tank === "coffin" ? 0.3 : 0.45) * (1 - t.front * u * 0.5);
    const w = t.w * (p.tank === "coffin" ? 0.6 + 0.4 * Math.sin(Math.PI * u) : taper);
    sections.push([x, info.base(x) + ht / 2, w, ht / 2, ht / 2]);
  }
  const dent = p.tank === "cafe-dent" ? (u: number, a: number) => (u > 0.45 && u < 0.85 && Math.sin(a) < 0.2 ? 1 - 0.22 * Math.sin(((u - 0.45) / 0.4) * Math.PI) : 1) : undefined;
  if (p.tank === "fatbob") {
    k.sides((sd) => {
      const half = sections.map(([x, y, w, a, b]) => [x, y, w * 0.55, a, b] as [number, number, number, number, number]);
      k.at([0, 0, sd * t.w * 0.48], null, null, () => k.loft(half, "tank", { exp: t.exp }));
    });
    k.box([t.len * 0.7, 0.012, 0.06], [info.x0 - t.len * 0.45, info.base(info.x0 - t.len * 0.45) + t.h * 1.0, 0], "chrome", { radius: 0.005 });
  } else {
    // smooth kind for every tank: a superellipse has no creases, only the hull draws its outline
    k.loft(sections, "tank", { exp: t.exp, dent });
  }
  // pinstripe band (accent) around the tank's widest point
  const u = 0.35;
  const xs = info.x0 - u * t.len;
  const stripeY = info.base(xs) + info.top(u) * 0.5;
  k.box([0.006, info.top(u) * 1.02, t.w * 2.05], [xs, stripeY, 0], "accent", { kind: "ink" });
  if (p.tank === "cb-small" || p.tank === "teardrop") k.sides((sd) => k.box([0.12, 0.05, 0.01], [info.x0 - t.len * 0.62, info.base(info.x0 - t.len * 0.62) + 0.045, sd * t.w * 0.82], "rubber", { radius: 0.004 }));
  if (p.tank === "airbox") k.sides((sd) => k.box([0.12, 0.06, 0.03], [info.x0 - 0.06, info.base(info.x0) + 0.05, sd * t.w * 0.95], "black", { radius: 0.01, rot: [0, sd * 10 * DEG, 0] }));
  if (p.tank === "touring") k.box([t.len * 0.5, 0.014, 0.09], [info.x0 - t.len * 0.4, info.base(info.x0 - t.len * 0.4) + t.h * 0.98, 0], "chrome", { radius: 0.006 });
}

export function gasCap(k: Kit, { r, p }: Ctx) {
  const info = tankInfo(r, p.tank);
  const y = info.capY;
  const x = info.capX;
  switch (p.gasCap) {
    case "monza":
    case "offset": {
      const z = p.gasCap === "offset" ? -info.t.w * 0.45 : 0;
      k.cyl(0.034, 0.036, 0.022, [x, y + 0.006, z], "alloy", { seg: 24 });
      k.box([0.022, 0.012, 0.03], [x + 0.04, y + 0.012, z], "alloy", { radius: 0.004 });
      k.box([0.05, 0.006, 0.014], [x + 0.005, y + 0.02, z], "alloy");
      break;
    }
    case "aero":
      k.cyl(0.046, 0.046, 0.008, [x, y, 0], "alloy", { seg: 28 });
      k.repeat(k.n(8, 6), (_, a) => k.cyl(0.004, 0.004, 0.006, [x + Math.cos(a) * 0.038, y + 0.006, Math.sin(a) * 0.038], "black", { seg: 6, kind: "ink" }));
      break;
    case "flush":
      k.cyl(0.022, 0.022, 0.006, [x, y, 0], "chrome", { seg: 18 });
      break;
    case "screw":
      k.cyl(0.03, 0.03, 0.018, [x, y + 0.006, 0], "chrome", { seg: 24 });
      k.sphere(0.03, [x, y + 0.015, 0], "chrome", { scale: [1, 0.35, 1], phi: [0, Math.PI * 2], theta: [0, Math.PI / 2], seg: 16 });
      k.repeat(k.n(12, 6), (_, a) => k.box([0.005, 0.016, 0.004], [x + Math.cos(a) * 0.031, y + 0.006, Math.sin(a) * 0.031], "chrome", { rot: [0, -a, 0], kind: "ink" }));
      break;
  }
}

/* ---------------- seat ---------------- */

export function seat(k: Kit, { r, p }: Ctx) {
  const x0 = seatStart(r, p);
  const yAt = (x: number) => railAt(r, x);
  const pad = (xa: number, xb: number, th: number, w: number, exp = 3.2, lift = 0) => {
    const n = k.n(10, 5);
    const secs: [number, number, number, number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = xa + (xb - xa) * u;
      const end = Math.min(1, Math.sin(Math.PI * Math.min(0.99, 0.04 + u * 0.92)) * 3);
      secs.push([x, yAt(x) + th / 2 + lift, w * (0.75 + 0.25 * end), (th / 2) * end, th / 2]);
    }
    k.loft(secs, "leather", { exp });
  };
  switch (p.seat) {
    case "cafe-hump": {
      const xe = r.aR[0] + 0.22;
      pad(x0, xe, 0.055, 0.11);
      // hump cowl in tank paint, ending over the rear axle
      const y0 = yAt(xe);
      k.extrude([[0, 0], [-0.24, -0.01], [-0.25, 0.06], [-0.2, 0.12], [-0.05, 0.075], [0, 0.04]], 0.22, [xe + 0.02, y0 - 0.005, 0], "tank", { bevel: 0.012 });
      k.cyl(0.035, 0.035, 0.226, [xe - 0.12, y0 + 0.055, 0], "plate", { rot: [90 * DEG, 0, 0], kind: "hard", seg: 20 });
      break;
    }
    case "bobber-solo": {
      const xs = x0 - 0.12;
      const ys = yAt(x0) + 0.08;
      k.at([xs, ys, 0], [0, 0, 0.06], null, () => k.loft([[0.12, 0.02, 0.06, 0.018, 0.012], [0.05, 0.025, 0.13, 0.025, 0.012], [-0.06, 0.03, 0.135, 0.03, 0.012], [-0.13, 0.03, 0.11, 0.028, 0.012]], "leather", { exp: 3 }));
      k.sides((sd) => {
        for (let i = 0; i < k.n(6, 4); i++) k.torus(0.02, 0.004, [xs - 0.08, ys - 0.02 - i * 0.017, sd * 0.07], "chrome", { rot: [90 * DEG, 0, 0], kind: "ink", seg: 14, radial: 4 });
        k.rod([xs - 0.08, ys - 0.12, sd * 0.07], [xs - 0.08, yAt(xs - 0.08) - 0.01, sd * 0.07], 0.006, "chrome");
      });
      k.rod([xs + 0.11, ys - 0.01, 0], [xs + 0.14, yAt(x0) - 0.01, 0], 0.012, "chrome");
      break;
    }
    case "brat-flat":
      pad(x0, r.tail[0] + 0.01, 0.055, 0.13, 6);
      k.box([Math.abs(r.tail[0] - x0), 0.012, 0.23], [(x0 + r.tail[0]) / 2, yAt((x0 + r.tail[0]) / 2) - 0.002, 0], "black", { kind: "ink" });
      break;
    case "jap-thin": {
      const xe = lerp2(r.pivot, r.aR, 0.86)[0] + 0.03;
      pad(x0, xe, 0.032, 0.105, 5, -0.012);
      break;
    }
    case "tracker-tail": {
      const xe = r.tail[0] + 0.02;
      pad(x0, xe + 0.16, 0.06, 0.12, 3);
      const y0 = yAt(xe);
      k.extrude([[0, 0], [-0.17, 0], [-0.19, 0.14], [-0.13, 0.17], [0.02, 0.06]], 0.2, [xe + 0.16, y0 - 0.01, 0], "tank", { bevel: 0.01 });
      k.box([0.012, 0.11, 0.16], [xe - 0.03, y0 + 0.08, 0], "plate", { rot: [0, 0, -0.12] });
      break;
    }
    case "king-queen": {
      const xd = x0 - 0.08;
      k.at([xd, yAt(xd) + 0.02, 0], null, null, () => k.loft([[0.12, 0.0, 0.08, 0.02, 0.01], [0.0, 0.02, 0.15, 0.035, 0.012], [-0.12, 0.045, 0.13, 0.04, 0.012]], "leather", { exp: 3 }));
      const xq = xd - 0.27;
      k.at([xq, yAt(xq) + 0.08, 0], null, null, () => k.loft([[0.09, 0.0, 0.1, 0.03, 0.012], [-0.04, 0.02, 0.11, 0.035, 0.012], [-0.11, 0.035, 0.09, 0.03, 0.012]], "leather", { exp: 3 }));
      k.box([0.05, 0.24, 0.17], [xq - 0.13, yAt(xq) + 0.22, 0], "leather", { radius: 0.022, rot: [0, 0, 0.18] });
      break;
    }
    case "two-up": {
      const xe = r.tail[0] + 0.05;
      pad(x0, xe, 0.065, 0.125, 3.4);
      k.tube([[x0 - 0.42, yAt(x0 - 0.42) + 0.02, -0.12], [xe + 0.02, yAt(xe) + 0.04, -0.12], [xe - 0.04, yAt(xe) + 0.045, 0], [xe + 0.02, yAt(xe) + 0.04, 0.12], [x0 - 0.42, yAt(x0 - 0.42) + 0.02, 0.12]], 0.011, "chrome");
      break;
    }
    case "sf-kicked": {
      const xe = r.tail[0] + 0.12;
      pad(x0, x0 - 0.3, 0.06, 0.12, 3);
      const y0 = yAt(xe);
      k.extrude([[0.0, 0.0], [-0.3, 0.12], [-0.33, 0.15], [-0.25, 0.16], [0.05, 0.08]], 0.17, [x0 - 0.18, yAt(x0 - 0.18) - 0.01, 0], "tank", { bevel: 0.01 });
      void y0;
      break;
    }
    case "board-saddle": {
      const xs = Math.min(x0, r.seatFront) - 0.2;
      const ys = yAt(xs) - 0.03;
      k.at([xs, ys, 0], [0, 0, -0.12], null, () => k.loft([[0.13, 0.0, 0.03, 0.01, 0.006], [0.05, 0.01, 0.07, 0.016, 0.008], [-0.06, 0.02, 0.12, 0.022, 0.01], [-0.11, 0.025, 0.11, 0.02, 0.01]], "leather", { exp: 3 }));
      k.rod([xs, ys - 0.01, 0], [xs + 0.04, ys - 0.12, 0], 0.012, "chrome");
      break;
    }
    case "touring-step": {
      const xd = x0 - 0.04;
      const xm = x0 - 0.36;
      const xe = r.tail[0] + 0.12;
      pad(xd, xm, 0.07, 0.17, 3.2);
      pad(xm + 0.02, xe, 0.07, 0.15, 3.2, 0.05);
      break;
    }
  }
}

/* ---------------- front end: fork, headlamp, cowl, fenders ---------------- */

export function fork(k: Kit, { r, p, style }: Ctx) {
  const fz = forkZ(p, style);
  const L = r.forkLen;
  const at = (t: number, sd: number, back = 0): V3 => P(onFork(r, t, back), sd * fz);
  // triple clamps and stem
  const yaw = Math.atan2(r.d[1], r.d[0]) - Math.PI / 2;
  for (const t of [L, L + 0.16]) k.box([0.075, 0.028, fz * 2 + 0.06], P(lerp2(onFork(r, t), onFork(r, t, 0.05), 0.5)), "alloy", { rot: [0, 0, yaw], radius: 0.01 });
  k.rod(at(-0.002, -1), at(-0.002, 1), 0.012, "chrome");
  switch (p.fork) {
    case "telescopic":
    case "gaiters":
    case "extended":
      k.sides((sd) => {
        k.rod(at(L * (p.fork === "extended" ? 0.25 : 0.42), sd), at(L + 0.18, sd), 0.018, "chrome");
        k.rod(at(-0.03, sd), at(L * (p.fork === "extended" ? 0.28 : 0.48), sd), 0.025, p.fork === "extended" ? "chrome" : "alloy");
        if (p.fork === "gaiters") {
          const n = k.n(9, 5);
          for (let i = 0; i < n; i++) k.torus(0.024, 0.006, at(L * 0.5 + 0.01 + (i * (L * 0.42 - 0.03)) / n, sd), "rubber", { rot: [Math.PI / 2 + 0, 0, 0], seg: 18, radial: 6 });
          k.rod(at(L * 0.49, sd), at(L * 0.93, sd), 0.02, "rubber", { seg: 12 });
        }
        if (p.fork === "extended") for (const tt of [L * 0.5, L * 0.72]) k.rod(at(tt, sd), at(tt + 0.02, sd), 0.021, "alloy");
      });
      break;
    case "usd":
      k.sides((sd) => {
        k.rod(at(L * 0.4, sd), at(L + 0.19, sd), 0.03, "alloy", { seg: 18 });
        k.rod(at(0.0, sd), at(L * 0.42, sd), 0.02, "accent", { seg: 14 });
        k.box([0.07, 0.05, 0.035], at(0.0, sd), "black", { radius: 0.01 });
      });
      break;
    case "springer":
      k.sides((sd) => {
        k.rod(at(0.02, sd), at(L + 0.04, sd), 0.012, "chrome");
        k.rod(at(0.06, sd, -0.06), at(L + 0.06, sd, -0.06), 0.011, "chrome");
        k.box([0.11, 0.025, 0.014], P(onFork(r, 0.02, -0.03), sd * fz), "chrome", { rot: [0, 0, yaw + Math.PI / 2], radius: 0.005 });
        for (let i = 0; i < k.n(7, 4); i++) k.torus(0.016, 0.0035, at(L - 0.02 + i * 0.016, sd, -0.06), "chrome", { rot: [Math.PI / 2, 0, -r.rake * DEG], kind: "ink", seg: 14, radial: 4 });
      });
      break;
    case "girder":
      k.sides((sd) => {
        k.box([0.035, L + 0.2, 0.014], P(onFork(r, L / 2 + 0.05, -0.04), sd * fz), "frame", { rot: [0, 0, -r.rake * DEG], radius: 0.006 });
        for (const tt of [L + 0.02, L + 0.15]) k.rod(at(tt, sd, -0.04), at(tt, sd, 0.06), 0.009, "chrome");
      });
      for (let i = 0; i < k.n(7, 4); i++) k.torus(0.022, 0.004, P(onFork(r, L - 0.05 + i * 0.02, -0.1)), "chrome", { rot: [Math.PI / 2, 0, -r.rake * DEG], kind: "ink", seg: 14, radial: 4 });
      break;
    case "leading-link":
      k.sides((sd) => {
        k.rod(at(0.04, sd, 0.1), at(L + 0.18, sd), 0.018, "frame");
        k.rod(at(0.04, sd, 0.1), at(0, sd), 0.012, "frame");
        k.rod(at(0.0, sd), at(0.2, sd, 0.06), 0.012, "chrome");
      });
      break;
  }
}

export function headlamp(k: Kit, { r, p, style }: Ctx) {
  if (p.headlamp === "none") return;
  const c = lampAt(r);
  const fz = forkZ(p, style);
  const ears = (y: number, rad: number) =>
    k.sides((sd) => k.rod([c[0] - 0.02, y, sd * (rad + 0.004)], P(onFork(r, r.forkLen - 0.02), sd * fz), 0.006, "black", { seg: 6 }));
  const bucket = (rad: number, depth: number, pos: V3, slot: Slot = "chrome") => {
    k.at(pos, [0, 0, -90 * DEG], null, () => {
      k.lathe([[0.001, -depth], [rad * 0.55, -depth * 0.96], [rad * 0.92, -depth * 0.6], [rad, -0.01], [rad, 0]], [0, 0, 0], slot, { seg: 30 });
      k.torus(rad * 0.96, 0.007, [0, 0.0, 0], "chrome", { rot: [90 * DEG, 0, 0], seg: 36 });
      k.sphere(rad * 0.92, [0, -0.02, 0], "lens", { scale: [1, 0.22, 1], theta: [0, Math.PI / 2], seg: 24 });
    });
  };
  switch (p.headlamp) {
    case "round-7":
      bucket(0.095, 0.12, P(c));
      ears(c[1], 0.095);
      break;
    case "round-575":
      bucket(0.078, 0.1, P(c));
      ears(c[1], 0.078);
      break;
    case "bates": {
      const cc: V2 = [c[0] - 0.02, c[1] + 0.03];
      bucket(0.062, 0.1, P(cc));
      k.sphere(0.064, [cc[0] + 0.0, cc[1] + 0.004, 0], "chrome", { phi: [0, Math.PI], theta: [0, Math.PI / 2], seg: 16, scale: [1.2, 1, 1] });
      k.rod([cc[0] - 0.04, cc[1] - 0.06, 0], P(r.clampLo), 0.008, "chrome");
      break;
    }
    case "twin-lamp":
      k.sides((sd) => bucket(0.055, 0.09, [c[0], c[1] + 0.01, sd * 0.065], "black"));
      k.rod([c[0] - 0.05, c[1], -0.14], [c[0] - 0.05, c[1], 0.14], 0.007, "black");
      ears(c[1], 0.12);
      break;
    case "square":
      k.box([0.1, 0.12, 0.17], [c[0] - 0.03, c[1], 0], "black", { radius: 0.018 });
      k.box([0.012, 0.1, 0.15], [c[0] + 0.022, c[1], 0], "lens", { radius: 0.004 });
      ears(c[1], 0.085);
      break;
    case "projector":
      bucket(0.085, 0.11, P(c), "black");
      k.cyl(0.032, 0.032, 0.04, [c[0] + 0.01, c[1] - 0.01, 0], "lens", { rot: [0, 0, 90 * DEG], seg: 20 });
      k.torus(0.066, 0.006, [c[0] + 0.006, c[1], 0], "lamp", { rot: [0, 90 * DEG, 0], seg: 40, kind: "ink" });
      ears(c[1], 0.085);
      break;
    case "plate-lamp": {
      const pc = add(onFork(r, r.forkLen - 0.05), r.n, 0.075);
      k.at(P(pc), [0, 0, -r.rake * DEG], null, () => {
        k.extrude(ellipse(0.16, 0.14), 0.014, [0, 0, 0], "plate", { rot: [0, 90 * DEG, 0], bevel: 0.003 });
        k.sides((sd) => k.cyl(0.035, 0.035, 0.03, [0.012, -0.04, sd * 0.06], "lamp", { rot: [0, 0, 90 * DEG], seg: 16 }));
      });
      break;
    }
  }
}

function ellipse(a: number, b: number, n = 28): V2[] {
  return Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * a, Math.sin((i / n) * Math.PI * 2) * b] as V2);
}
function rrect(w: number, h: number, rad: number): V2[] {
  const out: V2[] = [];
  const c: V2[] = [[w / 2 - rad, h / 2 - rad], [-w / 2 + rad, h / 2 - rad], [-w / 2 + rad, -h / 2 + rad], [w / 2 - rad, -h / 2 + rad]];
  c.forEach(([cx, cy], q) => {
    for (let i = 0; i <= 4; i++) {
      const a = (q + i / 4) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
  });
  return out;
}

export function cowl(k: Kit, { r, p }: Ctx) {
  const c = lampAt(r);
  switch (p.cowl) {
    case "cafe-half":
      k.sphere(0.2, [c[0] - 0.08, c[1] + 0.02, 0], "tank", { scale: [0.75, 1.15, 1], phi: [-Math.PI / 2, Math.PI], theta: [0.25, Math.PI * 0.6], seg: 22, kind: "smooth" });
      k.box([0.006, 0.13, 0.24], [c[0] - 0.06, c[1] + 0.2, 0], "lens", { rot: [0, 0, 0.55], radius: 0.002 });
      break;
    case "flyscreen":
      k.box([0.006, 0.11, 0.17], [c[0] - 0.02, c[1] + 0.12, 0], "lens", { rot: [0, 0, 0.5], radius: 0.002 });
      k.sides((sd) => k.rod([c[0] - 0.01, c[1] + 0.04, sd * 0.06], [c[0] + 0.02, c[1] + 0.12, sd * 0.07], 0.004, "black", { seg: 5 }));
      break;
    case "sharknose":
      k.at([c[0] - 0.02, c[1] + 0.02, 0], [0, 0, -0.1], null, () => k.loft([[0.1, 0.0, 0.02, 0.02, 0.02], [0.02, 0.03, 0.13, 0.07, 0.05], [-0.12, 0.05, 0.14, 0.08, 0.06]], "tank", { exp: 3, kind: "hard" }));
      break;
    case "batwing": {
      // fork-mounted shell: the front half of a flattened ellipsoid, wide in Z, nose rounded, open at the back
      const f: V3 = [c[0] - 0.05, c[1] + 0.04, 0];
      k.sphere(1, f, "tank", { scale: [0.2, 0.22, 0.52], phi: [Math.PI / 2, Math.PI], theta: [0.16 * Math.PI, 0.56 * Math.PI], seg: 36 });
      // curved windscreen rising from the top edge, raked back
      k.at([f[0] - 0.05, f[1] - 0.06, 0], [0, 0, 0.3], null, () =>
        k.sphere(1, [0, 0, 0], "lens", { scale: [0.18, 0.32, 0.42], phi: [0.6 * Math.PI, 0.8 * Math.PI], theta: [0.06 * Math.PI, 0.32 * Math.PI], seg: 28 }),
      );
      // inner dash closing the back, flush with the open edge
      k.box([0.03, 0.14, 0.62], [f[0] - 0.01, f[1] + 0.1, 0], "black", { radius: 0.02 });
      break;
    }
    case "plate": {
      const pc = add(onFork(r, r.forkLen - 0.07), r.n, 0.075);
      k.at(P(pc), [0, 0, -r.rake * DEG], null, () => {
        k.extrude(rrect(0.3, 0.3, 0.03), 0.01, [0, 0, 0], "plate", { rot: [0, 90 * DEG, 0], bevel: 0.002 });
        k.box([0.004, 0.035, 0.29], [0.008, 0.12, 0], "accent", { kind: "ink" });
      });
      break;
    }
  }
}

/** Annular sector shell around a wheel, angles in degrees from +X (front), counterclockwise. */
function sector(k: Kit, c: V2, rIn: number, rOut: number, a0: number, a1: number, width: number, slot: Slot) {
  const n = k.n(20, 8);
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    pts.push([Math.cos(a) * rOut, Math.sin(a) * rOut]);
  }
  for (let i = n; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    pts.push([Math.cos(a) * rIn, Math.sin(a) * rIn]);
  }
  k.extrude(pts, width, P(c), slot, { bevel: 0.002 });
}

export function fenderFront(k: Kit, { r, p, style }: Ctx) {
  if (p.fenderFront === "none") return;
  const t = r.tF;
  const w = t.sec + 0.035;
  const fz = forkZ(p, style);
  const stays = (a: number, rr: number) => k.sides((sd) => k.rod([r.aF[0] + Math.cos(a * DEG) * rr, r.aF[1] + Math.sin(a * DEG) * rr, sd * (w / 2 + 0.004)], [r.aF[0], r.aF[1], sd * fz], 0.004, "chrome", { seg: 5 }));
  switch (p.fenderFront) {
    case "short":
      sector(k, r.aF, t.r + 0.02, t.r + 0.026, 40, 125, w, "tank");
      stays(60, t.r + 0.02);
      break;
    case "high": {
      const c = onFork(r, r.forkLen - 0.02, -0.0);
      sector(k, [r.aF[0], c[1] - t.r - 0.03], t.r - 0.0, t.r + 0.006, 55, 120, w, "tank");
      break;
    }
    case "deep":
      sector(k, r.aF, t.r + 0.02, t.r + 0.026, -15, 170, w + 0.03, "tank");
      k.sides((sd) => {
        const pts: V2[] = [];
        for (let i = 0; i <= 16; i++) pts.push([Math.cos((-15 + (185 * i) / 16) * DEG) * (t.r + 0.024), Math.sin((-15 + (185 * i) / 16) * DEG) * (t.r + 0.024)]);
        for (let i = 16; i >= 0; i--) pts.push([Math.cos((-15 + (185 * i) / 16) * DEG) * (t.r - t.h * 0.55), Math.sin((-15 + (185 * i) / 16) * DEG) * (t.r - t.h * 0.55)]);
        k.extrude(pts, 0.006, [r.aF[0], r.aF[1], sd * (w / 2 + 0.015)], "tank", { bevel: 0.002 });
      });
      break;
  }
}

export function fenderRear(k: Kit, { r, p }: Ctx) {
  if (p.fenderRear === "none") return;
  const t = r.tR;
  const w = t.sec + 0.035;
  switch (p.fenderRear) {
    case "bobbed":
      sector(k, r.aR, t.r + 0.02, t.r + 0.026, 75, 150, w, "tank");
      break;
    case "strut":
      sector(k, r.aR, t.r + 0.018, t.r + 0.023, 60, 175, 0.045, "frame");
      k.sides((sd) => k.rod([r.aR[0] - 0.06, r.aR[1] + 0.02, sd * 0.09], [r.aR[0] - 0.2, r.aR[1] + t.r - 0.02, sd * 0.03], 0.006, "frame", { seg: 6 }));
      break;
    case "valanced":
      sector(k, r.aR, t.r + 0.02, t.r + 0.028, 30, 205, w + 0.05, "tank");
      k.sides((sd) => {
        const pts: V2[] = [];
        for (let i = 0; i <= 16; i++) pts.push([Math.cos((30 + (175 * i) / 16) * DEG) * (t.r + 0.026), Math.sin((30 + (175 * i) / 16) * DEG) * (t.r + 0.026)]);
        for (let i = 16; i >= 0; i--) pts.push([Math.cos((30 + (175 * i) / 16) * DEG) * (t.r - t.h * 0.6), Math.sin((30 + (175 * i) / 16) * DEG) * (t.r - t.h * 0.6)]);
        k.extrude(pts, 0.006, [r.aR[0], r.aR[1], sd * (w / 2 + 0.025)], "tank", { bevel: 0.002 });
      });
      break;
    case "hugger":
      sector(k, r.aR, t.r + 0.015, t.r + 0.021, 75, 120, t.sec + 0.02, "black");
      k.sides((sd) => k.rod([r.aR[0] + 0.05, r.aR[1] + t.r + 0.01, sd * (t.sec / 2 + 0.01)], [r.aR[0] + 0.2, r.aR[1] + 0.04, sd * 0.09], 0.006, "black", { seg: 6 }));
      break;
  }
}

/* ---------------- wheels & tires (one axle each) ---------------- */

export function wheel(k: Kit, { r, p, style }: Ctx, front: boolean) {
  const a = front ? r.aF : r.aR;
  const t = front ? r.tF : r.tR;
  const rim = t.rim;
  const slotRim: Slot = p.wheels === "spoke" ? "chrome" : "alloy";
  k.at(P(a), null, null, () => {
    k.torus(rim, 0.013, [0, 0, 0], slotRim, { seg: 60, radial: 10, scale: [1, 1, Math.max(1, t.sec / 0.07)] });
    k.torus(rim - 0.018, 0.004, [0, 0, 0], "accent", { seg: 56, kind: "ink", radial: 4 });
    k.cyl(0.045, 0.045, 0.12, [0, 0, 0], "alloy", { rot: [90 * DEG, 0, 0], seg: 20 });
    switch (p.wheels) {
      case "spoke": {
        const n = k.n(36, 24);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          const z = i % 2 ? 0.04 : -0.04;
          k.rod([Math.cos(ang) * 0.042, Math.sin(ang) * 0.042, z], [Math.cos(ang + 0.16) * (rim - 0.01), Math.sin(ang + 0.16) * (rim - 0.01), 0], 0.0022, "chrome", { kind: "ink", seg: 4 });
        }
        k.sides((sd) => k.cyl(0.06, 0.06, 0.008, [0, 0, sd * 0.042], "alloy", { rot: [90 * DEG, 0, 0], seg: 24 }));
        break;
      }
      case "cast":
        k.repeat(5, (_, ang) => {
          for (const off of [-0.11, 0.11]) {
            const aa = ang + off;
            k.box([rim - 0.06, 0.018, 0.024], [Math.cos(aa) * (rim / 2 + 0.02), Math.sin(aa) * (rim / 2 + 0.02), 0], slotRim, { rot: [0, 0, aa], radius: 0.006 });
          }
        });
        break;
      case "disc":
        k.sides((sd) => {
          k.cyl(rim - 0.005, rim - 0.005, 0.008, [0, 0, sd * 0.034], "frame", { rot: [90 * DEG, 0, 0], seg: 48 });
          k.sphere(0.07, [0, 0, sd * 0.04], "chrome", { scale: [1, 1, 0.3 * sd], seg: 20 });
        });
        break;
      case "mag":
        k.repeat(7, (_, ang) => k.box([rim - 0.05, 0.05, 0.05], [Math.cos(ang) * (rim / 2 + 0.01), Math.sin(ang) * (rim / 2 + 0.01), 0], "black", { rot: [0, 0, ang], radius: 0.012 }));
        k.torus(rim - 0.01, 0.01, [0, 0, 0.03], "alloy", { seg: 56 });
        break;
      case "billet": {
        k.cyl(rim - 0.006, rim - 0.006, 0.03, [0, 0, 0], "alloy", { rot: [90 * DEG, 0, 0], seg: 56 });
        k.repeat(k.n(10, 6), (_, ang) => k.box([rim * 0.62, 0.012, 0.034], [Math.cos(ang) * rim * 0.52, Math.sin(ang) * rim * 0.52, 0], "black", { rot: [0, 0, ang + 0.25], kind: "ink" }));
        break;
      }
    }
    // brakes: front disc on telescopic/USD forks (flat and board trackers run no front brake), rear sprocket
    const brakeless = style === "flat-tracker" || style === "board-tracker";
    if (front && !brakeless && p.fork !== "springer" && p.fork !== "girder") {
      k.cyl(rim * 0.6, rim * 0.6, 0.005, [0, 0, -0.055], "alloy", { rot: [90 * DEG, 0, 0], seg: 40 });
      k.box([0.07, 0.04, 0.03], [-rim * 0.52, rim * 0.2, -0.06], "black", { rot: [0, 0, 0.4], radius: 0.008 });
    }
    if (!front) k.torus(rim * 0.6, 0.004, [0, 0, 0.115], "black", { seg: 40, radial: 4, kind: "ink" });
  });
}

export function tire(k: Kit, { r, p }: Ctx, front: boolean) {
  const a = front ? r.aF : r.aR;
  const t: Tire = front ? r.tF : r.tR;
  const h = t.h;
  const R = t.rim + h / 2;
  const zs = t.sec / h;
  k.at(P(a), null, null, () => {
    k.torus(R, h / 2, [0, 0, 0], "rubber", { seg: 72, radial: 14, scale: [1, 1, zs] });
    const blocks = (count: number, rows: number, bw: number, bh: number, bd: number, spread: number) => {
      const n = k.n(count, Math.round(count * 0.6));
      for (let row = 0; row < rows; row++)
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + (row * Math.PI) / n;
          const z = rows === 1 ? 0 : (row / (rows - 1) - 0.5) * spread;
          k.box([bw, bh, bd], [Math.cos(ang) * (t.r - bh * 0.25), Math.sin(ang) * (t.r - bh * 0.25), z], "rubber", { rot: [0, 0, ang - Math.PI / 2] });
        }
    };
    switch (p.tires) {
      case "street":
        for (const z of [-0.25, 0.25]) k.torus(t.r - 0.002, 0.002, [0, 0, z * t.sec], "black", { seg: 64, kind: "ink", radial: 3 });
        break;
      case "knobby":
        blocks(28, 2, 0.034, 0.024, t.sec * 0.36, t.sec * 0.5);
        break;
      case "dual-sport":
        blocks(40, 3, 0.022, 0.012, t.sec * 0.24, t.sec * 0.62);
        break;
      case "flat-track":
        blocks(44, 2, 0.02, 0.01, t.sec * 0.3, t.sec * 0.42);
        break;
      case "gambot":
        blocks(24, 2, 0.045, 0.026, t.sec * 0.44, t.sec * 0.44);
        break;
      case "whitewall":
        k.sides((sd) => k.torus(R - h * 0.12, h * 0.16, [0, 0, sd * t.sec * 0.36], "plate", { seg: 64, radial: 6, scale: [1, 1, 0.35] }));
        break;
      case "radial":
        k.repeat(k.n(30, 18), (_, ang) => k.box([0.004, 0.003, t.sec * 0.7], [Math.cos(ang) * t.r, Math.sin(ang) * t.r, 0], "black", { rot: [0, 0, ang + 0.4], kind: "ink" }));
        break;
      case "clincher":
        for (const z of [-0.22, 0, 0.22]) k.torus(t.r - 0.001, 0.0025, [0, 0, z * t.sec], "black", { seg: 64, kind: "ink", radial: 3 });
        break;
    }
  });
}

/* ---------------- tail: taillight, side covers, sissy bar, luggage ---------------- */

export function taillight(k: Kit, { r, p }: Ctx) {
  const T: V2 = [r.tail[0] - 0.035, r.tail[1] - 0.03];
  switch (p.taillight) {
    case "lucas":
      k.box([0.05, 0.05, 0.105], [T[0], T[1], 0], "black", { radius: 0.008 });
      k.cyl(0.03, 0.03, 0.1, [T[0] - 0.01, T[1] + 0.01, 0], "red", { rot: [90 * DEG, 0, 0], theta: [Math.PI, Math.PI / 2], seg: 12 });
      k.box([0.012, 0.11, 0.17], [T[0] - 0.02, T[1] - 0.1, 0], "plate", { radius: 0.004 });
      break;
    case "cat-eye":
      k.sphere(0.035, [T[0] + 0.02, railAt(r, T[0] + 0.02) + 0.0, 0], "red", { scale: [1.8, 0.7, 0.9], seg: 18 });
      k.box([0.08, 0.012, 0.04], [T[0] + 0.02, railAt(r, T[0] + 0.02) - 0.02, 0], "chrome", { radius: 0.004 });
      break;
    case "led-strip":
      k.box([0.015, 0.016, 0.2], [T[0] + 0.01, T[1] - 0.005, 0], "red", { radius: 0.006 });
      break;
    case "loop":
      k.tube([[T[0] + 0.12, T[1] + 0.005, -0.1], [T[0] - 0.02, T[1] + 0.01, -0.08], [T[0] - 0.05, T[1] + 0.01, 0], [T[0] - 0.02, T[1] + 0.01, 0.08], [T[0] + 0.12, T[1] + 0.005, 0.1]], 0.012, "frame");
      k.box([0.014, 0.012, 0.09], [T[0] - 0.055, T[1] + 0.01, 0], "red", { radius: 0.004 });
      break;
    case "side-mount": {
      const b: V3 = [r.aR[0] - 0.03, r.aR[1] + 0.1, 0.15];
      k.rod([r.aR[0], r.aR[1], 0.1], b, 0.006, "black", { seg: 6 });
      k.box([0.012, 0.11, 0.17], [b[0] - 0.01, b[1], b[2] + 0.07], "plate", { rot: [0, 90 * DEG, 0], radius: 0.004 });
      k.cyl(0.024, 0.024, 0.03, [b[0] - 0.02, b[1] + 0.07, b[2]], "red", { rot: [0, 0, 90 * DEG], seg: 14 });
      break;
    }
  }
}

export function signals(k: Kit, { r, p, style }: Ctx) {
  if (p.signals === "none") return;
  const c = lampAt(r);
  const back: V2 = [r.tail[0] + 0.02, r.tail[1] - 0.05];
  const one = (pos: V3, dir: 1 | -1, size: "bullet" | "mini") => {
    if (size === "bullet") {
      k.rod([pos[0], pos[1], pos[2] - Math.sign(pos[2]) * 0.03], pos, 0.005, "black", { seg: 6 });
      k.cyl(0.018, 0.018, 0.04, pos, "chrome", { rot: [0, 0, 90 * DEG], seg: 14 });
      k.sphere(0.018, [pos[0] + dir * 0.02, pos[1], pos[2]], "amber", { seg: 12, scale: [0.8, 1, 1] });
    } else {
      k.cyl(0.008, 0.008, 0.035, pos, "black", { rot: [0, 0, 90 * DEG], seg: 8 });
      k.cyl(0.008, 0.008, 0.008, [pos[0] + dir * 0.02, pos[1], pos[2]], "amber", { rot: [0, 0, 90 * DEG], seg: 8 });
    }
  };
  const size = p.signals === "bullet" ? "bullet" : "mini";
  if (p.signals === "bar-end-signal") {
    const ends = barEnds(r, p);
    k.sides((sd) => k.cyl(0.02, 0.02, 0.014, [ends.end[0], ends.end[1], sd * (ends.end[2] + 0.008)], "amber", { rot: [90 * DEG, 0, 0], seg: 14 }));
  } else k.sides((sd) => one([c[0] - 0.04, c[1] + 0.03, sd * (forkZ(p, style) + 0.06)], 1, size));
  k.sides((sd) => one([back[0], back[1], sd * 0.1], -1, size));
}

export function sideCover(k: Kit, { r, p }: Ctx) {
  const cx = (r.pivot[0] + r.seatFront) / 2 - 0.06;
  const cy = (r.pivot[1] + r.rail) / 2 + 0.03;
  const z = r.wz + 0.035;
  switch (p.sideCover) {
    case "oval-plate":
      k.sides((sd) => {
        k.extrude(ellipse(0.13, 0.105), 0.008, [cx, cy, sd * z], "plate", { bevel: 0.002 });
        k.torus(0.07, 0.004, [cx, cy, sd * (z + 0.005)], "accent", { kind: "ink", seg: 28, radial: 4, scale: [1, 1, 1] });
      });
      break;
    case "rect-plate":
      k.sides((sd) => {
        k.extrude(rrect(0.29, 0.24, 0.035), 0.008, [cx - 0.01, cy, sd * z], "plate", { bevel: 0.002 });
        k.box([0.22, 0.004, 0.004], [cx - 0.01, cy + 0.07, sd * (z + 0.006)], "accent", { kind: "ink" });
      });
      break;
    case "small-plate":
      k.sides((sd) => k.extrude(rrect(0.18, 0.14, 0.03), 0.008, [cx, cy, sd * z], "plate", { bevel: 0.002 }));
      break;
    case "stock-tri":
      k.sides((sd) =>
        k.extrude([[r.pivot[0] + 0.05, r.pivot[1] + 0.06], [r.seatFront + 0.02, r.rail - 0.03], [r.seatFront - 0.26, railAt(r, r.seatFront - 0.26) - 0.03]], 0.012, [0, 0, sd * (r.wz + 0.02)], "tank", { bevel: 0.004 }),
      );
      break;
    case "none":
      // exposed battery box and loom
      k.box([0.13, 0.12, 0.13], [cx, cy - 0.02, 0], "black", { radius: 0.008 });
      k.tube([[cx + 0.06, cy + 0.03, 0.06], [cx + 0.15, cy + 0.08, 0.05], [r.headLo[0] - 0.1, r.headLo[1], 0.04]], 0.004, "rubber", { kind: "ink", seg: 4 });
      break;
  }
}

export function sissyBar(k: Kit, { r, p }: Ctx) {
  if (p.sissyBar === "none") return;
  const h = p.sissyBar === "short" ? 0.32 : p.sissyBar === "tall" ? 0.72 : 0.46;
  const x = r.tail[0] + 0.08;
  const y0 = railAt(r, x) - 0.02;
  const w = 0.1;
  k.sides((sd) => k.rod([r.aR[0], r.aR[1], sd * 0.1], [x, y0, sd * w], 0.009, "chrome"));
  k.tube([[x, y0, -w], [x - 0.04, y0 + h * 0.7, -w], [x - 0.05, y0 + h - 0.04, -w * 0.75], [x - 0.052, y0 + h, 0], [x - 0.05, y0 + h - 0.04, w * 0.75], [x - 0.04, y0 + h * 0.7, w], [x, y0, w]], 0.009, "chrome");
  if (p.sissyBar === "pad") k.box([0.05, 0.22, 0.18], [x - 0.02, y0 + h * 0.6, 0], "leather", { radius: 0.02, rot: [0, 0, 0.1] });
}

export function luggage(k: Kit, { r, p }: Ctx) {
  const ax = r.aR[0];
  switch (p.luggage) {
    case "rack": {
      const x0 = r.tail[0] + 0.32;
      const x1 = r.tail[0] + 0.02;
      const y = Math.max(railAt(r, x0), r.tail[1]) + 0.08;
      k.tube([[x0, y, -0.1], [x1, y, -0.1], [x1 - 0.02, y, 0], [x1, y, 0.1], [x0, y, 0.1]], 0.007, "black", { tension: 0 });
      for (let i = 1; i < 4; i++) k.rod([x0 + ((x1 - x0) * i) / 4, y, -0.1], [x0 + ((x1 - x0) * i) / 4, y, 0.1], 0.005, "black", { seg: 6 });
      k.sides((sd) => k.rod([x0, y, sd * 0.1], [x0 + 0.04, railAt(r, x0 + 0.04) - 0.01, sd * 0.085], 0.006, "black", { seg: 6 }));
      break;
    }
    case "hard-bags":
      k.sides((sd) => {
        const z = sd * (r.tR.sec / 2 + 0.13);
        const outline: V2[] = [[0.3, 0.12], [-0.22, 0.12], [-0.3, 0.06], [-0.32, -0.04], [-0.28, -0.12], [-0.1, -0.15], [0.26, -0.15], [0.3, -0.1]];
        k.extrude(outline, 0.18, [ax + 0.06, r.aR[1] + 0.12, z], "tank", { bevel: 0.025 });
        k.box([0.5, 0.01, 0.005], [ax + 0.04, r.aR[1] + 0.2, z + sd * 0.09], "accent", { kind: "ink" });
      });
      break;
    case "slant":
      k.sides((sd) => {
        const z = sd * (r.tR.sec / 2 + 0.1);
        k.extrude([[0.18, 0.13], [-0.12, 0.13], [-0.2, -0.12], [0.12, -0.12]], 0.13, [ax + 0.14, r.aR[1] + 0.13, z], "leather", { bevel: 0.02 });
        k.box([0.012, 0.1, 0.02], [ax + 0.08, r.aR[1] + 0.17, z + sd * 0.07], "chrome", { kind: "ink" });
        k.box([0.012, 0.1, 0.02], [ax + 0.18, r.aR[1] + 0.17, z + sd * 0.07], "chrome", { kind: "ink" });
      });
      break;
    case "ammo": {
      const z = r.tR.sec / 2 + 0.12;
      const pos: V3 = [ax + 0.12, r.aR[1] + 0.14, z];
      k.box([0.28, 0.18, 0.1], pos, "frame", { radius: 0.006 });
      k.box([0.29, 0.022, 0.11], [pos[0], pos[1] + 0.09, z], "black", { radius: 0.004 });
      k.box([0.03, 0.03, 0.02], [pos[0] + 0.1, pos[1] + 0.09, z + 0.06], "black", { radius: 0.004 });
      k.rod([pos[0] + 0.05, pos[1] - 0.09, z - 0.04], [r.aR[0], r.aR[1] + 0.04, 0.1], 0.006, "black", { seg: 6 });
      break;
    }
  }
}

/* ---------------- cockpit: bars, grips, mirrors, gauges, controls ---------------- */

type Bar = { pts: V3[]; end: V3; start: V3; clip: boolean; riser: number };

/** Right-hand (+Z) half of the bar, symmetric about z = 0. */
export function barGeom(r: Rig, p: Parts): Bar {
  const m = onFork(r, r.forkLen + 0.17);
  const x = m[0] - 0.005;
  const y = m[1] + 0.02;
  const B = (pull: number, rise: number, z: number): V3 => [x - pull, y + rise, z];
  const mk = (riser: number, pts: V3[], clip = false): Bar => {
    const end = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const d = [end[0] - prev[0], end[1] - prev[1], end[2] - prev[2]];
    const L = Math.hypot(...d);
    const start: V3 = [end[0] - (d[0] / L) * 0.12, end[1] - (d[1] / L) * 0.12, end[2] - (d[2] / L) * 0.12];
    return { pts, end, start, clip, riser };
  };
  switch (p.handlebar) {
    case "clip-on": {
      const c = onFork(r, r.forkLen + 0.1);
      return mk(0, [[c[0], c[1], 0.09], [c[0] - 0.08, c[1] - 0.025, 0.2], [c[0] - 0.13, c[1] - 0.04, 0.29]], true);
    }
    case "clubman":
      return mk(0.02, [B(0, 0.02, 0), B(0.02, 0.02, 0.1), B(0.08, -0.03, 0.2), B(0.15, -0.05, 0.27), B(0.19, -0.05, 0.36)]);
    case "drag":
      return mk(0.05, [B(0, 0.05, 0), B(0.01, 0.05, 0.2), B(0.04, 0.05, 0.28), B(0.08, 0.05, 0.34)]);
    case "tracker":
      return mk(0.04, [B(0, 0.04, 0), B(0.02, 0.05, 0.1), B(0.07, 0.11, 0.26), B(0.1, 0.12, 0.33), B(0.13, 0.12, 0.42)]);
    case "semi-hanger":
      return mk(0.05, [B(0, 0.05, 0), B(0.02, 0.06, 0.08), B(0.06, 0.2, 0.18), B(0.13, 0.22, 0.26), B(0.18, 0.21, 0.35)]);
    case "camar":
      return mk(0.04, [B(0, 0.04, 0), B(0.01, 0.07, 0.07), B(0.05, 0.16, 0.15), B(0.1, 0.14, 0.24), B(0.15, 0.08, 0.31), B(0.19, 0.08, 0.38)]);
    case "ape":
      return mk(0.04, [B(0, 0.04, 0), B(0.0, 0.05, 0.14), B(0.03, 0.12, 0.2), B(0.06, 0.36, 0.24), B(0.1, 0.42, 0.28), B(0.18, 0.43, 0.36)]);
    case "z-bar":
      return mk(0.03, [B(0, 0.03, 0), B(0, 0.03, 0.12), B(0.01, 0.2, 0.15), B(0.03, 0.22, 0.24), B(0.1, 0.22, 0.34)]);
    case "beach":
      return mk(0.04, [B(0, 0.04, 0), B(0.02, 0.06, 0.16), B(0.12, 0.11, 0.33), B(0.25, 0.12, 0.38), B(0.34, 0.12, 0.4)]);
    case "drop":
      return mk(0.0, [B(0, 0.0, 0), B(0.03, -0.02, 0.12), B(0.12, -0.1, 0.24), B(0.2, -0.15, 0.29), B(0.27, -0.16, 0.32)]);
  }
}

export const barEnds = (r: Rig, p: Parts) => barGeom(r, p);

export function handlebar(k: Kit, { r, p }: Ctx) {
  const b = barGeom(r, p);
  const m = onFork(r, r.forkLen + 0.17);
  if (b.clip) {
    k.sides((sd) => {
      const c = onFork(r, r.forkLen + 0.1);
      k.cyl(0.026, 0.026, 0.05, [c[0], c[1], sd * 0.08], "alloy", { rot: [0, 0, -r.rake * DEG], seg: 16 });
      k.tube(b.pts.map(([x, y, z]) => [x, y, sd * z] as V3), 0.011, "black");
    });
  } else {
    if (b.riser > 0) k.sides((sd) => k.rod([m[0], m[1] - 0.01, sd * 0.045], [m[0] - 0.005, m[1] + 0.02 + b.riser, sd * 0.045], 0.013, "chrome"));
    const full: V3[] = [...b.pts.slice(1).reverse().map(([x, y, z]) => [x, y, -z] as V3), ...b.pts];
    k.tube(full, p.handlebar === "ape" || p.handlebar === "z-bar" ? 0.0125 : 0.011, "chrome", { tension: p.handlebar === "z-bar" ? 0 : undefined });
    if (p.handlebar === "tracker") k.rod([b.pts[2][0] + 0.01, b.pts[2][1] - 0.04, -0.2], [b.pts[2][0] + 0.01, b.pts[2][1] - 0.04, 0.2], 0.008, "chrome");
  }
  // levers and perches
  k.sides((sd) => {
    const s0 = b.start;
    k.box([0.03, 0.03, 0.03], [s0[0], s0[1], sd * (s0[2] - 0.02)], "black", { radius: 0.006 });
    k.rod([s0[0] + 0.01, s0[1], sd * (s0[2] - 0.02)], [s0[0] + 0.06, s0[1] - 0.01, sd * (b.end[2] - 0.02)], 0.004, "alloy", { seg: 5 });
  });
}

export function grips(k: Kit, { r, p }: Ctx) {
  const b = barGeom(r, p);
  k.sides((sd) => {
    const a: V3 = [b.start[0], b.start[1], sd * b.start[2]];
    const e: V3 = [b.end[0], b.end[1], sd * b.end[2]];
    const m = (t: number): V3 => [a[0] + (e[0] - a[0]) * t, a[1] + (e[1] - a[1]) * t, a[2] + (e[2] - a[2]) * t];
    switch (p.grips) {
      case "rubber":
        k.rod(a, e, 0.0165, "rubber", { seg: 14 });
        for (let i = 1; i < k.n(8, 4); i++) k.rod(m(i / 8 - 0.01), m(i / 8 + 0.01), 0.0185, "rubber", { seg: 14, kind: "hard" });
        break;
      case "closed":
        k.rod(a, e, 0.016, "rubber", { seg: 14 });
        k.rod(m(0.98), m(1.06), 0.02, "rubber", { seg: 14, kind: "hard" });
        k.rod(m(-0.05), m(0.04), 0.02, "rubber", { seg: 14, kind: "hard" });
        break;
      case "knurled":
        k.rod(a, e, 0.016, "alloy", { seg: 16 });
        for (const t of [0.25, 0.5, 0.75]) k.rod(m(t - 0.01), m(t + 0.01), 0.0168, "black", { kind: "ink", seg: 16 });
        break;
      case "leather":
        k.rod(a, e, 0.017, "leather", { seg: 14 });
        k.rod(m(0), m(1), 0.0175, "black", { kind: "ink", seg: 3 });
        break;
    }
  });
}

export function mirrors(k: Kit, { r, p }: Ctx) {
  if (p.mirrors === "none") return;
  const b = barGeom(r, p);
  k.sides((sd) => {
    if (p.mirrors === "bar-end-mirror") {
      const e: V3 = [b.end[0], b.end[1], sd * (b.end[2] + 0.02)];
      const h: V3 = [e[0] - 0.02, e[1] + 0.07, sd * (b.end[2] + 0.08)];
      k.rod(e, h, 0.005, "black", { seg: 6 });
      k.cyl(0.045, 0.045, 0.012, h, "black", { rot: [0, 0, 90 * DEG], seg: 22 });
      k.cyl(0.04, 0.04, 0.004, [h[0] - 0.007, h[1], h[2]], "lens", { rot: [0, 0, 90 * DEG], seg: 22, kind: "ink" });
    } else {
      const base: V3 = [b.start[0] + 0.01, b.start[1] + 0.01, sd * (b.start[2] - 0.03)];
      const tall = p.mirrors === "stem" ? 0.15 : 0.12;
      const h: V3 = [base[0] - 0.03, base[1] + tall, sd * (b.start[2] + 0.1)];
      k.rod(base, h, 0.005, "chrome", { seg: 6 });
      if (p.mirrors === "oval") k.cyl(0.05, 0.05, 0.012, h, "chrome", { rot: [0, 0, 90 * DEG], seg: 22, scale: [1, 1, 1.4] });
      else k.cyl(0.045, 0.045, 0.012, h, "chrome", { rot: [0, 0, 90 * DEG], seg: 22 });
    }
  });
}

export function gauges(k: Kit, { r, p }: Ctx) {
  const m = onFork(r, r.forkLen + 0.19);
  const g: V2 = [m[0] + 0.035, m[1] + 0.04];
  const cup = (pos: V3, rad: number) => {
    k.at(pos, [0, 0, 0.55], null, () => {
      k.lathe([[0.001, -0.04], [rad * 0.8, -0.04], [rad, -0.01], [rad, 0.004], [rad * 0.9, 0.006]], [0, 0, 0], "chrome", { seg: 24 });
      k.cyl(rad * 0.88, rad * 0.88, 0.004, [0, 0.003, 0], "lens", { seg: 24, kind: "ink" });
      k.box([0.003, 0.002, rad * 0.7], [0, 0.006, rad * 0.25], "red", { kind: "ink" });
    });
  };
  switch (p.gauges) {
    case "chrono":
      cup(P(g), 0.034);
      k.rod(P(m), P(g), 0.005, "black", { seg: 5 });
      break;
    case "chrono-pair":
      k.sides((sd) => cup(P(g, sd * 0.046), 0.034));
      k.box([0.03, 0.006, 0.17], [g[0] - 0.01, g[1] - 0.04, 0], "black");
      break;
    case "digital":
      k.box([0.05, 0.022, 0.085], [g[0] - 0.005, g[1] - 0.01, 0], "black", { rot: [0, 0, 0.6], radius: 0.006 });
      k.box([0.004, 0.016, 0.07], [g[0] + 0.013, g[1] + 0.003, 0], "lens", { rot: [0, 0, 0.6], kind: "ink" });
      break;
    case "nacelle":
      k.sphere(0.06, [m[0] + 0.02, m[1] - 0.02, 0], "chrome", { scale: [1.5, 0.6, 1], phi: [0, Math.PI * 2], theta: [0, Math.PI / 2], seg: 20 });
      k.cyl(0.03, 0.03, 0.004, [m[0] + 0.02, m[1] + 0.018, 0], "lens", { seg: 20, kind: "ink" });
      break;
  }
}

export function footControls(k: Kit, { r, p }: Ctx) {
  const { x: ex, s } = r.eng;
  const peg = (pos: V3, len: number, slot: Slot = "rubber") => k.sides((sd) => k.rod([pos[0], pos[1], sd * pos[2]], [pos[0], pos[1], sd * (pos[2] + len)], 0.011, slot, { seg: 10 }));
  switch (p.footControls) {
    case "rearsets": {
      const q: V3 = [r.pivot[0] - 0.08, r.pivot[1] + 0.06, 0.12];
      k.sides((sd) => k.box([0.12, 0.06, 0.008], [q[0] + 0.03, q[1] + 0.01, sd * q[2]], "alloy", { radius: 0.01, rot: [0, 0, 0.3] }));
      peg(q, 0.07, "alloy");
      k.sides((sd) => k.rod([q[0], q[1], sd * (q[2] + 0.01)], [q[0] + 0.12, q[1] - 0.02, sd * (q[2] + 0.03)], 0.005, "black", { seg: 5 }));
      break;
    }
    case "mid": {
      const q: V3 = [r.pivot[0] + 0.06, Math.min(0.32, r.pivot[1] - 0.02), r.wz + 0.02];
      k.sides((sd) => k.rod([q[0] + 0.03, q[1] + 0.06, sd * (r.wz - 0.01)], [q[0], q[1], sd * q[2]], 0.008, "black", { seg: 6 }));
      peg(q, 0.08);
      k.sides((sd) => k.rod([q[0], q[1], sd * (q[2] + 0.01)], [q[0] + 0.14, q[1] + 0.02, sd * (q[2] + 0.03)], 0.005, "black", { seg: 5 }), [-1]);
      break;
    }
    case "forward": {
      const q: V3 = [ex + 0.28 * s, 0.3, r.wz + 0.06];
      k.sides((sd) => {
        k.rod([ex + 0.18 * s, 0.25, sd * r.wz], [q[0], q[1], sd * q[2]], 0.01, "chrome");
        k.rod([q[0], q[1] + 0.02, sd * (q[2] + 0.02)], [r.pivot[0] + 0.08, 0.3, sd * (q[2] + 0.02)], 0.005, "chrome", { seg: 5 });
      });
      peg(q, 0.09);
      break;
    }
    case "boards": {
      const q: V3 = [ex + 0.1 * s, 0.25, r.wz + 0.12];
      k.sides((sd) => {
        k.box([0.24, 0.02, 0.11], [q[0], q[1], sd * q[2]], "chrome", { radius: 0.008 });
        for (let i = 0; i < 4; i++) k.box([0.22, 0.008, 0.012], [q[0], q[1] + 0.012, sd * (q[2] - 0.035 + i * 0.023)], "rubber", { kind: "ink" });
        k.rod([q[0], q[1], sd * (r.wz + 0.01)], [q[0], q[1], sd * (q[2] - 0.05)], 0.01, "chrome");
      });
      break;
    }
    case "ft-peg": {
      const q: V3 = [r.pivot[0] + 0.03, Math.min(0.31, r.pivot[1] - 0.04), r.wz + 0.02];
      k.sides((sd) => k.box([0.06, 0.07, 0.008], [q[0] + 0.01, q[1] + 0.03, sd * (q[2] - 0.004)], "alloy", { radius: 0.006 }));
      k.sides((sd) => k.box([0.03, 0.018, 0.1], [q[0], q[1], sd * (q[2] + 0.05)], "alloy", { radius: 0.004 }));
      break;
    }
  }
}

export function kickStarter(k: Kit, { r, p }: Ctx) {
  if (p.kickStarter === "none") return;
  const { x, y, s, half } = r.eng;
  const boss: V3 = [x - 0.2 * s, y + 0.0, half + 0.03];
  k.cyl(0.02, 0.02, 0.03, boss, "chrome", { rot: [90 * DEG, 0, 0], seg: 14 });
  const tip: V3 = [boss[0] - 0.2, boss[1] + 0.09, boss[2] + 0.015];
  k.rod(boss, tip, 0.009, "chrome");
  k.rod(tip, [tip[0], tip[1], tip[2] + 0.06], 0.01, "rubber", { seg: 10 });
  void p;
}

export const RECIPES = {
  frame,
  engine,
  tank,
  seat,
  exhaust,
  handlebar,
  fork,
  rearShock,
  fenderFront,
  fenderRear,
  kickStarter,
  gasCap,
  sideCover,
  cowl,
  sissyBar,
  luggage,
  headlamp,
  taillight,
  signals,
  gauges,
  grips,
  mirrors,
  footControls,
} satisfies Record<string, (k: Kit, c: Ctx) => void>;

export type { Ctx };
