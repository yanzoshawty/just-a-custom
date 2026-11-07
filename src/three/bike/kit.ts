// Geometry kit: part recipes push primitives into a Kit, which merges them per material slot so a
// whole part costs one draw call per slot (DESIGN 7.2, report "draw calls matter more than triangles").
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LoftGeometry } from "three/examples/jsm/geometries/LoftGeometry.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

export type V3 = [number, number, number];
export type V2 = [number, number];

/** Material slots. Paint slots follow the user's colors; the rest are fixed real-world materials. */
export type Slot =
  | "tank"
  | "frame"
  | "accent"
  | "chrome"
  | "alloy"
  | "engine"
  | "black"
  | "rubber"
  | "leather"
  | "lens"
  | "lamp"
  | "red"
  | "amber"
  | "plate";

/** hard: crease edges at 25 deg; smooth: silhouette hull + 60 deg creases; ink: solid line color, too thin to outline. */
export type Kind = "hard" | "smooth" | "ink";

type Piece = { geo: THREE.BufferGeometry; slot: Slot; kind: Kind };

const Y_UP = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

export type Opt = { kind?: Kind; seg?: number };

export class Kit {
  pieces: Piece[] = [];
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  /** Segment multiplier from the quality tier (1 high, ~0.6 low). */
  readonly q: number;
  constructor(q = 1) {
    this.q = q;
  }

  n(base: number, min = 3) {
    return Math.max(min, Math.round(base * this.q));
  }

  /** Run `fn` with an extra transform (position, euler XYZ radians, scale). */
  at(pos: V3, rot: V3 | null, scale: V3 | number | null, fn: () => void) {
    const s = typeof scale === "number" ? [scale, scale, scale] : (scale ?? [1, 1, 1]);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(s as V3)),
    );
    this.stack.push(this.top.clone().multiply(m));
    fn();
    this.stack.pop();
  }

  /** Mirror call for both sides of the bike (z = +side). */
  sides(fn: (s: 1 | -1) => void, only?: (1 | -1)[]) {
    for (const s of only ?? ([1, -1] as const)) fn(s);
  }

  private get top() {
    return this.stack[this.stack.length - 1];
  }

  add(geo: THREE.BufferGeometry, slot: Slot, kind: Kind = "hard", local?: THREE.Matrix4) {
    geo.applyMatrix4(local ? tmpM.multiplyMatrices(this.top, local) : this.top);
    this.pieces.push({ geo, slot, kind });
  }

  /** Cylinder from a to b. r2 tapers the b end. */
  rod(a: V3, b: V3, r: number, slot: Slot, o: Opt & { r2?: number; open?: boolean } = {}) {
    tmpA.set(...a);
    tmpB.set(...b);
    const d = tmpB.clone().sub(tmpA);
    const len = d.length();
    if (len < 1e-5) return;
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, len, this.n(o.seg ?? 12), 1, !!o.open);
    tmpQ.setFromUnitVectors(Y_UP, d.normalize());
    const m = new THREE.Matrix4().compose(tmpA.add(tmpB).multiplyScalar(0.5), tmpQ, new THREE.Vector3(1, 1, 1));
    this.add(g, slot, o.kind ?? "smooth", m);
  }

  /** Smooth tube through points (centripetal CatmullRom). */
  tube(points: V3[], r: number, slot: Slot, o: Opt & { closed?: boolean; tension?: number } = {}) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      !!o.closed,
      o.tension === undefined ? "centripetal" : "catmullrom",
      o.tension ?? 0.5,
    );
    const g = new THREE.TubeGeometry(curve, this.n(Math.max(16, points.length * 10)), r, this.n(o.seg ?? 10), !!o.closed);
    this.add(g, slot, o.kind ?? "smooth");
  }

  box(size: V3, pos: V3, slot: Slot, o: Opt & { rot?: V3; radius?: number } = {}) {
    const g = o.radius
      ? new RoundedBoxGeometry(size[0], size[1], size[2], this.n(3, 2), Math.min(o.radius, Math.min(...size) / 2 - 1e-4))
      : new THREE.BoxGeometry(...size);
    this.add(g, slot, o.kind ?? (o.radius ? "smooth" : "hard"), mat(pos, o.rot));
  }

  sphere(r: number, pos: V3, slot: Slot, o: Opt & { scale?: V3; rot?: V3; phi?: [number, number]; theta?: [number, number] } = {}) {
    const g = new THREE.SphereGeometry(r, this.n(o.seg ?? 20), this.n((o.seg ?? 20) * 0.6), o.phi?.[0], o.phi?.[1], o.theta?.[0], o.theta?.[1]);
    this.add(g, slot, o.kind ?? "smooth", mat(pos, o.rot, o.scale));
  }

  /** Torus in its local XY plane (axis +Z). */
  torus(R: number, r: number, pos: V3, slot: Slot, o: Opt & { rot?: V3; arc?: number; scale?: V3; radial?: number } = {}) {
    const g = new THREE.TorusGeometry(R, r, this.n(o.radial ?? 10), this.n(o.seg ?? 48), o.arc ?? Math.PI * 2);
    this.add(g, slot, o.kind ?? "smooth", mat(pos, o.rot, o.scale));
  }

  /** Cylinder along local Y. */
  cyl(rTop: number, rBot: number, h: number, pos: V3, slot: Slot, o: Opt & { rot?: V3; open?: boolean; theta?: [number, number]; scale?: V3 } = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, this.n(o.seg ?? 20), 1, !!o.open, o.theta?.[0], o.theta?.[1]);
    this.add(g, slot, o.kind ?? "smooth", mat(pos, o.rot, o.scale));
  }

  /** Lathe around local Y from [radius, y] pairs. */
  lathe(profile: V2[], pos: V3, slot: Slot, o: Opt & { rot?: V3; scale?: V3; phi?: [number, number] } = {}) {
    const g = new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)),
      this.n(o.seg ?? 28),
      o.phi?.[0],
      o.phi?.[1],
    );
    this.add(g, slot, o.kind ?? "smooth", mat(pos, o.rot, o.scale));
  }

  /** Extrude a 2D outline (XY) by depth along Z, centered on z = 0, with a small bevel. */
  extrude(outline: V2[], depth: number, pos: V3, slot: Slot, o: Opt & { rot?: V3; bevel?: number; holes?: V2[][] } = {}) {
    const s = new THREE.Shape(outline.map((p) => new THREE.Vector2(...p)));
    for (const h of o.holes ?? []) s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(...p))));
    const b = o.bevel ?? Math.min(0.004, depth / 4);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(1e-4, depth - 2 * b),
      bevelEnabled: b > 0,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: this.q < 1 ? 1 : 2,
      curveSegments: this.n(8),
    });
    g.translate(0, 0, -(depth - 2 * b) / 2);
    this.add(g, slot, o.kind ?? "hard", mat(pos, o.rot));
  }

  /**
   * Lofted body along +X: sections are superellipse rings [x, yCenter, halfWidth, top, bottom].
   * Used for tanks, seats, cowls and bags (a lathe cannot do flat bottoms or knee dents).
   */
  loft(sections: [number, number, number, number, number][], slot: Slot, o: Opt & { exp?: number; ring?: number; dent?: (t: number, a: number) => number } = {}) {
    const ring = this.n(o.ring ?? 28, 8);
    const e = 2 / (o.exp ?? 2.6);
    const rows = sections.map(([x, yc, w, ht, hb], i) => {
      const t = i / (sections.length - 1);
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j < ring; j++) {
        const a = (j / ring) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const k = o.dent ? o.dent(t, a) : 1;
        const z = Math.sign(c) * Math.pow(Math.abs(c), e) * Math.max(w, 1e-4) * k;
        const y = yc + Math.sign(sn) * Math.pow(Math.abs(sn), e) * (sn > 0 ? ht : hb);
        pts.push(new THREE.Vector3(x, y, z));
      }
      return pts;
    });
    const g = new LoftGeometry(rows, { closed: true, capStart: true, capEnd: true });
    this.add(g, slot, o.kind ?? "smooth");
  }

  /** Flat ring of points around an axis: instanced-looking repeats merged into one draw. */
  repeat(count: number, fn: (i: number, a: number) => void) {
    for (let i = 0; i < count; i++) fn(i, (i / count) * Math.PI * 2);
  }
}

