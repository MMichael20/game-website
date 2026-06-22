// src/world/catalog/airport/apronVehicle.ts
//
// Ground-support equipment for the airport apron. One builder, five variants.
// LOCAL space: base y=0, FRONT faces +z, centered x=z=0.
//
// Variants:
//   "tug"      — small tractor + baggage-cart train
//   "fuel"     — bowser with cylindrical tank
//   "stairs"   — mobile passenger staircase
//   "pushback" — low heavy tug
//   "catering" — scissor-lift box truck

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, disc,
  mergeTinted, tintedMesh, tintGeo, DECAL_GAP,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult } from "../../system/types";

interface ApronVehicleParams {
  variant: "tug" | "fuel" | "stairs" | "pushback" | "catering";
}

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
) {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// Shared colors
const YELLOW      = 0xf2c14e;
const ORANGE      = 0xe87a2a;
const BLUE_VEH    = 0x1f4fa0;
const BODY_GREY   = PALETTE.steelDark;
const WHEEL_COL   = PALETTE.lampPole;
const HUB_COL     = PALETTE.steelLight;
const TANK_COL    = PALETTE.tankMetal;
const RAILING     = PALETTE.steelDark;

// A simple road wheel: dark tyre disc + light hub disc, in XZ plane (rolls along Z).
function addWheel(
  parts: THREE.BufferGeometry[],
  x: number, y: number, z: number,
  r = 0.35,
) {
  // Tyre: cylinder along X
  const tyreGeo = new THREE.CylinderGeometry(r, r, 0.28, 12);
  tyreGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
  tyreGeo.translate(x, y, z);
  parts.push(tintGeo(tyreGeo, WHEEL_COL));
  // Hub disc
  parts.push(disc(r * 0.38, 0.14, x, y, z, HUB_COL));
}

// -- TUG variant ----------------------------------------------------------
function buildTug(): ObjectResult {
  const parts: THREE.BufferGeometry[] = [];
  // Cab: small yellow tractor body
  const cabW = 1.6; const cabH = 1.8; const cabD = 1.8;
  parts.push(tintedBox(cabW, cabH, cabD, 0, cabH / 2, 0, YELLOW));
  // Cab roof
  parts.push(tintedBox(cabW * 0.85, 0.22, cabD * 0.85, 0, cabH + 0.11, 0, YELLOW));
  // Windscreen (dark)
  parts.push(tintedBox(cabW - 0.1, cabH * 0.45, 0.1,
    0, cabH * 0.65, cabD / 2 + DECAL_GAP, 0x1a1a22));
  // Front bumper
  parts.push(tintedBox(cabW + 0.2, 0.22, 0.3, 0, 0.3, cabD / 2 + 0.15, BODY_GREY));
  // Four wheels on cab
  addWheel(parts, -(cabW / 2 + 0.18), 0.35, -cabD / 2 + 0.3);
  addWheel(parts,  cabW / 2 + 0.18,  0.35, -cabD / 2 + 0.3);
  addWheel(parts, -(cabW / 2 + 0.18), 0.35,  cabD / 2 - 0.3);
  addWheel(parts,  cabW / 2 + 0.18,  0.35,  cabD / 2 - 0.3);

  // Three coupled baggage carts behind (-z)
  const cartW = 2.0; const cartH = 0.55; const cartD = 1.8;
  for (let c = 0; c < 3; c++) {
    const cz = -(cabD / 2 + 0.4 + c * (cartD + 0.3));
    const czCtr = cz - cartD / 2;
    // Cart frame
    parts.push(tintedBox(cartW, 0.14, cartD, 0, cartH, czCtr, BODY_GREY));
    // Slatted sides
    parts.push(tintedBox(cartW, cartH, 0.1, 0, cartH / 2, czCtr - cartD / 2 + 0.05, BODY_GREY));
    parts.push(tintedBox(cartW, cartH, 0.1, 0, cartH / 2, czCtr + cartD / 2 - 0.05, BODY_GREY));
    // Hitch coupler
    parts.push(tintedBox(0.2, 0.2, 0.3, 0, cartH, czCtr + cartD / 2 + 0.15, BODY_GREY));
    addWheel(parts, -(cartW / 2 + 0.1), 0.25, czCtr - cartD / 2 + 0.3, 0.28);
    addWheel(parts,  cartW / 2 + 0.1,  0.25, czCtr - cartD / 2 + 0.3, 0.28);
    addWheel(parts, -(cartW / 2 + 0.1), 0.25, czCtr + cartD / 2 - 0.3, 0.28);
    addWheel(parts,  cartW / 2 + 0.1,  0.25, czCtr + cartD / 2 - 0.3, 0.28);
  }

  const mesh = tintedMesh(mergeTinted(parts));
  mesh.castShadow = true;
  const totalD = cabD + 3 * (cartD + 0.3) + 0.4;
  return {
    mesh,
    colliders: [solidBox(0, 1.0, -totalD / 4, cabW + 0.4, 2.0, totalD)],
    obstacles: [{ x: 0, z: -totalD / 4, w: cabW + 0.8, d: totalD }],
  };
}

// -- FUEL variant ----------------------------------------------------------
function buildFuel(): ObjectResult {
  const parts: THREE.BufferGeometry[] = [];
  // Cab
  parts.push(tintedBox(2.0, 2.2, 2.4, 0, 1.1, 0.8, BODY_GREY));
  parts.push(tintedBox(2.0, 0.25, 2.4, 0, 2.2 + 0.12, 0.8, BODY_GREY));
  parts.push(tintedBox(2.0 - 0.1, 1.0, 0.12, 0, 1.6, 2.0 + DECAL_GAP, 0x1a1a22)); // windscreen
  // Chassis
  const chassisL = 7.0;
  parts.push(tintedBox(chassisL, 0.45, 2.2, 0, 0.22, -chassisL / 2 + 2.4, BODY_GREY));
  // Fuel tank (horizontal cylinder along Z)
  {
    const tankGeo = new THREE.CylinderGeometry(1.1, 1.1, 5.2, 16);
    tankGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    tankGeo.translate(0, 1.8, -2.0);
    parts.push(tintGeo(tankGeo, TANK_COL));
    // End caps
    parts.push(disc(1.1, 0.18, 0, 1.8, 0.3, TANK_COL, 14));
    parts.push(disc(1.1, 0.18, 0, 1.8, -4.3, TANK_COL, 14));
  }
  // Hose reel box on the side
  parts.push(tintedBox(0.9, 0.9, 1.4, 1.2, 1.1, -1.8, ORANGE));
  // Wheels — 6 per side (cab axle + 2 rear bogies)
  for (const sx of [-1, 1]) {
    const xp = sx * 1.15;
    addWheel(parts, xp, 0.42, 1.6, 0.4);
    addWheel(parts, xp, 0.42, -3.2, 0.4);
    addWheel(parts, xp, 0.42, -4.5, 0.4);
  }

  const mesh = tintedMesh(mergeTinted(parts));
  mesh.castShadow = true;
  return {
    mesh,
    colliders: [solidBox(0, 1.4, -2.0, 2.4, 2.8, chassisL)],
    obstacles: [{ x: 0, z: -2.0, w: 3.0, d: chassisL }],
  };
}

// -- STAIRS variant --------------------------------------------------------
function buildStairs(): ObjectResult {
  const parts: THREE.BufferGeometry[] = [];
  // Wheeled base frame
  const baseW = 2.4; const baseH = 0.5; const baseD = 5.5;
  parts.push(tintedBox(baseW, baseH, baseD, 0, baseH / 2, 0, BODY_GREY));
  // Wheels (4 corner)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addWheel(parts, sx * (baseW / 2 + 0.1), 0.3, sz * (baseD / 2 - 0.4), 0.3);
  }

  // Stair flight — 10 steps climbing from front to back
  const stepCount = 10;
  const stairRise = 0.36;   // height per step
  const stairRun  = 0.46;   // depth per step
  const stairW    = 1.8;
  const stairBotY = baseH;
  const stairBotZ = baseD / 2 - 0.2;

  for (let s = 0; s < stepCount; s++) {
    const sy = stairBotY + s * stairRise + stairRise / 2;
    const sz = stairBotZ - s * stairRun - stairRun / 2;
    parts.push(tintedBox(stairW, 0.14, stairRun, 0, sy, sz, PALETTE.steelLight));
    // Riser
    parts.push(tintedBox(stairW, stairRise, 0.1, 0, sy - stairRise / 2, sz - stairRun / 2, BODY_GREY));
  }

  // Top landing platform
  const topY = stairBotY + stepCount * stairRise;
  const topZ = stairBotZ - stepCount * stairRun;
  parts.push(tintedBox(stairW + 0.4, 0.18, stairRun * 1.6, 0, topY, topZ, PALETTE.steelLight));

  // Side handrail struts along the stair
  for (const sx of [-1, 1]) {
    const rx = sx * (stairW / 2 + 0.05);
    for (let s = 0; s < stepCount; s += 2) {
      const sy = stairBotY + s * stairRise;
      const sz = stairBotZ - s * stairRun;
      parts.push(tintedBox(0.1, stairRise * 2.5 + 0.1, 0.1, rx, sy + stairRise * 1.2, sz, RAILING));
    }
    // Top rail
    parts.push(tintedBox(0.1, 0.1, stairRun * stepCount + 0.2,
      rx, topY + 0.95, stairBotZ - (stairRun * stepCount) / 2, RAILING));
  }

  const mesh = tintedMesh(mergeTinted(parts));
  mesh.castShadow = true;
  const totalDepth = baseD + stairRun * stepCount;
  return {
    mesh,
    colliders: [solidBox(0, topY / 2, 0, baseW, topY, totalDepth)],
    obstacles: [{ x: 0, z: 0, w: baseW + 0.4, d: totalDepth }],
  };
}

