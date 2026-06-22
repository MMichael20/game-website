// src/world/catalog/airport/dutyFreeShop.ts
//
// "dutyFreeShop" — a retail unit with a glass front, sign band, gondola shelves, and checkout.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z. ~1u = 1m. Fully deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { buildObject } from "../../system/registry";
import { applyTransform } from "../../system/transform";
import {
  tintedBox, cylinderY, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeGlassPanel } from "../../objects/glass";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import { mulberry32 } from "../../rng";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Product box color palette
const PRODUCT_COLORS = [
  0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad,
  0x16a085, 0xe67e22, 0x2c3e50, 0xd35400, 0x1abc9c,
  0xe74c3c, 0x3498db, 0x9b59b6, 0xf1c40f, 0x1a5fa0,
];

const SHELF_EDGE    = 0xd0ccc4;  // slightly darker shelf edge
const COUNTER_TOP   = 0xf0ede6;  // checkout counter top
const COUNTER_BODY  = 0xe0ddd8;  // counter body
const FLOOR_TILE    = 0xf0ece4;  // bright interior floor
const CEILING_COLOR = 0xeeebe6;  // ceiling
const SPOT_COLOR    = 0xffffee;  // warm spotlight color

interface DutyFreeShopParams {
  w: number;
  d: number;
  name: string;
  accent: number;
}

