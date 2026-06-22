// src/world/catalog/airport/concoursePier.ts
//
// "concoursePier" — a sealed glass-walled finger concourse (a smaller sibling of
// terminalHall). The LONG AXIS runs along +Z.
// LOCAL space: centered x=z=0, base y=0. ~1u = 1m. Fully deterministic — no
// Math.random / Date.now.
//
// Signature look (matching terminalHall): solid base sills, steel columns every
// ~9m carrying transparent tinted-glass curtain-wall bays along both long sides,
// solid end caps, a CLOSED roof (ceiling deck + a shallow blue ridge with white
// mullion ribs) so no sky shows from inside, and gate signage on each fascia.

import * as THREE from "three";
import {
  tintedBox, mergeTinted, tintedMesh, DECAL_GAP,
} from "../../objects/voxel";
import { makeGlassPanel } from "../../objects/glass";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import { defineObject } from "../../system/registry";
import type { ObjectResult, Box, Vec2 } from "../../system/types";

function solidBox(
  x: number, y: number, z: number,
  bw: number, bh: number, bd: number,
): Box {
  return { x, y, z, hx: bw / 2, hy: bh / 2, hz: bd / 2 };
}

// ─── palette / constants ──────────────────────────────────────────────────────
const FLOOR_COLOR = 0xe2ddd2;   // glossy light stone floor
const SILL_COLOR  = 0xf0ede6;   // pale warm white base sill
const ENDCAP_COLOR = 0xf0ede6;  // solid end-cap walls
const CEILING_COLOR = 0xf2eee8; // white ceiling deck
const RIDGE_BLUE  = 0x2f63b0;   // bold blue roof ridge (matches the terminal)
const RIB_COLOR   = 0xf2eee8;   // white mullion ribs across the ridge
const GLASS_TINT  = 0x3f7fb5;   // see-through curtain-wall glazing (blue)
const COL_BAY     = 9.0;        // steel column bay pitch along z

interface ConcoursePierParams {
  len: number;
  w: number;
  h: number;
}

