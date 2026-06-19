// rishon3d/src/world/objects/pottedPlant.ts
//
// A reusable, configurable potted plant for the object library. Multi-part and
// detailed: a tapered terracotta pot (wider at the rim than the base) with a rim
// lip, a soil disc, a bushy two-tone foliage mass built from overlapping
// low-poly blobs, and optionally a few small flower heads dotted in the leaves.
// Baked to vertex colors and merged into ONE BufferGeometry.
//
// Convention: pot base sits at y=0, grows +y, centered on x=z=0. Default total
// height is ~0.8 world units.

import * as THREE from "three";
import { cone, disc, lowPolyBall, mergeTinted, tintedMesh, tintGeo, ringAngles } from "./voxel";
import { POT_TERRACOTTA, POT_SOIL, LEAF, PETAL, PETAL_CENTER } from "./objectPalette";

// mergeGeometries() requires every part to be either all-indexed or all
// non-indexed. The voxel helpers mix indexed boxes/cones/cylinders with
// non-indexed icosahedra, so we normalize every part to non-indexed first.
function flat(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.index) return geo;
  const out = geo.toNonIndexed();
  geo.dispose();
  return out;
}

export interface PottedPlantConfig {
  /** Terracotta pot color (default POT_TERRACOTTA). */
  potColor?: number;
  /** Soil color on top of the pot (default POT_SOIL). */
  soilColor?: number;
  /** Base/deep foliage color (default LEAF). A lighter highlight is derived. */
  foliageColor?: number;
  /** Whether to dot small flower heads in the foliage (default true). */
  bloom?: boolean;
  /** Flower-head color when blooming (default PETAL[2], pink). */
  flowerColor?: number;
  /** Total height in world units, base to foliage crown (default 0.8). */
  height?: number;
}

const DEFAULTS: Required<PottedPlantConfig> = {
  potColor: POT_TERRACOTTA,
  soilColor: POT_SOIL,
  foliageColor: LEAF,
  bloom: true,
  flowerColor: PETAL[2],
  height: 0.8,
};

/** Lighten a hex color toward white by `amt` (0..1). Deterministic. */
function lighten(hex: number, amt: number): number {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color(0xffffff), amt);
  return c.getHex();
}

/**
 * Build a merged, vertex-colored potted plant geometry standing on y=0.
 *
 * Parts:
 *  - tapered pot (cone frustum, rim wider than base) + rim lip disc,
 *  - soil disc just below the rim,
 *  - a bushy foliage crown of several overlapping low-poly balls in two greens,
 *  - if `bloom`, a few small petal-ring flower heads dotted into the crown.
 */
export function makePottedPlant(cfg: PottedPlantConfig = {}): THREE.BufferGeometry {
  const c = { ...DEFAULTS, ...cfg };
  const parts: THREE.BufferGeometry[] = [];

  // --- Pot: a frustum wider at the top than the bottom. ---
  const potH = c.height * 0.42;
  const rBottom = c.height * 0.2;
  const rTop = c.height * 0.28;
  // cone(rBottom, rTop, ...): rTop is the +y face, so rTop > rBottom = wider rim.
  parts.push(flat(cone(rBottom, rTop, potH, 0, potH / 2, 0, c.potColor, 12)));

  // Rim lip: a short disc flaring slightly past the pot mouth.
  const rimY = potH;
  parts.push(flat(disc(rTop * 1.08, c.height * 0.05, 0, rimY, 0, lighten(c.potColor, 0.08), 12)));

  // Soil: a disc filling the mouth, just under the rim top.
  parts.push(flat(disc(rTop * 0.92, c.height * 0.04, 0, rimY - c.height * 0.02, 0, c.soilColor, 12)));

  // --- Foliage crown: overlapping low-poly balls, deep + light green. ---
  const crownBase = rimY + c.height * 0.04;
  const crownSpan = c.height - crownBase;       // vertical room left for leaves
  const light = lighten(c.foliageColor, 0.22);
  const dark = lighten(c.foliageColor, -0.12); // deepen the base green for contrast

  // A central mass plus a ring of side blobs gives a rounded, bushy silhouette.
  const blobR = rTop * 0.78;
  // Central tall blob (deep green core).
  parts.push(flat(lowPolyBall(blobR * 1.05, 0, crownBase + crownSpan * 0.55, 0, dark, 0)));
  // Lower ring of side blobs hugging the rim (deep green).
  for (const a of ringAngles(5)) {
    const rr = rTop * 0.62;
    parts.push(flat(lowPolyBall(blobR * 0.78, Math.cos(a) * rr, crownBase + crownSpan * 0.3, Math.sin(a) * rr, dark, 0)));
  }
  // Upper ring of highlight blobs (light green) for depth on top.
  for (const a of ringAngles(4, Math.PI / 4)) {
    const rr = rTop * 0.4;
    parts.push(flat(lowPolyBall(blobR * 0.7, Math.cos(a) * rr, crownBase + crownSpan * 0.75, Math.sin(a) * rr, light, 0)));
  }
  // Top crown highlight blob.
  parts.push(flat(lowPolyBall(blobR * 0.72, 0, crownBase + crownSpan * 0.95, 0, light, 0)));

  // --- Blooms: small petal-ring flower heads dotted into the crown. ---
  if (c.bloom) {
    const headR = rTop * 0.26;
    const spots: Array<{ x: number; y: number; z: number }> = [
      { x: rTop * 0.45, y: crownBase + crownSpan * 0.7, z: rTop * 0.2 },
      { x: -rTop * 0.4, y: crownBase + crownSpan * 0.55, z: -rTop * 0.35 },
      { x: rTop * 0.05, y: crownBase + crownSpan * 0.92, z: -rTop * 0.45 },
    ];
    for (const s of spots) {
      // Center pip.
      parts.push(flat(lowPolyBall(headR * 0.4, s.x, s.y, s.z, PETAL_CENTER, 0)));
      // Ring of 5 tiny petals fanned around the pip.
      for (const a of ringAngles(5)) {
        const pr = headR * 0.6;
        const petal = new THREE.BoxGeometry(headR * 0.7, 0.015, headR * 0.5);
        petal.rotateY(-a);
        petal.translate(s.x + Math.cos(a) * pr, s.y, s.z + Math.sin(a) * pr);
        parts.push(flat(tintGeo(petal, c.flowerColor)));
      }
    }
  }

  return mergeTinted(parts);
}

/** Mesh wrapper for makePottedPlant, using the shared voxel material. */
export function makePottedPlantMesh(cfg: PottedPlantConfig = {}): THREE.Mesh {
  return tintedMesh(makePottedPlant(cfg));
}
