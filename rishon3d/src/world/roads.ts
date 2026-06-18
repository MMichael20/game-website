import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RoadDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";
import { PALETTE } from "./palette";

export const ROAD_W = 6;
const SIDEWALK_W = 1.6;
const DASH_LEN = 2;
const DASH_GAP = 2;

export interface Rect { x: number; z: number; w: number; d: number }

// Core arterials get the painted treatment (double-yellow + crosswalks);
// every other road keeps the cheap white dashes.
const CORE_ROAD_IDS = new Set(["main-h", "cross-v"]);
export function isCoreArterial(road: RoadDef): boolean {
  return CORE_ROAD_IDS.has(road.id);
}

// Dashed center line. Dashes run along the road's long axis, centered on it.
// Core arterials are painted with a solid double-yellow instead (see
// doubleYellowRects), so they are skipped here.
export function laneDashes(road: RoadDef): Placement[] {
  if (isCoreArterial(road)) return [];
  const period = DASH_LEN + DASH_GAP;
  const count = Math.max(0, Math.floor(road.length / period));
  const span = count * period;
  const start = -span / 2 + period / 2;
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const t = start + i * period;
    if (road.horizontal) {
      out.push({ x: road.x + t, z: road.z, rotationY: Math.PI / 2 });
    } else {
      out.push({ x: road.x, z: road.z + t, rotationY: 0 });
    }
  }
  return out;
}

export const YELLOW_LINE_W = 0.16;   // each painted yellow stripe
export const YELLOW_LINE_GAP = 0.18; // gap between the two yellow stripes

// Solid double-yellow center line for the core arterials: two thin stripes
// straddling the road centerline, running its full length. Returns [] for any
// non-core road so the caller can keep dashed lines elsewhere.
export function doubleYellowRects(road: RoadDef): Rect[] {
  if (!isCoreArterial(road)) return [];
  const off = (YELLOW_LINE_GAP + YELLOW_LINE_W) / 2;
  if (road.horizontal) {
    return [
      { x: road.x, z: road.z - off, w: road.length, d: YELLOW_LINE_W },
      { x: road.x, z: road.z + off, w: road.length, d: YELLOW_LINE_W },
    ];
  }
  return [
    { x: road.x - off, z: road.z, w: YELLOW_LINE_W, d: road.length },
    { x: road.x + off, z: road.z, w: YELLOW_LINE_W, d: road.length },
  ];
}

export const CROSSWALK_STRIPE_W = 0.45; // width of each painted band
export const CROSSWALK_STRIPE_GAP = 0.4; // gap between bands

// Crosswalk stripe bands laid across one road's asphalt at the central
// intersection (x=0, z=0). Bands span the full road width and march along the
// road's long axis just outside the intersection box, leaving the crossing
// square clear. Pure + deterministic so it is unit-testable. Returns [] for
// roads that do not pass through the core intersection.
export function crosswalkRects(road: RoadDef): Rect[] {
  if (!isCoreArterial(road)) return [];
  const period = CROSSWALK_STRIPE_W + CROSSWALK_STRIPE_GAP;
  // Start the bands just past the half-width of the crossing road (ROAD_W),
  // so they sit on the approach lanes, not inside the intersection square.
  const inner = ROAD_W / 2 + CROSSWALK_STRIPE_GAP;
  const bands = 4; // bands per approach
  const out: Rect[] = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < bands; i++) {
      const t = side * (inner + i * period + CROSSWALK_STRIPE_W / 2);
      if (road.horizontal) {
        // bands cross the road (run along z), marching along x
        out.push({ x: road.x + t, z: road.z, w: CROSSWALK_STRIPE_W, d: ROAD_W });
      } else {
        out.push({ x: road.x, z: road.z + t, w: ROAD_W, d: CROSSWALK_STRIPE_W });
      }
    }
  }
  return out;
}

export const CURB_W = 0.3;
export const CURB_H = 0.12;

// Thin raised strips just outside each asphalt edge.
export function curbRects(road: RoadDef): Rect[] {
  const off = ROAD_W / 2 + CURB_W / 2;
  if (road.horizontal) {
    return [
      { x: road.x, z: road.z - off, w: road.length, d: CURB_W },
      { x: road.x, z: road.z + off, w: road.length, d: CURB_W },
    ];
  }
  return [
    { x: road.x - off, z: road.z, w: CURB_W, d: road.length },
    { x: road.x + off, z: road.z, w: CURB_W, d: road.length },
  ];
}

// Two concrete strips flanking the asphalt.
export function sidewalkRects(road: RoadDef): Rect[] {
  const off = ROAD_W / 2 + SIDEWALK_W / 2;
  if (road.horizontal) {
    return [
      { x: road.x, z: road.z - off, w: road.length, d: SIDEWALK_W },
      { x: road.x, z: road.z + off, w: road.length, d: SIDEWALK_W },
    ];
  }
  return [
    { x: road.x - off, z: road.z, w: SIDEWALK_W, d: road.length },
    { x: road.x + off, z: road.z, w: SIDEWALK_W, d: road.length },
  ];
}

export const TILE_M = 1.2; // target sidewalk tile size in metres
const TILE_PX = 16;        // texels per tile cell
const TILE_GROUT = 2;      // grout line thickness in texels