defineObject("concoursePier", {
  params: { len: 120, w: 18, h: 9 } as ConcoursePierParams,
  build(p: ConcoursePierParams): ObjectResult {
    const { len, w, h } = p;
    const hW = w / 2;
    const hL = len / 2;

    const parts: THREE.BufferGeometry[] = [];
    const colliders: Box[] = [];
    const glassMeshes: THREE.Group[] = [];   // transparent panes (kept off the merge)
    const group = new THREE.Group();

    // ── Floor slab ─────────────────────────────────────────────────────────
    parts.push(tintedBox(w, 0.2, len, 0, 0.1, 0, FLOOR_COLOR));
    // Faint tile grid (derived from dimensions)
    const TILE = 2.5;
    for (let xi = 1; xi < Math.floor(w / TILE); xi++) {
      const tx = -hW + xi * TILE;
      parts.push(tintedBox(0.05, 0.22, len, tx, 0.11, 0, 0xcfcabc));
    }
    for (let zi = 1; zi < Math.floor(len / TILE); zi++) {
      const tz = -hL + zi * TILE;
      parts.push(tintedBox(w, 0.22, 0.05, 0, 0.11, tz, 0xcfcabc));
    }

    // ── Long side walls (±x): solid base sill + steel columns + glazing bays ─
    for (const sgn of [-1, 1]) {
      parts.push(tintedBox(0.4, 0.5, len, sgn * (hW - 0.2), 0.25, 0, SILL_COLOR));
    }

    // Steel columns every ~9m along z (z positions span -hL..+hL)
    const nCols = Math.round(len / COL_BAY) + 1;
    const colZs: number[] = [];
    for (let c = 0; c < nCols; c++) colZs.push(-hL + (c * len) / (nCols - 1));

    for (const sgn of [-1, 1]) {
      const colX = sgn * (hW - 0.35);
      for (const colZ of colZs) {
        parts.push(tintedBox(0.7, h, 0.7, colX, h / 2, colZ, PALETTE.steelLight));
      }
    }

    // Transparent glazing pane per bay (between adjacent columns), facing ±x.
    for (const sgn of [-1, 1]) {
      const wallX = sgn * (hW - 0.2);
      for (let ci = 0; ci < colZs.length - 1; ci++) {
        const z0 = colZs[ci];
        const z1 = colZs[ci + 1];
        const bayLen = Math.abs(z1 - z0);
        const midZ = (z0 + z1) / 2;
        const panel = makeGlassPanel({
          w: bayLen - 0.2,
          h: h - 0.8,
          divisions: 2,
          opacity: 0.42,
          tint: GLASS_TINT,
          frameColor: PALETTE.steel,
        });
        panel.rotation.y = Math.PI / 2;   // turn the pane to face ±x
        // makeGlassPanel grows +y from base; sit it just above the sill.
        panel.position.set(wallX, 0.5, midZ);
        glassMeshes.push(panel);
      }
    }

    // ── End caps (±z): solid walls ──────────────────────────────────────────
    for (const sgn of [-1, 1]) {
      parts.push(tintedBox(w, h, 0.4, 0, h / 2, sgn * (hL - 0.2), ENDCAP_COLOR));
    }

    // ── CLOSED roof: ceiling deck + shallow blue ridge + white ribs ─────────
    parts.push(tintedBox(w, 0.3, len, 0, h, 0, CEILING_COLOR));
    parts.push(tintedBox(w * 0.6, 0.7, len, 0, h + 0.45, 0, RIDGE_BLUE));
    // White mullion ribs across the ridge, spaced ~6m (derived)
    const nRibs = Math.max(2, Math.round(len / 6));
    for (let r = 0; r <= nRibs; r++) {
      const rz = -hL + (r * len) / nRibs;
      parts.push(tintedBox(w * 0.6 + 0.1, 0.74, 0.14, 0, h + 0.45, rz, RIB_COLOR));
    }

    // ── Gate signage: 4 boards per long side fascia, just under the roof ─────
    const eastGates = ["C21", "C23", "C25", "C27"];   // +x side
    const westGates = ["D22", "D24", "D26", "D28"];   // -x side
    const signW = 1.8;
    const signH = 0.7;
    const signY = h - 1.1;
    for (let i = 0; i < 4; i++) {
      // z positions spread evenly along len
      const sz = -hL + ((i + 0.5) * len) / 4;
      // East (+x) board — faces -x (inward), text faces +x reader via rotation
      const eSign = makeTextSignMesh({
        text: eastGates[i], w: signW, h: signH,
        boardColor: 0x1a5fa0, textColor: "#ffffff", glow: 0.8,
      });
      // makeTextSignMesh is left-anchored at x=0; offset by -signW/2 so it
      // centers on sz once rotated to face ±x.
      eSign.position.set(hW - 0.2 - DECAL_GAP, signY, sz + signW / 2);
      eSign.rotation.y = -Math.PI / 2;   // face +x
      group.add(eSign);

      const wSign = makeTextSignMesh({
        text: westGates[i], w: signW, h: signH,
        boardColor: 0x1a5fa0, textColor: "#ffffff", glow: 0.8,
      });
      wSign.position.set(-hW + 0.2 + DECAL_GAP, signY, sz - signW / 2);
      wSign.rotation.y = Math.PI / 2;    // face -x
      group.add(wSign);
    }

    // ── Colliders ───────────────────────────────────────────────────────────
    // Both long side walls as full-length thin boxes
    colliders.push(solidBox(-(hW - 0.2), h / 2, 0, 0.4, h, len));
    colliders.push(solidBox( hW - 0.2, h / 2, 0, 0.4, h, len));
    // Both end caps
    colliders.push(solidBox(0, h / 2, -(hL - 0.2), w, h, 0.4));
    colliders.push(solidBox(0, h / 2,  hL - 0.2, w, h, 0.4));

    // ── Merge opaque geometry, then add the glass panes ─────────────────────
    const opaqueMesh = tintedMesh(mergeTinted(parts));
    opaqueMesh.castShadow = true;
    opaqueMesh.receiveShadow = true;
    group.add(opaqueMesh);

    for (const gm of glassMeshes) group.add(gm);

    const anchors: Record<string, Vec2> = {
      eastDoor: { x: hW, z: 0 },
      westDoor: { x: -hW, z: 0 },
    };

    return { mesh: group, colliders, anchors };
  },
});
