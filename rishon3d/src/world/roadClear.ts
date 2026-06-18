import type { RoadDef, PropDef } from "./rishonMap";
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
