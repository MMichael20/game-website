// src/world/catalog/airport/airportGreenery.ts
//
// "hedgeRow" — a clipped green hedge on a stone planter rim. "pottedPlant" — a
// single cube-foliage shrub in a box planter (indoor/outdoor decor). base y=0,
// centered, FRONT +z. ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../../objects/voxel";
import { mulberry32 } from "../../rng";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// ── hedgeRow ────────────────────────────────────────────────────────────────
interface HedgeRowParams { len: number; h: number; seed: number }

defineObject("hedgeRow", {
  params: { len: 8, h: 1.0, seed: 0x4ed1 } as HedgeRowParams,
  build(p: HedgeRowParams): ObjectResult {
    const { len, h, seed } = p;
    const rng = mulberry32(seed);
    const depth = 0.85;
    const rimH = 0.22;
    const parts: THREE.BufferGeometry[] = [];

    // Stone planter rim
    parts.push(tintedBox(len, rimH, depth, 0, rimH / 2, 0, PALETTE.planterStone));
    parts.push(tintedBox(len + 0.06, 0.05, depth + 0.06, 0, rimH, 0, 0xa9a79f));
    // Hedge body
    parts.push(tintedBox(len - 0.1, h, depth - 0.2, 0, rimH + h / 2, 0, PALETTE.hedge));
    // 2-tone clipped top — alternating leaf cubes
    const nCube = Math.max(2, Math.floor(len / 0.7));
    for (let i = 0; i < nCube; i++) {
      const cx = -len / 2 + (i + 0.5) * (len / nCube);
      const col = (i + (rng() > 0.5 ? 1 : 0)) % 2 === 0 ? PALETTE.leaf : PALETTE.leafDeep;
      const ch = 0.16 + rng() * 0.12;
      parts.push(tintedBox(len / nCube - 0.05, ch, depth - 0.12, cx, rimH + h + ch / 2 - 0.04, 0, col));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const colliders: Box[] = [solidBox(0, (rimH + h) / 2, 0, len, rimH + h, depth)];
    const obstacles: Rect[] = [{ x: 0, z: 0, w: len + 0.2, d: depth + 0.2 }];
    return { mesh, colliders, obstacles };
  },
});

// ── pottedPlant ─────────────────────────────────────────────────────────────
interface PottedParams { h: number; pot: number }

defineObject("pottedPlant", {
  params: { h: 1.8, pot: 0x3a3a40 } as PottedParams,
  build(p: PottedParams): ObjectResult {
    const { h, pot } = p;
    const parts: THREE.BufferGeometry[] = [];
    const potH = 0.5, potW = 0.7;
    // Box planter
    parts.push(tintedBox(potW, potH, potW, 0, potH / 2, 0, pot));
    parts.push(tintedBox(potW + 0.06, 0.08, potW + 0.06, 0, potH, 0, 0x55555c));
    // Soil
    parts.push(tintedBox(potW - 0.1, 0.05, potW - 0.1, 0, potH + 0.03, 0, 0x3a2a1a));
    // Trunk
    const trunkH = h * 0.45;
    parts.push(tintedBox(0.12, trunkH, 0.12, 0, potH + trunkH / 2, 0, PALETTE.trunk));
    // Cube foliage cluster
    const folY = potH + trunkH;
    const blob = (dx: number, dy: number, dz: number, s: number, c: number) =>
      parts.push(tintedBox(s, s, s, dx, folY + dy, dz, c));
    blob(0, 0.2, 0, 0.9, PALETTE.leaf);
    blob(0.4, 0.0, 0.1, 0.6, PALETTE.leafDeep);
    blob(-0.35, 0.05, -0.1, 0.6, PALETTE.leafDeep);
    blob(0.05, 0.55, 0.05, 0.6, PALETTE.leaf);
    blob(0.2, 0.35, -0.3, 0.5, PALETTE.bush);

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    const colliders: Box[] = [solidBox(0, potH / 2, 0, potW, potH, potW)];
    const obstacles: Rect[] = [{ x: 0, z: 0, w: 1.0, d: 1.0 }];
    return { mesh, colliders, obstacles };
  },
});
