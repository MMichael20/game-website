// rishon3d/src/world/streetFurniture.ts
// Structural street furniture (traffic lights, road signs, bus stop, taxi
// stand) derived deterministically from the road network. Everything is
// instanced or merged so the whole layer stays a flat, browser-friendly draw
// budget. No Math.random / Date.now — placement is hashed off road ids and
// positions so a given map always yields the same furniture.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RishonMap, RoadDef } from "./rishonMap";
import { getGeometry, getMaterial } from "./assets";
import { makeInstanced, type Placement } from "./InstancedProps";
import { PALETTE } from "./palette";
import { ROAD_W } from "./roads";

// --- pure helpers -----------------------------------------------------------

export interface Intersection {
  x: number;
  z: number;
  degree: number; // how many road centerlines pass through this point
}

// A road is "major" if it is one of the hand-authored core arterials or one of
// the four district arterials. Traffic lights only ever go on these so the
// signal count stays tiny regardless of how many district grid roads exist.
export function isMajorRoad(road: RoadDef): boolean {
  return road.id === "main-h" || road.id === "cross-v" || road.id.startsWith("art-");
}

// Does a point fall on a road's centerline span (within a small tolerance)?
function onRoad(road: RoadDef, x: number, z: number, tol = 1e-6): boolean {
  if (road.horizontal) {
    return Math.abs(z - road.z) <= tol && Math.abs(x - road.x) <= road.length / 2 + tol;
  }
  return Math.abs(x - road.x) <= tol && Math.abs(z - road.z) <= road.length / 2 + tol;
}

// Find where a horizontal road and a vertical road cross. A horizontal road is
// the line z = h.z over x in [h.x - len/2, h.x + len/2]; a vertical road is the
// line x = v.x over z in [v.z - len/2, v.z + len/2]. They cross at (v.x, h.z)
// when that point lies on both spans.
function crossingPoint(h: RoadDef, v: RoadDef): { x: number; z: number } | null {
  const x = v.x;
  const z = h.z;
  if (onRoad(h, x, z) && onRoad(v, x, z)) return { x, z };
  return null;
}

// All horizontal x vertical crossings among `roads`, deduped by rounded
// position, each tagged with its degree (number of road centerlines through
// it) and sorted deterministically (highest degree first, then by position) so
// callers can take a stable, capped prefix. Pure + node-testable.
export function majorIntersections(roads: RoadDef[]): Intersection[] {
  const horiz = roads.filter((r) => r.horizontal);
  const vert = roads.filter((r) => !r.horizontal);
  const byKey = new Map<string, Intersection>();
  for (const h of horiz) {
    for (const v of vert) {
      const p = crossingPoint(h, v);
      if (!p) continue;
      const key = `${Math.round(p.x * 100)},${Math.round(p.z * 100)}`;
      if (!byKey.has(key)) byKey.set(key, { x: p.x, z: p.z, degree: 0 });
    }
  }
  // Degree = how many roads (of any orientation) pass through the point.
  for (const it of byKey.values()) {
    it.degree = roads.reduce((n, r) => n + (onRoad(r, it.x, it.z) ? 1 : 0), 0);
  }
  return [...byKey.values()].sort(
    (a, b) => b.degree - a.degree || a.x - b.x || a.z - b.z,
  );
}

// The few intersections that earn a full set of traffic signals. The player
// sees the core origin on foot, so it is always first; then we add one gateway
// per arterial — the major-road crossing nearest the origin along that arterial
// — and finally fall back to the highest-degree remaining major crossings. The
// result is capped so perf stays flat no matter how dense the district grids
// get. Deterministic.
export function signalIntersections(roads: RoadDef[], cap = 5): Intersection[] {
  const majorRoads = roads.filter(isMajorRoad);
  const onMajor = (it: Intersection) =>
    majorRoads.some((r) => onRoad(r, it.x, it.z));
  const candidates = majorIntersections(roads).filter(onMajor);

  const picked: Intersection[] = [];
  const seen = new Set<string>();
  const key = (it: Intersection) => `${Math.round(it.x * 100)},${Math.round(it.z * 100)}`;
  const take = (it: Intersection | undefined) => {
    if (!it || seen.has(key(it))) return;
    seen.add(key(it));
    picked.push(it);
  };

  // 1. Core origin always.
  take(candidates.find((it) => Math.abs(it.x) < 1e-6 && Math.abs(it.z) < 1e-6));

  // 2. One gateway per arterial: of the crossings sitting on that arterial,
  //    take the one nearest the origin (the district entrance).
  for (const a of majorRoads.filter((r) => r.id.startsWith("art-"))) {
    const onThis = candidates
      .filter((it) => onRoad(a, it.x, it.z))
      .sort((p, q) => Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z));
    take(onThis[0]);
  }

  // 3. Fill any remaining slots with the highest-degree leftovers.
  for (const it of candidates) take(it);

  return picked.slice(0, cap);
}

