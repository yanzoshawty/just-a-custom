"use client";

import { Environment, Lightformer } from "@react-three/drei";

/** Painted-mode lighting (DESIGN 7.3): local Lightformers only, no HDR download. Line mode ignores lights. */
export function Lights() {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#1a2430", 0.5]} />
      <directionalLight position={[3, 4, 2]} intensity={2} />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} />
      <Environment resolution={256} frames={1}>
        {/* the bengkel TL tube lamp overhead */}
        <Lightformer form="rect" intensity={2} scale={[4, 0.15, 1]} position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={0.6} scale={[6, 3, 1]} position={[-3, 1, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={0.6} scale={[6, 3, 1]} position={[3, 1, -1]} rotation={[0, -Math.PI / 2, 0]} />
        {/* dim wall behind the viewer so chrome is not mirror-black between the lamps */}
        <Lightformer form="rect" intensity={0.25} scale={[10, 4, 1]} position={[0, 1, 5]} rotation={[0, Math.PI, 0]} />
      </Environment>
    </>
  );
}
