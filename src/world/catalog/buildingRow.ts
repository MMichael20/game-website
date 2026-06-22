// src/world/catalog/buildingRow.ts
//
// A row of N FREESTANDING backdrop buildings spaced along +x with a gap between
// them (contrast terraceRow, which butts units edge-to-edge). Reuses
// fillerBuilding. Each unit's center x is the running sum of prior (width+gap)
// — derived, never a magic offset (PITFALL 3). Fronts face +z. Deterministic.
//
// LOCAL space: origin set by `anchor` (center/left/right edge of the whole run),
// base y=0, FRONT +z, ~1u=1m.

import * as THREE from "three";
import { defineObject, buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import { DISTRICT_PALETTES, PALETTE } from "../palette";
import { mulberry32 } from "../rng";
import type { ObjectResult, Box, Rect } from "../system/types";

type Axis = "+z" | "-z" | "+x" | "-x";

function compose(parts: ObjectResult[]): ObjectResult {
  const group = new THREE.Group();
  const colliders: Box[] = [];
  const obstacles: Rect[] = [];
  for (const p of parts) {
    group.add(p.mesh);
    if (p.colliders) colliders.push(...p.colliders);
    if (p.obstacles) obstacles.push(...p.obstacles);
  }
  return { mesh: group, colliders, obstacles };
}

interface UnitSpec {
  w: number; stories: number; bodyColor: number;
  style: "masonry" | "glassTower" | "darkGlass";
  ground: "plain" | "storefront";
  awningColor: number;
}

interface RowParams {
  units: number;
  gap: number;
  d: number;
  storyH: number;
  district: string;
  anchor: "center" | "left" | "right";
  faces: Axis[];
  seed: number;
}

const AWNINGS = [PALETTE.awningRed, PALETTE.awningBlue, 0x2e8b57, 0xc97b30, 0x7a4ea0];

function genUnit(rng: () => number, palette: number[]): UnitSpec {
  const w = 10 + Math.floor(rng() * 6);            // 10..15
  const stories = 3 + Math.floor(rng() * 5);       // 3..7
  const bodyColor = palette[Math.floor(rng() * palette.length)];
  const r = rng();
  const style: UnitSpec["style"] = r < 0.18 ? "glassTower" : r < 0.30 ? "darkGlass" : "masonry";
  const isShop = style === "masonry" && rng() < 0.6;
  return { w, stories, bodyColor, style, ground: isShop ? "storefront" : "plain", awningColor: AWNINGS[Math.floor(rng() * AWNINGS.length)] };
}

defineObject("buildingRow", {
  params: { units: 5, gap: 1.5, d: 12, storyH: 3.0, district: "north", anchor: "center", faces: ["+z", "+x", "-x"] as Axis[], seed: 1 } as RowParams,
  build(p: RowParams) {
    const rng = mulberry32(p.seed >>> 0);
    const palette = DISTRICT_PALETTES[p.district] ?? DISTRICT_PALETTES.east;
    const specs: UnitSpec[] = Array.from({ length: p.units }, () => genUnit(rng, palette));

    // Total run width = sum of widths + gaps between (units-1 gaps).
    const totalW = specs.reduce((s, u) => s + u.w, 0) + p.gap * Math.max(0, specs.length - 1);
    const leftEdge = p.anchor === "center" ? -totalW / 2 : p.anchor === "left" ? 0 : -totalW;

    const parts: ObjectResult[] = [];
    let cursor = leftEdge;
    specs.forEach((u, i) => {
      const cx = cursor + u.w / 2;
      cursor += u.w + p.gap;
      const unit = buildObject("fillerBuilding", {
        w: u.w, d: p.d, stories: u.stories, storyH: p.storyH,
        bodyColor: u.bodyColor, style: u.style, ground: u.ground,
        awningColor: u.awningColor, roofUnit: true, faces: p.faces, seed: p.seed + i + 1,
      });
      parts.push(applyTransform(unit, { x: cx, z: 0, rot: 0 }));
    });
    return compose(parts);
  },
});
