// src/world/catalog/airport/securityLane.ts
//
// "securityLane" — airport security checkpoint with X-ray machines, conveyor
// belts, walk-through metal-detector arches, tray carts, and lane dividers.
// Players walk +z through the arch. LOCAL space: centered x=z=0, base y=0.
// ~1u = 1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, disc, mergeTinted, tintedMesh,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const XRAY_BODY    = 0x2a3038;  // dark machine body
const XRAY_ACCENT  = 0x1a5a9a;  // blue accent strips
const TUNNEL_COLOR = 0x161b22;  // darker tunnel mouth
const SCREEN_COL   = 0x2a7f3c;  // green X-ray screen tint
const ARCH_COLOR   = PALETTE.steelLight;
const ARCH_WARN    = 0xf2c14e;  // warning yellow stripe on arch
const CONVEYOR_COL = 0x3a3a42;  // conveyor bed
const SLAT_COLOR   = 0x555560;  // conveyor slats
const ROLLER_COLOR = PALETTE.steelDark;
const TRAY_BODY    = 0xb0a898;  // grey tray
const DIVIDER_COL  = 0x5a5a62;  // lane divider rail

// Per-lane dimensions
const XRAY_W  = 1.2;   // X-ray machine width
const XRAY_H  = 1.2;   // X-ray machine height
const XRAY_D  = 2.0;   // depth (along Z)
const TUNNEL_W = 0.7;  // tunnel opening width
const TUNNEL_H = 0.55; // tunnel opening height

const CONV_W  = XRAY_W - 0.1;  // conveyor width
const CONV_H  = 0.18;           // conveyor bed height
const CONV_D_IN  = 1.4;         // infeed conveyor length
const CONV_D_OUT = 1.2;         // outfeed conveyor length

const ARCH_W  = 1.1;   // arch opening width
const ARCH_H  = 2.2;   // arch total height
const ARCH_T  = 0.18;  // arch post thickness
const ARCH_ZOS = 1.6;  // z-offset behind X-ray machine (+z)

const LANE_SPACING = 2.0; // center-to-center lane spacing

interface SecurityLaneParams {
  lanes: number;
}

