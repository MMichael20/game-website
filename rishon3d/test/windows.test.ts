import { describe, it, expect } from "vitest";
import { windowPattern } from "../src/world/windows";

describe("windowPattern", () => {
  it("produces RGBA data of length cols*rows*4", () => {
    const d = windowPattern(8, 8, 1);
    expect(d.length).toBe(8 * 8 * 4);
  });

  it("is deterministic for a seed", () => {
    expect(Array.from(windowPattern(6, 6, 42))).toEqual(Array.from(windowPattern(6, 6, 42)));
  });

  it("lights some windows but not all (alpha always opaque)", () => {
    const d = windowPattern(10, 10, 7);
    let lit = 0;
    for (let i = 0; i < 100; i++) {
      expect(d[i * 4 + 3]).toBe(255); // opaque
      if (d[i * 4] > 200) lit++; // warm-lit pixels have high red
    }
    expect(lit).toBeGreaterThan(0);
    expect(lit).toBeLessThan(100);
  });
});
