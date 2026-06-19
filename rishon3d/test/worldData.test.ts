import { describe, it, expect } from "vitest";
import { assembleMap, RISHON_MAP } from "../src/world/worldData";
import { validateMap } from "../src/world/rishonMap";
import { roadRects, rectsOverlap } from "../src/world/roadClear";

// V1 COMPACT MAP. assembleMap no longer layers a procedural city / districts /
// arterials on top of a core; it returns the small framed block (one house + one
// decorative street). These assertions pin that compact shape.
describe("assembleMap (V1 compact block)", () => {
  const map = assembleMap();

  it("validates cleanly (one house, spawns in bounds, no spawn in a building)", () => {
    expect(validateMap(map)).toEqual([]);
  });

  it("has exactly one house (the player home)", () => {
    expect(map.buildings.filter((b) => b.isHouse).length).toBe(1);
  });

  it("is a compact block framed off the world origin", () => {
    expect(map.ground.size).toBeLessThanOrEqual(140);
    expect(map.ground.center).toBeTruthy();
  });

  it("gives every building a unique id", () => {
    const ids = map.buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps all buildings within the framed ground bounds", () => {
    const half = map.ground.size / 2;
    const c = map.ground.center ?? { x: 0, z: 0 };
    for (const b of map.buildings) {
      expect(Math.abs(b.x - c.x) + b.width / 2).toBeLessThanOrEqual(half);
      expect(Math.abs(b.z - c.z) + b.depth / 2).toBeLessThanOrEqual(half);
    }
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

  it("exports the assembled singleton", () => {
    expect(RISHON_MAP.buildings.length).toBe(map.buildings.length);
    expect(RISHON_MAP.ground.size).toBe(map.ground.size);
  });
});
