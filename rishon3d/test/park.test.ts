import { describe, it, expect } from "vitest";
import { parkProps, PARK } from "../src/world/park";

describe("parkProps", () => {
  it("produces a fixed set of trees and benches", () => {
    const p = parkProps();
    expect(p.filter((x) => x.kind === "tree").length).toBe(18);
    expect(p.filter((x) => x.kind === "bench").length).toBe(6);
  });
  it("keeps everything inside the park footprint", () => {
    const half = PARK.size / 2;
    for (const x of parkProps()) {
      expect(Math.abs(x.x - PARK.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(x.z - PARK.z)).toBeLessThanOrEqual(half);
    }
  });
  it("is deterministic", () => {
    expect(parkProps(99)).toEqual(parkProps(99));
  });
});
