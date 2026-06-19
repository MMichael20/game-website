import { describe, it, expect } from "vitest";
import { CORE_MAP as RISHON_MAP, validateMap } from "../src/world/rishonMap";
import {
  OFFICE, CAFE, EAST_CROSS_X, EAST_CROSS,
} from "../src/world/districtPois";

describe("RISHON_MAP", () => {
  it("is valid", () => {
    expect(validateMap(RISHON_MAP)).toEqual([]);
  });
  it("is framed at the grown bounds (size 160, center (108,104))", () => {
    expect(RISHON_MAP.ground.size).toBe(160);
    expect(RISHON_MAP.ground.center).toEqual({ x: 108, z: 104 });
  });
  it("carries the east cross street as a south-running RoadDef", () => {
    const xc = RISHON_MAP.roads.find((r) => r.id === "east-cross");
    expect(xc).toEqual({ id: "east-cross", x: 128, z: 112, length: 40, horizontal: false });
    // mirrors the EAST_CROSS districtPois anchor (kept in sync as a literal).
    expect(xc!.x).toBe(EAST_CROSS_X);
    expect(xc).toEqual(EAST_CROSS);
  });
  it("keeps the decorative hero street with an explicit id", () => {
    expect(RISHON_MAP.roads.some((r) => r.id === "hero-street" || r.id === "street")).toBe(true);
  });
  it("fits the office tower + cafe footprints inside the framed bounds", () => {
    const half = RISHON_MAP.ground.size / 2;
    const c = RISHON_MAP.ground.center ?? { x: 0, z: 0 };
    for (const f of [
      { x: OFFICE.x, z: OFFICE.z, w: OFFICE.w, d: OFFICE.d },
      { x: CAFE.x, z: CAFE.z, w: CAFE.w, d: CAFE.d },
    ]) {
      expect(Math.abs(f.x - c.x) + f.w / 2).toBeLessThanOrEqual(half);
      expect(Math.abs(f.z - c.z) + f.d / 2).toBeLessThanOrEqual(half);
    }
  });
  it("has unique building ids", () => {
    const ids = RISHON_MAP.buildings.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("has exactly one house", () => {
    expect(RISHON_MAP.buildings.filter((b) => b.isHouse).length).toBe(1);
  });
  it("keeps spawns inside the framed ground bounds", () => {
    const half = RISHON_MAP.ground.size / 2;
    const c = RISHON_MAP.ground.center ?? { x: 0, z: 0 };
    for (const s of [RISHON_MAP.carSpawn, RISHON_MAP.playerSpawn, ...RISHON_MAP.npcSpawns]) {
      expect(Math.abs(s.x - c.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(s.z - c.z)).toBeLessThanOrEqual(half);
    }
  });
  it("validateMap reports duplicate ids", () => {
    const bad = { ...RISHON_MAP, buildings: [...RISHON_MAP.buildings, RISHON_MAP.buildings[0]] };
    expect(validateMap(bad).length).toBeGreaterThan(0);
  });
  it("validateMap rejects an NPC spawn inside a building footprint", () => {
    // the player house sits at (74,124); a spawn on it must be rejected.
    const bad = { ...RISHON_MAP, npcSpawns: [{ x: 74, z: 124 }] };
    expect(validateMap(bad).length).toBeGreaterThan(0);
  });
});
