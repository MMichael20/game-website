import * as THREE from "three";
import type { Agent } from "../game/EntityManager";
import type { Vec2 } from "../world/rishonMap";
import { advanceAlong, type FollowState } from "../game/pathFollow";
import { makeCarBody } from "./carMesh";

const CAR_Y = 0.5;

// Decorative kinematic traffic: follows a closed route of road-lane waypoints.
// Not a physics vehicle (cheap and stable at population scale); does not
// collide with the player.
export class NpcCar implements Agent {
  readonly object = new THREE.Group();
  private state: FollowState;
  private readonly speed: number;

  constructor(scene: THREE.Scene, private route: Vec2[], color: number, speed = 7) {
    this.speed = speed;
    const car = makeCarBody({ bodyColor: color, withWheels: true });
    car.position.y = CAR_Y;
    this.object.add(car);

    const start = route[0] ?? { x: 0, z: 0 };
    this.object.position.set(start.x, 0, start.z);
    this.state = { pos: { x: start.x, z: start.z }, heading: 0, waypoint: 1 };
    scene.add(this.object);
  }

  update(dt: number): void {
    this.state = advanceAlong(this.route, this.state, this.speed, dt, 1.5, 2.5);
    this.object.position.set(this.state.pos.x, 0, this.state.pos.z);
    this.object.rotation.y = this.state.heading;
  }
}
