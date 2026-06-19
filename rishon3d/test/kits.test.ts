// rishon3d/test/kits.test.ts
// TDD tests for world/kits.ts — reusable prop-group kit factories.
// Each kit returns { object: THREE.Object3D; obstacles: Rect[]; seats? }.
// Rules enforced:
//   - chunky kits: obstacles.length >= 1
//   - seating kits: seats defined, coords finite, NOT inside obstacles
//   - crosswalk: obstacles is empty (flat paint)
//   - all kits: object is defined
//   - determinism: same cfg => identical Box3 bounds
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import type { Rect } from "../src/game/wander";
import {
  makePatioSet,
  makePlanterRow,
  makeBenchBinLamp,
  makeTaxiKit,
  makeCrosswalkKit,
  makeTrafficLightKit,
  makeStopSignKit,
  makePicnicKit,
  makeFountainKit,
  makeOfficePlaza,
  makeBikeRackKit,
  makeDisplayShelf,
  makeCounterKit,
  type KitResult,
} from "../src/world/kits";

// Point-in-rect check (strict interior — a seat at the exact border is fine)
function pointInRect(x: number, z: number, r: Rect): boolean {
  return x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;
}
function seatsInsideObstacles(kit: KitResult): boolean {
  return (kit.seats ?? []).some((s) =>
    kit.obstacles.some((r) => pointInRect(s.x, s.z, r)),
  );
}
function box3(obj: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(obj);
}

// ------- makePatioSet -------
describe("makePatioSet", () => {
  const cfg = { x: 5, z: 10, umbrella: true };
  it("returns object and obstacles array", () => {
    const kit = makePatioSet(cfg);
    expect(kit.object).toBeDefined();
    expect(Array.isArray(kit.obstacles)).toBe(true);
  });
  it("exposes seats with finite coords", () => {
    const kit = makePatioSet(cfg);
    expect(kit.seats).toBeDefined();
    expect(kit.seats!.length).toBeGreaterThan(0);
    for (const s of kit.seats!) {
      expect(isFinite(s.x)).toBe(true);
      expect(isFinite(s.z)).toBe(true);
      expect(isFinite(s.faceYaw)).toBe(true);
    }
  });
  it("seat coords are NOT inside returned obstacles", () => {
    expect(seatsInsideObstacles(makePatioSet(cfg))).toBe(false);
  });
  it("is deterministic", () => {
    const a = box3(makePatioSet(cfg).object);
    const b = box3(makePatioSet(cfg).object);
    expect(a.min.x).toBeCloseTo(b.min.x, 4);
    expect(a.max.z).toBeCloseTo(b.max.z, 4);
  });
});

