// src/world/catalog/plaza.ts
//
// A paved business plaza: a central fountain ringed by benches, corner planters,
// lamps and trees, and a pair of vendor kiosks facing the square. It carries NO
// base slab of its own — it is meant to sit on the central `pavement` — so the
// stone reads continuously. Composed from existing catalog kinds via buildObject +
// applyTransform; every position derived from w/d. LOCAL space, deterministic.

import * as THREE from "three";
import { defineObject, buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
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

interface PlazaParams { w: number; d: number; seed: number }

const FLOWER_COLORS = ["red", "yellow", "white"] as const;

defineObject("plaza", {
  params: { w: 26, d: 20, seed: 1 } as PlazaParams,
  build(p: PlazaParams) {
    const { w, d } = p;
    const hw = w / 2;
    const hd = d / 2;
    const rng = mulberry32(p.seed >>> 0);
    const parts: ObjectResult[] = [];

    const add = (kind: string, x: number, z: number, rot: number, params?: Record<string, unknown>) => {
      parts.push(applyTransform(buildObject(kind, params ?? {}), { x, z, rot }));
    };

    // Central fountain.
    add("fountain", 0, 0, 0, { r: 1.6, tiers: 2 });

    // Four benches ringing the fountain, each facing inward (+z is a bench's front).
    const bx = Math.min(6, hw - 2);
    const bz = Math.min(5, hd - 2);
    add("bench", 0, bz, 180);    // north bench faces -z (toward centre)
    add("bench", 0, -bz, 0);     // south bench faces +z
    add("bench", bx, 0, 270);    // east bench faces -x
    add("bench", -bx, 0, 90);    // west bench faces +x

    // Corner planters + lamps + trees, derived from the plaza extent.
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        add("planter", sx * (hw - 2.5), sz * (hd - 2), sx > 0 ? 0 : 180);
        add("lamp", sx * (hw - 1), sz * (hd - 1), 0);
      }
    }
    // Two trees on the cross axis, offset from the benches.
    add("tree", hw - 6.5, 0, 0);
    add("tree", -(hw - 6.5), 0, 0);

    // Two vendor kiosks facing into the square from east and west.
    add("kioskCart", hw - 3.5, 3, 270, { canopyColor: 0xc0392b });
    add("kioskCart", -(hw - 3.5), -3, 90, { canopyColor: 0x2980b9 });

    // A scatter of loose flowers between the fountain and the benches.
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const r = 2.6 + rng() * 0.6;
      const color = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
      add("flower", Math.cos(ang) * r, Math.sin(ang) * r, 0, { color, height: 0.34 });
    }

    return compose(parts);
  },
});
