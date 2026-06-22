// Pure orbit-camera math, unit-tested independently of three.js.

export interface Offset3 { x: number; y: number; z: number }

export const MIN_PITCH = 0.15; // ~8.6deg, keeps camera above the ground
export const MAX_PITCH = 1.3; // ~74.5deg, stops just short of straight-down

export function clampPitch(pitch: number): number {
  return Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));
}

// Camera position offset from the target: orbit at `yaw` around Y, raised by `pitch`.
// yaw 0 / pitch 0 => directly behind on +Z at full distance.
export function cameraOffset(yaw: number, pitch: number, distance: number): Offset3 {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return {
    x: Math.sin(yaw) * cp * distance,
    y: sp * distance,
    z: Math.cos(yaw) * cp * distance,
  };
}

// Wall-aware pull-in: given a ray cast from the player's head toward where the
// camera wants to sit, turn the hit time-of-impact into the distance the camera
// should actually sit at. `hitToi` is the distance to the nearest obstacle (with
// a unit ray direction) or null when the line is clear. We back off the hit by
// `skin` so the near plane clears the wall, and never go closer than `minDist`.
export function clampCameraDistance(
  hitToi: number | null,
  desiredDist: number,
  skin: number,
  minDist: number,
): number {
  if (hitToi === null) return desiredDist;
  return Math.max(minDist, Math.min(desiredDist, hitToi - skin));
}
