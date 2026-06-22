// src/world/catalog/airport/airportSeating.ts
//
// "airportSeating" — linked beam airport seat row. A steel beam on legs with
// seat pads, optional backrests, and armrests. Front (+z = passenger faces +z).
// LOCAL space: centered x=z=0, base y=0. ~1u = 1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, mergeTinted, tintedMesh,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Rect, Seat } from "../../system/types";

// ─── Colors ──────────────────────────────────────────────────────────────────
const BEAM_COLOR    = PALETTE.steelDark;    // main steel beam
const LEG_COLOR     = PALETTE.steel;        // legs
const ARM_COLOR     = PALETTE.steelLight;   // armrests
const SEAT_COLOR    = 0x1e2e42;            // dark navy seat cushion
const BACK_COLOR    = 0x1a2838;            // slightly darker backrest
const SEAT_TRIM     = 0x3a4e62;            // seat trim/edge
const SCREW_COLOR   = PALETTE.steelLight;  // bolt/screw accent

// ─── Dimensions ──────────────────────────────────────────────────────────────
const SEAT_W     = 0.52;   // individual seat width
const SEAT_D     = 0.46;   // seat depth (front to back)
const SEAT_PAD_H = 0.1;    // seat cushion height
const SEAT_Y     = 0.42;   // height of seat top surface from ground
const BEAM_H     = 0.08;   // beam cross-section height
const BEAM_D     = 0.08;   // beam cross-section depth
const LEG_R      = 0.04;   // leg cylinder radius
const LEG_H      = SEAT_Y - SEAT_PAD_H - BEAM_H / 2; // clear height to beam bottom
const BACK_H     = 0.52;   // backrest height
const BACK_T     = 0.08;   // backrest thickness
const BACK_TILT  = 0.04;   // slight backward tilt (z offset at top relative to bottom)
const ARM_W      = 0.04;   // armrest width
const ARM_D      = SEAT_D * 0.85;
const ARM_H      = 0.06;   // armrest height above seat
const ARM_Y      = SEAT_Y + ARM_H;

interface AirportSeatingParams {
  seats: number;
  back: boolean;
  scheme: "navy" | "redblue";
}

// Bold red/blue gang-seat colors (matches the design references).
const REDBLUE = [
  { seat: 0xc0392b, back: 0xa6321f, trim: 0xd95a48 }, // red
  { seat: 0x2c5aa0, back: 0x244a86, trim: 0x4a7ec0 }, // blue
];

