"use client";

import * as THREE from "three";
import { createContext, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Edges, Line, type EdgesRef } from "@react-three/drei";
import { ScreenLabel } from "../ScreenLabel";
import type { Finish, GroupId } from "@/lib/catalog";

export type V3 = [number, number, number];
export type Slot = "tank" | "frame" | "accent" | "chrome" | "engine" | "seat" | "tire";
type Colors = { paper: THREE.Color; ink: THREE.Color; inkMuted: THREE.Color; accent: THREE.Color };

/** Mutable per-bike state, written by <Bike> in a layout effect and read every frame. */
export type Shared = {
  explode: { current: number };
  sequential: boolean;
  intro: { current: number };
  highlight: GroupId | null;
  labels: boolean;
  activeOnly: boolean;
  effect: "pop" | "flash" | "none";
  reduce: boolean;
  colors: Colors;
  paint: { tank: THREE.Color; frame: THREE.Color; accent: THREE.Color; finish: Finish };
  mix: { from: number; to: number; start: number };
};

export const SharedCtx = createContext<{ current: Shared } | null>(null);
/** Render-time scene values (colors, highlight); per-frame values live in SharedCtx. */
export const SceneCtx = createContext<{ colors: Colors; highlight: GroupId | null }>(null!);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const power2Out = (t: number) => 1 - (1 - t) * (1 - t);
const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);

/** Painted-vs-line crossfade value at time `now` (M10: 400ms power2.out). */
export function mixAt(m: Shared["mix"], now: number, reduce: boolean) {
  if (reduce) return m.to;
  const t = clamp01((now - m.start) / 400);
  return m.from + (m.to - m.from) * power2Out(t);
}

// Fixed real-world materials (DESIGN 7.3), not user paint.
const FIXED: Partial<Record<Slot, { color: string; metalness: number; roughness: number }>> = {
  chrome: { color: "#C8CDD0", metalness: 1, roughness: 0.2 },
  engine: { color: "#4A4E52", metalness: 0.6, roughness: 0.45 },
  seat: { color: "#2B2B2B", metalness: 0, roughness: 0.7 },
  tire: { color: "#1B1B1B", metalness: 0, roughness: 0.9 },
};
const FINISH = {
  gloss: { roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0, clearcoatRoughness: 0 },
  metal: { roughness: 0.35, metalness: 0.65, clearcoat: 0.6, clearcoatRoughness: 0.1 },
};

// DoubleSide: open shells (fender, heat shield, fishtail cone) must show their inner face too
const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide };

// Inverted hull: back faces pushed out along normals give round tubes a silhouette outline,
// which crease edges alone cannot (a smooth tube has no creases).
function makeHull() {
  const m = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed += normalize(normal) * 0.0045;",
    );
  };
  return m;
}

function setOpacity(m: THREE.Material, o: number) {
  const tr = o < 0.999;
  if (m.transparent !== tr) {
    m.transparent = tr;
    m.needsUpdate = true;
  }
  m.opacity = o;
}

/** One material set per part group, so fades and flashes stay local to that part. */
class MatSet {
  // line-mode materials skip tone mapping so the fill matches --paper exactly
  fill = new THREE.MeshBasicMaterial({ ...offset, toneMapped: false });
  ink = new THREE.MeshBasicMaterial({ toneMapped: false });
  hull = makeHull();
  paints = new Map<Slot, THREE.MeshPhysicalMaterial>();
  painted(slot: Slot) {
    let m = this.paints.get(slot);
    if (!m) {
      const f = FIXED[slot];
      m = new THREE.MeshPhysicalMaterial({ ...offset, ...(f ?? {}), color: f?.color ?? "#ffffff" });
      this.paints.set(slot, m);
    }
    return m;
  }
  dispose() {
    this.fill.dispose();
    this.ink.dispose();
    this.hull.dispose();
    this.paints.forEach((m) => m.dispose());
  }
}

type Entry = { mesh: THREE.Mesh; slot: Slot; ink: boolean; edges: EdgesRef | null; hull: THREE.Mesh | null };
type Registry = { add: (e: Entry) => () => void };
const RegCtx = createContext<Registry | null>(null);

