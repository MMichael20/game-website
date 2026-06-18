// rishon3d/test/sky.test.ts
import { describe, it, expect } from "vitest";
import { sunDirection, sunPosition, DAY } from "../src/core/sky";

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

describe("DAY", () => {
  it("lowers the sun into the afternoon for readable form (not flat midday)", () => {
    // A grazing-ish afternoon key gives longer soft shadows and directional
    // contrast so voxel forms read, while staying bright and sunny (not dusk).
    expect(DAY.sunElevationDeg).toBeGreaterThanOrEqual(30);
    expect(DAY.sunElevationDeg).toBeLessThanOrEqual(50);
  });
  it("uses ~1.0 exposure (bright, not the dark dusk look)", () => {
    expect(DAY.exposure).toBeGreaterThanOrEqual(0.9);
  });
  it("keeps daytime window glow subtle", () => {
    expect(DAY.windowEmissiveIntensity).toBeLessThan(0.4);
  });
  it("uses a clear, deeply-saturated blue sky (low turbidity, high rayleigh) but stays daytime", () => {
    // Low turbidity -> little white haze at the horizon.
    expect(DAY.turbidity).toBeLessThanOrEqual(2.5);
    expect(DAY.turbidity).toBeGreaterThan(0);
    // Higher rayleigh deepens/saturates the blue; bounded so it does not go
    // navy/dusk (the Sky model goes very dark above ~4).
    expect(DAY.rayleigh).toBeGreaterThanOrEqual(1.5);
    expect(DAY.rayleigh).toBeLessThanOrEqual(3);
  });
});
