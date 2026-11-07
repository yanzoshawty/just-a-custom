import { useSyncExternalStore } from "react";
// Landing stage state, tweened by GSAP/ScrollTrigger and read every frame by the landing canvas.
// Module-level on purpose: one landing at a time, and it keeps three.js out of the page's main chunk.
export type StageStore = {
  explode: { current: number };
  intro: { current: number };
  /** 0 = hero side elevation, 1 = 3/4 view */
  view: number;
  /** 0..1 blend into the styles-section framing */
  aliran: number;
  /** M2 draw-in progress */
  draw: number;
  /** dimension line visibility */
  dim: number;
  /** set by the canvas; requests a frame on the demand frameloop */
  invalidate: () => void;
  /** narrow screens: page regions the bike is framed into (hero window, styles window) */
  heroEl: HTMLElement | null;
  aliranEl: HTMLElement | null;
};

export const stage: StageStore = {
  explode: { current: 0 },
  intro: { current: 0 },
  view: 0,
  aliran: 0,
  draw: 0,
  dim: 1,
  invalidate: () => {},
  heroEl: null,
  aliranEl: null,
};

export function resetStage(reduce: boolean) {
  stage.explode.current = 0;
  stage.intro.current = reduce ? 1 : 0;
  stage.view = 0;
  stage.aliran = 0;
  stage.draw = reduce ? 1 : 0;
  stage.dim = 1;
}

/* ---------------- render quality (DESIGN 7.7) ----------------
 * mode: what the user picked ("auto" by default; the frontend's toggle calls setQualityMode).
 * tier: what the canvases render. Auto starts from a device guess and drops to "low" when drei's
 * PerformanceMonitor reports sustained slow frames or the WebGL context is lost. Manual picks are
 * kept in localStorage (`jac:quality`). React: `useQuality()`; anywhere else: `getQuality()`.
 */

export type QualityMode = "auto" | "high" | "low";
export type Tier = "high" | "low";
type Quality = { mode: QualityMode; tier: Tier; dpr: [number, number] };
const q = (mode: QualityMode, tier: Tier): Quality => ({ mode, tier, dpr: DPR[tier] });

const QKEY = "jac:quality";
let autoTier: Tier | null = null;
let quality: Quality | null = null;
const listeners = new Set<() => void>();
const SERVER: Quality = { mode: "auto", tier: "high", dpr: [1, 2] };

function guessTier(): Tier {
  try {
    const n = navigator as Navigator & { deviceMemory?: number };
    const coarse = matchMedia("(pointer: coarse)").matches;
    const small = Math.min(screen.width, screen.height) < 820;
    if ((coarse && small) || (n.deviceMemory ?? 8) <= 4 || (n.hardwareConcurrency ?? 8) <= 4) return "low";
  } catch {
    // no navigator details: stay optimistic, the monitor still steps down
  }
  return "high";
}

function compute(): Quality {
  let mode: QualityMode = "auto";
  try {
    const v = localStorage.getItem(QKEY);
    if (v === "high" || v === "low" || v === "auto") mode = v;
  } catch {
    // storage blocked: session-only choice
  }
  autoTier ??= guessTier();
  return q(mode, mode === "auto" ? autoTier : mode);
}

export function getQuality(): Quality {
  if (typeof window === "undefined") return SERVER;
  return (quality ??= compute());
}

function emit(next: Quality) {
  quality = next;
  listeners.forEach((l) => l());
}

export function setQualityMode(mode: QualityMode) {
  try {
    localStorage.setItem(QKEY, mode);
  } catch {
    // storage blocked: still applies for this session
  }
  autoTier ??= guessTier();
  emit(q(mode, mode === "auto" ? autoTier : mode));
}

/** Called by the canvases: PerformanceMonitor decline/fallback, or a lost WebGL context. */
export function reportSlow() {
  autoTier = "low";
  const cur = getQuality();
  if (cur.mode === "auto" && cur.tier !== "low") emit(q("auto", "low"));
}

export const useQuality = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    getQuality,
    () => SERVER,
  );

/** Device-pixel-ratio cap per tier (report: DPR 1-1.5 on Low, up to 2 on High). */
export const DPR: Record<Tier, [number, number]> = { high: [1, 2], low: [1, 1.25] };
