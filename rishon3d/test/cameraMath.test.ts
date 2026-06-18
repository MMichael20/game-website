import { describe, it, expect } from "vitest";
import { cameraOffset, clampPitch } from "../src/core/cameraMath";

describe("cameraMath", () => {
  it("cameraOffset behind target at yaw0/pitch0 is +Z at full distance", () => {
    const o = cameraOffset(0, 0, 10);
    expect(o.x).toBeCloseTo(0);
    expect(o.y).toBeCloseTo(0);
    expect(o.z).toBeCloseTo(10);
  });
  it("cameraOffset raises Y with pitch", () => {
    const o = cameraOffset(0, Math.PI / 6, 10); // sin30 = 0.5
    expect(o.y).toBeCloseTo(5);
    expect(o.z).toBeCloseTo(Math.cos(Math.PI / 6) * 10);
  });
  it("cameraOffset yaw rotates around target on XZ", () => {
    const o = cameraOffset(Math.PI / 2, 0, 10);
    expect(o.x).toBeCloseTo(10);
    expect(o.z).toBeCloseTo(0);
  });
  it("clampPitch keeps camera above ground and below top-down", () => {
    expect(clampPitch(-5)).toBeCloseTo(0.15);
    expect(clampPitch(5)).toBeCloseTo(1.3);
    expect(clampPitch(0.5)).toBeCloseTo(0.5);
  });
});
