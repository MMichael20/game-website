// rishon3d/src/world/objects/iceCream.ts
//
// A reusable, configurable ice-cream cone for the object library. It is a
// multi-part voxel/low-poly assembly (NOT a single cube): a waffle cone standing
// point-DOWN, a stack of faceted scoops in any flavors, an optional cherry, and
// optional melt drips. Everything bakes a color into its vertices then merges to
// ONE vertex-colored BufferGeometry (single draw call, instanceable).
//
// Conventions: base at y=0, grows +y, centered x=z=0, world units (~1u = 1m),
// handheld/tabletop sized. Deterministic, no RNG.

import * as THREE from "three";
import {
  tintedBox,
  lowPolyBall,
  cone,
  mergeTinted,
  tintedMesh,
  ringAngles,
} from "./voxel";
import { FLAVOR, CONE, CONE_DARK, CHERRY, CHERRY_STEM } from "./objectPalette";

// mergeGeometries() requires every part to be all-indexed or all non-indexed.
// The voxel helpers return indexed geometry, so normalize every part to
// non-indexed before merging.
function flat(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  return geo.index ? geo.toNonIndexed() : geo;
}

// A tinted, non-indexed box positioned at (x,y,z), ready to merge.
function box(
  w: number, h: number, d: number, x: number, y: number, z: number, hex: number,
): THREE.BufferGeometry {
  return flat(tintedBox(w, h, d, x, y, z, hex));
}

export interface IceCreamConfig {
  /** Waffle cone color. Default CONE. */
  coneColor?: number;
  /** One hex per scoop, bottom -> top. Default 3 scoops. */
  flavors?: number[];
  /** Add a cherry + stem on the top scoop. Default true. */
  cherry?: boolean;
  /** Add a couple of melt drips down the top scoop. Default true. */
  drip?: boolean;
}

const DEFAULTS: Required<IceCreamConfig> = {
  coneColor: CONE,
  flavors: [FLAVOR.strawberry, FLAVOR.vanilla, FLAVOR.chocolate],
  cherry: true,
  drip: true,
};

// Cone geometry constants (world units).
const CONE_H = 0.5; // tall waffle cone, tip at the bottom
const CONE_R_TOP = 0.24; // wide rim at the top where the first scoop sits
const SCOOP_R0 = 0.22; // bottom scoop radius
const SCOOP_SHRINK = 0.86; // each scoop a touch smaller going up
const SCOOP_OVERLAP = 0.72; // fraction of a radius each scoop rises (so they overlap)

/**
 * Build the ice-cream geometry. The cone is a frustum with its WIDE end UP and a
 * point at the bottom (y=0), so it visually balances on its tip. Scoops stack on
 * the rim, each slightly smaller and overlapping the one below.
 */
export function makeIceCream(cfg: IceCreamConfig = {}): THREE.BufferGeometry {
  const c = { ...DEFAULTS, ...cfg };
  const flavors = c.flavors.length > 0 ? c.flavors : DEFAULTS.flavors;
  const parts: THREE.BufferGeometry[] = [];

  // --- Waffle cone: a frustum, point (r=0) at y=0, wide rim at y=CONE_H. ---
  parts.push(flat(cone(0, CONE_R_TOP, CONE_H, 0, CONE_H / 2, 0, c.coneColor, 8)));

  // Waffle cross-hatch: thin diagonal ridges in CONE_DARK wrapped around the cone.
  // We place short tilted boxes at evenly spaced angles, at two heights, tilted in
  // opposite directions so they read as a lattice / waffle pattern.
  const hatchHex = CONE_DARK;
  const hatchLevels = [CONE_H * 0.32, CONE_H * 0.62];
  for (let li = 0; li < hatchLevels.length; li++) {
    const hy = hatchLevels[li];
    // Cone radius at this height (linear from 0 at base to CONE_R_TOP at top).
    const rAt = (hy / CONE_H) * CONE_R_TOP;
    const tilt = li % 2 === 0 ? Math.PI / 5 : -Math.PI / 5;
    for (const a of ringAngles(8, li * (Math.PI / 8))) {
      const ridge = box(0.022, 0.2, 0.012, 0, 0, 0, hatchHex);
      ridge.rotateZ(tilt);
      ridge.rotateY(-a);
      ridge.translate(Math.cos(a) * rAt, hy, Math.sin(a) * rAt);
      parts.push(ridge);
    }
  }

  // --- Scoop stack, sitting on the cone rim. ---
  let scoopY = CONE_H; // first scoop center near the rim
  let topY = CONE_H;
  let topR = SCOOP_R0;
  let topFlavor = flavors[0];
  for (let i = 0; i < flavors.length; i++) {
    const r = SCOOP_R0 * Math.pow(SCOOP_SHRINK, i);
    // Stack: rise by overlapping fraction of the *previous* and current radius.
    if (i === 0) {
      scoopY = CONE_H + r * 0.55;
    } else {
      scoopY += r * (SCOOP_OVERLAP + 0.55);
    }
    parts.push(flat(lowPolyBall(r, 0, scoopY, 0, flavors[i], 1)));
    topY = scoopY;
    topR = r;
    topFlavor = flavors[i];
  }

  // --- Melt drips down the top scoop (thin boxes hanging off its sides). ---
  if (c.drip) {
    const dripAngles = [Math.PI * 0.25, Math.PI * 1.15];
    const dripLens = [0.14, 0.1];
    for (let i = 0; i < dripAngles.length; i++) {
      const a = dripAngles[i];
      const len = dripLens[i];
      const dx = Math.cos(a) * topR * 0.82;
      const dz = Math.sin(a) * topR * 0.82;
      parts.push(box(0.04, len, 0.04, dx, topY - len / 2, dz, topFlavor));
    }
  }

  // --- Cherry + stem on the very top scoop. ---
  if (c.cherry) {
    const cherryR = 0.06;
    const cherryY = topY + topR + cherryR * 0.4;
    parts.push(flat(lowPolyBall(cherryR, 0, cherryY, 0, CHERRY, 1)));
    const stem = box(0.018, 0.09, 0.018, 0, cherryY + cherryR + 0.04, 0, CHERRY_STEM);
    stem.rotateZ(0.25);
    parts.push(stem);
  }

  return mergeTinted(parts);
}

/** Ready-to-add mesh with the shared voxel material. */
export function makeIceCreamMesh(cfg: IceCreamConfig = {}): THREE.Mesh {
  return tintedMesh(makeIceCream(cfg));
}

/** A handful of recognisable flavor combos for quick placement. */
export const ICE_CREAM_PRESETS: Record<string, IceCreamConfig> = {
  classic: {
    flavors: [FLAVOR.strawberry, FLAVOR.vanilla, FLAVOR.chocolate],
    cherry: true,
  },
  neapolitan: {
    flavors: [FLAVOR.chocolate, FLAVOR.strawberry, FLAVOR.vanilla],
    cherry: false,
  },
  mintChoc: {
    flavors: [FLAVOR.mint, FLAVOR.chocolate],
    cherry: true,
  },
  tropical: {
    flavors: [FLAVOR.mango, FLAVOR.pistachio, FLAVOR.blueberry],
    cherry: true,
    drip: true,
  },
};
