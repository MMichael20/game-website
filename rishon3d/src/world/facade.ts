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
// FACADE TYPES: the ground floor reads as a building PURPOSE. A `type` selects
// how the base + body grid are drawn so a street mixes recognizable identities:
//   - shop:       bright storefront glass + a cool sign band + display mullions;
//                 sparser upper windows.
//   - restaurant: warm storefront (warm/lit accents) + a warm sign band + a
//                 door notch; warmer-feeling glass.
//   - apartment:  a regular grid of SMALLER windows on ALL floors + a modest
//                 door entry (no big storefront glass) — the "many identical
//                 windows" look.
//   - office:     a uniform cool curtain-wall glass grid + a clean glass lobby
//                 (big glass + door) at the base; minimal sign.
// ALL types keep the cornice/parapet top row and a DOOR mark in the base row.
//
// ORIENTATION: rows are stored bottom-up. Row 0 is the BOTTOM pixel row of
// the facade (street level / storefront); the last row is the TOP (cornice).
// THREE.DataTexture defaults to flipY=false, so data row 0 maps to UV v=0,
// which on a BoxGeometry side face is the bottom of the wall. That makes the
// storefront land at the building base and the cornice at the top with no
// flip needed (see makeFacadeTexture + facade.test.ts).

// The four deterministic ground-floor identities a building can read as.
export type FacadeType = "shop" | "restaurant" | "apartment" | "office";

export interface FacadeOpts {
  // body/wall color (defaults to a neutral so the helper is usable standalone)
  color?: number;
  // draw a ground-floor storefront band (false for plain towers / houses)
  storefront?: boolean;
  // height in pixels of one "cell" (window or wall) — keeps panels chunky
  cell?: number;
  // ground-floor identity; defaults to "shop" so legacy callers are unchanged
  type?: FacadeType;
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
  const type: FacadeType = opts.type ?? "shop";
  const c = Math.max(1, Math.round(cols));
  const f = Math.max(2, Math.round(floors));
  const { w, h } = facadeSize(c, f, cell);
  const data = new Uint8Array(new ArrayBuffer(w * h * 4));
  const rng = mulberry32(seed);

  const wall = new THREE.Color(opts.color ?? 0xcdc6ba);
  const frame = new THREE.Color(PALETTE.frame);
  const glass = new THREE.Color(PALETTE.glass);
  const glassDark = new THREE.Color(PALETTE.glassDark);
  const cornice = new THREE.Color(PALETTE.cornice);
  const door = new THREE.Color(PALETTE.facadeDoor);

  // Per-type body window glass + sign colors. Office uses a single cool curtain
  // glass for the uniform look; restaurant warms its glass toward the lit sign;
  // shop/apartment keep the default cool glass pair.
  const officeGlass = new THREE.Color(PALETTE.officeGlass);
  const signWarm = new THREE.Color(PALETTE.signWarm);
  const signCool = new THREE.Color(PALETTE.signCool);
  const signLit = new THREE.Color(PALETTE.signLit);
  const storefrontGlass = new THREE.Color(PALETTE.storefront);
  // restaurant storefront glass leans warm (storefront glass nudged toward the
  // lit-sign amber) so its windows feel like a warm-lit interior.
  const warmGlass = storefrontGlass.clone().lerp(signLit, 0.4);

  // Whole facade starts as the wall field.
  fillRect(data, w, 0, 0, w, h, wall);

