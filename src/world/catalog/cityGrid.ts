// src/world/catalog/cityGrid.ts
//
// A connected road grid: horizontal roads at z=k*pitch and vertical at x=k*pitch
// for k in [-half, half]. Reuses makeRoadNetwork (asphalt + paver sidewalks +
// curbs + crosswalks/markings). The central H/V roads are named "main-h"/"cross-v"
// so the existing system paints them as core arterials (crosswalks, double-yellow,
// stop bars, lane arrows at the central junction). Visual only — no colliders, so
// the roads/sidewalks are drivable and walkable (the `ground` object owns the floor
// collider).

import { defineObject } from "../system/registry";
import { makeRoadNetwork } from "../roads";
import type { RoadDef } from "../rishonMap";

interface CityGridParams { pitch: number; half: number; length: number; seed: number }

defineObject("cityGrid", {
  params: { pitch: 56, half: 1, length: 140, seed: 1 } as CityGridParams,
  build(p: CityGridParams) {
    const roads: RoadDef[] = [];
    for (let k = -p.half; k <= p.half; k++) {
      const off = k * p.pitch;
      roads.push({ id: off === 0 ? "main-h" : `h${k}`, x: 0, z: off, length: p.length, horizontal: true });
      roads.push({ id: off === 0 ? "cross-v" : `v${k}`, x: off, z: 0, length: p.length, horizontal: false });
    }
    return { mesh: makeRoadNetwork(roads) };
  },
});
