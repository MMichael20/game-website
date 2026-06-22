// src/world/catalog/airport/controlTower.ts
//
// ATC control tower: a tapered concrete shaft, a cab floor ring, a glass
// control cab near the top, a gallery railing, an antenna mast + beacon, and
// equipment boxes at the base. LOCAL space: base y=0, centered x=z=0.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, disc,
  mergeTinted, tintedMesh,
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

const CONCRETE     = 0xd4cfc4;
const CONCRETE_DARK = 0xb8b3a6;
const RAILING      = PALETTE.steelDark;
const EQUIP        = PALETTE.acUnit;
const BEACON_RED   = 0xff2020;

defineObject("controlTower", {
  params: { h: 34 } as ControlTowerParams,
  build(p: ControlTowerParams): ObjectResult {
    const h         = p.h;
    const baseR     = 3.0;
    const shaftBot  = 0;
    const shaftTopY = h * 0.72;      // top of main shaft
    const cabH      = h * 0.14;      // glass cab height
    const cabR      = 4.2;           // cab outer radius (wider than shaft)
    const cabY      = shaftTopY;     // cab sits at top of shaft
    const roofY     = cabY + cabH;
    const mast      = 5.0;

    const parts: THREE.BufferGeometry[] = [];

    // ── Base equipment room ───────────────────────────────────────────────
    parts.push(cylinderY(baseR + 0.8, 3.5, 0, 1.75, 0, CONCRETE_DARK, 16));
    // Stairwell bump on south side
    parts.push(tintedBox(2.2, 3.5, 1.6, baseR - 0.2, 1.75, baseR * 0.8, CONCRETE_DARK));

    // ── Main shaft — tapered cylinder (base → shaftTopY) ─────────────────
    // Simulate taper with stacked cylinders (narrow at top)
    const shaftSegments = 6;
    for (let i = 0; i < shaftSegments; i++) {
      const t0 = i / shaftSegments;
      const t1 = (i + 1) / shaftSegments;
      const r0 = baseR * (1 - t0 * 0.35);
      const r1 = baseR * (1 - t1 * 0.35);
      const segBot = shaftBot + t0 * shaftTopY;
      const segH   = (t1 - t0) * shaftTopY;
      const segCY  = segBot + segH / 2;
      const geo = new THREE.CylinderGeometry(r1, r0, segH, 14);
      geo.translate(0, segCY, 0);
      const tinted = geo;
      // Alternate slight shade for visual interest
      const col = (i % 2 === 0) ? CONCRETE : CONCRETE_DARK;
      parts.push(((g: THREE.BufferGeometry, c: number) => {
        const color = new THREE.Color(c);
        const n = g.attributes.position.count;
        const colors = new Float32Array(n * 3);
        for (let j = 0; j < n; j++) {
          colors[j * 3] = color.r;
          colors[j * 3 + 1] = color.g;
          colors[j * 3 + 2] = color.b;
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return g;
      })(tinted, col));
    }

    // ── Cab floor / gallery ring ──────────────────────────────────────────
    const galRing = new THREE.CylinderGeometry(cabR + 0.3, cabR + 0.3, 0.45, 20);
    galRing.translate(0, cabY - 0.1, 0);
    {
      const c = new THREE.Color(CONCRETE_DARK);
      const n = galRing.attributes.position.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { cols[i*3]=c.r; cols[i*3+1]=c.g; cols[i*3+2]=c.b; }
      galRing.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      parts.push(galRing);
    }
    // Gallery railing posts around the perimeter
    const postCount = 20;
    for (let i = 0; i < postCount; i++) {
      const a = (i / postCount) * Math.PI * 2;
      const px = Math.cos(a) * (cabR + 0.2);
      const pz = Math.sin(a) * (cabR + 0.2);
      parts.push(tintedBox(0.1, 1.1, 0.1, px, cabY + 0.4, pz, RAILING));
    }
    // Top rail ring
    {
      const rail = new THREE.CylinderGeometry(cabR + 0.21, cabR + 0.21, 0.08, 20, 1, true);
      rail.translate(0, cabY + 0.85, 0);
      const c = new THREE.Color(RAILING);
      const n = rail.attributes.position.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { cols[i*3]=c.r; cols[i*3+1]=c.g; cols[i*3+2]=c.b; }
      rail.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      parts.push(rail);
    }

    // ── Cab roof slab ─────────────────────────────────────────────────────
    parts.push(disc(cabR + 0.5, 0.4, 0, roofY + 0.2, 0, CONCRETE_DARK, 20));

    // ── Roof equipment: two AC units + a ladder box ───────────────────────
    parts.push(tintedBox(1.4, 0.8, 0.9, 1.2, roofY + 0.6, 0.6, EQUIP));
    parts.push(tintedBox(1.4, 0.8, 0.9, -1.2, roofY + 0.6, -0.6, EQUIP));
    parts.push(tintedBox(0.5, 1.2, 0.5,  0.0, roofY + 0.8, -1.6, PALETTE.ventPipe));

    // ── Antenna mast ──────────────────────────────────────────────────────
    parts.push(cylinderY(0.12, mast, 0, roofY + 0.4 + mast / 2, 0, PALETTE.steelDark));
    // Cross spar
    parts.push(tintedBox(2.6, 0.1, 0.1, 0, roofY + 0.4 + mast * 0.65, 0, PALETTE.steelDark));
    parts.push(tintedBox(0.1, 0.1, 2.6, 0, roofY + 0.4 + mast * 0.55, 0, PALETTE.steelDark));

    // ── Equipment boxes at base ───────────────────────────────────────────
    parts.push(tintedBox(2.8, 2.2, 2.0,  baseR + 0.3, 1.1,  baseR - 0.5, EQUIP));
    parts.push(tintedBox(2.0, 1.6, 1.5, -baseR - 0.3, 0.8, -baseR + 0.3, EQUIP));
    parts.push(tintedBox(1.2, 2.5, 1.2,  0.0, 1.25, -(baseR + 0.6), CONCRETE_DARK));

    // ── Merged opaque mesh ────────────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;

    const towGroup = new THREE.Group();
    towGroup.add(mainMesh);

    // ── Glass cab band (transparent, separate mesh) ───────────────────────
    const cabGeo = new THREE.CylinderGeometry(cabR + 0.06, cabR + 0.06, cabH * 0.66, 16, 1, true);
    const cabMat = new THREE.MeshStandardMaterial({
      color:       0x9fd8ff,
      transparent: true,
      opacity:     0.35,
      roughness:   0.2,
      metalness:   0.1,
      side:        THREE.DoubleSide,
    });
    const cabMesh = new THREE.Mesh(cabGeo, cabMat);
    cabMesh.position.set(0, cabY + cabH * 0.33, 0);
    towGroup.add(cabMesh);

    // ── Beacon (emissive red sphere on mast tip) ──────────────────────────
    const beaconGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const beaconMat = new THREE.MeshStandardMaterial({
      color:             BEACON_RED,
      emissive:          BEACON_RED,
      emissiveIntensity: 1.2,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(0, roofY + 0.4 + mast + 0.3, 0);
    towGroup.add(beaconMesh);

    // ── Colliders & obstacles ─────────────────────────────────────────────
    const shaftW = baseR * 2;
    const colliders = [
      solidBox(0, h / 2, 0, shaftW, h, shaftW),
    ];
    const obstacles = [
      { x: 0, z: 0, w: (baseR + 1.5) * 2, d: (baseR + 1.5) * 2 },
    ];

    return { mesh: towGroup, colliders, obstacles };
  },
});
