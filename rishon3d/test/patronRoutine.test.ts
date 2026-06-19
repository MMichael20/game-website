import { describe, it, expect } from "vitest";
import {
  makePatron, stepPatron, dineInRoute, bakeryRoute, phoneShopRoute,
  crossingLoopRoute, taxiWaitRoute, patrolRoute, isSitting,
  parkLoopRoute, cafeRoute, officeLobbyRoute, sidewalkLoopRoute, workerStationRoute,
  BEHAVIORS,
  type Patron, type Waypoint,
} from "../src/game/patronRoutine";
import { INDOOR_TABLE_SEATS, PATIO_WALK_Z, FAR_WALK_Z, PARK_BENCH, CX, PARK_CENTER, PARK_W, PARK_D } from "../src/world/districtPois";

const dt = 1 / 60;

// Collect the distinct states a patron passes through over N steps.
function statesOver(p: Patron, steps: number): string[] {
  const seen: string[] = [p.state];
  for (let i = 0; i < steps; i++) {
    stepPatron(p, dt);
    if (seen[seen.length - 1] !== p.state) seen.push(p.state);
  }
  return seen;
}

describe("patronRoutine", () => {
  it("walks a dine-in patron through order -> sit -> leave, in order", () => {
    const p = makePatron(dineInRoute(INDOOR_TABLE_SEATS[0]), 4, { loop: true });
    const seen = statesOver(p, 60 * 60);
    expect(seen).toContain("toDoor");
    expect(seen).toContain("ordering");
    expect(seen).toContain("seated");
    expect(seen).toContain("leaving");
    expect(seen.indexOf("ordering")).toBeLessThan(seen.indexOf("seated"));
  });

  it("walks the dine-in patron all the way to the chosen seat and sits", () => {
    const seat = INDOOR_TABLE_SEATS[1];
    const p = makePatron(dineInRoute(seat), 4, { loop: true });
    let steps = 0;
    while (p.state !== "seated" && steps < 20000) { stepPatron(p, dt); steps++; }
    expect(p.state).toBe("seated");
    expect(Math.hypot(p.pos.x - seat.x, p.pos.z - seat.z)).toBeLessThan(0.7);
    expect(p.seated).toBe(true);
  });

  it("holds 'seated' for its dwell, then releases it", () => {
    const p = makePatron(dineInRoute(INDOOR_TABLE_SEATS[0]), 4, { loop: true });
    while (p.state !== "seated") stepPatron(p, dt);
    for (let i = 0; i < 4 * 60; i++) stepPatron(p, dt);
    expect(p.state).toBe("seated");
    for (let i = 0; i < 5 * 60; i++) stepPatron(p, dt);
    expect(p.state).not.toBe("seated");
    expect(p.seated).toBe(false);
  });

  it("lives a circular life: a looping dine-in patron never finishes and sits repeatedly", () => {
    const p = makePatron(dineInRoute(INDOOR_TABLE_SEATS[0]), 4, { loop: true });
    let seatedCount = 0; let prev = p.state;
    for (let i = 0; i < 120 * 60; i++) {
      stepPatron(p, dt);
      if (p.state === "seated" && prev !== "seated") seatedCount++;
      prev = p.state;
    }
    expect(p.done).toBe(false);
    expect(seatedCount).toBeGreaterThanOrEqual(2); // sat down more than once -> looped
  });

  it("brings a customer through the bakery and phone shop, standing to order", () => {
    expect(statesOver(makePatron(bakeryRoute(), 4, { loop: true }), 60 * 60)).toContain("ordering");
    expect(statesOver(makePatron(phoneShopRoute(), 4, { loop: true }), 60 * 60)).toContain("ordering");
  });

  it("crosses the street to the far sidewalk on a loop", () => {
    const p = makePatron(crossingLoopRoute(8), 4, { loop: true });
    let reachedFar = false;
    const seen = [p.state];
    for (let i = 0; i < 80 * 60; i++) {
      stepPatron(p, dt);
      if (seen[seen.length - 1] !== p.state) seen.push(p.state);
      if (Math.abs(p.pos.z - FAR_WALK_Z) < 0.7) reachedFar = true;
    }
    expect(seen).toContain("crossing");
    expect(reachedFar).toBe(true);
    expect(p.done).toBe(false);
  });

  it("makes the taxi waiter wait (standing) then move on, forever", () => {
    const p = makePatron(taxiWaitRoute(), 4, { loop: true });
    expect(statesOver(p, 60 * 60)).toContain("waiting");
    expect(isSitting("waiting")).toBe(false);
    expect(p.done).toBe(false);
  });

  it("loops a patrol patron forever between its two ends", () => {
    const p = makePatron(patrolRoute(80, 110), 4, { loop: true });
    for (let i = 0; i < 40 * 60; i++) stepPatron(p, dt);
    expect(p.done).toBe(false);
    expect(p.state).toBe("patrol");
    expect(Math.abs(p.pos.z - PATIO_WALK_Z)).toBeLessThan(0.7);
  });

  it("classifies only seated as sitting", () => {
    expect(isSitting("seated")).toBe(true);
    expect(isSitting("ordering")).toBe(false);
    expect(isSitting("waiting")).toBe(false);
    expect(isSitting("toDoor")).toBe(false);
  });
});

