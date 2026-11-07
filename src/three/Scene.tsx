"use client";

import * as THREE from "three";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import type { RootState } from "@react-three/fiber";
import { reportSlow, useQuality } from "./stage-store";

/**
 * Painted-mode lighting (DESIGN 7.3). The environment map is generated on the GPU from local
 * Lightformers inside a dim "room" shell: no HDR file, no CDN (the CSP blocks drei presets).
 * Line mode ignores lights.
 */
export function Lights() {
  const { tier } = useQuality();
  const high = tier === "high";
  return (
    <>
      <hemisphereLight args={["#ffffff", "#1a2430", 0.45]} />
      <directionalLight position={[3, 4, 2]} intensity={1.8} />
      <directionalLight position={[-3, 2, -2]} intensity={0.7} />
      <Environment key={tier} resolution={high ? 512 : 128} frames={1}>
        {/* dim bengkel walls so chrome never mirrors pure black */}
        <mesh scale={30}>
          <sphereGeometry args={[1, 24, 12]} />
          <meshBasicMaterial color="#2c3238" side={THREE.BackSide} />
        </mesh>
        {/* the TL tube lamp overhead: the long streak along tanks and fenders */}
        <Lightformer form="rect" intensity={2.4} scale={[5, 0.18, 1]} position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} scale={[5, 0.12, 1]} position={[0.8, 3, 1.2]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={0.7} scale={[6, 3, 1]} position={[-3.5, 1, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={0.6} scale={[6, 3, 1]} position={[3.5, 1, -1]} rotation={[0, -Math.PI / 2, 0]} />
        {/* garage door behind the viewer, and a warm floor bounce */}
        <Lightformer form="rect" intensity={0.45} scale={[10, 4, 1]} position={[0, 1.2, 6]} rotation={[0, Math.PI, 0]} />
        {high && <Lightformer form="ring" color="#ffe2b8" intensity={0.5} scale={2} position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]} />}
      </Environment>
    </>
  );
}

/**
 * Adaptive quality: with frameloop="demand" the monitor only samples while frames render
 * (orbiting, explode, crossfade), which is exactly when slowness shows. Auto mode only.
 */
export function Quality() {
  const { mode } = useQuality();
  if (mode !== "auto") return null;
  return <PerformanceMonitor flipflops={3} onDecline={reportSlow} onFallback={reportSlow} />;
}

/** Dev builds: localStorage `jac:debug3d` = "1" exposes the renderer as window.__jac3d for draw-call checks (renderer.info). */
export function exposeDebug(state: RootState) {
  state.gl.domElement.addEventListener("webglcontextlost", reportSlow);
  let on = false;
  try {
    on = localStorage.getItem("jac:debug3d") === "1";
  } catch {
    // storage blocked: debug hook stays off
  }
  // Dev only: the array is never trimmed, so it must not ship (audit-002 #2).
  if (on && process.env.NODE_ENV !== "production")
    (window as unknown as { __jac3d?: RootState[] }).__jac3d = [...((window as unknown as { __jac3d?: RootState[] }).__jac3d ?? []), state];
}
