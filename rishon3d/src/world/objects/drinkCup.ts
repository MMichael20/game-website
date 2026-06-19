// rishon3d/src/world/objects/drinkCup.ts
//
// A reusable, configurable takeaway drink cup for the object library. It is a
// multi-part voxel/low-poly assembly (NOT a single cube): a tapered cup body, a
// branding/drink sleeve band, a domed lid, an angled straw poking out, and
// optional ice cubes. Everything bakes a color into its vertices then merges to
// ONE vertex-colored BufferGeometry (single draw call, instanceable).
//
// Conventions: base at y=0, grows +y, centered x=z=0, world units (~1u = 1m),
// handheld/tabletop sized. Deterministic, no RNG.

import * as THREE from "three";
import {
  tintedBox,
  lowPolyBall,
  cone,
  cylinderY,
  disc,
  mergeTinted,
  tintedMesh,
} from "./voxel";
import { DRINK, CUP_PLASTIC, CUP_LID, STRAW } from "./objectPalette";

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

export interface DrinkCupConfig {
  /** Cup body color. Default CUP_PLASTIC. */
  cupColor?: number;
  /** Domed lid color. Default CUP_LID. */
  lidColor?: number;
  /** Straw color. Default STRAW. */
  strawColor?: number;
  /** Sleeve/band color suggesting the drink/branding. Default DRINK.cola. */
  drinkColor?: number;
  /** Add a couple of pale ice cubes near the top. Default false. */
  iced?: boolean;
}

const DEFAULTS: Required<DrinkCupConfig> = {
  cupColor: CUP_PLASTIC,
  lidColor: CUP_LID,
  strawColor: STRAW,
  drinkColor: DRINK.cola,
  iced: false,
};

// Cup geometry constants (world units).
const CUP_H = 0.4; // body height
const CUP_R_TOP = 0.11; // ~0.22 wide at the top
const CUP_R_BASE = 0.085; // slightly narrower base (taper)
const LID_H = 0.03; // flat lid rim thickness
const DOME_R = 0.12; // domed lid radius
const STRAW_H = 0.34; // straw length
const STRAW_R = 0.014;
const STRAW_TILT = 0.32; // radians, leaning straw
const ICE_HEX = 0xdff0ff; // pale ice hint

/**
 * Build the drink-cup geometry. The body is a frustum (wide rim up, narrow base),
 * a thin sleeve band wraps the mid-height, a flat lid + dome cap the top, and a
 * tilted straw rises well above the lid so the silhouette reads instantly.
 */
export function makeDrinkCup(cfg: DrinkCupConfig = {}): THREE.BufferGeometry {
  const c = { ...DEFAULTS, ...cfg };
  const parts: THREE.BufferGeometry[] = [];

  // --- Body: frustum, narrow base at y=0, wide rim at y=CUP_H. ---
  parts.push(flat(cone(CUP_R_BASE, CUP_R_TOP, CUP_H, 0, CUP_H / 2, 0, c.cupColor, 14)));

  // --- Sleeve / branding band: a slightly larger thin ring around mid-height. ---
  const bandY = CUP_H * 0.5;
  const bandR = CUP_R_BASE + (CUP_R_TOP - CUP_R_BASE) * 0.5 + 0.006;
  parts.push(flat(cylinderY(bandR, CUP_H * 0.34, 0, bandY, 0, c.drinkColor, 14)));

  // --- Optional ice: a couple of tiny pale cubes peeking near the top rim. ---
  if (c.iced) {
    const iceY = CUP_H - 0.05;
    const ice0 = box(0.05, 0.05, 0.05, 0.03, iceY, 0.02, ICE_HEX);
    ice0.rotateY(0.5);
    parts.push(ice0);
    const ice1 = box(0.045, 0.045, 0.045, -0.035, iceY - 0.02, -0.025, ICE_HEX);
    ice1.rotateY(-0.7);
    parts.push(ice1);
  }

  // --- Lid: flat rim disc sitting on the cup mouth, then a shallow dome. ---
  const lidY = CUP_H + LID_H / 2;
  parts.push(flat(disc(CUP_R_TOP + 0.012, LID_H, 0, lidY, 0, c.lidColor, 16)));
  // Dome: a squashed low-poly ball (scaled flat) for a sip-lid bulge.
  const dome = flat(lowPolyBall(DOME_R, 0, CUP_H + LID_H, 0, c.lidColor, 1));
  dome.scale(1, 0.42, 1);
  parts.push(dome);

  // --- Straw: a thin tall cylinder leaning through the lid, well above it. ---
  const lidTop = CUP_H + LID_H + DOME_R * 0.42;
  const straw = flat(cylinderY(STRAW_R, STRAW_H, 0, 0, 0, c.strawColor, 6));
  straw.rotateZ(STRAW_TILT);
  // Place the straw so its lower portion pierces the dome and most rises above it.
  const sx = Math.sin(STRAW_TILT) * (STRAW_H * 0.18);
  straw.translate(sx, lidTop + STRAW_H * 0.32, 0);
  parts.push(straw);

  return mergeTinted(parts);
}

/** Ready-to-add mesh with the shared voxel material. */
export function makeDrinkCupMesh(cfg: DrinkCupConfig = {}): THREE.Mesh {
  return tintedMesh(makeDrinkCup(cfg));
}

/** Common drinks for quick placement. */
export const DRINK_PRESETS: Record<string, DrinkCupConfig> = {
  cola: { drinkColor: DRINK.cola, iced: true },
  orange: { drinkColor: DRINK.orange },
  berry: { drinkColor: DRINK.berry },
  water: { drinkColor: DRINK.water, iced: true },
};
