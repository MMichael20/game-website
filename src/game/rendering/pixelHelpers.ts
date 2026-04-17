// src/game/rendering/pixelHelpers.ts
// Shared low-level drawing primitives used by every procedural texture generator.
// Extract of identical helpers previously duplicated across 6 texture files.

export type Ctx = CanvasRenderingContext2D;

export function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Pixel-perfect filled circle. Used for procedural pixel-art look — do NOT swap
// to ctx.arc() without checking callers; the exact pixelation is load-bearing.
export function circle(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) {
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
}

export function darken(hex: string, amount = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${Math.round(r * f).toString(16).padStart(2, '0')}${Math.round(g * f).toString(16).padStart(2, '0')}${Math.round(b * f).toString(16).padStart(2, '0')}`;
}

export function lighten(hex: string, amount = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = amount;
  return `#${Math.min(255, Math.round(r + (255 - r) * f)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(g + (255 - g) * f)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(b + (255 - b) * f)).toString(16).padStart(2, '0')}`;
}

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}
