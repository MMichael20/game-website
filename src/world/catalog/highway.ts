// src/world/catalog/highway.ts
//
// A divided highway segment running along +x, centered on z=0. Two asphalt
// carriageways flank a raised planted center median; low guardrails run the
// outer edges. Drivable surface (no collider); median + guardrails are
// colliders so the highway reads bounded. Lane dashes are one instanced draw.
// All z-positions derive from lane math (PITFALL 3). Deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeAsphaltTexture, GRAIN_M } from "../roads";
import { makeInstanced, type Placement } from "../InstancedProps";
import { PALETTE } from "../palette";
import type { Box, Rect } from "../system/types";

interface HighwayParams {
  length: number;
  lanes: number;     // lanes per carriageway
  laneW: number;     // width of one lane
  medianW: number;   // center median width
  shoulderW: number; // outer shoulder width (between outer lane and guardrail)
  gantry: boolean;
  seed: number;
}

defineObject("highway", {
  params: { length: 260, lanes: 2, laneW: 3.6, medianW: 4, shoulderW: 1.2, gantry: false, seed: 1 } as HighwayParams,
  build(p: HighwayParams) {
    const group = new THREE.Group();
    const carW = p.lanes * p.laneW + p.shoulderW;        // one carriageway width
    const carCenter = p.medianW / 2 + carW / 2;          // |z| of each carriageway center
    const half = p.medianW / 2 + carW;                   // |z| of the outer edge

    // Two asphalt carriageways (one mesh each; surface is drivable, no collider).
    for (const sign of [-1, 1] as const) {
      const tex = makeAsphaltTexture();
      tex.repeat.set(Math.max(1, Math.round(p.length / GRAIN_M)), Math.max(1, Math.round(carW / GRAIN_M)));
      const geo = new THREE.PlaneGeometry(p.length, carW);
      geo.rotateX(-Math.PI / 2);
      const surf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex }));
      surf.position.set(0, 0.02, sign * carCenter);
      surf.receiveShadow = true;
      group.add(surf);
    }

    // Raised planted center median: concrete kerb + green strip on top (collider).
    const medParts: THREE.BufferGeometry[] = [];
    const kerbH = 0.25;
    medParts.push(tintedBox(p.length, kerbH, p.medianW, 0, kerbH / 2, 0, PALETTE.curb));
    medParts.push(tintedBox(p.length, 0.12, p.medianW - 0.5, 0, kerbH + 0.06, 0, PALETTE.parkGrass));
    group.add(tintedMesh(mergeTinted(medParts)));

    // Outer guardrails: low steel barriers on each outer edge (colliders + obstacles).
    const railH = 0.7;
    const railT = 0.2;
    const railParts: THREE.BufferGeometry[] = [];
    for (const sign of [-1, 1] as const) {
      railParts.push(tintedBox(p.length, railH, railT, 0, railH / 2, sign * half, PALETTE.steelDark));
    }
    const railMesh = tintedMesh(mergeTinted(railParts));
    railMesh.castShadow = true;
    group.add(railMesh);

    // Lane dashes: white dashes down each carriageway's lane boundaries, one
    // instanced draw. Long axis along +x → rotate the dash quad 90°.
    const DASH_LEN = 3, DASH_GAP = 6;
    const period = DASH_LEN + DASH_GAP;
    const count = Math.max(0, Math.floor(p.length / period));
    const start = -count * period / 2 + period / 2;
    const places: Placement[] = [];
    for (const sign of [-1, 1] as const) {
      // interior lane boundaries within a carriageway (lanes-1 of them)
      for (let b = 1; b < p.lanes; b++) {
        const zEdge = sign * (p.medianW / 2 + b * p.laneW);
        for (let i = 0; i < count; i++) places.push({ x: start + i * period, z: zEdge, rotationY: Math.PI / 2 });
      }
    }
    if (places.length) {
      const dashGeo = new THREE.PlaneGeometry(0.2, DASH_LEN);
      dashGeo.rotateX(-Math.PI / 2);
      const dashMat = new THREE.MeshStandardMaterial({ color: PALETTE.laneLine });
      const dashes = makeInstanced(dashGeo, dashMat, places, 0.03);
      dashes.castShadow = false;
      group.add(dashes);
    }

    // Optional overhead sign gantry (off by default): a portal frame + blank green panel.
    if (p.gantry) {
      const gParts: THREE.BufferGeometry[] = [];
      const postH = 5.5;
      for (const sign of [-1, 1] as const) {
        gParts.push(tintedBox(0.4, postH, 0.4, 0, postH / 2, sign * (half - 0.3), PALETTE.steelDark));
      }
      gParts.push(tintedBox(0.4, 0.4, 2 * half, 0, postH, 0, PALETTE.steelDark));      // top beam
      gParts.push(tintedBox(0.2, 1.6, 5, 0, postH - 1.1, 0, 0x2e7d32));                // green sign panel
      group.add(tintedMesh(mergeTinted(gParts)));
    }

    const colliders: Box[] = [
      { x: 0, y: kerbH / 2, z: 0, hx: p.length / 2, hy: kerbH / 2 + 0.06, hz: p.medianW / 2 }, // median
      { x: 0, y: railH / 2, z: half, hx: p.length / 2, hy: railH / 2, hz: railT / 2 },          // +z rail
      { x: 0, y: railH / 2, z: -half, hx: p.length / 2, hy: railH / 2, hz: railT / 2 },         // -z rail
    ];
    const obstacles: Rect[] = [
      { x: 0, z: 0, w: p.length, d: p.medianW },
      { x: 0, z: half, w: p.length, d: railT },
      { x: 0, z: -half, w: p.length, d: railT },
    ];
    return { mesh: group, colliders, obstacles };
  },
});
