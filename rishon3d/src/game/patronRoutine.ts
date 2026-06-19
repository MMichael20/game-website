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
  PHONE_SHOP_DOOR, PHONE_SHOP_INSIDE, PHONE_SHOP_COUNTER,
  TAXI_WAIT, CROSSWALK, PATIO_WALK_Z, FAR_WALK_Z,
  type Vec2, type Seat,
} from "../world/districtPois";

// --- patron data model --------------------------------------------------------

export type PatronState =
  | "toDoor" | "entering" | "toCounter" | "ordering" | "toTable" | "seated"
  | "leaving" | "toCrosswalk" | "crossing" | "patrol" | "done";

// One scripted leg of a route: walk to `to`, and on arrival enter `state`. If
// `dwell` > 0 the patron holds in `state` for that many seconds before advancing.
export interface Waypoint {
  to: Vec2;
  state: PatronState;
  dwell: number;
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
const SITTING: ReadonlySet<PatronState> = new Set<PatronState>(["ordering", "seated"]);

// --- route builders (derive every coordinate from districtPois anchors) -------

function wp(to: Vec2, state: PatronState, dwell = 0): Waypoint {
  return { to: { x: to.x, z: to.z }, state, dwell };
}

// A patio-lane approach point in front of a door, so patrons walk the sidewalk
// before turning in. `side` shifts them along x so several don't overlap.
function laneApproach(door: Vec2, side: number): Vec2 {
  return { x: door.x + side, z: PATIO_WALK_Z };
}

// Full dine-in loop: stroll the lane -> door -> inside -> counter (order) ->
// indoor seat (eat) -> back out the door -> cross the street. Ends "done".
export function dineInRoute(seat: Seat, side = 0): Waypoint[] {
  return [
    wp(laneApproach(RESTAURANT_DOOR, side), "toDoor"),
    wp(RESTAURANT_DOOR, "entering"),
    wp(RESTAURANT_INSIDE, "entering"),
    wp(RESTAURANT_COUNTER, "toCounter"),
    wp(RESTAURANT_COUNTER, "ordering", 4),
    wp({ x: seat.x, z: seat.z }, "toTable"),
    wp({ x: seat.x, z: seat.z }, "seated", 8),
    wp(RESTAURANT_INSIDE, "leaving"),
    wp(RESTAURANT_DOOR, "leaving"),
    wp(laneApproach(RESTAURANT_DOOR, side), "leaving"),
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "crossing"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "done"),
  ];
}

// Phone-shop visitor: lane -> shop door -> inside -> counter (browse) -> out.
export function phoneShopRoute(side = 0): Waypoint[] {
  return [
    wp(laneApproach(PHONE_SHOP_DOOR, side), "toDoor"),
    wp(PHONE_SHOP_DOOR, "entering"),
    wp(PHONE_SHOP_INSIDE, "entering"),
    wp(PHONE_SHOP_COUNTER, "toCounter"),
    wp(PHONE_SHOP_COUNTER, "ordering", 5),
    wp(PHONE_SHOP_INSIDE, "leaving"),
    wp(PHONE_SHOP_DOOR, "leaving"),
    wp(laneApproach(PHONE_SHOP_DOOR, side), "done"),
  ];
}

// Taxi waiter: walk to the curb stand, wait, then cross the street. Ends "done".
export function streetCrossRoute(): Waypoint[] {
  return [
    wp({ x: TAXI_WAIT.x, z: PATIO_WALK_Z }, "toCrosswalk"),
    wp(TAXI_WAIT, "ordering", 6),
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "toCrosswalk"),
    wp({ x: CROSSWALK.x, z: FAR_WALK_Z }, "crossing"),
    wp({ x: CROSSWALK.x, z: PATIO_WALK_Z }, "done"),
  ];
}

// Patio stroller: pace the walking lane between two x extents, forever. The
// route loops, so this patron never finishes.
export function patrolRoute(minX: number, maxX: number): Waypoint[] {
  return [
    wp({ x: minX, z: PATIO_WALK_Z }, "patrol"),
    wp({ x: maxX, z: PATIO_WALK_Z }, "patrol"),
  ];
}

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