// --- Task 7: new route builders + faceYaw plumbing ----------------------------

function isFiniteCoords(wps: Waypoint[]): boolean {
  return wps.every((w) => Number.isFinite(w.to.x) && Number.isFinite(w.to.z));
}

function isClosedLoop(wps: Waypoint[]): boolean {
  // A "closed loop" means the route is non-empty and contains no "done" state.
  return wps.length > 0 && wps.every((w) => w.state !== "done");
}

describe("Task 7: new route builders", () => {
  it("parkLoopRoute returns a non-empty closed loop with finite coords", () => {
    const wps = parkLoopRoute();
    expect(wps.length).toBeGreaterThan(0);
    expect(isClosedLoop(wps)).toBe(true);
    expect(isFiniteCoords(wps)).toBe(true);
  });

  it("parkLoopRoute patron never finishes on loop", () => {
    const p = makePatron(parkLoopRoute(), 4, { loop: true });
    for (let i = 0; i < 120 * 60; i++) stepPatron(p, dt);
    expect(p.done).toBe(false);
  });

  it("cafeRoute returns a non-empty closed loop with finite coords", () => {
    const wps = cafeRoute();
    expect(wps.length).toBeGreaterThan(0);
    expect(isClosedLoop(wps)).toBe(true);
    expect(isFiniteCoords(wps)).toBe(true);
  });

  it("cafeRoute patron never finishes and advances through multiple waypoints on loop", () => {
    const p = makePatron(cafeRoute(), 4, { loop: true });
    const visitedIndices = new Set<number>([p.index]);
    for (let i = 0; i < 120 * 60; i++) {
      stepPatron(p, dt);
      visitedIndices.add(p.index);
      expect(p.done).toBe(false);
    }
    expect(visitedIndices.size).toBeGreaterThan(1);
  });

  it("officeLobbyRoute returns a non-empty closed loop with finite coords", () => {
    const wps = officeLobbyRoute();
    expect(wps.length).toBeGreaterThan(0);
    expect(isClosedLoop(wps)).toBe(true);
    expect(isFiniteCoords(wps)).toBe(true);
  });

  it("officeLobbyRoute patron never finishes and advances through multiple waypoints on loop", () => {
    const p = makePatron(officeLobbyRoute(), 4, { loop: true });
    const visitedIndices = new Set<number>([p.index]);
    for (let i = 0; i < 120 * 60; i++) {
      stepPatron(p, dt);
      visitedIndices.add(p.index);
      expect(p.done).toBe(false);
    }
    expect(visitedIndices.size).toBeGreaterThan(1);
  });

  it("sidewalkLoopRoute(p1, p2) returns a non-empty closed loop with finite coords", () => {
    const p1 = { x: CX - 10, z: PATIO_WALK_Z };
    const p2 = { x: CX + 10, z: PATIO_WALK_Z };
    const wps = sidewalkLoopRoute(p1, p2);
    expect(wps.length).toBeGreaterThan(0);
    expect(isClosedLoop(wps)).toBe(true);
    expect(isFiniteCoords(wps)).toBe(true);
  });

  it("sidewalkLoopRoute patron never finishes and advances through multiple waypoints on loop", () => {
    const p1 = { x: CX - 10, z: PATIO_WALK_Z };
    const p2 = { x: CX + 10, z: PATIO_WALK_Z };
    const p = makePatron(sidewalkLoopRoute(p1, p2), 4, { loop: true });
    const visitedIndices = new Set<number>([p.index]);
    for (let i = 0; i < 120 * 60; i++) {
      stepPatron(p, dt);
      visitedIndices.add(p.index);
      expect(p.done).toBe(false);
    }
    expect(visitedIndices.size).toBeGreaterThan(1);
  });

  it("workerStationRoute returns a non-empty closed loop with finite coords", () => {
    const post = { x: CX, z: PATIO_WALK_Z };
    const wps = workerStationRoute(post, 0);
    expect(wps.length).toBeGreaterThan(0);
    expect(isClosedLoop(wps)).toBe(true);
    expect(isFiniteCoords(wps)).toBe(true);
  });

  it("workerStationRoute patron reaches and dwells at the post", () => {
    const post = { x: CX, z: PATIO_WALK_Z };
    const p = makePatron(workerStationRoute(post, 0), 4, { loop: true });
    let reachedPost = false;
    for (let i = 0; i < 120 * 60; i++) {
      stepPatron(p, dt);
      if (Math.hypot(p.pos.x - post.x, p.pos.z - post.z) < 1.0 && p.timer > 0) {
        reachedPost = true;
        break;
      }
    }
    expect(reachedPost).toBe(true);
  });

  it("workerStationRoute patron never finishes on loop", () => {
    const post = { x: CX, z: PATIO_WALK_Z };
    const p = makePatron(workerStationRoute(post, 0), 4, { loop: true });
    for (let i = 0; i < 60 * 60; i++) stepPatron(p, dt);
    expect(p.done).toBe(false);
  });
});