defineObject("securityLane", {
  params: { lanes: 3 } as SecurityLaneParams,
  build(p: SecurityLaneParams): ObjectResult {
    const { lanes } = p;
    const totalW = lanes * LANE_SPACING;
    const hTW = totalW / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const obstacles: Rect[] = [];
    const group = new THREE.Group();

    for (let l = 0; l < lanes; l++) {
      const lx = -hTW + (l + 0.5) * LANE_SPACING;

      // ── X-ray machine body ─────────────────────────────────────────────
      // Main body block
      parts.push(tintedBox(XRAY_W, XRAY_H, XRAY_D, lx, XRAY_H / 2, 0, XRAY_BODY));
      // Blue accent band across the front face
      parts.push(tintedBox(XRAY_W + 0.02, 0.12, 0.04, lx, XRAY_H * 0.72, XRAY_D / 2 + 0.02, XRAY_ACCENT));
      parts.push(tintedBox(XRAY_W + 0.02, 0.12, 0.04, lx, XRAY_H * 0.28, XRAY_D / 2 + 0.02, XRAY_ACCENT));
      // Machine top accent
      parts.push(tintedBox(XRAY_W, 0.08, XRAY_D, lx, XRAY_H + 0.04, 0, 0x1a4070));
      // Warning light on top
      parts.push(cylinderY(0.08, 0.18, lx, XRAY_H + 0.13, 0, 0xf2c14e, 8));
      parts.push(disc(0.1, 0.04, lx, XRAY_H + 0.22, 0, 0xe0a030, 8));
      // Corner rivets
      for (const sx of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) {
        parts.push(tintedBox(0.04, 0.04, 0.04,
          lx + sx * (XRAY_W - 0.06), XRAY_H - 0.08,
          sz * (XRAY_D - 0.06), PALETTE.steelLight));
      }

      // Tunnel mouth (darker recess on front and back)
      // Front opening (-z face of machine)
      parts.push(tintedBox(TUNNEL_W, TUNNEL_H, 0.12,
        lx, CONV_H + TUNNEL_H / 2, -(XRAY_D / 2) + 0.06, TUNNEL_COLOR));
      // Back opening (+z face)
      parts.push(tintedBox(TUNNEL_W, TUNNEL_H, 0.12,
        lx, CONV_H + TUNNEL_H / 2,  (XRAY_D / 2) - 0.06, TUNNEL_COLOR));

      // Angled operator screen (small monitor on top-side)
      const scrW = 0.36; const scrH = 0.28;
      parts.push(tintedBox(scrW, scrH, 0.08, lx + XRAY_W * 0.3, XRAY_H + 0.04, 0.1, XRAY_BODY));
      // Tilt the screen with a trapezoid approximation (just a thin angled box)
      parts.push(tintedBox(scrW - 0.04, scrH - 0.04, 0.02,
        lx + XRAY_W * 0.3, XRAY_H + 0.04, 0.1 + 0.04, SCREEN_COL));

      // Keyboard panel on the operator console
      parts.push(tintedBox(0.28, 0.02, 0.18, lx + XRAY_W * 0.3, XRAY_H + 0.01, -0.05, 0x1a1f28));

      // Collider: X-ray machine
      colliders.push(solidBox(lx, XRAY_H / 2, 0, XRAY_W, XRAY_H, XRAY_D));
      obstacles.push({ x: lx, z: 0, w: XRAY_W + 0.1, d: XRAY_D + 0.1 });

      // ── Infeed conveyor (before X-ray, on -z side) ────────────────────
      const infeedZ = -(XRAY_D / 2) - CONV_D_IN / 2;
      parts.push(tintedBox(CONV_W, CONV_H, CONV_D_IN, lx, CONV_H / 2, infeedZ, CONVEYOR_COL));
      // Slats
      const nSlatsIn = 7;
      for (let s = 0; s < nSlatsIn; s++) {
        const sz = infeedZ - CONV_D_IN / 2 + (s + 0.5) * (CONV_D_IN / nSlatsIn);
        parts.push(tintedBox(CONV_W, 0.03, 0.05, lx, CONV_H + 0.015, sz, SLAT_COLOR));
      }
      // End rollers
      parts.push(cylinderY(0.06, CONV_W, lx, CONV_H * 0.5, infeedZ - CONV_D_IN / 2 + 0.04, ROLLER_COLOR, 8));
      parts.push(cylinderY(0.06, CONV_W, lx, CONV_H * 0.5, infeedZ + CONV_D_IN / 2 - 0.04, ROLLER_COLOR, 8));
      // Conveyor legs
      for (const sz of [-0.3, 0.3]) {
        parts.push(tintedBox(0.06, CONV_H * 0.8, 0.06, lx - CONV_W * 0.4, CONV_H * 0.4, infeedZ + sz, XRAY_BODY));
        parts.push(tintedBox(0.06, CONV_H * 0.8, 0.06, lx + CONV_W * 0.4, CONV_H * 0.4, infeedZ + sz, XRAY_BODY));
      }

      // ── Outfeed conveyor (+z side) ────────────────────────────────────
      const outfeedZ = (XRAY_D / 2) + CONV_D_OUT / 2;
      parts.push(tintedBox(CONV_W, CONV_H, CONV_D_OUT, lx, CONV_H / 2, outfeedZ, CONVEYOR_COL));
      const nSlatsOut = 6;
      for (let s = 0; s < nSlatsOut; s++) {
        const sz = outfeedZ - CONV_D_OUT / 2 + (s + 0.5) * (CONV_D_OUT / nSlatsOut);
        parts.push(tintedBox(CONV_W, 0.03, 0.05, lx, CONV_H + 0.015, sz, SLAT_COLOR));
      }
      parts.push(cylinderY(0.06, CONV_W, lx, CONV_H * 0.5, outfeedZ - CONV_D_OUT / 2 + 0.04, ROLLER_COLOR, 8));
      parts.push(cylinderY(0.06, CONV_W, lx, CONV_H * 0.5, outfeedZ + CONV_D_OUT / 2 - 0.04, ROLLER_COLOR, 8));

      // ── Walk-through arch ─────────────────────────────────────────────
      // Placed ARCH_ZOS behind the X-ray machine (+z)
      const archZ = ARCH_ZOS;
      const archCX = lx;
      // Left post
      parts.push(tintedBox(ARCH_T, ARCH_H, ARCH_T,
        archCX - ARCH_W / 2 - ARCH_T / 2, ARCH_H / 2, archZ, ARCH_COLOR));
      colliders.push(solidBox(
        archCX - ARCH_W / 2 - ARCH_T / 2, ARCH_H / 2, archZ, ARCH_T, ARCH_H, ARCH_T));
      // Right post
      parts.push(tintedBox(ARCH_T, ARCH_H, ARCH_T,
        archCX + ARCH_W / 2 + ARCH_T / 2, ARCH_H / 2, archZ, ARCH_COLOR));
      colliders.push(solidBox(
        archCX + ARCH_W / 2 + ARCH_T / 2, ARCH_H / 2, archZ, ARCH_T, ARCH_H, ARCH_T));
      // Lintel (top bar)
      parts.push(tintedBox(ARCH_W + ARCH_T * 2, ARCH_T, ARCH_T,
        archCX, ARCH_H - ARCH_T / 2, archZ, ARCH_COLOR));
      // Warning stripe on lintel
      parts.push(tintedBox((ARCH_W + ARCH_T * 2) * 0.6, 0.06, ARCH_T + 0.01,
        archCX, ARCH_H - ARCH_T * 0.7, archZ, ARCH_WARN));
      // LED indicator lights on posts
      for (const postX of [-1, 1]) {
        const px = archCX + postX * (ARCH_W / 2 + ARCH_T / 2);
        parts.push(tintedBox(ARCH_T + 0.02, 0.12, ARCH_T + 0.02, px, ARCH_H * 0.55, archZ, 0x2a9a4a));
        parts.push(tintedBox(ARCH_T + 0.02, 0.12, ARCH_T + 0.02, px, ARCH_H * 0.75, archZ, 0x2a9a4a));
      }

      // ── Tray cart ─────────────────────────────────────────────────────
      // A stack of shallow trays on the infeed side
      const trayCartZ = infeedZ - CONV_D_IN / 2 - 0.5;
      const trayCartX = lx + XRAY_W * 0.35;
      // Cart base frame
      parts.push(tintedBox(0.7, 0.1, 0.55, trayCartX, 0.05, trayCartZ, XRAY_BODY));
      // Cart legs
      for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) {
        parts.push(tintedBox(0.06, 0.7, 0.06,
          trayCartX + sx * 0.3, 0.35, trayCartZ + sz2 * 0.22, XRAY_BODY));
      }
      // Tray stack (4 trays)
      for (let t = 0; t < 4; t++) {
        const ty = 0.7 + t * 0.06;
        parts.push(tintedBox(0.6, 0.04, 0.44, trayCartX, ty + 0.02, trayCartZ, TRAY_BODY));
        // Tray rim accent
        parts.push(tintedBox(0.62, 0.02, 0.04, trayCartX, ty + 0.03, trayCartZ - 0.22, 0x9a9490));
        parts.push(tintedBox(0.62, 0.02, 0.04, trayCartX, ty + 0.03, trayCartZ + 0.22, 0x9a9490));
      }
    }

    // ── Lane dividers (low rails between lanes) ───────────────────────────
    const dividerH = 0.9;
    const dividerT = 0.08;
    const totalLaneD = XRAY_D + CONV_D_IN + CONV_D_OUT + 0.5;
    const dividerZCenter = (CONV_D_OUT - CONV_D_IN) / 2;

    for (let d2 = 0; d2 <= lanes; d2++) {
      const dx = -hTW + d2 * LANE_SPACING;
      parts.push(tintedBox(dividerT, dividerH, totalLaneD,
        dx, dividerH / 2, dividerZCenter, DIVIDER_COL));
      // Top cap
      parts.push(tintedBox(dividerT + 0.04, 0.06, totalLaneD + 0.04,
        dx, dividerH + 0.03, dividerZCenter, PALETTE.steelLight));
    }

    // ── "SECURITY" sign ────────────────────────────────────────────────────
    // (sign code via canvas texture — emissive board above the infeed area)
    const secBoardY = XRAY_H + 0.5;
    const secBoardW = Math.min(totalW * 0.7, 5.0);
    parts.push(tintedBox(secBoardW, 0.5, 0.15, 0, secBoardY + 0.25, -(XRAY_D / 2) - 0.2, 0x1a3a6a));
    const secTex = (() => {
      const c = document.createElement("canvas");
      c.width = 512; c.height = 96;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#1a3a6a";
      ctx.fillRect(0, 0, 512, 96);
      ctx.fillStyle = "#e8f4ff";
      ctx.font = "bold 48px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SECURITY CHECKPOINT", 256, 48);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const secMat = new THREE.MeshStandardMaterial({
      map: secTex,
      emissive: 0xffffff,
      emissiveMap: secTex,
      emissiveIntensity: 0.75,
      roughness: 0.5,
    });
    const secMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(secBoardW - 0.06, 0.44),
      secMat,
    );
    secMesh.position.set(0, secBoardY + 0.25, -(XRAY_D / 2) - 0.12);
    group.add(secMesh);

    // ── Merge + wrap ─────────────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

    const totalD = XRAY_D + CONV_D_IN + CONV_D_OUT + 1.0;
    obstacles.push({ x: 0, z: 0, w: totalW + 0.5, d: totalD });

    return { mesh: group, colliders, obstacles };
  },
});
