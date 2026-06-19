import { describe, it, expect } from "vitest";
import { PATRON_OBSTACLES, resolveObstacles } from "../src/world/obstacles";
import {
  HOUSE, RESTAURANTS, SHOP_Z,
  INDOOR_TABLES, INDOOR_CHAIR_DX, INDOOR_TABLE_SEATS, INDOOR_DINER_SEATS,
  seatClusters, CHAIR_OFFSETS, PARK_BENCH, TAXI_WAIT, HOUSE_DOOR,
  RESTAURANT_COUNTER, RESTAURANT_INSIDE, BAKERY_COUNTER, PHONE_SHOP_COUNTER,
} from "../src/world/districtPois";

const inside = (p: { x: number; z: number }) =>
  PATRON_OBSTACLES.some((r) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ);

describe("patron obstacles", () => {
  it("declares a non-empty solid obstacle set", () => {
    expect(PATRON_OBSTACLES.length).toBeGreaterThan(0);
  });

  it("pushes a point inside the house out to its edge", () => {
    const p = { x: HOUSE.x, z: HOUSE.z };
    resolveObstacles(p);
    expect(inside(p)).toBe(false);
  });

  it("leaves a point in the open clear of obstacles unchanged", () => {
    const p = { x: 95, z: 105 }; // promenade lane — clear of every solid
    const before = { ...p };
    resolveObstacles(p);
    expect(p).toEqual(before);
  });

  it("does NOT block the open restaurant's interior (patrons enter via the door)", () => {
    const open = RESTAURANTS.find((r) => r.open)!;
    expect(inside({ x: open.x, z: SHOP_Z })).toBe(false);
  });

  // The load-bearing stability invariant: every place a patron DWELLS (sits,
  // orders, waits, enters) must be reachable — i.e. NOT inside an obstacle — or
  // the push-out would trap the patron grinding against a solid forever.
  it("keeps every patron sit / order / wait / enter target reachable", () => {
    const targets: { label: string; p: { x: number; z: number } }[] = [
      ...INDOOR_TABLE_SEATS.map((s, i) => ({ label: `indoorTableSeat${i}`, p: s })),
      ...INDOOR_DINER_SEATS.map((s, i) => ({ label: `indoorDinerSeat${i}`, p: s })),
      // a sample of patio chairs (cluster + each chair offset)
      ...seatClusters().flatMap((c, ci) =>
        CHAIR_OFFSETS.map(([dx, dz], oi) => ({ label: `patioChair${ci}-${oi}`, p: { x: c.x + dx, z: c.z + dz } })),
      ),
      { label: "parkBench", p: PARK_BENCH },
      { label: "taxiWait", p: TAXI_WAIT },
      { label: "houseDoor", p: HOUSE_DOOR },
      { label: "restaurantCounter", p: RESTAURANT_COUNTER },
      { label: "restaurantInside", p: RESTAURANT_INSIDE },
      { label: "bakeryCounter", p: BAKERY_COUNTER },
      { label: "phoneShopCounter", p: PHONE_SHOP_COUNTER },
    ];
    const trapped = targets.filter((t) => inside(t.p)).map((t) => t.label);
    expect(trapped).toEqual([]);
  });
});

// Guards against the floating-diner class of bug: indoor NPC seats MUST land on a
// real chair (table center +/- the chair offset), never on the table center.
describe("indoor seats sit on real chairs", () => {
  it("every indoor seat is one chair-offset from a table center", () => {
    const chairXs = INDOOR_TABLES.flatMap((t) => [t.x - INDOOR_CHAIR_DX, t.x + INDOOR_CHAIR_DX]);
    for (const s of [...INDOOR_TABLE_SEATS, ...INDOOR_DINER_SEATS]) {
      const onChair = chairXs.some((cx) => Math.abs(cx - s.x) < 1e-6);
      const onTableZ = INDOOR_TABLES.some((t) => Math.abs(t.z - s.z) < 1e-6);
      expect(onChair && onTableZ).toBe(true);
    }
  });

  it("scripted and static diners take DIFFERENT chairs (no double-up)", () => {
    for (const a of INDOOR_TABLE_SEATS) {
      for (const b of INDOOR_DINER_SEATS) {
        expect(Math.abs(a.x - b.x) + Math.abs(a.z - b.z)).toBeGreaterThan(0.5);
      }
    }
  });
});
