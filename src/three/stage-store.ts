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
