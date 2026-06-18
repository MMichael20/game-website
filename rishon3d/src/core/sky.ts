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

// The single source of truth for the bright midday "toy-city" look.
// Consumed by Engine (sky + lights + exposure) and builders (window glow).
export const DAY = {
  sunElevationDeg: 58,     // high midday sun -> short, soft shadows
  sunAzimuthDeg: 135,      // SE, gives pleasant angled shadows
  turbidity: 1.2,          // very clear -> minimal white haze at the horizon
  rayleigh: 2.7,           // deep, saturated blue gradient (still daytime, not navy)
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  exposure: 1.0,           // neutral; colors read at face value
  hemiSky: 0xbfe3ff,       // bright sky-blue fill from above
  hemiGround: 0x7fa45a,    // green bounce from the ground
  hemiIntensity: 1.15,     // strong, even fill -> flat poster shading
  sunColor: 0xfff4e0,      // near-white warm daylight key
  sunIntensity: 2.1,       // bright key, soft shadows
  ambientColor: 0xcfe2f7,  // cool sky ambient
  ambientIntensity: 0.45,  // lifts shadows so colors stay readable
  windowEmissive: 0x9fc4e8, // cool daytime window tint
  windowEmissiveIntensity: 0.18, // subtle window grid, not glowing
} as const;

export function sunPosition(distance: number): THREE.Vector3 {
  return sunDirection(DAY.sunElevationDeg, DAY.sunAzimuthDeg).multiplyScalar(distance);
}
