"use client";

import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows, Line } from "@react-three/drei";
import type { BuildConfig, PartKey } from "@/lib/build-schema";
import { GROUPS, OPTION_NAMES, STYLE_SIGNATURE, type GroupId } from "@/lib/catalog";
import { useThemeTokens } from "../tokens";
import { DPR, useQuality, type Tier } from "../stage-store";
import { mixAt, PartGroup, SceneCtx, SharedCtx, type Shared, type V3 } from "./core";
import { finish, Kit, type Built } from "./kit";
import { makeRig, type Rig } from "./rig";
import { RECIPES, tire, wheel, type Ctx } from "./recipes";

export type BikeMode = "blueprint" | "painted";

export type BikeProps = {
  config: BuildConfig;
  /** 0 = assembled, 1 = exploded. A ref lets scroll/tweens drive it without React renders. */
  exploded: number | { current: number };
  mode: BikeMode;
  highlight?: GroupId | "tires" | null;
  /** Landing scrub: parts leave one after another in story order. */
  sequential?: boolean;
  /** Show callouts for exploded parts (otherwise only the highlighted part). */
  labels?: boolean;
  /** Narrow screens: only the highlighted part's callout (DESIGN 7.6). */
  activeOnly?: boolean;
  /** What a part does when its option changes: M7 pop (landing) or M8 accent flash (garage). */
  changeEffect?: "pop" | "flash" | "none";
  /** Edge opacity multiplier for the M3 intro. */
  intro?: { current: number };
  reduceMotion?: boolean;
  /** Draw the 2px ground line in line mode (the landing draws its own animated one). */
  ground?: boolean;
};

type Side = "l" | "r";
type Def = {
  gid: GroupId;
  key: string;
  /** part keys (besides the rig) the recipe reads; the group rebuilds only when these change */
  deps: PartKey[];
  build: (k: Kit, c: Ctx) => void;
  offset: V3;
  story: number | null;
  label: [number, number, Side];
};

