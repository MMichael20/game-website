// src/world/catalog/airport/luggage.ts
//
// Colorful luggage props: "luggagePile" (a deterministic cluster of suitcases),
// "baggageTrolley" (a cart loaded with bags), and "rollingSuitcase" (one upright
// case with its handle out). base y=0, centered. ~1u=1m. Deterministic via seed.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../../objects/voxel";
import { mulberry32 } from "../../rng";
import { PALETTE } from "../../palette";
import type { ObjectResult, Rect } from "../../system/types";

const LUGGAGE = [0xc0392b, 0x2b6fb5, 0x2e9e4f, 0xf2c12e, 0x7a3fb0, 0xe8772e, 0x16a085];

// A single suitcase body (lying or standing) with a darker handle + trim.
function suitcase(
  parts: THREE.BufferGeometry[],
  x: number, y: number, z: number,
  w: number, hgt: number, dep: number, col: number, standing: boolean,
): void {
  parts.push(tintedBox(w, hgt, dep, x, y + hgt / 2, z, col));
  // Corner-darkened trim band
  parts.push(tintedBox(w + 0.02, hgt * 0.18, dep + 0.02, x, y + hgt * 0.5, z, 0x1a1a1a));
  // Handle
  if (standing) {
    parts.push(tintedBox(0.04, 0.22, 0.04, x - w * 0.25, y + hgt + 0.11, z, 0x2a2a2a));
    parts.push(tintedBox(0.04, 0.22, 0.04, x + w * 0.25, y + hgt + 0.11, z, 0x2a2a2a));
    parts.push(tintedBox(w * 0.5 + 0.08, 0.04, 0.04, x, y + hgt + 0.22, z, 0x2a2a2a));
    // Wheels
    parts.push(cylinderY(0.05, 0.04, x - w * 0.3, 0.02, z + dep * 0.3, 0x111111, 8));
    parts.push(cylinderY(0.05, 0.04, x + w * 0.3, 0.02, z + dep * 0.3, 0x111111, 8));
  } else {
    parts.push(tintedBox(0.22, 0.04, 0.05, x, y + hgt + 0.02, z, 0x2a2a2a));
  }
}

// ── luggagePile ───────────────────────────────────────────────────────────────
interface PileParams { count: number; seed: number }

defineObject("luggagePile", {
  params: { count: 6, seed: 0xba901 } as PileParams,
  build(p: PileParams): ObjectResult {
    const { count, seed } = p;
    const rng = mulberry32(seed);
    const parts: THREE.BufferGeometry[] = [];
    let maxR = 0.6;

    for (let i = 0; i < count; i++) {
      const col = LUGGAGE[i % LUGGAGE.length];
      const standing = rng() > 0.55;
      const w = 0.42 + rng() * 0.16;
      const dep = 0.26 + rng() * 0.12;
      const hgt = standing ? 0.55 + rng() * 0.18 : 0.24 + rng() * 0.1;
      const ang = rng() * Math.PI * 2;
      const rad = rng() * 0.5;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      // Some lie stacked on others
      const y = (!standing && i > 0 && rng() > 0.6) ? 0.24 : 0;
      suitcase(parts, x, y, z, w, hgt, dep, col, standing);
      maxR = Math.max(maxR, rad + w / 2);
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    const obstacles: Rect[] = [{ x: 0, z: 0, w: maxR * 2, d: maxR * 2 }];
    return { mesh, colliders: [], obstacles };
  },
});

// ── baggageTrolley ──────────────────────────────────────────────────────────
interface TrolleyParams { bags: number; seed: number }

defineObject("baggageTrolley", {
  params: { bags: 4, seed: 0x7701 } as TrolleyParams,
  build(p: TrolleyParams): ObjectResult {
    const { bags, seed } = p;
    const rng = mulberry32(seed);
    const parts: THREE.BufferGeometry[] = [];

    const cartW = 0.7, cartL = 1.1, deckY = 0.32;
    // Deck platform
    parts.push(tintedBox(cartW, 0.06, cartL, 0, deckY, 0, PALETTE.steel));
    // Frame uprights at the back
    parts.push(tintedBox(0.05, 1.1, 0.05, -cartW / 2 + 0.06, 0.55, -cartL / 2 + 0.06, PALETTE.steelDark));
    parts.push(tintedBox(0.05, 1.1, 0.05,  cartW / 2 - 0.06, 0.55, -cartL / 2 + 0.06, PALETTE.steelDark));
    // Push handle bar
    parts.push(tintedBox(cartW, 0.06, 0.06, 0, 1.08, -cartL / 2 + 0.06, PALETTE.steelDark));
    // Lower rail
    parts.push(tintedBox(cartW, 0.04, 0.04, 0, deckY + 0.5, -cartL / 2 + 0.06, PALETTE.steelDark));
    // Wheels
    for (const wx of [-cartW / 2 + 0.1, cartW / 2 - 0.1]) {
      for (const wz of [-cartL / 2 + 0.12, cartL / 2 - 0.12]) {
        parts.push(cylinderY(0.1, 0.05, wx, 0.1, wz, 0x111111, 10));
      }
    }
    // Stacked bags on the deck
    let stackY = deckY + 0.03;
    for (let i = 0; i < bags; i++) {
      const col = LUGGAGE[(i + 2) % LUGGAGE.length];
      const w = 0.5 + rng() * 0.12;
      const dep = cartL * 0.7 + rng() * 0.1;
      const hgt = 0.2 + rng() * 0.1;
      suitcase(parts, (rng() - 0.5) * 0.08, stackY, 0, w, hgt, dep, col, false);
      stackY += hgt + 0.02;
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    const obstacles: Rect[] = [{ x: 0, z: 0, w: cartW + 0.3, d: cartL + 0.3 }];
    return { mesh, colliders: [], obstacles };
  },
});

// ── rollingSuitcase (single upright case) ───────────────────────────────────
interface CaseParams { color: number }

defineObject("rollingSuitcase", {
  params: { color: 0x2b6fb5 } as CaseParams,
  build(p: CaseParams): ObjectResult {
    const parts: THREE.BufferGeometry[] = [];
    suitcase(parts, 0, 0.05, 0, 0.46, 0.62, 0.28, p.color, true);
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return { mesh, colliders: [], obstacles: [{ x: 0, z: 0, w: 0.6, d: 0.5 }] };
  },
});
