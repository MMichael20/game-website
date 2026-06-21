// src/world/catalog/fillerBuilding.ts
//
// A decorative multi-story block with NO walk-in interior — pure backdrop for
// the streetwall / skyline. Facade windows are baked opaque vertex-colored
// boxes (cheap; flat stylized look). Three styles:
//   "masonry"    — warm body, punched windows + sills + spandrel floor bands +
//                  corner/intermediate pilasters, cornice, optional ground awning.
//   "glassTower" — cool body, uniform curtain-wall grid, slim mullion piers,
//                  sparse bright reflection panes, flat parapet.
//   "darkGlass"  — moody dark-teal curtain wall with bright cyan reflection panes
//                  and near-black mullions (the reference-art storefront/tower look).
//
// All facade detail is derived from real dimensions (CLAUDE.md PITFALL 3) and the
// whole shell merges into ONE vertex-colored mesh. LOCAL space: centered x=z=0,
// base y=0, FRONT +z, ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject } from "../system/registry";
import { tintedBox, cylinderY, mergeTinted, tintedMesh } from "../objects/voxel";
import { makeAwning } from "../objects/awning";
import { PALETTE, BUILDING_COLORS } from "../palette";
import { mulberry32 } from "../rng";

interface FillerParams {
  w: number;
  d: number;
  stories: number;
  storyH: number;
  bodyColor: number;
  style: "masonry" | "glassTower" | "darkGlass";
  ground: "plain" | "storefront" | "none";
  awningColor: number;
  roofUnit: boolean;
  seed: number;
}

const WIN_PER_M = 1 / 2.2;   // ~one window column per 2.2 m of facade
const WALL_PROUD = 0.06;     // how far frames/windows sit proud of the wall

type Axis = "+z" | "-z" | "+x" | "-x";

// Number of window columns for a facade of the given span (shared by windows,
// sills and piers so the grid stays aligned).
function colsFor(spanW: number): number {
  return Math.max(2, Math.round(spanW * WIN_PER_M));
}

// Build a window grid (frame + glass + sill) onto one face. `axis` picks the plane:
//   "+z"/"-z" → plane at z=±d/2, spanning x; "+x"/"-x" → at x=±w/2, spanning z.
function addWindows(
  parts: THREE.BufferGeometry[],
  opts: {
    axis: Axis;
    spanW: number;      // facade width to fill (x for ±z faces, z for ±x faces)
    w: number; d: number;
    yStart: number; yEnd: number; rows: number;
    glassA: number; glassB: number; frame: number;
    bigCells: boolean;  // curtain-wall → larger cells, thinner frame
    sillColor: number;
    reflect?: number;   // bright reflection pane color (glass styles only)
    seed: number;
  },
) {
  const { axis, spanW, w, d, yStart, yEnd, rows } = opts;
  const cols = colsFor(spanW);
  const cellW = spanW / cols;
  const winW = cellW * (opts.bigCells ? 0.82 : 0.62);
  const rowH = (yEnd - yStart) / rows;
  const winH = rowH * (opts.bigCells ? 0.78 : 0.58);
  const framePad = opts.bigCells ? 0.05 : 0.08;
  const onZ = axis === "+z" || axis === "-z";

  for (let r = 0; r < rows; r++) {
    const cy = yStart + rowH * (r + 0.5);
    for (let c = 0; c < cols; c++) {
      const off = -spanW / 2 + cellW * (c + 0.5);
      // base pane alternates; a sparse deterministic minority becomes a bright
      // reflection (only for glass styles that pass `reflect`).
      let glass = (r + c) % 2 === 0 ? opts.glassA : opts.glassB;
      if (opts.reflect !== undefined && (r * 13 + c * 7 + opts.seed * 5) % 5 === 0) {
        glass = opts.reflect;
      }
      const fw = winW + framePad;
      const fh = winH + framePad;
      const sy = cy - winH / 2 - 0.05;   // sill just below the pane
      if (onZ) {
        const zf = axis === "+z" ? d / 2 + WALL_PROUD : -d / 2 - WALL_PROUD;
        const zg = axis === "+z" ? d / 2 + WALL_PROUD * 1.4 : -d / 2 - WALL_PROUD * 1.4;
        parts.push(tintedBox(fw, fh, 0.05, off, cy, zf, opts.frame));
        parts.push(tintedBox(winW, winH, 0.05, off, cy, zg, glass));
        parts.push(tintedBox(fw + 0.06, 0.08, 0.12, off, sy, zf, opts.sillColor));
      } else {
        const xf = axis === "+x" ? w / 2 + WALL_PROUD : -w / 2 - WALL_PROUD;
        const xg = axis === "+x" ? w / 2 + WALL_PROUD * 1.4 : -w / 2 - WALL_PROUD * 1.4;
        parts.push(tintedBox(0.05, fh, fw, xf, cy, off, opts.frame));
        parts.push(tintedBox(0.05, winH, winW, xg, cy, off, glass));
        parts.push(tintedBox(0.12, 0.08, fw + 0.06, xf, sy, off, opts.sillColor));
      }
    }
  }
}

// Vertical pilaster / curtain-wall mullion piers on the column boundaries.
function addPiers(
  parts: THREE.BufferGeometry[],
  opts: { axis: Axis; spanW: number; w: number; d: number; yStart: number; yEnd: number; color: number },
) {
  const { axis, spanW, w, d, yStart, yEnd } = opts;
  const cols = colsFor(spanW);
  const cellW = spanW / cols;
  const pierW = Math.min(0.24, cellW * 0.2);
  const proud = WALL_PROUD * 1.3;
  const height = yEnd - yStart + 0.2;
  const cy = (yStart + yEnd) / 2;
  const onZ = axis === "+z" || axis === "-z";
  for (let c = 0; c <= cols; c++) {
    const off = -spanW / 2 + cellW * c;
    if (onZ) {
      const zf = axis === "+z" ? d / 2 + proud : -d / 2 - proud;
      parts.push(tintedBox(pierW, height, 0.08, off, cy, zf, opts.color));
    } else {
      const xf = axis === "+x" ? w / 2 + proud : -w / 2 - proud;
      parts.push(tintedBox(0.08, height, pierW, xf, cy, off, opts.color));
    }
  }
}

