"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import type { V3 } from "./bike/core";

const v = new THREE.Vector3();

/**
 * DOM label pinned to a 3D point. Replaces drei <Html>, whose cleanup calls root.unmount()
 * synchronously and makes React 19 log "Attempted to synchronously unmount a root while React was
 * already rendering" whenever a label unmounts. Here the unmount is deferred to a microtask.
 * Children render in a separate React root (same as drei), so they don't see R3F context.
 */
export function ScreenLabel({ position, center = false, children }: { position: V3; center?: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const box = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);

  useLayoutEffect(() => {
    const parent = gl.domElement.parentNode;
    if (!parent) return;
    const el = (box.current = document.createElement("div"));
    el.style.cssText = "position:absolute;top:0;left:0;z-index:5;pointer-events:none;will-change:transform;";
    parent.appendChild(el);
    const r = (root.current = createRoot(el));
    return () => {
      root.current = null;
      box.current = null;
      queueMicrotask(() => {
        r.unmount();
        el.remove();
      });
    };
  }, [gl]);

  useLayoutEffect(() => {
    root.current?.render(<div style={{ position: "absolute", transform: center ? "translate(-50%,-50%)" : undefined }}>{children}</div>);
  });

  useFrame(({ camera, size }) => {
    const g = group.current;
    const el = box.current;
    if (!g || !el) return;
    g.getWorldPosition(v).project(camera);
    // z > 1 means the point is behind the camera
    el.style.display = v.z > 1 ? "none" : "";
    el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px,${((1 - v.y) / 2) * size.height}px,0)`;
  });

  return <group ref={group} position={position} />;
}
