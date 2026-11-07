// Painted-mode PBR materials (report "materials: physical layers only where a surface needs them").
// High tier: MeshPhysicalMaterial clearcoat paint, anisotropic brushed alloy, leather sheen.
// Low tier: MeshStandardMaterial only. Textures are generated on a canvas: no file, no CDN.
import * as THREE from "three";
import type { Finish } from "@/lib/catalog";
import type { Slot } from "./kit";
import type { Tier } from "../stage-store";

export const PAINT_SLOTS = ["tank", "frame", "accent"] as const;
export type PaintSlot = (typeof PAINT_SLOTS)[number];
export const isPaint = (s: Slot): s is PaintSlot => s === "tank" || s === "frame" || s === "accent";

type Fixed = { color: string; metalness: number; roughness: number; emissive?: string; ei?: number; opacity?: number; aniso?: number; sheen?: number; cc?: number };

// [EST] starting values from the report's material table
const FIXED: Record<Exclude<Slot, PaintSlot>, Fixed> = {
  chrome: { color: "#e3e6e8", metalness: 1, roughness: 0.1 },
  alloy: { color: "#b9bdc1", metalness: 1, roughness: 0.34, aniso: 0.75 },
  engine: { color: "#6b6f73", metalness: 0.75, roughness: 0.42 },
  black: { color: "#1e2022", metalness: 0.35, roughness: 0.48, cc: 0.4 },
  rubber: { color: "#151515", metalness: 0, roughness: 0.9 },
  leather: { color: "#3b2b20", metalness: 0, roughness: 0.62, sheen: 0.35 },
  lens: { color: "#dde6ea", metalness: 0, roughness: 0.02, opacity: 0.38 },
  lamp: { color: "#fff6e3", metalness: 0, roughness: 0.3, emissive: "#fff3d6", ei: 1.4 },
  red: { color: "#9e140e", metalness: 0, roughness: 0.18, emissive: "#6e0b06", ei: 0.7 },
  amber: { color: "#d48a1c", metalness: 0, roughness: 0.2, emissive: "#6b3c05", ei: 0.4 },
  plate: { color: "#e6e2d6", metalness: 0, roughness: 0.55 },
};

export const FINISH: Record<Finish, { roughness: number; metalness: number; clearcoat: number; clearcoatRoughness: number }> = {
  gloss: { roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 },
  matte: { roughness: 0.85, metalness: 0, clearcoat: 0, clearcoatRoughness: 0 },
  metal: { roughness: 0.35, metalness: 0.65, clearcoat: 0.6, clearcoatRoughness: 0.1 },
  candy: { roughness: 0.38, metalness: 0.9, clearcoat: 1, clearcoatRoughness: 0.03 },
  flake: { roughness: 0.45, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.02 },
  satin: { roughness: 0.55, metalness: 0.1, clearcoat: 0.3, clearcoatRoughness: 0.4 },
  patina: { roughness: 0.92, metalness: 0.15, clearcoat: 0, clearcoatRoughness: 0 },
};

/* ---------------- generated textures ---------------- */

let flake: THREE.CanvasTexture | null = null;
let patina: THREE.CanvasTexture | null = null;

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/** Metalflake: tiny random normals on the base layer only (clearcoat stays smooth). */
function flakeNormal() {
  if (flake) return flake;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const img = x.createImageData(128, 128);
  const rand = rng(7);
  for (let i = 0; i < 128 * 128; i++) {
    img.data[i * 4] = 128 + (rand() - 0.5) * 200;
    img.data[i * 4 + 1] = 128 + (rand() - 0.5) * 200;
    img.data[i * 4 + 2] = 230;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  flake = new THREE.CanvasTexture(c);
  flake.wrapS = flake.wrapT = THREE.RepeatWrapping;
  flake.repeat.set(10, 10);
  flake.colorSpace = THREE.NoColorSpace;
  return flake;
}

/** Rat-bike patina: blotchy rust over the base color (multiplied, so the user's color still reads). */
function patinaMap() {
  if (patina) return patina;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, 256, 256);
  const rand = rng(11);
  for (let i = 0; i < 160; i++) {
    const r = 4 + rand() * 22;
    const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${120 + rand() * 40},${60 + rand() * 20},${30 + rand() * 15},${0.35 + rand() * 0.4})`);
    g.addColorStop(1, "rgba(150,90,50,0)");
    x.save();
    x.translate(rand() * 256, rand() * 256);
    x.fillStyle = g;
    x.fillRect(-r, -r, r * 2, r * 2);
    x.restore();
  }
  patina = new THREE.CanvasTexture(c);
  patina.wrapS = patina.wrapT = THREE.RepeatWrapping;
  patina.repeat.set(2, 2);
  patina.colorSpace = THREE.SRGBColorSpace;
  return patina;
}

/* ---------------- factory ---------------- */

const side = THREE.DoubleSide; // open shells (fenders, heat shields, cones) show their inner face too

export function makePainted(slot: Slot, tier: Tier): THREE.MeshStandardMaterial {
  const high = tier === "high";
  if (isPaint(slot)) {
    const m = high ? new THREE.MeshPhysicalMaterial({ side }) : new THREE.MeshStandardMaterial({ side });
    return m;
  }
  const f = FIXED[slot];
  const params: THREE.MeshStandardMaterialParameters = {
    side,
    color: f.color,
    metalness: f.metalness,
    roughness: f.roughness,
    ...(f.emissive ? { emissive: f.emissive, emissiveIntensity: f.ei } : {}),
    ...(f.opacity ? { transparent: true, opacity: f.opacity, depthWrite: false } : {}),
  };
  if (!high) return new THREE.MeshStandardMaterial(params);
  const m = new THREE.MeshPhysicalMaterial(params);
  if (f.aniso) {
    m.anisotropy = f.aniso;
    m.anisotropyRotation = Math.PI / 2;
  }
  if (f.sheen) {
    m.sheen = f.sheen;
    m.sheenRoughness = 0.6;
    m.sheenColor.set("#7a5b44");
  }
  if (f.cc) {
    m.clearcoat = f.cc;
    m.clearcoatRoughness = 0.3;
  }
  return m;
}

/** Applies color + finish to a paint material (called per frame; cheap property writes). */
export function applyPaint(m: THREE.MeshStandardMaterial, color: THREE.Color, finish: Finish, tier: Tier) {
  const f = FINISH[finish];
  m.color.copy(color);
  m.roughness = f.roughness;
  m.metalness = f.metalness;
  if ((m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
    const p = m as THREE.MeshPhysicalMaterial;
    p.clearcoat = f.clearcoat;
    p.clearcoatRoughness = f.clearcoatRoughness;
  } else if (finish === "gloss" || finish === "candy") m.roughness = Math.max(0.18, f.roughness - 0.1); // no clearcoat on low: fake the shine
  const wantFlake = finish === "flake" && tier === "high" ? flakeNormal() : null;
  const wantPatina = finish === "patina" ? patinaMap() : null;
  if (m.normalMap !== wantFlake || m.map !== wantPatina) {
    m.normalMap = wantFlake;
    m.normalScale.set(0.35, 0.35);
    m.map = wantPatina;
    m.needsUpdate = true;
  }
}