export function mat(pos: V3, rot?: V3, scale?: V3) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))),
    new THREE.Vector3(...(scale ?? [1, 1, 1])),
  );
}

/* ---------------- merge ---------------- */

export type Built = {
  /** painted mode: one geometry per slot */
  bySlot: Map<Slot, THREE.BufferGeometry>;
  /** line mode: every non-ink piece (paper fill), ink pieces, smooth pieces (silhouette hull) */
  fill: THREE.BufferGeometry | null;
  ink: THREE.BufferGeometry | null;
  hull: THREE.BufferGeometry | null;
  edges: LineSegmentsGeometry | null;
  box: THREE.Box3;
  dispose: () => void;
  stats: { vertices: number };
};

function normalize(g: THREE.BufferGeometry) {
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  g.clearGroups();
  return g;
}

function merge(list: THREE.BufferGeometry[]) {
  if (!list.length) return null;
  // mergeGeometries also for one piece: clone() would re-run subclass constructors (LoftGeometry) without args
  const g = mergeGeometries(list, false);
  g.computeBoundingSphere();
  return g;
}

export function finish(kit: Kit): Built {
  const pieces = kit.pieces.map((p) => ({ ...p, geo: normalize(p.geo) }));
  const slots = new Map<Slot, THREE.BufferGeometry[]>();
  const fill: THREE.BufferGeometry[] = [];
  const ink: THREE.BufferGeometry[] = [];
  const hull: THREE.BufferGeometry[] = [];
  const edgePts: number[] = [];
  const box = new THREE.Box3();
  let vertices = 0;
  for (const p of pieces) {
    if (!slots.has(p.slot)) slots.set(p.slot, []);
    slots.get(p.slot)!.push(p.geo);
    vertices += p.geo.attributes.position.count;
    p.geo.computeBoundingBox();
    box.union(p.geo.boundingBox!);
    if (p.kind === "ink") {
      ink.push(p.geo);
      continue;
    }
    fill.push(p.geo);
    if (p.kind === "smooth") hull.push(p.geo);
    const e = new THREE.EdgesGeometry(p.geo, p.kind === "smooth" ? 60 : 25);
    const a = e.attributes.position.array;
    for (let i = 0; i < a.length; i++) edgePts.push(a[i]);
    e.dispose();
  }
  const bySlot = new Map<Slot, THREE.BufferGeometry>();
  for (const [s, list] of slots) bySlot.set(s, merge(list)!);
  let edges: LineSegmentsGeometry | null = null;
  if (edgePts.length) {
    edges = new LineSegmentsGeometry();
    edges.setPositions(edgePts);
  }
  const out: Built = {
    bySlot,
    fill: merge(fill),
    ink: merge(ink),
    hull: merge(hull),
    edges,
    box,
    stats: { vertices },
    dispose: () => {
      bySlot.forEach((g) => g.dispose());
      out.fill?.dispose();
      out.ink?.dispose();
      out.hull?.dispose();
      edges?.dispose();
    },
  };
  for (const p of pieces) p.geo.dispose();
  return out;
}
