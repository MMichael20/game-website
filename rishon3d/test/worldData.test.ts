import { describe, it, expect } from "vitest";
import { assembleMap, DISTRICTS } from "../src/world/worldData";
import { validateMap } from "../src/world/rishonMap";

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
});