// 32-bit string hash (FNV-1a). Deterministic; used to vary sign placement per
// road id without Math.random.
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// The four corners of an intersection, offset diagonally onto the sidewalk band
// so a pole sits just off the asphalt. Deterministic order.
export function intersectionCorners(it: Intersection, off = ROAD_W / 2 + 1.1): Placement[] {
  const out: Placement[] = [];
  // Face the signal head back toward the crossing centre.
  const dirs: [number, number, number][] = [
    [-1, -1, Math.PI * 0.25],
    [1, -1, Math.PI * 0.75],
    [1, 1, Math.PI * 1.25],
    [-1, 1, Math.PI * 1.75],
  ];
  for (const [sx, sz, rotationY] of dirs) {
    out.push({ x: it.x + sx * off, z: it.z + sz * off, rotationY });
  }
  return out;
}

// Sign posts along a deterministic subset of roadsides. We pick every Nth road
// by id hash, then place a couple of posts along that road on the sidewalk
// band. Returns placements (rotation faces the road). Pure + testable.
export function signPlacements(roads: RoadDef[], everyN = 3): Placement[] {
  const off = ROAD_W / 2 + 1.0; // sidewalk band, off the asphalt
  const out: Placement[] = [];
  for (const r of roads) {
    if (isMajorRoad(r)) continue;          // keep the big arterials clean
    if (hashId(r.id) % everyN !== 0) continue; // deterministic subset
    if (r.length < 12) continue;            // skip stubby grid roads
    const h = hashId(r.id);
    const side = (h & 1) === 0 ? 1 : -1;    // which roadside, hashed
    // Two posts: a quarter in from each end along the road's long axis.
    const ts = [-r.length / 4, r.length / 4];
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      if (r.horizontal) {
        out.push({ x: r.x + t, z: r.z + side * off, rotationY: 0 });
      } else {
        out.push({ x: r.x + side * off, z: r.z + t, rotationY: Math.PI / 2 });
      }
    }
  }
  return out;
}

// --- geometry builders ------------------------------------------------------

const POLE_DARK = () =>
  getMaterial("sfPoleMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.lampPole }));

// A traffic-light assembly: a dark pole (cylinder) topped by a signal-head box.
// Geometry is shared across all corners; the three coloured lenses are separate
// emissive meshes (like the streetlight lantern) so red/amber/green glow without
// adding any point lights. Vertical offsets are baked in so one instance matrix
// places the whole pole.
const POLE_H = 3.4;
const HEAD_Y = POLE_H + 0.45;

function trafficPoleGeo(): THREE.BufferGeometry {
  return getGeometry("sfTrafficPole", () => {
    const pole = new THREE.CylinderGeometry(0.07, 0.09, POLE_H, 8);
    pole.translate(0, POLE_H / 2, 0);
    const housing = new THREE.BoxGeometry(0.34, 0.95, 0.28);
    housing.translate(0, HEAD_Y, 0);
    return mergeGeometries([pole, housing]);
  });
}

// One emissive lens box at a given height, shared geometry per colour.
function lensGeo(key: string, y: number): THREE.BufferGeometry {
  return getGeometry(key, () => {
    const g = new THREE.BoxGeometry(0.2, 0.2, 0.12);
    g.translate(0, y, 0.12);
    return g;
  });
}

function emissiveMat(key: string, hex: number): THREE.Material {
  return getMaterial(key, () =>
    new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.3 }),
  );
}

// All traffic lights for the map, as instanced meshes (one per piece, shared
// across every corner of every signalled intersection). Returns a Group.
export function makeTrafficLights(roads: RoadDef[]): THREE.Group {
  const group = new THREE.Group();
  const corners: Placement[] = [];
  for (const it of signalIntersections(roads)) {
    corners.push(...intersectionCorners(it));
  }
  if (corners.length === 0) return group;

  group.add(makeInstanced(trafficPoleGeo(), POLE_DARK(), corners, 0));
  // Red / amber / green lenses, top to bottom on the housing.
  group.add(makeInstanced(lensGeo("sfLensR", HEAD_Y + 0.28), emissiveMat("sfRed", 0xff3b30), corners, 0));
  group.add(makeInstanced(lensGeo("sfLensA", HEAD_Y), emissiveMat("sfAmber", 0xffb02e), corners, 0));
  group.add(makeInstanced(lensGeo("sfLensG", HEAD_Y - 0.28), emissiveMat("sfGreen", 0x34c759), corners, 0));
  return group;
}

// Road signs: a thin pole with a small coloured panel near the top. One pole
// instanced mesh + one panel instanced mesh. The panel colour cycles per index
// (deterministic) via a small set of merged-colour panel geos.
const SIGN_H = 2.4;

function signPoleGeo(): THREE.BufferGeometry {
  return getGeometry("sfSignPole", () => {
    const g = new THREE.CylinderGeometry(0.045, 0.05, SIGN_H, 6);
    g.translate(0, SIGN_H / 2, 0);
    return g;
  });
}

function signPanelGeo(): THREE.BufferGeometry {
  return getGeometry("sfSignPanel", () => {
    const g = new THREE.BoxGeometry(0.5, 0.5, 0.06);
    g.translate(0, SIGN_H - 0.15, 0);
    return g;
  });
}

