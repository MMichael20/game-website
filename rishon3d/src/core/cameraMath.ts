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
