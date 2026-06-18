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

// ---------------------------------------------------------------------------
// Intersections & deterministic per-road identity
// ---------------------------------------------------------------------------

// FNV-1a style string hash → unsigned 32-bit. Deterministic, no Math.random,
// so the same road id always yields the same variation (arrow type, parking
// gating, etc.). Mirrors the deterministic-seed style in rishonMap.coreFurniture.
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Half-length span of a road along its long axis, as a [min,max] on that axis.
function axisSpan(road: RoadDef): [number, number] {
  const c = road.horizontal ? road.x : road.z;
  return [c - road.length / 2, c + road.length / 2];
}

export interface Intersection { x: number; z: number }

// All points where a horizontal road crosses a vertical road, deduped by
// rounded position. Pure + deterministic: iterate roads in input order, only
// horizontal-vs-vertical pairs, keep the crossing if each road's cross-axis
// coordinate falls inside the other road's long-axis span. This is the basis
// for stop lines and lane arrows (markings only appear at real junctions).
export function roadIntersections(roads: RoadDef[]): Intersection[] {
  const hs = roads.filter((r) => r.horizontal);
  const vs = roads.filter((r) => !r.horizontal);
  const seen = new Set<string>();
  const out: Intersection[] = [];
  for (const h of hs) {
    const [hx0, hx1] = axisSpan(h); // h spans x in [hx0,hx1] at z = h.z
    for (const v of vs) {
      const [vz0, vz1] = axisSpan(v); // v spans z in [vz0,vz1] at x = v.x
      // crossing at (v.x, h.z): v.x must lie on h, h.z must lie on v.
      if (v.x < hx0 - 1e-6 || v.x > hx1 + 1e-6) continue;
      if (h.z < vz0 - 1e-6 || h.z > vz1 + 1e-6) continue;
      const key = `${Math.round(v.x * 100)}:${Math.round(h.z * 100)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ x: v.x, z: h.z });
    }
  }
  return out;
}

export const STOP_LINE_W = 0.5;  // thickness of the stop bar along the road
export const STOP_LINE_CLEAR = ROAD_W / 2 + CROSSWALK_STRIPE_GAP +
  4 * (CROSSWALK_STRIPE_W + CROSSWALK_STRIPE_GAP) + STOP_LINE_W / 2; // just past the crosswalk bands

// Stop-line bars across each approach of a road at the intersections it passes
// through, sitting just OUTSIDE the crosswalk bands (which reach ROAD_W/2 +
// gap + 4*period along the approach). Two bars per intersection the road
// crosses (one each side), each spanning the road's running-lane half-width so
// it reads as a stop bar, not a full-width band. Pure + deterministic.
export function stopLineRects(road: RoadDef, intersections: Intersection[]): Rect[] {
  const out: Rect[] = [];
  const halfLen = road.length / 2;
  for (const it of intersections) {
    // does this intersection lie on this road?
    if (road.horizontal) {
      if (Math.abs(it.z - road.z) > 1e-6) continue;
      if (Math.abs(it.x - road.x) > halfLen + 1e-6) continue;
    } else {
      if (Math.abs(it.x - road.x) > 1e-6) continue;
      if (Math.abs(it.z - road.z) > halfLen + 1e-6) continue;
    }
    for (const side of [-1, 1] as const) {
      const t = side * STOP_LINE_CLEAR;
      if (road.horizontal) {
        const cx = it.x + t;
        if (Math.abs(cx - road.x) > halfLen + 1e-6) continue;
        // half-width bar on the approaching (right-hand) lane of this side
        const laneOff = (side > 0 ? 1 : -1) * ROAD_W / 4;
        out.push({ x: cx, z: road.z + laneOff, w: STOP_LINE_W, d: ROAD_W / 2 });
      } else {
        const cz = it.z + t;
        if (Math.abs(cz - road.z) > halfLen + 1e-6) continue;
        const laneOff = (side > 0 ? -1 : 1) * ROAD_W / 4;
        out.push({ x: road.x + laneOff, z: cz, w: ROAD_W / 2, d: STOP_LINE_W });
      }
    }
  }
  return out;
}

export const ARROW_PX = 16; // texels per side of the arrow glyph texture

export type ArrowKind = "straight" | "left" | "right";

// Pick an arrow kind for one approach deterministically from the road id and a
// per-approach index, so a road's approaches read varied but stable. Most
// approaches get a straight arrow; some get a turn arrow.
export function arrowKindFor(roadId: string, approachIndex: number): ArrowKind {
  const h = hashId(`${roadId}#${approachIndex}`);
  const m = h % 4;
  if (m === 0) return "left";
  if (m === 1) return "right";
  return "straight"; // 2/4 chance straight, dominant
}

// Pure-data RGBA glyph for a blocky lane arrow pointing along +rows (toward the
// top of the texture). White arrow on transparent; a shaft plus a chevron head,
// with a left/right kink for turn arrows. Mirrors sidewalkTilePattern's
// node-testable, canvas-free style. transparent where alpha = 0.
export function arrowPattern(kind: ArrowKind, px = ARROW_PX): Uint8Array<ArrayBuffer> {
  const ink = hexToRgb(PALETTE.laneLine);
  const data = new Uint8Array(new ArrayBuffer(px * px * 4));
  const set = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= px || y >= px) return;
    const o = (y * px + x) * 4;
    data[o] = ink[0]; data[o + 1] = ink[1]; data[o + 2] = ink[2]; data[o + 3] = 255;
  };
  const cx = Math.floor(px / 2);
  const shaftHalf = Math.max(1, Math.round(px * 0.09));
  const headRows = Math.round(px * 0.42); // top portion is the head
  // shaft (lower 2/3), straight up the centre.
  for (let y = headRows; y < px; y++) {
    for (let x = cx - shaftHalf; x <= cx + shaftHalf; x++) set(x, y);
  }
  // arrow head: a filled triangle widening toward the base of the head.
  for (let y = 0; y < headRows; y++) {
    const half = Math.round((y / headRows) * (px * 0.34));
    for (let x = cx - half; x <= cx + half; x++) set(x, y);
  }
  if (kind !== "straight") {
    // bend the shaft sideways at the bottom so it reads as a turn arrow:
    // add a horizontal stub toward the turn direction near the base.
    const dir = kind === "left" ? -1 : 1;
    const baseY = px - 1 - shaftHalf;
    const reach = Math.round(px * 0.3);
    for (let i = 0; i <= reach; i++) {
      const x = cx + dir * i;
      for (let yy = baseY - shaftHalf; yy <= baseY + shaftHalf; yy++) set(x, yy);
    }
  }
  return data;
}

