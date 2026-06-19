// rishon3d/src/game/patronRoutine.ts
//
// A pure, deterministic finite-state machine for one "patron" NPC: a townsperson
// that walks a scripted route (dine in, visit the phone shop, wait for a taxi, or
// pace the patio lane), dwelling at certain stops. No THREE, no RNG -> every step
// is reproducible and unit-testable. The entity layer (src/entities/Patron.ts)
// owns the mesh and reads `pos`/`state` out of this each frame.

import { moveToward, reachedTarget } from "./wander";
import {
  RESTAURANT_DOOR, RESTAURANT_INSIDE, RESTAURANT_COUNTER,
  BAKERY_DOOR, BAKERY_INSIDE, BAKERY_COUNTER,
  PHONE_SHOP_DOOR, PHONE_SHOP_INSIDE, PHONE_SHOP_COUNTER,
  TAXI_WAIT, CROSSWALK, PATIO_WALK_Z, FAR_WALK_Z,
  PARK_CENTER, PARK_BENCH,
  type Vec2, type Seat,
} from "../world/districtPois";

// --- patron data model --------------------------------------------------------

export type PatronState =
  | "toDoor" | "entering" | "toCounter" | "ordering" | "toTable" | "seated"
  | "waiting" | "leaving" | "toCrosswalk" | "crossing" | "patrol" | "done";

// One scripted leg of a route: walk to `to`, and on arrival enter `state`. If
// `dwell` > 0 the patron holds in `state` for that many seconds before advancing.
// `faceYaw` (optional) overrides the CX-heuristic sit-facing for this waypoint:
// the entity layer reads it from the active waypoint when posing a seated patron.
export interface Waypoint {
  to: Vec2;
  state: PatronState;
  dwell: number;
  faceYaw?: number;
}

export interface Patron {
  pos: Vec2;
  state: PatronState;
  /** index into `waypoints` of the leg currently being walked / dwelt at */
  index: number;
  target: Vec2;
  /** remaining dwell seconds for the current state (counts down) */
  timer: number;
  waypoints: Waypoint[];
  speed: number;
  /** true while the patron is sitting (ordering or seated) -> entity poses it */
  seated: boolean;
  /** true when the route is fully consumed and `loop` is false */
  done: boolean;
  /** when true, a finished route restarts from waypoint 0 */
  loop: boolean;
}

const REACH = 0.6;

// States in which the humanoid should be posed sitting rather than standing.
// Only an actual table seat sits; ordering at a counter and waiting are standing
// dwells.
const SITTING: ReadonlySet<PatronState> = new Set<PatronState>(["seated"]);

// --- route builders (derive every coordinate from districtPois anchors) -------

function wp(to: Vec2, state: PatronState, dwell = 0, faceYaw?: number): Waypoint {
  const w: Waypoint = { to: { x: to.x, z: to.z }, state, dwell };
  if (faceYaw !== undefined) w.faceYaw = faceYaw;
  return w;
}

// A patio-lane approach point in front of a door, so patrons walk the sidewalk
// before turning in. `side` shifts them along x so several don't overlap.
function laneApproach(door: Vec2, side: number): Vec2 {
  return { x: door.x + side, z: PATIO_WALK_Z };
}

// Every route below is a CLOSED CIRCUIT meant to be run with loop:true, so the
// patron lives a continuous "circular life" instead of finishing and standing
// frozen. None of them contain a terminal "done" leg.

// Full dine-in loop: stroll the lane -> door -> inside -> counter (order, stand)
// -> indoor seat (sit + eat) -> back out -> stroll off down the lane -> (loop)
// back to the door and do it again.
export function dineInRoute(seat: Seat, side = 0): Waypoint[] {
  return [
    wp(laneApproach(RESTAURANT_DOOR, side), "toDoor"),
    wp(RESTAURANT_DOOR, "entering"),
    wp(RESTAURANT_INSIDE, "entering"),
    wp(RESTAURANT_COUNTER, "toCounter"),
    wp(RESTAURANT_COUNTER, "ordering", 3),
    wp({ x: seat.x, z: seat.z }, "toTable"),
    wp({ x: seat.x, z: seat.z }, "seated", 8),
    wp(RESTAURANT_INSIDE, "leaving"),
    wp(RESTAURANT_DOOR, "leaving"),
    wp(laneApproach(RESTAURANT_DOOR, side + 7), "patrol"),  // stroll off, then loop
  ];
}

