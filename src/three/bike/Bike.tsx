"use client";

import * as THREE from "three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows, Line } from "@react-three/drei";
import type { BuildConfig } from "@/lib/build-schema";
import { GROUPS, OPTION_NAMES, type GroupId } from "@/lib/catalog";
import { useThemeTokens } from "../tokens";
import { mixAt, PartGroup, SceneCtx, SharedCtx, type LabelDef, type Shared, type V3 } from "./core";
import { AXLE_F, AXLE_R, ENGINE_HALF, Engine, Exhaust, Frame, Handlebar, LineStyleCtx, Seat, Tank, Tire, Wheel } from "./parts";

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

type Placement = { offset: V3; anchor: V3; label?: Omit<LabelDef, "no" | "title" | "name"> };

// Explode offsets from DESIGN 7.5; anchors are where leaders and dashed paths start.
const PLACE: Record<Exclude<GroupId, "wheels">, Placement> = {
  frame: { offset: [0, 0, 0], anchor: [-0.6, 0.74, 0.09], label: { anchor: [-0.6, 0.74, 0.09], offset: [-0.42, -0.24, 0], side: "l" } },
  tank: { offset: [0.1, 0.65, 0], anchor: [0.2, 0.9, 0], label: { anchor: [0.3, 0.95, 0.06], offset: [-0.34, 0.3, 0], side: "l" } },
  seat: { offset: [-0.3, 0.55, 0], anchor: [-0.32, 0.8, 0], label: { anchor: [-0.42, 0.81, 0.08], offset: [-0.42, 0.22, 0], side: "l" } },
  handlebar: { offset: [0.3, 0.6, 0], anchor: [0.43, 1.0, 0], label: { anchor: [0.42, 1.01, 0.26], offset: [0.4, 0.14, 0], side: "r" } },
  exhaust: { offset: [-0.3, -0.1, 0.55], anchor: [-0.5, 0.3, 0.19], label: { anchor: [-0.72, 0.31, 0.19], offset: [-0.3, -0.32, 0], side: "l" } },
  engine: { offset: [0, -0.55, 0.35], anchor: [0.08, 0.4, 0], label: { anchor: [0.2, 0.28, 0.1], offset: [0.42, -0.24, 0], side: "r" } },
};

const META = Object.fromEntries(GROUPS.map((g) => [g.id, g])) as Record<GroupId, (typeof GROUPS)[number]>;

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

  // Per-frame state lives in refs, written only in the layout effect below.
  const own = useRef({ explode: { current: 0 }, intro: { current: 1 } });
  const shared = useRef<Shared>(null!);

  // Push render values into the per-frame state, then request a frame (demand frameloop).
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

  const label = (gid: GroupId, name: string): LabelDef | undefined => {
    const l = gid === "wheels" ? WHEEL_LABEL : PLACE[gid].label;
    return l && { ...l, no: META[gid].no, title: META[gid].label, name };
  };
  const group = (gid: Exclude<GroupId, "wheels">, option: string, child: React.ReactNode) => (
    <PartGroup
      gid={gid}
      idx={GROUPS.findIndex((g) => g.id === gid)}
      option={option}
      offset={PLACE[gid].offset}
      anchor={PLACE[gid].anchor}
      label={label(gid, OPTION_NAMES[option])}
    >
      {child}
    </PartGroup>
  );
  const wheelName = `${OPTION_NAMES[p.wheels]}, ${OPTION_NAMES[p.tires]}`;
  const painted = mode === "painted";

  return (
    <SharedCtx.Provider value={shared}>
      <SceneCtx.Provider value={{ colors, highlight: hl }}>
        <LineStyleCtx.Provider value={{ show: !painted, color: tokens.inkMuted }}>
          {group("frame", p.frame, <Frame type={p.frame} engine={p.engine} />)}
          {group("tank", p.tank, <Tank type={p.tank} />)}
          {group("seat", p.seat, <Seat type={p.seat} />)}
          {group("handlebar", p.handlebar, <Handlebar type={p.handlebar} />)}
          <PartGroup gid="wheels" idx={4} option={p.wheels} offset={[0.55, 0, 0]} anchor={[AXLE_F, 0.33, 0]}>
            <Wheel type={p.wheels} x={AXLE_F} />
          </PartGroup>
          <PartGroup gid="wheels" idx={4} option={p.wheels} offset={[-0.55, 0, 0]} anchor={[AXLE_R, 0.33, 0]}>
            <Wheel type={p.wheels} x={AXLE_R} />
          </PartGroup>
          <PartGroup
            gid="wheels"
            idx={4}
            option={p.tires}
            offset={[0.85, 0, 0.25]}
            anchor={[AXLE_F, 0.6, 0]}
            label={label("wheels", wheelName)}
          >
            <Tire type={p.tires} x={AXLE_F} />
          </PartGroup>
          <PartGroup gid="wheels" idx={4} option={p.tires} offset={[-0.85, 0, 0.25]} anchor={[AXLE_R, 0.6, 0]}>
            <Tire type={p.tires} x={AXLE_R} />
          </PartGroup>
          {group("exhaust", p.exhaust, <Exhaust type={p.exhaust} engine={p.engine} />)}
          {group("engine", p.engine, <Engine type={p.engine} />)}
          {!painted && ground && <Line points={[[-1.4, 0, 0], [1.4, 0, 0]]} color={tokens.ink} lineWidth={2} raycast={() => null} />}
          {painted && (
            <ContactShadows
              position={[0, 0.002, 0]}
              opacity={tokens.dark ? 0.5 : 0.35}
              blur={2.5}
              far={1}
              scale={[3.6, 1.6]}
              resolution={256}
              color={tokens.ink}
            />
          )}
        </LineStyleCtx.Provider>
      </SceneCtx.Provider>
    </SharedCtx.Provider>
  );
}

const WHEEL_LABEL: Omit<LabelDef, "no" | "title" | "name"> = { anchor: [AXLE_F, 0.6, 0.06], offset: [0.28, 0.3, 0], side: "r" };

/** Mid-range phones: keep the canvas cheap (DESIGN 7.4). */
export const BIKE_DPR: [number, number] = [1, 1.75];
export { ENGINE_HALF };
