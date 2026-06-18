import type { RoadDef, PropDef, BuildingDef } from "./rishonMap";
import { type Rect, pointInRects } from "../game/wander";
import { ROAD_W } from "./roads";

// Each road as a corridor rect: half-width = ROAD_W/2 + margin along the short axis,
// full length along the long axis.
export function roadRects(roads: RoadDef[], margin: number): Rect[] {
  const halfW = ROAD_W / 2 + margin;
  return roads.map((r) =>
    r.horizontal
      ? { minX: r.x - r.length / 2, maxX: r.x + r.length / 2, minZ: r.z - halfW, maxZ: r.z + halfW }
      : { minX: r.x - halfW, maxX: r.x + halfW, minZ: r.z - r.length / 2, maxZ: r.z + r.length / 2 },
  );
}

// Drops trees/bushes/benches sitting in a road corridor. Streetlights are kept
// (they belong at road edges).
export function filterPropsOffRoads(props: PropDef[], roads: RoadDef[], margin: number): PropDef[] {
  const rects = roadRects(roads, margin);
  return props.filter((p) => p.kind === "streetlight" || !pointInRects({ x: p.x, z: p.z }, rects));
}

// Axis-aligned bounding-box overlap.
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

// Drops any building whose footprint (+buildingMargin) overlaps a road corridor
// (roadRects at roadMargin). Guarantees no building sits on a road.
export function filterBuildingsOffRoads(
  buildings: BuildingDef[], roads: RoadDef[], roadMargin: number, buildingMargin: number,
): BuildingDef[] {
  const rrects = roadRects(roads, roadMargin);
  return buildings.filter((b) => {
    const br: Rect = {
      minX: b.x - b.width / 2 - buildingMargin,
      maxX: b.x + b.width / 2 + buildingMargin,
      minZ: b.z - b.depth / 2 - buildingMargin,
      maxZ: b.z + b.depth / 2 + buildingMargin,
    };
    return !rrects.some((r) => rectsOverlap(br, r));
  });
}
