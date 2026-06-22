// src/world/catalog/airport/curbCanopy.ts
//
// "curbCanopy" — the drop-off canopy over the landside curb (departures/arrivals).
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z (traffic lane side).
// ~1u = 1m. Fully deterministic — no Math.random / Date.now.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Canopy structural colors
const ROOF_COL        = 0xd8d4cc;  // light concrete/composite panel
const ROOF_EDGE_COL   = 0x4a7aa0;  // blue steel fascia
const FASCIA_SIGN_COL = 0x0038b8;  // Israeli blue sign band
const COL_COL         = PALETTE.steelLight;
const COL_BASE_COL    = PALETTE.stoneBase;
const CURB_COL        = PALETTE.curb;
const ASPHALT_COL     = PALETTE.asphalt;
const LANE_COL        = PALETTE.laneLine;
const YELLOW_COL      = PALETTE.yellowLine;
const CEILING_COL     = 0xe8e6e0;  // underside ceiling panels

// Column dimensions
const COL_W      = 0.40;
const COL_D      = 0.40;
const COL_H      = 5.0;
const COL_PITCH  = 8.0; // spacing between columns
// Roof geometry
const ROOF_H     = 0.45; // slab thickness
const ROOF_Y     = COL_H + ROOF_H / 2;
// Fascia band
const FASCIA_H   = 1.0;
// Curb
const CURB_H     = 0.16;
const CURB_D     = 0.4;
// Drop-off lane
const LANE_W     = 4.0; // lane width in front of curb
// Sign depth
const SIGN_DEPTH = 0.2;

interface CurbCanopyParams {
  w: number;
  d: number;
  label: string;
}