// Explode offsets: DESIGN 7.5 for the story parts; v2 parts move with their neighbours.
const DEFS: Def[] = [
  { gid: "frame", key: "frame", deps: ["frame", "rearShock"], build: RECIPES.frame, offset: [0, 0, 0], story: 0, label: [0.1, 0.5, "r"] },
  { gid: "tank", key: "tank", deps: ["tank"], build: RECIPES.tank, offset: [0.1, 0.65, 0], story: 1, label: [-0.34, 0.3, "l"] },
  { gid: "gasCap", key: "gasCap", deps: ["tank", "gasCap"], build: RECIPES.gasCap, offset: [0.1, 0.92, 0], story: 1, label: [0.3, 0.12, "r"] },
  { gid: "seat", key: "seat", deps: ["seat", "tank"], build: RECIPES.seat, offset: [-0.3, 0.55, 0], story: 2, label: [-0.42, 0.22, "l"] },
  { gid: "handlebar", key: "handlebar", deps: ["handlebar"], build: RECIPES.handlebar, offset: [0.3, 0.6, 0], story: 3, label: [0.4, 0.14, "r"] },
  { gid: "grips", key: "grips", deps: ["handlebar", "grips"], build: RECIPES.grips, offset: [0.3, 0.6, 0.12], story: 3, label: [0.36, 0.1, "r"] },
  { gid: "mirrors", key: "mirrors", deps: ["handlebar", "mirrors"], build: RECIPES.mirrors, offset: [0.3, 0.75, 0], story: 3, label: [0.36, 0.12, "r"] },
  { gid: "gauges", key: "gauges", deps: ["gauges"], build: RECIPES.gauges, offset: [0.3, 0.85, 0], story: 3, label: [0.36, 0.12, "r"] },
  { gid: "exhaust", key: "exhaust", deps: ["exhaust", "engine"], build: RECIPES.exhaust, offset: [-0.3, -0.1, 0.55], story: 5, label: [-0.3, -0.32, "l"] },
  { gid: "engine", key: "engine", deps: ["engine"], build: RECIPES.engine, offset: [0, -0.55, 0.35], story: 6, label: [0.42, -0.24, "r"] },
  { gid: "kickStarter", key: "kickStarter", deps: ["kickStarter"], build: RECIPES.kickStarter, offset: [0, -0.55, 0.5], story: 6, label: [-0.3, -0.1, "l"] },
  { gid: "fork", key: "fork", deps: ["fork"], build: RECIPES.fork, offset: [0.32, 0.12, 0.3], story: null, label: [0.36, 0.2, "r"] },
  { gid: "rearShock", key: "rearShock", deps: ["rearShock"], build: RECIPES.rearShock, offset: [-0.1, 0.35, 0.35], story: null, label: [-0.3, 0.2, "l"] },
  { gid: "fenderFront", key: "fenderFront", deps: ["fenderFront", "fork"], build: RECIPES.fenderFront, offset: [0.7, 0.35, 0.1], story: null, label: [0.3, 0.2, "r"] },
  { gid: "fenderRear", key: "fenderRear", deps: ["fenderRear"], build: RECIPES.fenderRear, offset: [-0.75, 0.42, 0], story: null, label: [-0.3, 0.2, "l"] },
  { gid: "sideCover", key: "sideCover", deps: ["sideCover"], build: RECIPES.sideCover, offset: [-0.1, 0.05, 0.55], story: null, label: [-0.3, -0.2, "l"] },
  { gid: "cowl", key: "cowl", deps: ["cowl"], build: RECIPES.cowl, offset: [0.55, 0.55, 0], story: null, label: [0.3, 0.2, "r"] },
  { gid: "headlamp", key: "headlamp", deps: ["headlamp", "fork"], build: RECIPES.headlamp, offset: [0.6, 0.25, 0.15], story: null, label: [0.3, 0.1, "r"] },
  { gid: "signals", key: "signals", deps: ["signals", "handlebar", "fork"], build: RECIPES.signals, offset: [0, 0.35, 0.45], story: null, label: [0.3, 0.2, "r"] },
  { gid: "taillight", key: "taillight", deps: ["taillight"], build: RECIPES.taillight, offset: [-0.7, 0.3, 0.15], story: null, label: [-0.3, 0.2, "l"] },
  { gid: "sissyBar", key: "sissyBar", deps: ["sissyBar"], build: RECIPES.sissyBar, offset: [-0.6, 0.65, 0], story: null, label: [-0.3, 0.2, "l"] },
  { gid: "luggage", key: "luggage", deps: ["luggage"], build: RECIPES.luggage, offset: [-0.45, 0.25, 0.5], story: null, label: [-0.3, -0.2, "l"] },
  { gid: "footControls", key: "footControls", deps: ["footControls"], build: RECIPES.footControls, offset: [0, -0.25, 0.5], story: null, label: [0.3, -0.25, "r"] },
  // one axle each; the front tire carries the shared "Roda & ban" callout
  { gid: "wheels", key: "rimF", deps: ["wheels", "fork"], build: (k, c) => wheel(k, c, true), offset: [0.55, 0, 0], story: 4, label: [0, 0, "r"] },
  { gid: "wheels", key: "rimR", deps: ["wheels"], build: (k, c) => wheel(k, c, false), offset: [-0.55, 0, 0], story: 4, label: [0, 0, "r"] },
  { gid: "wheels", key: "tireF", deps: ["tires"], build: (k, c) => tire(k, c, true), offset: [0.85, 0, 0.25], story: 4, label: [0.28, 0.55, "r"] },
  { gid: "wheels", key: "tireR", deps: ["tires"], build: (k, c) => tire(k, c, false), offset: [-0.85, 0, 0.25], story: 4, label: [0, 0, "r"] },
];

const META = Object.fromEntries(GROUPS.map((g) => [g.id, g])) as Record<GroupId, (typeof GROUPS)[number]>;
const STORY_LABELS = new Set(["frame", "tank", "seat", "handlebar", "tireF", "exhaust", "engine"]);
const SEG: Record<Tier, number> = { high: 1, low: 0.6 };

/** Mid-range phones: keep the canvas cheap (DESIGN 7.4). Prefer `DPR[tier]` from stage-store. */
export const BIKE_DPR: [number, number] = DPR.high;