// -- PUSHBACK variant ------------------------------------------------------
function buildPushback(): ObjectResult {
  const parts: THREE.BufferGeometry[] = [];
  // Low, wide, heavy tug body
  const bW = 3.8; const bH = 1.4; const bD = 5.0;
  parts.push(tintedBox(bW, bH, bD, 0, bH / 2, 0, BLUE_VEH));
  // Cab section (slightly raised box at front)
  parts.push(tintedBox(bW - 0.4, 0.7, bD * 0.4, 0, bH + 0.35, bD * 0.25, BLUE_VEH));
  // Windscreen
  parts.push(tintedBox(bW - 0.6, 0.55, 0.12,
    0, bH + 0.38, bD / 2 * 0.5 + DECAL_GAP, 0x1a1a22));
  // Exhaust pipes on top
  parts.push(cylinderY(0.12, 0.7, -bW / 2 + 0.5, bH + 0.7, bD * 0.1, PALETTE.ventPipe));
  parts.push(cylinderY(0.12, 0.7,  bW / 2 - 0.5, bH + 0.7, bD * 0.1, PALETTE.ventPipe));
  // Tow bar at front (+z)
  parts.push(tintedBox(0.35, 0.25, 2.0, 0, 0.3, bD / 2 + 1.0, BODY_GREY));
  // Big chunky wheels (6: 2 front, 4 rear)
  const bigR = 0.65;
  for (const sx of [-1, 1]) {
    addWheel(parts, sx * (bW / 2 + 0.2), bigR, bD / 2 - 0.6, bigR);
    addWheel(parts, sx * (bW / 2 + 0.2), bigR, -bD / 2 + 0.7, bigR);
    addWheel(parts, sx * (bW / 2 + 0.2), bigR, -bD / 2 + 1.9, bigR);
  }
  // Counterweight block at rear
  parts.push(tintedBox(bW - 0.3, bH * 0.55, 0.9, 0, bH * 0.27, -bD / 2 + 0.45, BODY_GREY));

  const mesh = tintedMesh(mergeTinted(parts));
  mesh.castShadow = true;
  return {
    mesh,
    colliders: [solidBox(0, bH / 2, 0, bW + 0.5, bH + 0.9, bD)],
    obstacles: [{ x: 0, z: bD / 4, w: bW + 1.0, d: bD + 2.2 }],
  };
}