defineObject("curbCanopy", {
  params: { w: 60, d: 10, label: "Departures" } as CurbCanopyParams,
  build(p: CurbCanopyParams): ObjectResult {
    const { w, d, label } = p;
    const hW = w / 2;
    const hD = d / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    const group = new THREE.Group();

    // ── Roof slab ─────────────────────────────────────────────────────────
    parts.push(tintedBox(w, ROOF_H, d, 0, ROOF_Y, 0, ROOF_COL));

    // Roof top — slight slope detail strips running lengthwise (parallel to X)
    const ribCount = Math.floor(d / 2.0);
    for (let ri = 1; ri < ribCount; ri++) {
      const rz = -hD + ri * (d / ribCount);
      parts.push(tintedBox(w, 0.07, 0.12, 0, ROOF_Y + ROOF_H / 2 + 0.035, rz, 0xc8c4bc));
    }

    // ── Blue steel fascia on the +z front edge ────────────────────────────
    const fasciaY = COL_H + ROOF_H / 2;
    // Full-length blue fascia band below the roof edge
    parts.push(tintedBox(w + 0.2, FASCIA_H, SIGN_DEPTH, 0, fasciaY + FASCIA_H / 2 - ROOF_H / 2, hD + SIGN_DEPTH / 2, FASCIA_SIGN_COL));

    // ── Departures / label sign on fascia ─────────────────────────────────
    // One centered sign board OR repeated boards every ~20m
    const signW = Math.min(16, w * 0.8);
    const signH = FASCIA_H * 0.8;
    const signY = fasciaY + FASCIA_H / 2 - ROOF_H / 2 - signH / 2;

    // How many sign repeats fit (one per 20m span, minimum 1)
    const signRepeat = Math.max(1, Math.floor(w / 20));
    const signSpacing = w / signRepeat;
    for (let si = 0; si < signRepeat; si++) {
      const signCX = -hW + signSpacing * (si + 0.5);
      const sign = makeTextSignMesh({
        text: label,
        w: signW,
        h: signH,
        boardColor: FASCIA_SIGN_COL,
        textColor: "#ffffff",
        glow: 0.9,
      });
      sign.position.set(signCX - signW / 2, signY, hD + SIGN_DEPTH + DECAL_GAP);
      group.add(sign);
    }

    // ── Rear fascia (decorative, -z) ──────────────────────────────────────
    parts.push(tintedBox(w + 0.2, FASCIA_H, SIGN_DEPTH, 0, fasciaY + FASCIA_H / 2 - ROOF_H / 2, -hD - SIGN_DEPTH / 2, ROOF_EDGE_COL));

    // ── Ceiling underside panels ──────────────────────────────────────────
    // Coffered ceiling: grid of thin strips on the underside of the roof
    const CEIL_Y = COL_H - 0.01; // just below the column tops
    const ceilPanelPitch = 3.0;
    const nCeilX = Math.floor(w / ceilPanelPitch);
    const nCeilZ = Math.floor(d / ceilPanelPitch);
    for (let ci = 1; ci < nCeilX; ci++) {
      const cx = -hW + ci * (w / nCeilX);
      parts.push(tintedBox(0.06, 0.06, d, cx, CEIL_Y + 0.03, 0, 0xc0bcb4));
    }
    for (let cj = 1; cj < nCeilZ; cj++) {
      const cz = -hD + cj * (d / nCeilZ);
      parts.push(tintedBox(w, 0.06, 0.06, 0, CEIL_Y + 0.03, cz, 0xc0bcb4));
    }
    // Flat ceiling fill
    parts.push(tintedBox(w, 0.08, d, 0, CEIL_Y - 0.04, 0, CEILING_COL));

    // ── Pendant light strips (recessed lighting suggestion) ───────────────
    // Rows of slim emissive-looking strips along Z
    const lightPitch = 8.0;
    const nLights = Math.floor(w / lightPitch);
    for (let li = 0; li < nLights; li++) {
      const lx = -hW + lightPitch * (li + 0.5);
      parts.push(tintedBox(0.15, 0.04, d * 0.8, lx, CEIL_Y - 0.06, 0, PALETTE.lanternGlow));
    }

    // ── Columns ───────────────────────────────────────────────────────────
    // Derive column count from width
    const nCols = Math.max(2, Math.round(w / COL_PITCH) + 1);
    const actualSpacing = w / (nCols - 1);

    for (let ci = 0; ci < nCols; ci++) {
      const cx = -hW + ci * actualSpacing;

      // Column base plinth
      const BASE_H = 0.22, BASE_W = COL_W + 0.18;
      parts.push(tintedBox(BASE_W, BASE_H, BASE_W, cx, BASE_H / 2, 0, COL_BASE_COL));

      // Column shaft
      parts.push(cylinderY(COL_W / 2, COL_H, cx, COL_H / 2, 0, COL_COL, 8));

      // Column capital (wider top block)
      const CAP_H = 0.28, CAP_W = COL_W + 0.26;
      parts.push(tintedBox(CAP_W, CAP_H, CAP_W, cx, COL_H - CAP_H / 2, 0, COL_BASE_COL));

      // Collider per column (slim cylinder approximated as box)
      colliders.push(solidBox(cx, COL_H / 2, 0, COL_W * 1.1, COL_H, COL_D * 1.1));
      obstacles.push({ x: cx, z: 0, w: COL_W + 0.2, d: COL_D + 0.2 });
    }

    // ── Curb edge strip (raised kerb) ─────────────────────────────────────
    // Runs full length at the +z front edge of the canopy footprint
    const curbZ = hD - CURB_D / 2;
    parts.push(tintedBox(w, CURB_H, CURB_D, 0, CURB_H / 2, curbZ, CURB_COL));
    // Curb vertical face accent (yellow painted edge)
    parts.push(tintedBox(w, CURB_H, 0.04, 0, CURB_H / 2, curbZ + CURB_D / 2 + 0.02, YELLOW_COL));

    // ── Lane markings in front of the curb (drop-off lane, +z side) ───────
    // Asphalt pad
    parts.push(tintedBox(w, 0.04, LANE_W, 0, 0.02, hD + CURB_D / 2 + LANE_W / 2, ASPHALT_COL));

    // White lane divider dashes (dashed line parallel to canopy)
    const dashL = 2.0, dashGap = 1.5, dashW = 0.15;
    const laneLineZ = hD + CURB_D / 2 + LANE_W * 0.7;
    const totalDash = dashL + dashGap;
    const nDashes = Math.floor(w / totalDash);
    for (let di = 0; di < nDashes; di++) {
      const dx = -hW + totalDash * di + dashL / 2;
      parts.push(tintedBox(dashL, 0.02, dashW, dx, 0.05, laneLineZ, LANE_COL));
    }

    // Yellow center divider (solid line between lanes)
    const yellowLineZ = hD + CURB_D / 2 + LANE_W * 0.5;
    parts.push(tintedBox(w, 0.02, 0.15, 0, 0.05, yellowLineZ, YELLOW_COL));

    // ── Arrow marking suggestion — chevrons ────────────────────────────────
    // Simple T-shaped arrows at intervals pointing +z (away from terminal)
    const arrowSpacing = 12.0;
    const nArrows = Math.floor(w / arrowSpacing);
    const arrowZ = hD + CURB_D / 2 + LANE_W * 0.3;
    for (let ai = 0; ai < nArrows; ai++) {
      const ax = -hW + arrowSpacing * (ai + 0.5);
      // Stem
      parts.push(tintedBox(0.16, 0.02, 0.8, ax, 0.05, arrowZ + 0.3, LANE_COL));
      // Arrow head cross bars
      parts.push(tintedBox(0.6, 0.02, 0.16, ax,        0.05, arrowZ - 0.1, LANE_COL));
      parts.push(tintedBox(0.4, 0.02, 0.16, ax,        0.05, arrowZ - 0.3, LANE_COL));
    }

    // ── Merge opaque geometry ─────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

    return { mesh: group, colliders, obstacles };
  },
});
