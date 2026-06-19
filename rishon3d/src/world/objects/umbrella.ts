// rishon3d/src/world/objects/umbrella.ts
//
// A real patio parasol for the reusable object library. NOT stacked shrinking
// rings (the old ziggurat look) — this is multi-part and configurable:
//   - a central pole standing on a small foot disc,
//   - a hub block where the canopy ribs meet the pole,
//   - a CANOPY built from `ribs` triangular panels arranged radially: each panel
//     is a thin sloped plank running from the high center hub down-and-out to the
//     low rim, ALTERNATING colorA / colorB so it reads as a striped parasol from
//     both above and the side,
//   - thin rib struts under each panel seam from hub to rim for structure,
//   - a scalloped hanging valance (fringe) around the rim, alternating colors,
//   - a finial cap on the very top.
//
// Everything bakes its color into vertices and merges to ONE BufferGeometry so the
// whole umbrella is a single instanceable draw call, consistent with the library.
//
// Convention: pole foot at y=0 on the ground, grows +y, centered on x=z=0. World
// units. Drops in at the same footprint as the old umbrellaGeo() (~2.7 tall, a
// canopy spanning ~3.2 wide at radius 1.6).

import * as THREE from "three";
import {
  tintGeo,
  tintedBox,
  cone,
  cylinderY,
  disc,
  mergeTinted,
  tintedMesh,
  ringAngles,
} from "./voxel";
import { PALETTE } from "../palette";

export interface UmbrellaConfig {
  /** First (and default outer) canopy stripe color. Default PALETTE.awningRed. */
  colorA?: number;
  /** Alternating canopy stripe color. Default PALETTE.awningStripe. */
  colorB?: number;
  /** Number of radial canopy panels (also rib struts + valance scallops). Default 8. */
  ribs?: number;
  /** Canopy radius (rim distance from the pole) in world units. Default 1.6. */
  radius?: number;
  /** Total height: peak of the canopy above the ground. Default 2.7. */
  height?: number;
  /** Pole + rib + foot color. Default PALETTE.benchWood. */
  poleColor?: number;
}

const POLE_RADIUS = 0.07;       // half the old 0.14 box pole, as a round post
const HUB_RADIUS = 0.16;        // chunky block where ribs gather
const PEAK_INSET = 0.04;        // panels start just off-axis so they don't z-fight
const RIM_DROP = 0.5;           // rim sits this far below the peak (height - 0.5)
const VALANCE_DROP = 0.25;      // fringe hangs this far below the rim
const RIB_DARK = 0x6b4a2a;      // fallback dark for ribs if poleColor reads light

// Build one canopy panel: a thin sloped plank spanning the angular slice for
// `rib` index `i`, running from the high hub (small radius) down to the low rim
// (full radius). It is constructed flat along +x then rotated up into its tilt and
// swung around to its angle, so adjacent panels tile into a continuous striped dome.
function canopyPanel(
  i: number,
  ribs: number,
  radius: number,
  peakY: number,
  rimY: number,
  hex: number,
): THREE.BufferGeometry {
  const a = ringAngles(ribs)[i];
  // Radial span of the plank (from just off the axis out to the rim).
  const innerR = PEAK_INSET;
  const outerR = radius;
  const run = outerR - innerR;             // horizontal length
  const drop = peakY - rimY;               // vertical fall over that run
  const slantLen = Math.hypot(run, drop);  // true length of the sloped plank
  const tilt = Math.atan2(drop, run);      // downward tilt from horizontal

  // Width: wide enough at the rim that neighboring panels touch, so the canopy
  // reads as a solid striped dome rather than separated spokes. The chord of one
  // slice at the rim is 2*radius*sin(pi/ribs); 1.15 makes panels gently overlap.
  const rimChord = 2 * outerR * Math.sin(Math.PI / ribs);
  const width = rimChord * 1.15;
  const thickness = 0.05;

  const b = new THREE.BoxGeometry(slantLen, thickness, width);
  // Tilt the plank so its outward end drops toward the rim.
  b.rotateZ(-tilt);
  // Swing it to this panel's compass angle.
  b.rotateY(-a);
  // Position its midpoint: midway in radius, midway in height, along angle a.
  const midR = innerR + run / 2;
  const midY = (peakY + rimY) / 2;
  b.translate(Math.cos(a) * midR, midY, Math.sin(a) * midR);
  return tintGeo(b, hex);
}

