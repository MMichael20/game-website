// rishon3d/src/world/objects/cupcake.ts
//
// A cupcake for the bakery object library. Multi-part: a fluted paper wrapper
// (tapered, narrower at the base, with vertical rib ridges), a piped swirl of
// frosting built from stacked shrinking blobs, and sprinkle dots / an optional
// cherry on top.
//
// Convention: base at y=0, grows +y, centered on x=z=0. ~0.25 wide, ~0.35 tall.

import * as THREE from "three";
import {
  tintGeo,
  tintedBox,
  lowPolyBall,
  cone,
  cylinderY,
  mergeTinted,
  tintedMesh,
  ringAngles,
} from "./voxel";
import { FROSTING, CHERRY, CHERRY_STEM, SPRINKLES } from "./objectPalette";

// tintedBox / BoxGeometry are indexed, but cylinders/cones/balls are non-indexed;
// mergeGeometries needs all-or-none indexed. Normalise box parts to non-indexed.
function box(
  w: number, h: number, d: number, x: number, y: number, z: number, hex: number,
): THREE.BufferGeometry {
  const g = tintedBox(w, h, d, x, y, z, hex);
  return g.index ? g.toNonIndexed() : g;
}

// A non-indexed, tinted box from a pre-transformed BoxGeometry.
function tintedBoxGeo(b: THREE.BoxGeometry, hex: number): THREE.BufferGeometry {
  const g = b.index ? b.toNonIndexed() : b;
  return tintGeo(g, hex);
}

export interface CupcakeConfig {
  wrapperColor?: number;
  frostingColor?: number;
  /** Cherry on top of the swirl. Default true. */
  cherry?: boolean;
  /** Colors for the scattered sprinkle dots. Default a SPRINKLES subset. */
  sprinkleColors?: readonly number[];
}

const WRAPPER_COLOR = 0xe7b7c8; // pastel pink paper

export function makeCupcake(cfg: CupcakeConfig = {}): THREE.BufferGeometry {
  const wrapper = cfg.wrapperColor ?? WRAPPER_COLOR;
  const frosting = cfg.frostingColor ?? FROSTING.pink;
  const cherry = cfg.cherry ?? true;
  const sprinkleColors = cfg.sprinkleColors ?? SPRINKLES;

  const parts: THREE.BufferGeometry[] = [];

  // --- Wrapper: a tapered cup (narrow at base, wider at top) ---
  const baseR = 0.08;
  const topR = 0.115;
  const wrapH = 0.16;
  // cone() takes (rBottom, rTop): a frustum wider at the top.
  parts.push(cone(baseR, topR, wrapH, 0, wrapH / 2, 0, wrapper, 16));
  // a thin top rim so the wrapper edge reads crisply
  parts.push(cone(topR, topR + 0.004, 0.012, 0, wrapH - 0.004, 0, wrapper, 16));

  // Fluting: thin vertical rib boxes around the wrapper, tilted to follow the taper.
  const ribCount = 14;
  for (const a of ringAngles(ribCount)) {
    const midR = (baseR + topR) / 2 + 0.006;
    const x = Math.cos(a) * midR;
    const z = Math.sin(a) * midR;
    const b = new THREE.BoxGeometry(0.012, wrapH, 0.018);
    b.rotateY(-a);
    b.translate(x, wrapH / 2, z);
    parts.push(tintedBoxGeo(b, shade(wrapper, 0.92)));
  }

  // --- Cake peeking just above the wrapper (a small dome) ---
  const cakeColor = 0xcf9a64;
  parts.push(cylinderY(topR - 0.006, 0.03, 0, wrapH + 0.012, 0, cakeColor, 16));

  // --- Piped frosting swirl: stacked shrinking blobs, each offset slightly so the
  // stack spirals like a piped swirl ---
  const swirlBaseY = wrapH + 0.03;
  const swirlSteps = 4;
  const swirlBaseR = topR - 0.01;
  let topY = swirlBaseY;
  for (let i = 0; i < swirlSteps; i++) {
    const f = i / (swirlSteps - 1);
    const r = swirlBaseR * (1 - f * 0.62);
    // offset center around a small circle to suggest the spiral of piping
    const a = f * Math.PI * 1.6;
    const off = swirlBaseR * 0.18 * (1 - f);
    const x = Math.cos(a) * off;
    const z = Math.sin(a) * off;
    const yy = swirlBaseY + f * 0.13;
    parts.push(lowPolyBall(r, x, yy, z, frosting, 1));
    topY = yy + r;
  }
  // a small peak tip on top of the swirl
  parts.push(cone(swirlBaseR * 0.3, 0, 0.05, 0, topY, 0, frosting, 8));
  topY += 0.05;

  // --- Sprinkles: tiny boxes scattered over the swirl ---
  const sprinkleRings = [
    { y: swirlBaseY + 0.03, r: swirlBaseR * 0.85, count: 6, phase: 0.0 },
    { y: swirlBaseY + 0.08, r: swirlBaseR * 0.5, count: 5, phase: 0.5 },
  ];
  let si = 0;
  for (const ring of sprinkleRings) {
    for (const a of ringAngles(ring.count, ring.phase)) {
      const x = Math.cos(a) * ring.r;
      const z = Math.sin(a) * ring.r;
      const col = sprinkleColors[si % sprinkleColors.length];
      si++;
      const b = new THREE.BoxGeometry(0.012, 0.012, 0.03);
      b.rotateY(-a + si);
      b.translate(x, ring.y, z);
      parts.push(tintedBoxGeo(b, col));
    }
  }

  // --- Cherry on top ---
  if (cherry) {
    parts.push(lowPolyBall(0.03, 0, topY + 0.022, 0, CHERRY, 1));
    parts.push(box(0.01, 0.04, 0.01, 0, topY + 0.06, 0, CHERRY_STEM));
  }

  return mergeTinted(parts);
}

// Darken/lighten a hex for the rib shading. f<1 darkens.
function shade(hex: number, f: number): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}

export function makeCupcakeMesh(cfg: CupcakeConfig = {}): THREE.Mesh {
  return tintedMesh(makeCupcake(cfg));
}
