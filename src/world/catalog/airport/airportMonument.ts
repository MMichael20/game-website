// src/world/catalog/airport/airportMonument.ts
//
// "airportMonument" — a landside entry monument for Ben Gurion Airport.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z (text faces +z).
// ~1u = 1m. Fully deterministic — no Math.random / Date.now.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, lowPolyBall, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Israeli flag colors
const ISRAEL_BLUE  = 0x0038b8;
const FLAG_WHITE   = 0xffffff;
// Additional palette colors
const STONE_DARK   = 0x82796e; // darker stone for step accent
const POLE_COLOR   = PALETTE.steel;
const FINIAL_COLOR = PALETTE.steelLight;

interface AirportMonumentParams {
  // no configurable params — monument is a fixed landmark
}

defineObject("airportMonument", {
  params: {} as AirportMonumentParams,
  build(_p: AirportMonumentParams): ObjectResult {
    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const group = new THREE.Group();

    // ── Plinth (three-stepped stone base) ───────────────────────────────────
    // Step 1 — widest, lowest
    const step1W = 12, step1D = 3.5, step1H = 0.35;
    parts.push(tintedBox(step1W, step1H, step1D, 0, step1H / 2, 0, PALETTE.stoneBase));
    // Step 2 — narrower, middle
    const step2W = 10, step2D = 3.0, step2H = 0.35;
    parts.push(tintedBox(step2W, step2H, step2D, 0, step1H + step2H / 2, 0, STONE_DARK));
    // Step 3 — sign body (main mass)
    const bodyW = 9, bodyD = 0.8, bodyH = 2.4;
    const bodyBaseY = step1H + step2H;
    parts.push(tintedBox(bodyW, bodyH, bodyD, 0, bodyBaseY + bodyH / 2, 0, PALETTE.stoneBase));
    // Top cap — narrow stone coping
    const capH = 0.18;
    parts.push(tintedBox(bodyW + 0.1, capH, bodyD + 0.1, 0, bodyBaseY + bodyH + capH / 2, 0, STONE_DARK));
    // Plinth collider (main body)
    colliders.push(solidBox(0, (step1H + step2H + bodyH) / 2, 0, bodyW, step1H + step2H + bodyH, bodyD));

    // ── Text signs on the plinth ─────────────────────────────────────────────
    // Top board: "Ben Gurion Airport" (English)
    const topSign = makeTextSignMesh({
      text: "Ben Gurion Airport",
      w: 8,
      h: 1.2,
      boardColor: ISRAEL_BLUE,
      textColor: "#ffffff",
      glow: 0.9,
    });
    // Position: front face of body is at z = bodyD/2. Sign back at z=bodyD/2 + DECAL_GAP
    topSign.position.set(
      -4,
      bodyBaseY + 0.15,
      bodyD / 2 + DECAL_GAP,
    );
    group.add(topSign);

    // Lower board: Hebrew "נמל התעופה בן-גוריון"
    const hebrewSign = makeTextSignMesh({
      text: "נמל התעופה בן-גוריון",
      w: 8,
      h: 1.0,
      boardColor: ISRAEL_BLUE,
      textColor: "#ffffff",
      glow: 0.85,
    });
    hebrewSign.position.set(
      -4,
      bodyBaseY + 0.15 + 1.2 + 0.12,
      bodyD / 2 + DECAL_GAP,
    );
    group.add(hebrewSign);

    // ── Flag poles ────────────────────────────────────────────────────────────
    const POLE_H = 8.0;
    const POLE_R = 0.06;
    const POLE_X = 7.5; // offset from center (flanking)
    const POLE_BASE_H = 0.35;
    const POLE_BASE_R = 0.18;

    for (const sx of [-1, 1] as const) {
      const px = sx * POLE_X;

      // Pole base pedestal
      parts.push(cylinderY(POLE_BASE_R, POLE_BASE_H, px, POLE_BASE_H / 2, 0, PALETTE.stoneBase));
      colliders.push(solidBox(px, POLE_BASE_H / 2, 0, POLE_BASE_R * 2, POLE_BASE_H, POLE_BASE_R * 2));

      // Pole shaft
      parts.push(cylinderY(POLE_R, POLE_H, px, POLE_H / 2, 0, POLE_COLOR));
      colliders.push(solidBox(px, POLE_H / 2, 0, POLE_R * 2, POLE_H, POLE_R * 2));

      // Finial ball on top
      parts.push(lowPolyBall(0.12, px, POLE_H + 0.12, 0, FINIAL_COLOR, 0));

      // ── Israeli flag ──────────────────────────────────────────────────────
      // Flag dimensions: ~1.8m wide, ~1.2m tall, mounted near top of pole
      const FW = 1.8;   // flag width
      const FH = 1.2;   // flag height
      const FLAG_Y = POLE_H - FH - 0.3; // top of flag near pole top
      const FLAG_Z = FW / 2 + POLE_R; // flag extends away from pole in +z direction
      // (on left pole flags extend -z, right pole +z to look symmetrical)
      const fz = sx * FLAG_Z;
      const flagOriginX = px + POLE_R;
      const flagMidY = FLAG_Y + FH / 2;

      // White background field
      parts.push(tintedBox(FW, FH, 0.05, flagOriginX + FW / 2 * (sx < 0 ? -1 : 1), flagMidY, fz, FLAG_WHITE));

      // Blue stripe top (near top of white field)
      const STRIPE_H = 0.16;
      const STRIPE_INSET = 0.14; // from top/bottom of flag
      parts.push(tintedBox(FW, STRIPE_H, 0.06,
        flagOriginX + FW / 2 * (sx < 0 ? -1 : 1),
        FLAG_Y + FH - STRIPE_INSET - STRIPE_H / 2,
        fz, ISRAEL_BLUE));
      // Blue stripe bottom
      parts.push(tintedBox(FW, STRIPE_H, 0.06,
        flagOriginX + FW / 2 * (sx < 0 ? -1 : 1),
        FLAG_Y + STRIPE_INSET + STRIPE_H / 2,
        fz, ISRAEL_BLUE));

      // Star of David hint — two thin overlapping blue boxes forming a 6-point star
      // A simple approximation: one horizontal bar + one vertical bar + two diagonal bars
      const STAR_CX = flagOriginX + FW / 2 * (sx < 0 ? -1 : 1);
      const STAR_CY = flagMidY;
      const STAR_CZ = fz;
      const BAR_L = 0.38;
      const BAR_T = 0.07;
      const BAR_D = 0.07;
      // Horizontal bar
      parts.push(tintedBox(BAR_L, BAR_T, BAR_D, STAR_CX, STAR_CY, STAR_CZ, ISRAEL_BLUE));
      // Vertical bar
      parts.push(tintedBox(BAR_T, BAR_L, BAR_D, STAR_CX, STAR_CY, STAR_CZ, ISRAEL_BLUE));
      // Diagonal bars (rotated via separate scaled boxes at +/- 60 deg approximation)
      // Approximate with two shorter diagonal bars
      const D_L = 0.28;
      const D_T = 0.055;
      // Using tintedBox and slight offset for upper-left/lower-right diagonal
      parts.push(tintedBox(D_T, D_L, BAR_D, STAR_CX - 0.1, STAR_CY + 0.05, STAR_CZ, ISRAEL_BLUE));
      parts.push(tintedBox(D_T, D_L, BAR_D, STAR_CX + 0.1, STAR_CY + 0.05, STAR_CZ, ISRAEL_BLUE));
    }

    // ── Merge opaque geometry into one mesh ──────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

    // ── Obstacles ─────────────────────────────────────────────────────────────
    // Plinth footprint + two pole bases
    const obstacles: Rect[] = [
      { x: 0, z: 0, w: bodyW, d: Math.max(step1D, bodyD) },
      { x: -POLE_X, z: 0, w: POLE_BASE_R * 2, d: POLE_BASE_R * 2 },
      { x:  POLE_X, z: 0, w: POLE_BASE_R * 2, d: POLE_BASE_R * 2 },
    ];

    return { mesh: group, colliders, obstacles };
  },
});
