// src/world/catalog/park.ts
//
// A paved plaza with a 2×2 grid of stone-bordered grass beds, a central
// fountain, perimeter lamps, path benches, and trees/flowers in the beds.
// Composed from existing catalog kinds via buildObject + applyTransform.
//
// LOCAL space: centered x=z=0, base y=0, ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject, buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { PALETTE } from "../palette";
import { mulberry32 } from "../rng";
import type { ObjectResult, Box, Rect } from "../system/types";

function compose(parts: ObjectResult[]): ObjectResult {
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  for (const p of parts) {
    group.add(p.mesh);
    if (p.colliders) colliders.push(...p.colliders);
    if (p.obstacles) obstacles.push(...p.obstacles);
  }
  return { mesh: group, colliders, obstacles };
}

interface ParkParams {
  w: number;
  d: number;
  fountain: boolean;
  seed: number;
}

const FLOWER_COLORS = ["red", "yellow", "white"] as const;

defineObject("park", {
  params: { w: 26, d: 20, fountain: true, seed: 1 } as ParkParams,
  build(p: ParkParams) {
    const { w, d } = p;
    const rng = mulberry32(p.seed >>> 0);
    const parts: ObjectResult[] = [];

    // Paved plaza floor (thin slab over the grass).
    const floor: ObjectResult = {
      mesh: tintedMesh(tintedBox(w, 0.06, d, 0, 0.03, 0, PALETTE.sidewalk)),
    };
    (floor.mesh as THREE.Mesh).receiveShadow = true;
    parts.push(floor);

    // Bed grid geometry. Central cross-path of PATH wide; perimeter margin MARGIN.
    const PATH = 3.0;
    const MARGIN = 1.6;
    const bedW = (w - PATH - MARGIN * 2) / 2;
    const bedD = (d - PATH - MARGIN * 2) / 2;
    const bedCX = (PATH / 2 + bedW / 2);
    const bedCZ = (PATH / 2 + bedD / 2);

    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const cx = sx * bedCX;
        const cz = sz * bedCZ;
        // Stone rim + inset grass top, built as one merged mesh per bed.
        const rimH = 0.32;
        const grassH = 0.12;
        const grassCenterY = rimH + 0.04;        // grass slab center
        const grassTopY = grassCenterY + grassH / 2; // walkable grass surface
        const bedParts = [
          tintedBox(bedW, rimH, bedD, cx, rimH / 2, cz, PALETTE.stoneBase),
          tintedBox(bedW - 0.5, grassH, bedD - 0.5, cx, grassCenterY, cz, PALETTE.parkGrass),
        ];
        const bedMesh = tintedMesh(mergeTinted(bedParts));
        bedMesh.receiveShadow = true;
        parts.push({
          mesh: bedMesh,
          colliders: [{ x: cx, y: rimH / 2, z: cz, hx: bedW / 2, hy: rimH / 2, hz: bedD / 2 }],
          obstacles: [{ x: cx, z: cz, w: bedW, d: bedD }],
        });
        // One tree near the bed's outer corner.
        const tree = buildObject("tree", {});
        parts.push(applyTransform(tree, { x: cx + sx * bedW * 0.22, z: cz + sz * bedD * 0.22, rot: 0 }));
        // A few flowers in the bed (color chosen by rng; positions derived).
        for (let i = 0; i < 3; i++) {
          const fx = cx + (i - 1) * (bedW * 0.22);
          const fz = cz - sz * bedD * 0.18;
          const color = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
          const flower = buildObject("flower", { color, height: 0.34 });
          const placed = applyTransform(flower, { x: fx, z: fz, rot: 0 });
          // lift flowers so their base sits on the bed's grass surface
          placed.mesh.position.y += grassTopY;
          parts.push(placed);
        }
      }
    }

    // Central fountain.
    if (p.fountain) {
      const fountain = buildObject("fountain", { r: 1.4, tiers: 2 });
      parts.push(applyTransform(fountain, { x: 0, z: 0, rot: 0 }));
    }

    // Perimeter lamps at the four corners (inside the margin).
    const lampX = w / 2 - 0.8;
    const lampZ = d / 2 - 0.8;
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const lamp = buildObject("lamp", {});
        parts.push(applyTransform(lamp, { x: sx * lampX, z: sz * lampZ, rot: 0 }));
      }
    }

    // Benches flanking the central vertical path, facing outward along z.
    for (const sz of [-1, 1] as const) {
      const bench = buildObject("bench", {});
      parts.push(applyTransform(bench, { x: 0, z: sz * (PATH / 2 + 0.4), rot: sz === 1 ? 0 : 180 }));
    }

    return compose(parts);
  },
});
