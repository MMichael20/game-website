// src/world/catalog/airport/terminalHall.ts
//
// "terminalHall" — the grand departures hall hero building.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z (entrance / curb side).
// ~1u = 1m. Fully deterministic — no Math.random / Date.now.
//
// Signature look (from the design references): a bold-blue GLAZED SAWTOOTH ROOF
// that ridges high toward the rear and steps down to the entrance, a SEE-THROUGH
// tinted-glass CURTAIN WALL across the front and sides (the lit interior reads
// from the forecourt), a CLOSED roof (ceiling deck + clerestory infill seal the
// building), a clean RED/YELLOW/BLUE/GREEN block band across the top fascia, and
// colored accent tiles on the columns.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeGlassPaneMaterial } from "../../objects/glass";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box } from "../../system/types";

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// An OPAQUE dark-glass curtain-wall panel (a dark pane + a mullion grid + a few
// brighter reflection cells). Lies in the XY plane facing +z, base y=0.
function curtainWall(
  parts: THREE.BufferGeometry[],
  cx: number, z: number, panW: number, panH: number, faceSign: number,
): void {
  const t = 0.3;
  // (The see-through glass field itself is added separately as a transparent
  // pane mesh — see glassPane(); here we only lay the opaque mullion grid.)
  // Vertical mullions
  const nV = Math.max(2, Math.round(panW / 2.4));
  for (let i = 0; i <= nV; i++) {
    const mx = cx - panW / 2 + (i * panW) / nV;
    parts.push(tintedBox(0.12, panH, t + 0.04, mx, panH / 2 + 0.4, z + faceSign * 0.02, MULLION));
  }
  // Horizontal floor bands
  const nH = Math.max(2, Math.round(panH / 3.0));
  for (let j = 0; j <= nH; j++) {
    const my = 0.4 + (j * panH) / nH;
    parts.push(tintedBox(panW, 0.14, t + 0.04, cx, my, z + faceSign * 0.02, MULLION));
    // a brighter reflection strip on every other band
    if (j % 2 === 1) {
      parts.push(tintedBox(panW * 0.9, panH / nH * 0.4, 0.05, cx, my + panH / nH * 0.3, z + faceSign * 0.06, GLASS_REFLECT));
    }
  }
}

// ─── palette ─────────────────────────────────────────────────────────────────
const WALL_COLOR    = 0xf0ede6;   // pale warm white interior / structure
const FLOOR_COLOR   = 0xe2ddd2;   // glossy light stone floor
const COLUMN_COLOR  = PALETTE.steelLight;
const BEAM_COLOR    = 0xd8d5ce;
const ROOF_FRAME    = 0xf2eee8;   // white roof mullion frame
const ROOF_BLUE     = 0x2f63b0;   // bold blue glazed roof panel (OPAQUE)
const ROOF_BLUE_DK  = 0x1f3a6b;   // deep blue riser between steps
const DARK_GLASS    = 0x24506e;   // opaque glass (kept for the door transom only)
const MULLION       = 0xc6ccd2;   // curtain-wall frame
const GLASS_REFLECT = 0x6f9fc4;   // reflection highlight cell
const GLASS_TINT    = 0x3f7fb5;   // see-through curtain-wall glazing (blue)
const GLASS_OPACITY = 0.5;        // tinted enough to read as glass, clear enough to see in
const WALL_T        = 0.4;
const COL_SIZE      = 0.9;
const COL_BAY       = 9.0;

