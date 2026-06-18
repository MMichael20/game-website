import type { BuildingDef, RoadDef, PropDef } from "./rishonMap";
import type { DistrictSpec } from "./districts";
import { mulberry32 } from "./rng";

export const ROAD_WIDTH = 6;

export interface DistrictResult {
  buildings: BuildingDef[];
  roads: RoadDef[];
  props: PropDef[];
}

// Lays a uniform street grid over the district and drops a building into the
// centre of each cell, sized to leave a clear road corridor on all sides.
// Deterministic given spec.seed.
export function generateDistrict(spec: DistrictSpec): DistrictResult {
  const rng = mulberry32(spec.seed);
  const half = spec.size / 2;
  const cell = spec.size / spec.blocks;
  const buildings: BuildingDef[] = [];
  const roads: RoadDef[] = [];
  const props: PropDef[] = [];

  for (let i = 0; i <= spec.blocks; i++) {
    const offset = -half + i * cell;
    roads.push({ id: `${spec.id}-rh-${i}`, x: spec.center.x, z: spec.center.z + offset, length: spec.size, horizontal: true });
    roads.push({ id: `${spec.id}-rv-${i}`, x: spec.center.x + offset, z: spec.center.z, length: spec.size, horizontal: false });
  }

  // Largest centered footprint that still leaves a full road corridor + 1u margin.
  const maxFootprint = cell - ROAD_WIDTH - 2;

  for (let gx = 0; gx < spec.blocks; gx++) {
    for (let gz = 0; gz < spec.blocks; gz++) {
      // Consume rng in a fixed order regardless of branches so layout is stable.
      const place = rng();
      const rw = rng();
      const rd = rng();
      const rh = rng();
      const rc = rng();
      const rtree = rng();
      const rbench = rng(); // appended; building layout above is unaffected
      if (place > spec.density || maxFootprint < 3) continue;

      const cx = spec.center.x - half + (gx + 0.5) * cell;
      const cz = spec.center.z - half + (gz + 0.5) * cell;
      const w = 3 + rw * Math.min(maxFootprint - 3, 7);
      const d = 3 + rd * Math.min(maxFootprint - 3, 7);
      const h = spec.minHeight + rh * (spec.maxHeight - spec.minHeight);
      const color = spec.palette[Math.floor(rc * spec.palette.length)] ?? spec.palette[0];
      buildings.push({ id: `${spec.id}-b-${gx}-${gz}`, x: cx, z: cz, width: w, depth: d, height: h, color });

      if (rtree < 0.7) {
        // Tuck a bush/tree against the building, still clear of the corridor.
        const kind = rtree < 0.35 ? "tree" : "bush";
        const ox = (w / 2) + 0.8;
        props.push({ id: `${spec.id}-p-${gx}-${gz}`, kind, x: cx - ox, z: cz });
      }
      if (rbench < 0.18) {
        const oz = (d / 2) + 0.8;
        props.push({ id: `${spec.id}-bench-${gx}-${gz}`, kind: "bench", x: cx, z: cz + oz });
      }
    }
  }

  return { buildings, roads, props };
}
