// src/world/catalog/airport/gateLounge.ts
//
// "gateLounge" — a departure gate waiting area.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z (toward the apron / window wall).
// ~1u = 1m. Fully deterministic — no Math.random / Date.now.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeGlassPanel } from "../../objects/glass";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect, Vec2, Seat } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

const FLOOR_COLOR  = 0xe8e4dc;  // light stone tile
const WALL_COLOR   = 0xf0ede6;  // pale warm white
const DESK_BODY    = 0xf5f5f5;  // near-white desk
const DESK_COUNTER = 0xe0ddd8;  // slightly darker counter top
const SEAT_FRAME   = PALETTE.steel;
const SEAT_PAD     = 0x2a5ea0;  // airport blue upholstery
const SEAT_BACK    = 0x234e8a;  // darker blue backrest
const MONITOR_BODY = 0x222222;  // dark grey monitor casing
const MONITOR_SCR  = 0x1a6bbf;  // blue-tint display
const SCANNER_BASE = 0x555555;  // dark pedestal
const SCANNER_GLOW = 0x44ff88;  // green scan beam
const GLASS_TINT   = 0x9fd8ff;  // window glass hint

interface GateLoungeParams {
  w: number;
  d: number;
  gate: string;
  route: string;
}

defineObject("gateLounge", {
  params: { w: 18, d: 14, gate: "B7", route: "TLV - JFK" } as GateLoungeParams,
  build(p: GateLoungeParams): ObjectResult {
    const { w, d } = p;
    const hW = w / 2;
    const hD = d / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    const group = new THREE.Group();

    // ── Floor ─────────────────────────────────────────────────────────────────
    const floorT = 0.12;
    parts.push(tintedBox(w, floorT, d, 0, floorT / 2, 0, FLOOR_COLOR));
    // Tile grid lines (thin dark strips every 2m)
    const TILE = 2.0;
    for (let xi = 1; xi < Math.floor(w / TILE); xi++) {
      const tx = -hW + xi * TILE;
      parts.push(tintedBox(0.04, floorT + 0.01, d, tx, floorT / 2, 0, 0xd0ccc4));
    }
    for (let zi = 1; zi < Math.floor(d / TILE); zi++) {
      const tz = -hD + zi * TILE;
      parts.push(tintedBox(w, floorT + 0.01, 0.04, 0, floorT / 2, tz, 0xd0ccc4));
    }

    // ── Rear wall (-z) ────────────────────────────────────────────────────────
    const wallH = 3.8;
    const wallT = 0.25;
    parts.push(tintedBox(w, wallH, wallT, 0, wallH / 2, -hD + wallT / 2, WALL_COLOR));
    // Side walls (partial — they blend into the hall)
    parts.push(tintedBox(wallT, wallH, d * 0.6, -hW + wallT / 2, wallH / 2, -hD * 0.2, WALL_COLOR));
    parts.push(tintedBox(wallT, wallH, d * 0.6, hW - wallT / 2, wallH / 2, -hD * 0.2, WALL_COLOR));

    // ── Gate desk / podium ────────────────────────────────────────────────────
    // Positioned near rear wall, centered x, desk faces +z
    const deskW = 3.2;
    const deskD = 0.85;
    const deskH = 1.05;
    const deskZ = -hD + 1.8;   // close to rear wall
    const deskX = 0.0;

    // Body panels
    parts.push(tintedBox(deskW, deskH, deskD, deskX, deskH / 2, deskZ, DESK_BODY));
    // Counter top (slightly proud)
    parts.push(tintedBox(deskW + 0.1, 0.07, deskD + 0.15, deskX, deskH + 0.035, deskZ, DESK_COUNTER));
    // Fascia panel with airline blue accent strip
    parts.push(tintedBox(deskW, 0.18, 0.04, deskX, deskH - 0.09, deskZ + deskD / 2, 0x1a5fa0));
    // Desk leg details (four corner legs visible as thin darker panels)
    for (const sx of [-1, 1]) {
      parts.push(tintedBox(0.06, deskH, deskD, deskX + sx * (deskW / 2 - 0.03), deskH / 2, deskZ, 0xdad8d4));
    }

    // Monitor on desk
    const monBase = deskH + 0.07;
    // Monitor arm / stand
    parts.push(tintedBox(0.06, 0.32, 0.06, deskX + 0.5, monBase + 0.16, deskZ - 0.1, MONITOR_BODY));
    // Monitor body (angled slightly)
    const monGeo = new THREE.BoxGeometry(0.56, 0.38, 0.06);
    monGeo.translate(deskX + 0.5, monBase + 0.46, deskZ - 0.1);
    parts.push(new THREE.BufferGeometry().copy(monGeo));
    // Tint monitor body dark
    const monBodyGeo = tintedBox(0.56, 0.38, 0.06, deskX + 0.5, monBase + 0.46, deskZ - 0.1, MONITOR_BODY);
    parts.push(monBodyGeo);
    // Screen surface (slightly proud, glowing blue)
    parts.push(tintedBox(0.48, 0.30, 0.02, deskX + 0.5, monBase + 0.46, deskZ - 0.07 + DECAL_GAP, MONITOR_SCR));

    // Desk collider
    colliders.push(solidBox(deskX, deskH / 2, deskZ, deskW + 0.1, deskH + 0.1, deskD + 0.15));
    obstacles.push({ x: deskX, z: deskZ, w: deskW + 0.3, d: deskD + 0.5 });

    // ── Gate number sign (large, on the rear wall above the desk) ─────────────
    const gateSignW = 2.2;
    const gateSignH = 0.7;
    const gateSign = makeTextSignMesh({
      text: `Gate ${p.gate}`,
      w: gateSignW,
      h: gateSignH,
      boardColor: 0x1a5fa0,
      textColor: "#ffffff",
      glow: 0.7,
    });
    gateSign.position.set(deskX, wallH - 0.9, -hD + wallT + DECAL_GAP);
    group.add(gateSign);

    // ── Route sign (below gate sign) ──────────────────────────────────────────
    const routeSign = makeTextSignMesh({
      text: p.route,
      w: 3.0,
      h: 0.42,
      boardColor: 0x333333,
      textColor: "#e8e8e8",
      glow: 0.3,
    });
    routeSign.position.set(deskX, wallH - 1.7, -hD + wallT + DECAL_GAP);
    group.add(routeSign);

    // ── Boarding-pass scanner stand ───────────────────────────────────────────
    const scanX = deskX + deskW / 2 + 0.6;
    const scanZ = deskZ + 0.1;
    const scanPedH = 1.0;
    const scanPedW = 0.22;
    // Pedestal post
    parts.push(cylinderY(scanPedW / 2, scanPedH, scanX, scanPedH / 2, scanZ, SCANNER_BASE));
    // Base foot
    parts.push(tintedBox(0.38, 0.06, 0.38, scanX, 0.03, scanZ, SCANNER_BASE));
    // Scanner head (box)
    parts.push(tintedBox(0.28, 0.18, 0.16, scanX, scanPedH + 0.09, scanZ, MONITOR_BODY));
    // Glowing scan line
    parts.push(tintedBox(0.26, 0.03, 0.04, scanX, scanPedH + 0.06, scanZ + 0.08 + DECAL_GAP, SCANNER_GLOW));
    colliders.push(solidBox(scanX, scanPedH / 2, scanZ, 0.38, scanPedH, 0.38));

    // ── Seating rows ──────────────────────────────────────────────────────────
    // Beam seat: a steel horizontal beam on two legs, padded seats + backrests
    // Seats derived from w; leave ~1.2m aisles on each side and a center aisle
    const seatSpacing = 0.62;     // per seat pitch
    const seatW       = 0.54;     // seat pad width
    const seatPadH    = 0.44;     // seat height from floor
    const seatPadD    = 0.46;     // seat depth
    const backH       = 0.52;     // backrest height above seat pad
    const beamY       = seatPadH - 0.04;  // where the steel beam sits
    const frameH      = 0.38;     // leg height
    const legW        = 0.06;

    // two seating banks: left (-x) and right (+x), split by center aisle
    const bankW       = (hW - 1.4) * 0.95;   // each bank half-width
    const seatsPerBank = Math.max(2, Math.floor(bankW / seatSpacing));
    const bankHalfW   = seatsPerBank * seatSpacing / 2;

    // 4 rows: z positions spaced through the middle of the lounge
    const rowZs = [-hD * 0.05, hD * 0.22, hD * 0.44, hD * 0.62];

    for (const rowZ of rowZs) {
      for (const bankSign of [-1, 1]) {
        const bankCX = bankSign * (hW / 2 + 0.2 - bankHalfW / 2);

        // Steel beam spanning the bank
        const beamLen = bankHalfW * 2 + 0.12;
        parts.push(tintedBox(beamLen, 0.06, 0.06, bankCX, beamY, rowZ, SEAT_FRAME));

        // Legs (one pair per every 2 seats, derived)
        const nLegPairs = Math.max(1, Math.round(seatsPerBank / 2));
        for (let lp = 0; lp <= nLegPairs; lp++) {
          const lx = bankCX - bankHalfW + lp * (beamLen / nLegPairs);
          // Front leg
          parts.push(tintedBox(legW, frameH, legW, lx, frameH / 2, rowZ + seatPadD / 2 - 0.06, SEAT_FRAME));
          // Rear leg
          parts.push(tintedBox(legW, frameH, legW, lx, frameH / 2, rowZ - seatPadD / 2 + 0.06, SEAT_FRAME));
        }

        // Seat pads + backrests
        for (let si = 0; si < seatsPerBank; si++) {
          const sx = bankCX - bankHalfW + si * seatSpacing + seatSpacing / 2;
          // Seat cushion
          parts.push(tintedBox(seatW, 0.1, seatPadD, sx, seatPadH, rowZ, SEAT_PAD));
          // Armrests (thin vertical slabs at seat edges)
          parts.push(tintedBox(0.05, 0.22, seatPadD, sx - seatW / 2, seatPadH + 0.08, rowZ, SEAT_FRAME));
          parts.push(tintedBox(0.05, 0.22, seatPadD, sx + seatW / 2, seatPadH + 0.08, rowZ, SEAT_FRAME));
          // Backrest
          parts.push(tintedBox(seatW - 0.04, backH, 0.1, sx, seatPadH + 0.1 + backH / 2, rowZ - seatPadD / 2 + 0.05, SEAT_BACK));
        }

        // Row obstacle
        obstacles.push({ x: bankCX, z: rowZ, w: bankHalfW * 2 + 0.2, d: seatPadD + 0.2 });
      }
    }

    // ── Overhead departure board on side wall ─────────────────────────────────
    const boardW = 4.5;
    const boardH = 0.6;
    const departBoard = makeTextSignMesh({
      text: "DEPARTURES",
      w: boardW,
      h: boardH,
      boardColor: 0x111122,
      textColor: "#ffdd44",
      glow: 0.8,
    });
    departBoard.position.set(-hW + wallT + DECAL_GAP, wallH - 0.55, -hD * 0.1);
    departBoard.rotation.y = Math.PI / 2;
    group.add(departBoard);

    // ── Window wall / glass balustrade at +z edge (toward apron) ─────────────
    const glassH = 2.4;
    const glassBays = Math.floor(w / 3.0);
    const bayW = w / glassBays;
    for (let bi = 0; bi < glassBays; bi++) {
      const bx = -hW + bi * bayW + bayW / 2;
      const glassPanel = makeGlassPanel({
        w: bayW - 0.12,
        h: glassH,
        divisions: 2,
        opacity: 0.38,
        tint: GLASS_TINT,
        frameColor: PALETTE.steel,
      });
      glassPanel.position.set(bx, 0, hD - 0.12);
      group.add(glassPanel);
    }
    // Glass base balustrade rail (a solid steel bar)
    parts.push(tintedBox(w, 0.1, 0.08, 0, glassH + 0.05, hD - 0.08, PALETTE.steelLight));

    // ── Ceiling structure (suspended beam) ────────────────────────────────────
    parts.push(tintedBox(w, 0.18, 0.22, 0, wallH - 0.09, -hD * 0.3, 0x9aa0a8)); // hanging beam
    // Ceiling recessed strip lights (thin bright strips)
    for (let li = 0; li < 4; li++) {
      const lz = -hD * 0.5 + li * (d * 0.5 / 3);
      parts.push(tintedBox(w - 0.5, 0.04, 0.18, 0, wallH - 0.03, lz, 0xeeeee0));
    }

    // ── Merge opaque geometry ─────────────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    const anchors: Record<string, Vec2 | Seat> = {
      boardingDoor: { x: 0, z: hD },
    };

    // Desk obstacle already pushed above; add a wall-zone obstacle at rear
    obstacles.push({ x: 0, z: -hD + 1.0, w: w, d: 2.0 });

    return {
      mesh: group,
      colliders,
      obstacles,
      anchors,
    };
  },
});