type MProps = {
  slot: Slot;
  /** Round surface: silhouette hull + only hard-crease edges. */
  smooth?: boolean;
  /** Drawn as solid ink in line mode (spokes, knobs, pinstripes): too thin to outline. */
  ink?: boolean;
  children: ReactNode;
} & Pick<ThreeElements["group"], "position" | "rotation" | "scale" | "quaternion">;

/** A drawable mesh: geometry as JSX child; materials and edge colors are applied per frame by PartGroup. */
export function M({ slot, smooth = false, ink = false, children, ...transform }: MProps) {
  const reg = useContext(RegCtx)!;
  const mesh = useRef<THREE.Mesh>(null!);
  const edges = useRef<EdgesRef>(null);
  const hull = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => {
    // geometry may be recreated when args change; the hull always shares it
    if (hull.current) hull.current.geometry = mesh.current.geometry;
  });
  useLayoutEffect(
    () => reg.add({ mesh: mesh.current, slot, ink, edges: edges.current, hull: hull.current }),
    [reg, slot, ink, smooth],
  );
  return (
    <group {...transform}>
      <mesh ref={mesh}>
        {children}
        {!ink && <Edges ref={edges} threshold={smooth ? 60 : 20} lineWidth={1.5} />}
      </mesh>
      {smooth && !ink && <mesh ref={hull} raycast={() => null} />}
    </group>
  );
}

/** Instanced mesh (spokes, knobs). Always solid ink in line mode. */
export function MI({ slot, matrices, children }: { slot: Slot; matrices: THREE.Matrix4[]; children: ReactNode }) {
  const reg = useContext(RegCtx)!;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    matrices.forEach((m, i) => mesh.current.setMatrixAt(i, m));
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [matrices]);
  useLayoutEffect(() => reg.add({ mesh: mesh.current, slot, ink: true, edges: null, hull: null }), [reg, slot]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, matrices.length]}>
      {children}
    </instancedMesh>
  );
}

export type LabelDef = { anchor: V3; offset: V3; side: "l" | "r"; no: string; title: string; name: string };

type GroupProps = {
  gid: GroupId;
  idx: number;
  /** Changing this value triggers the change effect (M7 pop / M8 flash). */
  option: string;
  offset: V3;
  /** Home point of the dashed assembly path and the pop scale center. */
  anchor: V3;
  label?: LabelDef;
  children: ReactNode;
};

const tmpColor = new THREE.Color();
const tmpVec = new THREE.Vector3();

