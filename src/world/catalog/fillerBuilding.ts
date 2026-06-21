// src/world/catalog/fillerBuilding.ts
//
// A decorative multi-story block with NO walk-in interior — pure backdrop for
// the streetwall / skyline. Facade windows are baked opaque vertex-colored
// boxes (cheap; flat stylized look). Two styles:
//   "masonry"   — warm body, punched windows + cornice, optional ground awning.
//   "glassTower"— cool body, uniform curtain-wall grid, flat parapet.
//
// LOCAL space: centered x=z=0, base y=0, FRONT +z, ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeAwning } from "../objects/awning";
import { PALETTE, BUILDING_COLORS } from "../palette";
import { mulberry32 } from "../rng";

interface FillerParams {
  w: number;
  d: number;
  stories: number;
  storyH: number;
  bodyColor: number;
  style: "masonry" | "glassTower";
  ground: "plain" | "storefront" | "none";
  awningColor: number;
  roofUnit: boolean;
  seed: number;
}

const WIN_PER_M = 1 / 2.2;   // ~one window column per 2.2 m of facade
const WALL_PROUD = 0.06;     // how far frames/windows sit proud of the wall

// Build a window grid onto one face. `axis` picks the facade plane:
//   "+z"/"-z" → window plane at z=±d/2, spanning x; "+x"/"-x" → at x=±w/2, spanning z.
function addWindows(
  parts: THREE.BufferGeometry[],
  opts: {
    axis: "+z" | "-z" | "+x" | "-x";
    spanW: number;      // facade width to fill (x for ±z faces, z for ±x faces)
    w: number; d: number;
    yStart: number; yEnd: number; rows: number;
    glassA: number; glassB: number; frame: number;
    bigCells: boolean;  // glassTower → larger cells, thinner frame
  },
) {
  const { axis, spanW, w, d, yStart, yEnd, rows } = opts;
  const cols = Math.max(2, Math.round(spanW * WIN_PER_M));
  const cellW = spanW / cols;
  const winW = cellW * (opts.bigCells ? 0.82 : 0.62);
  const rowH = (yEnd - yStart) / rows;
  const winH = rowH * (opts.bigCells ? 0.78 : 0.58);
  const framePad = opts.bigCells ? 0.05 : 0.08;

  for (let r = 0; r < rows; r++) {
    const cy = yStart + rowH * (r + 0.5);
    for (let c = 0; c < cols; c++) {
      const off = -spanW / 2 + cellW * (c + 0.5);
      const glass = (r + c) % 2 === 0 ? opts.glassA : opts.glassB;
      // frame (slightly bigger, proud), then glass (inset a hair more)
      const fw = winW + framePad;
      const fh = winH + framePad;
      if (axis === "+z" || axis === "-z") {
        const zf = axis === "+z" ? d / 2 + WALL_PROUD : -d / 2 - WALL_PROUD;
        const zg = axis === "+z" ? d / 2 + WALL_PROUD * 1.4 : -d / 2 - WALL_PROUD * 1.4;
        parts.push(tintedBox(fw, fh, 0.05, off, cy, zf, opts.frame));
        parts.push(tintedBox(winW, winH, 0.05, off, cy, zg, glass));
      } else {
        const xf = axis === "+x" ? w / 2 + WALL_PROUD : -w / 2 - WALL_PROUD;
        const xg = axis === "+x" ? w / 2 + WALL_PROUD * 1.4 : -w / 2 - WALL_PROUD * 1.4;
        parts.push(tintedBox(0.05, fh, fw, xf, cy, off, opts.frame));
        parts.push(tintedBox(0.05, winH, winW, xg, cy, off, glass));
      }
    }
  }
}

