// src/world/catalog/kioskCart.ts
//
// A detailed street vendor cart: two spoked wheels + axle, a planked wooden body,
// an overhanging counter top, a back shelf, crates of produce, a chalk menu board,
// a pull handle, and a striped canopy on four poles. Everything is derived from the
// cart dimensions. LOCAL space: base y=0, FRONT (counter / customer side) faces +z,
// ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, cylinderY, lowPolyBall, tintGeo, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeAwning } from "../objects/awning";
import { PALETTE } from "../palette";

interface KioskParams { canopyColor: number }

// A wheel lying in the Y-Z plane (axis along X) at (x,y,z): dark tire + light hub.
function wheel(parts: THREE.BufferGeometry[], r: number, x: number, y: number, z: number) {
  const tire = new THREE.CylinderGeometry(r, r, 0.18, 16);
  tire.rotateZ(Math.PI / 2);
  tire.translate(x, y, z);
  parts.push(tintGeo(tire, PALETTE.lampPole));
  const hub = new THREE.CylinderGeometry(r * 0.32, r * 0.32, 0.2, 10);
  hub.rotateZ(Math.PI / 2);
  hub.translate(x, y, z);
  parts.push(tintGeo(hub, PALETTE.steelLight));
}

defineObject("kioskCart", {
  params: { canopyColor: PALETTE.awningRed } as KioskParams,
  build(p: KioskParams) {
    const W = 2.6;   // along x
    const D = 1.3;   // along z (front +z)
    const wheelR = 0.5;
    const bodyBot = 0.85;
    const bodyH = 0.85;
    const bodyTop = bodyBot + bodyH;     // 1.7
    const wood = PALETTE.benchWood;
    const woodDark = PALETTE.caseWood;

    const parts: THREE.BufferGeometry[] = [];

    // wheels + axle
    wheel(parts, wheelR, -(W / 2 + 0.05), wheelR, 0);
    wheel(parts, wheelR, W / 2 + 0.05, wheelR, 0);
    parts.push(tintedBox(W + 0.2, 0.12, 0.12, 0, wheelR, 0, PALETTE.steelDark));

    // body
    parts.push(tintedBox(W, bodyH, D, 0, bodyBot + bodyH / 2, 0, wood));
    // plank seams on the front (+z) face
    const planks = 5;
    for (let i = 1; i < planks; i++) {
      const px = -W / 2 + (W / planks) * i;
      parts.push(tintedBox(0.05, bodyH - 0.1, 0.04, px, bodyBot + bodyH / 2, D / 2 + 0.02, woodDark));
    }
    // skirt trim along the bottom of the body
    parts.push(tintedBox(W + 0.05, 0.14, D + 0.05, 0, bodyBot + 0.07, 0, woodDark));

    // counter top (overhangs front)
    parts.push(tintedBox(W + 0.3, 0.12, D + 0.4, 0, bodyTop + 0.06, 0.05, PALETTE.caseWoodTop));

    // back shelf board rising above the counter (-z)
    const shelfTop = bodyTop + 0.9;
    parts.push(tintedBox(W, 0.9, 0.1, 0, bodyTop + 0.45, -D / 2 + 0.05, woodDark));
    parts.push(tintedBox(W, 0.08, 0.45, 0, shelfTop - 0.3, -D / 2 + 0.28, wood)); // mid shelf plank

    // crates of produce on the counter, with low-poly fruit
    const produce = [0xe0524a, 0xe08a3c, 0x5cc24a, 0xf2c14e, 0x7a4ea0];
    const counterY = bodyTop + 0.12;
    const nCrates = 3;
    for (let c = 0; c < nCrates; c++) {
      const cx = -W / 2 + (c + 0.5) * (W / nCrates);
      parts.push(tintedBox(0.55, 0.3, 0.55, cx, counterY + 0.15, 0.2, woodDark)); // crate
      // a little pile of fruit
      for (let k = 0; k < 3; k++) {
        const fx = cx + (k - 1) * 0.16;
        const col = produce[(c * 3 + k + (p.canopyColor & 7)) % produce.length];
        parts.push(lowPolyBall(0.13, fx, counterY + 0.36, 0.2 + (k % 2) * 0.12, col, 0));
      }
    }
    // a couple of goods on the back shelf
    for (let s = 0; s < 4; s++) {
      const sx = -W / 2 + (s + 0.5) * (W / 4);
      parts.push(tintedBox(0.32, 0.36, 0.22, sx, shelfTop - 0.12, -D / 2 + 0.28, produce[(s + 1) % produce.length]));
    }

    // chalk menu board hanging on the front of the body
    parts.push(tintedBox(0.9, 0.6, 0.05, -W / 2 + 0.7, bodyBot + bodyH / 2, D / 2 + 0.06, 0x2e2a26));
    parts.push(tintedBox(0.9, 0.08, 0.06, -W / 2 + 0.7, bodyBot + bodyH / 2 + 0.3, D / 2 + 0.07, woodDark)); // frame top

    // pull handle off the -x end, angled up
    const handle = new THREE.BoxGeometry(1.1, 0.1, 0.1);
    handle.rotateZ(0.32);
    handle.translate(-(W / 2 + 0.55), bodyBot + 0.1, 0);
    parts.push(tintGeo(handle, woodDark));

    // four canopy poles
    const poleTop = bodyTop + 1.35;
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        parts.push(cylinderY(0.05, poleTop - bodyTop, sx * (W / 2 - 0.1), (bodyTop + poleTop) / 2, sz * (D / 2 - 0.05), PALETTE.steelDark));
      }
    }

    const group = new THREE.Group();
    const merged = tintedMesh(mergeTinted(parts));
    merged.castShadow = true;
    group.add(merged);

    // striped canopy on top of the poles
    const canopy = tintedMesh(
      makeAwning({ w: W + 0.5, colorA: p.canopyColor, colorB: PALETTE.awningStripe, depth: D + 0.6 }),
    );
    canopy.position.set(0, poleTop, 0);
    canopy.castShadow = true;
    group.add(canopy);

    return {
      mesh: group,
      colliders: [{ x: 0, y: bodyBot + bodyH / 2, z: 0, hx: W / 2, hy: bodyH / 2 + 0.4, hz: D / 2 }],
      obstacles: [{ x: 0, z: 0, w: W + 0.4, d: D + 0.6 }],
    };
  },
});
