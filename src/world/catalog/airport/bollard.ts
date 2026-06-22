// src/world/catalog/airport/bollard.ts
//
// "bollard" — a short black safety post with a reflective yellow band near the
// top, the kind that lines plaza edges, crossings and drop-off curbs.
// "bollardRow" — a straight run of evenly spaced bollards along the local x axis;
// the COUNT is derived from `len` and `gap` (never a hand-typed offset), and the
// whole run merges to one mesh for a single draw call.
//
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z. ~1u = 1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { cylinderY, disc, mergeTinted, tintedMesh } from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

const POST = PALETTE.lampPole;   // near-black post
const BAND = PALETTE.yellowLine; // reflective yellow band
const POST_R = 0.13;

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// One bollard's geometry, centered at (cx,0,cz). Pushed into the shared parts list
// so a row can merge into a single mesh.
function bollardParts(parts: THREE.BufferGeometry[], cx: number, cz: number, h: number): void {
  // Post shaft
  parts.push(cylinderY(POST_R, h, cx, h / 2, cz, POST, 10));
  // Reflective yellow band near the top (slightly proud of the shaft)
  parts.push(cylinderY(POST_R + 0.03, 0.18, cx, h - 0.22, cz, BAND, 10));
  // Rounded cap
  parts.push(disc(POST_R + 0.02, 0.08, cx, h + 0.04, cz, POST, 10));
}

// ── bollard ───────────────────────────────────────────────────────────────────
interface BollardParams { h: number }

defineObject("bollard", {
  params: { h: 1.0 } as BollardParams,
  build(p: BollardParams): ObjectResult {
    const h = p.h;
    const parts: THREE.BufferGeometry[] = [];
    bollardParts(parts, 0, 0, h);

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    const colliders: Box[] = [solidBox(0, h / 2, 0, POST_R * 2.2, h, POST_R * 2.2)];
    const obstacles: Rect[] = [{ x: 0, z: 0, w: 0.5, d: 0.5 }];
    return { mesh, colliders, obstacles };
  },
});

// ── bollardRow ──────────────────────────────────────────────────────────────
interface BollardRowParams { len: number; gap: number; h: number }

defineObject("bollardRow", {
  params: { len: 12, gap: 2.4, h: 1.0 } as BollardRowParams,
  build(p: BollardRowParams): ObjectResult {
    const { len, gap, h } = p;
    // Count derived from the run length and the requested gap (PITFALL 3).
    const n = Math.max(2, Math.round(len / gap) + 1);
    const step = len / (n - 1);

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + i * step;
      bollardParts(parts, cx, 0, h);
      colliders.push(solidBox(cx, h / 2, 0, POST_R * 2.2, h, POST_R * 2.2));
      obstacles.push({ x: cx, z: 0, w: 0.5, d: 0.5 });
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return { mesh, colliders, obstacles };
  },
});
