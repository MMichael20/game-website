// src/world/catalog/airport/checkInIsland.ts
//
// "checkInIsland" — a long check-in counter with desks, monitors, bag scales,
// belt barriers, and overhead signage. Front (passenger side) faces +z.
// LOCAL space: centered x=z=0, base y=0. ~1u = 1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box, Rect } from "../../system/types";

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// ─── Colors ──────────────────────────────────────────────────────────────────
const COUNTER_BODY   = 0xf5f4f0;  // near-white gloss counter
const COUNTER_TRIM   = PALETTE.steel;
const WORKTOP_COLOR  = 0xe0ddd8;  // slightly grey worktop
const MONITOR_BODY   = 0x2a2d32;  // near-black monitor body
// screen face drawn via canvas — color is 0x3ca8e8 (blue airline UI)
const SCALE_COLOR    = 0xc8c5c0;  // bag scale platform
const BELT_COLOR     = 0x3a3a40;  // conveyor belt body
const SLAT_COLOR     = 0x5a5a60;  // belt slats
const POST_COLOR     = 0x1e1e22;  // stanchion post
const RIBBON_COLOR   = 0xe8c030;  // gold belt ribbon
const SIGN_BOARD     = 0x1a3a6a;  // deep blue sign board
const SIGN_FRAME     = 0xb0bcc8;  // steel sign mount

// Counter dims
const CTR_H    = 1.1;   // counter height
const CTR_D    = 1.1;   // counter depth (front-to-back)
const WORKTOP  = 0.08;  // worktop lip thickness
const TRIM_H   = 0.08;  // lower trim rail height

interface CheckInIslandParams {
  len: number;
  desks: number;
  startNo: number;
}

// Numbered-lightbox color cycle (in pairs): blue, green, red.
const NUM_COLORS = [0x2b6fb5, 0x2e9e4f, 0xc0392b];