defineObject("dutyFreeShop", {
  params: { w: 10, d: 8, name: "Duty Free", accent: 0x2980b9 } as DutyFreeShopParams,
  build(p: DutyFreeShopParams): ObjectResult {
    const { w, d, accent } = p;
    const hW = w / 2;
    const hD = d / 2;
    const rng = mulberry32(0xdf001234);

    const group = new THREE.Group();
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];

    // ── Shell via buildingShell ────────────────────────────────────────────
    const shellH = 5;
    const shellResult = buildObject("buildingShell", { w, d, h: shellH });
    const shellXformed = applyTransform(shellResult, { x: 0, z: 0, rot: 0 });
    group.add(shellXformed.mesh);
    if (shellXformed.colliders) colliders.push(...shellXformed.colliders);

    // ── Interior floor ─────────────────────────────────────────────────────
    const floorT = 0.08;
    const floorParts: THREE.BufferGeometry[] = [];
    floorParts.push(tintedBox(w - 0.06, floorT, d - 0.06, 0, floorT / 2, 0, FLOOR_TILE));
    // Floor tile grid
    const TILE = 1.0;
    for (let xi = 1; xi < Math.floor(w / TILE); xi++) {
      const tx = -hW + xi * TILE;
      floorParts.push(tintedBox(0.04, floorT + 0.005, d, tx, floorT / 2, 0, 0xd8d4cc));
    }
    for (let zi = 1; zi < Math.floor(d / TILE); zi++) {
      const tz = -hD + zi * TILE;
      floorParts.push(tintedBox(w, floorT + 0.005, 0.04, 0, floorT / 2, tz, 0xd8d4cc));
    }

    // ── Glass front bays ──────────────────────────────────────────────────
    // Cover most of +z face with glass panels; keep ~0.8m door gap at center
    const BAY_W     = (w - 1.2) / 3;
    const glassH    = shellH - 0.4;
    for (let bi = 0; bi < 3; bi++) {
      const bx = -w / 2 + 0.6 + bi * BAY_W + BAY_W / 2;
      const panel = makeGlassPanel({
        w: BAY_W - 0.14,
        h: glassH,
        divisions: 3,
        door: bi === 1,  // center bay has door
        opacity: 0.38,
        tint: 0x9fd8ff,
        frameColor: PALETTE.frame,
      });
      panel.position.set(bx, 0, hD);
      group.add(panel);
    }

    // ── Lit sign band above entrance ───────────────────────────────────────
    const signBandW = w * 0.7;
    const signBandH = 0.75;
    const signBandY = shellH - 0.65;
    const signBand = makeTextSignMesh({
      text: p.name,
      w: signBandW,
      h: signBandH,
      boardColor: accent,
      textColor: "#ffffff",
      glow: 0.9,
    });
    signBand.position.set(-signBandW / 2, signBandY, hD + DECAL_GAP);
    group.add(signBand);

    // Sign band side brackets
    floorParts.push(tintedBox(0.08, 0.1, 0.22, -signBandW / 2 - 0.04, signBandY + 0.35, hD + 0.06, PALETTE.steel));
    floorParts.push(tintedBox(0.08, 0.1, 0.22, signBandW / 2 + 0.04, signBandY + 0.35, hD + 0.06, PALETTE.steel));

    // ── Gondola shelving units (2 rows of 3 units each) ────────────────────
    // Gondola: a rectangular cabinet with shelves baked as horizontal slabs
    // and products stacked on each shelf.
    const GONDOLA_W   = w / 3 - 0.5;
    const GONDOLA_H   = 1.65;
    const GONDOLA_D   = 0.55;
    const SHELF_COUNT = 4;
    const GONDOLA_COL = 0xf0ede6;

    const gondolaZs = [-hD + GONDOLA_D / 2 + 0.35, -hD + GONDOLA_D / 2 + 0.35 + GONDOLA_D + 1.6];
    for (const gz of gondolaZs) {
      for (let gi = 0; gi < 3; gi++) {
        const gx = -hW + 0.4 + gi * (GONDOLA_W + 0.45) + GONDOLA_W / 2;

        // Gondola body (cabinet)
        floorParts.push(tintedBox(GONDOLA_W, GONDOLA_H, GONDOLA_D, gx, GONDOLA_H / 2, gz, GONDOLA_COL));
        // Top cap
        floorParts.push(tintedBox(GONDOLA_W + 0.04, 0.06, GONDOLA_D + 0.04, gx, GONDOLA_H + 0.03, gz, SHELF_EDGE));
        // Shelf boards (horizontal dividers)
        for (let si = 1; si < SHELF_COUNT; si++) {
          const sy = (GONDOLA_H / SHELF_COUNT) * si;
          floorParts.push(tintedBox(GONDOLA_W - 0.04, 0.04, GONDOLA_D - 0.04, gx, sy, gz, SHELF_EDGE));
        }
        // Products on each shelf (3 items per shelf, varied colors)
        for (let si = 0; si < SHELF_COUNT; si++) {
          const shelfY = (GONDOLA_H / SHELF_COUNT) * si + 0.04;
          const nProds = 4;
          for (let pi = 0; pi < nProds; pi++) {
            const px = gx - GONDOLA_W / 2 + 0.1 + pi * ((GONDOLA_W - 0.15) / nProds);
            const prodH = 0.12 + rng() * 0.16;
            const prodW = 0.08 + rng() * 0.06;
            const col = PRODUCT_COLORS[Math.floor(rng() * PRODUCT_COLORS.length)];
            floorParts.push(tintedBox(prodW, prodH, prodW, px, shelfY + prodH / 2, gz, col));
            // Product label (small white strip)
            floorParts.push(tintedBox(prodW - 0.01, 0.04, 0.02, px, shelfY + prodH * 0.3, gz + GONDOLA_D / 2 + DECAL_GAP, 0xffffff));
          }
        }

        // Gondola collider
        colliders.push(solidBox(gx, GONDOLA_H / 2, gz, GONDOLA_W + 0.04, GONDOLA_H + 0.06, GONDOLA_D + 0.04));
        obstacles.push({ x: gx, z: gz, w: GONDOLA_W + 0.3, d: GONDOLA_D + 0.6 });
      }
    }

    // ── Checkout counter near front (+z side) ─────────────────────────────
    const ctW = 2.6;
    const ctH = 1.05;
    const ctD = 0.8;
    const ctX = hW - ctW / 2 - 0.3;  // right side of shop floor
    const ctZ = hD - ctD / 2 - 0.55;

    // Counter body
    floorParts.push(tintedBox(ctW, ctH, ctD, ctX, ctH / 2, ctZ, COUNTER_BODY));
    // Counter top slab (proud)
    floorParts.push(tintedBox(ctW + 0.08, 0.08, ctD + 0.08, ctX, ctH + 0.04, ctZ, COUNTER_TOP));
    // Accent fascia strip
    floorParts.push(tintedBox(ctW, 0.16, 0.04, ctX, ctH - 0.08, ctZ + ctD / 2, accent));
    // Vertical divider panels inside counter
    for (const dx of [-ctW * 0.25, ctW * 0.25]) {
      floorParts.push(tintedBox(0.04, ctH, ctD, ctX + dx, ctH / 2, ctZ, SHELF_EDGE));
    }
    // Register / POS terminal on counter
    floorParts.push(tintedBox(0.3, 0.28, 0.22, ctX - 0.5, ctH + 0.14, ctZ - 0.08, 0x222222));
    floorParts.push(tintedBox(0.25, 0.2, 0.02, ctX - 0.5, ctH + 0.24, ctZ - 0.2, 0x1a6bbf));  // screen
    // Small product display on counter (perfume vibe)
    for (let pi = 0; pi < 3; pi++) {
      const col = PRODUCT_COLORS[(pi + 7) % PRODUCT_COLORS.length];
      floorParts.push(tintedBox(0.1, 0.22 + pi * 0.04, 0.08, ctX + 0.3 + pi * 0.16, ctH + 0.13, ctZ, col));
    }

    colliders.push(solidBox(ctX, ctH / 2, ctZ, ctW + 0.1, ctH + 0.1, ctD + 0.1));
    obstacles.push({ x: ctX, z: ctZ, w: ctW + 0.4, d: ctD + 0.6 });

    // ── Ceiling spotlights ─────────────────────────────────────────────────
    const ceilY = shellH - 0.08;
    const spotRows = 2;
    const spotCols = 4;
    for (let sr = 0; sr < spotRows; sr++) {
      for (let sc = 0; sc < spotCols; sc++) {
        const sx = -hW + 1.2 + sc * ((w - 2.0) / (spotCols - 1));
        const sz = -hD + 1.5 + sr * ((d - 2.5) / (spotRows - 1));
        floorParts.push(tintedBox(0.12, 0.12, 0.12, sx, ceilY, sz, SPOT_COLOR));
        cylinderY(0.06, 0.22, sx, ceilY - 0.11, sz, 0x444444, 8);
        floorParts.push(cylinderY(0.06, 0.22, sx, ceilY - 0.11, sz, 0x444444, 8));
      }
    }
    // Ceiling slab
    floorParts.push(tintedBox(w - 0.06, 0.14, d - 0.06, 0, ceilY + 0.07, 0, CEILING_COLOR));

    // ── Merge geometry ─────────────────────────────────────────────────────
    const interiorMesh = tintedMesh(mergeTinted(floorParts));
    interiorMesh.castShadow = true;
    interiorMesh.receiveShadow = true;
    group.add(interiorMesh);

    return {
      mesh: group,
      colliders,
      obstacles,
    };
  },
});
