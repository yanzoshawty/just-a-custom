"use client";

import { useSyncExternalStore } from "react";

export type Tokens = { paper: string; ink: string; inkMuted: string; accent: string; dark: boolean };

const FALLBACK: Tokens = { paper: "#e9ece6", ink: "#16202b", inkMuted: "#4a5866", accent: "#b3361a", dark: false };

let cached: Tokens = FALLBACK;
let cachedKey = "";

function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
  const next = {
    paper: v("--paper", FALLBACK.paper),
    ink: v("--ink", FALLBACK.ink),
    inkMuted: v("--ink-muted", FALLBACK.inkMuted),
    accent: v("--accent", FALLBACK.accent),
    dark: s.colorScheme.includes("dark"),
  };
  const key = `${next.paper}${next.ink}${next.inkMuted}${next.accent}${next.dark}`;
  if (key !== cachedKey) {
    cachedKey = key;
    cached = next;
  }
  return cached;
}

function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    mo.disconnect();
    mq.removeEventListener("change", cb);
  };
}

/** Theme colors for the 3D scene; re-read on data-theme and system scheme change (DESIGN 7.3). */
export const useThemeTokens = () => useSyncExternalStore(subscribeTheme, readTokens, () => FALLBACK);

export function useMedia(query: string, serverValue = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
    () => serverValue,
  );
}

export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
export const useReducedMotion = () => useMedia(REDUCE_QUERY);
export const prefersReducedMotion = () => typeof window !== "undefined" && matchMedia(REDUCE_QUERY).matches;