// -- CATERING variant ------------------------------------------------------
function buildCatering(): ObjectResult {
  const parts: THREE.BufferGeometry[] = [];
  // Truck chassis
  const chassisW = 2.4; const chassisH = 0.5; const chassisD = 7.0;
  parts.push(tintedBox(chassisW, chassisH, chassisD, 0, chassisH / 2, 0, BODY_GREY));
  // Cab
  const cabH = 2.5;
  parts.push(tintedBox(chassisW, cabH, 2.2, 0, cabH / 2, chassisD / 2 - 1.1, BODY_GREY));
  parts.push(tintedBox(chassisW - 0.1, 0.9, 0.12,
    0, cabH * 0.6, chassisD / 2 - 0.05 + DECAL_GAP, 0x1a1a22));

  // Scissor-lift body (raised box representing the lift platform + box body)
  const liftH   = 3.8;    // raised height of the body
  const bodyW   = chassisW - 0.1;
  const bodyD   = 4.0;
  const bodyBotZ = -chassisD / 2 + bodyD / 2 + 0.1;
  // Scissor arms (X cross)
  const armY = chassisH + liftH / 2;
  for (const sx of [-1, 1]) {
    // Diagonal arm A
    const armA = new THREE.BoxGeometry(0.16, 0.16, liftH * 1.05);
    armA.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 5 * sx));
    armA.translate(sx * (bodyW / 2 - 0.2), armY, bodyBotZ);
    parts.push(tintGeo(armA, BODY_GREY));
    // Diagonal arm B
    const armB = new THREE.BoxGeometry(0.16, 0.16, liftH * 1.05);
    armB.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 5 * sx));
    armB.translate(sx * (bodyW / 2 - 0.2), armY, bodyBotZ);
    parts.push(tintGeo(armB, BODY_GREY));
  }
  // Box body at top
  const boxBotY = chassisH + liftH;
  parts.push(tintedBox(bodyW, 2.4, bodyD, 0, boxBotY + 1.2, bodyBotZ, 0xf5f3ee));
  // Food-service doors on the side
  parts.push(tintedBox(0.1, 1.8, bodyD * 0.55, chassisW / 2 + DECAL_GAP, boxBotY + 1.0, bodyBotZ, 0x9faabb));
  parts.push(tintedBox(0.1, 1.8, bodyD * 0.55, -(chassisW / 2 + DECAL_GAP), boxBotY + 1.0, bodyBotZ, 0x9faabb));

  // Wheels (3 axles)
  for (const sx of [-1, 1]) {
    addWheel(parts, sx * (chassisW / 2 + 0.15), 0.42, chassisD / 2 - 0.6, 0.4);
    addWheel(parts, sx * (chassisW / 2 + 0.15), 0.42, 0, 0.4);
    addWheel(parts, sx * (chassisW / 2 + 0.15), 0.42, -chassisD / 2 + 0.6, 0.4);
  }

  const mesh = tintedMesh(mergeTinted(parts));
  mesh.castShadow = true;
  const totalH = chassisH + liftH + 2.4;
  return {
    mesh,
    colliders: [solidBox(0, totalH / 2, 0, chassisW + 0.3, totalH, chassisD)],
    obstacles: [{ x: 0, z: 0, w: chassisW + 1.0, d: chassisD }],
  };
}

defineObject("apronVehicle", {
  params: { variant: "tug" } as ApronVehicleParams,
  build(p: ApronVehicleParams): ObjectResult {
    switch (p.variant) {
      case "fuel":     return buildFuel();
      case "stairs":   return buildStairs();
      case "pushback": return buildPushback();
      case "catering": return buildCatering();
      case "tug":
      default:         return buildTug();
    }
  },
});