export function PartGroup({ gid, idx, option, offset: off, anchor, label, children }: GroupProps) {
  const shared = useContext(SharedCtx)!;
  const scene = useContext(SceneCtx);
  const invalidate = useThree((s) => s.invalidate);
  const move = useRef<THREE.Group>(null!);
  const pop = useRef<THREE.Group>(null!);
  const labelLine = useRef<THREE.Group>(null);
  const plate = useRef<HTMLDivElement>(null);
  const entries = useRef(new Set<Entry>());
  const changedAt = useRef(-1e9);
  const lastOption = useRef(option);
  const outer = useRef<THREE.Group>(null!);
  // three objects mutated every frame live behind refs; created and disposed with the group
  const mats = useRef<MatSet>(null);
  const path = useRef<THREE.Line>(null);
  useLayoutEffect(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const line = new THREE.Line(g, new THREE.LineDashedMaterial({ dashSize: 0.04, gapSize: 0.027, transparent: true }));
    line.frustumCulled = false;
    line.visible = false;
    line.raycast = () => null;
    const set = new MatSet();
    const host = outer.current;
    host.add(line);
    path.current = line;
    mats.current = set;
    invalidate();
    return () => {
      host.remove(line);
      g.dispose();
      (line.material as THREE.Material).dispose();
      set.dispose();
      path.current = null;
      mats.current = null;
    };
  }, [invalidate]);

  const registry = useMemo<Registry>(
    () => ({
      add: (e) => {
        entries.current.add(e);
        invalidate();
        return () => void entries.current.delete(e);
      },
    }),
    [invalidate],
  );

  useLayoutEffect(() => {
    if (lastOption.current !== option) {
      lastOption.current = option;
      changedAt.current = performance.now();
      invalidate();
    }
  }, [option, invalidate]);

  useFrame(() => {
    const s = shared.current;
    const ms = mats.current;
    const line = path.current;
    if (!s || !ms || !line) return;
    const now = performance.now();
    let animating = false;

    // Explode (DESIGN 7.5): sequential on the landing scrub, all at once in the garage.
    const t = s.explode.current;
    const p = s.sequential ? clamp01(t * 7 - idx) : t;
    move.current.position.set(off[0] * p, off[1] * p, off[2] * p);
    const moved = p > 0.002 && (off[0] || off[1] || off[2]);
    line.visible = !!moved;
    if (moved) {
      const a = line.geometry.attributes.position as THREE.BufferAttribute;
      a.setXYZ(0, anchor[0], anchor[1], anchor[2]);
      a.setXYZ(1, anchor[0] + off[0] * p, anchor[1] + off[1] * p, anchor[2] + off[2] * p);
      a.needsUpdate = true;
      line.computeLineDistances();
      const pm = line.material as THREE.LineDashedMaterial;
      pm.color.copy(s.colors.inkMuted);
      pm.opacity = Math.min(1, p * 3) * s.intro.current;
    }

    // Change effects
    const since = now - changedAt.current;
    let popK = 1;
    let flash = 0;
    if (!s.reduce && since < 900) {
      if (s.effect === "pop" && since < 450) {
        popK = power3Out(since / 450);
        animating = true;
      }
      if (s.effect === "flash") {
        flash = since < 600 ? 1 : 1 - (since - 600) / 200;
        if (since < 800) animating = true;
        flash = clamp01(flash);
      }
    }
    pop.current.scale.setScalar(0.92 + 0.08 * popK);

    const mix = mixAt(s.mix, now, s.reduce);
    if (mix !== s.mix.to) animating = true;

    const active = s.highlight === gid;
    const acc = active ? 1 : flash;
    const edgeColor = tmpColor.copy(s.colors.ink).lerp(s.colors.accent, acc);
    const baseEdge = 1 - 0.82 * mix;
    const edgeOpacity = Math.max(baseEdge, acc * 0.9) * s.intro.current * popK;

    ms.fill.color.copy(s.colors.paper);
    setOpacity(ms.fill, popK);
    ms.ink.color.copy(edgeColor);
    setOpacity(ms.ink, (mix > 0 ? 1 : edgeOpacity) * popK);
    ms.hull.color.copy(edgeColor);
    setOpacity(ms.hull, edgeOpacity);
    const f = FINISH[s.paint.finish];
    for (const slot of ["tank", "frame", "accent"] as const) {
      const m = ms.paints.get(slot);
      if (m) {
        m.color.copy(s.paint[slot]);
        m.roughness = f.roughness;
        m.metalness = f.metalness;
        m.clearcoat = f.clearcoat;
        m.clearcoatRoughness = f.clearcoatRoughness;
      }
    }

    for (const e of entries.current) {
      if (mix > 0) {
        const m = ms.painted(e.slot);
        setOpacity(m, mix * popK);
        e.mesh.material = m;
      } else {
        e.mesh.material = e.ink ? ms.ink : ms.fill;
      }
      if (e.edges) {
        const lm = e.edges.material;
        lm.color.copy(edgeColor);
        lm.linewidth = acc > 0.5 ? 2.5 : 1.5;
        lm.transparent = true;
        lm.opacity = edgeOpacity;
      }
      if (e.hull) e.hull.material = ms.hull;
    }

    // Callout (DESIGN 7.6): all exploded labels on wide screens, only the active one on narrow.
    if (label) {
      const exploded = s.sequential ? p > 0.05 || (idx === 0 && t * 7 > 0.05) : t > 0.5;
      const show = active || (s.labels && !s.activeOnly && exploded);
      if (labelLine.current) labelLine.current.visible = show;
      if (plate.current) plate.current.style.visibility = show ? "visible" : "hidden";
    }

    if (animating) invalidate();
  });

  return (
    <group ref={outer}>
      <group ref={move}>
        <group ref={pop} position={anchor}>
          <group position={[-anchor[0], -anchor[1], -anchor[2]]}>
            <RegCtx.Provider value={registry}>{children}</RegCtx.Provider>
          </group>
        </group>
        {label && <Callout def={label} active={scene.highlight === gid} lineRef={labelLine} plateRef={plate} />}
      </group>
    </group>
  );
}

