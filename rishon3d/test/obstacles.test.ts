import { describe, it, expect } from "vitest";
import { PATRON_OBSTACLES, resolveObstacles } from "../src/world/obstacles";
import { HOUSE, HOUSE_DOOR, TAXI_WAIT, PARK_BENCH, RESTAURANTS, SHOP_Z } from "../src/world/districtPois";

const inside = (p: { x: number; z: number }) =>
  PATRON_OBSTACLES.some((r) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ);

describe("patron obstacles", () => {
  it("declares a non-empty solid obstacle set", () => {
    expect(PATRON_OBSTACLES.length).toBeGreaterThan(0);
  });

  it("pushes a point inside the house out to its edge", () => {
    const p = { x: HOUSE.x, z: HOUSE.z }; // dead center of the house
    resolveObstacles(p);
    expect(inside(p)).toBe(false);
  });

  it("leaves a point in the open clear of obstacles unchanged", () => {
    const p = { x: 95, z: 105 }; // promenade lane — clear of every solid
    const before = { ...p };
    resolveObstacles(p);
    expect(p).toEqual(before);
  });

  it("keeps patron route targets near solids reachable (not inside an obstacle)", () => {
    // goHome -> HOUSE_DOOR, waitTaxi -> TAXI_WAIT, visitPark -> PARK_BENCH must all
    // sit OUTSIDE the obstacle set, or patrons would get stuck pushing against them.
    for (const t of [HOUSE_DOOR, TAXI_WAIT, PARK_BENCH]) {
      expect(inside(t)).toBe(false);
    }
  });

  it("does NOT block the open restaurant's interior (patrons enter via the door)", () => {
    const open = RESTAURANTS.find((r) => r.open)!;
    const interior = { x: open.x, z: SHOP_Z }; // inside the open shell
    expect(inside(interior)).toBe(false);
  });
});
