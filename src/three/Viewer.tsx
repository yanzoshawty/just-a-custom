"use client";

// Orbitable viewer for /garage and /b/[slug]. Loaded with next/dynamic ssr:false.
import * as THREE from "three";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useQuality } from "./stage-store";
import gsap from "gsap";
import type { BuildConfig } from "@/lib/build-schema";
import type { GroupId } from "@/lib/catalog";
import { Bike, type BikeMode } from "./bike/Bike";
import { Lights, Quality, exposeDebug } from "./Scene";

export type Preset = "samping" | "34" | "depan" | "atas";
export type ViewerApi = {
  preset: (p: Preset) => void;
  reset: () => void;
  orbit: (dTheta: number, dPhi: number) => void;
  zoom: (factor: number) => void;
};

const TARGET = new THREE.Vector3(0, 0.5, 0);
const PRESETS: Record<Preset, [number, number, number]> = {
  samping: [0, 0.55, 6.2],
  "34": [3.6, 1.6, 4.6],
  depan: [6.2, 0.6, 0],
  atas: [0, 6.4, 0.01],
};
const MIN_POLAR = 0.05;
const MAX_POLAR = Math.PI / 2 - 0.02;

/** DESIGN 7.4: scale preset distance so the whole bike fits portrait canvases. */
const fitScale = (aspect: number) => Math.max(1, (2.4 / 1.3 / aspect) * 0.9);

export type ViewerProps = {
  config: BuildConfig;
  exploded: boolean;
  mode: BikeMode;
  highlight: GroupId | null;
  activeOnly: boolean;
  reduceMotion: boolean;
  apiRef: React.RefObject<ViewerApi | null>;
  onReady: () => void;
  onLost: () => void;
};

export default function Viewer(props: ViewerProps) {
  const { onReady, onLost } = props;
  const { dpr } = useQuality();
  return (
    <Canvas
      frameloop="demand"
      dpr={dpr}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 24, near: 0.1, far: 60, position: PRESETS.samping }}
      onCreated={(state) => {
        const { gl } = state;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
        exposeDebug(state);
        onReady();
      }}
      style={{ touchAction: "none" }}
    >
      <Quality />
      <Lights />
      <Rig {...props} />
    </Canvas>
  );
}

function Rig({ config, exploded, mode, highlight, activeOnly, reduceMotion, apiRef }: ViewerProps) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  // stable mutable box tweened by GSAP and read per frame by <Bike>
  const [explode] = useState(() => ({ current: exploded ? 1 : 0 }));
  const fit = fitScale(size.width / Math.max(1, size.height));

  // M9: Utuh / Bongkar, 700ms power3.inOut, instant under reduced motion.
  useEffect(() => {
    const to = exploded ? 1 : 0;
    const t = gsap.to(explode, {
      current: to,
      duration: reduceMotion ? 0 : 0.7,
      ease: "power3.inOut",
      onUpdate: invalidate,
    });
    return () => void t.kill();
  }, [explode, exploded, reduceMotion, invalidate]);

  // Initial framing: fitted side elevation.
  useLayoutEffect(() => {
    const p = new THREE.Vector3(...PRESETS.samping).sub(TARGET).multiplyScalar(fit).add(TARGET);
    camera.position.copy(p);
    camera.lookAt(TARGET);
    controls.current?.target.copy(TARGET);
    controls.current?.update();
    invalidate();
    // only on mount; later resizes keep the user's view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let tween: gsap.core.Timeline | null = null;
    const fly = (pos: THREE.Vector3) => {
      const c = controls.current;
      if (!c) return;
      tween?.kill();
      if (reduceMotion) {
        camera.position.copy(pos);
        c.target.copy(TARGET);
        c.update();
        invalidate();
        return;
      }
      c.enabled = false;
      const target = c.target;
      tween = gsap
        .timeline({
          defaults: { duration: 0.8, ease: "power2.inOut" },
          onUpdate: () => {
            c.update();
            invalidate();
          },
          onComplete: () => void (c.enabled = true),
        })
        .to(camera.position, { x: pos.x, y: pos.y, z: pos.z }, 0)
        .to(target, { x: TARGET.x, y: TARGET.y, z: TARGET.z }, 0);
    };
    const presetPos = (p: Preset) => new THREE.Vector3(...PRESETS[p]).sub(TARGET).multiplyScalar(fit).add(TARGET);
    const sph = new THREE.Spherical();
    const off = new THREE.Vector3();
    apiRef.current = {
      preset: (p) => fly(presetPos(p)),
      reset: () => fly(presetPos("samping")),
      orbit: (dTheta, dPhi) => {
        const c = controls.current;
        if (!c) return;
        off.copy(camera.position).sub(c.target);
        sph.setFromVector3(off);
        sph.theta += dTheta;
        sph.phi = Math.min(MAX_POLAR, Math.max(MIN_POLAR, sph.phi + dPhi));
        camera.position.copy(c.target).add(off.setFromSpherical(sph));
        c.update();
        invalidate();
      },
      zoom: (factor) => {
        const c = controls.current;
        if (!c) return;
        off.copy(camera.position).sub(c.target);
        const d = Math.min(c.maxDistance, Math.max(c.minDistance, off.length() * factor));
        camera.position.copy(c.target).add(off.setLength(d));
        c.update();
        invalidate();
      },
    };
    return () => {
      tween?.kill();
      apiRef.current = null;
    };
  }, [apiRef, camera, fit, invalidate, reduceMotion]);

  return (
    <>
      <Bike
        config={config}
        exploded={explode}
        mode={mode}
        highlight={highlight}
        labels={exploded}
        activeOnly={activeOnly}
        changeEffect="flash"
        reduceMotion={reduceMotion}
      />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.5}
        maxDistance={Math.max(10, 6.6 * fit)}
        minPolarAngle={MIN_POLAR}
        maxPolarAngle={MAX_POLAR}
        target={[TARGET.x, TARGET.y, TARGET.z]}
      />
    </>
  );
}
