// src/world/catalog/trafficLight.ts
//
// A street traffic signal: dark pole + a horizontal mast arm reaching over the
// road (-z) + a signal head with red/amber/green lamps facing -z. Every offset is
// derived from `height` / the arm length. LOCAL space: base y=0, signal faces -z.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../objects/voxel";
import { PALETTE } from "../palette";

interface TLParams { height: number }

defineObject("trafficLight", {
  params: { height: 5 } as TLParams,
  build(p: TLParams) {
    const pole = PALETTE.lampPole;
    const armLen = 3;
    const parts: THREE.BufferGeometry[] = [];

    // pole + base
    parts.push(cylinderY(0.13, p.height, 0, p.height / 2, 0, pole));
    parts.push(tintedBox(0.5, 0.25, 0.5, 0, 0.12, 0, PALETTE.steelDark));

    // mast arm reaching over the road (-z) near the top
    const armY = p.height - 0.25;
    parts.push(tintedBox(0.12, 0.12, armLen, 0, armY, -armLen / 2, pole));

    // signal head box hanging at the arm end
    const headZ = -armLen;
    const headH = 1.2;
    const headCY = armY - headH / 2 - 0.05;
    parts.push(tintedBox(0.5, headH, 0.4, 0, headCY, headZ, PALETTE.steelDark));

    // three lamps on the -z face, positions derived from the head height
    const lamps = [PALETTE.flowerRed, 0xf2a93b, PALETTE.leaf]; // red / amber / green
    for (let i = 0; i < 3; i++) {
      const ly = headCY + headH / 2 - 0.3 - i * 0.35;
      parts.push(tintedBox(0.26, 0.26, 0.08, 0, ly, headZ - 0.22, lamps[i]));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return {
      mesh,
      colliders: [{ x: 0, y: p.height / 2, z: 0, hx: 0.2, hy: p.height / 2, hz: 0.2 }],
      obstacles: [{ x: 0, z: 0, w: 0.5, d: 0.5 }],
    };
  },
});
