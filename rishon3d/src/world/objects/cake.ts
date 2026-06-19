// rishon3d/src/world/objects/cake.ts
//
// A round layer cake for the bakery object library. Multi-part and configurable:
// a plate, stacked sponge tiers separated by cream fillings, a domed frosting top
// with drips down the side, and an optional cherry. Optionally served as a slice
// (one angular wedge removed) so it reads as a cut cake on a display counter.
//
// Convention: base at y=0, grows +y, centered on x=z=0. ~0.7 diameter tabletop item.

import * as THREE from "three";
import {
  tintGeo,
  tintedBox,
  lowPolyBall,
  cylinderY,
  disc,
  mergeTinted,
  tintedMesh,
  ringAngles,
} from "./voxel";
import { SPONGE, FROSTING, CHERRY, CHERRY_STEM } from "./objectPalette";

// tintedBox / BoxGeometry are indexed, but cylinders/cones/balls are non-indexed;
// mergeGeometries needs all-or-none indexed. Normalise box parts to non-indexed.
function box(
  w: number, h: number, d: number, x: number, y: number, z: number, hex: number,
): THREE.BufferGeometry {
  const g = tintedBox(w, h, d, x, y, z, hex);
  return g.index ? g.toNonIndexed() : g;
}

// A non-indexed, tinted box from a pre-transformed BoxGeometry.
function tintedBoxGeo(b: THREE.BoxGeometry, hex: number): THREE.BufferGeometry {
  const g = b.index ? b.toNonIndexed() : b;
  return tintGeo(g, hex);
}

export interface CakeConfig {
  spongeColor?: number;
  frostingColor?: number;
  plateColor?: number;
  cherryColor?: number;
  /** Number of sponge layers (each separated by a cream filling). Default 2. */
  tiers?: number;
  /** Cherry + stem on top. Default true. */
  cherry?: boolean;
  /** Remove an angular wedge so it reads as a served/cut cake. Default false. */
  slice?: boolean;
}

const PLATE_COLOR = 0xeceaf2; // pale porcelain
const CAKE_RADIUS = 0.32;

// When sliced we keep this much of the ring (a wedge is missing). Parts that lie
// inside the missing wedge are skipped so the cut reads cleanly.
const SLICE_KEEP = Math.PI * 1.5; // 3/4 of the cake remains
const SLICE_GAP_START = SLICE_KEEP; // angles in [start, 2PI) are the empty wedge

function inMissingWedge(angle: number): boolean {
  // Normalize to [0, 2PI)
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return a >= SLICE_GAP_START;
}

