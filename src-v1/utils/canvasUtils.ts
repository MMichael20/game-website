/**
 * Shared pure Canvas2D utility functions.
 * No Phaser dependency — usable in unit tests.
 */

export function hexToComponents(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToComponents(hex);
  const dr = Math.max(0, Math.round(r * (1 - amount)));
  const dg = Math.max(0, Math.round(g * (1 - amount)));
  const db = Math.max(0, Math.round(b * (1 - amount)));
  return `rgb(${dr},${dg},${db})`;
}

export function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToComponents(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr},${lg},${lb})`;
}

/**
 * Get arm Y-offsets for a given walk frame.
 * Must match the offsets used by OffscreenCharacterRenderer.drawArms().
 */
export function getArmOffsets(frame: 0 | 1 | 2, scale: number): { leftDy: number; rightDy: number } {
  switch (frame) {
    case 1:
      return { leftDy: 0, rightDy: -4 * scale };
    case 2:
      return { leftDy: -4 * scale, rightDy: 0 };
    default:
      return { leftDy: 0, rightDy: 0 };
  }
}

/**
 * Interpolate between two hex colors.
 * t=0 returns c1, t=1 returns c2.
 */
export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToComponents(c1);
  const [r2, g2, b2] = hexToComponents(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export interface SkyColors {
  topColor: string;
  bottomColor: string;
  horizonGlow: string;
  starOpacity: number;
}

/**
 * Pure function: given game time in minutes (0-1440), return sky colors.
 * 0=midnight, 360=6am dawn, 720=noon, 1080=6pm dusk, 1440=midnight
 */
export function getSkyColors(gameTimeMinutes: number): SkyColors {
  const t = ((gameTimeMinutes % 1440) + 1440) % 1440;

  if (t < 300) {
    // Midnight to 5am — deep night
    return { topColor: '#050510', bottomColor: '#0a0a2e', horizonGlow: '#1a1a3e', starOpacity: 1.0 };
  } else if (t < 390) {
    // 5am-6:30am — dawn transition
    const p = (t - 300) / 90;
    return {
      topColor: lerpColor('#050510', '#2a1a3a', p),
      bottomColor: lerpColor('#0a0a2e', '#ff6b35', p),
      horizonGlow: lerpColor('#1a1a3e', '#ffa07a', p),
      starOpacity: 1.0 - p,
    };
  } else if (t < 480) {
    // 6:30am-8am — sunrise to morning
    const p = (t - 390) / 90;
    return {
      topColor: lerpColor('#2a1a3a', '#5a8fbf', p),
      bottomColor: lerpColor('#ff6b35', '#87ceeb', p),
      horizonGlow: lerpColor('#ffa07a', '#c8e8ff', p),
      starOpacity: 0,
    };
  } else if (t < 1020) {
    // 8am-5pm — daytime
    const midP = Math.sin(((t - 480) / 540) * Math.PI);
    return {
      topColor: lerpColor('#5a8fbf', '#3a6fa0', midP),
      bottomColor: lerpColor('#87ceeb', '#a8d8f0', midP),
      horizonGlow: lerpColor('#c8e8ff', '#e0f0ff', midP),
      starOpacity: 0,
    };
  } else if (t < 1110) {
    // 5pm-6:30pm — sunset
    const p = (t - 1020) / 90;
    return {
      topColor: lerpColor('#3a6fa0', '#2a1530', p),
      bottomColor: lerpColor('#a8d8f0', '#ff4500', p),
      horizonGlow: lerpColor('#e0f0ff', '#ff8c00', p),
      starOpacity: 0,
    };
  } else if (t < 1200) {
    // 6:30pm-8pm — dusk to night
    const p = (t - 1110) / 90;
    return {
      topColor: lerpColor('#2a1530', '#050510', p),
      bottomColor: lerpColor('#ff4500', '#0a0a2e', p),
      horizonGlow: lerpColor('#ff8c00', '#1a1a3e', p),
      starOpacity: p,
    };
  } else {
    // 8pm-midnight — night
    return { topColor: '#050510', bottomColor: '#0a0a2e', horizonGlow: '#1a1a3e', starOpacity: 1.0 };
  }
}

/**
 * Mulberry32 seeded PRNG. Returns a function that produces
 * deterministic pseudo-random numbers in [0, 1) for a given seed.
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
