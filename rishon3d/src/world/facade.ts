import * as THREE from "three";
import { mulberry32 } from "./rng";
import { PALETTE } from "./palette";

// Procedural ALBEDO facade texture for a city building. Unlike windows.ts
// (which is an emissive-only "lit windows" map and so invisible in daylight),
// this draws the whole readable facade as visible color: a wall field in the
// building body color, a grid of cool-blue glass window panels separated by
// light mullion frames, a darker cornice/trim band along the TOP, and a
// glass storefront band along the BOTTOM 1-2 rows (large glass + a colored
// lintel/sign). Pure pixel data (no canvas/DOM) so it is node-testable.
//
// ORIENTATION: rows are stored bottom-up. Row 0 is the BOTTOM pixel row of
// the facade (street level / storefront); the last row is the TOP (cornice).
// THREE.DataTexture defaults to flipY=false, so data row 0 maps to UV v=0,
// which on a BoxGeometry side face is the bottom of the wall. That makes the
// storefront land at the building base and the cornice at the top with no
// flip needed (see makeFacadeTexture + facade.test.ts).

export interface FacadeOpts {
  // body/wall color (defaults to a neutral so the helper is usable standalone)
  color?: number;
  // draw a ground-floor storefront band (false for plain towers / houses)
  storefront?: boolean;
  // height in pixels of one "cell" (window or wall) — keeps panels chunky
  cell?: number;
}

// Resolution per facade cell. Each window column/floor becomes a `cell`-sized
// block of pixels so the NearestFilter grid reads as crisp chunky panels.
const CELL = 6;

function put(data: Uint8Array, w: number, x: number, y: number, c: THREE.Color): void {
  const o = (y * w + x) * 4;
  data[o] = Math.round(c.r * 255);
  data[o + 1] = Math.round(c.g * 255);
  data[o + 2] = Math.round(c.b * 255);
  data[o + 3] = 255;
}

function fillRect(
  data: Uint8Array, w: number, x0: number, y0: number, x1: number, y1: number, c: THREE.Color,
): void {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(data, w, x, y, c);
}

// Pixel dimensions of a facade for the given window grid. Each window column
// and each floor occupies `cell` pixels; the texture is sized to fit the grid
// exactly so the 1:1 height mapping pins storefront/cornice to base/top.
export function facadeSize(cols: number, floors: number, cell = CELL): { w: number; h: number } {
  return { w: Math.max(1, cols) * cell, h: Math.max(1, floors) * cell };
}

// Pure RGBA facade pixels (length w*h*4). `cols` = window columns, `floors` =
// number of floors top-to-bottom INCLUDING the storefront and cornice floors.
// `seed` makes the per-panel glass shade / lit accents deterministic.
export function facadePattern(
  cols: number,
  floors: number,
  seed: number,
  opts: FacadeOpts = {},
): Uint8Array<ArrayBuffer> {
  const cell = opts.cell ?? CELL;
  const storefront = opts.storefront ?? true;
  const c = Math.max(1, Math.round(cols));
  const f = Math.max(2, Math.round(floors));
  const { w, h } = facadeSize(c, f, cell);
  const data = new Uint8Array(new ArrayBuffer(w * h * 4));
  const rng = mulberry32(seed);

  const wall = new THREE.Color(opts.color ?? 0xcdc6ba);
  const frame = new THREE.Color(PALETTE.frame);
  const glass = new THREE.Color(PALETTE.glass);
  const glassDark = new THREE.Color(PALETTE.glassDark);
  const storefrontGlass = new THREE.Color(PALETTE.storefront);
  const cornice = new THREE.Color(PALETTE.cornice);
  // warm lintel/sign over the storefront — derived from the body color so each
  // building's sign harmonizes; nudged toward a saturated accent.
  const lintel = wall.clone().lerp(new THREE.Color(PALETTE.awningRed), 0.35);

  // Whole facade starts as the wall field.
  fillRect(data, w, 0, 0, w, h, wall);

  // Floor 0 (bottom) is the storefront when requested; floor f-1 (top) is the
  // cornice. The remaining middle floors carry the standard window grid.
  const corniceFloor = f - 1;
  const storefrontFloor = 0;

  // ---- standard window floors (the body grid) ----
  // A window occupies the inner part of each cell; a frame mullion border
  // separates panels, giving the readable grid in city-walk.png.
  const margin = Math.max(1, Math.floor(cell * 0.18)); // mullion thickness
  for (let row = 0; row < f; row++) {
    if (row === corniceFloor) continue;
    if (storefront && row === storefrontFloor) continue;
    const y0 = row * cell;
    for (let col = 0; col < c; col++) {
      const x0 = col * cell;
      // mullion frame around the panel
      fillRect(data, w, x0, y0, x0 + cell, y0 + cell, frame);
      // glass panel inset — a deterministic mix of light/shaded glass + a few
      // warm-lit accents so the grid has life like the target.
      const panel = rng() < 0.5 ? glass : glassDark;
      fillRect(data, w, x0 + margin, y0 + margin, x0 + cell - margin, y0 + cell - margin, panel);
    }
  }

  // ---- cornice / trim band along the very top ----
  fillRect(data, w, 0, corniceFloor * cell, w, corniceFloor * cell + cell, cornice);

  // ---- ground-floor storefront band along the bottom ----
  if (storefront) {
    const y0 = storefrontFloor * cell;
    // a thin colored lintel/sign strip just under the first window floor
    const lintelH = Math.max(1, Math.floor(cell * 0.28));
    // large storefront glass spanning the floor, divided by slim frames
    fillRect(data, w, 0, y0, w, y0 + cell, frame);
    fillRect(data, w, 1, y0 + 1, w - 1, y0 + cell - lintelH - 1, storefrontGlass);
    // bright vertical mullions splitting the big glass into shop bays (one per column)
    const bay = Math.max(cell, Math.floor(w / Math.max(1, c)));
    for (let x = 0; x < w; x += bay) fillRect(data, w, x, y0 + 1, x + 1, y0 + cell - lintelH - 1, frame);
    // colored lintel/sign across the top of the storefront band
    fillRect(data, w, 0, y0 + cell - lintelH, w, y0 + cell, lintel);
  }

  return data;
}