export function makeRoadSigns(roads: RoadDef[]): THREE.Group {
  const group = new THREE.Group();
  const placements = signPlacements(roads);
  if (placements.length === 0) return group;
  group.add(makeInstanced(signPoleGeo(), POLE_DARK(), placements, 0));
  // Panel colour split deterministically by placement order so signs read as a
  // mix of green street signs and blue info signs without per-sign materials.
  const green = placements.filter((_, i) => i % 2 === 0);
  const blue = placements.filter((_, i) => i % 2 === 1);
  if (green.length)
    group.add(makeInstanced(signPanelGeo(), getMaterial("sfSignGreen", () => new THREE.MeshStandardMaterial({ color: 0x2f6b4a })), green, 0));
  if (blue.length)
    group.add(makeInstanced(signPanelGeo(), getMaterial("sfSignBlue", () => new THREE.MeshStandardMaterial({ color: 0x2980b9 })), blue, 0));
  return group;
}

// --- bus stop + taxi stand (gameplay anchors) -------------------------------

// Stable world positions on the core sidewalk band (offset > 4.5 from a core
// road centerline so they survive the off-road prop filter and sit on concrete,
// not asphalt). Exported so a later wave can anchor car pickup here.
export const BUS_STOP = { x: -16, z: 5.5 } as const;
export const TAXI_STAND = { x: 16, z: -5.5 } as const;

// A simple bus-shelter: a flat roof on two posts with a bench underneath.
// Merged into a single geometry (one draw call) and dropped at BUS_STOP.
export function makeBusStop(): THREE.Object3D {
  const group = new THREE.Group();
  group.position.set(BUS_STOP.x, 0, BUS_STOP.z);

  const frameGeos: THREE.BufferGeometry[] = [];
  // Two posts.
  for (const px of [-1.1, 1.1]) {
    const g = new THREE.BoxGeometry(0.14, 2.4, 0.14);
    g.translate(px, 1.2, -0.4);
    frameGeos.push(g);
  }
  // Flat roof slab.
  const roof = new THREE.BoxGeometry(2.8, 0.16, 1.1);
  roof.translate(0, 2.4, -0.2);
  frameGeos.push(roof);
  const frame = new THREE.Mesh(
    mergeGeometries(frameGeos),
    getMaterial("sfShelterMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.railConcrete })),
  );
  frame.castShadow = true; frame.receiveShadow = true;
  group.add(frame);

  // Bench under the shelter (reuse the warm bench wood colour).
  const bench = new THREE.Mesh(
    getGeometry("sfStopBench", () => {
      const seat = new THREE.BoxGeometry(2.0, 0.12, 0.4); seat.translate(0, 0.45, -0.5);
      const legL = new THREE.BoxGeometry(0.12, 0.45, 0.4); legL.translate(-0.85, 0.22, -0.5);
      const legR = new THREE.BoxGeometry(0.12, 0.45, 0.4); legR.translate(0.85, 0.22, -0.5);
      return mergeGeometries([seat, legL, legR]);
    }),
    getMaterial("benchMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.benchWood })),
  );
  bench.castShadow = true; bench.receiveShadow = true;
  group.add(bench);

  // A small blue "bus" info sign on a post beside the shelter.
  const sign = new THREE.Mesh(signPanelGeo(), getMaterial("sfSignBlue", () => new THREE.MeshStandardMaterial({ color: 0x2980b9 })));
  sign.position.set(1.7, 0, 0.2);
  group.add(sign);
  const signPole = new THREE.Mesh(signPoleGeo(), POLE_DARK());
  signPole.position.set(1.7, 0, 0.2);
  group.add(signPole);

  return group;
}

// A taxi stand: a marked curb post with a yellow sign panel.
export function makeTaxiStand(): THREE.Object3D {
  const group = new THREE.Group();
  group.position.set(TAXI_STAND.x, 0, TAXI_STAND.z);

  const pole = new THREE.Mesh(signPoleGeo(), POLE_DARK());
  group.add(pole);

  const panel = new THREE.Mesh(
    signPanelGeo(),
    getMaterial("sfTaxiPanel", () => new THREE.MeshStandardMaterial({ color: PALETTE.yellowLine, emissive: PALETTE.yellowLine, emissiveIntensity: 0.25 })),
  );
  group.add(panel);

  // A short painted curb stub to mark the stand on the ground.
  const curb = new THREE.Mesh(
    getGeometry("sfTaxiCurb", () => {
      const g = new THREE.BoxGeometry(2.4, 0.16, 0.5);
      g.translate(0, 0.08, 0.6);
      return g;
    }),
    getMaterial("sfTaxiCurbMat", () => new THREE.MeshStandardMaterial({ color: PALETTE.yellowLine })),
  );
  curb.receiveShadow = true;
  group.add(curb);

  return group;
}

// --- assembly ---------------------------------------------------------------

// All structural street furniture for the map, as one Group. Wire into World.ts
// alongside the other prop instancers.
export function makeStreetFurniture(map: RishonMap): THREE.Object3D {
  const group = new THREE.Group();
  group.add(makeTrafficLights(map.roads));
  group.add(makeRoadSigns(map.roads));
  group.add(makeBusStop());
  group.add(makeTaxiStand());
  return group;
}