function Part({ def, rig, rigKey, config, tier }: { def: Def; rig: Rig; rigKey: string; config: BuildConfig; tier: Tier }) {
  const p = config.parts;
  const depKey = def.deps.map((k) => p[k]).join("|");
  const built = useMemo<Built>(() => {
    const k = new Kit(SEG[tier]);
    def.build(k, { r: rig, p, style: config.style });
    return finish(k);
    // rebuild only when the rig, this part's own options or the tier change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rigKey, depKey, tier, def]);
  const meta = META[def.gid];
  const name = def.gid === "wheels" ? `${OPTION_NAMES[p.wheels]}, ${OPTION_NAMES[p.tires]}` : OPTION_NAMES[p[def.gid]];
  const [lx, ly, side] = def.label;
  const hasLabel = def.gid !== "wheels" || def.key === "tireF";
  return (
    <PartGroup
      gid={def.gid}
      story={def.story}
      option={depKey}
      offset={def.offset}
      built={built}
      overview={STORY_LABELS.has(def.key)}
      label={hasLabel ? { offset: [lx, ly, 0], side, no: meta.no, title: meta.label, name } : undefined}
    />
  );
}

export function Bike({
  config,
  exploded,
  mode,
  highlight = null,
  sequential = false,
  labels = false,
  activeOnly = false,
  changeEffect = "none",
  intro,
  reduceMotion = false,
  ground = true,
}: BikeProps) {
  const tokens = useThemeTokens();
  const { tier } = useQuality();
  const invalidate = useThree((s) => s.invalidate);
  const p = config.parts;
  const hl: GroupId | null = highlight === "tires" ? "wheels" : highlight;

  const colors = useMemo(
    () => ({
      paper: new THREE.Color(tokens.paper),
      ink: new THREE.Color(tokens.ink),
      inkMuted: new THREE.Color(tokens.inkMuted),
      accent: new THREE.Color(tokens.accent),
    }),
    [tokens],
  );

  const keepWheels = STYLE_SIGNATURE[config.style].includes("wheels");
  const rigKey = [config.style, config.base, p.frame, p.fork, p.engine, keepWheels].join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rig = useMemo(() => makeRig(config.style, config.base, p, keepWheels), [rigKey]);

  // Per-frame state lives in refs, written only in the layout effect below.
  const own = useRef({ explode: { current: 0 }, intro: { current: 1 } });
  const shared = useRef<Shared>(null!);

  useLayoutEffect(() => {
    const o = own.current;
    shared.current ??= {
      explode: o.explode,
      sequential,
      intro: o.intro,
      highlight: hl,
      labels,
      activeOnly,
      effect: changeEffect,
      reduce: reduceMotion,
      colors,
      paint: { tank: new THREE.Color(), frame: new THREE.Color(), accent: new THREE.Color(), finish: "gloss" },
      mix: { from: mode === "painted" ? 1 : 0, to: mode === "painted" ? 1 : 0, start: 0 },
      tier,
    };
    const s = shared.current;
    if (typeof exploded === "number") {
      o.explode.current = exploded;
      s.explode = o.explode;
    } else s.explode = exploded;
    s.intro = intro ?? o.intro;
    s.sequential = sequential;
    s.highlight = hl;
    s.labels = labels;
    s.activeOnly = activeOnly;
    s.effect = changeEffect;
    s.reduce = reduceMotion;
    s.colors = colors;
    s.tier = tier;
    s.paint.tank.set(config.paint.tank);
    s.paint.frame.set(config.paint.frame);
    s.paint.accent.set(config.paint.accent);
    s.paint.finish = config.paint.finish;
    const to = mode === "painted" ? 1 : 0;
    if (s.mix.to !== to) {
      const now = performance.now();
      s.mix = { from: mixAt(s.mix, now, reduceMotion), to, start: now };
    }
    invalidate();
  });

  const painted = mode === "painted";
  const sc = rig.scale;

  return (
    <SharedCtx.Provider value={shared}>
      <SceneCtx.Provider value={{ colors, highlight: hl, tier }}>
        <group scale={sc}>
          {DEFS.map((d) => (
            <Part key={d.key} def={d} rig={rig} rigKey={rigKey} config={config} tier={tier} />
          ))}
          {!painted && <Axles rig={rig} color={tokens.inkMuted} />}
        </group>
        {!painted && ground && <Line points={[[-1.4, 0, 0], [1.4, 0, 0]]} color={tokens.ink} lineWidth={2} raycast={() => null} />}
        {painted && (
          <ContactShadows
            // baked once per build on Low; High re-renders it with the frame so exploded parts lift off
            key={tier === "low" ? JSON.stringify(config) : "live"}
            frames={tier === "low" ? 1 : Infinity}
            position={[0, 0.002, 0]}
            opacity={tokens.dark ? 0.5 : 0.38}
            blur={2.4}
            far={1}
            scale={[3.6, 1.6]}
            resolution={tier === "low" ? 256 : 512}
            color={tokens.ink}
          />
        )}
      </SceneCtx.Provider>
    </SharedCtx.Provider>
  );
}

/** Chain-dash axle centerlines (DESIGN 5.4), line mode only. */
function Axles({ rig, color }: { rig: Rig; color: string }) {
  return (
    <>
      {[rig.aF, rig.aR].map(([x, y], i) => (
        <group key={i} position={[x, y, 0.08]}>
          <Line points={[[-0.42, 0, 0], [0.42, 0, 0]]} color={color} lineWidth={1} dashed dashSize={0.06} gapSize={0.015} raycast={() => null} />
          <Line points={[[0, -0.42, 0], [0, 0.42, 0]]} color={color} lineWidth={1} dashed dashSize={0.06} gapSize={0.015} raycast={() => null} />
        </group>
      ))}
    </>
  );
}

export { ENGINE_HALF } from "./rig";
