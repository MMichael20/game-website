// src/world/catalog/driveway.ts
//
// A flat residential concrete driveway running ALONG +z: a thin paved slab with
// two slightly darker tyre-track strips and a lighter edging border on each side.
// Visual only — NO collider, NO obstacle (a driveway is drivable AND walkable;
// the `ground` object owns the floor). The slab top sits at y ≈ 0.04 (like
// pavement) so it reads just above the grass ground (y=0) without z-fighting.
//
// All child dimensions are derived from `length` (z-extent) and `width` (x-extent)
// via ratios — no hand-typed offsets.

import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { PALETTE } from "../palette";

interface DrivewayParams {
  length: number;        // z-extent (runs along +z)
  width?: number;        // x-extent
  color?: number;        // main concrete color
}

const SLAB_T = 0.04;       // slab thickness; top lands at y = SLAB_T (~0.04)

defineObject("driveway", {
  params: { length: 8, width: 3, color: PALETTE.curb } as DrivewayParams,
  build(p: DrivewayParams) {
    const length = p.length;
    const width = p.width ?? 3;
    const color = p.color ?? PALETTE.curb;

    const parts: ReturnType<typeof tintedBox>[] = [];

    // Main concrete slab: width (x) × thin (y) × length (z). Centered so its
    // top sits at y = SLAB_T.
    const slabY = SLAB_T / 2;
    parts.push(tintedBox(width, SLAB_T, length, 0, slabY, 0, color));

    // Two darker tyre-track strips running along z. Width and offset derived
    // from the slab width. Sit a hair above the slab top to avoid z-fighting.
    const trackW = width * 0.22;
    const trackX = width * 0.26;
    const trackY = SLAB_T + SLAB_T / 4;        // thin decal proud of slab top
    const trackColor = shade(color, 0.82);     // darker
    for (const sx of [1, -1]) {
      parts.push(tintedBox(trackW, SLAB_T / 2, length * 0.98, sx * trackX, trackY, 0, trackColor));
    }

    // Lighter edging border strip on each ±x side, running full length.
    const edgeW = width * 0.08;
    const edgeX = width / 2 - edgeW / 2;
    const edgeColor = shade(color, 1.12);      // lighter
    for (const sx of [1, -1]) {
      parts.push(tintedBox(edgeW, SLAB_T / 2, length, sx * edgeX, trackY, 0, edgeColor));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return { mesh };
  },
});

// Multiply an RGB hex color's channels by `f` (clamped to [0,1] per channel).
// Deterministic — no randomness.
function shade(hex: number, f: number): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}