// A single see-through glazing pane (its own transparent mesh — transparent
// materials cannot be vertex-merged with the opaque structure). `axis` is the
// wall the pane lies in: "z" faces ±z (front/back), "x" faces ±x (sides).
function glassPane(
  w: number, h: number, cx: number, cy: number, cz: number, axis: "z" | "x",
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = makeGlassPaneMaterial({ w, h, tint: GLASS_TINT, opacity: GLASS_OPACITY });
  const m = new THREE.Mesh(geo, mat);
  if (axis === "x") m.rotation.y = Math.PI / 2;  // turn the pane to face ±x
  m.position.set(cx, cy, cz);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

const BLOCK_COLORS = [0xd23b2e, 0xf2c12e, 0x2b6fb5, 0x2e9e4f];
const COL_ACCENTS  = [0x2b6fb5, 0xd23b2e, 0xf2c12e];

interface TerminalHallParams {
  w: number;
  d: number;
  h: number;
  rearGap: number;
  roofRidge: number;
  roofSteps: number;
}

defineObject("terminalHall", {
  params: { w: 200, d: 60, h: 20, rearGap: 24, roofRidge: 14, roofSteps: 7 } as TerminalHallParams,
  build(p: TerminalHallParams): ObjectResult {
    const { w, d, h, rearGap, roofRidge, roofSteps } = p;
    const hW = w / 2;
    const hD = d / 2;
    const hH = h / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const glassMeshes: THREE.Mesh[] = [];   // transparent panes (kept off the merge)
    const group = new THREE.Group();

    // ── Floor slab ─────────────────────────────────────────────────────────
    const floorT = 0.25;
    parts.push(tintedBox(w, floorT, d, 0, floorT / 2, 0, FLOOR_COLOR));
    parts.push(tintedBox(w - 6, 0.02, d - 6, 0, floorT + 0.01, 0, 0xeae6dc));
    const TILE_PITCH = 2.5;
    for (let i = 1; i < Math.floor(w / TILE_PITCH); i++) {
      parts.push(tintedBox(0.05, floorT + 0.02, d, -hW + i * TILE_PITCH, floorT / 2, 0, 0xcfcabc));
    }
    for (let j = 1; j < Math.floor(d / TILE_PITCH); j++) {
      parts.push(tintedBox(w, floorT + 0.02, 0.05, 0, floorT / 2, -hD + j * TILE_PITCH, 0xcfcabc));
    }

    // ── Side walls (OPAQUE dark-glass between columns) ─────────────────────
    const nCols = Math.round(w / COL_BAY) + 1;
    const colXs: number[] = [];
    for (let c = 0; c < nCols; c++) colXs.push(-hW + c * (w / (nCols - 1)));

    // Solid sill + spandrel runs along each side
    parts.push(tintedBox(WALL_T, 0.5, d, -hW, 0.25, 0, WALL_COLOR));
    parts.push(tintedBox(WALL_T, 0.5, d,  hW, 0.25, 0, WALL_COLOR));

    for (let ci = 0; ci < colXs.length; ci++) {
      const cx = colXs[ci];
      // Side columns
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE, -hW + COL_SIZE / 2, hH, cx, COLUMN_COLOR));
      colliders.push(solidBox(-hW + COL_SIZE / 2, hH, cx, COL_SIZE, h, COL_SIZE));
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE,  hW - COL_SIZE / 2, hH, cx, COLUMN_COLOR));
      colliders.push(solidBox( hW - COL_SIZE / 2, hH, cx, COL_SIZE, h, COL_SIZE));
      // Accent tiles
      const acc = COL_ACCENTS[ci % COL_ACCENTS.length];
      parts.push(tintedBox(0.4, 1.2, COL_SIZE + 2 * DECAL_GAP, -hW + COL_SIZE / 2, h * 0.5, cx, acc));
      parts.push(tintedBox(0.4, 1.2, COL_SIZE + 2 * DECAL_GAP,  hW - COL_SIZE / 2, h * 0.5, cx, acc));

      // Opaque dark-glass infill panel between this column and the next
      if (ci < colXs.length - 1) {
        const nextCX = colXs[ci + 1];
        const midZ = (cx + nextCX) / 2;
        const bayD = Math.abs(nextCX - cx) - COL_SIZE;
        for (const sgn of [-1, 1]) {
          const wallX = sgn * (hW - WALL_T / 2);
          // See-through glazing pane in this side bay (transparent mesh)
          glassMeshes.push(glassPane(bayD, h - 0.6, wallX, (h - 0.6) / 2 + 0.5, midZ, "x"));
          // mullions
          parts.push(tintedBox(WALL_T + 0.05, h - 0.6, 0.1, wallX, (h - 0.6) / 2 + 0.5, midZ - bayD / 2 + 0.05, MULLION));
        }
      }
    }
    colliders.push(solidBox(-hW + WALL_T / 2, hH, 0, WALL_T, h, d));
    colliders.push(solidBox( hW - WALL_T / 2, hH, 0, WALL_T, h, d));

    // ── Back wall at z = -d/2 (split with rearGap doorway to concourse) ────
    const backSegW = (w - rearGap) / 2;
    parts.push(tintedBox(backSegW, h, WALL_T, -hW + backSegW / 2, hH, -hD, WALL_COLOR));
    colliders.push(solidBox(-hW + backSegW / 2, hH, -hD, backSegW, h, WALL_T));
    parts.push(tintedBox(backSegW, h, WALL_T,  hW - backSegW / 2, hH, -hD, WALL_COLOR));
    colliders.push(solidBox( hW - backSegW / 2, hH, -hD, backSegW, h, WALL_T));
    parts.push(tintedBox(rearGap, 1.0, WALL_T, 0, h - 0.5, -hD, COLUMN_COLOR));

    // ── FRONT (+z): SEE-THROUGH curtain wall + centered door gap ───────────
    const frontSegW = (w - rearGap) / 2;
    for (const sgn of [-1, 1]) {
      const segCx = sgn * (rearGap / 2 + frontSegW / 2);
      curtainWall(parts, segCx, hD, frontSegW, h - 0.5, 1);   // opaque mullion grid
      glassMeshes.push(glassPane(frontSegW, h - 0.5, segCx, (h - 0.5) / 2 + 0.4, hD, "z"));
      colliders.push(solidBox(segCx, hH, hD, frontSegW, h, WALL_T));
    }
    // Door reveal: dark recessed jambs + lintel around the open entrance gap.
    parts.push(tintedBox(0.8, h * 0.62, WALL_T + 0.2, -rearGap / 2 + 0.4, h * 0.31, hD, 0x2a2d32));
    parts.push(tintedBox(0.8, h * 0.62, WALL_T + 0.2,  rearGap / 2 - 0.4, h * 0.31, hD, 0x2a2d32));
    parts.push(tintedBox(rearGap, h - h * 0.62, WALL_T, 0, h * 0.62 + (h - h * 0.62) / 2, hD, DARK_GLASS));
    // jamb colliders (leave the walking gap clear)
    colliders.push(solidBox(-rearGap / 2 + 0.4, hH, hD, 0.8, h, WALL_T));
    colliders.push(solidBox( rearGap / 2 - 0.4, hH, hD, 0.8, h, WALL_T));

    // ── Interior center column rows (with accent tiles) ────────────────────
    const nIntColsX = Math.max(1, Math.floor(w / 20));
    const nIntColsZ = Math.max(1, Math.floor(d / COL_BAY) - 1);
    for (let ix = 1; ix <= nIntColsX; ix++) {
      const cx = -hW + (ix * w) / (nIntColsX + 1);
      for (let iz = 1; iz <= nIntColsZ; iz++) {
        const cz = -hD + (iz * d) / (nIntColsZ + 1);
        parts.push(tintedBox(COL_SIZE, h, COL_SIZE, cx, hH, cz, COLUMN_COLOR));
        colliders.push(solidBox(cx, hH, cz, COL_SIZE, h, COL_SIZE));
        const acc = COL_ACCENTS[(ix + iz) % COL_ACCENTS.length];
        parts.push(tintedBox(COL_SIZE + 2 * DECAL_GAP, 1.0, COL_SIZE + 2 * DECAL_GAP, cx, h * 0.5, cz, acc));
      }
    }

    // ── Ceiling beams ──────────────────────────────────────────────────────
    const beamY = h - 0.25;
    const nBeamsX = Math.round(w / COL_BAY);
    const nBeamsZ = Math.round(d / COL_BAY);
    for (let b = 0; b <= nBeamsX; b++) {
      parts.push(tintedBox(0.3, 0.5, d, -hW + (b * w) / nBeamsX, beamY, 0, BEAM_COLOR));
    }
    for (let b = 0; b <= nBeamsZ; b++) {
      parts.push(tintedBox(w, 0.5, 0.3, 0, beamY, -hD + (b * d) / nBeamsZ, BEAM_COLOR));
    }

    // ── CLOSED CEILING DECK — caps the interior so no sky shows from inside ─
    const WALL_TOP = h - 0.1;   // approx top of the side/front glazing
    parts.push(tintedBox(w - 0.2, 0.3, d - 0.2, 0, h, 0, ROOF_FRAME));

    // ── BOLD-BLUE GLAZED SAWTOOTH ROOF (opaque) ────────────────────────────
    // Ridges high toward the rear (-z), steps down to the entrance (+z).
    const bandDepth = d / roofSteps;
    for (let i = 0; i < roofSteps; i++) {
      const zCenter = hD - (i + 0.5) * bandDepth;
      const topY = h + (roofRidge * (i + 1)) / roofSteps;
      // Perimeter clerestory infill: seal the open band between the wall top and
      // this roof step on both sides (and across the front for the lowest step),
      // so the building reads fully closed from outside too.
      const cH = topY - WALL_TOP;
      if (cH > 0) {
        for (const sgn of [-1, 1]) {
          parts.push(tintedBox(WALL_T, cH, bandDepth, sgn * (hW - WALL_T / 2), WALL_TOP + cH / 2, zCenter, WALL_COLOR));
        }
        if (i === 0) {
          parts.push(tintedBox(w, cH, WALL_T, 0, WALL_TOP + cH / 2, hD - WALL_T / 2, WALL_COLOR));
        }
      }
      // White frame slab
      parts.push(tintedBox(w + 0.8, 0.4, bandDepth + 0.1, 0, topY, zCenter, ROOF_FRAME));
      // Bold-blue glazed top panel
      parts.push(tintedBox(w * 0.99, 0.3, bandDepth * 0.92, 0, topY + 0.32, zCenter, ROOF_BLUE));
      // Mullion ribs across the blue
      const nRibs = Math.max(4, Math.round(w / 6));
      for (let r = 0; r <= nRibs; r++) {
        parts.push(tintedBox(0.14, 0.36, bandDepth * 0.92, -hW + (r * w) / nRibs, topY + 0.34, zCenter, ROOF_FRAME));
      }
      // Vertical deep-blue riser to the next (taller) step
      if (i < roofSteps - 1) {
        const nextTopY = h + (roofRidge * (i + 2)) / roofSteps;
        const riserH = nextTopY - topY;
        parts.push(tintedBox(w + 0.8, riserH, 0.35, 0, topY + riserH / 2, zCenter - bandDepth / 2, ROOF_BLUE_DK));
      }
    }
    // Front roof fascia beam carrying the color band
    const frontRoofY = h + roofRidge / roofSteps;
    parts.push(tintedBox(w + 0.8, 1.2, 0.5, 0, frontRoofY - 0.6, hD + 0.25, 0x1c4f8a));

    // ── CLEAN COLOR-BLOCK BAND across the front top fascia ─────────────────
    const bandY = h - 1.4;
    const blockW = 2.0;
    const nBlocks = Math.floor(w / blockW);
    for (let bI = 0; bI < nBlocks; bI++) {
      const bx = -hW + (bI + 0.5) * (w / nBlocks);
      const col = BLOCK_COLORS[bI % BLOCK_COLORS.length];
      parts.push(tintedBox(blockW - 0.12, 1.8, 0.4, bx, bandY + 0.9, hD + 0.32, col));
    }

    // ── Entrance signage ──────────────────────────────────────────────────
    const depsign = makeTextSignMesh({
      text: "DEPARTURES", w: Math.min(w * 0.3, 28), h: 1.5,
      boardColor: 0x15171a, textColor: "#f0b020", glow: 0.95,
    });
    depsign.position.set(-Math.min(w * 0.3, 28) / 2, h - 3.6, hD + 0.55 + DECAL_GAP);
    group.add(depsign);

    const airportSign = makeTextSignMesh({
      text: "BEN GURION INTERNATIONAL", w: Math.min(w * 0.26, 26), h: 0.9,
      boardColor: 0x1a3a5a, textColor: "#c8e0f4", glow: 0.8,
    });
    airportSign.position.set(-Math.min(w * 0.26, 26) / 2, h - 5.3, hD + 0.55 + DECAL_GAP);
    group.add(airportSign);

    // ── Merge opaque geometry ─────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

    // Transparent glazing panes (front + sides) — added after the opaque mesh.
    for (const gm of glassMeshes) group.add(gm);

    return {
      mesh: group,
      colliders,
      anchors: {
        concourseGap: { x: 0, z: -hD },
        door: { x: 0, z: hD },
      },
    };
  },
});
