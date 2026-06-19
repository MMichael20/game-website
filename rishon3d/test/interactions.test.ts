import { describe, it, expect } from "vitest";
import { nearestPoi, poiPrompt } from "../src/game/interactions";
import { POIS } from "../src/world/locations";

describe("nearestPoi", () => {
  it("returns null when the player is far from every location", () => {
    expect(nearestPoi({ x: -200, z: -200 })).toBeNull();
  });

  it("detects a POI when the player stands on it", () => {
    const taxi = POIS.find((p) => p.kind === "taxi")!;
    const here = nearestPoi({ x: taxi.x, z: taxi.z });
    expect(here?.kind).toBe("taxi");
  });

  it("resolves overlapping zones to the nearest POI", () => {
    const a = POIS[0];
    // a point just inside a's radius, biased toward a's center
    const near = nearestPoi({ x: a.x + 0.1, z: a.z });
    expect(near?.id).toBe(a.id);
  });

  it("returns null just outside a POI radius", () => {
    const p = POIS[0];
    expect(nearestPoi({ x: p.x + p.r + 0.5, z: p.z })).toBeNull();
  });
});

describe("poiPrompt", () => {
  it("gives a walk-in prompt for the restaurant and a label otherwise", () => {
    const r = POIS.find((p) => p.kind === "restaurant")!;
    expect(poiPrompt(r).toLowerCase()).toContain("walk in");
    const park = POIS.find((p) => p.kind === "park")!;
    expect(poiPrompt(park).length).toBeGreaterThan(0);
  });
});
