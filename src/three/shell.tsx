"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";

let probe: boolean | undefined;
function hasWebGL() {
  if (probe === undefined) {
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
      probe = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      probe = false;
    }
  }
  return probe;
}

/** null on the server and during hydration, then the probe result. */
export const useWebGL = () => useSyncExternalStore<boolean | null>(() => () => {}, hasWebGL, () => null);

/** UX-SPEC 6.1: grid ground, mono line, ground line drawing in. No spinner. */
export function CanvasLoading() {
  return (
    <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="flex w-56 flex-col items-center gap-3">
        <span className="t-data bg-paper-raised px-2 py-1 text-ink">Menyiapkan meja gambar...</span>
        <span aria-hidden="true" className="draw-in block h-0.5 w-full bg-ink" />
      </div>
    </div>
  );
}

/** UX-SPEC 6.2 plate. */
export function CanvasFailed({ tail }: { tail: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <p className="plate-thick max-w-md p-4 text-ink">
        Browser ini nggak bisa menampilkan 3D (WebGL mati atau nggak didukung). {tail}
      </p>
    </div>
  );
}

export class GLBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[3D]", err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
