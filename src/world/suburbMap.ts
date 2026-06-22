// src/world/suburbMap.ts
//
// SOUTH residential district — a big neighbourhood on the OPPOSITE side of town
// from the airport (the airport is NORTH at z=+260; the homes are SOUTH). Reached
// by driving south on the x=0 arterial onto the south connector expressway.
//
// LOCAL AXIS FACTS (confirmed):
//   road / airportRoad run along +X at rot 0 (ROAD_W = 6 → half = 3).
//   An E-W avenue → rot 0.  A N-S cross-street → rot 90.
//   house / playerHouse FRONT faces +z (local).
//     rot 180 → front faces world -z (south).   rot 0 → front faces world +z (north).
//   driveway runs ALONG +z (length on z); rot 0 keeps it along z.
//
// LAYOUT (origin O = suburbPlacements(0, -210)):
//   5 E-W avenues at z = oz + {+96,+48,0,-48,-96}  (spacing 48; len 264, x∈[ox-132,ox+132]).
//   4 N-S cross streets at x = ox + {-99,-33,+33,+99}  (len 210, z∈[oz-105,oz+105]).
//   Houses line BOTH sides of every avenue, set back 16 m, placed per street-segment
//   (between consecutive crosses) so their footprints never enter a road band.
//   Every house gets a `driveway` from its avenue up to its front.
//   Hero playerHouse sits on the NORTH frontage of the north avenue, by the connector
//   mouth — the first home you see arriving from the city.
//   A pocket-park `plaza` occupies the central back-block.

import type { Placement, Vec2 } from "./system/types";
import { row } from "./layout/helpers";

const HALF = 3;                       // road half-width (ROAD_W = 6)

// ── Hero playerHouse footprint (MIRRORS catalog/playerHouse.ts dimension consts) ──
// If those change, update here. Combined local footprint after the garage wing:
//   main block x∈[-13,13], garage wing x∈[-24,-13]  → local x∈[-24,13], width 37
//   depth z∈[-10,10]
const HW = 26;                        // main block width  (playerHouse W)
const HD = 20;                        // main block depth  (playerHouse D)
const HGARW = 11;                     // garage wing width (playerHouse GAR_W)

// Avenue/cross geometry — shared by the layout and the hero-anchor helper.
const avenuesOf = (oz: number) => [oz + 96, oz + 48, oz, oz - 48, oz - 96];
const AV_LEN = 264;                                  // x∈[ox-132, ox+132]
const crossesOf = (ox: number) => [ox - 99, ox - 33, ox + 33, ox + 99];
const CROSS_LEN = 210;                               // z∈[oz-105, oz+105]

// All hero-lot geometry derived from the origin + footprint constants. Pure, so both
// suburbPlacements() and map.ts compute identical values for the same origin.
function heroLot(ox: number, oz: number) {
  const avNorth = avenuesOf(oz)[0];          // oz + 96
  const HERO_X = ox - 66;
  const HERO_Z = avNorth + 22;               // north of the north avenue
  const heroMainL = HERO_X - HW / 2;         // main-block west edge
  const heroGarR = HERO_X + HW / 2 + HGARW;  // garage east edge (garage flips to +x at rot 180)
  const heroFrontZ = HERO_Z - HD / 2;        // south face (toward avenue)
  const heroBackZ = HERO_Z + HD / 2;         // north face
  const garCenterX = HERO_X + HW / 2 + HGARW / 2;
  const FX_LEFT = heroMainL - 1.5;
  const FX_RIGHT = heroGarR + 1.5;
  const FZ_FRONT = heroFrontZ - 1.5;         // south fence line
  const FZ_BACK = heroBackZ + 1.5;           // north fence line
  return { avNorth, HERO_X, HERO_Z, heroMainL, heroGarR, heroFrontZ, heroBackZ,
    garCenterX, FX_LEFT, FX_RIGHT, FZ_FRONT, FZ_BACK };
}

