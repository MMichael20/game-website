// rishon3d/src/world/objects/donut.ts
//
// A donut for the bakery object library. A ring lying flat with a hole, built
// from a dozen small dough segments placed tangentially around a circle, an
// optional glaze ring of slightly larger, thinner segments sitting on top with a
// drippy edge, and scattered sprinkle boxes on the glaze.
//
// Convention: lies flat on a surface, base at y=0, grows +y, centered on x=z=0.
// ~0.35 outer diameter, ~0.12 thick.

import * as THREE from "three";
import {
  tintGeo,
  lowPolyBall,
  mergeTinted,
  tintedMesh,
  ringAngles,
} from "./voxel";
import { DOUGH, GLAZE, SPRINKLES } from "./objectPalette";

// BoxGeometry is indexed, but the balls (icosahedrons) are non-indexed;
// mergeGeometries needs all-or-none indexed. Normalise box parts to non-indexed.
function tintedBoxGeo(b: THREE.BoxGeometry, hex: number): THREE.BufferGeometry {
  const g = b.index ? b.toNonIndexed() : b;
  return tintGeo(g, hex);
}

export interface DonutConfig {
  doughColor?: number;
  glazeColor?: number;
  /** Colors for the scattered sprinkles. Default the full SPRINKLES set. */
  sprinkleColors?: readonly number[];
  /** Whether to add the glaze ring + sprinkles. Default true. */
  glazed?: boolean;
}

const RING_RADIUS = 0.115; // center radius of the torus tube circle
const TUBE_THICK = 0.055; // half-thickness of the dough tube
const SEGMENTS = 12;

export function makeDonut(cfg: DonutConfig = {}): THREE.BufferGeometry {
  const dough = cfg.doughColor ?? DOUGH;
  const glazeColor = cfg.glazeColor ?? GLAZE.pink;
  const sprinkleColors = cfg.sprinkleColors ?? SPRINKLES;
  const glazed = cfg.glazed ?? true;

  const parts: THREE.BufferGeometry[] = [];

  // --- Dough ring: tangent rounded segments around the circle ---
  // Each segment is a short box (chunky, voxel) capped with two balls at its ends
  // so the ring reads rounded where segments meet.
  const segChord = (2 * Math.PI * RING_RADIUS) / SEGMENTS * 1.35;
  for (const a of ringAngles(SEGMENTS)) {
    const x = Math.cos(a) * RING_RADIUS;
    const z = Math.sin(a) * RING_RADIUS;
    const b = new THREE.BoxGeometry(segChord, TUBE_THICK * 2, TUBE_THICK * 2);
    b.rotateY(-a + Math.PI / 2); // long axis tangent to the ring
    b.translate(x, TUBE_THICK, z);
    parts.push(tintedBoxGeo(b, dough));
    // rounded ball at each segment center keeps the tube reading round
    parts.push(lowPolyBall(TUBE_THICK, x, TUBE_THICK, z, dough, 0));
  }

  // --- Glaze: a slightly larger-radius, thinner ring of segments sitting on top,
  // with a drippy edge from small balls hanging outward ---
  if (glazed) {
    const glazeY = TUBE_THICK * 1.55; // sits on the upper half of the dough
    const glazeR = RING_RADIUS;
    const glazeChord = (2 * Math.PI * glazeR) / SEGMENTS * 1.4;
    for (const a of ringAngles(SEGMENTS, 0.15)) {
      const x = Math.cos(a) * glazeR;
      const z = Math.sin(a) * glazeR;
      const b = new THREE.BoxGeometry(glazeChord, TUBE_THICK * 0.7, TUBE_THICK * 2.15);
      b.rotateY(-a + Math.PI / 2);
      b.translate(x, glazeY, z);
      parts.push(tintedBoxGeo(b, glazeColor));
    }
    // drippy edge: small glaze balls hanging down the outer rim, every other seg
    for (const a of ringAngles(SEGMENTS, 0.0)) {
      if (Math.round(a / (Math.PI * 2) * SEGMENTS) % 2 !== 0) continue;
      const dripR = RING_RADIUS + TUBE_THICK * 0.7;
      const x = Math.cos(a) * dripR;
      const z = Math.sin(a) * dripR;
      parts.push(lowPolyBall(TUBE_THICK * 0.45, x, glazeY - 0.012, z, glazeColor, 0));
    }

    // --- Sprinkles: tiny boxes scattered over the glaze ---
    const sprinkleCount = 16;
    let si = 0;
    for (const a of ringAngles(sprinkleCount, 0.27)) {
      // alternate slightly inner/outer so they don't form one perfect circle
      const jitter = (si % 3) * 0.012 - 0.012;
      const r = RING_RADIUS + jitter;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const col = sprinkleColors[si % sprinkleColors.length];
      const b = new THREE.BoxGeometry(0.011, 0.008, 0.028);
      b.rotateY(-a + si * 0.7);
      b.translate(x, glazeY + TUBE_THICK * 0.4, z);
      parts.push(tintedBoxGeo(b, col));
      si++;
    }
  }

  return mergeTinted(parts);
}

export function makeDonutMesh(cfg: DonutConfig = {}): THREE.Mesh {
  return tintedMesh(makeDonut(cfg));
}
