import { describe, it, expect } from "vitest";
import { inRange } from "../src/game/culling";

describe("inRange", () => {
  it("true when within radius", () => {
    expect(inRange(3, 4, 5)).toBe(true);   // dist 5 == radius
    expect(inRange(1, 1, 5)).toBe(true);
  });
  it("false when outside radius", () => {
    expect(inRange(10, 0, 5)).toBe(false);
    expect(inRange(4, 4, 5)).toBe(false);  // dist ~5.66
  });
});
