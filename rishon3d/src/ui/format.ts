// Formats a horizontal speed (m/s) as a rounded km/h badge string.
export function formatSpeed(metersPerSec: number): string {
  const v = Number.isFinite(metersPerSec) ? Math.max(0, metersPerSec) : 0;
  return `${Math.round(v * 3.6)} km/h`;
}
