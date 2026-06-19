import { describe, it, expect } from "vitest";
import {
  makePatron, stepPatron, dineInRoute, phoneShopRoute, streetCrossRoute,
  patrolRoute, isSitting, type Patron,
} from "../src/game/patronRoutine";
import { INDOOR_TABLE_SEATS, PATIO_WALK_Z } from "../src/world/districtPois";

// Run the FSM until it either finishes or we hit a step budget. Returns the
// number of steps taken so tests can assert termination.
function runUntilDone(p: Patron, dt: number, maxSteps: number): number {
  let steps = 0;
  while (!p.done && steps < maxSteps) {
    stepPatron(p, dt);
    steps++;
  }
  return steps;
}

// Collect the distinct states a patron passes through, in order.
function statesVisited(p: Patron, dt: number, maxSteps: number): string[] {
  const seen: string[] = [p.state];
  let steps = 0;
  while (!p.done && steps < maxSteps) {
    stepPatron(p, dt);
    if (seen[seen.length - 1] !== p.state) seen.push(p.state);
    steps++;
  }
  return seen;
}

describe("patronRoutine", () => {
  const dt = 1 / 60;

  it("advances a dine-in patron through its phases in order", () => {
    const seat = INDOOR_TABLE_SEATS[0];
    const p = makePatron(dineInRoute(seat), 4);
    const seen = statesVisited(p, dt, 20000);
    expect(seen).toContain("toDoor");
    expect(seen).toContain("entering");
    expect(seen).toContain("ordering");
    expect(seen).toContain("seated");
    expect(seen).toContain("crossing");
    // phases occur in the right relative order
    expect(seen.indexOf("ordering")).toBeLessThan(seen.indexOf("seated"));
    expect(seen.indexOf("seated")).toBeLessThan(seen.indexOf("crossing"));
  });

  it("walks the dine-in patron all the way to the chosen seat", () => {
    const seat = INDOOR_TABLE_SEATS[1];
    const p = makePatron(dineInRoute(seat), 4);
    // step until it has been seated
    let steps = 0;
    while (p.state !== "seated" && steps < 20000) { stepPatron(p, dt); steps++; }
    expect(p.state).toBe("seated");
    expect(Math.hypot(p.pos.x - seat.x, p.pos.z - seat.z)).toBeLessThan(0.7);
    expect(p.seated).toBe(true);
  });

  it("holds 'seated' for its dwell, then releases it", () => {
    const seat = INDOOR_TABLE_SEATS[0];
    const p = makePatron(dineInRoute(seat), 4);
    while (p.state !== "seated") stepPatron(p, dt);
    // dwell is 8s; after ~4s it should still be seated
    for (let i = 0; i < 4 * 60; i++) stepPatron(p, dt);
    expect(p.state).toBe("seated");
    // after the full 8s+ it must have left the seat
    for (let i = 0; i < 5 * 60; i++) stepPatron(p, dt);
    expect(p.state).not.toBe("seated");
    expect(p.seated).toBe(false);
  });

  it("terminates a full dine-in cycle cleanly", () => {
    const p = makePatron(dineInRoute(INDOOR_TABLE_SEATS[0]), 4);
    const steps = runUntilDone(p, dt, 50000);
    expect(p.done).toBe(true);
    expect(p.state).toBe("done");
    expect(steps).toBeLessThan(50000);
  });

  it("runs a phone-shop visit to completion and dwells while ordering", () => {
    const p = makePatron(phoneShopRoute(), 4);
    const seen = statesVisited(p, dt, 50000);
    expect(seen).toContain("ordering");
    expect(p.done).toBe(true);
  });

  it("makes the taxi waiter dwell then cross", () => {
    const p = makePatron(streetCrossRoute(), 4);
    const seen = statesVisited(p, dt, 50000);
    expect(seen).toContain("crossing");
    expect(p.done).toBe(true);
  });

  it("loops a patrol patron forever between its two ends", () => {
    const p = makePatron(patrolRoute(80, 110), 4, { loop: true });
    // 40s of simulation must never finish a looping patrol
    for (let i = 0; i < 40 * 60; i++) stepPatron(p, dt);
    expect(p.done).toBe(false);
    expect(p.state).toBe("patrol");
    // it walks the lane, so z stays on the patio lane
    expect(Math.abs(p.pos.z - PATIO_WALK_Z)).toBeLessThan(0.7);
  });

  it("classifies sitting states", () => {
    expect(isSitting("ordering")).toBe(true);
    expect(isSitting("seated")).toBe(true);
    expect(isSitting("toDoor")).toBe(false);
    expect(isSitting("crossing")).toBe(false);
  });
});
