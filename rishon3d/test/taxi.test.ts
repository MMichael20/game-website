import { describe, it, expect } from "vitest";
import { nextTaxiPhase, stepToward } from "../src/game/taxi";

describe("nextTaxiPhase", () => {
  it("advances through the ride loop", () => {
    expect(nextTaxiPhase("idle", "call")).toBe("toPickup");
    expect(nextTaxiPhase("toPickup", "arrivedPickup")).toBe("waiting");
    expect(nextTaxiPhase("waiting", "ride")).toBe("toDropoff");
    expect(nextTaxiPhase("toDropoff", "arrivedDropoff")).toBe("idle");
  });
  it("ignores irrelevant events (stays in phase)", () => {
    expect(nextTaxiPhase("idle", "ride")).toBe("idle");
    expect(nextTaxiPhase("toPickup", "call")).toBe("toPickup");
    expect(nextTaxiPhase("toDropoff", "call")).toBe("toDropoff");
  });
});

describe("stepToward", () => {
  it("moves toward the target and is not yet arrived when far", () => {
    const r = stepToward({ x: 0, z: 0 }, 0, { x: 0, z: 10 }, 5, 0.1, 3);
    expect(r.arrived).toBe(false);
    expect(r.pos.z).toBeGreaterThan(0); // moved toward +z
  });
  it("reports arrived and holds position within the arrive radius", () => {
    const r = stepToward({ x: 0, z: 0 }, 0, { x: 0, z: 1 }, 5, 0.1, 3);
    expect(r.arrived).toBe(true);
    expect(r.pos).toEqual({ x: 0, z: 0 });
  });
  it("never overshoots the target in one step", () => {
    const r = stepToward({ x: 0, z: 0 }, 0, { x: 0, z: 4 }, 100, 1, 100);
    expect(r.pos.z).toBeLessThanOrEqual(4 + 1e-9);
  });
});