// Thin proud spandrel bands at each inter-story line across the three shown faces.
function addSpandrels(
  parts: THREE.BufferGeometry[],
  opts: { w: number; d: number; yStart: number; rowH: number; rows: number; color: number },
) {
  const { w, d, yStart, rowH, rows } = opts;
  const proud = WALL_PROUD;
  for (let r = 1; r < rows; r++) {
    const y = yStart + rowH * r;
    parts.push(tintedBox(w + 0.04, 0.16, 0.06, 0, y, d / 2 + proud, opts.color));
    parts.push(tintedBox(0.06, 0.16, d + 0.04, w / 2 + proud, y, 0, opts.color));
    parts.push(tintedBox(0.06, 0.16, d + 0.04, -w / 2 - proud, y, 0, opts.color));
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
    const isGlass = p.style === "glassTower" || p.style === "darkGlass";
    const isDark = p.style === "darkGlass";

    const opaque: THREE.BufferGeometry[] = [];

    // Body
    opaque.push(tintedBox(w, totalH, d, 0, totalH / 2, 0, p.bodyColor));

    // Base plinth (proud band at the bottom)
    const plinthH = 0.5;
    opaque.push(tintedBox(w + 0.12, plinthH, d + 0.12, 0, plinthH / 2, 0, PALETTE.stoneBase));

    // Window band vertical extent: skip the ground floor when it has its own
    // storefront treatment, otherwise windows cover all floors.
    const groundIsShop = p.ground === "storefront" && !isGlass;
    const winYStart = groundIsShop ? storyH + 0.3 : plinthH + 0.4;
    const winYEnd = totalH - 0.4;
    const winRows = groundIsShop ? stories - 1 : stories;

    // Per-style facade palette.
    const glassA = isDark ? PALETTE.darkGlassA : isGlass ? PALETTE.officeGlass : PALETTE.glass;
    const glassB = isDark ? PALETTE.darkGlassB : PALETTE.glassDark;
    const mullion = isDark ? PALETTE.darkMullion : PALETTE.frame;
    const pierColor = isDark ? PALETTE.darkMullion : isGlass ? PALETTE.frame : PALETTE.pierStone;
    const sillColor = isGlass ? mullion : PALETTE.sillStone;
    const reflect = isGlass ? PALETTE.glassReflect : undefined;
    const faces: Axis[] = ["+z", "+x", "-x"];

    if (winRows > 0) {
      const rowH = (winYEnd - winYStart) / winRows;
      for (const axis of faces) {
        const spanW = axis === "+z" ? w : d;
        addWindows(opaque, {
          axis, spanW, w, d,
          yStart: winYStart, yEnd: winYEnd, rows: winRows,
          glassA, glassB, frame: mullion, bigCells: isGlass,
          sillColor, reflect, seed: p.seed,
        });
        addPiers(opaque, { axis, spanW, w, d, yStart: winYStart, yEnd: winYEnd, color: pierColor });
      }
      // Masonry reads as stacked floors: add spandrel bands between stories.
      if (!isGlass) {
        addSpandrels(opaque, { w, d, yStart: winYStart, rowH, rows: winRows, color: PALETTE.spandrel });
      }
    }

    // Top: cornice (masonry) or raised parapet (glass).
    if (isGlass) {
      opaque.push(tintedBox(w + 0.12, 0.7, d + 0.12, 0, totalH + 0.35, 0, PALETTE.roofCap));
    } else {
      opaque.push(tintedBox(w + 0.3, 0.4, d + 0.3, 0, totalH + 0.05, 0, PALETTE.cornice));
    }
    // Flat roof slab
    opaque.push(tintedBox(w, 0.2, d, 0, totalH + 0.1, 0, PALETTE.roofCap));

    // Rooftop mechanical cluster (water tank + AC condenser + vent), placed
    // deterministically within the roof footprint. Gated by `roofUnit`.
    if (p.roofUnit) {
      const roofY = totalH + 0.2;
      const spread = 0.34;
      // water tank toward one side
      const tankR = Math.min(w, d) * 0.12;
      const tankH = 1.5;
      const tx = (rng() - 0.5) * w * spread - w * 0.18;
      const tz = (rng() - 0.5) * d * spread;
      opaque.push(tintedBox(tankR * 2 + 0.2, 0.3, tankR * 2 + 0.2, tx, roofY + 0.15, tz, PALETTE.steelDark)); // base
      opaque.push(cylinderY(tankR, tankH, tx, roofY + 0.3 + tankH / 2, tz, PALETTE.tankMetal));
      // AC condenser on the other side
      const ax = (rng() - 0.5) * w * spread + w * 0.2;
      const az = (rng() - 0.5) * d * spread;
      opaque.push(tintedBox(w * 0.22, 0.6, d * 0.22, ax, roofY + 0.3, az, PALETTE.acUnit));
      // vent pipe near the tank
      const vx = tx + tankR + 0.4;
      const vz = tz + (rng() - 0.5) * d * 0.1;
      opaque.push(cylinderY(0.12, 1.1, vx, roofY + 0.55, vz, PALETTE.ventPipe));
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
