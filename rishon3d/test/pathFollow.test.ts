import { describe, it, expect } from "vitest";
import { turnToward, advanceAlong, type FollowState } from "../src/game/pathFollow";

describe("turnToward", () => {
  it("snaps when within maxDelta", () => {
    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05, 6);
  });
  it("steps toward the target by maxDelta", () => {
    expect(turnToward(0, 1, 0.1)).toBeCloseTo(0.1, 6);
  });
  it("turns the short way across the +/-PI seam", () => {
    // from 3.0 rad to -3.0 rad: short way is +,  crossing PI
    const next = turnToward(3.0, -3.0, 0.1);
    expect(next).toBeGreaterThan(3.0); // moved forward past PI, not back toward 0
  });
});

describe("advanceAlong", () => {
  const route = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 10, z: 10 }];

  it("moves the position toward the active waypoint", () => {
    const s0: FollowState = { pos: { x: 0, z: 0 }, heading: 0, waypoint: 1 };
    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
    expect(s1.pos.z).toBeGreaterThan(0);  // moved toward (0,10)
    expect(s1.pos.z).toBeLessThan(10);
  });

  it("advances to the next waypoint on arrival", () => {
    const s0: FollowState = { pos: { x: 0, z: 9.8 }, heading: 0, waypoint: 1 };
    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
    expect(s1.waypoint).toBe(2);
  });

  it("wraps the waypoint index at the end of the route", () => {
    const s0: FollowState = { pos: { x: 10, z: 10 }, heading: 0, waypoint: 2 };
    const s1 = advanceAlong(route, s0, 5, 0.1, 0.5, 10);
    expect(s1.waypoint).toBe(0);
  });

  it("returns the state unchanged for an empty route", () => {
    const s0: FollowState = { pos: { x: 1, z: 1 }, heading: 0.5, waypoint: 0 };
    expect(advanceAlong([], s0, 5, 0.1, 0.5, 10)).toEqual(s0);
  });
});
