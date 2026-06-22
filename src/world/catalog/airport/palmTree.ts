// src/world/catalog/airport/palmTree.ts
//
// "palmTree" — a date palm for the airport landside landscaping.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z.
// ~1u = 1m. Fully deterministic — mulberry32 for organic variation.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  cylinderY, cone, lowPolyBall, mergeTinted, tintedMesh, ringAngles,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Trunk color variants for ring texture
const TRUNK_LIGHT = PALETTE.trunk;          // 0x8a5a2b
const TRUNK_DARK  = 0x6b4220;              // darker ring band
// Frond colors
const FROND_MID  = PALETTE.leaf;           // 0x5cc24a
const FROND_DEEP = PALETTE.leafDeep;       // 0x49ab3c
// Date cluster colors
const DATE_AMBER = 0xd4851a;
const DATE_BROWN = 0x8a4e1a;

interface PalmTreeParams {
  h: number;
}

defineObject("palmTree", {
  params: { h: 7 } as PalmTreeParams,
  build(p: PalmTreeParams): ObjectResult {
    const { h } = p;
    const parts: THREE.BufferGeometry[] = [];

    // ── Ringed tapering trunk ──────────────────────────────────────────────
    // 8 segments that slightly lean and taper as they climb
    const TRUNK_SEGS = 8;
    const segH = h / TRUNK_SEGS;
    // Base radius tapers from 0.22 down to 0.10 at crown
    const baseR = 0.22;
    const topR  = 0.10;
    // Cumulative lean offsets (small S-curve for organic look)
    let cumX = 0;
    let cumZ = 0;

    for (let i = 0; i < TRUNK_SEGS; i++) {
      const t = i / (TRUNK_SEGS - 1);
      const r = baseR + (topR - baseR) * t;

      // Gentle lean: slight random-ish forward/sideways drift per segment
      // Use deterministic offsets based on segment index
      const leanX = (i % 3 === 1 ? 0.04 : i % 3 === 2 ? -0.03 : 0.01);
      const leanZ = (i % 4 === 0 ? 0.02 : i % 4 === 2 ? -0.02 : 0.01);
      cumX += leanX;
      cumZ += leanZ;

      // Alternate dark/light ring shades
      const col = (i % 2 === 0) ? TRUNK_LIGHT : TRUNK_DARK;
      // Main segment cylinder
      parts.push(cylinderY(r, segH, cumX, i * segH + segH / 2, cumZ, col, 8));

      // Ring bump — a very short, slightly wider disc at the base of each segment
      if (i > 0) {
        const ringR = r + 0.025;
        const ringH = 0.06;
        parts.push(cylinderY(ringR, ringH, cumX, i * segH + ringH / 2, cumZ, TRUNK_DARK, 8));
      }
    }

    // Crown center X/Z (where trunk ends up after leaning)
    const crownX = cumX;
    const crownZ = cumZ;
    const crownY = h;

    // ── Palm crown fronds ─────────────────────────────────────────────────
    // 8 fronds arranged radially, angling outward and drooping down
    const FROND_COUNT = 8;
    const angles = ringAngles(FROND_COUNT, 0.3); // slight phase rotation for variety
    const FROND_L = h * 0.48; // frond length proportional to height
    const FROND_W = 0.18;

    for (let fi = 0; fi < FROND_COUNT; fi++) {
      const ang = angles[fi];
      const col = (fi % 2 === 0) ? FROND_MID : FROND_DEEP;

      // Horizontal reach and downward droop
      const reach  = FROND_L * 0.65;  // horizontal projection
      const droop  = FROND_L * 0.30;  // downward drop at tip
      const frondMidX = crownX + Math.sin(ang) * reach * 0.5;
      const frondMidZ = crownZ + Math.cos(ang) * reach * 0.5;
      const frondMidY = crownY + 0.5 - droop * 0.4; // mid-height of frond arc

      // Approximate frond as a tapered long box slightly angled
      // We use cone primitive for a tapered frond shape
      // rBottom at base, rTop narrow at tip
      parts.push(cone(
        FROND_W * 0.5, 0.03,   // base radius, tip radius
        FROND_L,                 // length
        frondMidX, frondMidY, frondMidZ,
        col, 5,
      ));

      // Smaller secondary leaflets along frond (alternating mini cones)
      const leafletCount = 4;
      for (let li = 1; li <= leafletCount; li++) {
        const lFrac = li / (leafletCount + 1);
        const lx = crownX + Math.sin(ang) * reach * lFrac;
        const ly = crownY + 0.6 - droop * lFrac;
        const lz = crownZ + Math.cos(ang) * reach * lFrac;
        const leafAng = ang + Math.PI * 0.5;
        const leafL = FROND_L * 0.18;
        const leafR = 0.06;
        // leaflet pointing perp to frond direction and slightly up
        const lx2 = lx + Math.sin(leafAng) * leafL * 0.5;
        const lz2 = lz + Math.cos(leafAng) * leafL * 0.5;
        parts.push(cone(leafR, 0.01, leafL, lx2, ly + 0.05, lz2, FROND_DEEP, 4));
        // Mirror leaflet
        const lx3 = lx - Math.sin(leafAng) * leafL * 0.5;
        const lz3 = lz - Math.cos(leafAng) * leafL * 0.5;
        parts.push(cone(leafR, 0.01, leafL, lx3, ly + 0.05, lz3, FROND_MID, 4));
      }
    }

    // ── Date clusters under the crown ─────────────────────────────────────
    // 4-5 clusters of small spheres hanging just below the crown
    const DATE_CLUSTER_COUNT = 5;
    const dateAngles = ringAngles(DATE_CLUSTER_COUNT, 0.7);
    for (let di = 0; di < DATE_CLUSTER_COUNT; di++) {
      const dang = dateAngles[di];
      const dReach = 0.45;
      const dcx = crownX + Math.sin(dang) * dReach;
      const dcz = crownZ + Math.cos(dang) * dReach;
      const dcy = crownY - 0.6;
      const dCol = (di % 2 === 0) ? DATE_AMBER : DATE_BROWN;

      // Each cluster: a bunch of 3-4 small balls
      const DR = 0.09;
      parts.push(lowPolyBall(DR,        dcx,        dcy,        dcz,        dCol, 0));
      parts.push(lowPolyBall(DR * 0.85, dcx + 0.12, dcy + 0.07, dcz,        dCol, 0));
      parts.push(lowPolyBall(DR * 0.85, dcx - 0.10, dcy + 0.05, dcz + 0.08, DATE_BROWN, 0));
      parts.push(lowPolyBall(DR * 0.78, dcx + 0.05, dcy - 0.08, dcz - 0.09, DATE_AMBER, 0));
    }

    // ── Soil mound at base (slight ground rise) ────────────────────────────
    parts.push(cylinderY(0.32, 0.12, 0, 0.06, 0, PALETTE.planterStone, 8));

    // ── Merge geometry ─────────────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(opaqueMesh);

    // ── Colliders & obstacles ─────────────────────────────────────────────
    const trunkRadius = baseR + 0.05;
    const colliders: Box[] = [
      solidBox(0, h * 0.4, 0, trunkRadius * 2, h * 0.8, trunkRadius * 2),
    ];
    const obstacles: Rect[] = [
      { x: 0, z: 0, w: trunkRadius * 2.5, d: trunkRadius * 2.5 },
    ];

    return { mesh: group, colliders, obstacles };
  },
});
