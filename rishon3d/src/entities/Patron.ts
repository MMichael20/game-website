import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { makeHumanoid, animateWalk, type HumanoidPalette, type HumanoidLimbs } from "./Humanoid";
import {
  makePatron, stepPatron, isSitting,
  dineInRoute, bakeryRoute, phoneShopRoute, crossingLoopRoute, taxiWaitRoute, patrolRoute,
  type Patron as PatronData, type Waypoint,
} from "../game/patronRoutine";
import { INDOOR_TABLE_SEATS, CX, type Seat } from "../world/districtPois";

// Seated pose, mirroring the static diners in restaurantStreet.ts makePatioPeople:
// the whole humanoid drops by SIT_DROP so its bent legs meet a chair, legs fold
// up under the table, and the arms rest forward on it.
const SIT_DROP = 0.4;
const LEG_SIT = -1.5;
const ARM_SIT = -0.6;

// A scripted townsperson that walks a districtPois-derived route, faces its
// heading, animates its legs while moving, and folds into a sitting pose while
// ordering / dining. Pure routing lives in game/patronRoutine; this class is the
// THREE shell that reads `pos`/`state` out of it each frame.
export class Patron implements Tickable {
  readonly object: THREE.Group;
  private limbs: HumanoidLimbs;
  private data: PatronData;
  private phase = 0;
  /** seconds of staggered delay before this patron starts walking */
  private delay: number;
  private wasSitting = false;
  /** clock used for subtle idle motion while standing still */
  private idle = 0;

  constructor(
    scene: THREE.Scene,
    palette: HumanoidPalette,
    route: { waypoints: Waypoint[]; speed: number; loop?: boolean; delay?: number },
  ) {
    const h = makeHumanoid(palette);
    this.object = h.group;
    this.limbs = h.limbs;
    this.data = makePatron(route.waypoints, route.speed, { loop: route.loop });
    this.delay = route.delay ?? 0;
    this.object.position.set(this.data.pos.x, 0, this.data.pos.z);
    scene.add(this.object);
  }

  update(dt: number): void {
    if (this.delay > 0) {
      this.delay -= dt;
      animateWalk(this.limbs, this.phase, 0);
      return;
    }

    const prev = { x: this.data.pos.x, z: this.data.pos.z };
    stepPatron(this.data, dt);

    const sitting = isSitting(this.data.state);
    const dx = this.data.pos.x - prev.x;
    const dz = this.data.pos.z - prev.z;
    const moving = !sitting && Math.hypot(dx, dz) > 1e-4;

    if (sitting) {
      if (!this.wasSitting) this.poseSitting();
    } else if (moving) {
      if (this.wasSitting) this.poseStanding();
      // face travel direction; advance the walk cycle by distance moved
      this.object.rotation.y = Math.atan2(dx, dz);
      this.phase += Math.hypot(dx, dz) * 6;
      animateWalk(this.limbs, this.phase, 0.5);
    } else {
      // standing still (dwelling at a counter / taxi stand): subtle idle life —
      // a gentle arm sway and an occasional slow glance, so nobody is a statue.
      if (this.wasSitting) this.poseStanding();
      this.idle += dt;
      const sway = Math.sin(this.idle * 1.7) * 0.1;
      this.limbs.leftArm.rotation.x = sway;
      this.limbs.rightArm.rotation.x = -sway;
      this.limbs.leftLeg.rotation.x = 0;
      this.limbs.rightLeg.rotation.x = 0;
      this.object.rotation.y += Math.sin(this.idle * 0.5) * dt * 0.5;
    }
    this.wasSitting = sitting;

    const y = sitting ? -SIT_DROP : 0;
    this.object.position.set(this.data.pos.x, y, this.data.pos.z);
  }

  /** True once a non-looping route has finished (so Game can cull it). */
  get done(): boolean { return this.data.done; }

  private poseSitting(): void {
    // face the table center (+x or -x depending on which side of CX we sit on)
    this.object.rotation.y = this.data.pos.x < CX ? Math.PI / 2 : -Math.PI / 2;
    this.limbs.leftLeg.rotation.x = LEG_SIT;
    this.limbs.rightLeg.rotation.x = LEG_SIT;
    this.limbs.leftArm.rotation.x = ARM_SIT;
    this.limbs.rightArm.rotation.x = ARM_SIT;
  }

  private poseStanding(): void {
    this.limbs.leftLeg.rotation.x = 0;
    this.limbs.rightLeg.rotation.x = 0;
    this.limbs.leftArm.rotation.x = 0;
    this.limbs.rightArm.rotation.x = 0;
  }
}

// --- palettes + factory -------------------------------------------------------

const PALETTES: HumanoidPalette[] = [
  { skin: 0xf0c9a0, shirt: 0xc0392b, pants: 0x274060 },
  { skin: 0xc98a5a, shirt: 0x2e8b57, pants: 0x2a2a30 },
  { skin: 0xe0b48a, shirt: 0x2980b9, pants: 0x303848 },
  { skin: 0xf0c9a0, shirt: 0xe0b23a, pants: 0x444450 },
  { skin: 0xd9a066, shirt: 0x8e44ad, pants: 0x222630 },
  { skin: 0xf2d2b6, shirt: 0x16a085, pants: 0x2b2b33 },
  { skin: 0xc0875a, shirt: 0xd35400, pants: 0x2a3340 },
];

function paletteAt(i: number): HumanoidPalette {
  return PALETTES[i % PALETTES.length];
}

// Build a lively cast of scripted patrons, every one on a continuously LOOPING
// route so they live "circular lives" (eat, shop, cross, stroll, repeat) instead
// of finishing and standing frozen. Staggered start delays keep them desynced.
export function spawnPatrons(scene: THREE.Scene): Patron[] {
  const patrons: Patron[] = [];
  let pi = 0;
  const add = (waypoints: Waypoint[], speed: number, delay: number): void => {
    patrons.push(new Patron(scene, paletteAt(pi++), { waypoints, speed, loop: true, delay }));
  };

  const seats: Seat[] = INDOOR_TABLE_SEATS;
  // restaurant diners (order, sit at a table, eat, leave, loop)
  add(dineInRoute(seats[0], -2), 1.7, 0);
  add(dineInRoute(seats[1], 0), 1.6, 4);
  add(dineInRoute(seats[0], 2), 1.8, 9);
  // bakery customers (browse the bakery interior, loop)
  add(bakeryRoute(-1), 1.7, 2);
  add(bakeryRoute(2), 1.6, 11);
  // phone-shop visitors
  add(phoneShopRoute(-1), 1.7, 1.5);
  add(phoneShopRoute(2), 1.6, 8);
  // pedestrians crossing the street back and forth
  add(crossingLoopRoute(7), 1.6, 0);
  add(crossingLoopRoute(11), 1.5, 6);
  // someone hanging around the taxi stand
  add(taxiWaitRoute(), 1.6, 3);
  // patio strollers pacing the lane, passing each other
  add(patrolRoute(CX - 22, CX + 22), 1.4, 0);
  add(patrolRoute(CX + 22, CX - 22), 1.5, 2);

  return patrons;
}