/** World-space spawn + drivable-car anchors for the hero mansion at this origin. */
export function suburbAnchors(ox: number, oz: number): {
  spawn: Vec2; carSpawn: Vec2; carYaw: number;
} {
  const h = heroLot(ox, oz);
  return {
    spawn: { x: h.HERO_X, z: h.FZ_FRONT - 3.5 },        // on the entry walk, outside the gate
    carSpawn: { x: h.garCenterX, z: h.FZ_FRONT - 3.5 }, // on the driveway
    carYaw: Math.PI,                                    // face south, out toward the avenue
  };
}

export function suburbPlacements(ox: number, oz: number): Placement[] {
  const out: Placement[] = [];
  const AVENUES = avenuesOf(oz);                        // N→S, world z
  const CROSSES = crossesOf(ox);                        // N-S streets, world x

  // ── 1. ROADS — the grid that connects every house ──────────────────────────
  for (const z of AVENUES) {
    out.push({ kind: "road", x: ox, z, rot: 0, params: { length: AV_LEN } });
  }
  for (const x of CROSSES) {
    out.push({ kind: "road", x, z: oz, rot: 90, params: { length: CROSS_LEN } });
  }

  // ── 2. HERO LOT — the big mansion + yard, on the north avenue frontage ──────
  const h = heroLot(ox, oz);
  out.push({ kind: "playerHouse", x: h.HERO_X, z: h.HERO_Z, rot: 180, params: { seed: 42 } });

  const mainFrontRight = h.HERO_X + HW / 2;            // main block east edge (garage starts here)
  const frontSegLen = mainFrontRight - h.FX_LEFT;
  const frontSegMidX = (h.FX_LEFT + mainFrontRight) / 2;
  const fenceMidZ = (h.FZ_FRONT + h.FZ_BACK) / 2;
  const fenceNSLen = h.FZ_BACK - h.FZ_FRONT;
  const fenceEWLen = h.FX_RIGHT - h.FX_LEFT;

  // Front fence (south) — main-block frontage only, with a gate; garage bay open.
  out.push({ kind: "fence", x: frontSegMidX, z: h.FZ_FRONT, rot: 0,
    params: { length: frontSegLen, gate: true, color: 0xece7da } });
  out.push({ kind: "fence", x: (h.FX_LEFT + h.FX_RIGHT) / 2, z: h.FZ_BACK, rot: 0,
    params: { length: fenceEWLen, gate: false, color: 0xece7da } });
  out.push({ kind: "fence", x: h.FX_LEFT, z: fenceMidZ, rot: 90,
    params: { length: fenceNSLen, gate: false, color: 0xece7da } });
  out.push({ kind: "fence", x: h.FX_RIGHT, z: fenceMidZ, rot: 90,
    params: { length: fenceNSLen, gate: false, color: 0xece7da } });

  // Hero driveway: from the avenue north kerb up to the garage front (south face).
  const heroDriveZ0 = h.avNorth + HALF;               // street end
  const heroDriveZ1 = h.heroFrontZ;                   // garage/front end
  out.push({ kind: "driveway", x: h.garCenterX, z: (heroDriveZ0 + heroDriveZ1) / 2,
    rot: 0, params: { length: heroDriveZ1 - heroDriveZ0 + 1.0, width: 4 } });

  // Mailbox at the curb by the gate; yard trees + planters (derived from the fence).
  out.push({ kind: "mailbox", x: frontSegMidX - 3, z: h.FZ_FRONT - 1.2 });
  out.push({ kind: "tree", x: h.FX_LEFT + 3, z: h.FZ_BACK - 3 });
  out.push({ kind: "tree", x: h.FX_RIGHT - 3, z: h.FZ_BACK - 3 });
  out.push({ kind: "planter", x: h.FX_LEFT + 3, z: h.FZ_FRONT + 2.5 });
  out.push({ kind: "planter", x: mainFrontRight - 2, z: h.FZ_FRONT + 2.5 });

  // ── 3. PLACEHOLDER HOUSES — both sides of every avenue, per street segment ───
  const segBounds = [ox - 132, ...CROSSES, ox + 132];
  const M = 14;        // end margin (road half + max house half-width + slack)
  const PITCH = 20;

  function segXs(a: number, b: number): number[] {
    const lo = a + M, hi = b - M;
    if (hi <= lo) return [];
    const span = hi - lo;
    const n = Math.max(1, Math.floor(span / PITCH) + 1);
    if (n === 1) return [(lo + hi) / 2];
    const xs: number[] = [];
    for (let k = 0; k < n; k++) xs.push(lo + (span * k) / (n - 1));
    return xs;
  }

  const heroSkip = (x: number, z: number) =>
    x > h.heroMainL - 10 && x < h.heroGarR + 10 && z > h.heroFrontZ - 8 && z < h.heroBackZ + 8;

  const PARK_X = ox, PARK_Z = oz + 24, PARK_W = 24, PARK_D = 16;
  const parkSkip = (x: number, z: number) =>
    Math.abs(x - PARK_X) < PARK_W / 2 + 6 && Math.abs(z - PARK_Z) < PARK_D / 2 + 8;

  let hi = 0; // house index → seeded variation
  for (const avZ of AVENUES) {
    for (const side of [+1, -1] as const) {
      const rot: 0 | 180 = side > 0 ? 180 : 0;  // north side faces south; south faces north
      const rowZ = avZ + side * 16;
      for (let s = 0; s < segBounds.length - 1; s++) {
        for (const x of segXs(segBounds[s], segBounds[s + 1])) {
          if (Math.abs(x - ox) < 9 && avZ === AVENUES[0] && side > 0) continue; // connector mouth
          if (heroSkip(x, rowZ)) continue;
          if (parkSkip(x, rowZ)) continue;

          const w = [9, 10, 11][hi % 3];
          const d = [10, 11, 12][hi % 3];
          const stories = hi % 3 === 2 ? 3 : 2;
          const hasGarage = hi % 2 === 0;
          const hasPorch = !hasGarage;
          out.push({
            kind: "house", x, z: rowZ, rot,
            params: { w, d, stories, storyH: 2.8, garage: hasGarage, porch: hasPorch, seed: 400 + hi * 7 },
          });

          const frontZ = rowZ - side * (d / 2);   // face toward the avenue
          const streetZ = avZ + side * HALF;       // avenue kerb on this side
          out.push({ kind: "driveway", x, z: (frontZ + streetZ) / 2, rot: 0,
            params: { length: Math.abs(frontZ - streetZ) + 1.0, width: 3 } });

          hi++;
        }
      }
    }
  }

  // ── 4. POCKET PARK — central back-block green (between the 2nd & 3rd avenues) ─
  out.push({ kind: "plaza", x: PARK_X, z: PARK_Z, params: { w: PARK_W, d: PARK_D, seed: 7 } });
  for (const dx of [-PARK_W / 2 - 2, PARK_W / 2 + 2]) {
    out.push({ kind: "tree", x: PARK_X + dx, z: PARK_Z });
    out.push({ kind: "planter", x: PARK_X + dx, z: PARK_Z - 4 });
  }
  out.push({ kind: "bench", x: PARK_X, z: PARK_Z - PARK_D / 2 - 1.5 });

  // ── 5. STREET FURNITURE — lamps + trees along every avenue (MORE greenery) ───
  for (const avZ of AVENUES) {
    for (const side of [+1, -1] as const) {
      const sz = avZ + side * (HALF + 2.5);     // on the verge between road and lots
      out.push(...row("lamp", { x: ox - 120, z: sz, count: 12, gap: 22, axis: "x" }));
    }
  }
  for (const x of [ox - 126, ox - 60, ox + 6, ox + 72, ox + 126]) {
    out.push({ kind: "tree", x, z: AVENUES[0] + 9 });
    out.push({ kind: "tree", x, z: AVENUES[AVENUES.length - 1] - 9 });
  }
  for (const z of [oz + 72, oz + 24, oz - 24, oz - 72]) {
    out.push({ kind: "tree", x: ox - 130, z });
    out.push({ kind: "tree", x: ox + 130, z });
  }

  return out;
}
