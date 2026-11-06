"use client";

// Procedural part recipes (DESIGN 7.2). Units ~ meters, bike faces +X, rider's left is +Z.
import * as THREE from "three";
import { createContext, useContext, useMemo } from "react";
import { Line, RoundedBoxGeometry } from "@react-three/drei";
import type { Parts } from "@/lib/catalog";
import { M, MI, Rod, Tube, useSegment, type V3 } from "./core";

export const AXLE_F = 0.7;
export const AXLE_R = -0.7;
export const AXLE_Y = 0.33;

/** Half width of the crankcase; the frame's engine mounts follow it (UX-SPEC 3.2 step 7). */
export const ENGINE_HALF: Record<Parts["engine"], number> = { single: 0.08, "parallel-twin": 0.12, "v-twin": 0.095 };

const SIDES = [1, -1] as const;
const DEG = Math.PI / 180;

/* ---------------- frame (+ fixed parts that travel with it) ---------------- */

export function Frame({ type, engine }: { type: Parts["frame"]; engine: Parts["engine"] }) {
  const w = ENGINE_HALF[engine] + 0.03;
  return (
    <>
      {/* headstock */}
      <Rod a={[0.43, 0.94, 0]} b={[0.505, 0.77, 0]} r={0.032} slot="frame" />
      {type !== "trellis" && (
        <Tube points={[[0.45, 0.89, 0], [0.2, 0.845, 0], [-0.12, 0.765, 0]]} r={0.022} slot="frame" />
      )}
      {type === "cradle" && <Cradle w={w} />}
      {type === "trellis" && <Trellis w={w} />}
      {type === "hardtail" && <Hardtail w={w} />}
      {type !== "hardtail" && <Swingarm />}
      <Fixed hardtail={type === "hardtail"} />
    </>
  );
}

function Subframe({ from }: { from: number }) {
  return (
    <>
      {SIDES.map((s) => (
        <group key={s}>
          <Tube points={[[-0.12, 0.765, s * 0.05], [-0.36, 0.755, s * 0.09], [-0.62, 0.74, s * 0.09]]} r={0.016} slot="frame" />
          <Rod a={[-0.14, from, s * 0.1]} b={[-0.48, 0.745, s * 0.09]} r={0.013} slot="frame" />
        </group>
      ))}
      <Rod a={[-0.62, 0.74, -0.09]} b={[-0.62, 0.74, 0.09]} r={0.014} slot="frame" />
    </>
  );
}

function Cradle({ w }: { w: number }) {
  return (
    <>
      {SIDES.map((s) => (
        <Tube
          key={s}
          r={0.018}
          slot="frame"
          points={[
            [0.49, 0.8, s * 0.03],
            [0.44, 0.62, s * w * 0.8],
            [0.38, 0.4, s * w],
            [0.33, 0.22, s * w],
            [0.15, 0.165, s * w],
            [-0.1, 0.18, s * w],
            [-0.15, 0.3, s * w],
            [-0.14, 0.5, s * w],
            [-0.12, 0.745, s * 0.05],
          ]}
        />
      ))}
      <Rod a={[0.15, 0.165, -w]} b={[0.15, 0.165, w]} r={0.012} slot="frame" />
      <Subframe from={0.48} />
    </>
  );
}

function Trellis({ w }: { w: number }) {
  const segs = useMemo(() => {
    const out: [V3, V3][] = [];
    for (const s of SIDES) {
      const A: V3 = [0.44, 0.9, s * 0.03];
      const B: V3 = [0.5, 0.78, s * 0.03];
      const C: V3 = [0.16, 0.83, s * w];
      const D: V3 = [0.24, 0.56, s * w];
      const E: V3 = [-0.12, 0.76, s * w * 0.8];
      const F: V3 = [-0.14, 0.42, s * w];
      out.push([A, C], [B, C], [B, D], [C, D], [C, E], [D, E], [D, F], [E, F], [D, [0.22, 0.46, s * w]]);
    }
    out.push([[-0.12, 0.76, -w * 0.8], [-0.12, 0.76, w * 0.8]], [[-0.14, 0.42, -w], [-0.14, 0.42, w]]);
    return out;
  }, [w]);
  return (
    <>
      {segs.map(([a, b], i) => (
        <Rod key={i} a={a} b={b} r={0.014} slot="frame" />
      ))}
      <Subframe from={0.46} />
    </>
  );
}

