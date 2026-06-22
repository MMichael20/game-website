// src/world/catalog/airport/jetBridge.ts
//
// "jetBridge" — a telescoping passenger boarding bridge.
// ORIENTATION: runs along +x. Terminal rotunda end at x=0, aircraft docking cab at x=+len.
// The bridge floor is elevated ~3m above ground. Passengers walk inside conceptually.
// LOCAL space: centered z=0, base y=0, FRONT (+z) is a secondary orientation.
// ~1u = 1m. Fully deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, cone, disc, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Colors
const TUNNEL_BODY   = 0xd8d4cc;  // light warm grey tunnel panels
const TUNNEL_DARK   = 0xb0ada6;  // darker window strip frame band
const TUNNEL_STRIPE = 0x4a7aa0;  // blue accent stripe on tunnel
const WINDOW_COLOR  = 0xddeeff;  // light-blue tinted window strip
const SUPPORT_COL   = PALETTE.steel;
const ROTUNDA_COLOR = 0xdedad4;  // rotunda drum
const ROTUNDA_ROOF  = 0x9aa0a8;  // rotunda top
const CAB_COLOR     = 0xc8c4bc;  // cab at aircraft end
const CAB_BUMP      = 0x555f66;  // rubber bumper on cab

interface JetBridgeParams {
  len: number;
}

