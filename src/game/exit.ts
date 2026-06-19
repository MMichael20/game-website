import type { Vec2 } from "../world/rishonMap";
import { type Rect, pointInRects } from "./wander";

// Pick a spot beside the car to drop the player: inside bounds and clear of every
// building rect. Probes a few offsets around the car; falls back to the car
// position if all are blocked. Pure and deterministic.
export function safeExitPosition(car: Vec2, rects: Rect[], bounds: number): Vec2 {
  const offsets: Vec2[] = [
    { x: 2.5, z: 0 }, { x: -2.5, z: 0 },
    { x: 0, z: 2.5 }, { x: 0, z: -2.5 },
    { x: 2.5, z: 2.5 }, { x: -2.5, z: -2.5 },
  ];
  for (const o of offsets) {
    const p = { x: car.x + o.x, z: car.z + o.z };
    if (Math.abs(p.x) <= bounds && Math.abs(p.z) <= bounds && !pointInRects(p, rects)) return p;
  }
  return { x: car.x, z: car.z };
}