function Callout({
  def,
  active,
  lineRef,
  plateRef,
}: {
  def: LabelDef;
  active: boolean;
  lineRef: React.RefObject<THREE.Group | null>;
  plateRef: React.RefObject<HTMLDivElement | null>;
}) {
  const c = useContext(SceneCtx).colors;
  const color = active ? c.accent : c.ink;
  const [ax, ay, az] = def.anchor;
  const end: V3 = [ax + def.offset[0], ay + def.offset[1], az + def.offset[2]];
  const elbow: V3 = [end[0] + (def.side === "r" ? -0.12 : 0.12), end[1], end[2]];
  const endRef = useRef<THREE.Object3D>(null);

  // Keep the plate on screen: flip it to the other side of the leader end when it would clip.
  useFrame(({ camera, size }) => {
    const el = plateRef.current;
    const o = endRef.current;
    if (!el || !o || el.style.visibility !== "visible") return;
    const x = ((o.getWorldPosition(tmpVec).project(camera).x + 1) / 2) * size.width;
    const wPx = el.offsetWidth;
    const left = def.side === "l" ? x - wPx > 8 : x + wPx > size.width - 8;
    el.style.transform = left ? "translate(-100%,-50%)" : "translate(0,-50%)";
  });

  return (
    <>
      <object3D ref={endRef} position={end} />
      <group ref={lineRef} visible={false}>
        <mesh position={def.anchor} raycast={() => null}>
          <sphereGeometry args={[0.012, 10, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <Line points={[def.anchor, elbow, end]} color={color} lineWidth={active ? 2 : 1} raycast={() => null} />
      </group>
      <ScreenLabel position={end}>
        <div
          ref={plateRef}
          aria-hidden="true"
          style={{ visibility: "hidden", transform: def.side === "r" ? "translate(0,-50%)" : "translate(-100%,-50%)" }}
          className={`max-w-[180px] bg-paper-raised px-2 py-1.5 whitespace-nowrap ${
            active ? "border-2 border-accent" : "border border-ink"
          }`}
        >
          <div className={`t-label whitespace-pre ${active ? "text-accent" : "text-ink"}`}>
            {def.no}
            {"  "}
            {def.title}
          </div>
          <div className="text-sm font-medium text-ink">{def.name}</div>
        </div>
      </ScreenLabel>
    </>
  );
}

/** Midpoint, rotation (Y axis onto a->b) and length for a segment. Keyed by value, not array identity. */
export function useSegment(a: V3, b: V3) {
  const ka = a.join();
  const kb = b.join();
  return useMemo(() => {
    const va = new THREE.Vector3(...(ka.split(",").map(Number) as V3));
    const vb = new THREE.Vector3(...(kb.split(",").map(Number) as V3));
    const d = vb.clone().sub(va);
    const len = d.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return { pos: va.add(vb).multiplyScalar(0.5), quat, len };
  }, [ka, kb]);
}

/** Cylinder between two points. */
export function Rod({ a, b, r, slot, ink, seg = 14 }: { a: V3; b: V3; r: number; slot: Slot; ink?: boolean; seg?: number }) {
  const { pos, quat, len } = useSegment(a, b);
  return (
    <M slot={slot} smooth ink={ink} position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, seg, 1]} />
    </M>
  );
}

/** Smooth tube through points (CatmullRom). */
export function Tube({ points, r, slot, ink }: { points: V3[]; r: number; slot: Slot; ink?: boolean }) {
  const key = points.map((p) => p.join()).join(";");
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(key.split(";").map((p) => new THREE.Vector3(...(p.split(",").map(Number) as V3)))),
    [key],
  );
  return (
    <M slot={slot} smooth ink={ink}>
      <tubeGeometry args={[curve, Math.max(24, points.length * 12), r, 10, false]} />
    </M>
  );
}
