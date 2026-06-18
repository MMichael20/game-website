// rishon3d/test/builders.test.ts
import { describe, it, expect } from "vitest";
import { awningStyle } from "../src/world/builders";
import { PALETTE } from "../src/world/palette";

describe("awningStyle", () => {
  it("is deterministic for a given building id", () => {
    expect(awningStyle("b3")).toEqual(awningStyle("b3"));
  });
  it("chooses red or blue when shown", () => {
    for (const id of ["b1", "b2", "b3", "b4", "b5", "north-b-0-1"]) {
      const a = awningStyle(id);
      if (a.show) expect([PALETTE.awningRed, PALETTE.awningBlue]).toContain(a.color);
    }
  });
  it("shows awnings on a meaningful fraction of buildings", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `b-${i}`);
    const shown = ids.filter((id) => awningStyle(id).show).length;
    expect(shown).toBeGreaterThan(40);
    expect(shown).toBeLessThan(160);
  });
});
