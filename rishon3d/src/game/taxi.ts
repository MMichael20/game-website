import type { Vec2 } from "../world/rishonMap";
import { turnToward } from "./pathFollow";

export type TaxiPhase = "idle" | "toPickup" | "waiting" | "toDropoff";
export type TaxiEvent = "call" | "arrivedPickup" | "ride" | "arrivedDropoff" | "cancel";

// Ride loop: idle --call--> toPickup --arrivedPickup--> waiting --ride--> toDropoff --arrivedDropoff--> idle.
// "cancel" returns to idle only from a pending state (toPickup/waiting); a ride in
// progress (toDropoff) cannot be cancelled.
export function nextTaxiPhase(phase: TaxiPhase, event: TaxiEvent): TaxiPhase {
  switch (phase) {
    case "idle": return event === "call" ? "toPickup" : "idle";
    case "toPickup": return event === "arrivedPickup" ? "waiting" : event === "cancel" ? "idle" : "toPickup";
    case "waiting": return event === "ride" ? "toDropoff" : event === "cancel" ? "idle" : "waiting";
    case "toDropoff": return event === "arrivedDropoff" ? "idle" : "toDropoff";
  }
}

const ARRIVE_RADIUS = 2.5;

// Kinematic step toward a target (same heading convention as pathFollow:
// x = sin(heading), z = cos(heading)). Eases heading, never overshoots.
export function stepToward(
  pos: Vec2, heading: number, target: Vec2, speed: number, dt: number, turnRate: number,
): { pos: Vec2; heading: number; arrived: boolean } {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= ARRIVE_RADIUS) return { pos, heading, arrived: true };
  const desired = Math.atan2(dx, dz);
  const h = turnToward(heading, desired, turnRate * dt);
  const step = Math.min(speed * dt, dist);
  return { pos: { x: pos.x + Math.sin(h) * step, z: pos.z + Math.cos(h) * step }, heading: h, arrived: false };
}
