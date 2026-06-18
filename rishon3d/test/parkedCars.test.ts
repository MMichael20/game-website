import { describe, it, expect } from "vitest";
import { planParkedCars } from "../src/world/parkedCars";
import type { RishonMap } from "../src/world/rishonMap";

const map: RishonMap = {
  ground: { size: 280 },
  roads: [
    { id: "h", x: 0, z: 0, length: 120, horizontal: true },
    { id: "v", x: 0, z: 0, length: 120, horizontal: false },
  ],
  buildings: [{ id: "b", x: 20, z: 20, width: 10, depth: 10, height: 8, color: 0x888888 }],
  props: [],
  npcSpawns: [],
  carSpawn: { x: 0, z: 0 },
  playerSpawn: { x: 0, z: 0 },
};

describe("planParkedCars", () => {
  it("respects the max cap", () => {
    expect(planParkedCars(map, 7, 10).length).toBeLessThanOrEqual(10);
  });
  it("keeps cars in bounds and out of buildings", () => {
    const half = map.ground.size / 2;
    const rects = [{ minX: 15, maxX: 25, minZ: 15, maxZ: 25 }];
    for (const p of planParkedCars(map, 7, 40)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(half);
      const inBuilding = p.x >= rects[0].minX && p.x <= rects[0].maxX && p.z >= rects[0].minZ && p.z <= rects[0].maxZ;
      expect(inBuilding).toBe(false);
    }
  });
  it("is deterministic for a seed", () => {
    expect(planParkedCars(map, 7, 40)).toEqual(planParkedCars(map, 7, 40));
  });
});
