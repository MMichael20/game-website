import type { Vec2 } from "../world/rishonMap";

export type Mode = "onFoot" | "driving";

export function distanceXZ(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function canEnter(mode: Mode, playerPos: Vec2, carPos: Vec2, radius: number): boolean {
  return mode === "onFoot" && distanceXZ(playerPos, carPos) <= radius;
}

export function nextMode(
  mode: Mode, ePressed: boolean, playerPos: Vec2, carPos: Vec2, radius: number,
): Mode {
  if (!ePressed) return mode;
  if (mode === "driving") return "onFoot";
  return canEnter(mode, playerPos, carPos, radius) ? "driving" : "onFoot";
}
