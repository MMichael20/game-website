// src/world/catalog/airport/terminalHall.ts
//
// "terminalHall" — the grand departures hall hero building.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z (entrance).
// ~1u = 1m. Fully deterministic — no Math.random / Date.now.

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

// ─── palette ─────────────────────────────────────────────────────────────────
const WALL_COLOR   = 0xf0ede6;   // pale warm white interior
const FLOOR_COLOR  = 0xe8e4dc;   // light stone floor
const COLUMN_COLOR = PALETTE.steelLight;
const BEAM_COLOR   = 0xd8d5ce;   // slightly darker ceiling beams
const SKYLIGHT_COLOR = 0xd0e8f5; // cool bluish skylight strips
const ROOF_COLOR   = 0xc8c4bc;   // exterior roof top
const FASCIA_COLOR = 0x4a7aa0;   // blue steel fascia on top
const WALL_T       = 0.35;
const COL_SIZE     = 0.7;        // square column cross-section
const COL_BAY      = 8.0;        // column spacing

interface TerminalHallParams {
  w: number;
  d: number;
  h: number;
  rearGap: number;
}

defineObject("terminalHall", {
  params: { w: 120, d: 50, h: 14, rearGap: 16 } as TerminalHallParams,
  build(p: TerminalHallParams): ObjectResult {
    const { w, d, h, rearGap } = p;
    const hW = w / 2;
    const hD = d / 2;
    const hH = h / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const group = new THREE.Group();

    // ── Floor slab ─────────────────────────────────────────────────────────
    const floorT = 0.25;
    parts.push(tintedBox(w, floorT, d, 0, floorT / 2, 0, FLOOR_COLOR));
    // Tile accent lines (thin grooves baked as darker strips)
    const TILE_PITCH = 2.0;
    const nTileX = Math.floor(w / TILE_PITCH);
    const nTileZ = Math.floor(d / TILE_PITCH);
    for (let i = 1; i < nTileX; i++) {
      const gx = -hW + i * TILE_PITCH;
      parts.push(tintedBox(0.04, floorT + 0.01, d, gx, floorT / 2, 0, 0xd0cdc6));
    }
    for (let j = 1; j < nTileZ; j++) {
      const gz = -hD + j * TILE_PITCH;
      parts.push(tintedBox(w, floorT + 0.01, 0.04, 0, floorT / 2, gz, 0xd0cdc6));
    }
    colliders.push(solidBox(0, floorT / 2, 0, w, floorT, d));

    // ── Side walls (left x = -w/2, right x = +w/2) ────────────────────────
    // Between structural columns the side walls are glazed — we add opaque wall
    // only at the column positions and glass bays between. The columns go from
    // y=0 to y=h, spaced COL_BAY apart. We cap the top with a spandrel rail.
    const SPANDREL_H = 1.4;   // solid band at the top of each bay
    const GLASS_BOT_Y = 0.4;  // sill height

    // Column x-positions along each side: from -hW to +hW, stepping COL_BAY.
    const nCols = Math.round(w / COL_BAY) + 1;
    const colXs: number[] = [];
    for (let c = 0; c < nCols; c++) {
      colXs.push(-hW + c * (w / (nCols - 1)));
    }

    // Side wall spandrel strip at top (full length)
    parts.push(tintedBox(WALL_T, SPANDREL_H, d, -hW, h - SPANDREL_H / 2, 0, WALL_COLOR));
    parts.push(tintedBox(WALL_T, SPANDREL_H, d,  hW, h - SPANDREL_H / 2, 0, WALL_COLOR));
    // Side wall sill strip at bottom
    parts.push(tintedBox(WALL_T, GLASS_BOT_Y, d, -hW, GLASS_BOT_Y / 2, 0, WALL_COLOR));
    parts.push(tintedBox(WALL_T, GLASS_BOT_Y, d,  hW, GLASS_BOT_Y / 2, 0, WALL_COLOR));

    // Structural columns along each side + glass bays between them
    const bayGlassH = h - SPANDREL_H - GLASS_BOT_Y;
    const bayGlassY = GLASS_BOT_Y;

    for (let ci = 0; ci < colXs.length; ci++) {
      const cx = colXs[ci];

      // Left side column
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE, -hW + COL_SIZE / 2, hH, cx, COLUMN_COLOR));
      colliders.push(solidBox(-hW + COL_SIZE / 2, hH, cx, COL_SIZE, h, COL_SIZE));

      // Right side column
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE,  hW - COL_SIZE / 2, hH, cx, COLUMN_COLOR));
      colliders.push(solidBox( hW - COL_SIZE / 2, hH, cx, COL_SIZE, h, COL_SIZE));

      // Glass bay between this column and the next
      if (ci < colXs.length - 1) {
        const nextCX = colXs[ci + 1];
        const bayMidZ = (cx + nextCX) / 2;
        const bayD = Math.abs(nextCX - cx) - COL_SIZE;

        const glassLeft = makeGlassPanel({
          w: bayD, h: bayGlassH,
          divisions: 2, opacity: 0.45,
          tint: 0x9fd8ff, frameColor: PALETTE.steel,
        });
        glassLeft.rotation.y = Math.PI / 2;
        glassLeft.position.set(-hW + WALL_T, bayGlassY, bayMidZ);
        group.add(glassLeft);

        const glassRight = makeGlassPanel({
          w: bayD, h: bayGlassH,
          divisions: 2, opacity: 0.45,
          tint: 0x9fd8ff, frameColor: PALETTE.steel,
        });
        glassRight.rotation.y = -Math.PI / 2;
        glassRight.position.set(hW - WALL_T, bayGlassY, bayMidZ);
        group.add(glassRight);
      }
    }

    // Side wall full colliders (slim, behind columns — stops slipping through)
    colliders.push(solidBox(-hW + WALL_T / 2, hH, 0, WALL_T, h, d));
    colliders.push(solidBox( hW - WALL_T / 2, hH, 0, WALL_T, h, d));

    // ── Back wall at z = -d/2 (split with rearGap doorway) ────────────────
    const backSegW = (w - rearGap) / 2;
    // Left segment
    parts.push(tintedBox(backSegW, h, WALL_T, -hW + backSegW / 2, hH, -hD, WALL_COLOR));
    colliders.push(solidBox(-hW + backSegW / 2, hH, -hD, backSegW, h, WALL_T));
    // Right segment
    parts.push(tintedBox(backSegW, h, WALL_T,  hW - backSegW / 2, hH, -hD, WALL_COLOR));
    colliders.push(solidBox( hW - backSegW / 2, hH, -hD, backSegW, h, WALL_T));

    // Back wall doorway arch header
    const archH = 0.8;
    parts.push(tintedBox(rearGap, archH, WALL_T, 0, h - archH / 2, -hD, COLUMN_COLOR));
    // Door frame columns
    parts.push(tintedBox(COL_SIZE, h, COL_SIZE, -rearGap / 2 - COL_SIZE / 2, hH, -hD, COLUMN_COLOR));
    parts.push(tintedBox(COL_SIZE, h, COL_SIZE,  rearGap / 2 + COL_SIZE / 2, hH, -hD, COLUMN_COLOR));
    colliders.push(solidBox(-rearGap / 2 - COL_SIZE / 2, hH, -hD, COL_SIZE, h, COL_SIZE));
    colliders.push(solidBox( rearGap / 2 + COL_SIZE / 2, hH, -hD, COL_SIZE, h, COL_SIZE));

    // ── Front — no wall mesh (open entrance) ──────────────────────────────
    // Only short front-corner returns (~1m) to block the corners
    const RETURN_W = 1.2;
    parts.push(tintedBox(RETURN_W, h, WALL_T, -hW + RETURN_W / 2, hH, hD, WALL_COLOR));
    parts.push(tintedBox(RETURN_W, h, WALL_T,  hW - RETURN_W / 2, hH, hD, WALL_COLOR));
    colliders.push(solidBox(-hW + RETURN_W / 2, hH, hD, RETURN_W, h, WALL_T));
    colliders.push(solidBox( hW - RETURN_W / 2, hH, hD, RETURN_W, h, WALL_T));

    // ── Interior center column row ─────────────────────────────────────────
    const nIntCols = Math.floor(d / COL_BAY) - 1;
    for (let ic = 1; ic <= nIntCols; ic++) {
      const iz = -hD + ic * (d / (nIntCols + 1));
      parts.push(tintedBox(COL_SIZE, h, COL_SIZE, 0, hH, iz, COLUMN_COLOR));
      colliders.push(solidBox(0, hH, iz, COL_SIZE, h, COL_SIZE));
    }

    // ── Ceiling beams (thin grid) ──────────────────────────────────────────
    const beamT = 0.3;
    const beamH = 0.5;
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

    // ── Roof slab ──────────────────────────────────────────────────────────
    const roofT = 0.4;
    parts.push(tintedBox(w, roofT, d, 0, h + roofT / 2, 0, ROOF_COLOR));
    // Blue steel fascia around the perimeter
    const fasciaH = 1.0;
    parts.push(tintedBox(w + 0.6, fasciaH, roofT,       0,  h + fasciaH / 2,  hD + roofT / 2, FASCIA_COLOR));
    parts.push(tintedBox(w + 0.6, fasciaH, roofT,       0,  h + fasciaH / 2, -hD - roofT / 2, FASCIA_COLOR));
    parts.push(tintedBox(WALL_T,  fasciaH, d + 0.6, -hW - roofT / 2, h + fasciaH / 2, 0, FASCIA_COLOR));
    parts.push(tintedBox(WALL_T,  fasciaH, d + 0.6,  hW + roofT / 2, h + fasciaH / 2, 0, FASCIA_COLOR));

    // ── Skylight strips on the roof ────────────────────────────────────────
    // 3 parallel strips running along Z
    const skylightW = 4.0;
    const skylightT = 0.12;
    const skylightXPositions = [-w * 0.28, 0, w * 0.28];
    for (const sx of skylightXPositions) {
      parts.push(tintedBox(skylightW, skylightT, d * 0.85, sx, h + roofT + skylightT / 2, 0, SKYLIGHT_COLOR));
      // emissive skylight glow accent box inside (slightly lower)
      parts.push(tintedBox(skylightW - 0.4, skylightT, d * 0.85, sx, h - 0.08, 0, 0xd8edf7));
    }

    // ── Entrance signage ──────────────────────────────────────────────────
    // "DEPARTURES" over the open front — on a horizontal board above the entrance
    const signBoard = tintedBox(w * 0.5, 1.4, 0.3, 0, h - 0.7, hD - 0.2, FASCIA_COLOR);
    parts.push(signBoard);

    const depsign = makeTextSignMesh({
      text: "DEPARTURES",
      w: w * 0.45,
      h: 1.1,
      boardColor: FASCIA_COLOR,
      textColor: "#e8f4ff",
      glow: 0.85,
    });
    depsign.position.set(-w * 0.225, h - 1.2, hD - DECAL_GAP);
    group.add(depsign);

    // Airport IATA-style name tag
    const airportSign = makeTextSignMesh({
      text: "RISHON INTERNATIONAL",
      w: w * 0.35,
      h: 0.7,
      boardColor: 0x1a3a5a,
      textColor: "#c8e0f4",
      glow: 0.7,
    });
    airportSign.position.set(-w * 0.175, h - 2.2, hD - DECAL_GAP);
    group.add(airportSign);

    // ── Merge opaque geometry ─────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

    return {
      mesh: group,
      colliders,
      obstacles: [{ x: 0, z: 0, w, d }],
      anchors: {
        concourseGap: { x: 0, z: -hD },
        door: { x: 0, z: hD },
      },
    };
  },
});
