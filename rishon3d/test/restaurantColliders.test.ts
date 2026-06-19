import { describe, it, expect } from "vitest";
import { restaurantColliders, type BoxCollider } from "../src/world/restaurantColliders";
import { RESTAURANTS, PHONE_SHOP, CAFE, SHOP_Z, OFFICE, OFFICE_LOBBY, OFFICE_DESK } from "../src/world/districtPois";

const contains = (c: BoxCollider, x: number, y: number, z: number) =>
  Math.abs(x - c.x) <= c.hx && Math.abs(y - c.y) <= c.hy && Math.abs(z - c.z) <= c.hz;
const anyContains = (cs: BoxCollider[], x: number, y: number, z: number) =>
  cs.some((c) => contains(c, x, y, z));

describe("restaurantColliders", () => {
  const cs = restaurantColliders();
  const open = RESTAURANTS.find((r) => r.open)!;

  it("leaves the open restaurant's front entrance clear at player height", () => {
    const front = SHOP_Z + open.d / 2;
    expect(anyContains(cs, open.x, 1.0, front)).toBe(false);
  });

  it("walls the open restaurant's back and sides", () => {
    const back = SHOP_Z - open.d / 2;
    expect(anyContains(cs, open.x, 1.0, back + 0.15)).toBe(true);                 // back wall
    expect(anyContains(cs, open.x - open.w / 2 + 0.15, 1.0, SHOP_Z)).toBe(true);  // left wall
    expect(anyContains(cs, open.x + open.w / 2 - 0.15, 1.0, SHOP_Z)).toBe(true);  // right wall
  });

  it("leaves the phone shop entrance clear but walls its back", () => {
    const front = SHOP_Z + PHONE_SHOP.d / 2;
    const back = SHOP_Z - PHONE_SHOP.d / 2;
    expect(anyContains(cs, PHONE_SHOP.x, 1.0, front)).toBe(false);
    expect(anyContains(cs, PHONE_SHOP.x, 1.0, back + 0.15)).toBe(true);
  });

  it("leaves the cafe entrance clear but walls its back and sides", () => {
    const front = SHOP_Z + CAFE.d / 2;
    const back = SHOP_Z - CAFE.d / 2;
    // open front center is walk-in clear
    expect(anyContains(cs, CAFE.x, 1.0, front)).toBe(false);
    // back + sides are solid
    expect(anyContains(cs, CAFE.x, 1.0, back + 0.15)).toBe(true);
    expect(anyContains(cs, CAFE.x - CAFE.w / 2 + 0.15, 1.0, SHOP_Z)).toBe(true);
    expect(anyContains(cs, CAFE.x + CAFE.w / 2 - 0.15, 1.0, SHOP_Z)).toBe(true);
  });

  it("makes closed restaurants solid", () => {
    for (const r of RESTAURANTS.filter((x) => !x.open)) {
      expect(anyContains(cs, r.x, 1.0, SHOP_Z)).toBe(true);
    }
  });

  it("gives every collider positive extents resting on the ground", () => {
    expect(cs.length).toBeGreaterThan(0);
    for (const c of cs) {
      expect(c.hx).toBeGreaterThan(0);
      expect(c.hy).toBeGreaterThan(0);
      expect(c.hz).toBeGreaterThan(0);
      expect(c.y - c.hy).toBeCloseTo(0, 5); // bottom sits at y=0
    }
  });
});

// Task 12: hi-tech office block. The ground floor is a walk-in lobby (open WEST
// front, facing the cross street); the TOWER above the lobby is a SOLID box, so
// the player can walk INTO the lobby but cannot pass through the tower mass.
describe("office block colliders (Task 12)", () => {
  const cs = restaurantColliders();
  const west = OFFICE.x - OFFICE.w / 2;   // street-facing (open) west face
  const east = OFFICE.x + OFFICE.w / 2;   // solid tower-core back face

  it("leaves the lobby's WEST front entrance clear at player height", () => {
    // The center of the west face (where OFFICE_DOOR sits) must be enterable.
    expect(anyContains(cs, west + 0.5, 1.0, OFFICE.z)).toBe(false);
  });

  it("walls the lobby's north/south sides at player height", () => {
    expect(anyContains(cs, OFFICE.x - 2, 1.0, OFFICE.z - OFFICE.d / 2 + 0.15)).toBe(true);
    expect(anyContains(cs, OFFICE.x - 2, 1.0, OFFICE.z + OFFICE.d / 2 - 0.15)).toBe(true);
  });

  it("makes the TOWER core SOLID at player height AND high overhead (you can't walk through the tower)", () => {
    // The solid core (east back of the footprint) blocks at the ground…
    expect(anyContains(cs, east - 1.0, 1.0, OFFICE.z)).toBe(true);
    // …and rises full-height as the tower mass.
    expect(anyContains(cs, east - 1.0, OFFICE.h - 2, OFFICE.z)).toBe(true);
  });

  it("keeps the lobby dwell targets walkable at the ground floor (not inside a wall/core)", () => {
    expect(anyContains(cs, OFFICE_LOBBY.x, 1.0, OFFICE_LOBBY.z)).toBe(false);
    expect(anyContains(cs, OFFICE_DESK.x, 1.0, OFFICE_DESK.z)).toBe(false);
  });

  it("rests every collider on the ground (bottom y=0) with positive extents", () => {
    for (const c of cs) {
      expect(c.hx).toBeGreaterThan(0);
      expect(c.hy).toBeGreaterThan(0);
      expect(c.hz).toBeGreaterThan(0);
      expect(c.y - c.hy).toBeCloseTo(0, 5);
    }
  });
});
