import type { Placement } from "../system/types";
import { DISTRICT_PALETTES, PALETTE } from "../palette";
import { mulberry32 } from "../rng";

// A city block wrapped in a continuous streetwall on each side, built from the
// existing `terraceRow` object — no new catalog kind, just authored data (like
// `lot`). Every side is filled EXACTLY: the units are equal-width and sum to the
// edge length, so the wall fills its block face with no gap and never spills onto
// the road. Fronts face outward toward the surrounding streets; the block core is
// a hidden courtyard. This is how we "use every space": pack each grid cell.

type Side = "N" | "S" | "E" | "W";

interface UnitSpec {
  w: number; stories: number; bodyColor: number;
  style: "masonry" | "glassTower" | "darkGlass";
  ground: "plain" | "storefront" | "none";
  awningColor: number;
}

const AWNINGS = [PALETTE.awningRed, PALETTE.awningBlue, 0x2e8b57, 0xc97b30, 0x7a4ea0];

// Equal-width units spanning exactly `len`, each varied (height/colour/style)
// from the seeded rng so the wall reads as many separate buildings.
function unitSpecs(len: number, target: number, rng: () => number, palette: number[]): UnitSpec[] {
  const n = Math.max(1, Math.round(len / target));
  const w = len / n;
  const out: UnitSpec[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng();
    const style: UnitSpec["style"] = r < 0.16 ? "glassTower" : r < 0.26 ? "darkGlass" : "masonry";
    const isShop = style === "masonry" && rng() < 0.6;
    out.push({
      w,
      stories: 3 + Math.floor(rng() * 5),            // 3..7
      bodyColor: palette[Math.floor(rng() * palette.length)],
      style,
      ground: isShop ? "storefront" : "plain",
      awningColor: AWNINGS[Math.floor(rng() * AWNINGS.length)],
    });
  }
  return out;
}

export interface BlockWallsOpts {
  depth?: number;          // streetwall building depth (front-to-back)
  target?: number;         // approx per-unit frontage
  sides?: Side[];          // which faces to wall (default all four)
}

/**
 * Four `terraceRow` streetwalls wrapping a `size`×`size` block centred at (cx,cz).
 * N/S walls run the full width; E/W walls fill the gap between them. Each wall's
 * outward face sits at the block edge (cz±size/2 etc.), so leave `size` a little
 * under the cell pitch to keep a sidewalk strip clear of the road.
 */
export function blockWalls(
  cx: number, cz: number, size: number, district: string, seed: number,
  opts: BlockWallsOpts = {},
): Placement[] {
  const depth = opts.depth ?? 8;
  const target = opts.target ?? 12;
  const sides: Side[] = opts.sides ?? ["N", "S", "E", "W"];
  const half = size / 2;
  const off = half - depth / 2;                      // wall centreline; front at ±half
  const innerLen = Math.max(0, size - 2 * depth);    // E/W walls fit between N/S walls
  const palette = DISTRICT_PALETTES[district] ?? DISTRICT_PALETTES.east;
  const rng = mulberry32(seed >>> 0);

  const out: Placement[] = [];
  const wall = (x: number, z: number, rot: number, len: number) => {
    if (len <= 0) return;
    const specs = unitSpecs(len, target, rng, palette);
    out.push({
      kind: "terraceRow", x, z, rot,
      params: { units: specs.length, unitSpecs: specs, d: depth, district, anchor: "center", seed },
    });
  };

  if (sides.includes("S")) wall(cx, cz + off, 0, size);    // front faces +z (south)
  if (sides.includes("N")) wall(cx, cz - off, 180, size);  // front faces -z (north)
  if (sides.includes("E")) wall(cx + off, cz, 90, innerLen);  // front faces +x (east)
  if (sides.includes("W")) wall(cx - off, cz, 270, innerLen); // front faces -x (west)
  return out;
}
