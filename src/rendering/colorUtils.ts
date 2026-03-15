/** Darken a numeric color by a percentage (0-1) */
export function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount)) | 0;
  const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount)) | 0;
  const b = Math.max(0, (color & 0xff) * (1 - amount)) | 0;
  return (r << 16) | (g << 8) | b;
}

/** Lighten a numeric color by a percentage (0-1) */
export function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * amount) | 0;
  const g = Math.min(255, ((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * amount) | 0;
  const b = Math.min(255, (color & 0xff) + (255 - (color & 0xff)) * amount) | 0;
  return (r << 16) | (g << 8) | b;
}

/** Convert a CSS hex string like '#FFDBB4' to a numeric color */
export function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