// Placement of a lane arrow on one approach of a road toward an intersection.
// `rotationY` orients the glyph (which is authored pointing along +z toward the
// texture top) so it points INTO the intersection along the approach.
export interface ArrowPlacement { x: number; z: number; rotationY: number; kind: ArrowKind }

export const ARROW_BACK = STOP_LINE_CLEAR + 3; // distance back from the junction

// Lane arrows on the approaches to the intersections a road crosses. Only the
// longer roads (length >= minLength) get arrows, so they read as the wider/core
// streets the spec calls for; short district streets stay clean. Deterministic
// arrow kind per approach via arrowKindFor. One arrow per approach, set back
// from the junction in the right-hand running lane.
export function laneArrows(
  road: RoadDef,
  intersections: Intersection[],
  minLength = 80,
): ArrowPlacement[] {
  if (road.length < minLength) return [];
  const out: ArrowPlacement[] = [];
  const halfLen = road.length / 2;
  let approach = 0;
  for (const it of intersections) {
    if (road.horizontal) {
      if (Math.abs(it.z - road.z) > 1e-6) continue;
      if (Math.abs(it.x - road.x) > halfLen + 1e-6) continue;
    } else {
      if (Math.abs(it.x - road.x) > 1e-6) continue;
      if (Math.abs(it.z - road.z) > halfLen + 1e-6) continue;
    }
    for (const side of [-1, 1] as const) {
      // approach origin is the junction; the arrow sits ARROW_BACK away on the
      // approach side and points toward the junction (-side along the axis).
      const pos = (road.horizontal ? it.x : it.z) + side * ARROW_BACK;
      const onAxis = road.horizontal ? road.x : road.z;
      if (Math.abs(pos - onAxis) > halfLen + 1e-6) continue;
      const laneOff = (road.horizontal
        ? (side > 0 ? 1 : -1)
        : (side > 0 ? -1 : 1)) * ROAD_W / 4;
      const kind = arrowKindFor(road.id, approach);
      // glyph points along +z by default; rotate so its tip faces the junction.
      let rot: number;
      if (road.horizontal) {
        // junction is toward -side in x; +z glyph → rotate -90deg points +x.
        rot = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        out.push({ x: pos, z: road.z + laneOff, rotationY: rot, kind });
      } else {
        rot = side > 0 ? Math.PI : 0;
        out.push({ x: road.x + laneOff, z: pos, rotationY: rot, kind });
      }
      approach++;
    }
  }
  return out;
}

export const PARKING_BAY_LEN = 5.5;  // one bay along the curb
export const PARKING_BAY_GAP = 1.0;  // gap between bays
export const PARKING_LINE_W = 0.12;  // painted bay-line thickness
export const PARKING_BAY_DEPTH = 2.2; // bay reach from the curb inward

// Does a non-core road get parking bays? Deterministic subset: every road whose
// id-hash mod 3 is 0, and never the core arterials (they keep their clean
// painted treatment). Pure so the gating is unit-testable.
export function hasParkingBays(road: RoadDef): boolean {
  if (isCoreArterial(road)) return false;
  return hashId(road.id) % 3 === 0;
}

