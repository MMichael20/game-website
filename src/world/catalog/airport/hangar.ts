// src/world/catalog/airport/hangar.ts
//
// "hangar" — a big aircraft maintenance hangar.
// LOCAL space: centered x=z=0, base y=0, FRONT faces +z (the open door faces +z
// toward the apron). ~1u = 1m. Fully deterministic — no Math.random / Date.now.
//
// A pale metal shell: back + two side walls solid, the FRONT (+z) is the wide
// door opening (only a header beam + two side jambs are framed), a recessed dark
// "interior / closed door" panel set back so a jet reads as parked inside, a
// closed ceiling deck with a shallow stepped ridge on top, and company signage
// across the front header.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import {
  tintedBox, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import type { ObjectResult, Box } from "../../system/types";

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// ─── palette ─────────────────────────────────────────────────────────────────
const SHELL   = 0xd8dce0;   // pale metal shell
const FRAME   = 0xc2c6cc;   // structural frame / header
const FLOOR   = 0xcfd3d8;   // concrete floor slab
const RIDGE   = 0xb7bcc2;   // ridge bands on the roof
const INTERIOR = 0x20242a;  // recessed dark interior / closed-door panel
const WALL_T  = 0.6;

interface HangarParams {
  w: number;
  d: number;
  h: number;
  name: string;
}

defineObject("hangar", {
  params: { w: 80, d: 60, h: 28, name: "EL AL MAINTENANCE" } as HangarParams,
  build(p: HangarParams): ObjectResult {
    const { w, d, h } = p;
    const hW = w / 2;
    const hD = d / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const group = new THREE.Group();

    // ── Floor slab ─────────────────────────────────────────────────────────
    parts.push(tintedBox(w, 0.2, d, 0, 0.1, 0, FLOOR));

    // ── Back wall (-z) ───────────────────────────────────────────────────────
    parts.push(tintedBox(w, h, WALL_T, 0, h / 2, -hD + WALL_T / 2, SHELL));
    colliders.push(solidBox(0, h / 2, -hD + WALL_T / 2, w, h, WALL_T));

    // ── Two side walls (±x) ──────────────────────────────────────────────────
    for (const sgn of [-1, 1]) {
      parts.push(tintedBox(WALL_T, h, d, sgn * (hW - WALL_T / 2), h / 2, 0, SHELL));
      colliders.push(solidBox(sgn * (hW - WALL_T / 2), h / 2, 0, WALL_T, h, d));
    }

    // ── FRONT (+z): the DOOR opening ─────────────────────────────────────────
    // Header beam across the top (do NOT fill the opening solid).
    const headerH = h * 0.18;
    parts.push(tintedBox(w, headerH, WALL_T, 0, h - h * 0.09, hD - WALL_T / 2, FRAME));
    colliders.push(solidBox(0, h - h * 0.09, hD - WALL_T / 2, w, headerH, WALL_T));
    // Two narrow door jambs at the sides.
    const jambW = w * 0.06;
    for (const sgn of [-1, 1]) {
      parts.push(tintedBox(jambW, h, WALL_T, sgn * (hW - w * 0.03), h / 2, hD - WALL_T / 2, SHELL));
      colliders.push(solidBox(sgn * (hW - w * 0.03), h / 2, hD - WALL_T / 2, jambW, h, WALL_T));
    }
    // Recessed dark "interior / closed door" panel set back from the opening, so
    // a jet reads as parked inside (no collider — purely visual, behind the gap).
    parts.push(tintedBox(w * 0.86, h * 0.82, 0.2, 0, h * 0.41, hD - 1.2, INTERIOR));

    // ── Roof: closed ceiling deck (no sky through it) ────────────────────────
    parts.push(tintedBox(w, 0.5, d, 0, h, 0, FRAME));
    // Shallow ridge on top: 3 stacked, narrowing bands centered.
    for (let i = 0; i < 3; i++) {
      parts.push(tintedBox(w * (0.9 - i * 0.18), 0.6, d, 0, h + 0.5 + i * 0.6, 0, RIDGE));
    }

    // ── Vertical ribbing hint (thin proud pilasters) ─────────────────────────
    // Spaced deterministically from w (back wall) and d (side walls).
    const nBack = Math.max(2, Math.round(w / 8));
    for (let i = 1; i < nBack; i++) {
      const rx = -hW + (i * w) / nBack;
      parts.push(tintedBox(0.2, h, 0.2, rx, h / 2, -hD + WALL_T + 0.1, FRAME));
    }
    const nSide = Math.max(2, Math.round(d / 8));
    for (let i = 1; i < nSide; i++) {
      const rz = -hD + (i * d) / nSide;
      for (const sgn of [-1, 1]) {
        parts.push(tintedBox(0.2, h, 0.2, sgn * (hW - WALL_T - 0.1), h / 2, rz, FRAME));
      }
    }

    // ── Company signage on the front header ──────────────────────────────────
    const signW = Math.min(w * 0.5, 36);
    const sign = makeTextSignMesh({
      text: p.name,
      w: signW,
      h: 2.2,
      boardColor: 0x123a6b,
      textColor: "#ffffff",
      glow: 0.6,
    });
    // makeTextSignMesh anchors at the left edge, so offset x by -signW/2 to center.
    sign.position.set(-signW / 2, h - 2.0, hD + 0.05 + DECAL_GAP);
    group.add(sign);

    // ── Merge opaque geometry ────────────────────────────────────────────────
    const mainMesh = tintedMesh(mergeTinted(parts));
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    return {
      mesh: group,
      colliders,
    };
  },
});
