// src/world/catalog/airport/terminalHall.ts
//
// "terminalHall" — the grand departures hall hero building.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z (entrance / curb side).
// ~1u = 1m. Fully deterministic — no Math.random / Date.now.
//
// Signature look (from the design references): a deep-blue GLAZED SAWTOOTH ROOF
// that ridges high toward the rear and steps down to the entrance, a full GLASS
// CURTAIN WALL across the front with sliding-door bays, a colorful RED/YELLOW/
// BLUE/GREEN block mosaic band across the top fascia, and colored accent tiles
// wrapping the columns.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeGlassPanel } from "../../objects/glass";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box } from "../../system/types";

// ─── helper ──────────────────────────────────────────────────────────────────
function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// A flat transparent blue glass slab lying in the XZ plane (for the roof). Glass
// must stay a separate mesh — it cannot be vertex-merged with opaque geometry.
function glassRoofSlab(w: number, depth: number, x: number, y: number, z: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2c5aa0,
    transparent: true,
    opacity: 0.55,
    roughness: 0.15,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

// ─── palette ─────────────────────────────────────────────────────────────────
const WALL_COLOR   = 0xf0ede6;   // pale warm white interior
const FLOOR_COLOR  = 0xe2ddd2;   // glossy light stone floor
const COLUMN_COLOR = PALETTE.steelLight;
const BEAM_COLOR   = 0xd8d5ce;   // slightly darker ceiling beams
const ROOF_FRAME   = 0xf2eee8;   // white roof mullion frame
const ROOF_GLASS_DK = 0x1f3a6b;  // deep blue glass spandrel under the glazing
const DARK_GLASS   = 0x2c4a63;   // front curtain-wall glass tint
const WALL_T       = 0.35;
const COL_SIZE     = 0.7;        // square column cross-section
const COL_BAY      = 8.0;        // column spacing

// The signature mosaic accent colors.
const BLOCK_COLORS = [0xd23b2e, 0xf2c12e, 0x2b6fb5, 0x2e9e4f, 0xe8772e];
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
  params: { w: 120, d: 50, h: 14, rearGap: 16, roofRidge: 8, roofSteps: 5 } as TerminalHallParams,
  build(p: TerminalHallParams): ObjectResult {
    const { w, d, h, rearGap, roofRidge, roofSteps } = p;
    const hW = w / 2;
    const hD = d / 2;
    const hH = h / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const group = new THREE.Group();

    // ── Floor slab ─────────────────────────────────────────────────────────
    const floorT = 0.25;
    parts.push(tintedBox(w, floorT, d, 0, floorT / 2, 0, FLOOR_COLOR));
    // Glossy darker border band tile inset
    parts.push(tintedBox(w - 4, 0.02, d - 4, 0, floorT + 0.01, 0, 0xeae6dc));
    const TILE_PITCH = 2.0;
    const nTileX = Math.floor(w / TILE_PITCH);
    const nTileZ = Math.floor(d / TILE_PITCH);
    for (let i = 1; i < nTileX; i++) {
      const gx = -hW + i * TILE_PITCH;
      parts.push(tintedBox(0.04, floorT + 0.02, d, gx, floorT / 2, 0, 0xcfcabc));
    }
    for (let j = 1; j < nTileZ; j++) {
      const gz = -hD + j * TILE_PITCH;
      parts.push(tintedBox(w, floorT + 0.02, 0.04, 0, floorT / 2, gz, 0xcfcabc));
    }

    // ── Side walls (left x = -w/2, right x = +w/2) ────────────────────────
    const SPANDREL_H = 1.4;
    const GLASS_BOT_Y = 0.4;

    const nCols = Math.round(w / COL_BAY) + 1;
    const colXs: number[] = [];
    for (let c = 0; c < nCols; c++) colXs.push(-hW + c * (w / (nCols - 1)));

    parts.push(tintedBox(WALL_T, SPANDREL_H, d, -hW, h - SPANDREL_H / 2, 0, WALL_COLOR));
    parts.push(tintedBox(WALL_T, SPANDREL_H, d,  hW, h - SPANDREL_H / 2, 0, WALL_COLOR));
    parts.push(tintedBox(WALL_T, GLASS_BOT_Y, d, -hW, GLASS_BOT_Y / 2, 0, WALL_COLOR));
    parts.push(tintedBox(WALL_T, GLASS_BOT_Y, d,  hW, GLASS_BOT_Y / 2, 0, WALL_COLOR));

    const bayGlassH = h - SPANDREL_H - GLASS_BOT_Y;
    const bayGlassY = GLASS_BOT_Y;

    for (let ci = 0; ci < colXs.length; ci++) {
      const cx = colXs[ci];

      // Side columns
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE, -hW + COL_SIZE / 2, hH, cx, COLUMN_COLOR));
      colliders.push(solidBox(-hW + COL_SIZE / 2, hH, cx, COL_SIZE, h, COL_SIZE));
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE,  hW - COL_SIZE / 2, hH, cx, COLUMN_COLOR));
      colliders.push(solidBox( hW - COL_SIZE / 2, hH, cx, COL_SIZE, h, COL_SIZE));

      // Colored accent tile at mid-height on each side column
      const acc = COL_ACCENTS[ci % COL_ACCENTS.length];
      parts.push(tintedBox(0.32, 0.9, COL_SIZE + 2 * DECAL_GAP, -hW + COL_SIZE / 2, h * 0.5, cx, acc));
      parts.push(tintedBox(0.32, 0.9, COL_SIZE + 2 * DECAL_GAP,  hW - COL_SIZE / 2, h * 0.5, cx, acc));

      // Glass bay between this column and the next
      if (ci < colXs.length - 1) {
        const nextCX = colXs[ci + 1];
        const bayMidZ = (cx + nextCX) / 2;
        const bayD = Math.abs(nextCX - cx) - COL_SIZE;

        const glassLeft = makeGlassPanel({
          w: bayD, h: bayGlassH, divisions: 2, opacity: 0.45,
          tint: 0x9fd8ff, frameColor: PALETTE.steel,
        });
        glassLeft.rotation.y = Math.PI / 2;
        glassLeft.position.set(-hW + WALL_T, bayGlassY, bayMidZ);
        group.add(glassLeft);

        const glassRight = makeGlassPanel({
          w: bayD, h: bayGlassH, divisions: 2, opacity: 0.45,
          tint: 0x9fd8ff, frameColor: PALETTE.steel,
        });
        glassRight.rotation.y = -Math.PI / 2;
        glassRight.position.set(hW - WALL_T, bayGlassY, bayMidZ);
        group.add(glassRight);
      }
    }

    // Side wall slim colliders
    colliders.push(solidBox(-hW + WALL_T / 2, hH, 0, WALL_T, h, d));
    colliders.push(solidBox( hW - WALL_T / 2, hH, 0, WALL_T, h, d));

    // ── Back wall at z = -d/2 (split with rearGap doorway) ────────────────
    const backSegW = (w - rearGap) / 2;
    parts.push(tintedBox(backSegW, h, WALL_T, -hW + backSegW / 2, hH, -hD, WALL_COLOR));
    colliders.push(solidBox(-hW + backSegW / 2, hH, -hD, backSegW, h, WALL_T));
    parts.push(tintedBox(backSegW, h, WALL_T,  hW - backSegW / 2, hH, -hD, WALL_COLOR));
    colliders.push(solidBox( hW - backSegW / 2, hH, -hD, backSegW, h, WALL_T));

    const archH = 0.8;
    parts.push(tintedBox(rearGap, archH, WALL_T, 0, h - archH / 2, -hD, COLUMN_COLOR));
    parts.push(tintedBox(COL_SIZE, h, COL_SIZE, -rearGap / 2 - COL_SIZE / 2, hH, -hD, COLUMN_COLOR));
    parts.push(tintedBox(COL_SIZE, h, COL_SIZE,  rearGap / 2 + COL_SIZE / 2, hH, -hD, COLUMN_COLOR));
    colliders.push(solidBox(-rearGap / 2 - COL_SIZE / 2, hH, -hD, COL_SIZE, h, COL_SIZE));
    colliders.push(solidBox( rearGap / 2 + COL_SIZE / 2, hH, -hD, COL_SIZE, h, COL_SIZE));

    // ── FRONT (+z): full glass curtain wall + centered sliding-door bays ────
    const frontSegW = (w - rearGap) / 2;
    // Two fixed-glass curtain segments flanking the doorway
    for (const sgn of [-1, 1]) {
      const segCx = sgn * (rearGap / 2 + frontSegW / 2);
      const glass = makeGlassPanel({
        w: frontSegW - 0.3, h: h - 0.8, divisions: 5, opacity: 0.42,
        tint: DARK_GLASS, frameColor: PALETTE.steel,
      });
      glass.position.set(segCx, 0.4, hD);
      group.add(glass);
      // Slim collider behind the fixed glass (NOT across the door gap)
      colliders.push(solidBox(segCx, hH, hD, frontSegW - 0.3, h, WALL_T));
      // Glass spandrel above to the roof
      parts.push(tintedBox(frontSegW - 0.3, 0.6, WALL_T, segCx, h - 0.3, hD, ROOF_GLASS_DK));
    }
    // Sliding-door bays in the center gap
    const doorBay = makeGlassPanel({
      w: rearGap - 0.6, h: h * 0.6, door: true, divisions: 3, opacity: 0.38,
      tint: DARK_GLASS, frameColor: PALETTE.steel,
    });
    doorBay.position.set(0, 0, hD);
    group.add(doorBay);
    // Transom glass above the doors (up to roof)
    const transom = makeGlassPanel({
      w: rearGap - 0.6, h: h * 0.34, divisions: 4, opacity: 0.42,
      tint: DARK_GLASS, frameColor: PALETTE.steel,
    });
    transom.position.set(0, h * 0.6 + 0.1, hD);
    group.add(transom);
    // Short corner returns
    const RETURN_W = 1.2;
    parts.push(tintedBox(RETURN_W, h, WALL_T, -hW + RETURN_W / 2, hH, hD, WALL_COLOR));
    parts.push(tintedBox(RETURN_W, h, WALL_T,  hW - RETURN_W / 2, hH, hD, WALL_COLOR));
    colliders.push(solidBox(-hW + RETURN_W / 2, hH, hD, RETURN_W, h, WALL_T));
    colliders.push(solidBox( hW - RETURN_W / 2, hH, hD, RETURN_W, h, WALL_T));

    // ── Interior center column row (with accent tiles) ─────────────────────
    const nIntCols = Math.floor(d / COL_BAY) - 1;
    for (let ic = 1; ic <= nIntCols; ic++) {
      const iz = -hD + ic * (d / (nIntCols + 1));
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE, 0, hH, iz, COLUMN_COLOR));
      colliders.push(solidBox(0, hH, iz, COL_SIZE, h, COL_SIZE));
      const acc = COL_ACCENTS[ic % COL_ACCENTS.length];
      parts.push(tintedBox(COL_SIZE + 2 * DECAL_GAP, 0.8, COL_SIZE + 2 * DECAL_GAP, 0, h * 0.5, iz, acc));
    }

    // ── Ceiling beams (thin grid) ──────────────────────────────────────────
    const beamH = 0.5;
    const beamT = 0.3;
    const beamY = h - beamH / 2;
    const nBeamsX = Math.round(w / COL_BAY);
    const nBeamsZ = Math.round(d / COL_BAY);
    for (let b = 0; b <= nBeamsX; b++) {
      const bx = -hW + b * (w / nBeamsX);
      parts.push(tintedBox(beamT, beamH, d, bx, beamY, 0, BEAM_COLOR));
    }
    for (let b = 0; b <= nBeamsZ; b++) {
      const bz = -hD + b * (d / nBeamsZ);
      parts.push(tintedBox(w, beamH, beamT, 0, beamY, bz, BEAM_COLOR));
    }

    // ── Deep-blue GLAZED SAWTOOTH ROOF ─────────────────────────────────────
    // Ridges high toward the rear (-z), steps down to the entrance (+z).
    const bandDepth = d / roofSteps;
    for (let i = 0; i < roofSteps; i++) {
      // i = 0 is the front (+z) lowest step.
      const zCenter = hD - (i + 0.5) * bandDepth;
      const topY = h + (roofRidge * (i + 1)) / roofSteps;
      // White mullion frame slab under the glass
      parts.push(tintedBox(w + 0.6, 0.35, bandDepth + 0.1, 0, topY, zCenter, ROOF_FRAME));
      // Cross mullion ribs along the band
      const nRibs = 6;
      for (let r = 0; r <= nRibs; r++) {
        const rx = -hW + (r * w) / nRibs;
        parts.push(tintedBox(0.12, 0.42, bandDepth, rx, topY + 0.04, zCenter, ROOF_FRAME));
      }
      // Deep-blue glass slab on top
      group.add(glassRoofSlab(w * 0.98, bandDepth * 0.96, 0, topY + 0.24, zCenter));
      // A riser face between this step and the next (vertical glass spandrel)
      if (i < roofSteps - 1) {
        const nextTopY = h + (roofRidge * (i + 2)) / roofSteps;
        const riserH = nextTopY - topY;
        const riserZ = zCenter - bandDepth / 2;
        parts.push(tintedBox(w + 0.6, riserH, 0.3, 0, topY + riserH / 2, riserZ, ROOF_GLASS_DK));
      }
    }
    // Front roof fascia beam (carries the color band)
    const frontRoofY = h + roofRidge / roofSteps;
    parts.push(tintedBox(w + 0.6, 1.0, 0.4, 0, frontRoofY - 0.5, hD + 0.2, 0x1c4f8a));

    // ── COLOR-BLOCK MOSAIC BAND across the front top fascia ────────────────
    const bandY0 = h - 1.6;
    const blockW = 1.3;
    const nBlocks = Math.floor(w / blockW);
    for (let bI = 0; bI < nBlocks; bI++) {
      const bx = -hW + (bI + 0.5) * (w / nBlocks);
      const rows = 2 + (bI % 2); // 2 or 3 tall, irregular
      for (let ry = 0; ry < rows; ry++) {
        const col = BLOCK_COLORS[(bI + ry) % BLOCK_COLORS.length];
        parts.push(tintedBox(blockW - 0.1, 0.9, 0.35, bx, bandY0 + 1.0 + ry * 0.95, hD + 0.3, col));
      }
    }
    // Wrap the band a little onto each side fascia (first few bays)
    for (let s = 0; s < 4; s++) {
      const sz = hD - 1.0 - s * 1.3;
      const colL = BLOCK_COLORS[s % BLOCK_COLORS.length];
      const colR = BLOCK_COLORS[(s + 2) % BLOCK_COLORS.length];
      parts.push(tintedBox(0.35, 0.9, 1.2, -hW - 0.3, bandY0 + 1.0, sz, colL));
      parts.push(tintedBox(0.35, 0.9, 1.2,  hW + 0.3, bandY0 + 1.0, sz, colR));
    }

    // ── Entrance signage ──────────────────────────────────────────────────
    const depsign = makeTextSignMesh({
      text: "DEPARTURES", w: w * 0.42, h: 1.1,
      boardColor: 0x15171a, textColor: "#f0b020", glow: 0.95,
    });
    depsign.position.set(-w * 0.21, h - 0.7, hD + 0.5 + DECAL_GAP);
    group.add(depsign);

    const airportSign = makeTextSignMesh({
      text: "RISHON INTERNATIONAL", w: w * 0.34, h: 0.7,
      boardColor: 0x1a3a5a, textColor: "#c8e0f4", glow: 0.8,
    });
    airportSign.position.set(-w * 0.17, h - 2.0, hD + 0.5 + DECAL_GAP);
    group.add(airportSign);

    // ── Merge opaque geometry ─────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

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
