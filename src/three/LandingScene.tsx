"use client";

// Fixed, non-interactive landing canvas. Everything it shows is driven by the mutable `store`
// that GSAP/ScrollTrigger tweens, so scrolling never re-renders React (DESIGN 8, M2 to M7).
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import type { BuildConfig } from "@/lib/build-schema";
import type { GroupId } from "@/lib/catalog";
import { Bike, BIKE_DPR, type BikeMode } from "./bike/Bike";
import { Lights } from "./Scene";
import { useThemeTokens } from "./tokens";
import { stage as store } from "./stage-store";

type Props = {
  config: BuildConfig;
  mode: BikeMode;
  highlight: GroupId | null;
  activeOnly: boolean;
  reduceMotion: boolean;
  onReady: () => void;
  onLost: () => void;
};

export default function LandingScene({ onReady, onLost, ...props }: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={BIKE_DPR}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 24, near: 0.1, far: 80, position: [0, 0.55, 6.2] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
        onReady();
      }}
    >
      <Lights />
      <Rig />
      <Bike
        config={props.config}
        exploded={store.explode}
        intro={store.intro}
        mode={props.mode}
        highlight={props.highlight}
        sequential
        labels
        activeOnly={props.activeOnly}
        changeEffect="pop"
        reduceMotion={props.reduceMotion}
        ground={false}
      />
      {props.mode === "blueprint" && <HeroDimension />}
    </Canvas>
  );
}

const TARGET = new THREE.Vector3(0, 0.5, 0);
// exploded parts rise ~0.65 and spread ~0.85 sideways: aim higher and pull back during the breakdown
const TARGET_EXPLODED = new THREE.Vector3(0.05, 0.62, 0);
const SIDE = new THREE.Vector3(0, 0.55, 6.2);
const QUARTER = new THREE.Vector3(3.6, 1.6, 4.6);
const fitScale = (aspect: number) => Math.max(1, (2.4 / 1.3 / aspect) * 0.9);

/** View-offset fraction that centers the bike on a page element (null when absent). */
function windowCenter(el: HTMLElement | null, h: number) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return -((r.top + r.height / 2) / h - 0.5);
}

function Rig() {
  const invalidate = useThree((s) => s.invalidate);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    store.invalidate = invalidate;
    invalidate();
    return () => void (store.invalidate = () => {});
  }, [invalidate]);

  useFrame(({ camera, size }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const { width: w, height: h } = size;
    const aspect = w / Math.max(1, h);
    const story = store.view * (1 - store.aliran); // 1 while the breakdown is on screen
    let fit: number;
    let offX = 0;
    let offY = 0;
    if (w >= 1024) {
      // DESIGN 7.4 fit + view offset; pulled back while exploded so parts stay on screen.
      // X offset -0.20w (DESIGN: -0.18w) so the 2-line H1 clears the seat hump at 1440.
      fit = fitScale(aspect) * (1 + 0.42 * story);
      offX = THREE.MathUtils.lerp(-0.2, -0.13, story) * w;
      offY = -0.03 * h;
    } else {
      // Width-limited on phones: frame the assembled bike tight, the exploded one wide.
      fit = THREE.MathUtils.lerp(Math.max(1, 0.95 / aspect), Math.max(1, 1.5 / aspect), story);
      const hero = windowCenter(store.heroEl, h) ?? -0.2;
      const aliran = windowCenter(store.aliranEl, h) ?? -0.04;
      offY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(hero, 0.16, store.view), aliran, store.aliran) * h;
    }
    target.lerpVectors(TARGET, TARGET_EXPLODED, story);
    tmp.lerpVectors(SIDE, QUARTER, store.view).sub(TARGET).multiplyScalar(fit).add(target);
    cam.position.copy(tmp);
    cam.lookAt(target);
    cam.setViewOffset(w, h, offX, offY, w, h);
  });
  return null;
}

/** M2: ground line and wheelbase dimension draw in left to right; the dimension fades as the story starts. */
function HeroDimension() {
  const tokens = useThemeTokens();
  const ground = useRef<THREE.Group>(null!);
  const dimLine = useRef<THREE.Group>(null!);
  const dim = useRef<THREE.Group>(null!);
  const arrowR = useRef<THREE.Mesh>(null!);
  const label = useRef<HTMLDivElement>(null);
  const arrow = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.06, 0.018);
    s.lineTo(0.06, -0.018);
    s.closePath();
    return s;
  }, []);

  useFrame(() => {
    const d = Math.max(0.0001, store.draw);
    ground.current.scale.x = d;
    dimLine.current.scale.x = d;
    arrowR.current.visible = store.draw > 0.98;
    dim.current.visible = store.dim > 0.02;
    dim.current.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.opacity = store.dim;
    });
    if (label.current) label.current.style.opacity = String(store.dim * Math.min(1, store.draw * 2));
  });

  return (
    <>
      <group ref={ground} position={[-1.4, 0, 0]}>
        <Line points={[[0, 0, 0], [2.8, 0, 0]]} color={tokens.ink} lineWidth={2} raycast={() => null} />
      </group>
      <group ref={dim}>
        <Line points={[[-0.7, -0.03, 0], [-0.7, -0.19, 0]]} color={tokens.ink} lineWidth={1} transparent raycast={() => null} />
        <Line points={[[0.7, -0.03, 0], [0.7, -0.19, 0]]} color={tokens.ink} lineWidth={1} transparent raycast={() => null} />
        <group ref={dimLine} position={[-0.7, -0.14, 0]}>
          <Line points={[[0, 0, 0], [1.4, 0, 0]]} color={tokens.ink} lineWidth={1} transparent raycast={() => null} />
        </group>
        <mesh position={[-0.7, -0.14, 0]}>
          <shapeGeometry args={[arrow]} />
          <meshBasicMaterial color={tokens.ink} side={THREE.DoubleSide} transparent />
        </mesh>
        <mesh ref={arrowR} position={[0.7, -0.14, 0]} rotation={[0, 0, Math.PI]}>
          <shapeGeometry args={[arrow]} />
          <meshBasicMaterial color={tokens.ink} side={THREE.DoubleSide} transparent />
        </mesh>
        <Html position={[0, -0.14, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <div ref={label} aria-hidden="true" className="t-label translate-y-3 bg-paper px-1.5 whitespace-nowrap text-ink" style={{ opacity: 0 }}>
            Jarak sumbu roda
          </div>
        </Html>
      </group>
    </>
  );
}