// Derive a sane window-grid (columns, floors) from a building's world size.
// ~5m per floor and ~3.5m per window column matches the chunky target scale.
export function gridFromDef(width: number, height: number): { cols: number; floors: number } {
  const cols = Math.max(2, Math.round(width / 3.5));
  const floors = Math.max(3, Math.round(height / 5)); // >=3 so storefront+cornice+body fit
  return { cols, floors };
}

// --- texture cache ------------------------------------------------------
// ~60-70 buildings would each allocate a texture; we quantize the key so they
// collapse to a handful of unique DataTextures (memory + perf). The body color
// is bucketed coarsely (the albedo grid dominates the look, the exact body
// tint is applied by the material `color`/tint at render time).
const FACADE_CACHE = new Map<string, THREE.DataTexture>();

function colorBucket(color: number): number {
  const c = new THREE.Color(color);
  const q = (v: number) => Math.round(v * 4); // 5 buckets per channel
  return (q(c.r) << 8) | (q(c.g) << 4) | q(c.b);
}

export function facadeCacheKey(cols: number, floors: number, color: number, storefront: boolean): string {
  // bucket floors so 9 vs 10 floors share a texture
  const floorBucket = Math.min(8, Math.round(floors / 2));
  const colBucket = Math.min(8, cols);
  return `${colBucket}|${floorBucket}|${colorBucket(color)}|${storefront ? 1 : 0}`;
}

export function makeFacadeTexture(
  cols: number,
  floors: number,
  opts: FacadeOpts = {},
): THREE.DataTexture {
  const color = opts.color ?? 0xcdc6ba;
  const storefront = opts.storefront ?? true;
  const key = facadeCacheKey(cols, floors, color, storefront);
  const cached = FACADE_CACHE.get(key);
  if (cached) return cached;

  // Use a seed derived from the quantized key so the same bucket is identical.
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;

  const { w, h } = facadeSize(Math.max(1, Math.round(cols)), Math.max(2, Math.round(floors)), opts.cell ?? CELL);
  const pixels = facadePattern(cols, floors, seed, { ...opts, color, storefront });
  const tex = new THREE.DataTexture(pixels, w, h, THREE.RGBAFormat);
  // No vertical repeat: mapped 1:1 so storefront stays at the base, cornice at
  // the top. flipY=false (DataTexture default) keeps row 0 at v=0 (bottom).
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  FACADE_CACHE.set(key, tex);
  return tex;
}

export function facadeCacheSize(): number {
  return FACADE_CACHE.size;
}
