// rishon3d/src/core/sky.ts
import * as THREE from "three";

// Compass azimuth: 0 = north (+Z), 90 = east (+X). Elevation: degrees above
// the horizon. Returns a unit vector from the origin toward the sun.
export function sunDirection(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const cosEl = Math.cos(el);
  return new THREE.Vector3(cosEl * Math.sin(az), Math.sin(el), cosEl * Math.cos(az)).normalize();
}

// The single source of truth for the bright, sunny "toy-city" look (matching the
// City-Craft reference: bright blue sky, but with enough directional contrast and
// reduced flat fill that ambient occlusion and sun shadows read as form).
// Consumed by Engine (sky + lights + exposure + fog) and builders (window glow).
export const DAY = {
  sunElevationDeg: 40,     // afternoon sun -> longer soft shadows, more form
  sunAzimuthDeg: 135,      // SE, gives pleasant angled shadows
  turbidity: 1.2,          // very clear -> minimal white haze at the horizon
  rayleigh: 2.7,           // deep, saturated blue gradient (still daytime, not navy)
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  exposure: 1.03,          // slight lift to keep the scene bright after the fill cut
  hemiSky: 0xbfe3ff,       // bright sky-blue fill from above
  hemiGround: 0x7fa45a,    // green bounce from the ground
  hemiIntensity: 0.75,     // reduced flat fill so AO + shadows read (was 1.15)
  sunColor: 0xfff1d6,      // slightly warmer near-white daylight key
  sunIntensity: 2.3,       // a touch brighter key for directional contrast
  ambientColor: 0xcfe2f7,  // cool sky ambient
  ambientIntensity: 0.28,  // reduced so contact shadows stay visible (was 0.45)
  fogColor: 0xcfe6ff,      // sky-matched light blue haze for far-distance depth
  fogDensity: 0.0012,      // very low -> only the far skyline desaturates
  windowEmissive: 0x9fc4e8, // cool daytime window tint
  windowEmissiveIntensity: 0.18, // subtle window grid, not glowing
} as const;

export function sunPosition(distance: number): THREE.Vector3 {
  return sunDirection(DAY.sunElevationDeg, DAY.sunAzimuthDeg).multiplyScalar(distance);
}
