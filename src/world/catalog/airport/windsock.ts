// src/world/catalog/airport/windsock.ts
//
// "windsock" — an airfield wind-direction pole with a striped cone hanging
// horizontally along +x off a pivot frame near the top.
// LOCAL space: centered x=z=0, base y=0. ~1u=1m. Fully deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, cylinderY, disc, tintGeo, mergeTinted, tintedMesh,
} from "../../objects/voxel";
import { PALETTE } from "../../palette";
import type { ObjectResult, Box } from "../../system/types";

function solidBox(x: number, y: number, z: number, bw: number, bh: number, bd: number): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

interface WindsockParams { h: number }

// Alternating cone band colors.
const ORANGE = 0xe8731f;
const WHITE  = 0xf2f2f2;

defineObject("windsock", {
  params: { h: 8 } as WindsockParams,
  build(p: WindsockParams): ObjectResult {
    const { h } = p;
    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    // ── Base plate ─────────────────────────────────────────────────────────
    parts.push(tintedBox(1.2, 0.1, 1.2, 0, 0.05, 0, PALETTE.steel));

    // ── Pole ───────────────────────────────────────────────────────────────
    parts.push(cylinderY(0.12, h, 0, h / 2, 0, PALETTE.steel, 8));

    // ── Pivot frame near the top ──────────────────────────────────────────
    // Thin ring at the pole top.
    parts.push(disc(0.5, 0.12, 0, h, 0, PALETTE.steelLight, 12));
    // Small arm reaching +x to anchor the cone.
    parts.push(cylinderY(0.08, 0.6, 0.3, h, 0, PALETTE.steelLight, 6));

    // ── Striped cone hanging horizontally along +x ────────────────────────
    // 5 stacked tapering bands, alternating orange / white. The cone narrows
    // toward +x. CylinderGeometry builds along Y; rotate Z by -90° to lie on X.
    const bandCount = 5;
    const bandLen = 0.8;
    const startRadius = 0.85;
    const radiusStep = 0.13;
    const xStart = 0.5; // first band starts at the pole top

    for (let i = 0; i < bandCount; i++) {
      const rBig = startRadius - i * radiusStep;          // radius at this band's start (-x side)
      const rSmall = startRadius - (i + 1) * radiusStep;  // radius at this band's far (+x) side
      const cx = xStart + bandLen / 2 + i * bandLen;      // band center along +x
      const col = i % 2 === 0 ? ORANGE : WHITE;

      // CylinderGeometry(radiusTop, radiusBottom, height, segments):
      // After rotateZ(-90°), local +y maps to +x. We want the geometry to taper
      // toward +x, so the +x-facing end (originally +y / radiusTop) is the smaller.
      const geo = new THREE.CylinderGeometry(rSmall, rBig, bandLen, 10);
      geo.rotateZ(-Math.PI / 2);
      geo.translate(cx, h, 0);
      tintGeo(geo, col);
      parts.push(geo);
    }

    const mesh = tintedMesh(mergeTinted(parts));
    mesh.castShadow = true;
    group.add(mesh);

    // ── Collider: thin pole ────────────────────────────────────────────────
    const colliders: Box[] = [solidBox(0, h / 2, 0, 0.4, h, 0.4)];

    return { mesh: group, colliders };
  },
});