defineObject("checkInIsland", {
  params: { len: 10, desks: 4, startNo: 1 } as CheckInIslandParams,
  build(p: CheckInIslandParams): ObjectResult {
    const { len, desks, startNo } = p;
    const hL = len / 2;

    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    // ── Counter body ────────────────────────────────────────────────────────
    // Main body block
    parts.push(tintedBox(len, CTR_H - TRIM_H, CTR_D, 0, (CTR_H - TRIM_H) / 2 + TRIM_H, 0, COUNTER_BODY));
    // Lower trim rail (darker band at base)
    parts.push(tintedBox(len, TRIM_H, CTR_D + 0.04, 0, TRIM_H / 2, 0, COUNTER_TRIM));
    // Worktop lip (overhangs +z by 0.15, -z by 0.05)
    const wtCtrZ = 0.05;   // slight overhang towards passenger
    parts.push(tintedBox(len + 0.04, WORKTOP, CTR_D + 0.2, 0, CTR_H + WORKTOP / 2, wtCtrZ, WORKTOP_COLOR));
    // Top trim edge highlight
    parts.push(tintedBox(len + 0.05, 0.04, 0.04, 0, CTR_H - 0.02, CTR_D / 2 + 0.08, COUNTER_TRIM));
    // Front face panel grooves (decorative vertical dividers)
    for (let i = 1; i < desks; i++) {
      const gx = -hL + i * (len / desks);
      parts.push(tintedBox(0.04, CTR_H - TRIM_H - 0.04, 0.04, gx, (CTR_H) / 2 + 0.02, CTR_D / 2 + 0.02, COUNTER_TRIM));
    }
    // End caps
    parts.push(tintedBox(0.08, CTR_H, CTR_D + 0.1, -hL - 0.04, CTR_H / 2, 0, COUNTER_TRIM));
    parts.push(tintedBox(0.08, CTR_H, CTR_D + 0.1,  hL + 0.04, CTR_H / 2, 0, COUNTER_TRIM));

    // ── Per-desk items ──────────────────────────────────────────────────────
    const deskW = len / desks;

    for (let d = 0; d < desks; d++) {
      const dx = -hL + (d + 0.5) * deskW;

      // Monitor body
      const monW = 0.42;
      const monH = 0.32;
      const monD = 0.08;
      const monY = CTR_H + WORKTOP + monH / 2 + 0.04;
      const monZ = -CTR_D / 2 + 0.18;
      parts.push(tintedBox(monW, monH, monD, dx, monY, monZ, MONITOR_BODY));
      // Monitor stand post
      parts.push(tintedBox(0.06, 0.16, 0.06, dx, CTR_H + WORKTOP + 0.08, monZ, MONITOR_BODY));
      // Monitor base
      parts.push(tintedBox(0.22, 0.03, 0.18, dx, CTR_H + WORKTOP + 0.015, monZ, MONITOR_BODY));
      // Screen face (glowing blue — canvas texture)
      const screenCanvas = document.createElement("canvas");
      screenCanvas.width = 128; screenCanvas.height = 96;
      const screenCtx = screenCanvas.getContext("2d")!;
      screenCtx.fillStyle = "#0a1e3a";
      screenCtx.fillRect(0, 0, 128, 96);
      screenCtx.fillStyle = "#3ca8e8";
      screenCtx.font = "bold 14px monospace";
      screenCtx.fillText("CHECK-IN", 10, 30);
      screenCtx.fillStyle = "#78c8f0";
      screenCtx.font = "11px monospace";
      screenCtx.fillText("BOARDING PASS", 10, 50);
      screenCtx.fillStyle = "#50c860";
      screenCtx.fillRect(10, 62, 108, 4);
      screenCtx.fillStyle = "#ffffff";
      screenCtx.fillText("READY", 50, 80);
      const screenTex = new THREE.CanvasTexture(screenCanvas);
      screenTex.colorSpace = THREE.SRGBColorSpace;
      const screenMat = new THREE.MeshStandardMaterial({
        map: screenTex,
        emissive: 0xffffff,
        emissiveMap: screenTex,
        emissiveIntensity: 1.1,
        roughness: 0.3,
      });
      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(monW - 0.04, monH - 0.04),
        screenMat,
      );
      screenMesh.position.set(dx, monY, monZ + monD / 2 + 0.005);
      group.add(screenMesh);

      // Bag scale (low platform on worktop)
      const scaleW = 0.5;
      const scaleD = 0.42;
      const scaleH = 0.06;
      const scaleZ = 0.05; // on the +z (passenger) side of worktop
      parts.push(tintedBox(scaleW, scaleH, scaleD, dx, CTR_H + WORKTOP + scaleH / 2, scaleZ, SCALE_COLOR));
      parts.push(tintedBox(scaleW - 0.06, 0.02, scaleD - 0.06, dx, CTR_H + WORKTOP + scaleH + 0.01, scaleZ, 0xd8d4cf));
      // Weight LED readout (tiny)
      parts.push(tintedBox(0.16, 0.08, 0.02, dx + 0.18, CTR_H + WORKTOP + scaleH / 2 + 0.01, scaleZ - scaleD / 2 - 0.02, MONITOR_BODY));

      // Bag belt stub (behind counter, running away from passenger)
      const beltLen = CTR_D * 0.7;
      const beltZ = -CTR_D / 2 - beltLen / 2 + 0.05;
      parts.push(tintedBox(0.5, 0.08, beltLen, dx, CTR_H - 0.06, beltZ, BELT_COLOR));
      // Belt slats
      const nSlats = 5;
      for (let s = 0; s < nSlats; s++) {
        const sz = beltZ - beltLen / 2 + (s + 0.5) * (beltLen / nSlats);
        parts.push(tintedBox(0.5, 0.04, 0.04, dx, CTR_H - 0.02, sz, SLAT_COLOR));
      }
      // Belt end rollers
      parts.push(cylinderY(0.06, 0.54, dx, CTR_H - 0.06, beltZ - beltLen / 2 + 0.04, PALETTE.steelDark, 8));
      parts.push(cylinderY(0.06, 0.54, dx, CTR_H - 0.06, beltZ + beltLen / 2 - 0.04, PALETTE.steelDark, 8));
    }

    // ── Overhead sign assembly ──────────────────────────────────────────────
    // Two vertical sign posts
    const postH = 3.0;
    const postY = CTR_H + WORKTOP + postH / 2;
    const postX1 = -hL + 0.3;
    const postX2 =  hL - 0.3;
    parts.push(cylinderY(0.06, postH, postX1, postY, -CTR_D * 0.35, SIGN_FRAME));
    parts.push(cylinderY(0.06, postH, postX2, postY, -CTR_D * 0.35, SIGN_FRAME));

    // Horizontal bar connecting the posts
    const barY = CTR_H + WORKTOP + postH;
    parts.push(tintedBox(len, 0.1, 0.1, 0, barY, -CTR_D * 0.35, SIGN_FRAME));

    // "CHECK-IN" main sign board
    const ciSign = makeTextSignMesh({
      text: "CHECK-IN",
      w: Math.min(len * 0.6, 5.0),
      h: 0.65,
      boardColor: SIGN_BOARD,
      textColor: "#e8f4ff",
      glow: 0.9,
    });
    ciSign.position.set(-Math.min(len * 0.6, 5.0) / 2, barY - 0.72, -CTR_D * 0.35 + DECAL_GAP);
    group.add(ciSign);

    // "DEPARTURES" secondary sign
    const depSign = makeTextSignMesh({
      text: "DEPARTURES",
      w: Math.min(len * 0.45, 3.8),
      h: 0.42,
      boardColor: 0x2a6aa0,
      textColor: "#d8eeff",
      glow: 0.75,
    });
    depSign.position.set(-Math.min(len * 0.45, 3.8) / 2, barY - 1.28, -CTR_D * 0.35 + DECAL_GAP);
    group.add(depSign);

    // ── Numbered backlit lightboxes — one per desk (colored pairs) ─────────
    const boxW = Math.min(deskW * 0.62, 1.3);
    const boxH = 0.5;
    const boxY = barY - 1.95;
    for (let d = 0; d < desks; d++) {
      const dx = -hL + (d + 0.5) * deskW;
      const nn = String(startNo + d).padStart(2, "0");
      const col = NUM_COLORS[Math.floor(d / 2) % NUM_COLORS.length];
      const numBox = makeTextSignMesh({
        text: nn, w: boxW, h: boxH,
        boardColor: col, textColor: "#ffffff", glow: 0.95,
      });
      numBox.position.set(dx - boxW / 2, boxY, -CTR_D * 0.35 + DECAL_GAP);
      group.add(numBox);
    }

    // ── Queue stanchions (switchback belt barriers in front, +z side) ─────
    // Stanchion count derived from counter length: one every ~1.5m
    const nStanchions = Math.max(4, Math.round(len / 1.5));
    const stanchH = 1.0;
    const stanchR = 0.04;
    const queueDepth = 3.0;          // how far in front (+z) the queue extends
    const queueZFront = CTR_D / 2 + DECAL_GAP + queueDepth;
    const queueZBack  = CTR_D / 2 + DECAL_GAP + 0.3;

    // Two rows of stanchions: front row and back row, staggered
    const rowDefs = [
      { z: queueZBack,  xRange: len * 0.85 },
      { z: queueZFront, xRange: len * 0.85 },
    ];
    for (const row of rowDefs) {
      const n = Math.max(3, Math.round(nStanchions / 2));
      for (let s = 0; s <= n; s++) {
        const sx = -row.xRange / 2 + s * (row.xRange / n);
        // Post
        parts.push(cylinderY(stanchR, stanchH, sx, stanchH / 2, row.z, POST_COLOR));
        // Top cap disk
        parts.push(cylinderY(stanchR * 2.5, 0.04, sx, stanchH + 0.02, row.z, PALETTE.steelLight));
        // Ribbon belt to next stanchion
        if (s < n) {
          const nextX = -row.xRange / 2 + (s + 1) * (row.xRange / n);
          const midX = (sx + nextX) / 2;
          const ribbonL = Math.abs(nextX - sx) - 0.02;
          parts.push(tintedBox(ribbonL, 0.04, 0.02, midX, stanchH * 0.6, row.z, RIBBON_COLOR));
        }
      }
    }
    // Cross ribbons connecting the two rows at ends
    parts.push(tintedBox(0.02, 0.04, queueDepth - 0.25, -len * 0.425, stanchH * 0.6, (queueZBack + queueZFront) / 2, RIBBON_COLOR));
    parts.push(tintedBox(0.02, 0.04, queueDepth - 0.25,  len * 0.425, stanchH * 0.6, (queueZBack + queueZFront) / 2, RIBBON_COLOR));

    // ── Merge + wrap ────────────────────────────────────────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

    const colliders: Box[] = [
      solidBox(0, CTR_H / 2, 0, len + 0.16, CTR_H, CTR_D + 0.16),
    ];
    const obstacles: Rect[] = [
      { x: 0, z: 0,    w: len + 0.2,   d: CTR_D + 0.2 },
      { x: 0, z: (CTR_D / 2 + DECAL_GAP + queueDepth / 2 + 0.3 / 2) / 2,
        w: len * 0.9, d: queueDepth + 0.6 },
    ];

    return { mesh: group, colliders, obstacles };
  },
});