// One tile cell of the sidewalk: a light slab body with darker grout along two
// edges, so RepeatWrapping yields a continuous grout grid. Pure RGBA pixels (no
// canvas/DOM) so it is unit-testable under node, mirroring windowPattern.
export function sidewalkTilePattern(px = TILE_PX, grout = TILE_GROUT): Uint8Array<ArrayBuffer> {
  const slab = hexToRgb(PALETTE.sidewalk);
  const line = hexToRgb(PALETTE.sidewalkGrout);
  const data = new Uint8Array(new ArrayBuffer(px * px * 4));
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const o = (y * px + x) * 4;
      const isGrout = x < grout || y < grout; // two edges → seamless grid when tiled
      const c = isGrout ? line : slab;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  return data;
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

// One shared sidewalk-tile DataTexture; per-strip clones carry their own repeat
// so each tile stays ~TILE_M regardless of strip length.
export function makeSidewalkTexture(): THREE.DataTexture {
  const pixels = sidewalkTilePattern();
  const tex = new THREE.DataTexture(pixels, TILE_PX, TILE_PX, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export function makeRoadNetwork(roads: RoadDef[]): THREE.Group {
  const group = new THREE.Group();
  const asphalt = getMaterial("asphalt", () => new THREE.MeshStandardMaterial({ color: PALETTE.asphalt }));

  const tileTex = makeSidewalkTexture();

  for (const r of roads) {
    const w = r.horizontal ? r.length : ROAD_W;
    const d = r.horizontal ? ROAD_W : r.length;
    const surf = new THREE.Mesh(getGeometry(`road-${w}x${d}`, () => new THREE.PlaneGeometry(w, d)), asphalt);
    surf.rotation.x = -Math.PI / 2;
    surf.position.set(r.x, 0.02, r.z);
    surf.receiveShadow = true;
    group.add(surf);

    for (const s of sidewalkRects(r)) {
      // Tile the sidewalk: clone the shared texture and set repeat per strip so
      // each cell is ~TILE_M on a side along both axes.
      const tex = tileTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(s.w / TILE_M)), Math.max(1, Math.round(s.d / TILE_M)));
      const mat = new THREE.MeshStandardMaterial({ map: tex });
      const sw = new THREE.Mesh(getGeometry(`sidewalk-${s.w}x${s.d}`, () => new THREE.PlaneGeometry(s.w, s.d)), mat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(s.x, 0.015, s.z); // just below the asphalt to avoid z-fight at edges
      sw.receiveShadow = true;
      group.add(sw);
    }
  }

  const curbGeos: THREE.BufferGeometry[] = [];
  for (const r of roads) {
    for (const c of curbRects(r)) {
      const g = new THREE.BoxGeometry(c.w, CURB_H, c.d);
      g.translate(c.x, CURB_H / 2, c.z);
      curbGeos.push(g);
    }
  }
  if (curbGeos.length) {
    const curbMat = getMaterial("curbMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.curb }));
    const curb = new THREE.Mesh(mergeGeometries(curbGeos), curbMat);
    curb.receiveShadow = true; curb.castShadow = false;
    group.add(curb);
  }

  // Crosswalk stripe bands at the core intersection, merged into one mesh.
  const crossGeos: THREE.BufferGeometry[] = [];
  for (const r of roads) {
    for (const c of crosswalkRects(r)) {
      const g = new THREE.PlaneGeometry(c.w, c.d);
      g.rotateX(-Math.PI / 2);
      g.translate(c.x, 0.031, c.z); // above asphalt, below the dash layer
      crossGeos.push(g);
    }
  }
  if (crossGeos.length) {
    const crossMat = getMaterial("crosswalkMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.crosswalk }));
    const cross = new THREE.Mesh(mergeGeometries(crossGeos), crossMat);
    cross.castShadow = false; cross.receiveShadow = true;
    group.add(cross);
  }

  // Solid double-yellow center line on the core arterials, merged into one mesh.
  const yellowGeos: THREE.BufferGeometry[] = [];
  for (const r of roads) {
    for (const y of doubleYellowRects(r)) {
      const g = new THREE.PlaneGeometry(y.w, y.d);
      g.rotateX(-Math.PI / 2);
      g.translate(y.x, 0.032, y.z); // just above asphalt
      yellowGeos.push(g);
    }
  }
  if (yellowGeos.length) {
    const yellowMat = getMaterial("yellowLineMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.yellowLine }));
    const yellow = new THREE.Mesh(mergeGeometries(yellowGeos), yellowMat);
    yellow.castShadow = false; yellow.receiveShadow = true;
    group.add(yellow);
  }

  // White center-line dashes for the non-core roads, in a single instanced draw.
  const dashes = roads.flatMap(laneDashes);
  if (dashes.length) {
    const dashGeo = getGeometry("laneDash", () => {
      const g = new THREE.PlaneGeometry(0.18, DASH_LEN);
      g.rotateX(-Math.PI / 2); // lie flat; long axis along +z
      return g;
    });
    const dashMat = getMaterial("laneDashMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.laneLine }));
    const mesh = makeInstanced(dashGeo, dashMat, dashes, 0.03); // above asphalt
    mesh.castShadow = false;
    group.add(mesh);
  }
  return group;
}
