import { describe, it, expect } from "vitest";
import { Input } from "../src/core/Input";

function makeFakeTarget() {
  const handlers: Record<string, Function> = {};
  return {
    addEventListener: (type: string, fn: Function) => { handlers[type] = fn; },
    removeEventListener: () => {},
    fire: (type: string, code: string) => handlers[type]?.({ code, preventDefault() {} }),
  };
}

describe("Input", () => {
  it("tracks held keys", () => {
    const t = makeFakeTarget();
    const input = new Input(t as any);
    t.fire("keydown", "KeyW");
    expect(input.isDown("KeyW")).toBe(true);
    t.fire("keyup", "KeyW");
    expect(input.isDown("KeyW")).toBe(false);
  });

  it("justPressed is true once, then false until released and pressed again", () => {
    const t = makeFakeTarget();
    const input = new Input(t as any);
    t.fire("keydown", "KeyE");
    expect(input.justPressed("KeyE")).toBe(true);
    input.endFrame();
    expect(input.justPressed("KeyE")).toBe(false);
    // still held: a repeat keydown should not re-trigger justPressed
    t.fire("keydown", "KeyE");
    expect(input.justPressed("KeyE")).toBe(false);
    t.fire("keyup", "KeyE");
    t.fire("keydown", "KeyE");
    expect(input.justPressed("KeyE")).toBe(true);
  });
});
