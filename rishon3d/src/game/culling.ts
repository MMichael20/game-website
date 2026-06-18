// Squared-distance range check (no sqrt). Used to skip updating/rendering
// agents far from the camera.
export function inRange(dx: number, dz: number, radius: number): boolean {
  return dx * dx + dz * dz <= radius * radius;
}