defineObject("airportSeating", {
  params: { seats: 6, back: true, scheme: "redblue" } as AirportSeatingParams,
  build(p: AirportSeatingParams): ObjectResult {
    const { seats, back, scheme } = p;
    const totalW = seats * SEAT_W;
    const hTW = totalW / 2;

    const parts: THREE.BufferGeometry[] = [];
    const anchors: Record<string, Seat> = {};

    // ── Main horizontal beam (runs along X, at seat level) ─────────────────
    // The beam runs the full row width, at height = seat bottom
    const beamY = SEAT_Y - SEAT_PAD_H - BEAM_H / 2;
    parts.push(tintedBox(totalW + 0.08, BEAM_H, BEAM_D, 0, beamY, 0, BEAM_COLOR));
    // Beam end caps
    parts.push(tintedBox(0.04, BEAM_H + 0.04, BEAM_D + 0.04, -hTW - 0.06, beamY, 0, ARM_COLOR));
    parts.push(tintedBox(0.04, BEAM_H + 0.04, BEAM_D + 0.04,  hTW + 0.06, beamY, 0, ARM_COLOR));

    // ── Legs — 2 legs per 3 seats, minimum 2 legs ─────────────────────────
    const nLegs = Math.max(2, Math.ceil(seats / 3) * 2);
    // Position legs evenly, biased toward ends
    for (let lg = 0; lg < nLegs; lg++) {
      const legX = -hTW + (lg + 0.5) * (totalW / nLegs);
      // Front leg
      parts.push(cylinderY(LEG_R, LEG_H, legX, LEG_H / 2, SEAT_D * 0.28, LEG_COLOR));
      // Back leg
      parts.push(cylinderY(LEG_R, LEG_H, legX, LEG_H / 2, -SEAT_D * 0.28, LEG_COLOR));
      // Foot discs (anti-scratch pads)
      parts.push(cylinderY(LEG_R * 1.8, 0.02, legX, 0.01, SEAT_D * 0.28, 0x3a3a3a));
      parts.push(cylinderY(LEG_R * 1.8, 0.02, legX, 0.01, -SEAT_D * 0.28, 0x3a3a3a));
      // Cross brace between front and back leg
      parts.push(tintedBox(BEAM_D, 0.04, SEAT_D * 0.56, legX, LEG_H * 0.35, 0, BEAM_COLOR));
    }

    // ── Per-seat items ──────────────────────────────────────────────────────
    for (let s = 0; s < seats; s++) {
      const sx = -hTW + (s + 0.5) * SEAT_W;

      // Per-seat colors from the scheme.
      const seatCol = scheme === "redblue" ? REDBLUE[s % 2].seat : SEAT_COLOR;
      const backCol = scheme === "redblue" ? REDBLUE[s % 2].back : BACK_COLOR;
      const trimCol = scheme === "redblue" ? REDBLUE[s % 2].trim : SEAT_TRIM;

      // Seat cushion
      parts.push(tintedBox(SEAT_W - 0.04, SEAT_PAD_H, SEAT_D, sx, SEAT_Y - SEAT_PAD_H / 2, 0, seatCol));
      // Seat edge trim (front lip)
      parts.push(tintedBox(SEAT_W - 0.04, 0.04, 0.04, sx, SEAT_Y - SEAT_PAD_H + 0.02, SEAT_D / 2, trimCol));
      // Seat surface highlight (subtle lighter centre)
      parts.push(tintedBox(SEAT_W - 0.12, 0.01, SEAT_D - 0.12, sx, SEAT_Y, 0, seatCol));

      // Backrest (if enabled)
      if (back) {
        // Backrest body — tilted slightly backward
        const backBotY = SEAT_Y;
        const backTopY = backBotY + BACK_H;
        const backBotZ = -(SEAT_D / 2) + BACK_T / 2;
        const backTopZ = backBotZ - BACK_TILT;
        const backMidY = (backBotY + backTopY) / 2;
        const backMidZ = (backBotZ + backTopZ) / 2;
        parts.push(tintedBox(SEAT_W - 0.04, BACK_H, BACK_T, sx, backMidY, backMidZ, backCol));
        // Backrest top trim
        parts.push(tintedBox(SEAT_W - 0.04, 0.04, BACK_T + 0.04, sx, backTopY - 0.02, backTopZ, trimCol));
        // Horizontal lumbar support stripe
        parts.push(tintedBox(SEAT_W - 0.1, 0.06, BACK_T + 0.02,
          sx, backBotY + BACK_H * 0.35, backMidZ, trimCol));
      }

      // Armrests (between every seat, plus ends)
      const armX = sx + SEAT_W / 2;
      if (s < seats) {  // right armrest of this seat (= left of next)
        parts.push(tintedBox(ARM_W, SEAT_PAD_H + ARM_H, ARM_D,
          armX, SEAT_Y - SEAT_PAD_H / 2 + ARM_H / 2, -(SEAT_D - ARM_D) / 2, ARM_COLOR));
        // Armrest top flat pad
        parts.push(tintedBox(ARM_W + 0.02, 0.02, ARM_D,
          armX, ARM_Y, -(SEAT_D - ARM_D) / 2, 0xd0d4d8));
        // Bolt accent at base
        parts.push(tintedBox(0.06, 0.06, 0.06, armX, beamY + 0.04, 0, SCREW_COLOR));
      }

      // Register seat anchor — face forward (+z, faceYaw = 0)
      anchors[`seat_${s}`] = { x: sx, z: 0, faceYaw: 0 };
    }

    // Left end armrest
    const leftEndX = -hTW - ARM_W / 2;
    parts.push(tintedBox(ARM_W, SEAT_PAD_H + ARM_H, ARM_D,
      leftEndX, SEAT_Y - SEAT_PAD_H / 2 + ARM_H / 2, -(SEAT_D - ARM_D) / 2, ARM_COLOR));
    parts.push(tintedBox(ARM_W + 0.02, 0.02, ARM_D,
      leftEndX, ARM_Y, -(SEAT_D - ARM_D) / 2, 0xd0d4d8));

    // ── Merge + wrap ────────────────────────────────────────────────────────
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const obstacles: Rect[] = [
      { x: 0, z: -(SEAT_D - ARM_D) / 4, w: totalW + 0.2, d: SEAT_D + (back ? BACK_T : 0) + 0.1 },
    ];

    return {
      mesh,
      // No solid collider — seating is passable
      colliders: [],
      obstacles,
      anchors,
    };
  },
});
