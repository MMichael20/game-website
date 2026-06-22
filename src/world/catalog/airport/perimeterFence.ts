// src/world/catalog/airport/perimeterFence.ts
//
// "perimeterFence" — a security perimeter fence: vertical steel posts every ~4 m
// carrying chain-link infill panels, top + bottom horizontal rails, and a
// barbed-wire crown. Optionally leaves a CENTRED gate gap. Runs along +X.
//
// LOCAL space: centered x=z=0, base y=0, runs along +X. ~1u = 1m. Deterministic
// (no Math.random / Date.now). Post count is DERIVED from `length` (PITFALL 3).

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, mergeTinted, tintedMesh, DECAL_GAP } from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box } from "../../system/types";

// DECAL_GAP is imported to match the shared voxel toolkit convention; the
// barbed-wire crown is offset in z by its own small steps so it reads as a
// distinct layer above the infill.
void DECAL_GAP;

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

interface PerimeterFenceParams { length: number; h: number; gateGap: number }

defineObject("perimeterFence", {
  params: { length: 60, h: 3, gateGap: 0 } as PerimeterFenceParams,
  build(p: PerimeterFenceParams): ObjectResult {
    const { length, h, gateGap } = p;
    const halfGate = gateGap / 2;
    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    // Vertical steel posts every ~4 m across the run. Count derived from length.
    const nPosts = Math.max(2, Math.round(length / 4));
    const postXs: number[] = [];
    for (let i = 0; i < nPosts; i++) {
      const postX = -length / 2 + (length * i) / (nPosts - 1);
      // Skip any post that falls inside the centred gate gap.
      if (gateGap > 0 && Math.abs(postX) < halfGate) continue;
      postXs.push(postX);
      parts.push(tintedBox(0.16, h, 0.16, postX, h / 2, 0, PALETTE.steel));
    }

    // Chain-link infill panel per bay between consecutive (kept) posts. Skip any
    // bay whose center sits inside the gate gap.
    for (let i = 0; i < postXs.length - 1; i++) {
      const x0 = postXs[i];
      const x1 = postXs[i + 1];
      const midX = (x0 + x1) / 2;
      if (gateGap > 0 && Math.abs(midX) < halfGate) continue;
      const bayLen = x1 - x0;
      parts.push(tintedBox(bayLen - 0.1, h - 0.4, 0.04, midX, (h - 0.4) / 2 + 0.2, 0, 0x8a9099));
    }

    // Two horizontal rails (near top and near base) spanning the full length.
    parts.push(tintedBox(length, 0.06, 0.08, 0, h - 0.25, 0, PALETTE.steelLight));
    parts.push(tintedBox(length, 0.06, 0.08, 0, 0.3, 0, PALETTE.steelLight));

    // Barbed-wire crown: 3 thin rails near the very top, slightly offset in z.
    for (let i = 0; i < 3; i++) {
      parts.push(tintedBox(length, 0.04, 0.05, 0, h - 0.1 + i * 0.05, (i - 1) * 0.06, 0x6f757d));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    group.add(mesh);

    // Collider: a thin wall along the whole length. With a gate gap, split into
    // a left run and a right run, leaving the centre open.
    const colliders: Box[] = [];
    if (gateGap > 0) {
      const runLen = (length - gateGap) / 2;
      const leftCx = -length / 2 + runLen / 2;
      const rightCx = length / 2 - runLen / 2;
      colliders.push(solidBox(leftCx, h / 2, 0, runLen, h, 0.3));
      colliders.push(solidBox(rightCx, h / 2, 0, runLen, h, 0.3));
    } else {
      colliders.push(solidBox(0, h / 2, 0, length, h, 0.3));
    }

    return { mesh: group, colliders };
  },
});