// Painted bay outlines along the sidewalk-adjacent edge of a qualifying road.
// Each bay is drawn as three thin white rects (two ticks perpendicular to the
// curb + one line parallel to it), segmented along the curb on BOTH edges.
// Pure + deterministic; merged by the caller.
export function parkingBayRects(road: RoadDef): Rect[] {
  if (!hasParkingBays(road)) return [];
  const period = PARKING_BAY_LEN + PARKING_BAY_GAP;
  const count = Math.max(0, Math.floor(road.length / period));
  const span = count * period;
  const start = -span / 2 + PARKING_BAY_GAP + PARKING_BAY_LEN / 2;
  // bay strip sits just inside the curb: from ROAD_W/2 inward by PARKING_BAY_DEPTH.
  const edgeMid = ROAD_W / 2 - PARKING_BAY_DEPTH;
  const out: Rect[] = [];
  for (const sideSign of [-1, 1] as const) {
    for (let i = 0; i < count; i++) {
      const t = start + i * period;
      // inner divider line, parallel to the curb, one per bay run handled via ticks:
      if (road.horizontal) {
        const zEdge = road.z + sideSign * edgeMid;
        // parallel line along the bay
        out.push({ x: road.x + t, z: zEdge, w: PARKING_BAY_LEN, d: PARKING_LINE_W });
        // two perpendicular ticks bounding the bay
        for (const e of [-1, 1] as const) {
          const tx = road.x + t + e * PARKING_BAY_LEN / 2;
          const zc = road.z + sideSign * (ROAD_W / 2 - PARKING_BAY_DEPTH / 2);
          out.push({ x: tx, z: zc, w: PARKING_LINE_W, d: PARKING_BAY_DEPTH });
        }
      } else {
        const xEdge = road.x + sideSign * edgeMid;
        out.push({ x: xEdge, z: road.z + t, w: PARKING_LINE_W, d: PARKING_BAY_LEN });
        for (const e of [-1, 1] as const) {
          const tz = road.z + t + e * PARKING_BAY_LEN / 2;
          const xc = road.x + sideSign * (ROAD_W / 2 - PARKING_BAY_DEPTH / 2);
          out.push({ x: xc, z: tz, w: PARKING_BAY_DEPTH, d: PARKING_LINE_W });
        }
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

  // Intersections drive stop lines + lane arrows. Computed once from the whole
  // network so junctions between any horizontal/vertical pair are marked.
  const intersections = roadIntersections(roads);

  // Stop-line bars just outside the crosswalk at each approach, merged into one
  // mesh. Painted with the crosswalk (warm-white) color, a hair above the
  // crosswalk layer so they never z-fight.
  const stopGeos: THREE.BufferGeometry[] = [];
  for (const r of roads) {
    for (const s of stopLineRects(r, intersections)) {
      const g = new THREE.PlaneGeometry(s.w, s.d);
      g.rotateX(-Math.PI / 2);
      g.translate(s.x, 0.033, s.z); // above the crosswalk bands
      stopGeos.push(g);
    }
  }
  if (stopGeos.length) {
    const stopMat = getMaterial("crosswalkMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.crosswalk }));
    const stop = new THREE.Mesh(mergeGeometries(stopGeos), stopMat);
    stop.castShadow = false; stop.receiveShadow = true;
    group.add(stop);
  }

  // Lane arrows on the approaches to junctions, on the longer roads only. One
  // instanced draw per arrow kind (shared per-kind DataTexture quad).
  const arrowsByKind: Record<ArrowKind, Placement[]> = { straight: [], left: [], right: [] };
  for (const r of roads) {
    for (const a of laneArrows(r, intersections)) {
      arrowsByKind[a.kind].push({ x: a.x, z: a.z, rotationY: a.rotationY });
    }
  }
  for (const kind of ["straight", "left", "right"] as const) {
    const places = arrowsByKind[kind];
    if (!places.length) continue;
    const geo = getGeometry(`laneArrow-${kind}`, () => {
      const g = new THREE.PlaneGeometry(2.2, 2.8);
      g.rotateX(-Math.PI / 2); // lie flat; glyph top points along +z
      return g;
    });
    const mat = getMaterial(`laneArrowMat-${kind}`, () => {
      const tex = new THREE.DataTexture(arrowPattern(kind), ARROW_PX, ARROW_PX, THREE.RGBAFormat);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    });
    const mesh = makeInstanced(geo, mat, places, 0.034); // above stop lines
    mesh.castShadow = false; mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Parking-bay outlines along a deterministic subset of non-core roads,
  // merged into one mesh painted with the lane-line color.
  const bayGeos: THREE.BufferGeometry[] = [];
  for (const r of roads) {
    for (const b of parkingBayRects(r)) {
      const g = new THREE.PlaneGeometry(b.w, b.d);
      g.rotateX(-Math.PI / 2);
      g.translate(b.x, 0.03, b.z);
      bayGeos.push(g);
    }
  }
  if (bayGeos.length) {
    const bayMat = getMaterial("laneDashMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.laneLine }));
    const bays = new THREE.Mesh(mergeGeometries(bayGeos), bayMat);
    bays.castShadow = false; bays.receiveShadow = true;
    group.add(bays);
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
