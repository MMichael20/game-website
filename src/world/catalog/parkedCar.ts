// src/world/catalog/parkedCar.ts
//
// Static scenery parked car — NOT the drivable Car entity.
// ~4.2m long (x) × 1.8m wide (z) × ~1.5m tall.
// All child positions derived from part dimensions.

import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { PALETTE } from "../palette";

// Part dimensions — used to derive positions.
const BODY_W = 4.2;
const BODY_H = 0.7;
const BODY_D = 1.7;
const BODY_Y = BODY_H / 2 + 0.35;       // body sits above wheel centers (~0.35m off ground)

const CABIN_W = 2.4;
const CABIN_H = 0.7;
const CABIN_D = 1.5;
const CABIN_Y = BODY_Y + BODY_H / 2 + CABIN_H / 2;  // cabin sits on top of body

const WHEEL_W = 0.7;
const WHEEL_H = 0.7;
const WHEEL_D = 0.32;
const WHEEL_Y = WHEEL_H / 2;                          // base at y=0
const WHEEL_X = 1.3;                                  // from center (axle offset)
const WHEEL_Z = (BODY_D / 2 - WHEEL_D / 2) + 0.18;  // flush with body side

// Glass panel thickness (thin decal panels on cabin faces)
const GLASS_T = 0.04;
const GLASS_COLOR = PALETTE.glass;

// Light dimensions
const LIGHT_W = 0.18;
const LIGHT_H = 0.14;
const LIGHT_D = 0.06;
const LIGHT_Y = BODY_Y + 0.05;   // mid-height on body end face
const LIGHT_Z_OFFSET = 0.38;     // left/right of center
const LIGHT_X = BODY_W / 2 + LIGHT_D / 2;  // flush with body end face

defineObject("parkedCar", {
  params: { color: 0x3366aa },
  build(p: { color: number }) {
    const { color } = p;

    const parts: ReturnType<typeof tintedBox>[] = [];

    // Lower body
    parts.push(tintedBox(BODY_W, BODY_H, BODY_D, 0, BODY_Y, 0, color));

    // Cabin
    parts.push(tintedBox(CABIN_W, CABIN_H, CABIN_D, 0, CABIN_Y, 0, color));

    // Windscreen (front cabin face, +x side)
    const windscreenX = CABIN_W / 2 - GLASS_T / 2;
    parts.push(tintedBox(GLASS_T, CABIN_H * 0.85, CABIN_D * 0.85, windscreenX, CABIN_Y, 0, GLASS_COLOR));

    // Rear window (-x side)
    parts.push(tintedBox(GLASS_T, CABIN_H * 0.85, CABIN_D * 0.85, -windscreenX, CABIN_Y, 0, GLASS_COLOR));

    // Side windows (z faces of cabin)
    const sideGlassZ = CABIN_D / 2 - GLASS_T / 2;
    parts.push(tintedBox(CABIN_W * 0.75, CABIN_H * 0.75, GLASS_T, 0, CABIN_Y, sideGlassZ,  GLASS_COLOR));
    parts.push(tintedBox(CABIN_W * 0.75, CABIN_H * 0.75, GLASS_T, 0, CABIN_Y, -sideGlassZ, GLASS_COLOR));

    // 4 wheels
    const wheelColor = 0x1a1a1e;
    for (const sx of [1, -1]) {
      for (const sz of [1, -1]) {
        parts.push(tintedBox(WHEEL_W, WHEEL_H, WHEEL_D, sx * WHEEL_X, WHEEL_Y, sz * WHEEL_Z, wheelColor));
      }
    }

    // Headlights (front, +x)
    for (const sz of [1, -1]) {
      parts.push(tintedBox(LIGHT_D, LIGHT_H, LIGHT_W, LIGHT_X, LIGHT_Y, sz * LIGHT_Z_OFFSET, 0xfff4e0));
    }

    // Taillights (rear, -x)
    for (const sz of [1, -1]) {
      parts.push(tintedBox(LIGHT_D, LIGHT_H, LIGHT_W, -LIGHT_X, LIGHT_Y, sz * LIGHT_Z_OFFSET, 0xe0524a));
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return {
      mesh,
      colliders: [{ x: 0, y: 0.75, z: 0, hx: 2.1, hy: 0.75, hz: 0.9 }],
      obstacles: [{ x: 0, z: 0, w: 4.2, d: 1.8 }],
    };
  },
});
