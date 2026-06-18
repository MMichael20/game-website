// rishon3d/test/rail.test.ts
import { describe, it, expect } from "vitest";
import { pillarZs, makeRail } from "../src/world/rail";

describe("pillarZs", () => {
  it("spaces pillars symmetrically along the deck", () => {
    const zs = pillarZs(260, 20);
    expect(zs.length).toBeGreaterThan(5);
    const sum = zs.reduce((a, b) => a + b, 0);
    expect(sum / zs.length).toBeCloseTo(0, 6); // centered on 0
    for (const z of zs) expect(Math.abs(z)).toBeLessThanOrEqual(130);
  });
});

describe("makeRail", () => {
  it("returns an object placed clear of the districts (|x| > 125)", () => {
    const rail = makeRail();
    expect(Math.abs(rail.position.x)).toBeGreaterThan(125);
    expect(rail.children.length).toBeGreaterThanOrEqual(2); // deck + pillars (+rails)
  });
});