function Hardtail({ w }: { w: number }) {
  return (
    <>
      {SIDES.map((s) => (
        <group key={s}>
          <Tube
            r={0.018}
            slot="frame"
            points={[[0.49, 0.8, s * 0.03], [0.42, 0.55, s * w], [0.36, 0.3, s * w], [0.3, 0.19, s * w], [0, 0.17, s * w], [-0.14, 0.2, s * w]]}
          />
          <Rod a={[-0.14, 0.2, s * w]} b={[-0.12, 0.74, s * 0.06]} r={0.018} slot="frame" />
          <Rod a={[-0.14, 0.22, s * w]} b={[AXLE_R, AXLE_Y, s * 0.09]} r={0.016} slot="frame" />
          <Rod a={[-0.12, 0.72, s * 0.06]} b={[AXLE_R, AXLE_Y + 0.01, s * 0.09]} r={0.015} slot="frame" />
          {/* lower seat rail: the bobber's dropped tail */}
          <Tube points={[[-0.12, 0.745, s * 0.05], [-0.4, 0.68, s * 0.08], [-0.66, 0.6, s * 0.08]]} r={0.014} slot="frame" />
          <M slot="frame" position={[AXLE_R, AXLE_Y, s * 0.09]}>
            <boxGeometry args={[0.09, 0.07, 0.012]} />
          </M>
        </group>
      ))}
    </>
  );
}

function Swingarm() {
  return (
    <>
      {SIDES.map((s) => (
        <group key={s}>
          <Rod a={[-0.14, 0.4, s * 0.09]} b={[AXLE_R, AXLE_Y, s * 0.09]} r={0.02} slot="frame" />
          {/* shock: chrome body + spring cover */}
          <Rod a={[-0.47, 0.735, s * 0.115]} b={[-0.52, 0.37, s * 0.115]} r={0.012} slot="chrome" />
          <Rod a={[-0.475, 0.69, s * 0.115]} b={[-0.505, 0.47, s * 0.115]} r={0.024} slot="frame" />
        </group>
      ))}
      <Rod a={[-0.14, 0.4, -0.1]} b={[-0.14, 0.4, 0.1]} r={0.022} slot="frame" />
    </>
  );
}

function Fixed({ hardtail }: { hardtail: boolean }) {
  return (
    <>
      {/* fork: chrome stanchions, painted lowers, triple clamps */}
      {SIDES.map((s) => (
        <group key={s}>
          <Rod a={[0.425, 0.965, s * 0.075]} b={[0.565, 0.65, s * 0.075]} r={0.017} slot="chrome" />
          <Rod a={[0.56, 0.66, s * 0.075]} b={[AXLE_F, AXLE_Y, s * 0.075]} r={0.024} slot="frame" />
        </group>
      ))}
      <M slot="frame" position={[0.432, 0.945, 0]} rotation={[0, 0, 23.8 * DEG]}>
        <boxGeometry args={[0.07, 0.025, 0.2]} />
      </M>
      <M slot="frame" position={[0.49, 0.815, 0]} rotation={[0, 0, 23.8 * DEG]}>
        <boxGeometry args={[0.07, 0.03, 0.2]} />
      </M>
      {/* headlight */}
      <M slot="chrome" smooth position={[0.575, 0.86, 0]} scale={[0.7, 1, 1]}>
        <sphereGeometry args={[0.075, 24, 16]} />
      </M>
      <M slot="chrome" smooth position={[0.625, 0.86, 0]} rotation={[0, 90 * DEG, 0]}>
        <torusGeometry args={[0.07, 0.007, 8, 32]} />
      </M>
      {/* rear fender: open cylinder shell over the rear wheel */}
      <M slot="frame" position={[AXLE_R, AXLE_Y, 0]} rotation={[90 * DEG, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.15, 28, 1, true, (5 * Math.PI) / 6, hardtail ? Math.PI / 2 : (2 * Math.PI) / 3]} />
      </M>
      {/* battery box */}
      <M slot="engine" position={[-0.27, 0.58, 0]}>
        <boxGeometry args={[0.13, 0.12, 0.13]} />
      </M>
    </>
  );
}

