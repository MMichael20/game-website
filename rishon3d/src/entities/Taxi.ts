import * as THREE from "three";
import type { Vec2 } from "../world/rishonMap";
import { stepToward } from "../game/taxi";
import { getGeometry, getMaterial } from "../world/assets";

const CAR_Y = 0.5;
const SPEED = 11;
const TURN = 2.6;

// A hailable yellow taxi. Kinematic + decorative (no physics body); Game drives
// it toward a target each frame via driveTo().
export class Taxi {
  readonly object = new THREE.Group();
  private pos: Vec2 = { x: 0, z: 0 };
  private heading = 0;

  constructor(scene: THREE.Scene) {
    const body = new THREE.Mesh(
      getGeometry("npcCarBody", () => new THREE.BoxGeometry(1.7, 0.6, 3.4)),
      getMaterial("taxiBodyMat", () => new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.3, roughness: 0.5 })),
    );
    body.position.y = CAR_Y;
    body.castShadow = true;
    const cabin = new THREE.Mesh(
      getGeometry("npcCarCabin", () => new THREE.BoxGeometry(1.4, 0.5, 1.6)),
      getMaterial("taxiCabinMat", () => new THREE.MeshStandardMaterial({ color: 0x222831 })),
    );
    cabin.position.set(0, CAR_Y + 0.5, -0.2);
    this.object.add(body, cabin);
    this.object.visible = false;
    scene.add(this.object);
  }

  get position(): Vec2 { return this.pos; }

  spawnAt(p: Vec2): void {
    this.pos = { x: p.x, z: p.z };
    this.heading = 0;
    this.object.position.set(p.x, 0, p.z);
    this.object.rotation.y = 0;
    this.object.visible = true;
  }

  setVisible(v: boolean): void { this.object.visible = v; }

  driveTo(target: Vec2, dt: number): boolean {
    const r = stepToward(this.pos, this.heading, target, SPEED, dt, TURN);
    this.pos = r.pos;
    this.heading = r.heading;
    this.object.position.set(r.pos.x, 0, r.pos.z);
    this.object.rotation.y = r.heading;
    return r.arrived;
  }
}
