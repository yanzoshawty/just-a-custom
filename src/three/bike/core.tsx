"use client";

import * as THREE from "three";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { ScreenLabel } from "../ScreenLabel";
import type { Finish, GroupId } from "@/lib/catalog";
import type { Tier } from "../stage-store";
import { isPaint, makePainted, applyPaint, PAINT_SLOTS } from "./materials";
import type { Built, Slot, V3 } from "./kit";

export type { V3 };
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
  tier: Tier;
};

export const SharedCtx = createContext<{ current: Shared } | null>(null);
/** Render-time scene values (colors, highlight); per-frame values live in SharedCtx. */
export const SceneCtx = createContext<{ colors: Colors; highlight: GroupId | null; tier: Tier }>(null!);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const power2Out = (t: number) => 1 - (1 - t) * (1 - t);
const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);

/** Painted-vs-line crossfade value at time `now` (M10: 400ms power2.out). */
export function mixAt(m: Shared["mix"], now: number, reduce: boolean) {
  if (reduce) return m.to;
  const t = clamp01((now - m.start) / 400);
  return m.from + (m.to - m.from) * power2Out(t);
}

// line-mode fill occludes lines behind it (hidden-line removal, DESIGN 7.3)
const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide };

// Inverted hull: back faces pushed out along normals give round tubes a silhouette outline,
// which crease edges alone cannot (a smooth tube has no creases).
function makeHull() {
  const m = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * 0.0045;");
  };
  return m;
}

function setOpacity(m: THREE.Material, o: number, base = 1) {
  const tr = o * base < 0.999;
  if (m.transparent !== tr) {
    m.transparent = tr;
    m.needsUpdate = true;
  }
  m.opacity = o * base;
}

/** One material set per part group, so fades and flashes stay local to that part. */
class MatSet {
  fill = new THREE.MeshBasicMaterial({ ...offset, toneMapped: false });
  ink = new THREE.MeshBasicMaterial({ toneMapped: false });
  hull = makeHull();
  line = new LineMaterial({ linewidth: 1.5, transparent: true, worldUnits: false, toneMapped: false });
  paints = new Map<Slot, THREE.MeshStandardMaterial>();
  base = new Map<Slot, number>();
  constructor(readonly tier: Tier) {}
  painted(slot: Slot) {
    let m = this.paints.get(slot);
    if (!m) {
      m = makePainted(slot, this.tier);
      if (!isPaint(slot)) {
        m.polygonOffset = true;
        m.polygonOffsetFactor = 1;
        m.polygonOffsetUnits = 1;
      }
      this.base.set(slot, m.transparent ? m.opacity : 1);
      this.paints.set(slot, m);
    }
    return m;
  }
  dispose() {
    this.fill.dispose();
    this.ink.dispose();
    this.hull.dispose();
    this.line.dispose();
    this.paints.forEach((m) => m.dispose());
  }
}

export type LabelDef = { anchor: V3; offset: V3; side: "l" | "r"; no: string; title: string; name: string };

type GroupProps = {
  gid: GroupId;
  /** Landing scrub order (0-6); null = stays with the frame during the scrub. */
  story: number | null;
  /** Changing this value triggers the change effect (M7 pop / M8 flash). */
  option: string;
  offset: V3;
  built: Built;
  /** Callout leader offset from the part's center. */
  label?: Omit<LabelDef, "anchor">;
  /** Show the callout in the exploded overview (story parts only; the rest show when active). */
  overview?: boolean;
};

const tmpColor = new THREE.Color();
const tmpVec = new THREE.Vector3();

