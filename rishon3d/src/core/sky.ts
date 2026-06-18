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
  sunElevationDeg: 2,     // lower -> stronger reddening across the whole sky
  sunAzimuthDeg: 290,     // WNW, where the sun sets
  turbidity: 5,           // less haze -> much smaller, tighter sun glow
  rayleigh: 3,            // keeps the blue-to-orange sunset gradient
  mieCoefficient: 0.0025, // dim halo -> sun reads as a small disc, not a blob
  mieDirectionalG: 0.97,  // very tight forward scatter -> small concentrated sun
  exposure: 0.58,         // lower so the sun halo doesn't clip white over a huge area
  fogColor: 0xe8a262,     // warm dusk haze matching the horizon glow
  fogNear: 50,
  fogFar: 200,
  hemiSky: 0xffd9a8,
  hemiGround: 0x4a4036,
  hemiIntensity: 0.9,     // more soft sky fill -> brighter, less harsh contrast
  sunColor: 0xff9a4e,     // warmer orange -> low sunset glow, not midday key
  sunIntensity: 1.35,     // softened -> sun reads as gentle sunset, not strong
  ambientColor: 0x5a6a86, // cool sky fill
  ambientIntensity: 0.6,  // lifted shadows so the map stays readable
  windowEmissive: 0xffd27a,
  windowEmissiveIntensity: 0.45,
  // Bloom: high threshold so ONLY lit windows / sun disc glow, not the whole
  // bright sky (which otherwise blooms into a screen-wide white-out at dusk).
  bloomStrength: 0.3,
  bloomRadius: 0.3,
  bloomThreshold: 0.9,
} as const;

export function sunPosition(distance: number): THREE.Vector3 {
  return sunDirection(DUSK.sunElevationDeg, DUSK.sunAzimuthDeg).multiplyScalar(distance);
}