/* ---------------- engine ---------------- */

function Jug({ base, tilt, r }: { base: V3; tilt: number; r: number }) {
  return (
    <group position={base} rotation={[0, 0, -tilt * DEG]}>
      <M slot="engine" smooth position={[0, 0.11, 0]}>
        <cylinderGeometry args={[r * 0.62, r * 0.62, 0.22, 20]} />
      </M>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <M key={i} slot="engine" position={[0, 0.035 + i * 0.03, 0]}>
          <cylinderGeometry args={[r, r, 0.012, 24]} />
        </M>
      ))}
      <M smooth slot="accent" position={[0, 0.232, 0]}>
        <RoundedBoxGeometry args={[r * 2.05, 0.05, r * 2.05]} radius={0.012} smoothness={5} />
      </M>
    </group>
  );
}

export function Engine({ type }: { type: Parts["engine"] }) {
  const hw = ENGINE_HALF[type];
  return (
    <>
      <M smooth slot="engine" position={[0.08, 0.36, 0]}>
        <RoundedBoxGeometry args={[0.4, 0.2, hw * 2]} radius={0.035} smoothness={5} />
      </M>
      <Rod a={[0.02, 0.34, hw - 0.004]} b={[0.02, 0.34, hw + 0.018]} r={0.07} slot="chrome" seg={28} />
      <Rod a={[0.2, 0.33, -hw + 0.004]} b={[0.2, 0.33, -hw - 0.014]} r={0.05} slot="chrome" seg={24} />
      {type === "single" && <Jug base={[0.14, 0.45, 0]} tilt={10} r={0.075} />}
      {type === "parallel-twin" &&
        SIDES.map((s) => <Jug key={s} base={[0.14, 0.45, s * 0.058]} tilt={10} r={0.058} />)}
      {type === "v-twin" && (
        <>
          <Jug base={[0.08, 0.45, 0]} tilt={40} r={0.068} />
          <Jug base={[0.08, 0.45, 0]} tilt={-40} r={0.068} />
        </>
      )}
    </>
  );
}

/* ---------------- tank ---------------- */

function lathePoints(R: number, L: number, front: number) {
  const pts: THREE.Vector2[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const r = R * Math.pow(Math.sin(Math.PI * s), 0.7) * (1 - front + front * s);
    pts.push(new THREE.Vector2(Math.max(r, 0.0005), -L / 2 + s * L));
  }
  return pts;
}

function LatheTank({ R, L, front, pos, sx, sz }: { R: number; L: number; front: number; pos: V3; sx: number; sz: number }) {
  const pts = useMemo(() => lathePoints(R, L, front), [R, L, front]);
  const s = 0.62;
  const ringR = R * Math.pow(Math.sin(Math.PI * s), 0.7) * (1 - front + front * s) + 0.002;
  return (
    // lathe axis (local Y) turned to world X; local X scale sets height, Z sets width
    <group position={pos} rotation={[0, 0, -Math.PI / 2]} scale={[sx, 1, sz]}>
      <M slot="tank" smooth>
        <latheGeometry args={[pts, 36]} />
      </M>
      <M slot="accent" ink position={[0, -L / 2 + s * L, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringR, 0.005, 6, 48]} />
      </M>
    </group>
  );
}