// Bakery customer: lane -> bakery door -> inside -> counter (order, stand) -> out
// -> stroll off -> (loop). Brings life to the bakery interior.
export function bakeryRoute(side = 0): Waypoint[] {
  return [
    wp(laneApproach(BAKERY_DOOR, side), "toDoor"),
    wp(BAKERY_DOOR, "entering"),
    wp(BAKERY_INSIDE, "entering"),
    wp(BAKERY_COUNTER, "toCounter"),
    wp(BAKERY_COUNTER, "ordering", 4),
    wp(BAKERY_INSIDE, "leaving"),
    wp(BAKERY_DOOR, "leaving"),
    wp(laneApproach(BAKERY_DOOR, side - 7), "patrol"),
  ];
}

// Phone-shop visitor: lane -> shop door -> inside -> counter (browse) -> out ->
// stroll off -> (loop).
export function phoneShopRoute(side = 0): Waypoint[] {
  return [
    wp(laneApproach(PHONE_SHOP_DOOR, side), "toDoor"),
    wp(PHONE_SHOP_DOOR, "entering"),
    wp(PHONE_SHOP_INSIDE, "entering"),
    wp(PHONE_SHOP_COUNTER, "toCounter"),
    wp(PHONE_SHOP_COUNTER, "ordering", 5),
    wp(PHONE_SHOP_INSIDE, "leaving"),
    wp(PHONE_SHOP_DOOR, "leaving"),
    wp(laneApproach(PHONE_SHOP_DOOR, side + 6), "patrol"),
  ];
}

// Pedestrian circuit: pace the patio sidewalk, cross at the crosswalk, walk the
// far sidewalk, cross back -> (loop). Real, continuous street-crossing.
export function crossingLoopRoute(span = 8): Waypoint[] {
  return [
    wp({ x: CROSSWALK.x - span, z: PATIO_WALK_Z }, "patrol"),
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "crossing"),
    wp({ x: CROSSWALK.x + span, z: FAR_WALK_Z }, "patrol"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "crossing"),
  ];
}

// Taxi waiter: amble to the curb stand, wait (standing), wander off, then loop
// back. Never finishes.
export function taxiWaitRoute(): Waypoint[] {
  return [
    wp({ x: TAXI_WAIT.x - 6, z: PATIO_WALK_Z }, "patrol"),
    wp(TAXI_WAIT, "waiting", 7),
    wp({ x: TAXI_WAIT.x + 5, z: PATIO_WALK_Z }, "patrol"),
  ];
}

// Patio stroller: pace the walking lane between two x extents, forever.
export function patrolRoute(minX: number, maxX: number): Waypoint[] {
  return [
    wp({ x: minX, z: PATIO_WALK_Z }, "patrol"),
    wp({ x: maxX, z: PATIO_WALK_Z }, "patrol"),
  ];
}

// Park visitor: stroll to the pocket park, sit on the bench (facing north, toward
// the road), idle, then leave. The bench faceYaw = 0 (faces -z / north toward road).
export function parkLoopRoute(): Waypoint[] {
  const BENCH_FACE_YAW = 0; // face north (toward the street)
  return [
    wp({ x: PARK_CENTER.x - 5, z: PATIO_WALK_Z }, "patrol"),
    wp({ x: PARK_CENTER.x, z: PATIO_WALK_Z }, "patrol"),
    wp({ x: PARK_CENTER.x, z: PARK_CENTER.z }, "toTable"),
    wp(PARK_BENCH, "seated", 10, BENCH_FACE_YAW),
    wp({ x: PARK_CENTER.x, z: PARK_CENTER.z }, "leaving"),
    wp({ x: PARK_CENTER.x + 5, z: PATIO_WALK_Z }, "patrol"),
  ];
}

// Cafe visitor: like bakeryRoute but with an extended counter dwell and an
// explicit faceYaw so the NPC faces the counter (south, +z = Math.PI).
export function cafeRoute(side = 0): Waypoint[] {
  const COUNTER_FACE_YAW = Math.PI; // face the counter (south)
  return [
    wp(laneApproach(BAKERY_DOOR, side), "toDoor"),
    wp(BAKERY_DOOR, "entering"),
    wp(BAKERY_INSIDE, "entering"),
    wp(BAKERY_COUNTER, "toCounter"),
    wp(BAKERY_COUNTER, "ordering", 6, COUNTER_FACE_YAW),
    wp(BAKERY_INSIDE, "leaving"),
    wp(BAKERY_DOOR, "leaving"),
    wp(laneApproach(BAKERY_DOOR, side - 6), "patrol"),
  ];
}

// Office lobby visitor: stroll the patio lane, enter the phone shop and wait at
// the counter as though conducting business, then leave. Provides a "business
// errand" behavior type distinct from the phone-shop browser.
export function officeLobbyRoute(side = 0): Waypoint[] {
  const COUNTER_FACE_YAW = Math.PI; // face the counter
  return [
    wp(laneApproach(PHONE_SHOP_DOOR, side), "toDoor"),
    wp(PHONE_SHOP_DOOR, "entering"),
    wp(PHONE_SHOP_INSIDE, "entering"),
    wp(PHONE_SHOP_COUNTER, "toCounter"),
    wp(PHONE_SHOP_COUNTER, "ordering", 8, COUNTER_FACE_YAW),
    wp(PHONE_SHOP_INSIDE, "leaving"),
    wp(PHONE_SHOP_DOOR, "leaving"),
    wp(laneApproach(PHONE_SHOP_DOOR, side + 8), "patrol"),
  ];
}

