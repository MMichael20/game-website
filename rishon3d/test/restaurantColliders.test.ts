import { describe, it, expect } from "vitest";
import { restaurantColliders, type BoxCollider } from "../src/world/restaurantColliders";
import { RESTAURANTS, PHONE_SHOP, SHOP_Z } from "../src/world/districtPois";

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