export function Tank({ type }: { type: Parts["tank"] }) {
  if (type === "teardrop")
    return (
      <>
        <LatheTank R={0.15} L={0.54} front={0.35} pos={[0.17, 0.865, 0]} sx={0.72} sz={0.86} />
        <Rod a={[0.24, 0.965, 0]} b={[0.24, 0.985, 0]} r={0.03} slot="chrome" seg={20} />
      </>
    );
  if (type === "peanut")
    return (
      <>
        <LatheTank R={0.14} L={0.46} front={0.2} pos={[0.19, 0.905, 0]} sx={0.78} sz={0.58} />
        <Rod a={[0.24, 1.005, 0]} b={[0.24, 1.025, 0]} r={0.026} slot="chrome" seg={20} />
      </>
    );
  return (
    <>
      <M smooth slot="tank" position={[0.17, 0.875, 0]}>
        <RoundedBoxGeometry args={[0.5, 0.15, 0.26]} radius={0.03} smoothness={5} />
      </M>
      <M slot="accent" ink position={[0.26, 0.875, 0]}>
        <boxGeometry args={[0.006, 0.153, 0.263]} />
      </M>
      <Rod a={[0.08, 0.945, 0]} b={[0.08, 0.965, 0]} r={0.03} slot="chrome" seg={20} />
    </>
  );
}

/* ---------------- seat ---------------- */

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private h: number, private turns: number) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns;
    return target.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r);
  }
}

export function Seat({ type }: { type: Parts["seat"] }) {
  const hump = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.44, 0.76);
    s.lineTo(-0.68, 0.76);
    s.lineTo(-0.68, 0.84);
    s.lineTo(-0.63, 0.885);
    s.lineTo(-0.44, 0.8);
    s.closePath();
    return s;
  }, []);
  const helix = useMemo(() => new Helix(0.022, 0.105, 5), []);

  if (type === "cafe-hump")
    return (
      <>
        <M smooth slot="seat" position={[-0.26, 0.785, 0]}>
          <RoundedBoxGeometry args={[0.38, 0.05, 0.22]} radius={0.02} smoothness={5} />
        </M>
        {/* cowl in tank paint, like a matched cafe tail */}
        <M slot="tank" position={[0, 0, -0.11]}>
          <extrudeGeometry args={[hump, { depth: 0.22, bevelEnabled: false }]} />
        </M>
      </>
    );
  if (type === "bobber-solo")
    return (
      <>
        <M smooth slot="seat" position={[-0.17, 0.86, 0]} rotation={[0, 0, 0.05]}>
          <RoundedBoxGeometry args={[0.26, 0.055, 0.23]} radius={0.025} smoothness={5} />
        </M>
        {SIDES.map((s) => (
          <M key={s} slot="chrome" ink position={[-0.25, 0.73, s * 0.07]}>
            <tubeGeometry args={[helix, 90, 0.0045, 6, false]} />
          </M>
        ))}
        <Rod a={[-0.05, 0.79, 0]} b={[-0.05, 0.84, 0]} r={0.015} slot="chrome" />
      </>
    );
  return (
    <M smooth slot="seat" position={[-0.31, 0.785, 0]}>
      <RoundedBoxGeometry args={[0.66, 0.045, 0.23]} radius={0.018} smoothness={5} />
    </M>
  );
}

/* ---------------- handlebar ---------------- */

