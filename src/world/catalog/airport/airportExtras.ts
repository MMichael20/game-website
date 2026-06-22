// src/world/catalog/airport/airportExtras.ts
//
// Small dressing props to fill the terminal + curb: infoDesk, trashBin,
// waterFountain, atmKiosk, and a simple curbside taxi. base y=0, centered,
// FRONT +z. ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, cylinderY, disc, mergeTinted, tintedMesh, DECAL_GAP } from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// ── infoDesk (round information point with an "i" pylon) ─────────────────────
defineObject("infoDesk", {
  params: {} as Record<string, never>,
  build(): ObjectResult {
    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();
    const r = 1.6, hgt = 1.05;
    parts.push(cylinderY(r, hgt, 0, hgt / 2, 0, 0xf0ede6, 24));
    parts.push(disc(r + 0.08, 0.08, 0, hgt + 0.04, 0, PALETTE.steel, 24));
    parts.push(cylinderY(r - 0.2, hgt - 0.12, 0, (hgt - 0.12) / 2, 0, 0x2b6fb5, 24));
    // Center pylon with an "i"
    parts.push(tintedBox(0.5, 2.6, 0.5, 0, hgt + 1.3, 0, 0xf0ede6));
    const sign = makeTextSignMesh({ text: "i", w: 0.7, h: 0.7, boardColor: 0x1f4f8a, textColor: "#ffffff", glow: 0.9 });
    sign.position.set(-0.35, hgt + 2.0, 0.25 + DECAL_GAP);
    group.add(sign);
    const opaque = tintedMesh(mergeTinted(parts));
    opaque.castShadow = true;
    group.add(opaque);
    return { mesh: group, colliders: [solidBox(0, hgt / 2, 0, r * 2, hgt, r * 2)], obstacles: [{ x: 0, z: 0, w: r * 2 + 0.4, d: r * 2 + 0.4 }] };
  },
});

// ── trashBin (twin recycling bin) ───────────────────────────────────────────
defineObject("trashBin", {
  params: {} as Record<string, never>,
  build(): ObjectResult {
    const parts: THREE.BufferGeometry[] = [];
    for (const [dx, col] of [[-0.32, 0x2f6b4a], [0.32, 0x355e9b]] as const) {
      parts.push(tintedBox(0.5, 0.9, 0.5, dx, 0.45, 0, col));
      parts.push(tintedBox(0.54, 0.06, 0.54, dx, 0.9, 0, 0x222222));
      parts.push(tintedBox(0.3, 0.04, 0.3, dx, 0.93, 0, 0x111111)); // lid slot
    }
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return { mesh, colliders: [solidBox(0, 0.45, 0, 1.3, 0.9, 0.6)], obstacles: [{ x: 0, z: 0, w: 1.5, d: 0.8 }] };
  },
});

// ── waterFountain (drinking fountain) ───────────────────────────────────────
defineObject("waterFountain", {
  params: {} as Record<string, never>,
  build(): ObjectResult {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(tintedBox(0.7, 1.0, 0.5, 0, 0.5, 0, PALETTE.steelLight));
    parts.push(tintedBox(0.74, 0.08, 0.54, 0, 1.0, 0, PALETTE.steel));
    parts.push(tintedBox(0.4, 0.06, 0.3, 0, 1.02, 0.12, 0x9fd8ff)); // basin water
    parts.push(tintedBox(0.06, 0.1, 0.06, 0, 1.12, 0.05, PALETTE.steelDark)); // spout
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    return { mesh, colliders: [solidBox(0, 0.5, 0, 0.7, 1.0, 0.5)], obstacles: [{ x: 0, z: 0, w: 0.9, d: 0.7 }] };
  },
});

// ── atmKiosk (cash machine pillar) ──────────────────────────────────────────
defineObject("atmKiosk", {
  params: {} as Record<string, never>,
  build(): ObjectResult {
    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();
    parts.push(tintedBox(0.8, 1.6, 0.6, 0, 0.8, 0, 0x2c3e50));
    parts.push(tintedBox(0.7, 0.5, 0.06, 0, 1.2, 0.32, 0x111418)); // screen recess
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x1a6bbf, emissive: 0x1a6bbf, emissiveIntensity: 0.9, roughness: 0.4 }),
    );
    scr.position.set(0, 1.2, 0.36);
    group.add(scr);
    parts.push(tintedBox(0.7, 0.2, 0.1, 0, 0.85, 0.33, PALETTE.steelLight)); // keypad shelf
    const opaque = tintedMesh(mergeTinted(parts));
    opaque.castShadow = true;
    group.add(opaque);
    return { mesh: group, colliders: [solidBox(0, 0.8, 0, 0.8, 1.6, 0.6)], obstacles: [{ x: 0, z: 0, w: 1.0, d: 0.9 }] };
  },
});

// ── airportTaxi (boxy curbside cab) ─────────────────────────────────────────
interface TaxiParams { color: number }
defineObject("airportTaxi", {
  params: { color: 0xf2c21e } as TaxiParams,
  build(p: TaxiParams): ObjectResult {
    const { color } = p;
    const parts: THREE.BufferGeometry[] = [];
    const bodyL = 4.2, bodyW = 1.8;
    // Lower body
    parts.push(tintedBox(bodyW, 0.7, bodyL, 0, 0.7, 0, color));
    // Cabin
    parts.push(tintedBox(bodyW - 0.15, 0.7, bodyL * 0.5, 0, 1.35, -0.1, color));
    // Windows
    parts.push(tintedBox(bodyW - 0.05, 0.5, bodyL * 0.5 - 0.1, 0, 1.4, -0.1, 0x2a3a4a));
    // Taxi roof sign
    parts.push(tintedBox(0.5, 0.18, 0.3, 0, 1.78, -0.1, 0xffffff));
    // Bumpers + grille
    parts.push(tintedBox(bodyW, 0.2, 0.1, 0, 0.5, bodyL / 2, 0x222222));
    parts.push(tintedBox(bodyW, 0.2, 0.1, 0, 0.5, -bodyL / 2, 0x222222));
    // Wheels
    for (const wx of [-bodyW / 2 + 0.1, bodyW / 2 - 0.1]) {
      for (const wz of [bodyL / 2 - 0.9, -bodyL / 2 + 0.9]) {
        parts.push(cylinderY(0.42, 0.25, wx, 0.42, wz, 0x111111, 12));
      }
    }
    // Checker accent stripe
    for (let i = 0; i < 8; i++) {
      parts.push(tintedBox(bodyW + 0.02, 0.12, 0.26, 0, 0.95, -bodyL / 2 + 0.4 + i * 0.5, i % 2 ? 0x111111 : 0xffffff));
    }
    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return { mesh, colliders: [solidBox(0, 0.7, 0, bodyW, 1.4, bodyL)], obstacles: [{ x: 0, z: 0, w: bodyW + 0.4, d: bodyL + 0.4 }] };
  },
});
