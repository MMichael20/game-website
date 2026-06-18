import { describe, it, expect } from "vitest";
import { formatSpeed } from "../src/ui/format";

describe("formatSpeed", () => {
  it("converts m/s to rounded km/h", () => {
    expect(formatSpeed(10)).toBe("36 km/h");
  });
  it("shows zero at rest", () => {
    expect(formatSpeed(0)).toBe("0 km/h");
  });
  it("clamps negative speed to zero", () => {
    expect(formatSpeed(-5)).toBe("0 km/h");
  });
  it("guards NaN to zero", () => {
    expect(formatSpeed(NaN)).toBe("0 km/h");
  });
});