export function PartGroup({ gid, story, option, offset: off, built, label, overview = false }: GroupProps) {
  const shared = useContext(SharedCtx)!;
  const scene = useContext(SceneCtx);
  const invalidate = useThree((s) => s.invalidate);
  const move = useRef<THREE.Group>(null!);
  const pop = useRef<THREE.Group>(null!);
  const labelLine = useRef<THREE.Group>(null);
  const plate = useRef<HTMLDivElement>(null);
  const changedAt = useRef(-1e9);
  const lastOption = useRef(option);
  const blueprint = useRef<THREE.Group>(null!);
  const painted = useRef<THREE.Group>(null!);

  const anchor = useMemo<V3>(() => {
    const c = built.box.isEmpty() ? new THREE.Vector3() : built.box.getCenter(new THREE.Vector3());
    return [c.x, c.y, c.z];
  }, [built]);

  const mats = useMemo(() => new MatSet(scene.tier), [scene.tier]);
  useEffect(() => () => mats.dispose(), [mats]);
  useEffect(() => () => built.dispose(), [built]);

  const edges = useMemo(() => {
    if (!built.edges) return null;
    const l = new LineSegments2(built.edges, mats.line);
    l.raycast = () => null;
    return l;
  }, [built, mats]);

  const path = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const line = new THREE.Line(g, new THREE.LineDashedMaterial({ dashSize: 0.04, gapSize: 0.027, transparent: true }));
    line.frustumCulled = false;
    line.visible = false;
    line.raycast = () => null;
    return line;
  }, []);
  useEffect(
    () => () => {
      path.geometry.dispose();
      (path.material as THREE.Material).dispose();
    },
    [path],
  );

  useLayoutEffect(() => {
    if (lastOption.current !== option) {
      lastOption.current = option;
      changedAt.current = performance.now();
    }
    invalidate();
  }, [option, built, invalidate]);

  // three objects mutated every frame are read through a ref (React owns the memoized originals)
  const live = useRef({ mats, edges, path });
  useLayoutEffect(() => {
    live.current = { mats, edges, path };
  }, [mats, edges, path]);

  useFrame(() => {
    const s = shared.current;
    if (!s) return;
    const { mats, edges, path } = live.current;
    const now = performance.now();
    let animating = false;

    // Explode (DESIGN 7.5): sequential on the landing scrub, all at once in the garage.
    const t = s.explode.current;
    const p = s.sequential ? (story === null ? 0 : clamp01(t * 7 - story)) : t;
    move.current.position.set(off[0] * p, off[1] * p, off[2] * p);
    const moved = p > 0.002 && (off[0] || off[1] || off[2]);
    path.visible = !!moved;
    if (moved) {
      const a = path.geometry.attributes.position as THREE.BufferAttribute;
      a.setXYZ(0, anchor[0], anchor[1], anchor[2]);
      a.setXYZ(1, anchor[0] + off[0] * p, anchor[1] + off[1] * p, anchor[2] + off[2] * p);
      a.needsUpdate = true;
      path.computeLineDistances();
      const pm = path.material as THREE.LineDashedMaterial;
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
        flash = clamp01(since < 600 ? 1 : 1 - (since - 600) / 200);
        if (since < 800) animating = true;
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

    // line mode below, painted above; both live only while the crossfade needs them
    blueprint.current.visible = mix < 1;
    painted.current.visible = mix > 0;
    mats.fill.color.copy(s.colors.paper);
    setOpacity(mats.fill, popK * (1 - mix));
    mats.ink.color.copy(edgeColor);
    setOpacity(mats.ink, edgeOpacity);
    mats.hull.color.copy(edgeColor);
    setOpacity(mats.hull, edgeOpacity);
    for (const slot of PAINT_SLOTS) {
      const m = mats.paints.get(slot);
      if (m) applyPaint(m, s.paint[slot], s.paint.finish, mats.tier);
    }
    for (const [slot, m] of mats.paints) setOpacity(m, mix * popK, mats.base.get(slot));

    if (edges) {
      // Low tier drops the faint painted-mode outline: one draw call per part saved
      edges.visible = edgeOpacity > 0.01 && !(mix === 1 && !active && s.tier === "low");
      mats.line.color.copy(edgeColor);
      mats.line.linewidth = acc > 0.5 ? 2.5 : 1.5;
      mats.line.opacity = edgeOpacity;
    }

    // Callout (DESIGN 7.6): story labels in the exploded overview on wide screens, else only the active one.
    if (label) {
      const exploded = s.sequential ? p > 0.05 || (story === 0 && t * 7 > 0.05) : t > 0.5;
      const show = active || (overview && s.labels && !s.activeOnly && exploded);
      if (labelLine.current) labelLine.current.visible = show;
      if (plate.current) plate.current.style.visibility = show ? "visible" : "hidden";
    }

    if (animating) invalidate();
  });

  const slots = [...built.bySlot.entries()];
  return (
    <group>
      <primitive object={path} />
      <group ref={move}>
        <group ref={pop} position={anchor}>
          <group position={[-anchor[0], -anchor[1], -anchor[2]]}>
            <group ref={blueprint}>
              {built.fill && <mesh geometry={built.fill} material={mats.fill} raycast={noop} />}
              {built.ink && <mesh geometry={built.ink} material={mats.ink} raycast={noop} />}
              {built.hull && <mesh geometry={built.hull} material={mats.hull} raycast={noop} />}
            </group>
            <group ref={painted} visible={false}>
              {slots.map(([slot, g]) => (
                <mesh key={slot} geometry={g} material={mats.painted(slot)} raycast={noop} />
              ))}
            </group>
            {edges && <primitive object={edges} />}
          </group>
        </group>
        {label && <Callout def={{ ...label, anchor }} active={scene.highlight === gid} lineRef={labelLine} plateRef={plate} />}
      </group>
    </group>
  );
}

const noop = () => null;

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
        <mesh position={def.anchor} raycast={noop}>
          <sphereGeometry args={[0.012, 10, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <Line points={[def.anchor, elbow, end]} color={color} lineWidth={active ? 2 : 1} raycast={noop} />
      </group>
      <ScreenLabel position={end}>
        <div
          ref={plateRef}
          aria-hidden="true"
          style={{ visibility: "hidden", transform: def.side === "r" ? "translate(0,-50%)" : "translate(-100%,-50%)" }}
          className={`max-w-[180px] bg-paper-raised px-2 py-1.5 whitespace-nowrap ${active ? "border-2 border-accent" : "border border-ink"}`}
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
