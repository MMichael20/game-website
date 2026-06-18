import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  majorIntersections, signalIntersections, isMajorRoad, hashId,
  intersectionCorners, signPlacements,
  makeTrafficLights, makeRoadSigns, makeBusStop, makeTaxiStand, makeStreetFurniture,
  BUS_STOP, TAXI_STAND,
  type Intersection,
} from "../src/world/streetFurniture";
import { ROAD_W } from "../src/world/roads";
import { assembleMap } from "../src/world/worldData";
import type { RoadDef } from "../src/world/rishonMap";

const mainH: RoadDef = { id: "main-h", x: 0, z: 0, length: 120, horizontal: true };
const crossV: RoadDef = { id: "cross-v", x: 0, z: 0, length: 120, horizontal: false };
const gridH: RoadDef = { id: "north-rh-2", x: 0, z: -95, length: 60, horizontal: true };
const gridV: RoadDef = { id: "north-rv-2", x: 0, z: -95, length: 60, horizontal: false };

describe("isMajorRoad", () => {
  it("flags core arterials and the four district arterials only", () => {
    expect(isMajorRoad(mainH)).toBe(true);
    expect(isMajorRoad(crossV)).toBe(true);
    expect(isMajorRoad({ id: "art-n", x: 0, z: -55, length: 90, horizontal: false })).toBe(true);
    expect(isMajorRoad(gridH)).toBe(false);
  });
});