  // Subtle stucco grain on the wall field, applied BEFORE windows/cornice/
  // storefront are drawn over it, so the visible wall margins read as textured
  // plaster instead of one flat slab. Deterministic per pixel via a hash of
  // (x,y,seed) so it does NOT consume the window `rng` (keeps the window grid —
  // and the facade tests — byte-identical to before except for wall pixels).
  const wr = Math.round(wall.r * 255), wg = Math.round(wall.g * 255), wb = Math.round(wall.b * 255);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hsh = (Math.imul(x + 1, 0x1f1f1f) ^ Math.imul(y + 1, 0x2d2d2d) ^ Math.imul(seed | 1, 0x9e3779b1)) >>> 0;
      const j = 0.94 + (hsh % 13) / 100; // 0.94..1.06 brightness jitter
      const o = (y * w + x) * 4;
      data[o] = Math.max(0, Math.min(255, Math.round(wr * j)));
      data[o + 1] = Math.max(0, Math.min(255, Math.round(wg * j)));
      data[o + 2] = Math.max(0, Math.min(255, Math.round(wb * j)));
    }
  }

  // Floor 0 (bottom) is the storefront/entry when requested; floor f-1 (top) is
  // the cornice. The remaining middle floors carry the standard window grid.
  const corniceFloor = f - 1;
  const storefrontFloor = 0;

  // ---- standard window floors (the body grid) ----
  // A window occupies the inner part of each cell; a frame mullion border
  // separates panels, giving the readable grid in city-walk.png. Per-type the
  // window size and lit/glass mix differ so the body reads with the base:
  //   - apartment: SMALLER windows (thicker wall margin) repeated identically
  //     on every floor — the "lots of identical windows" look.
  //   - office: a UNIFORM cool curtain-wall — every panel the same office glass.
  //   - shop: sparser upper windows (some cells left as blank wall).
  //   - restaurant: warm-tinted glass mix.
  const apartment = type === "apartment";
  const office = type === "office";
  // mullion thickness — apartments get thicker walls (smaller window panes).
  const margin = apartment
    ? Math.max(1, Math.floor(cell * 0.3))
    : Math.max(1, Math.floor(cell * 0.18));
  for (let row = 0; row < f; row++) {
    if (row === corniceFloor) continue;
    if (storefront && row === storefrontFloor) continue;
    const y0 = row * cell;
    for (let col = 0; col < c; col++) {
      const x0 = col * cell;
      // shop upper floors are sparser: skip ~1 in 4 cells as blank wall.
      if (type === "shop" && rng() < 0.22) continue;
      // mullion frame around the panel
      fillRect(data, w, x0, y0, x0 + cell, y0 + cell, frame);
      // glass panel inset — per-type fill:
      let panel: THREE.Color;
      if (office) {
        panel = officeGlass; // uniform curtain wall
      } else if (type === "restaurant") {
        panel = rng() < 0.5 ? warmGlass : glass;
      } else {
        // shop + apartment: deterministic light/shaded cool glass mix
        panel = rng() < 0.5 ? glass : glassDark;
      }
      fillRect(data, w, x0 + margin, y0 + margin, x0 + cell - margin, y0 + cell - margin, panel);
    }
  }

  // ---- cornice / trim band along the very top (parapet) ----
  fillRect(data, w, 0, corniceFloor * cell, w, corniceFloor * cell + cell, cornice);

  // ---- ground-floor base band (storefront / entry) along the bottom ----
  // Each type draws its own base, but ALL keep a DOOR mark in this row and a
  // sign/lintel strip across the top of the band.
  if (storefront) {
    const y0 = storefrontFloor * cell;
    // sign-band height — at least 2px so a warm band + lit accent both read.
    const lintelH = Math.max(2, Math.floor(cell * 0.28));
    const bandTop = y0 + cell;        // top edge of the base band
    const glassTop = bandTop - lintelH; // glass fills below the sign band

    // door geometry shared by all types: a dark facadeDoor notch ~one column
    // wide, centered, rising most of the band.
    const doorW = Math.max(2, Math.floor(cell * 0.9));
    const doorX0 = Math.floor((w - doorW) / 2);
    const doorTop = glassTop - 1; // door rises just under the sign band

    if (type === "apartment") {
      // modest masonry base: NO big storefront glass. A plain wall plinth with
      // a centered door + a slim entry lintel (no bright sign).
      fillRect(data, w, 0, y0, w, bandTop, wall);
      // entry lintel strip (subtle, body-derived) just under the first floor
      const plinth = wall.clone().lerp(cornice, 0.5);
      fillRect(data, w, 0, glassTop, w, bandTop, plinth);
      // centered door
      fillRect(data, w, doorX0, y0, doorX0 + doorW, doorTop, door);
    } else {
      // shop / restaurant / office: a bright glass storefront / lobby spanning
      // the band, divided by slim frames, with a colored sign band on top.
      // restaurant warms the glass; office uses its cool curtain glass.
      const baseGlass = type === "restaurant"
        ? warmGlass
        : office
          ? officeGlass
          : storefrontGlass;
      fillRect(data, w, 0, y0, w, bandTop, frame);
      fillRect(data, w, 1, y0 + 1, w - 1, glassTop - 1, baseGlass);
      // bright vertical mullions splitting the big glass into shop bays / display
      // windows (one per column).
      const bay = Math.max(cell, Math.floor(w / Math.max(1, c)));
      for (let x = 0; x < w; x += bay) fillRect(data, w, x, y0 + 1, x + 1, glassTop - 1, frame);
      // centered dark entrance door cut into the storefront glass.
      fillRect(data, w, doorX0, y0 + 1, doorX0 + doorW, doorTop, door);
      // colored SIGN BAND across the top of the base band. shop=cool, office=
      // a slim cool sign (minimal), restaurant=warm with a lit-accent stripe.
      const signColor = type === "restaurant" ? signWarm : signCool;
      fillRect(data, w, 0, glassTop, w, bandTop, signColor);
      if (type === "restaurant") {
        // a thin lit (amber) accent stripe along the TOP edge of the warm sign
        // band (always at least 1px, even when the band is a single pixel).
        const litY = Math.max(glassTop, bandTop - 1);
        fillRect(data, w, 0, litY, w, bandTop, signLit);
      }
    }
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

export function facadeCacheKey(
  cols: number,
  floors: number,
  color: number,
  storefront: boolean,
  type: FacadeType = "shop",
): string {
  // bucket floors so 9 vs 10 floors share a texture
  const floorBucket = Math.min(8, Math.round(floors / 2));
  const colBucket = Math.min(8, cols);
  // include type so the four identities never collide in the cache
  return `${colBucket}|${floorBucket}|${colorBucket(color)}|${storefront ? 1 : 0}|${type}`;
}

export function makeFacadeTexture(
  cols: number,
  floors: number,
  opts: FacadeOpts = {},
): THREE.DataTexture {
  const color = opts.color ?? 0xcdc6ba;
  const storefront = opts.storefront ?? true;
  const type: FacadeType = opts.type ?? "shop";
  const key = facadeCacheKey(cols, floors, color, storefront, type);
  const cached = FACADE_CACHE.get(key);
  if (cached) return cached;

  // Use a seed derived from the quantized key so the same bucket is identical.
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;

  const { w, h } = facadeSize(Math.max(1, Math.round(cols)), Math.max(2, Math.round(floors)), opts.cell ?? CELL);
  const pixels = facadePattern(cols, floors, seed, { ...opts, color, storefront, type });
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
