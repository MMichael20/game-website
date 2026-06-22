// src/world/catalog/airport/apronProps.ts
//
// "apronContainers" — a colorful cargo corner of stacked container/box-truck cubes.
// "baggageCartTrain" — a tug-less row of flatbed dollies loaded with luggage.
// base y=0, centered, FRONT +z. ~1u=1m. Deterministic via seed.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../../objects/voxel";
import { mulberry32 } from "../../rng";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

const CONTAINER = [0xc0392b, 0x2b6fb5, 0xf2f0ea, 0x2e9e4f, 0xe8772e, 0xf2c12e];
const LUGGAGE   = [0xc0392b, 0x2b6fb5, 0x2e9e4f, 0xf2c12e, 0x7a3fb0];

// ── apronContainers ───────────────────────────────────────────────────────────
interface ContainersParams { w: number; d: number; seed: number }

defineObject("apronContainers", {
  params: { w: 16, d: 10, seed: 0xc0a7 } as ContainersParams,
  build(p: ContainersParams): ObjectResult {
    const { w, d, seed } = p;
    const rng = mulberry32(seed);
    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];

    const cell = 2.4;
    const nx = Math.max(2, Math.floor(w / cell));
    const nz = Math.max(2, Math.floor(d / cell));
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        if (rng() > 0.78) continue; // gaps for aisles
        const cx = -w / 2 + (ix + 0.5) * (w / nx);
        const cz = -d / 2 + (iz + 0.5) * (d / nz);
        const stack = 1 + (rng() > 0.6 ? 1 : 0);
        const bw = cell * 0.85;
        const bd = (rng() > 0.5 ? cell * 1.7 : cell * 0.85);
        for (let s = 0; s < stack; s++) {
          const col = CONTAINER[Math.floor(rng() * CONTAINER.length)];
          const bh = 2.0;
          const y = s * bh;
          parts.push(tintedBox(bw, bh, bd, cx, y + bh / 2, cz, col));
          // ribbed door end
          parts.push(tintedBox(0.06, bh - 0.2, bd - 0.1, cx + bw / 2, y + bh / 2, cz, 0x2a2a2a));
        }
        colliders.push(solidBox(cx, 1.0, cz, bw, 2.0, bd));
      }
    }
    // A couple of box-truck bodies with grey cabs at the front edge
    for (let t = 0; t < 2; t++) {
      const tx = -w / 2 + (t + 0.5) * (w / 2);
      const tz = d / 2 - 1.4;
      parts.push(tintedBox(2.0, 1.8, 3.4, tx, 0.9 + 0.3, tz, CONTAINER[(t + 1) % CONTAINER.length]));
      parts.push(tintedBox(1.6, 1.2, 1.0, tx, 0.9, tz + 2.0, 0x9aa0a6)); // cab
      for (const wx of [-0.7, 0.7]) for (const wz of [tz - 1.2, tz + 2.2]) {
        parts.push(cylinderY(0.32, 0.3, tx + wx, 0.32, wz, 0x111111, 10));
      }
      colliders.push(solidBox(tx, 1.0, tz, 2.0, 2.0, 5.0));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const obstacles: Rect[] = [{ x: 0, z: 0, w: w + 0.5, d: d + 0.5 }];
    return { mesh, colliders, obstacles };
  },
});

// ── baggageCartTrain ──────────────────────────────────────────────────────────
interface TrainParams { carts: number; seed: number }

defineObject("baggageCartTrain", {
  params: { carts: 4, seed: 0xca27 } as TrainParams,
  build(p: TrainParams): ObjectResult {
    const { carts, seed } = p;
    const rng = mulberry32(seed);
    const parts: THREE.BufferGeometry[] = [];
    const cartL = 1.8, gap = 0.5, pitch = cartL + gap;
    const total = carts * pitch - gap;
    const z0 = -total / 2 + cartL / 2;

    for (let c = 0; c < carts; c++) {
      const cz = z0 + c * pitch;
      // Dolly deck
      parts.push(tintedBox(1.4, 0.1, cartL, 0, 0.45, cz, PALETTE.steelDark));
      // Canopy posts + roof
      for (const sx of [-0.6, 0.6]) {
        parts.push(tintedBox(0.06, 1.0, 0.06, sx, 1.0, cz - cartL / 2 + 0.1, PALETTE.steel));
        parts.push(tintedBox(0.06, 1.0, 0.06, sx, 1.0, cz + cartL / 2 - 0.1, PALETTE.steel));
      }
      parts.push(tintedBox(1.5, 0.08, cartL, 0, 1.5, cz, 0x3a6a3a));
      // Wheels
      for (const wx of [-0.55, 0.55]) for (const wz of [cz - cartL / 2 + 0.2, cz + cartL / 2 - 0.2]) {
        parts.push(cylinderY(0.18, 0.08, wx, 0.18, wz, 0x111111, 10));
      }
      // Loaded bags
      const nb = 3 + Math.floor(rng() * 3);
      for (let b = 0; b < nb; b++) {
        const col = LUGGAGE[(c + b) % LUGGAGE.length];
        const bx = (rng() - 0.5) * 0.7;
        const bz = cz + (rng() - 0.5) * (cartL - 0.5);
        const bh = 0.24 + rng() * 0.12;
        parts.push(tintedBox(0.4, bh, 0.5, bx, 0.5 + bh / 2, bz, col));
      }
      // Tow bar to next cart
      if (c < carts - 1) {
        parts.push(tintedBox(0.06, 0.06, gap, 0, 0.3, cz + cartL / 2 + gap / 2, PALETTE.steelDark));
      }
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    const obstacles: Rect[] = [{ x: 0, z: 0, w: 1.8, d: total + 0.4 }];
    return { mesh, colliders: [], obstacles };
  },
});
