// src/world/catalog/fence.ts
//
// Picket fence segment running along X. Pickets face +z.
// Params: length (m), gate (boolean gap in the center), color.
// All placement is derived from part dimensions — no magic offsets.

import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";

const POST_H  = 1.0;
const PICKET_H = 0.85;
const POST_W  = 0.12;
const RAIL_T  = 0.06;
const PITCH   = 0.28;  // center-to-center picket spacing
const GATE_W  = 1.4;   // clear width of the gate gap
const PICKET_W = 0.08;
const PICKET_D = 0.04;

/** Slightly darker hex for posts. */
function darken(hex: number): number {
  const r = ((hex >> 16) & 0xff) * 0.78;
  const g = ((hex >>  8) & 0xff) * 0.78;
  const b = ( hex        & 0xff) * 0.78;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

defineObject("fence", {
  params: { length: 6, gate: false, color: 0xece7da },
  build(p: { length: number; gate: boolean; color: number }) {
    const { length, gate, color } = p;
    const darker = darken(color);
    const halfLen = length / 2;

    const parts: ReturnType<typeof tintedBox>[] = [];

    // ── Pickets ────────────────────────────────────────────────────────────
    const count = Math.round(length / PITCH);
    const firstX = -((count - 1) / 2) * PITCH; // center pickets on x=0
    for (let i = 0; i < count; i++) {
      const px = firstX + i * PITCH;
      if (gate && Math.abs(px) < GATE_W / 2) continue;
      parts.push(tintedBox(PICKET_W, PICKET_H, PICKET_D, px, PICKET_H / 2, 0, color));
    }

    // ── Rails ──────────────────────────────────────────────────────────────
    // Two rail heights: top near PICKET_H, bottom lower.
    const RAIL_TOP = 0.80;
    const RAIL_BOT = 0.30;

    if (!gate) {
      // Single full-length rail at each height.
      parts.push(tintedBox(length, RAIL_T, RAIL_T, 0, RAIL_TOP, 0, color));
      parts.push(tintedBox(length, RAIL_T, RAIL_T, 0, RAIL_BOT, 0, color));
    } else {
      // Split each rail into left and right segments around the gate gap.
      // Left segment spans from -halfLen to -(GATE_W/2); right from +(GATE_W/2) to +halfLen.
      const solidHalf = (length - GATE_W) / 2; // length of each side segment
      const leftCenterX  = -halfLen + solidHalf / 2;  // derived from boundary
      const rightCenterX =  halfLen - solidHalf / 2;

      for (const railY of [RAIL_TOP, RAIL_BOT]) {
        parts.push(tintedBox(solidHalf, RAIL_T, RAIL_T, leftCenterX,  railY, 0, color));
        parts.push(tintedBox(solidHalf, RAIL_T, RAIL_T, rightCenterX, railY, 0, color));
      }
    }

    // ── Posts (every length/4) ─────────────────────────────────────────────
    // Place posts at x = -halfLen, -halfLen/2, 0, +halfLen/2, +halfLen (5 posts).
    const postPositions = [-halfLen, -halfLen / 2, 0, halfLen / 2, halfLen];
    for (const px of postPositions) {
      parts.push(tintedBox(POST_W, POST_H, POST_W, px, POST_H / 2, 0, darker));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;

    // ── Colliders ──────────────────────────────────────────────────────────
    // One thin box collider per solid rail span (full height of fence, thin depth).
    const colHy = POST_H / 2;
    const colHz = 0.08;
    type BoxCollider = { x: number; y: number; z: number; hx: number; hy: number; hz: number };
    const colliders: BoxCollider[] = [];

    if (!gate) {
      colliders.push({ x: 0, y: colHy, z: 0, hx: halfLen, hy: colHy, hz: colHz });
    } else {
      const solidHalf = (length - GATE_W) / 2;
      const leftCenterX  = -halfLen + solidHalf / 2;
      const rightCenterX =  halfLen - solidHalf / 2;
      colliders.push({ x: leftCenterX,  y: colHy, z: 0, hx: solidHalf / 2, hy: colHy, hz: colHz });
      colliders.push({ x: rightCenterX, y: colHy, z: 0, hx: solidHalf / 2, hy: colHy, hz: colHz });
    }

    return {
      mesh,
      colliders,
      obstacles: [{ x: 0, z: 0, w: length, d: 0.3 }],
    };
  },
});