describe("Task 7: faceYaw on Waypoint", () => {
  it("faceYaw is preserved through makePatron / stepPatron on a dwell waypoint", () => {
    // Create a simple route where one waypoint has a faceYaw
    const wps: Waypoint[] = [
      { to: { x: CX, z: PATIO_WALK_Z }, state: "patrol", dwell: 0 },
      { to: { x: CX + 5, z: PATIO_WALK_Z }, state: "waiting", dwell: 2, faceYaw: Math.PI / 3 },
      { to: { x: CX + 10, z: PATIO_WALK_Z }, state: "patrol", dwell: 0 },
    ];
    const p = makePatron(wps, 4, { loop: true });
    let foundFaceYaw: number | undefined;
    for (let i = 0; i < 120 * 60; i++) {
      stepPatron(p, dt);
      const current = p.waypoints[p.index];
      if (current.faceYaw !== undefined && p.timer > 0) {
        foundFaceYaw = current.faceYaw;
        break;
      }
    }
    expect(foundFaceYaw).toBeCloseTo(Math.PI / 3, 5);
  });

  it("INDOOR_TABLE_SEATS have faceYaw defined", () => {
    for (const seat of INDOOR_TABLE_SEATS) {
      expect(typeof seat.faceYaw).toBe("number");
      expect(Number.isFinite(seat.faceYaw)).toBe(true);
    }
  });

  it("parkLoopRoute bench waypoint has a faceYaw", () => {
    const wps = parkLoopRoute();
    const benchWp = wps.find(
      (w) => Math.hypot(w.to.x - PARK_BENCH.x, w.to.z - PARK_BENCH.z) < 0.5,
    );
    expect(benchWp).toBeDefined();
    expect(typeof benchWp?.faceYaw).toBe("number");
  });

  it("workerStationRoute post waypoint has a faceYaw", () => {
    const post = { x: CX, z: PATIO_WALK_Z };
    const faceYaw = Math.PI; // face south
    const wps = workerStationRoute(post, faceYaw);
    const postWp = wps.find(
      (w) => Math.hypot(w.to.x - post.x, w.to.z - post.z) < 0.5 && w.dwell > 0,
    );
    expect(postWp).toBeDefined();
    expect(postWp?.faceYaw).toBeCloseTo(faceYaw, 5);
  });
});

describe("Task 7: BEHAVIORS registry", () => {
  it("BEHAVIORS is a non-empty object/map", () => {
    expect(typeof BEHAVIORS).toBe("object");
    expect(BEHAVIORS).not.toBeNull();
    expect(Object.keys(BEHAVIORS).length).toBeGreaterThan(0);
  });

  it("each BEHAVIORS entry produces a non-empty closed loop", () => {
    for (const [key, buildRoute] of Object.entries(BEHAVIORS)) {
      const wps = buildRoute();
      expect(wps.length, `${key} returned empty waypoints`).toBeGreaterThan(0);
      expect(isClosedLoop(wps)).toBe(true);
      expect(isFiniteCoords(wps)).toBe(true);
    }
  });
});

// Task 11: park loop route waypoint geometry sanity
describe("Task 11: parkLoopRoute geometry alignment", () => {
  it("parkLoopRoute bench waypoint lands within the park region", () => {
    const wps = parkLoopRoute();
    const benchWp = wps.find(
      (w) => Math.hypot(w.to.x - PARK_BENCH.x, w.to.z - PARK_BENCH.z) < 0.5,
    );
    expect(benchWp).toBeDefined();
    // Bench must be inside the park bounding box
    const minX = PARK_CENTER.x - PARK_W / 2;
    const maxX = PARK_CENTER.x + PARK_W / 2;
    const minZ = PARK_CENTER.z - PARK_D / 2;
    const maxZ = PARK_CENTER.z + PARK_D / 2;
    expect(benchWp!.to.x).toBeGreaterThanOrEqual(minX);
    expect(benchWp!.to.x).toBeLessThanOrEqual(maxX);
    expect(benchWp!.to.z).toBeGreaterThanOrEqual(minZ);
    expect(benchWp!.to.z).toBeLessThanOrEqual(maxZ);
  });

  it("parkLoopRoute walk-into-park waypoint (PARK_CENTER) is inside the park region", () => {
    const wps = parkLoopRoute();
    const centerWp = wps.find(
      (w) => Math.hypot(w.to.x - PARK_CENTER.x, w.to.z - PARK_CENTER.z) < 1.0
             && w.to.z > PATIO_WALK_Z,
    );
    expect(centerWp).toBeDefined();
  });

  it("parkLoopRoute patron reaches PARK_BENCH and sits", () => {
    const p = makePatron(parkLoopRoute(), 4, { loop: true });
    let reachedBench = false;
    for (let i = 0; i < 120 * 60; i++) {
      stepPatron(p, dt);
      if (p.state === "seated" && Math.hypot(p.pos.x - PARK_BENCH.x, p.pos.z - PARK_BENCH.z) < 1.0) {
        reachedBench = true;
        break;
      }
    }
    expect(reachedBench).toBe(true);
  });
});