// Generic sidewalk loop between two explicit points — useful for giving a specific
// pedestrian a defined beat (e.g. market stall shopper, school run parent).
export function sidewalkLoopRoute(p1: Vec2, p2: Vec2): Waypoint[] {
  return [
    wp(p1, "patrol"),
    wp(p2, "patrol"),
  ];
}

// Stationary worker: walks to a post, faces the specified yaw (e.g. a stall
// operator facing the street), dwells, then retreats off-screen and loops back.
// `post` is the work position; `faceYaw` is the facing angle in radians.
export function workerStationRoute(post: Vec2, faceYaw: number): Waypoint[] {
  return [
    wp({ x: post.x - 6, z: post.z }, "patrol"),
    wp(post, "waiting", 12, faceYaw),
    wp({ x: post.x + 6, z: post.z }, "patrol"),
  ];
}

// --- BEHAVIORS registry -------------------------------------------------------
// Maps behavior-type name -> a zero-arg factory that produces a closed-loop route.
// Task 16 (location-driven spawn wiring) will consume this. These are NOT added to
// the ACTIVITIES pool in itinerary.ts — the seed-42 fixture stays intact.

export type BehaviorFactory = () => Waypoint[];

export const BEHAVIORS: Readonly<Record<string, BehaviorFactory>> = {
  parkBenchIdle: () => parkLoopRoute(),
  cafeVisit: () => cafeRoute(),
  officeLobbyErrand: () => officeLobbyRoute(),
  sidewalkStroll: () => sidewalkLoopRoute(
    { x: CROSSWALK.x - 8, z: PATIO_WALK_Z },
    { x: CROSSWALK.x + 8, z: PATIO_WALK_Z },
  ),
  taxiWait: () => taxiWaitRoute(),
  dineIn: () => dineInRoute({ x: 93, z: 91.2, faceYaw: Math.PI / 2 }),
};

// --- FSM construction + stepping ----------------------------------------------

export function makePatron(
  waypoints: Waypoint[],
  speed: number,
  opts: { loop?: boolean; start?: Vec2 } = {},
): Patron {
  const loop = opts.loop ?? false;
  const first = waypoints[0];
  const start = opts.start ?? first.to;
  return {
    pos: { x: start.x, z: start.z },
    state: first.state,
    index: 0,
    target: { x: first.to.x, z: first.to.z },
    timer: 0,
    waypoints,
    speed,
    seated: SITTING.has(first.state),
    done: false,
    loop,
  };
}

export function isSitting(state: PatronState): boolean {
  return SITTING.has(state);
}

// Advance the patron one tick of `dt` seconds. Mutates and returns the patron so
// callers can use either style. While walking it steps `pos` toward `target`;
// on arrival it starts that waypoint's dwell timer (if any), and once the dwell
// elapses it advances to the next waypoint. At the end it loops or finishes.
export function stepPatron(p: Patron, dt: number): Patron {
  if (p.done) return p;

  // Dwelling at a stop: hold position, count the timer down, then advance.
  if (p.timer > 0) {
    p.timer -= dt;
    if (p.timer > 0) return p;
    p.timer = 0;
    advance(p);
    return p;
  }

  // Walking toward the current waypoint.
  const next = moveToward(p.pos, p.target, p.speed * dt);
  p.pos.x = next.x;
  p.pos.z = next.z;

  if (reachedTarget(p.pos, p.target, REACH)) {
    const here = p.waypoints[p.index];
    if (here.dwell > 0) {
      // Arrived at a dwell stop: settle into its state and start the timer.
      p.timer = here.dwell;
      p.state = here.state;
      p.seated = SITTING.has(here.state);
    } else {
      advance(p);
    }
  }
  return p;
}

// Move to the next waypoint (or loop / finish). Sets state, target and pose flag.
function advance(p: Patron): void {
  const nextIndex = p.index + 1;
  if (nextIndex >= p.waypoints.length) {
    if (p.loop) {
      p.index = 0;
    } else {
      p.done = true;
      p.state = "done";
      p.seated = false;
      return;
    }
  } else {
    p.index = nextIndex;
  }
  const w = p.waypoints[p.index];
  p.state = w.state;
  p.target.x = w.to.x;
  p.target.z = w.to.z;
  p.seated = SITTING.has(w.state);
  if (p.state === "done") p.done = true;
}
