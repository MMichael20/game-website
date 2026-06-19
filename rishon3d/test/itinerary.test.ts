import { describe, it, expect } from "vitest";
import { buildItinerary, ACTIVITIES } from "../src/game/itinerary";
import { makePatron, stepPatron } from "../src/game/patronRoutine";

describe("buildItinerary", () => {
  it("is deterministic for a given seed", () => {
    const a = buildItinerary(42);
    const b = buildItinerary(42);
    expect(a.activities).toEqual(b.activities);
    expect(a.waypoints).toEqual(b.waypoints);
    expect(a.speed).toBeCloseTo(b.speed, 9);
  });

  it("produces different routines for different seeds", () => {
    const seeds = [1, 2, 3, 4, 5].map((s) => buildItinerary(s).activities.join(">"));
    const distinct = new Set(seeds);
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("chains at least two distinct activities per NPC", () => {
    for (let s = 0; s < 20; s++) {
      const it = buildItinerary(100 + s);
      expect(new Set(it.activities).size).toBeGreaterThanOrEqual(2);
      expect(it.waypoints.length).toBeGreaterThan(4);
    }
  });

  it("only ever names real activities and rolls a sane speed", () => {
    const names = new Set(ACTIVITIES.map((a) => a.name));
    for (let s = 0; s < 20; s++) {
      const it = buildItinerary(7 * s + 1);
      for (const n of it.activities) expect(names.has(n)).toBe(true);
      expect(it.speed).toBeGreaterThanOrEqual(1.4);
      expect(it.speed).toBeLessThanOrEqual(2.0);
    }
  });

  it("emits only finite waypoint coordinates", () => {
    for (let s = 0; s < 30; s++) {
      for (const w of buildItinerary(s).waypoints) {
        expect(Number.isFinite(w.to.x)).toBe(true);
        expect(Number.isFinite(w.to.z)).toBe(true);
        expect(w.dwell).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("drives a looping patron that never finishes and sits when its routine has a sit-down", () => {
    const sitters = new Set(["dineRestaurant", "outdoorDine", "visitPark"]);
    let seed = 0;
    while (seed < 1000 && !buildItinerary(seed).activities.some((a) => sitters.has(a))) seed++;
    const it = buildItinerary(seed);
    const p = makePatron(it.waypoints, it.speed, { loop: true });
    let satOnce = false;
    for (let i = 0; i < 300 * 60; i++) {
      stepPatron(p, 1 / 60);
      if (p.seated) satOnce = true;
    }
    expect(p.done).toBe(false);
    expect(satOnce).toBe(true);
  });
});
