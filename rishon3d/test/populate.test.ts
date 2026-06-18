import { describe, it, expect } from "vitest";
import { planPopulations, type PopulationBudget } from "../src/game/populate";
import { assembleMap } from "../src/world/worldData";
import { buildingRects, pointInRects } from "../src/game/wander";

const map = assembleMap();
const budget: PopulationBudget = { pedestrians: 20, cats: 6, dogs: 6 };

describe("planPopulations", () => {
  it("respects the budget caps", () => {
    const p = planPopulations(map, 5, budget);
    expect(p.pedestrians.length).toBeLessThanOrEqual(20);
    expect(p.cats.length).toBeLessThanOrEqual(6);
    expect(p.dogs.length).toBeLessThanOrEqual(6);
  });

  it("is deterministic for a seed", () => {
    const a = planPopulations(map, 5, budget);
    const b = planPopulations(map, 5, budget);
    expect(a.pedestrians).toEqual(b.pedestrians);
    expect(a.carRoutes.length).toBe(b.carRoutes.length);
  });

  it("keeps spawned agents within ground bounds", () => {
    const half = map.ground.size / 2;
    const all = planPopulations(map, 5, budget);
    for (const v of [...all.pedestrians, ...all.cats, ...all.dogs]) {
      expect(Math.abs(v.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(v.z)).toBeLessThanOrEqual(half);
    }
  });

  it("produces at least one car route with multiple waypoints", () => {
    const p = planPopulations(map, 5, budget);
    expect(p.carRoutes.length).toBeGreaterThan(0);
    expect(p.carRoutes[0].length).toBeGreaterThanOrEqual(4);
  });

  it("no pedestrian/cat/dog spawns inside building footprints", () => {
    const p = planPopulations(map, 42, budget);
    const rects = buildingRects(map.buildings, 0);
    for (const v of [...p.pedestrians, ...p.cats, ...p.dogs]) {
      expect(pointInRects(v, rects)).toBe(false);
    }
  });
});
