import { describe, it, expect } from "vitest";
import { mulberry32 } from "../src/world/rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("different seeds diverge", () => {
    const a = mulberry32(1), b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
  it("stays within [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
