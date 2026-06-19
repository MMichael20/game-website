import * as THREE from "three";
import type { Vec2 } from "../world/rishonMap";
import { stepToward } from "../game/taxi";
import { makeCarBody } from "./carMesh";

const CAR_Y = 0.5;
const SPEED = 11;
const TURN = 2.6;

// The player's own car arriving when summoned from the phone. Kinematic +
// decorative (no physics body); Game drives it toward the player via driveTo().
// Colored to match the drivable Car so it reads as "your car pulling up"; on
// entry the real physics Car is teleported to this car's pose.
export class RideCar {
  readonly object = new THREE.Group();
  private pos: Vec2 = { x: 0, z: 0 };
  private head = 0;

  constructor(scene: THREE.Scene) {
    const car = makeCarBody({ bodyColor: 0xc0392b, withWheels: true });
    car.position.y = CAR_Y;
    this.object.add(car);
    this.object.visible = false;
    scene.add(this.object);
  }

  get position(): Vec2 { return this.pos; }
  get heading(): number { return this.head; }

  spawnAt(p: Vec2): void {
    this.pos = { x: p.x, z: p.z };
    this.head = 0;
    this.object.position.set(p.x, 0, p.z);
    this.object.rotation.y = 0;
    this.object.visible = true;
  }

  setVisible(v: boolean): void { this.object.visible = v; }

  driveTo(target: Vec2, dt: number): boolean {
    const r = stepToward(this.pos, this.head, target, SPEED, dt, TURN);
    this.pos = r.pos;
    this.head = r.heading;
    this.object.position.set(r.pos.x, 0, r.pos.z);
    this.object.rotation.y = r.heading;
    return r.arrived;
  }
}
