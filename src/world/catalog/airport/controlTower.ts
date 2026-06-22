// src/world/catalog/airport/controlTower.ts
//
// ATC control tower — Ben Gurion silhouette: a slender, near-constant cylindrical
// shaft topped by an OVERHANGING bulged glass cab on a white collar ring, a flat
// cab roof, and a cluster of antenna masts with a red beacon. LOCAL space: base
// y=0, centered x=z=0. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, disc,
  mergeTinted, tintedMesh, tintGeo,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult } from "../../system/types";

interface ControlTowerParams {
  h: number;
}

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
) {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

const CONCRETE      = 0xd4cfc4;
const CONCRETE_DARK = 0xb8b3a6;
const COLLAR        = 0xe8e6e0;
const RAILING       = PALETTE.steelDark;
const EQUIP         = PALETTE.acUnit;
const BEACON_RED    = 0xff2020;

defineObject("controlTower", {
  params: { h: 34 } as ControlTowerParams,
  build(p: ControlTowerParams): ObjectResult {
    const h         = p.h;
    const baseR     = 2.0;
    const shaftTopY = h * 0.78;
    const cabR      = 3.6;          // cab overhangs the shaft
    const cabH      = h * 0.13;
    const cabY      = shaftTopY;
    const roofY     = cabY + cabH;

    const parts: THREE.BufferGeometry[] = [];

    // ── Base equipment room ───────────────────────────────────────────────
    parts.push(cylinderY(baseR + 0.9, 3.2, 0, 1.6, 0, CONCRETE_DARK, 16));
    parts.push(tintedBox(2.2, 3.2, 1.6, baseR, 1.6, baseR * 0.8, CONCRETE_DARK));

    // ── Slender near-constant shaft (subtle 8% taper) ─────────────────────
    const shaftSegments = 6;
    for (let i = 0; i < shaftSegments; i++) {
      const t0 = i / shaftSegments;
      const t1 = (i + 1) / shaftSegments;
      const r0 = baseR * (1 - t0 * 0.08);
      const r1 = baseR * (1 - t1 * 0.08);
      const segBot = t0 * shaftTopY;
      const segH   = (t1 - t0) * shaftTopY;
      const geo = new THREE.CylinderGeometry(r1, r0, segH, 16);
      geo.translate(0, segBot + segH / 2, 0);
      parts.push(tintGeo(geo, i % 2 === 0 ? CONCRETE : CONCRETE_DARK));
    }
    // Vertical service rib up the shaft (stairwell hint)
    parts.push(tintedBox(0.5, shaftTopY, 0.5, baseR - 0.1, shaftTopY / 2, 0, CONCRETE_DARK));

    // ── White collar ring under the overhanging cab ───────────────────────
    parts.push(disc(cabR + 0.3, 0.5, 0, cabY - 0.25, 0, COLLAR, 24));
    parts.push(disc(cabR + 0.5, 0.25, 0, cabY - 0.55, 0, CONCRETE_DARK, 24));

    // ── Gallery railing posts around the cab ──────────────────────────────
    const postCount = 24;
    for (let i = 0; i < postCount; i++) {
      const a = (i / postCount) * Math.PI * 2;
      const px = Math.cos(a) * (cabR + 0.25);
      const pz = Math.sin(a) * (cabR + 0.25);
      parts.push(tintedBox(0.08, 1.0, 0.08, px, cabY + 0.4, pz, RAILING));
    }
    {
      const rail = new THREE.CylinderGeometry(cabR + 0.27, cabR + 0.27, 0.08, 24, 1, true);
      rail.translate(0, cabY + 0.85, 0);
      parts.push(tintGeo(rail, RAILING));
    }

    // ── Cab roof slab ─────────────────────────────────────────────────────
    parts.push(disc(cabR + 0.4, 0.4, 0, roofY + 0.2, 0, CONCRETE_DARK, 24));

    // ── Antenna cluster on the cab roof ───────────────────────────────────
    const antennas = [
      { x: 0.0,  z: 0.0,  len: 6.0 },
      { x: 1.2,  z: 0.6,  len: 4.0 },
      { x: -1.0, z: 0.8,  len: 4.8 },
      { x: 0.6,  z: -1.1, len: 3.2 },
      { x: -1.2, z: -0.7, len: 3.6 },
    ];
    let tallestTip = roofY;
    for (const a of antennas) {
      const baseY = roofY + 0.4;
      parts.push(cylinderY(0.09, a.len, a.x, baseY + a.len / 2, a.z, PALETTE.steelDark, 8));
      tallestTip = Math.max(tallestTip, baseY + a.len);
    }
    // Cross spars on the main mast
    parts.push(tintedBox(2.6, 0.1, 0.1, 0, roofY + 0.4 + 4.0, 0, PALETTE.steelDark));
    parts.push(tintedBox(0.1, 0.1, 2.0, 0, roofY + 0.4 + 3.4, 0, PALETTE.steelDark));

    // ── Roof equipment ────────────────────────────────────────────────────
    parts.push(tintedBox(1.2, 0.7, 0.8, 1.6, roofY + 0.55, 1.4, EQUIP));
    parts.push(tintedBox(1.0, 0.6, 0.7, -1.6, roofY + 0.5, -1.4, EQUIP));

    // ── Base equipment boxes ──────────────────────────────────────────────
    parts.push(tintedBox(2.6, 2.0, 1.8,  baseR + 0.6, 1.0,  baseR - 0.3, EQUIP));
    parts.push(tintedBox(1.8, 1.4, 1.4, -baseR - 0.6, 0.7, -baseR + 0.3, EQUIP));

    // ── Merged opaque mesh ────────────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;

    const towGroup = new THREE.Group();
    towGroup.add(mainMesh);

    // ── Glass cab band (transparent, separate mesh) ───────────────────────
    const cabGeo = new THREE.CylinderGeometry(cabR + 0.06, cabR + 0.06, cabH * 0.7, 20, 1, true);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x5a6b7a, transparent: true, opacity: 0.42,
      roughness: 0.2, metalness: 0.1, side: THREE.DoubleSide,
    });
    const cabMesh = new THREE.Mesh(cabGeo, cabMat);
    cabMesh.position.set(0, cabY + cabH * 0.35, 0);
    towGroup.add(cabMesh);

    // ── Red beacon on the tallest mast tip ────────────────────────────────
    const beaconGeo = new THREE.SphereGeometry(0.28, 8, 6);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: BEACON_RED, emissive: BEACON_RED, emissiveIntensity: 1.3,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(0, tallestTip + 0.3, 0);
    towGroup.add(beaconMesh);

    const shaftW = baseR * 2;
    const colliders = [solidBox(0, h / 2, 0, shaftW, h, shaftW)];
    const obstacles = [{ x: 0, z: 0, w: (baseR + 1.5) * 2, d: (baseR + 1.5) * 2 }];

    return { mesh: towGroup, colliders, obstacles };
  },
});
