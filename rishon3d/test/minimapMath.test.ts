import { describe, it, expect } from "vitest";
import { worldToMinimap, worldRectToMinimap } from "../src/ui/minimapMath";

describe("worldToMinimap", () => {
  it("maps world center to minimap center", () => {
    expect(worldToMinimap(0, 0, 280, 180)).toEqual({ x: 90, y: 90 });
  });
  it("maps the -/- world corner to (0,0)", () => {
    expect(worldToMinimap(-140, -140, 280, 180)).toEqual({ x: 0, y: 0 });
  });
  it("maps the +/+ world corner to (mapPx, mapPx)", () => {
    expect(worldToMinimap(140, 140, 280, 180)).toEqual({ x: 180, y: 180 });
  });
  it("maps world +z downward (larger y)", () => {
    expect(worldToMinimap(0, 70, 280, 180).y).toBeGreaterThan(90);
  });
});

describe("worldRectToMinimap", () => {
  it("returns the top-left corner and scaled size", () => {
    const r = worldRectToMinimap(0, 0, 28, 28, 280, 180);
    // half-extent 14 world units => 9 px; centered => tl at 90-9=81
    expect(r.x).toBeCloseTo(81, 5);
    expect(r.y).toBeCloseTo(81, 5);
    expect(r.w).toBeCloseTo(18, 5);
    expect(r.h).toBeCloseTo(18, 5);
  });
});
