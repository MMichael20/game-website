// src/world/catalog/airport/cubeCloud.ts
//
// "cubeCloud" — a puffy flat-bottomed cluster of white cubes, placed high in the
// sky (the map has no y in placements, so the cloud carries its own `alt`).
// Mesh only — no colliders/obstacles. ~1u=1m. Deterministic via seed.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, mergeTinted } from "../../objects/voxel";
import { mulberry32 } from "../../rng";
import type { ObjectResult } from "../../system/types";

interface CloudParams { size: number; alt: number; seed: number }

defineObject("cubeCloud", {
  params: { size: 6, alt: 42, seed: 0xc10d } as CloudParams,
  build(p: CloudParams): ObjectResult {
    const { size, alt, seed } = p;
    const rng = mulberry32(seed);
    const parts: THREE.BufferGeometry[] = [];

    const unit = size / 4;
    // A flat-bottomed puff: a base row of cubes + a few stacked on top.
    const baseN = 4 + Math.floor(rng() * 3);
    let x = -(baseN * unit) / 2;
    for (let i = 0; i < baseN; i++) {
      const s = unit * (0.9 + rng() * 0.5);
      const z = (rng() - 0.5) * unit;
      parts.push(tintedBox(s, s * 0.8, s, x + s / 2, alt, z, 0xffffff));
      // Occasional second tier
      if (rng() > 0.5) {
        const s2 = s * 0.8;
        parts.push(tintedBox(s2, s2 * 0.8, s2, x + s / 2 + (rng() - 0.5) * unit, alt + s * 0.6, z, 0xfdfdff));
      }
      x += s * 0.85;
    }

    // Cloud lighting: a plain unlit-ish white material so it reads bright in sky.
    const geo = mergeTinted(parts);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1.0, metalness: 0.0,
      emissive: 0xffffff, emissiveIntensity: 0.25,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    return { mesh, colliders: [], obstacles: [] };
  },
});
