// src/world/catalog/kioskCart.ts
//
// A big, colorful street vendor cart: two spoked wheels + axle, a planked wooden
// body, an overhanging counter, a tall back shelf packed with goods, crates and a
// barrel of produce, a side flower box, a chalk menu board, a pull handle, and a
// striped canopy strung with bunting flags and fairy lights. Everything is derived
// from the cart dimensions. LOCAL space: base y=0, FRONT (counter side) faces +z.

import * as THREE from "three";
import { tintedBox, cylinderY, lowPolyBall, tintGeo, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeAwning } from "../objects/awning";
import { defineObject } from "../system/registry";
import { PALETTE } from "../palette";

interface KioskParams { canopyColor: number }

const PRODUCE = [0xe0524a, 0xe08a3c, 0x5cc24a, 0xf2c14e, 0x7a4ea0, 0xe85d9a, 0x3aa0a0];
const BUNTING = [0xe0524a, 0xf2c14e, 0x2f7fb0, 0x5cc24a, 0xf3efe6];

// A wheel lying in the Y-Z plane (axis along X): dark tire + light hub + spokes.
function wheel(parts: THREE.BufferGeometry[], r: number, x: number, y: number, z: number) {
  const tire = new THREE.CylinderGeometry(r, r, 0.2, 18);
  tire.rotateZ(Math.PI / 2); tire.translate(x, y, z);
  parts.push(tintGeo(tire, PALETTE.lampPole));
  const hub = new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.24, 12);
  hub.rotateZ(Math.PI / 2); hub.translate(x, y, z);
  parts.push(tintGeo(hub, PALETTE.steelLight));
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * Math.PI * 2;
    const spoke = new THREE.BoxGeometry(0.08, r * 1.6, 0.06);
    spoke.rotateX(a); spoke.translate(x, y, z);
    parts.push(tintGeo(spoke, PALETTE.steelDark));
  }
}

