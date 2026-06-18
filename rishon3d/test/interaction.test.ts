import { describe, it, expect } from "vitest";
import { distanceXZ, canEnter, nextMode } from "../src/game/InteractionSystem";

const R = 3;

describe("InteractionSystem", () => {
  it("computes planar distance", () => {
    expect(distanceXZ({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
  });
  it("can enter only when on foot and near", () => {
    expect(canEnter("onFoot", { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe(true);
    expect(canEnter("onFoot", { x: 0, z: 0 }, { x: 10, z: 0 }, R)).toBe(false);
    expect(canEnter("driving", { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe(false);
  });
  it("E near car enters; E while driving exits; E far away does nothing", () => {
    expect(nextMode("onFoot", true, { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe("driving");
    expect(nextMode("driving", true, { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe("onFoot");
    expect(nextMode("onFoot", true, { x: 0, z: 0 }, { x: 99, z: 0 }, R)).toBe("onFoot");
    expect(nextMode("onFoot", false, { x: 0, z: 0 }, { x: 1, z: 0 }, R)).toBe("onFoot");
  });
});