// ------- makePlanterRow -------
describe("makePlanterRow", () => {
  const cfg = { x: 0, z: 0, count: 3, dx: 2 };
  it("returns object and >=1 obstacle", () => {
    const kit = makePlanterRow(cfg);
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
  it("is deterministic", () => {
    const a = box3(makePlanterRow(cfg).object);
    const b = box3(makePlanterRow(cfg).object);
    expect(a.min.x).toBeCloseTo(b.min.x, 4);
  });
});

// ------- makeBenchBinLamp -------
describe("makeBenchBinLamp", () => {
  const cfg = { x: 3, z: 7, faceYaw: 0 };
  it("returns object and obstacles array", () => {
    const kit = makeBenchBinLamp(cfg);
    expect(kit.object).toBeDefined();
    expect(Array.isArray(kit.obstacles)).toBe(true);
  });
  it("exposes seats with finite coords", () => {
    const kit = makeBenchBinLamp(cfg);
    expect(kit.seats).toBeDefined();
    expect(kit.seats!.length).toBeGreaterThan(0);
    for (const s of kit.seats!) {
      expect(isFinite(s.x)).toBe(true);
      expect(isFinite(s.z)).toBe(true);
    }
  });
  it("bench seat NOT inside obstacles", () => {
    expect(seatsInsideObstacles(makeBenchBinLamp(cfg))).toBe(false);
  });
});

// ------- makeTaxiKit -------
describe("makeTaxiKit", () => {
  const cfg = { x: -5, z: 20 };
  it("returns object and >=1 obstacle", () => {
    const kit = makeTaxiKit(cfg);
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
  it("is deterministic", () => {
    const a = box3(makeTaxiKit(cfg).object);
    const b = box3(makeTaxiKit(cfg).object);
    expect(a.min.x).toBeCloseTo(b.min.x, 4);
  });
});

// ------- makeCrosswalkKit -------
describe("makeCrosswalkKit", () => {
  it("obstacles is EMPTY (flat paint only)", () => {
    const kit = makeCrosswalkKit({ x: 0, z: 0, axis: "x", width: 6 });
    expect(kit.object).toBeDefined();
    expect(kit.obstacles).toHaveLength(0);
  });
});

// ------- makeTrafficLightKit -------
describe("makeTrafficLightKit", () => {
  const cfg = { x: 10, z: 5 };
  it("returns object and >=1 obstacle", () => {
    const kit = makeTrafficLightKit(cfg);
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
});

// ------- makeStopSignKit -------
describe("makeStopSignKit", () => {
  const cfg = { x: -2, z: 8 };
  it("returns object and >=1 obstacle", () => {
    const kit = makeStopSignKit(cfg);
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
});

// ------- makePicnicKit -------
describe("makePicnicKit", () => {
  const cfg = { x: 0, z: 0 };
  it("returns object, obstacles array, and seats", () => {
    const kit = makePicnicKit(cfg);
    expect(kit.object).toBeDefined();
    expect(Array.isArray(kit.obstacles)).toBe(true);
    expect(kit.seats).toBeDefined();
    expect(kit.seats!.length).toBeGreaterThan(0);
  });
  it("seat coords are finite", () => {
    const kit = makePicnicKit(cfg);
    for (const s of kit.seats!) {
      expect(isFinite(s.x)).toBe(true);
      expect(isFinite(s.z)).toBe(true);
    }
  });
  it("seats NOT inside obstacles", () => {
    expect(seatsInsideObstacles(makePicnicKit(cfg))).toBe(false);
  });
});

// ------- makeFountainKit -------
describe("makeFountainKit", () => {
  const cfg = { x: 1, z: 2 };
  it("returns object and >=1 obstacle", () => {
    const kit = makeFountainKit(cfg);
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
  it("is deterministic", () => {
    const a = box3(makeFountainKit(cfg).object);
    const b = box3(makeFountainKit(cfg).object);
    expect(a.min.x).toBeCloseTo(b.min.x, 4);
  });
});

// ------- makeOfficePlaza -------
describe("makeOfficePlaza", () => {
  it("returns object and >=1 obstacle", () => {
    const kit = makeOfficePlaza({ x: 0, z: 0, w: 10, d: 8 });
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
});

// ------- makeBikeRackKit -------
describe("makeBikeRackKit", () => {
  const cfg = { x: 4, z: 4 };
  it("returns object and >=1 obstacle", () => {
    const kit = makeBikeRackKit(cfg);
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
});

// ------- makeDisplayShelf -------
describe("makeDisplayShelf", () => {
  it("returns object and obstacles", () => {
    const kit = makeDisplayShelf({ x: 0, z: 0 });
    expect(kit.object).toBeDefined();
    expect(Array.isArray(kit.obstacles)).toBe(true);
  });
});

// ------- makeCounterKit -------
describe("makeCounterKit", () => {
  it("returns object and >=1 obstacle", () => {
    const kit = makeCounterKit({ x: 0, z: 0, w: 2 });
    expect(kit.object).toBeDefined();
    expect(kit.obstacles.length).toBeGreaterThanOrEqual(1);
  });
});
