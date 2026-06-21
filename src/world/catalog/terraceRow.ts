// src/world/catalog/terraceRow.ts
//
// A continuous streetwall: N fillerBuilding units butted edge-to-edge sharing
// party walls. Each unit's x is derived from the running sum of prior widths
// (no magic offsets). Units share one depth so front/back lines are flush.
// Interior units render front-only; the two ends add their exposed outer side.
//
// LOCAL space: origin set by `anchor` (center/left/right edge), base y=0,
// FRONT +z, ~1u=1m. Deterministic.

import * as THREE from "three";
import { defineObject, buildObject } from "../system/registry";
import { applyTransform } from "../system/transform";
import { DISTRICT_PALETTES, PALETTE } from "../palette";
import { mulberry32 } from "../rng";
import type { ObjectResult, Box, Rect } from "../system/types";

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
  w: number;
  stories: number;
  bodyColor: number;
  style: "masonry" | "glassTower" | "darkGlass";
  ground: "plain" | "storefront" | "none";
  awningColor: number;
}

interface TerraceParams {
  units: number;
  unitSpecs?: UnitSpec[];
  d: number;
  storyH: number;
  district: string;
  anchor: "center" | "left" | "right";
  seed: number;
}

const AWNINGS = [PALETTE.awningRed, PALETTE.awningBlue, 0x2e8b57, 0xc97b30, 0x7a4ea0];

// Derive a varied unit deterministically from the rng + district palette.
function genUnit(rng: () => number, palette: number[]): UnitSpec {
  const w = 9 + Math.floor(rng() * 6);            // 9..14
  const stories = 3 + Math.floor(rng() * 4);      // 3..6
  const bodyColor = palette[Math.floor(rng() * palette.length)];
  const style: UnitSpec["style"] = rng() < 1 / 7 ? "glassTower" : "masonry";
  const isShop = style === "masonry" && rng() < 0.7;
  return {
    w, stories, bodyColor, style,
    ground: isShop ? "storefront" : "plain",
    awningColor: AWNINGS[Math.floor(rng() * AWNINGS.length)],
  };
}

defineObject("terraceRow", {
  params: { units: 5, d: 11, storyH: 3.0, district: "east", anchor: "center", seed: 1 } as TerraceParams,
  build(p: TerraceParams) {
    const rng = mulberry32(p.seed >>> 0);
    const palette = DISTRICT_PALETTES[p.district] ?? DISTRICT_PALETTES.east;

    const specs: UnitSpec[] = p.unitSpecs ?? Array.from({ length: p.units }, () => genUnit(rng, palette));
    const totalW = specs.reduce((s, u) => s + u.w, 0);

    // Origin offset: where the row's left edge sits relative to local x=0.
    const leftEdge = p.anchor === "center" ? -totalW / 2 : p.anchor === "left" ? 0 : -totalW;

    const parts: ObjectResult[] = [];
    let cursor = leftEdge;
    specs.forEach((u, i) => {
      const cx = cursor + u.w / 2;
      cursor += u.w;
      const isFirst = i === 0;
      const isLast = i === specs.length - 1;
      const faces =
        specs.length === 1 ? ["+z", "+x", "-x"]
        : isFirst ? ["+z", "-x"]
        : isLast ? ["+z", "+x"]
        : ["+z"];
      const unit = buildObject("fillerBuilding", {
        w: u.w, d: p.d, stories: u.stories, storyH: p.storyH,
        bodyColor: u.bodyColor, style: u.style, ground: u.ground,
        awningColor: u.awningColor, roofUnit: true, faces, seed: p.seed + i + 1,
      });
      parts.push(applyTransform(unit, { x: cx, z: 0, rot: 0 }));
    });

    return compose(parts);
  },
});
