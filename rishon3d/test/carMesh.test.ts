// rishon3d/test/carMesh.test.ts
import { describe, it, expect } from "vitest";
import { makeCarBody } from "../src/entities/carMesh";

describe("makeCarBody", () => {
  it("builds a multi-part body group without wheels by default", () => {
    const g = makeCarBody({ bodyColor: 0xc0392b });
    // body + glass + roof + 2 headlights + skirt = 6 parts, no wheels
    expect(g.children.length).toBeGreaterThanOrEqual(5);
  });
  it("adds four wheels when requested", () => {
    const plain = makeCarBody({ bodyColor: 0x2980b9 });
    const wheeled = makeCarBody({ bodyColor: 0x2980b9, withWheels: true });
    expect(wheeled.children.length).toBe(plain.children.length + 4);
  });
});
