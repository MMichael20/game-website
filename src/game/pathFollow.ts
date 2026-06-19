import type { Vec2 } from "../world/rishonMap";

// Rotate `current` toward `target` by at most `maxDelta`, taking the short way
// around the circle (handles the +/-PI seam).
export function turnToward(current: number, target: number, maxDelta: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

export interface FollowState {
  pos: Vec2;
  heading: number;
  waypoint: number;
}

// Kinematic route follower. Eases heading toward the active waypoint, steps
// forward by speed*dt, and advances (looping) when within arriveRadius.
export function advanceAlong(
  route: Vec2[],
  state: FollowState,
  speed: number,
  dt: number,
  arriveRadius: number,
  turnRate: number,
): FollowState {
  if (route.length === 0) return state;

  let waypoint = state.waypoint % route.length;
  const target = route[waypoint];
  const dx = target.x - state.pos.x;
  const dz = target.z - state.pos.z;
  const dist = Math.hypot(dx, dz);

  if (dist <= arriveRadius) {
    waypoint = (waypoint + 1) % route.length;
  }

  const desiredHeading = Math.atan2(dx, dz);
  const heading = turnToward(state.heading, desiredHeading, turnRate * dt);
  const step = speed * dt;
  const pos = {
    x: state.pos.x + Math.sin(heading) * step,
    z: state.pos.z + Math.cos(heading) * step,
  };
  return { pos, heading, waypoint };
}
