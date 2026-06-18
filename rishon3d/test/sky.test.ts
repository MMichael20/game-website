import { describe, it, expect } from "vitest";
import { sunDirection, sunPosition, DUSK } from "../src/core/sky";

describe("sunDirection", () => {
  it("points east at azimuth 90, horizon elevation", () => {
    const v = sunDirection(0, 90);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it("points north (+Z) at azimuth 0, horizon elevation", () => {
    const v = sunDirection(0, 0);
    expect(v.z).toBeCloseTo(1, 5);
    expect(v.x).toBeCloseTo(0, 5);
  });

  it("points straight up at elevation 90", () => {
    const v = sunDirection(90, 123);
    expect(v.y).toBeCloseTo(1, 5);
  });

  it("returns a unit vector", () => {
    const v = sunDirection(33, 217);
    expect(v.length()).toBeCloseTo(1, 6);
  });
});

describe("sunPosition", () => {
  it("scales the sun direction by distance", () => {
    const p = sunPosition(100);
    expect(p.length()).toBeCloseTo(100, 4);
  });
});

describe("DUSK", () => {
  it("keeps the sun low but above the horizon (golden hour)", () => {
    expect(DUSK.sunElevationDeg).toBeGreaterThan(0);
    expect(DUSK.sunElevationDeg).toBeLessThan(15);
  });
  it("uses sub-1 exposure so it reads a bit dark", () => {
    expect(DUSK.exposure).toBeGreaterThan(0);
    expect(DUSK.exposure).toBeLessThan(1);
  });
});