defineObject("fillerBuilding", {
  params: {
    w: 10, d: 9, stories: 3, storyH: 3.0,
    bodyColor: BUILDING_COLORS[0], style: "masonry",
    ground: "plain", awningColor: PALETTE.awningBlue,
    roofUnit: true, seed: 1,
  } as FillerParams,
  build(p: FillerParams) {
    const { w, d, stories, storyH } = p;
    const totalH = stories * storyH;
    const rng = mulberry32(p.seed >>> 0);
    const isTower = p.style === "glassTower";

    const opaque: THREE.BufferGeometry[] = [];

    // Body
    opaque.push(tintedBox(w, totalH, d, 0, totalH / 2, 0, p.bodyColor));

    // Base plinth (proud band at the bottom)
    const plinthH = 0.5;
    opaque.push(tintedBox(w + 0.12, plinthH, d + 0.12, 0, plinthH / 2, 0, PALETTE.stoneBase));

    // Window band vertical extent: skip the ground floor when it has its own
    // storefront treatment, otherwise windows cover all floors.
    const groundIsShop = p.ground === "storefront" && !isTower;
    const winYStart = groundIsShop ? storyH + 0.3 : plinthH + 0.4;
    const winYEnd = totalH - 0.4;
    const winRows = groundIsShop ? stories - 1 : stories;

    const glassA = isTower ? PALETTE.officeGlass : PALETTE.glass;
    const glassB = PALETTE.glassDark; // darker alternating pane (both styles)
    const frame = PALETTE.frame;
    const bigCells = isTower;

    if (winRows > 0) {
      for (const axis of ["+z", "+x", "-x"] as const) {
        addWindows(opaque, {
          axis, spanW: axis === "+z" ? w : d, w, d,
          yStart: winYStart, yEnd: winYEnd, rows: winRows,
          glassA, glassB, frame, bigCells,
        });
      }
    }

    // Top: cornice (masonry) or flat parapet (tower)
    if (isTower) {
      opaque.push(tintedBox(w + 0.1, 0.4, d + 0.1, 0, totalH + 0.2, 0, PALETTE.roofCap));
    } else {
      opaque.push(tintedBox(w + 0.3, 0.4, d + 0.3, 0, totalH + 0.05, 0, PALETTE.cornice));
    }
    // Flat roof slab
    opaque.push(tintedBox(w, 0.2, d, 0, totalH + 0.1, 0, PALETTE.roofCap));

    // Rooftop unit (small box for silhouette), placed off-center deterministically.
    if (p.roofUnit) {
      const ux = (rng() - 0.5) * (w * 0.4);
      const uz = (rng() - 0.5) * (d * 0.4);
      opaque.push(tintedBox(w * 0.28, 0.9, d * 0.28, ux, totalH + 0.65, uz, PALETTE.steelDark));
    }

    const group = new THREE.Group();
    group.add(tintedMesh(mergeTinted(opaque)));
    (group.children[0] as THREE.Mesh).castShadow = true;
    (group.children[0] as THREE.Mesh).receiveShadow = true;

    // Ground-floor storefront band + awning (masonry only).
    if (groundIsShop) {
      const bandH = storyH * 0.7;
      const bandParts: THREE.BufferGeometry[] = [];
      // recessed dark glass band across the front
      bandParts.push(tintedBox(w - 0.6, bandH, 0.1, 0, plinthH + bandH / 2, d / 2 + 0.02, PALETTE.glassDark));
      // base trim under it
      bandParts.push(tintedBox(w - 0.4, 0.25, 0.16, 0, plinthH + 0.12, d / 2 + 0.04, PALETTE.curb));
      group.add(tintedMesh(mergeTinted(bandParts)));
      // striped awning at the band top, protruding +z
      const awning = tintedMesh(
        makeAwning({ w: w - 0.6, colorA: p.awningColor, colorB: PALETTE.awningStripe, depth: 1.0 }),
      );
      awning.position.set(0, plinthH + bandH, d / 2 + 0.05);
      awning.castShadow = true;
      group.add(awning);
    }

    return {
      mesh: group,
      colliders: [{ x: 0, y: totalH / 2, z: 0, hx: w / 2, hy: totalH / 2, hz: d / 2 }],
      obstacles: [{ x: 0, z: 0, w, d }],
    };
  },
});
