// rishon3d/src/game/itinerary.ts
//
// Builds a randomized, multi-stop "daily routine" for one NPC by chaining short
// activity legs into a single looping route, so every patron lives a varied life
// (eat here, shop there, sit outside, cross the street, visit the park) in a
// different order. Pure + deterministic in the seed (no THREE) -> unit-testable.
// The patron FSM (game/patronRoutine) and entity (entities/Patron) consume the
// resulting Waypoint[] unchanged.

import { mulberry32 } from "../world/rng";
import {
  RESTAURANT_DOOR, RESTAURANT_INSIDE, RESTAURANT_COUNTER,
  BAKERY_DOOR, BAKERY_INSIDE, BAKERY_COUNTER,
  PHONE_SHOP_DOOR, PHONE_SHOP_INSIDE, PHONE_SHOP_COUNTER,
  TAXI_WAIT, CROSSWALK, PATIO_WALK_Z, FAR_WALK_Z,
  PARK_CENTER, PARK_BENCH, seatClusters, CHAIR_OFFSETS, INDOOR_TABLE_SEATS,
  HOUSE_DOOR, CX, type Vec2,
} from "../world/districtPois";
import type { Waypoint, PatronState } from "./patronRoutine";

type Rng = () => number;

const wp = (to: Vec2, state: PatronState, dwell = 0): Waypoint =>
  ({ to: { x: to.x, z: to.z }, state, dwell });
const lane = (x: number): Vec2 => ({ x, z: PATIO_WALK_Z });
const jit = (rng: Rng, base: number, spread: number): number => base + (rng() - 0.5) * spread;
const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

// --- activity legs: each a short sub-route. The patron walks from wherever it is
//     to the first waypoint, so legs concatenate freely. None contain "done". ---

function dineRestaurant(rng: Rng): Waypoint[] {
  const seat = pick(rng, INDOOR_TABLE_SEATS);
  return [
    wp(lane(jit(rng, RESTAURANT_DOOR.x, 4)), "toDoor"),
    wp(RESTAURANT_DOOR, "entering"),
    wp(RESTAURANT_INSIDE, "entering"),
    wp(RESTAURANT_COUNTER, "ordering", jit(rng, 3, 2)),
    wp(seat, "toTable"),
    wp(seat, "seated", jit(rng, 8, 4)),
    wp(RESTAURANT_INSIDE, "leaving"),
    wp(RESTAURANT_DOOR, "leaving"),
  ];
}

function browseBakery(rng: Rng): Waypoint[] {
  return [
    wp(lane(jit(rng, BAKERY_DOOR.x, 4)), "toDoor"),
    wp(BAKERY_DOOR, "entering"),
    wp(BAKERY_INSIDE, "entering"),
    wp(BAKERY_COUNTER, "ordering", jit(rng, 4, 2)),
    wp(BAKERY_INSIDE, "leaving"),
    wp(BAKERY_DOOR, "leaving"),
  ];
}

function browsePhone(rng: Rng): Waypoint[] {
  return [
    wp(lane(jit(rng, PHONE_SHOP_DOOR.x, 4)), "toDoor"),
    wp(PHONE_SHOP_DOOR, "entering"),
    wp(PHONE_SHOP_INSIDE, "entering"),
    wp(PHONE_SHOP_COUNTER, "ordering", jit(rng, 4, 2)),
    wp(PHONE_SHOP_INSIDE, "leaving"),
    wp(PHONE_SHOP_DOOR, "leaving"),
  ];
}

function outdoorDine(rng: Rng): Waypoint[] {
  const c = pick(rng, seatClusters());
  const [dx, dz] = pick(rng, CHAIR_OFFSETS);
  const chair = { x: c.x + dx, z: c.z + dz };
  return [
    wp(lane(c.x), "toTable"),
    wp(chair, "toTable"),
    wp(chair, "seated", jit(rng, 9, 4)),
    wp(lane(c.x), "leaving"),
  ];
}

function visitPark(rng: Rng): Waypoint[] {
  return [
    wp({ x: PARK_CENTER.x, z: PATIO_WALK_Z }, "patrol"),
    wp(PARK_BENCH, "seated", jit(rng, 8, 4)),
    wp({ x: PARK_CENTER.x + 3, z: PATIO_WALK_Z }, "leaving"),
  ];
}

function crossStreet(rng: Rng): Waypoint[] {
  const span = 4 + rng() * 8;
  const dir = rng() < 0.5 ? -1 : 1;
  return [
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "crossing"),
    wp({ x: CROSSWALK.x + dir * span, z: FAR_WALK_Z }, "patrol"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "crossing"),
  ];
}

function stroll(rng: Rng): Waypoint[] {
  return [
    wp(lane(jit(rng, CX, 30)), "patrol"),
    wp(lane(jit(rng, CX, 30)), "waiting", jit(rng, 2, 2)),
  ];
}

// Cross south to the residential lot, linger at the house door, then come back —
// gives the player side of the block visible life and ties NPCs to "home".
function goHome(rng: Rng): Waypoint[] {
  return [
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "crossing"),
    wp({ x: HOUSE_DOOR.x, z: FAR_WALK_Z }, "patrol"),
    wp(HOUSE_DOOR, "waiting", jit(rng, 5, 3)),
    wp({ x: HOUSE_DOOR.x, z: FAR_WALK_Z }, "leaving"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "crossing"),
  ];
}

function waitTaxi(rng: Rng): Waypoint[] {
  return [
    wp(lane(TAXI_WAIT.x), "toCrosswalk"),
    wp(TAXI_WAIT, "waiting", jit(rng, 7, 4)),
    wp(lane(TAXI_WAIT.x - 4), "leaving"),
  ];
}

interface Activity { name: string; build: (rng: Rng) => Waypoint[] }

export const ACTIVITIES: readonly Activity[] = [
  { name: "dineRestaurant", build: dineRestaurant },
  { name: "browseBakery", build: browseBakery },
  { name: "browsePhone", build: browsePhone },
  { name: "outdoorDine", build: outdoorDine },
  { name: "visitPark", build: visitPark },
  { name: "crossStreet", build: crossStreet },
  { name: "stroll", build: stroll },
  { name: "waitTaxi", build: waitTaxi },
  { name: "goHome", build: goHome },
];

export interface Itinerary { waypoints: Waypoint[]; speed: number; activities: string[] }

// Build a randomized multi-stop daily itinerary for one NPC. Deterministic in
// `seed`: Fisher-Yates shuffles the activity pool, takes `count` distinct
// activities, expands + concatenates them (with a short stroll between stops) into
// one looping route, and rolls a wandering speed.
export function buildItinerary(seed: number, count = 4): Itinerary {
  const rng = mulberry32(seed >>> 0);
  const pool = ACTIVITIES.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, Math.max(2, Math.min(count, pool.length)));
  const waypoints: Waypoint[] = [];
  for (const a of chosen) {
    waypoints.push(...a.build(rng));
    waypoints.push(wp(lane(jit(rng, CX, 30)), "patrol")); // amble between stops
  }
  const speed = 1.4 + rng() * 0.6;
  return { waypoints, speed, activities: chosen.map((a) => a.name) };
}
