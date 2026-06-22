// src/world/catalog/airport/airportRoad.ts
//
// "airportRoad" — a clean WIDE flat asphalt road: no curbs, no raised median, no
// guardrails (unlike `highway`). Painted lane dashes + solid edge + yellow centre.
// "parkingLot" — an asphalt apron of marked stalls with a few parked cars.
// LOCAL space: centered, base y=0, road runs along +x. ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../../objects/voxel";
import { makeAsphaltTexture, GRAIN_M } from "../../roads";
import { mulberry32 } from "../../rng";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

const LANE = PALETTE.laneLine;
const YELLOW = PALETTE.yellowLine;

// Flat textured asphalt slab (drivable, no collider).
function asphalt(group: THREE.Group, length: number, width: number, y: number): void {
  const geo = new THREE.PlaneGeometry(length, width);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y, 0);
  const tex = makeAsphaltTexture();
  tex.repeat.set(Math.max(1, Math.round(length / GRAIN_M)), Math.max(1, Math.round(width / GRAIN_M)));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex }));
  mesh.receiveShadow = true;
  group.add(mesh);
}

// ── airportRoad ────────────────────────────────────────────────────────────────
interface RoadParams { length: number; width: number; lanes: number }

defineObject("airportRoad", {
  params: { length: 80, width: 20, lanes: 4 } as RoadParams,
  build(p: RoadParams): ObjectResult {
    const { length, width, lanes } = p;
    const group = new THREE.Group();
    asphalt(group, length, width, 0.04);

    const markY = 0.06;
    const parts: THREE.BufferGeometry[] = [];
    // Solid white edge lines.
    for (const sgn of [-1, 1]) {
      parts.push(tintedBox(length, 0.02, 0.2, 0, markY, sgn * (width / 2 - 0.4), LANE));
    }
    // Double-yellow centre line.
    for (const sgn of [-1, 1]) {
      parts.push(tintedBox(length, 0.02, 0.12, 0, markY, sgn * 0.18, YELLOW));
    }
    // Dashed lane dividers.
    const laneW = width / lanes;
    const DASH = 3, GAP = 4, period = DASH + GAP;
    const nDash = Math.max(1, Math.floor(length / period));
    const start = -nDash * period / 2 + period / 2;
    for (let l = 1; l < lanes; l++) {
      const lz = -width / 2 + l * laneW;
      if (Math.abs(lz) < 0.5) continue; // skip the centre (yellow already there)
      for (let i = 0; i < nDash; i++) {
        parts.push(tintedBox(DASH, 0.02, 0.16, start + i * period, markY, lz, LANE));
      }
    }
    group.add(tintedMesh(mergeTinted(parts)));

    // No colliders / obstacles — it is drivable and walkable.
    return { mesh: group, colliders: [], obstacles: [] };
  },
});

// ── parkingLot ──────────────────────────────────────────────────────────────
const CAR_COLORS = [0xcf3a2c, 0x2b6fb5, 0xf2c12e, 0xf2f0ea, 0x2e9e4f, 0x444a52, 0x7a3fb0];

function parkedCar(parts: THREE.BufferGeometry[], x: number, z: number, col: number): void {
  const L = 4.0, W = 1.8;
  parts.push(tintedBox(W, 0.6, L, x, 0.55, z, col));
  parts.push(tintedBox(W - 0.15, 0.6, L * 0.5, x, 1.15, z - 0.1, col));
  parts.push(tintedBox(W - 0.05, 0.42, L * 0.5 - 0.1, x, 1.18, z - 0.1, 0x2a3a4a));
  parts.push(tintedBox(W, 0.16, 0.1, x, 0.42, z + L / 2, 0x222222));
  parts.push(tintedBox(W, 0.16, 0.1, x, 0.42, z - L / 2, 0x222222));
  for (const wx of [-W / 2 + 0.1, W / 2 - 0.1]) {
    for (const wz of [L / 2 - 0.9, -L / 2 + 0.9]) {
      parts.push(cylinderY(0.38, 0.22, x + wx, 0.38, z + wz, 0x111111, 10));
    }
  }
}

interface ParkingParams { w: number; d: number; seed: number; fill: number }

defineObject("parkingLot", {
  params: { w: 34, d: 24, seed: 0x9a1, fill: 0.55 } as ParkingParams,
  build(p: ParkingParams): ObjectResult {
    const { w, d, seed, fill } = p;
    const rng = mulberry32(seed);
    const hD = d / 2;
    const group = new THREE.Group();
    asphalt(group, w, d, 0.05);

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const markY = 0.07;

    const aisleD = 7;                 // central drive aisle (along x)
    const rowDepth = hD - aisleD / 2; // each parking row depth
    const stallW = 2.6;
    const nStalls = Math.max(2, Math.floor(w / stallW));
    const usedW = nStalls * stallW;
    const x0 = -usedW / 2;

    for (const rowSign of [-1, 1]) {
      const rowOuterZ = rowSign * hD;
      const rowInnerZ = rowSign * (aisleD / 2);
      const rowCenterZ = (rowOuterZ + rowInnerZ) / 2;
      // Stall divider lines (run along z over the row depth).
      for (let i = 0; i <= nStalls; i++) {
        const lx = x0 + i * stallW;
        parts.push(tintedBox(0.12, 0.02, rowDepth, lx, markY, rowCenterZ, LANE));
      }
      // Bumper line at the aisle edge.
      parts.push(tintedBox(usedW, 0.02, 0.14, 0, markY, rowInnerZ, LANE));
      // Parked cars in some stalls.
      for (let i = 0; i < nStalls; i++) {
        if (rng() > fill) continue;
        const cx = x0 + (i + 0.5) * stallW;
        const cz = rowCenterZ;
        const col = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
        parkedCar(parts, cx, cz, col);
        colliders.push(solidBox(cx, 0.6, cz, 1.9, 1.2, 4.2));
      }
    }

    group.add(tintedMesh(mergeTinted(parts)));
    const obstacles: Rect[] = [];
    return { mesh: group, colliders, obstacles };
  },
});
