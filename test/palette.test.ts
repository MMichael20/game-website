// rishon3d/test/palette.test.ts
import { describe, it, expect } from "vitest";
import { PALETTE, BUILDING_COLORS, DISTRICT_PALETTES, isHexColor } from "../src/world/palette";

describe("palette", () => {
  it("exposes valid hex colors for every named entry", () => {
    for (const v of Object.values(PALETTE)) expect(isHexColor(v)).toBe(true);
  });
  it("provides a non-trivial saturated building color set", () => {
    expect(BUILDING_COLORS.length).toBeGreaterThanOrEqual(6);
    for (const c of BUILDING_COLORS) expect(isHexColor(c)).toBe(true);
  });
  it("has a palette for each of the four districts", () => {
    for (const id of ["north", "east", "south", "west"]) {
      expect(DISTRICT_PALETTES[id].length).toBeGreaterThanOrEqual(3);
      for (const c of DISTRICT_PALETTES[id]) expect(isHexColor(c)).toBe(true);
    }
  });
});
