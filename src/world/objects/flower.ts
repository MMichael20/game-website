// rishon3d/src/world/objects/flower.ts
//
// A reusable, configurable single flower for the object library. Voxel/blocky
// look but genuinely multi-part: a thin stem, one or two angled leaves, and a
// flower head made of a ring of petals fanned around a domed center. Everything
// is baked to vertex colors and merged into ONE BufferGeometry so a flower is a
// single draw call and is instanceable.
//
// Convention: base sits at y=0, grows +y, centered on x=z=0. Sizes in world
// units (~1 unit = 1 meter), so a default flower is 0.5m tall.

import * as THREE from "three";
import { cylinderY, mergeTinted, tintedMesh, tintGeo, ringAngles } from "./voxel";
import { PETAL, PETAL_CENTER, STEM, LEAF } from "./objectPalette";

// mergeGeometries() requires every part to be either all-indexed or all
// non-indexed. The voxel helpers mix indexed boxes/cylinders with non-indexed
// icosahedra, so we normalize every part to non-indexed before merging.
function flat(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.index) return geo;
  const out = geo.toNonIndexed();
  geo.dispose();
  return out;
}

export interface FlowerConfig {
  /** Color of the petals (defaults to PETAL[0], a warm red). */
  petalColor?: number;
  /** Color of the domed flower center (defaults to PETAL_CENTER, golden). */
  centerColor?: number;
  /** Color of the stem (defaults to STEM, a mid green). */
  stemColor?: number;
  /** Color of the leaves (defaults to LEAF, a lighter green). */
  leafColor?: number;
  /** Total flower height in world units, base to top of head (default 0.5). */
  height?: number;
  /** Number of petals fanned around the center (default 5). */
  petalCount?: number;
}

const DEFAULTS: Required<FlowerConfig> = {
  petalColor: PETAL[0],
  centerColor: PETAL_CENTER,
  stemColor: STEM,
  leafColor: LEAF,
  height: 0.5,
  petalCount: 5,
};

/**
 * Build a merged, vertex-colored flower geometry standing on y=0.
 *
 * Parts:
 *  - a thin stem (slim cylinder up the center),
 *  - two small leaves angled outward partway up the stem,
 *  - a flower head: a ring of `petalCount` flattened petals fanned around a
 *    domed low-poly center, set at the top of the stem.
 */
export function makeFlower(cfg: FlowerConfig = {}): THREE.BufferGeometry {
  const c = { ...DEFAULTS, ...cfg };
  const parts: THREE.BufferGeometry[] = [];

  const stemR = 0.025;            // ~0.05 wide stem
  const headR = Math.min(0.13, c.height * 0.3); // petal-ring radius scales gently with size
  const stemTop = c.height - headR * 0.6;       // stem ends just inside the head
  const stemH = Math.max(0.05, stemTop);

  // Stem: a slim vertical cylinder centered on the column.
  parts.push(flat(cylinderY(stemR, stemH, 0, stemH / 2, 0, c.stemColor, 6)));

  // Leaves: two small boxes, rotated outward and pushed off the stem, at
  // different heights/sides so the silhouette reads as a real plant.
  const leafW = headR * 0.9;
  const leafSpecs: Array<{ y: number; ang: number; rotZ: number }> = [
    { y: stemH * 0.45, ang: 0.0, rotZ: 0.9 },
    { y: stemH * 0.68, ang: Math.PI, rotZ: 0.9 },
  ];
  for (const s of leafSpecs) {
    const leaf = new THREE.BoxGeometry(leafW, 0.012, leafW * 0.5);
    leaf.rotateZ(s.rotZ);                       // tilt blade up-and-out
    leaf.rotateY(s.ang);                         // pick a side
    const off = leafW * 0.45;
    leaf.translate(Math.cos(s.ang) * off, s.y, Math.sin(s.ang) * off);
    parts.push(flat(tintGeo(leaf, c.leafColor)));
  }

  // Flower head sits at the very top.
  const headY = c.height - headR * 0.5;

  // Center: a domed low-poly ball, slightly flattened, capping the stem.
  const center = new THREE.IcosahedronGeometry(headR * 0.5, 0);
  center.scale(1, 0.6, 1);
  center.translate(0, headY, 0);
  parts.push(flat(tintGeo(center, c.centerColor)));

  // Petals: flattened boxes fanned out around the center on the ring angles.
  const petalLen = headR;
  const petalW = headR * 0.7;
  const petalR = headR * 0.62;     // how far each petal's middle sits from center
  for (const a of ringAngles(c.petalCount)) {
    const petal = new THREE.BoxGeometry(petalLen, 0.02, petalW);
    petal.rotateY(-a);                          // long axis points outward
    petal.translate(Math.cos(a) * petalR, headY - headR * 0.06, Math.sin(a) * petalR);
    parts.push(flat(tintGeo(petal, c.petalColor)));
  }

  return mergeTinted(parts);
}

/** Mesh wrapper for makeFlower, using the shared voxel material. */
export function makeFlowerMesh(cfg: FlowerConfig = {}): THREE.Mesh {
  return tintedMesh(makeFlower(cfg));
}

/**
 * Ready-made flower configs in distinct petal colors, for instanced variety in
 * a bed or a window box. Order: red, yellow, pink, white, purple.
 */
export const FLOWER_PRESETS: FlowerConfig[] = [
  { petalColor: PETAL[0], centerColor: PETAL_CENTER },                 // red
  { petalColor: PETAL[1], centerColor: 0xb5772a },                     // yellow
  { petalColor: PETAL[2], centerColor: PETAL_CENTER },                 // pink
  { petalColor: PETAL[3], centerColor: PETAL_CENTER, petalCount: 6 },  // white
  { petalColor: PETAL[4], centerColor: PETAL_CENTER },                 // purple
];
