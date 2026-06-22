// src/world/catalog/airport/wayfindingSign.ts
//
// "wayfindingSign" — a ceiling-hung directional sign (SECURITY, GATES, etc.) with
// a colored board, a painted arrow chevron, and two drop-rods. base y=0 is the
// ceiling attach; the board hangs below. FRONT faces +z. ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../../system/registry";
import { tintedBox, mergeTinted, tintedMesh, DECAL_GAP } from "../../objects/voxel";
import { makeTextSignMesh } from "../../objects/textSign";
import { PALETTE } from "../../palette";
import type { ObjectResult } from "../../system/types";

type Style = "amber" | "blue" | "dark";

interface WayfindingParams { text: string; style: Style; w: number; arrow: boolean; alt: number }

const STYLES: Record<Style, { board: number; text: string }> = {
  amber: { board: 0xf2b81e, text: "#101010" },
  blue:  { board: 0x1f4f8a, text: "#ffffff" },
  dark:  { board: 0x15171a, text: "#f0b020" },
};

defineObject("wayfindingSign", {
  params: { text: "GATES", style: "amber", w: 3, arrow: true, alt: 6.5 } as WayfindingParams,
  build(p: WayfindingParams): ObjectResult {
    const { text, style, w, arrow, alt } = p;
    const st = STYLES[style];
    const h = 0.7;
    const rodLen = 0.5;
    const boardTopY = alt - rodLen;

    const parts: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    // Drop-rods from the ceiling at y=alt
    for (const sx of [-1, 1]) {
      parts.push(tintedBox(0.05, rodLen, 0.05, sx * w * 0.34, alt - rodLen / 2, 0, PALETTE.steelDark));
    }
    parts.push(tintedBox(w * 0.74, 0.06, 0.1, 0, alt - 0.03, 0, PALETTE.steelDark));

    // The text board hangs below the rods
    const board = makeTextSignMesh({
      text, w, h, boardColor: st.board, textColor: st.text, glow: 0.85,
    });
    board.position.set(-w / 2, boardTopY - h, 0);
    group.add(board);

    // Painted arrow chevron beside the text (points +x)
    if (arrow) {
      const ay = boardTopY - h / 2;
      const ax = w / 2 - 0.25;
      const arrowCol = style === "amber" ? 0x101010 : 0xffffff;
      // shaft
      parts.push(tintedBox(0.35, 0.08, 0.05, ax - 0.2, ay, 0.15 + DECAL_GAP, arrowCol));
      // head
      parts.push(tintedBox(0.14, 0.22, 0.05, ax, ay, 0.15 + DECAL_GAP, arrowCol));
      parts.push(tintedBox(0.1, 0.32, 0.05, ax - 0.06, ay, 0.15 + DECAL_GAP, arrowCol));
    }

    const opaque = tintedMesh(mergeTinted(parts));
    group.add(opaque);

    return { mesh: group, colliders: [], obstacles: [] };
  },
});