defineObject("kioskCart", {
  params: { canopyColor: PALETTE.awningRed } as KioskParams,
  build(p: KioskParams) {
    const W = 3.6;   // along x
    const D = 1.8;   // along z (front +z)
    const wheelR = 0.62;
    const bodyBot = 1.05;
    const bodyH = 1.05;
    const bodyTop = bodyBot + bodyH;     // 2.1
    const wood = PALETTE.benchWood;
    const woodDark = PALETTE.caseWood;

    const parts: THREE.BufferGeometry[] = [];

    // wheels + axle
    wheel(parts, wheelR, -(W / 2 + 0.06), wheelR, 0);
    wheel(parts, wheelR, W / 2 + 0.06, wheelR, 0);
    parts.push(tintedBox(W + 0.25, 0.14, 0.14, 0, wheelR, 0, PALETTE.steelDark));

    // body + plank seams + skirt
    parts.push(tintedBox(W, bodyH, D, 0, bodyBot + bodyH / 2, 0, wood));
    const planks = 6;
    for (let i = 1; i < planks; i++) {
      const px = -W / 2 + (W / planks) * i;
      parts.push(tintedBox(0.06, bodyH - 0.1, 0.04, px, bodyBot + bodyH / 2, D / 2 + 0.02, woodDark));
    }
    parts.push(tintedBox(W + 0.06, 0.18, D + 0.06, 0, bodyBot + 0.09, 0, woodDark));

    // counter top (overhangs front)
    parts.push(tintedBox(W + 0.4, 0.14, D + 0.5, 0, bodyTop + 0.07, 0.06, PALETTE.caseWoodTop));

    // back shelf board + mid plank (-z)
    const shelfTop = bodyTop + 1.15;
    parts.push(tintedBox(W, 1.15, 0.12, 0, bodyTop + 0.575, -D / 2 + 0.06, woodDark));
    parts.push(tintedBox(W, 0.1, 0.5, 0, shelfTop - 0.45, -D / 2 + 0.3, wood));

    // crates of produce on the counter, with low-poly fruit piles
    const counterY = bodyTop + 0.14;
    const nCrates = 4;
    for (let c = 0; c < nCrates; c++) {
      const cx = -W / 2 + (c + 0.5) * (W / nCrates);
      parts.push(tintedBox(0.62, 0.34, 0.62, cx, counterY + 0.17, 0.28, woodDark));
      for (let k = 0; k < 4; k++) {
        const fx = cx + ((k % 2) - 0.5) * 0.28;
        const fz = 0.28 + (k < 2 ? -0.12 : 0.12);
        parts.push(lowPolyBall(0.15, fx, counterY + 0.42, fz, PRODUCE[(c * 4 + k + (p.canopyColor & 7)) % PRODUCE.length], 0));
      }
    }
    // goods stacked on the back shelf
    for (let s = 0; s < 5; s++) {
      const sx = -W / 2 + (s + 0.5) * (W / 5);
      parts.push(tintedBox(0.36, 0.44, 0.26, sx, shelfTop - 0.18, -D / 2 + 0.3, PRODUCE[(s + 2) % PRODUCE.length]));
    }

    // a barrel of produce beside the cart (+x end)
    const barrel = new THREE.CylinderGeometry(0.42, 0.46, 1.0, 14);
    barrel.translate(W / 2 + 0.7, 0.5, 0.2);
    parts.push(tintGeo(barrel, woodDark));
    parts.push(tintedBox(0.9, 0.12, 0.9, W / 2 + 0.7, 1.0, 0.2, woodDark));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      parts.push(lowPolyBall(0.17, W / 2 + 0.7 + Math.cos(a) * 0.2, 1.18, 0.2 + Math.sin(a) * 0.2, PRODUCE[k % PRODUCE.length], 0));
    }

    // side flower box on the -x end
    parts.push(tintedBox(0.7, 0.34, 1.0, -(W / 2 + 0.45), bodyBot + 0.17, 0, woodDark));
    for (let k = 0; k < 3; k++) {
      parts.push(lowPolyBall(0.16, -(W / 2 + 0.45), bodyBot + 0.4, -0.3 + k * 0.3, BUNTING[k % BUNTING.length], 0));
    }

    // bright chalk menu board on the body front
    parts.push(tintedBox(1.1, 0.78, 0.05, -W / 2 + 0.85, bodyBot + bodyH / 2, D / 2 + 0.07, 0x2e2a26));
    parts.push(tintedBox(1.16, 0.1, 0.06, -W / 2 + 0.85, bodyBot + bodyH / 2 + 0.4, D / 2 + 0.08, p.canopyColor));
    for (let i = 0; i < 3; i++) {
      parts.push(tintedBox(0.7, 0.07, 0.06, -W / 2 + 0.85, bodyBot + bodyH / 2 + 0.1 - i * 0.18, D / 2 + 0.085, BUNTING[i % BUNTING.length]));
    }

    // pull handle off the -x end, angled up
    const handle = new THREE.BoxGeometry(1.3, 0.12, 0.12);
    handle.rotateZ(0.34); handle.translate(-(W / 2 + 0.85), bodyBot + 0.15, 0);
    parts.push(tintGeo(handle, woodDark));

    // four canopy poles
    const poleTop = bodyTop + 1.75;
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        parts.push(cylinderY(0.06, poleTop - bodyTop, sx * (W / 2 - 0.1), (bodyTop + poleTop) / 2, sz * (D / 2 - 0.05), PALETTE.steelDark));
      }
    }

    // bunting flags + fairy lights strung along the front canopy edge
    const frontZ = D / 2 + 0.45;
    const nFlags = 9;
    for (let i = 0; i < nFlags; i++) {
      const fx = -W / 2 + (i + 0.5) * (W / nFlags);
      const flag = new THREE.BoxGeometry(0.26, 0.3, 0.04);
      flag.rotateZ(Math.PI / 4);
      flag.translate(fx, poleTop - 0.18, frontZ);
      parts.push(tintGeo(flag, BUNTING[i % BUNTING.length]));
      parts.push(lowPolyBall(0.07, fx + W / nFlags / 2, poleTop - 0.05, frontZ, PALETTE.lantern, 0));
    }

    const group = new THREE.Group();
    const merged = tintedMesh(mergeTinted(parts));
    merged.castShadow = true;
    group.add(merged);

    // big striped canopy on the poles
    const canopy = tintedMesh(
      makeAwning({ w: W + 0.7, colorA: p.canopyColor, colorB: PALETTE.awningStripe, depth: D + 0.9, stripes: 10 }),
    );
    canopy.position.set(0, poleTop, -0.1);
    canopy.castShadow = true;
    group.add(canopy);

    return {
      mesh: group,
      colliders: [{ x: 0, y: bodyBot + bodyH / 2, z: 0, hx: W / 2 + 0.3, hy: bodyH / 2 + 0.5, hz: D / 2 }],
      obstacles: [{ x: 0, z: 0, w: W + 1.4, d: D + 0.9 }],
    };
  },
});
