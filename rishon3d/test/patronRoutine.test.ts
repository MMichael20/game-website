import { describe, it, expect } from "vitest";
import {
  makePatron, stepPatron, dineInRoute, bakeryRoute, phoneShopRoute,
  crossingLoopRoute, taxiWaitRoute, patrolRoute, isSitting, type Patron,
} from "../src/game/patronRoutine";
import { INDOOR_TABLE_SEATS, PATIO_WALK_Z, FAR_WALK_Z } from "../src/world/districtPois";

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
