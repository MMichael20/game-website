import { describe, it, expect } from "vitest";
import { CORE_MAP as RISHON_MAP, validateMap } from "../src/world/rishonMap";

describe("RISHON_MAP", () => {
  it("is valid", () => {
    expect(validateMap(RISHON_MAP)).toEqual([]);
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
