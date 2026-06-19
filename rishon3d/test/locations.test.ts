import { describe, it, expect } from "vitest";
import { LOCATIONS, locationPois, minimapEntries, type Poi } from "../src/world/locations";

// The exact 7-entry POI table the single-source registry MUST reproduce. This is
// now a REGRESSION fixture on the one literal (LOCATIONS) — not a drift guard
// between two parallel literals (the duplicate districtPois.POIS was removed).
// locationPois() projecting LOCATIONS must still deep-equal this set
// (order-independent, keyed by id) so the minimap + interaction system behave
// identically — i.e. these 7 entries stay pinned.
const EXPECTED_POIS: Poi[] = [
  // Restaurant door x re-derived after the HERO widen (MAIN_RESTAURANT.w 9 -> 11):
  // RESTAURANT_DOOR.x = 95 + 11*0.28 = 98.08 (was 97.52 at w=9).
  { kind: "restaurant", id: "restaurant", label: "Restaurant", glyph: "R", color: "#e0524a", x: 98.08, z: 93, r: 4.5 },
  { kind: "bakery", id: "bakery", label: "Bakery", glyph: "B", color: "#f3a6c0", x: 77.92, z: 93, r: 4.5 },
  { kind: "phoneShop", id: "phoneShop", label: "Phone Shop", glyph: "P", color: "#3aa0ff", x: 120.4, z: 93, r: 4.5 },
  { kind: "taxi", id: "taxi", label: "Taxi Stand", glyph: "T", color: "#f2c14e", x: 104, z: 104, r: 4.5 },
  { kind: "park", id: "park", label: "Pocket Park", glyph: "G", color: "#5cc24a", x: 94, z: 121, r: 6 },
  { kind: "pickup", id: "pickup", label: "Pickup", glyph: "S", color: "#ffd98a", x: 95, z: 103, r: 3.5 },
  { kind: "house", id: "house", label: "Home", glyph: "H", color: "#f4c542", x: 74, z: 118.5, r: 4 },
  // Cafe (NEW): CAFE_DOOR.x = 62 + 12*0.26 = 65.12; z = shopFront(9) = 93.5.
  { kind: "cafe", id: "cafe", label: "Cafe", glyph: "C", color: "#caa46a", x: 65.12, z: 93.5, r: 4.5 },
];

const byId = <T extends { id: string }>(arr: T[]) =>
  Object.fromEntries(arr.map((e) => [e.id, e]));

describe("location registry", () => {
  it("LOCATIONS is non-empty", () => {
    expect(LOCATIONS.length).toBeGreaterThan(0);
  });

  it("every location def has at least one interaction zone (first is primary)", () => {
    for (const loc of LOCATIONS) {
      expect(loc.zones.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("locationPois() reproduces the pre-refactor POIS exactly (order-independent by id)", () => {
    const got = locationPois();
    expect(got.length).toBe(EXPECTED_POIS.length);
    const g = byId(got);
    const e = byId(EXPECTED_POIS);
    expect(Object.keys(g).sort()).toEqual(Object.keys(e).sort());
    for (const id of Object.keys(e)) {
      expect(g[id]).toEqual(e[id]);
    }
  });

  it("minimapEntries() yields exactly one entry per location", () => {
    const entries = minimapEntries();
    expect(entries.length).toBe(LOCATIONS.length);
    for (const m of entries) {
      expect(typeof m.x).toBe("number");
      expect(typeof m.z).toBe("number");
      expect(typeof m.glyph).toBe("string");
      expect(typeof m.color).toBe("string");
    }
  });
});
