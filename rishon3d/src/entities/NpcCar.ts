import * as THREE from "three";
import type { Agent } from "../game/EntityManager";
import type { Vec2 } from "../world/rishonMap";
import { advanceAlong, type FollowState } from "../game/pathFollow";
import { getGeometry, getMaterial } from "../world/assets";

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
    const body = new THREE.Mesh(
      getGeometry("npcCarBody", () => new THREE.BoxGeometry(1.7, 0.6, 3.4)),
      getMaterial(`npcCarMat-${color}`, () => new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.6 })),
    );
    body.position.y = CAR_Y; body.castShadow = true;
    const cabin = new THREE.Mesh(
      getGeometry("npcCarCabin", () => new THREE.BoxGeometry(1.4, 0.5, 1.6)),
      getMaterial("npcCarCabinMat", () => new THREE.MeshStandardMaterial({ color: 0x222831 })),
    );
    cabin.position.set(0, CAR_Y + 0.5, -0.2);
    this.object.add(body, cabin);

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