// A short rib strut running under a panel seam from the hub out to the rim, for
// structure and to hide the seam between two stripe panels.
function ribStrut(
  i: number,
  ribs: number,
  radius: number,
  peakY: number,
  rimY: number,
  hex: number,
): THREE.BufferGeometry {
  // Seam angles sit halfway between panel centers.
  const a = ringAngles(ribs)[i] + Math.PI / ribs;
  const innerR = PEAK_INSET;
  const run = radius - innerR;
  const drop = peakY - rimY;
  const slantLen = Math.hypot(run, drop);
  const tilt = Math.atan2(drop, run);
  const b = new THREE.BoxGeometry(slantLen, 0.04, 0.05);
  b.rotateZ(-tilt);
  b.rotateY(-a);
  const midR = innerR + run / 2;
  const midY = (peakY + rimY) / 2 + 0.03; // ride just under the panels
  b.translate(Math.cos(a) * midR, midY, Math.sin(a) * midR);
  return tintGeo(b, hex);
}

export function makeUmbrella(cfg: UmbrellaConfig = {}): THREE.BufferGeometry {
  const colorA = cfg.colorA ?? PALETTE.awningRed;
  const colorB = cfg.colorB ?? PALETTE.awningStripe;
  const ribs = Math.max(3, Math.floor(cfg.ribs ?? 8));
  const radius = cfg.radius ?? 1.6;
  const height = cfg.height ?? 2.7;
  const poleColor = cfg.poleColor ?? PALETTE.benchWood;

  const peakY = height;
  const rimY = height - RIM_DROP;

  const parts: THREE.BufferGeometry[] = [];

  // --- Foot: a small base disc the pole stands on ---
  parts.push(disc(0.34, 0.06, 0, 0.03, 0, poleColor, 16));
  parts.push(disc(0.22, 0.05, 0, 0.085, 0, poleColor, 16)); // stepped foot

  // --- Pole: round post from the ground up into the hub ---
  parts.push(cylinderY(POLE_RADIUS, peakY, 0, peakY / 2, 0, poleColor, 10));

  // --- Hub: chunky block where the ribs gather, just under the peak ---
  parts.push(cylinderY(HUB_RADIUS, 0.18, 0, rimY + (peakY - rimY) * 0.65, 0, poleColor, 8));

  // --- Canopy: ribs sloped panels, alternating stripe colors ---
  for (let i = 0; i < ribs; i++) {
    const hex = i % 2 === 0 ? colorA : colorB;
    parts.push(canopyPanel(i, ribs, radius, peakY, rimY, hex));
  }

  // --- Rib struts under the panel seams ---
  const ribHex = poleColor === PALETTE.benchWood ? RIB_DARK : poleColor;
  for (let i = 0; i < ribs; i++) {
    parts.push(ribStrut(i, ribs, radius, peakY, rimY, ribHex));
  }

  // --- Scalloped valance: a short hanging fringe per panel at the rim ---
  const valTopY = rimY;
  const scallopChord = 2 * radius * Math.sin(Math.PI / ribs) * 1.1;
  for (let i = 0; i < ribs; i++) {
    const a = ringAngles(ribs)[i];
    const hex = i % 2 === 0 ? colorA : colorB;
    // place the fringe just inside the rim so it hangs from under the canopy edge
    const r = radius - 0.06;
    const b = new THREE.BoxGeometry(0.06, VALANCE_DROP, scallopChord);
    b.rotateY(-a);
    b.translate(
      Math.cos(a) * r,
      valTopY - VALANCE_DROP / 2,
      Math.sin(a) * r,
    );
    parts.push(tintGeo(b, hex));
    // a little rounded scallop tip at the bottom of each fringe segment (a short
    // tapered nub; kept as an indexed cone so it merges with the rest)
    parts.push(
      cone(
        0.08,
        0.0,
        0.1,
        Math.cos(a) * r,
        valTopY - VALANCE_DROP - 0.02,
        Math.sin(a) * r,
        hex,
        6,
      ),
    );
  }

  // --- Finial: a small faceted cap on the very top of the pole ---
  // (a squat bicone knob built from two cones so it stays indexed and merges)
  parts.push(cone(0.11, 0.0, 0.13, 0, peakY + 0.14, 0, colorA, 8));   // upper taper
  parts.push(cone(0.0, 0.11, 0.07, 0, peakY + 0.04, 0, colorA, 8));   // lower flare
  parts.push(tintedBox(0.05, 0.12, 0.05, 0, peakY + 0.26, 0, poleColor)); // tiny spike

  return mergeTinted(parts);
}

export function makeUmbrellaMesh(cfg: UmbrellaConfig = {}): THREE.Mesh {
  return tintedMesh(makeUmbrella(cfg));
}
