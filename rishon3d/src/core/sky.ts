import * as THREE from "three";

// Compass azimuth: 0 = north (+Z), 90 = east (+X). Elevation: degrees above
// the horizon. Returns a unit vector from the origin toward the sun.
export function sunDirection(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const cosEl = Math.cos(el);
  return new THREE.Vector3(cosEl * Math.sin(az), Math.sin(el), cosEl * Math.cos(az)).normalize();
}

// The single source of truth for the "18:45, ~20 min before sunset" look.
// Consumed by Engine (sky + lights + fog + exposure) and builders (window glow).
export const DUSK = {
  sunElevationDeg: 4,     // low but still up -> long shadows, sun visible
  sunAzimuthDeg: 290,     // WNW, where the sun sets
  turbidity: 8,
  rayleigh: 2.5,
  mieCoefficient: 0.008,
  mieDirectionalG: 0.82,
  exposure: 0.5,          // sub-1 -> "a bit dark but sun still out"
  fogColor: 0xe8a262,     // warm dusk haze matching the horizon glow
  fogNear: 50,
  fogFar: 200,
  hemiSky: 0xffd9a8,
  hemiGround: 0x4a4036,
  hemiIntensity: 0.45,
  sunColor: 0xffb060,     // warm golden key light
  sunIntensity: 2.4,
  ambientColor: 0x4a5a78, // cool sky fill
  ambientIntensity: 0.3,
  windowEmissive: 0xffd27a,
  windowEmissiveIntensity: 0.9,
} as const;

export function sunPosition(distance: number): THREE.Vector3 {
  return sunDirection(DUSK.sunElevationDeg, DUSK.sunAzimuthDeg).multiplyScalar(distance);
}