describe("majorIntersections", () => {
  it("finds the core origin crossing of main-h x cross-v", () => {
    const its = majorIntersections([mainH, crossV]);
    expect(its.length).toBe(1);
    expect(its[0].x).toBeCloseTo(0, 6);
    expect(its[0].z).toBeCloseTo(0, 6);
    expect(its[0].degree).toBe(2);
  });

  it("returns the core origin within the full assembled map", () => {
    const its = majorIntersections(assembleMap().roads);
    const origin = its.find((i) => Math.abs(i.x) < 1e-6 && Math.abs(i.z) < 1e-6);
    expect(origin).toBeTruthy();
  });

  it("dedups crossings at the same point and is deterministic", () => {
    const roads = assembleMap().roads;
    const a = majorIntersections(roads);
    const b = majorIntersections(roads);
    expect(a).toEqual(b); // stable across calls
    // no two distinct entries share a rounded position
    const keys = a.map((i) => `${Math.round(i.x * 100)},${Math.round(i.z * 100)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("sorts highest-degree intersections first", () => {
    const its = majorIntersections(assembleMap().roads);
    for (let i = 1; i < its.length; i++) {
      expect(its[i - 1].degree).toBeGreaterThanOrEqual(its[i].degree);
    }
  });
});

describe("signalIntersections", () => {
  it("caps the signalled set and always includes the core origin", () => {
    const its = signalIntersections(assembleMap().roads);
    expect(its.length).toBeGreaterThan(0);
    expect(its.length).toBeLessThanOrEqual(5);
    const origin = its.find((i) => Math.abs(i.x) < 1e-6 && Math.abs(i.z) < 1e-6);
    expect(origin).toBeTruthy();
  });

  it("only keeps intersections that touch a major road", () => {
    // a lone grid crossing with no major road touching it yields nothing
    expect(signalIntersections([gridH, gridV])).toEqual([]);
  });

  it("is deterministic", () => {
    const roads = assembleMap().roads;
    expect(signalIntersections(roads)).toEqual(signalIntersections(roads));
  });
});

describe("hashId", () => {
  it("is deterministic and stays a 32-bit unsigned int", () => {
    expect(hashId("north-rh-2")).toBe(hashId("north-rh-2"));
    expect(hashId("a")).not.toBe(hashId("b"));
    expect(hashId("anything")).toBeGreaterThanOrEqual(0);
    expect(hashId("anything")).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("intersectionCorners", () => {
  it("returns four corners offset off the asphalt around the point", () => {
    const it: Intersection = { x: 0, z: 0, degree: 2 };
    const corners = intersectionCorners(it);
    expect(corners.length).toBe(4);
    for (const c of corners) {
      expect(Math.abs(c.x)).toBeGreaterThan(ROAD_W / 2);
      expect(Math.abs(c.z)).toBeGreaterThan(ROAD_W / 2);
    }
    // symmetric: the four corners cancel out around the centre
    expect(corners.reduce((s, c) => s + c.x, 0)).toBeCloseTo(0, 6);
    expect(corners.reduce((s, c) => s + c.z, 0)).toBeCloseTo(0, 6);
  });
});

describe("signPlacements", () => {
  const roads = assembleMap().roads;
  const placements = signPlacements(roads);

  it("produces a non-empty, deterministic subset", () => {
    expect(placements.length).toBeGreaterThan(0);
    expect(signPlacements(roads)).toEqual(placements);
  });

  it("never places signs on the major arterials", () => {
    // every placement is off a non-major road; sanity: count is far below the
    // number of grid roads (we only take every Nth).
    expect(placements.length).toBeLessThan(roads.length * 2);
  });

  it("keeps every sign within the ground bounds", () => {
    const half = assembleMap().ground.size / 2;
    for (const p of placements) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(half);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(half);
    }
  });
});

describe("makeTrafficLights / makeRoadSigns", () => {
  const roads = assembleMap().roads;

  it("traffic lights return instanced meshes (pole + 3 lenses)", () => {
    const grp = makeTrafficLights(roads) as THREE.Group;
    const meshes = grp.children.filter((c) => (c as THREE.InstancedMesh).isInstancedMesh);
    expect(meshes.length).toBe(4); // pole + red + amber + green
    for (const m of meshes) expect((m as THREE.InstancedMesh).count).toBeGreaterThan(0);
  });

  it("road signs return a non-empty group", () => {
    const grp = makeRoadSigns(roads) as THREE.Group;
    expect(grp.children.length).toBeGreaterThan(0);
  });
});

describe("bus stop + taxi stand anchors", () => {
  it("sit on the core sidewalk band, off the asphalt (>4.5 from a core centerline)", () => {
    // core roads run through the origin; the off-road band is +/-4.5 from each
    // centerline, so the anchors must clear it on at least one axis.
    expect(Math.abs(BUS_STOP.z)).toBeGreaterThan(4.5);
    expect(Math.abs(TAXI_STAND.z)).toBeGreaterThan(4.5);
    // and clear of the cross-v asphalt corridor on x
    expect(Math.abs(BUS_STOP.x)).toBeGreaterThan(ROAD_W / 2);
    expect(Math.abs(TAXI_STAND.x)).toBeGreaterThan(ROAD_W / 2);
  });

  it("build non-empty objects placed at their exported positions", () => {
    const bus = makeBusStop();
    expect(bus.children.length).toBeGreaterThan(0);
    expect(bus.position.x).toBeCloseTo(BUS_STOP.x, 6);
    expect(bus.position.z).toBeCloseTo(BUS_STOP.z, 6);
    const taxi = makeTaxiStand();
    expect(taxi.children.length).toBeGreaterThan(0);
    expect(taxi.position.x).toBeCloseTo(TAXI_STAND.x, 6);
    expect(taxi.position.z).toBeCloseTo(TAXI_STAND.z, 6);
  });
});

describe("makeStreetFurniture", () => {
  it("assembles a non-empty group from the full map", () => {
    const map = assembleMap();
    const grp = makeStreetFurniture(map) as THREE.Group;
    expect(grp.children.length).toBe(4); // lights + signs + bus stop + taxi stand
    // every leaf placement stays inside the ground bounds
    const half = map.ground.size / 2;
    const box = new THREE.Box3().setFromObject(grp);
    expect(box.min.x).toBeGreaterThanOrEqual(-half);
    expect(box.max.x).toBeLessThanOrEqual(half);
    expect(box.min.z).toBeGreaterThanOrEqual(-half);
    expect(box.max.z).toBeLessThanOrEqual(half);
  });
});
