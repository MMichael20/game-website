import { describe, it, expect } from "vitest";
import { accumulateSteps } from "../src/core/timestep";

describe("accumulateSteps", () => {
  const STEP = 1 / 60;
  it("returns whole steps and carries remainder", () => {
    const r = accumulateSteps(0, STEP * 2.5, STEP, 5);
    expect(r.steps).toBe(2);
    expect(r.remainder).toBeCloseTo(STEP * 0.5, 6);
  });
  it("accumulates carry across calls", () => {
    const r = accumulateSteps(STEP * 0.8, STEP * 0.5, STEP, 5);
    expect(r.steps).toBe(1);
    expect(r.remainder).toBeCloseTo(STEP * 0.3, 6);
  });
  it("clamps to maxSteps to avoid spiral of death", () => {
    const r = accumulateSteps(0, STEP * 100, STEP, 5);
    expect(r.steps).toBe(5);
    expect(r.remainder).toBeLessThan(STEP);
  });
  it("takes no step when under the threshold", () => {
    const r = accumulateSteps(0, STEP * 0.4, STEP, 5);
    expect(r.steps).toBe(0);
    expect(r.remainder).toBeCloseTo(STEP * 0.4, 6);
  });
});