defineObject("jetBridge", {
  params: { len: 14 } as JetBridgeParams,
  build(p: JetBridgeParams): ObjectResult {
    const { len } = p;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    const group = new THREE.Group();

    // ── Elevation constants ────────────────────────────────────────────────
    const BRIDGE_FLOOR_Y = 3.0;   // passengers walk at this height
    const TUN_H          = 2.6;   // interior tunnel height
    const TUNNEL_BOTTOM  = BRIDGE_FLOOR_Y - 0.15;  // tunnel bottom face y

    // ── Rotunda drum at x=0 (terminal connection) ─────────────────────────
    const rotR  = 2.2;
    const rotH  = TUN_H + 0.5;
    const rotColH = BRIDGE_FLOOR_Y;  // column supporting the rotunda
    const rotColR = 0.35;

    // Support column under rotunda
    parts.push(cylinderY(rotColR, rotColH, 0, rotColH / 2, 0, SUPPORT_COL, 10));
    // Column base plate
    parts.push(tintedBox(rotColR * 2.5, 0.18, rotColR * 2.5, 0, 0.09, 0, SUPPORT_COL));

    // Rotunda drum body
    parts.push(cylinderY(rotR, rotH, 0, BRIDGE_FLOOR_Y + rotH / 2, 0, ROTUNDA_COLOR, 20));
    // Rotunda roof cap (cone + disc)
    parts.push(disc(rotR + 0.2, 0.18, 0, BRIDGE_FLOOR_Y + rotH + 0.09, 0, ROTUNDA_ROOF, 20));
    parts.push(cone(rotR - 0.3, 0.0, 0.7, 0, BRIDGE_FLOOR_Y + rotH + 0.18, 0, ROTUNDA_ROOF, 16));
    // Rotunda windows (evenly spaced small window holes baked as lighter insets)
    for (let wi = 0; wi < 6; wi++) {
      const wa = (wi / 6) * Math.PI * 2;
      const wx = Math.cos(wa) * (rotR - 0.05);
      const wz = Math.sin(wa) * (rotR - 0.05);
      parts.push(tintedBox(0.55, 0.9, 0.06, wx, BRIDGE_FLOOR_Y + rotH * 0.55, wz, WINDOW_COLOR));
    }
    // Blue accent band on rotunda
    parts.push(cylinderY(rotR + 0.02, 0.2, 0, BRIDGE_FLOOR_Y + 0.6, 0, TUNNEL_STRIPE, 20));

    // ── Three nested tunnel sections ──────────────────────────────────────
    // Section A: wide outer tunnel, x = 0 to len*0.45
    // Section B: medium tunnel,     x = len*0.3 to len*0.75
    // Section C: narrow inner tunnel, x = len*0.65 to len (docking end)
    // They overlap slightly to imply telescoping

    const sections = [
      { xStart: 0,          xEnd: len * 0.48, tw: 2.8, th: TUN_H + 0.3, wallT: 0.18, color: TUNNEL_BODY, stripe: TUNNEL_STRIPE },
      { xStart: len * 0.32, xEnd: len * 0.78, tw: 2.5, th: TUN_H + 0.1, wallT: 0.16, color: 0xcbc8c0,    stripe: 0x3a6a90 },
      { xStart: len * 0.64, xEnd: len,        tw: 2.2, th: TUN_H,        wallT: 0.14, color: 0xbdbab3,    stripe: 0x2a5a80 },
    ];

    for (const sec of sections) {
      const secLen   = sec.xEnd - sec.xStart;
      const secCX    = sec.xStart + secLen / 2;
      const secFloor = TUNNEL_BOTTOM;
      const secTop   = secFloor + sec.th;
      const secMidY  = secFloor + sec.th / 2;

      // Roof slab
      parts.push(tintedBox(secLen, sec.wallT, sec.tw + sec.wallT * 2,
        secCX, secTop + sec.wallT / 2, 0, sec.color));
      // Floor slab
      parts.push(tintedBox(secLen, sec.wallT, sec.tw + sec.wallT * 2,
        secCX, secFloor - sec.wallT / 2, 0, TUNNEL_DARK));
      // Side walls
      parts.push(tintedBox(secLen, sec.th, sec.wallT,
        secCX, secMidY, (sec.tw / 2 + sec.wallT / 2), sec.color));
      parts.push(tintedBox(secLen, sec.th, sec.wallT,
        secCX, secMidY, -(sec.tw / 2 + sec.wallT / 2), sec.color));

      // Blue accent stripe along each side at mid height
      parts.push(tintedBox(secLen, 0.18, 0.04,
        secCX, secMidY + 0.3, (sec.tw / 2 + sec.wallT + DECAL_GAP), sec.stripe));
      parts.push(tintedBox(secLen, 0.18, 0.04,
        secCX, secMidY + 0.3, -(sec.tw / 2 + sec.wallT + DECAL_GAP), sec.stripe));

      // Window strip (porthole row along +z side): small bright rectangular windows
      const windowCount = Math.floor(secLen / 1.4);
      const windowPitch = secLen / (windowCount + 1);
      for (let wi = 1; wi <= windowCount; wi++) {
        const wx = sec.xStart + wi * windowPitch;
        // +z side window
        parts.push(tintedBox(0.6, 0.45, 0.04,
          wx, secMidY + 0.35, (sec.tw / 2 + sec.wallT + DECAL_GAP), WINDOW_COLOR));
        // -z side window
        parts.push(tintedBox(0.6, 0.45, 0.04,
          wx, secMidY + 0.35, -(sec.tw / 2 + sec.wallT + DECAL_GAP), WINDOW_COLOR));
      }

      // End cap panels at junctions (cover open ends between sections)
      parts.push(tintedBox(sec.wallT * 1.5, sec.th + sec.wallT, sec.tw + sec.wallT * 2,
        sec.xStart, secMidY, 0, TUNNEL_DARK));
    }

    // ── Support legs (A-frames under the tunnel) ──────────────────────────
    // Two A-frame leg pairs spaced along the bridge length
    const legPositions = [len * 0.28, len * 0.62];
    const legSpan      = 2.0;   // horizontal spread at base
    const legFootY     = 0.1;

    for (const lx of legPositions) {
      const legH = TUNNEL_BOTTOM - legFootY;
      // Each A-frame: two diagonal legs converging at tunnel base center
      for (const lz of [-1, 1]) {
        const footZ = lz * legSpan;
        const topZ  = lz * 0.8;  // meet closer to center at top

        // Leg as a box, rotated by the A-frame angle
        const dz = topZ - footZ;
        const angle = Math.atan2(dz, legH);
        const legLength = Math.sqrt(legH * legH + dz * dz);

        const legGeo = new THREE.BoxGeometry(0.18, legLength, 0.18);
        legGeo.rotateX(angle);
        legGeo.translate(lx, (legFootY + TUNNEL_BOTTOM) / 2, (footZ + topZ) / 2);
        const col = SUPPORT_COL;
        const r_ = ((col >> 16) & 0xff) / 255;
        const g_ = ((col >> 8) & 0xff) / 255;
        const b_ = (col & 0xff) / 255;
        const positions = legGeo.attributes.position;
        const colors: number[] = [];
        for (let v = 0; v < positions.count; v++) { colors.push(r_, g_, b_); }
        legGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
        parts.push(legGeo);
      }
      // Cross brace between the two legs
      parts.push(tintedBox(0.12, 0.12, legSpan * 1.8,
        lx, TUNNEL_BOTTOM - 0.6, 0, SUPPORT_COL));

      // Leg colliders (foot pads that player can see)
      colliders.push(solidBox(lx, 0.15, -legSpan, 0.22, 0.3, 0.22));
      colliders.push(solidBox(lx, 0.15, legSpan, 0.22, 0.3, 0.22));
    }

    // ── Docking cab at far end (x=len) ────────────────────────────────────
    const cabW = 3.2;
    const cabH = TUN_H + 0.6;
    const cabD = 2.6;
    const cabX = len;
    const cabY = BRIDGE_FLOOR_Y;

    // Main cab body
    parts.push(tintedBox(cabD, cabH, cabW,
      cabX + cabD / 2, cabY + cabH / 2, 0, CAB_COLOR));
    // Cab roof (darker)
    parts.push(tintedBox(cabD + 0.2, 0.2, cabW + 0.2,
      cabX + cabD / 2, cabY + cabH + 0.1, 0, 0x888880));
    // Rubber bumper / jetway hood (dark ring)
    parts.push(tintedBox(0.28, cabH, cabW + 0.3,
      cabX + cabD + 0.14, cabY + cabH / 2, 0, CAB_BUMP));
    // Cab windows (front face)
    parts.push(tintedBox(0.04, cabH * 0.6, cabW * 0.7,
      cabX + cabD + 0.01, cabY + cabH * 0.6, 0, WINDOW_COLOR));
    // Blue accent stripe on cab
    parts.push(tintedBox(cabD + 0.22, 0.22, cabW + 0.22,
      cabX + cabD / 2, cabY + 0.55, 0, TUNNEL_STRIPE));
    // Cab support column
    parts.push(cylinderY(0.3, cabY, cabX + cabD * 0.4, cabY / 2, 0, SUPPORT_COL, 8));

    // ── Obstacle for the full length underside footprint ──────────────────
    // (The bridge is overhead but the legs/columns create walkable obstacles)
    obstacles.push({ x: len / 2, z: 0, w: len + cabD, d: 3.5 });

    // ── Merge all geometry ─────────────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    group.add(mainMesh);

    return {
      mesh: group,
      colliders,
      obstacles,
    };
  },
});
