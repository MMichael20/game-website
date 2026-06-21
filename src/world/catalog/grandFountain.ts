// src/world/catalog/grandFountain.ts
//
// A landmark plaza fountain — a wedding-cake centerpiece, not a birdbath. A wide
// stepped pool you could sit on, a colorful mosaic tile band, ornamental finials
// around the coping, two stacked stone bowls on a central pedestal, a tall central
// water jet plus arcing rim jets, and lion-spout streams into the pool. Everything
// is derived from the pool radius `r`. LOCAL space: base y=0, centered x=z=0.
// Deterministic (mulberry32 for cosmetic tile/finial variation only).

import * as THREE from "three";
import { tintedBox, cylinderY, disc, cone, lowPolyBall, ringAngles, mergeTinted, tintedMesh } from "../objects/voxel";
import { defineObject } from "../system/registry";
import { WATER } from "../objects/objectPalette";
import { mulberry32 } from "../rng";

interface GrandFountainParams { r: number; seed: number }

const STONE = 0xcab697;       // warm sandstone
const STONE_DARK = 0xa6917a;  // shaded stone
const COPING = 0xddcdb0;      // light coping / rim cap
const WATER_LIGHT = 0x9fdcec; // bright spray / shallow water
const GOLD = 0xf2c14e;        // gilded finial
const TILE = [0x2f7fb0, 0x36a9a0, 0xd9533b, 0xf2c14e, 0xf3efe6, 0x7a4ea0]; // mosaic band

defineObject("grandFountain", {
  params: { r: 5, seed: 1 } as GrandFountainParams,
  build(p: GrandFountainParams) {
    const r = p.r;
    const rng = mulberry32(p.seed >>> 0);
    const parts: THREE.BufferGeometry[] = [];

    // ── Base steps (three stacked rings you can walk/sit up) ────────────────
    parts.push(cylinderY(r + 1.6, 0.22, 0, 0.11, 0, STONE_DARK, 32));
    parts.push(cylinderY(r + 1.0, 0.22, 0, 0.33, 0, STONE, 32));
    parts.push(cylinderY(r + 0.5, 0.22, 0, 0.55, 0, STONE_DARK, 32));

    const baseTop = 0.66;
    const wallH = 0.9;
    const wallTopY = baseTop + wallH;

    // ── Pool basin wall + coping rim ────────────────────────────────────────
    parts.push(cylinderY(r, wallH, 0, baseTop + wallH / 2, 0, STONE, 36));
    parts.push(cylinderY(r + 0.12, 0.18, 0, wallTopY + 0.02, 0, COPING, 36));   // proud coping
    parts.push(cylinderY(r - 0.45, wallH, 0, baseTop + wallH / 2, 0, STONE_DARK, 36)); // inner wall (darker)

    // ── Pool water (big surface + a brighter inner pool) ────────────────────
    const waterY = baseTop + 0.62;
    parts.push(disc(r - 0.5, 0.12, 0, waterY, 0, WATER, 36));
    parts.push(disc(r - 1.6, 0.13, 0, waterY + 0.01, 0, WATER_LIGHT, 32));

    // ── Mosaic tile band around the outside of the wall ─────────────────────
    for (const a of ringAngles(40)) {
      const tx = Math.cos(a) * (r + 0.02);
      const tz = Math.sin(a) * (r + 0.02);
      const col = TILE[Math.floor(rng() * TILE.length)];
      parts.push(tintedBox(0.34, 0.34, 0.34, tx, baseTop + 0.5, tz, col));
    }

    // ── Ornamental finials around the coping ────────────────────────────────
    for (const a of ringAngles(8)) {
      const fx = Math.cos(a) * (r - 0.05);
      const fz = Math.sin(a) * (r - 0.05);
      parts.push(tintedBox(0.34, 0.5, 0.34, fx, wallTopY + 0.25, fz, COPING));
      parts.push(lowPolyBall(0.2, fx, wallTopY + 0.62, fz, GOLD, 0));
    }

    // ── Lion-spout boxes on the inner wall + water streams into the pool ─────
    for (const a of ringAngles(6, Math.PI / 6)) {
      const sx = Math.cos(a) * (r - 0.5);
      const sz = Math.sin(a) * (r - 0.5);
      parts.push(tintedBox(0.4, 0.4, 0.4, sx, wallTopY - 0.2, sz, STONE_DARK));
      parts.push(tintedBox(0.14, 0.7, 0.14, sx * 0.9, waterY + 0.4, sz * 0.9, WATER_LIGHT)); // stream
    }

    // ── Central pedestal + two stacked bowls (wedding cake) ─────────────────
    parts.push(cylinderY(0.95, 1.1, 0, baseTop + 0.55, 0, STONE, 20));          // pedestal foot
    parts.push(cone(0.5, 2.3, 0.6, 0, baseTop + 1.4, 0, STONE, 24));            // lower bowl underside
    const lowBowlY = baseTop + 1.85;
    parts.push(disc(2.3, 0.26, 0, lowBowlY, 0, STONE, 28));                     // lower bowl
    parts.push(disc(2.0, 0.1, 0, lowBowlY + 0.12, 0, WATER, 28));               // lower bowl water
    parts.push(cylinderY(0.45, 1.0, 0, lowBowlY + 0.6, 0, STONE, 16));          // mid column
    parts.push(cone(0.3, 1.35, 0.45, 0, lowBowlY + 1.15, 0, STONE, 20));        // upper bowl underside
    const upBowlY = lowBowlY + 1.5;
    parts.push(disc(1.35, 0.22, 0, upBowlY, 0, STONE, 24));                     // upper bowl
    parts.push(disc(1.1, 0.08, 0, upBowlY + 0.1, 0, WATER, 24));                // upper bowl water

    // falling-water curtains from each bowl edge down toward the pool
    for (const a of ringAngles(8)) {
      parts.push(tintedBox(0.12, 0.7, 0.12, Math.cos(a) * 2.0, lowBowlY - 0.3, Math.sin(a) * 2.0, WATER_LIGHT));
    }
    for (const a of ringAngles(6, 0.3)) {
      parts.push(tintedBox(0.1, 0.6, 0.1, Math.cos(a) * 1.15, upBowlY - 0.25, Math.sin(a) * 1.15, WATER_LIGHT));
    }

    // ── Finial spire + gilded top + a tall central jet ──────────────────────
    const spireBase = upBowlY + 0.2;
    parts.push(cylinderY(0.16, 0.8, 0, spireBase + 0.4, 0, STONE, 12));
    parts.push(lowPolyBall(0.34, 0, spireBase + 1.0, 0, GOLD, 0));
    parts.push(cone(0.16, 0.0, 0.5, 0, spireBase + 1.45, 0, GOLD, 10));
    // central jet shooting up from the top
    parts.push(cone(0.18, 0.03, 1.7, 0, spireBase + 2.4, 0, WATER_LIGHT, 10));
    // a ring of arcing jets springing from the upper bowl
    for (const a of ringAngles(6)) {
      parts.push(cone(0.1, 0.02, 1.0, Math.cos(a) * 0.9, upBowlY + 0.6, Math.sin(a) * 0.9, WATER_LIGHT, 8));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return {
      mesh,
      colliders: [{ x: 0, y: wallTopY / 2, z: 0, hx: r, hy: wallTopY / 2, hz: r }],
      obstacles: [{ x: 0, z: 0, w: (r + 1.6) * 2, d: (r + 1.6) * 2 }],
    };
  },
});