export function Handlebar({ type }: { type: Parts["handlebar"] }) {
  if (type === "clip-on")
    return (
      <>
        {SIDES.map((s) => (
          <group key={s}>
            <Rod a={[0.462, 0.875, s * 0.075]} b={[0.48, 0.835, s * 0.075]} r={0.027} slot="chrome" />
            <Rod a={[0.472, 0.852, s * 0.095]} b={[0.405, 0.815, s * 0.27]} r={0.011} slot="chrome" />
            <Rod a={[0.42, 0.823, s * 0.22]} b={[0.4, 0.812, s * 0.3]} r={0.017} slot="seat" />
          </group>
        ))}
      </>
    );
  if (type === "drag")
    return (
      <>
        {SIDES.map((s) => (
          <group key={s}>
            <Rod a={[0.43, 0.955, s * 0.04]} b={[0.43, 1.005, s * 0.04]} r={0.014} slot="chrome" />
            <Rod a={[0.43, 1.012, s * 0.22]} b={[0.43, 1.012, s * 0.31]} r={0.017} slot="seat" />
          </group>
        ))}
        <Rod a={[0.43, 1.012, -0.31]} b={[0.43, 1.012, 0.31]} r={0.011} slot="chrome" />
      </>
    );
  return (
    <>
      {SIDES.map((s) => (
        <group key={s}>
          <Rod a={[0.43, 0.955, s * 0.04]} b={[0.43, 1.03, s * 0.04]} r={0.014} slot="chrome" />
          <Rod a={[0.383, 1.086, s * 0.32]} b={[0.355, 1.103, s * 0.415]} r={0.017} slot="seat" />
        </group>
      ))}
      <Tube
        r={0.011}
        slot="chrome"
        points={[[0.355, 1.103, -0.415], [0.4, 1.075, -0.26], [0.43, 1.035, -0.1], [0.43, 1.035, 0.1], [0.4, 1.075, 0.26], [0.355, 1.103, 0.415]]}
      />
      <Rod a={[0.405, 1.072, -0.2]} b={[0.405, 1.072, 0.2]} r={0.009} slot="chrome" />
    </>
  );
}

/* ---------------- exhaust ---------------- */

function ports(engine: Parts["engine"]): { x: number; y: number; z: number; sides: readonly (1 | -1)[] } {
  if (engine === "v-twin") return { x: 0.26, y: 0.56, z: 0.03, sides: [1] };
  if (engine === "parallel-twin") return { x: 0.235, y: 0.63, z: 0.058, sides: SIDES };
  return { x: 0.25, y: 0.63, z: 0.03, sides: [1] };
}

export function Exhaust({ type, engine }: { type: Parts["exhaust"]; engine: Parts["engine"] }) {
  const { x, y, z, sides } = ports(engine);
  return (
    <>
      {sides.map((s) => {
        const head: V3[] = [[x, y, s * z], [x + 0.07, y - 0.1, s * (z + 0.06)]];
        if (type === "high-scrambler")
          return (
            <group key={s}>
              <Tube r={0.022} slot="chrome" points={[...head, [0.22, 0.4, s * 0.2], [0.02, 0.45, s * 0.215], [-0.22, 0.62, s * 0.215], [-0.44, 0.72, s * 0.205]]} />
              <Rod a={[-0.42, 0.715, s * 0.205]} b={[-0.7, 0.765, s * 0.205]} r={0.04} slot="chrome" />
              <HeatShield a={[0.04, 0.455, s * 0.215]} b={[-0.22, 0.62, s * 0.215]} side={s} />
            </group>
          );
        const low: V3[] = [...head, [0.37, 0.3, s * 0.16], [0.3, 0.17, s * 0.18], [0, 0.15, s * 0.19], [-0.3, 0.22, s * 0.19]];
        if (type === "fishtail")
          return (
            <group key={s}>
              <Tube r={0.022} slot="chrome" points={[...low, [-0.55, 0.26, s * 0.19]]} />
              {/* flattened cone: narrow end forward, flared fishtail at the back */}
              <M slot="chrome" smooth position={[-0.71, 0.27, s * 0.19]} rotation={[0, 0, -Math.PI / 2]} scale={[0.45, 1, 1.3]}>
                <coneGeometry args={[0.075, 0.32, 24, 1, true]} />
              </M>
            </group>
          );
        return (
          <group key={s}>
            <Tube r={0.022} slot="chrome" points={[...low, [-0.42, 0.28, s * 0.19]]} />
            <Rod a={[-0.4, 0.285, s * 0.19]} b={[-0.84, 0.33, s * 0.19]} r={0.043} slot="chrome" seg={20} />
          </group>
        );
      })}
    </>
  );
}

