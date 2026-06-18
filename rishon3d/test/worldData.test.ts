import { describe, it, expect } from "vitest";
import { assembleMap, DISTRICTS } from "../src/world/worldData";
import { validateMap } from "../src/world/rishonMap";
import { roadRects, rectsOverlap } from "../src/world/roadClear";
import { pointInRects } from "../src/game/wander";

describe("assembleMap", () => {
  const map = assembleMap();

  it("validates cleanly (one house, spawns in bounds, no spawn in a building)", () => {
    expect(validateMap(map)).toEqual([]);
  });

  it("has exactly one house (only the core district)", () => {
    expect(map.buildings.filter((b) => b.isHouse).length).toBe(1);
  });

  it("adds district buildings on top of the core", () => {
    // core has 8 buildings; districts add many more
    expect(map.buildings.length).toBeGreaterThan(20);
  });

  it("gives every building a unique id across districts", () => {
    const ids = map.buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps all buildings within the (larger) ground bounds", () => {
    const half = map.ground.size / 2;
    for (const b of map.buildings) {
      expect(Math.abs(b.x) + b.width / 2).toBeLessThanOrEqual(half);
      expect(Math.abs(b.z) + b.depth / 2).toBeLessThanOrEqual(half);
    }
  });

  it("declares at least three districts", () => {
    expect(DISTRICTS.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps every building off every road", () => {
    const corridors = roadRects(map.roads, 0); // the actual road surfaces
    const onRoad = map.buildings.filter((b) => {
      const br = {
        minX: b.x - b.width / 2, maxX: b.x + b.width / 2,
        minZ: b.z - b.depth / 2, maxZ: b.z + b.depth / 2,
      };
      return corridors.some((r) => rectsOverlap(br, r));
    });
    expect(onRoad).toEqual([]);
  });

  it("keeps trees/bushes/benches out of road corridors", () => {
    const corridors = roadRects(map.roads, 1.5);
    const onRoad = map.props.filter(
      (p) => p.kind !== "streetlight" && pointInRects({ x: p.x, z: p.z }, corridors),
    );
    expect(onRoad).toEqual([]);
  });
});
