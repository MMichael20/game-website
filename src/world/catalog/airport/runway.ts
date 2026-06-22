// src/world/catalog/airport/runway.ts
//
// A tarmac runway or taxiway strip.
// AXIS: built along +X (long axis). Front = +z face is one edge.
// Visual only — NO collider (ground plane handles it).
// LOCAL space: centered x=z=0, base y=0.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult } from "../../system/types";

interface RunwayParams {
  length: number;
  taxiway: boolean;
}

defineObject("runway", {
  params: { length: 180, taxiway: false } as RunwayParams,
  build(p: RunwayParams): ObjectResult {
    const { length, taxiway } = p;
    const width = taxiway ? 14 : 45;

    const baseY  = DECAL_GAP;
    const markY  = baseY + DECAL_GAP;
    const lightY = markY + DECAL_GAP;

    const parts: THREE.BufferGeometry[] = [];

    // ── Asphalt slab ──────────────────────────────────────────────────────
    const ASPHALT = taxiway ? 0x2e2e36 : PALETTE.asphalt;
    parts.push(tintedBox(length, 0.06, width, 0, baseY, 0, ASPHALT));

    // ── Slight wear / texture banding along the strip ─────────────────────
    const WEAR = taxiway ? 0x252530 : 0x32323c;
    const wBands = Math.floor(length / 30);
    for (let b = 0; b < wBands; b++) {
      const bx = -length / 2 + (b + 0.5) * (length / wBands);
      parts.push(tintedBox(length / wBands - 2, 0.02, width * 0.92,
        bx, markY - DECAL_GAP * 0.5, 0, WEAR));
    }

    if (!taxiway) {
      // ── RUNWAY markings ─────────────────────────────────────────────────

      // Dashed white centreline (along X)
      const dashLen  = 6.0;
      const dashGap  = 4.0;
      const nDashes  = Math.floor(length * 0.75 / (dashLen + dashGap));
      const centreColour = PALETTE.laneLine;
      for (let i = 0; i < nDashes; i++) {
        const dx = -nDashes * (dashLen + dashGap) / 2 + i * (dashLen + dashGap) + dashLen / 2;
        parts.push(tintedBox(dashLen, 0.03, 0.65, dx, markY, 0, centreColour));
      }

      // Threshold "piano keys" at each end
      const keyW  = 2.8;
      const keyD  = 0.65;
      const keyGap = 1.0;
      const nKeys  = 12;
      const keyTotalZ = nKeys * keyD + (nKeys - 1) * keyGap;
      const keysStartZ = -keyTotalZ / 2;
      for (const ex of [-1, 1]) {
        const kx = ex * (length / 2 - 6.0);
        for (let k = 0; k < nKeys; k++) {
          const kz = keysStartZ + k * (keyD + keyGap);
          parts.push(tintedBox(keyW, 0.04, keyD, kx, markY, kz, centreColour));
        }
      }

      // White edge lines on each side
      const edgeZ = width / 2 - 0.9;
      parts.push(tintedBox(length - 4, 0.03, 0.45,  0, markY,  edgeZ, centreColour));
      parts.push(tintedBox(length - 4, 0.03, 0.45,  0, markY, -edgeZ, centreColour));

      // Touchdown zone markings (pairs of bars, 6 either side of threshold)
      for (const ex of [-1, 1]) {
        for (let t = 1; t <= 4; t++) {
          const tx = ex * (length / 2 - 6.0 - t * 18.0);
          // Bar pair
          parts.push(tintedBox(3.5, 0.04, 0.6, tx, markY,  width / 2 * 0.4, centreColour));
          parts.push(tintedBox(3.5, 0.04, 0.6, tx, markY, -width / 2 * 0.4, centreColour));
        }
      }

      // Runway designation number hints (three short bars = crude digit area)
      for (const ex of [-1, 1]) {
        const nx = ex * (length / 2 - 14);
        for (let b = 0; b < 3; b++) {
          parts.push(tintedBox(4.5, 0.04, 0.7, nx, markY, (b - 1) * 2.2, centreColour));
        }
      }

    } else {
      // ── TAXIWAY markings ─────────────────────────────────────────────────

      // Continuous solid yellow centreline (along X)
      parts.push(tintedBox(length - 1, 0.03, 0.35, 0, markY, 0, PALETTE.yellowLine));

      // Edge lights (small emissive boxes, spaced along both edges)
      const lightSep = 30;
      const nLights  = Math.floor(length / lightSep);
      const lightColour = PALETTE.lanternGlow;
      const lightZ    = width / 2 - 0.5;
      for (let l = 0; l <= nLights; l++) {
        const lx = -length / 2 + l * lightSep;
        // Small emissive box per side — added as separate tiny boxes merged in
        parts.push(tintedBox(0.22, 0.16, 0.22, lx, lightY,  lightZ, lightColour));
        parts.push(tintedBox(0.22, 0.16, 0.22, lx, lightY, -lightZ, lightColour));
      }

      // Hold-short bar (double yellow) at one end
      parts.push(tintedBox(width - 1, 0.04, 0.3, 0, markY,  length / 2 - 2.5, PALETTE.yellowLine));
      parts.push(tintedBox(width - 1, 0.04, 0.3, 0, markY,  length / 2 - 3.5, PALETTE.yellowLine));

      // Edge guide arrows (chevron hint = two angled boxes, every 60m)
      const arrowSep = 60;
      const nArrows  = Math.floor(length / arrowSep);
      for (let a = 0; a < nArrows; a++) {
        const ax = -length / 2 + (a + 0.5) * arrowSep;
        const arrGeo1 = new THREE.BoxGeometry(3.5, 0.04, 0.35);
        arrGeo1.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 5));
        arrGeo1.translate(ax + 0.8, markY, 0);
        const arrGeo2 = new THREE.BoxGeometry(3.5, 0.04, 0.35);
        arrGeo2.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 5));
        arrGeo2.translate(ax - 0.8, markY, 0);
        const col = new THREE.Color(PALETTE.yellowLine);
        for (const ag of [arrGeo1, arrGeo2]) {
          const n = ag.attributes.position.count;
          const colors = new Float32Array(n * 3);
          for (let j = 0; j < n; j++) { colors[j*3]=col.r; colors[j*3+1]=col.g; colors[j*3+2]=col.b; }
          ag.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          parts.push(ag);
        }
      }
    }

    const runwayMesh = tintedMesh(mergeTinted(parts));
    runwayMesh.receiveShadow = true;

    // No colliders / obstacles
    return { mesh: runwayMesh };
  },
});