function HeatShield({ a, b, side }: { a: V3; b: V3; side: 1 | -1 }) {
  const { pos, quat, len } = useSegment(a, b);
  return (
    <M slot="chrome" position={pos} quaternion={quat}>
      <cylinderGeometry args={[0.05, 0.05, len * 0.9, 16, 1, true, side === 1 ? -Math.PI / 2 : Math.PI / 2, Math.PI]} />
    </M>
  );
}

/* ---------------- wheels & tires (one axle each) ---------------- */

const Y_UP = new THREE.Vector3(0, 1, 0);

function spokeMatrices() {
  const out: THREE.Matrix4[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const z = i % 2 ? 0.04 : -0.04;
    const hub = new THREE.Vector3(Math.cos(a) * 0.04, Math.sin(a) * 0.04, z);
    const rim = new THREE.Vector3(Math.cos(a + 0.14) * 0.228, Math.sin(a + 0.14) * 0.228, 0);
    const d = rim.clone().sub(hub);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(Y_UP, d.normalize());
    out.push(new THREE.Matrix4().compose(hub.add(rim).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1)));
  }
  return out;
}

function knobMatrices() {
  const out: THREE.Matrix4[] = [];
  const n = 28;
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (row * Math.PI) / n;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2);
      out.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(Math.cos(a) * 0.318, Math.sin(a) * 0.318, row ? 0.026 : -0.026),
          q,
          new THREE.Vector3(1, 1, 1),
        ),
      );
    }
  return out;
}

// Constant instance layouts, built once per module.
const SPOKES = spokeMatrices();
const KNOBS = knobMatrices();

export function Wheel({ type, x }: { type: Parts["wheels"]; x: number }) {
  return (
    <group position={[x, AXLE_Y, 0]}>
      <M slot="chrome" smooth>
        <torusGeometry args={[0.245, 0.016, 12, 56]} />
      </M>
      <M slot="accent" ink>
        <torusGeometry args={[0.226, 0.004, 6, 56]} />
      </M>
      <Rod a={[0, 0, -0.06]} b={[0, 0, 0.06]} r={0.045} slot="chrome" seg={24} />
      {type === "spoke" && (
        <MI slot="chrome" matrices={SPOKES}>
          <cylinderGeometry args={[0.0028, 0.0028, 1, 5, 1]} />
        </MI>
      )}
      {type === "cast" &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 2;
          return (
            <M key={i} slot="chrome" position={[Math.cos(a) * 0.137, Math.sin(a) * 0.137, 0]} rotation={[0, 0, a - Math.PI / 2]}>
              <boxGeometry args={[0.032, 0.19, 0.026]} />
            </M>
          );
        })}
      {type === "disc" &&
        SIDES.map((s) => <Rod key={s} a={[0, 0, s * 0.032]} b={[0, 0, s * 0.042]} r={0.232} slot="frame" seg={48} />)}
      <Centerlines />
    </group>
  );
}

export function Tire({ type, x }: { type: Parts["tires"]; x: number }) {
  return (
    <group position={[x, AXLE_Y, 0]}>
      <M slot="tire" smooth>
        <torusGeometry args={[0.265, type === "knobby" ? 0.056 : 0.065, 14, 64]} />
      </M>
      {type === "knobby" && (
        <MI slot="tire" matrices={KNOBS}>
          <boxGeometry args={[0.034, 0.024, 0.05]} />
        </MI>
      )}
    </group>
  );
}

// Chain-dash axle centerlines (DESIGN 5.4). Visibility is toggled with the line mode by the parent.
export const LineStyleCtx = createContext<{ show: boolean; color: string }>({ show: true, color: "#4a5866" });

function Centerlines() {
  const { show, color } = useContext(LineStyleCtx);
  if (!show) return null;
  return (
    <group position={[0, 0, 0.07]}>
      <Line points={[[-0.42, 0, 0], [0.42, 0, 0]]} color={color} lineWidth={1} dashed dashSize={0.06} gapSize={0.015} raycast={() => null} />
      <Line points={[[0, -0.42, 0], [0, 0.42, 0]]} color={color} lineWidth={1} dashed dashSize={0.06} gapSize={0.015} raycast={() => null} />
    </group>
  );
}
