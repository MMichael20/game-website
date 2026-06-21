// src/world/catalog/plaza.ts
//
// A paved business plaza built around a landmark fountain: a grand central
// fountain, two rings of benches facing in (sittable seating around the square),
// perimeter planters, lamps and trees, and a pair of big vendor kiosks. NO base
// slab of its own — it sits on the central `pavement` so the stone reads
// continuously. Composed from existing catalog kinds; every position derived from
// w/d. Bench/kiosk rotations stay on the 90 degree grid (CLAUDE rule).

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
  params: { w: 36, d: 28, seed: 1 } as PlazaParams,
  build(p: PlazaParams) {
    const { w, d } = p;
    const hw = w / 2;
    const hd = d / 2;
    const rng = mulberry32(p.seed >>> 0);
    const parts: ObjectResult[] = [];

    const add = (kind: string, x: number, z: number, rot: number, params?: Record<string, unknown>) => {
      parts.push(applyTransform(buildObject(kind, params ?? {}), { x, z, rot }));
    };

    // ── Landmark fountain in the centre ─────────────────────────────────────
    const fr = Math.min(6, Math.min(hw, hd) * 0.42);
    add("grandFountain", 0, 0, 0, { r: fr, seed: p.seed });

    // ── Two benches per side, all facing inward (rotations on the 90deg grid) ─
    const R = Math.min(fr + 3.2, hd - 3, hw - 3);
    const off = 2.6;
    add("bench", -off, R, 180); add("bench", off, R, 180);   // north side faces -z
    add("bench", -off, -R, 0);  add("bench", off, -R, 0);    // south side faces +z
    add("bench", R, -off, 270); add("bench", R, off, 270);   // east side faces -x
    add("bench", -R, -off, 90); add("bench", -R, off, 90);   // west side faces +x

    // ── Perimeter greenery + lighting ───────────────────────────────────────
    add("lamp", hw - 1.5, hd - 1.5, 0);
    add("lamp", -(hw - 1.5), hd - 1.5, 0);
    add("lamp", hw - 1.5, -(hd - 1.5), 0);
    add("lamp", -(hw - 1.5), -(hd - 1.5), 0);
    add("planter", hw - 2, 0, 0);  add("planter", -(hw - 2), 0, 180);
    add("planter", 0, hd - 1.6, 0); add("planter", 0, -(hd - 1.6), 0);
    add("tree", hw - 4, hd - 3.5, 0);   add("tree", -(hw - 4), hd - 3.5, 0);
    add("tree", hw - 4, -(hd - 3.5), 0); add("tree", -(hw - 4), -(hd - 3.5), 0);

    // ── Two big vendor kiosks facing into the square from east and west ──────
    add("kioskCart", hw - 4, 5, 270, { canopyColor: 0xc0392b });
    add("kioskCart", -(hw - 4), -5, 90, { canopyColor: 0x2980b9 });

    // ── A scatter of loose flowers ringing the fountain steps ───────────────
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const rad = fr + 1.9 + rng() * 0.5;
      const color = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
      add("flower", Math.cos(ang) * rad, Math.sin(ang) * rad, 0, { color, height: 0.36 });
    }

    return compose(parts);
  },
});
