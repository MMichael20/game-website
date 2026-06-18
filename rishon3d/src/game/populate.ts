import type { RishonMap, Vec2, RoadDef } from "../world/rishonMap";
import { mulberry32 } from "../world/rng";
import { DISTRICTS } from "../world/worldData";

export interface PopulationBudget {
  pedestrians: number;
  cats: number;
  dogs: number;
}

export interface Populations {
  pedestrians: Vec2[];
  cats: Vec2[];
  dogs: Vec2[];
  carRoutes: Vec2[][];
}

// Sample a point on a road, offset slightly to a side lane.
function pointOnRoad(road: RoadDef, t: number, laneOffset: number): Vec2 {
  if (road.horizontal) {
    return { x: road.x - road.length / 2 + t * road.length, z: road.z + laneOffset };
  }
  return { x: road.x + laneOffset, z: road.z - road.length / 2 + t * road.length };
}

function sampleOnRoads(roads: RoadDef[], count: number, rng: () => number): Vec2[] {
  const out: Vec2[] = [];
  if (roads.length === 0) return out;
  for (let i = 0; i < count; i++) {
    const road = roads[Math.floor(rng() * roads.length)];
    const lane = (rng() < 0.5 ? -1 : 1) * (1.5 + rng() * 1.0);
    out.push(pointOnRoad(road, rng(), lane));
  }
  return out;
}

// A clockwise rectangular loop around a district center, on the arterial ring.
function districtLoop(center: Vec2, half: number): Vec2[] {
  return [
    { x: center.x - half, z: center.z - half },
    { x: center.x + half, z: center.z - half },
    { x: center.x + half, z: center.z + half },
    { x: center.x - half, z: center.z + half },
  ];
}

export function planPopulations(map: RishonMap, seed: number, budget: PopulationBudget): Populations {
  const rng = mulberry32(seed);
  const roads = map.roads;

  const pedestrians = sampleOnRoads(roads, budget.pedestrians, rng);
  const cats = sampleOnRoads(roads, budget.cats, rng);
  const dogs = sampleOnRoads(roads, budget.dogs, rng);

  // One traffic loop per district, plus a big loop around downtown.
  const carRoutes: Vec2[][] = [
    districtLoop({ x: 0, z: 0 }, 50),
    ...DISTRICTS.map((d) => districtLoop(d.center, d.size / 2 - 4)),
  ];

  return { pedestrians, cats, dogs, carRoutes };
}
