// src/world/catalog/airport/floodlightMast.ts
//
// "floodlightMast" — a tall apron flood-light pole with an angled head carrying a
// bank of emissive lamp cubes. base y=0, centered. ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

interface MastParams { h: number; lamps: number }

defineObject("floodlightMast", {
  params: { h: 16, lamps: 6 } as MastParams,
  build(p: MastParams): ObjectResult {
    const { h, lamps } = p;
    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    // Concrete footing
    parts.push(tintedBox(0.8, 0.4, 0.8, 0, 0.2, 0, 0xb8b3a6));
    // Pole
    parts.push(cylinderY(0.16, h, 0, h / 2, 0, PALETTE.lampPole, 10));
    // Cross arm / head frame at top, tilted
    const headY = h - 0.4;
    const headW = 2.2;
    parts.push(tintedBox(headW, 0.18, 0.6, 0, headY, 0.3, PALETTE.steelDark));
    parts.push(tintedBox(0.12, 0.7, 0.12, -headW * 0.3, headY - 0.4, 0.3, PALETTE.steelDark));
    parts.push(tintedBox(0.12, 0.7, 0.12,  headW * 0.3, headY - 0.4, 0.3, PALETTE.steelDark));

    const opaque = tintedMesh(mergeTinted(parts));
    opaque.castShadow = true;
    group.add(opaque);

    // Emissive lamp bank
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffe9b0, emissive: 0xffe9b0, emissiveIntensity: 1.2, roughness: 0.4,
    });
    const perRow = Math.ceil(lamps / 2);
    for (let i = 0; i < lamps; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const lx = -headW * 0.32 + col * (headW * 0.64 / Math.max(1, perRow - 1));
      const ly = headY + 0.18 + row * 0.28;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.18), lampMat);
      lamp.position.set(lx, ly, 0.55);
      lamp.rotation.x = 0.4;
      group.add(lamp);
    }

    const colliders: Box[] = [solidBox(0, h / 2, 0, 0.4, h, 0.4)];
    const obstacles: Rect[] = [{ x: 0, z: 0, w: 0.9, d: 0.9 }];
    return { mesh: group, colliders, obstacles };
  },
});
