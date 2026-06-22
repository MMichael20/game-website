// src/world/catalog/airport/queueLane.ts
//
// "queueLane" — a snaking belt-barrier field: chrome posts joined by BLUE
// retractable belts, laid over a w x d footprint. Passable (no solid collider),
// just a soft NPC-avoid obstacle. base y=0, centered. ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Rect } from "../../system/types";

const POST   = PALETTE.steelLight;
const POST_BASE = PALETTE.steelDark;
const BELT   = 0x2b6fb5;   // blue belt

interface QueueLaneParams { w: number; d: number; rows: number }

defineObject("queueLane", {
  params: { w: 8, d: 5, rows: 3 } as QueueLaneParams,
  build(p: QueueLaneParams): ObjectResult {
    const { w, d, rows } = p;
    const hW = w / 2, hD = d / 2;
    const postH = 1.0, postR = 0.045;
    const postsPerRow = Math.max(3, Math.round(w / 1.6));
    const rowGap = d / rows;

    const parts: THREE.BufferGeometry[] = [];

    for (let r = 0; r < rows; r++) {
      const rz = -hD + (r + 0.5) * rowGap;
      const xs: number[] = [];
      for (let i = 0; i < postsPerRow; i++) {
        xs.push(-hW + (i * w) / (postsPerRow - 1));
      }
      for (let i = 0; i < xs.length; i++) {
        const px = xs[i];
        // Post base
        parts.push(cylinderY(postR * 2.4, 0.06, px, 0.03, rz, POST_BASE, 10));
        // Post shaft
        parts.push(cylinderY(postR, postH, px, postH / 2, rz, POST, 8));
        // Top cap
        parts.push(cylinderY(postR * 1.8, 0.05, px, postH + 0.02, rz, POST_BASE, 8));
        // Blue belt to next post in row
        if (i < xs.length - 1) {
          const nx = xs[i + 1];
          const midX = (px + nx) / 2;
          const beltL = Math.abs(nx - px) - 0.03;
          parts.push(tintedBox(beltL, 0.06, 0.03, midX, postH * 0.62, rz, BELT));
        }
      }
      // Switchback connector belt to the next row (alternating ends)
      if (r < rows - 1) {
        const endX = r % 2 === 0 ? hW : -hW;
        const nz = -hD + (r + 1.5) * rowGap;
        parts.push(tintedBox(0.03, 0.06, Math.abs(nz - rz), endX, postH * 0.62, (rz + nz) / 2, BELT));
      }
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;

    const obstacles: Rect[] = [{ x: 0, z: 0, w: w + 0.4, d: d + 0.4 }];
    return { mesh, colliders: [], obstacles };
  },
});