export function makeCake(cfg: CakeConfig = {}): THREE.BufferGeometry {
  const sponge = cfg.spongeColor ?? SPONGE.vanilla;
  const frosting = cfg.frostingColor ?? FROSTING.cream;
  const plate = cfg.plateColor ?? PLATE_COLOR;
  const cherryColor = cfg.cherryColor ?? CHERRY;
  const tiers = Math.max(1, Math.floor(cfg.tiers ?? 2));
  const cherry = cfg.cherry ?? true;
  const slice = cfg.slice ?? false;

  const parts: THREE.BufferGeometry[] = [];

  // --- Plate: wide flat disc with a slightly raised rim ---
  parts.push(disc(CAKE_RADIUS + 0.12, 0.025, 0, 0.0125, 0, plate, 24));
  parts.push(disc(CAKE_RADIUS + 0.13, 0.012, 0, 0.04, 0, plate, 24)); // rim lip

  // Sponge segments: when sliced, build each sponge layer from wedge segments so
  // we can omit the ones in the missing wedge (a real cut face). Otherwise a clean
  // cylinder keeps it cheap.
  const spongeH = 0.07;
  const fillingH = 0.018;
  const layerSeg = 24;

  let y = 0.04; // top of plate rim

  for (let t = 0; t < tiers; t++) {
    if (slice) {
      parts.push(...wedgeRing(CAKE_RADIUS, spongeH, y, sponge, layerSeg));
      // expose the cut: a cream-colored cross-section is suggested by the filling
      // discs above/below; the open faces of the box segments already read as cut.
    } else {
      parts.push(cylinderY(CAKE_RADIUS, spongeH, 0, y + spongeH / 2, 0, sponge, layerSeg));
    }
    y += spongeH;

    // Cream filling between layers (and a thin cap of cream under the frosting top).
    if (slice) {
      parts.push(...wedgeRing(CAKE_RADIUS + 0.003, fillingH, y, frosting, layerSeg));
    } else {
      parts.push(disc(CAKE_RADIUS + 0.003, fillingH, 0, y + fillingH / 2, 0, frosting, layerSeg));
    }
    y += fillingH;
  }

  // --- Frosting top: a thin frosting cap and a gently domed top ---
  const capH = 0.02;
  if (slice) {
    parts.push(...wedgeRing(CAKE_RADIUS + 0.006, capH, y, frosting, layerSeg));
  } else {
    parts.push(cylinderY(CAKE_RADIUS + 0.006, capH, 0, y + capH / 2, 0, frosting, layerSeg));
  }
  y += capH;

  // Domed top: stacked shrinking discs to suggest a swirl of frosting.
  const domeBase = CAKE_RADIUS - 0.02;
  const domeLayers = 3;
  let domeY = y;
  for (let i = 0; i < domeLayers; i++) {
    const f = i / domeLayers;
    const r = domeBase * (1 - f * 0.55);
    const h = 0.022;
    parts.push(disc(r, h, 0, domeY + h / 2, 0, frosting, 18));
    domeY += h * 0.7; // overlap so it reads as one dome, not a wedding cake
  }
  const topY = domeY + 0.01;

  // --- Drips down the side: small frosting teardrops at the top sponge edge ---
  const dripR = CAKE_RADIUS + 0.004;
  const dripTopY = y; // top of the frosting cap
  for (const a of ringAngles(12, 0.13)) {
    if (slice && inMissingWedge(a)) continue;
    const x = Math.cos(a) * dripR;
    const z = Math.sin(a) * dripR;
    // a short box bulge + a small ball at its tip = a teardrop drip
    const dripH = 0.05;
    parts.push(box(0.045, dripH, 0.03, x, dripTopY - dripH / 2 + 0.01, z, frosting));
    parts.push(lowPolyBall(0.022, x, dripTopY - dripH + 0.005, z, frosting, 0));
  }

  // --- Cherry on top ---
  if (cherry) {
    parts.push(lowPolyBall(0.04, 0, topY + 0.035, 0, cherryColor, 1));
    parts.push(box(0.012, 0.05, 0.012, 0, topY + 0.085, 0, CHERRY_STEM));
  }

  return mergeTinted(parts);
}

// Build one layer as a ring of tangent box segments, omitting any segment whose
// center angle lands in the missing wedge. Gives a sliced cake an open cut face.
function wedgeRing(
  radius: number,
  h: number,
  baseY: number,
  hex: number,
  seg: number,
): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  // segment chord width sized so adjacent boxes overlap into a smooth ring
  const segW = (2 * Math.PI * radius) / seg * 1.25;
  const segDepth = radius * 0.62; // reach from rim toward center
  for (const a of ringAngles(seg)) {
    if (inMissingWedge(a)) continue;
    const midR = radius - segDepth / 2;
    const x = Math.cos(a) * midR;
    const z = Math.sin(a) * midR;
    const b = new THREE.BoxGeometry(segW, h, segDepth);
    b.rotateY(-a);
    b.translate(x, baseY + h / 2, z);
    out.push(tintedBoxGeo(b, hex));
  }
  // a small inner core fills the very center the wedges leave hollow
  out.push(cylinderY(radius * 0.42, h, 0, baseY + h / 2, 0, hex, 16));
  return out;
}

export function makeCakeMesh(cfg: CakeConfig = {}): THREE.Mesh {
  return tintedMesh(makeCake(cfg));
}
