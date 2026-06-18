import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import type { Input } from "../core/Input";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";

const ENGINE_FORCE = 28;
const BRAKE = 4;
const MAX_STEER = 0.5;

export class Car implements Tickable {
  readonly object = new THREE.Group();
  enabled = false;

  private body: RAPIER.RigidBody;
  private vehicle: RAPIER.DynamicRayCastVehicleController;
  private chassis: THREE.Mesh;
  private wheelMeshes: THREE.Mesh[] = [];

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    spawn: Vec2,
  ) {
    this.chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.3, roughness: 0.5 }),
    );
    this.chassis.castShadow = true;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x222831 }),
    );
    cabin.position.set(0, 0.5, -0.2);
    this.chassis.add(cabin);
    this.object.add(this.chassis);
    scene.add(this.object);

    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(spawn.x, 1.0, spawn.z).setCanSleep(false),
    );
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.9, 0.3, 1.8).setMass(150),
      this.body,
    );

    this.vehicle = physics.world.createVehicleController(this.body);
    const wheelPositions: [number, number, number][] = [
      [-0.9, -0.2, 1.3], [0.9, -0.2, 1.3], [-0.9, -0.2, -1.3], [0.9, -0.2, -1.3],
    ];
    const suspensionDir = { x: 0, y: -1, z: 0 };
    const axleCs = { x: -1, y: 0, z: 0 };
    for (const [x, y, z] of wheelPositions) {
      this.vehicle.addWheel({ x, y, z }, suspensionDir, axleCs, 0.4, 0.35);
      const idx = this.wheelMeshes.length;
      this.vehicle.setWheelSuspensionStiffness(idx, 24);
      this.vehicle.setWheelMaxSuspensionTravel(idx, 0.3);
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111 }),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      this.object.add(wheel);
      this.wheelMeshes.push(wheel);
    }
  }

  get position(): THREE.Vector3 { return this.object.position; }

  update(dt: number): void {
    const accel = this.input.isDown("KeyW") || this.input.isDown("ArrowUp");
    const reverse = this.input.isDown("KeyS") || this.input.isDown("ArrowDown");
    const left = this.input.isDown("KeyA") || this.input.isDown("ArrowLeft");
    const right = this.input.isDown("KeyD") || this.input.isDown("ArrowRight");
    const braking = this.input.isDown("Space");

    let engine = 0;
    if (this.enabled) {
      if (accel) engine = ENGINE_FORCE;
      else if (reverse) engine = -ENGINE_FORCE * 0.6;
    }
    let steer = 0;
    if (this.enabled) {
      if (left) steer = MAX_STEER;
      else if (right) steer = -MAX_STEER;
    }

    // rear-wheel drive (indices 2,3), front-wheel steer (indices 0,1)
    this.vehicle.setWheelEngineForce(2, engine);
    this.vehicle.setWheelEngineForce(3, engine);
    this.vehicle.setWheelSteering(0, steer);
    this.vehicle.setWheelSteering(1, steer);
    const brakeForce = this.enabled && braking ? BRAKE : 0;
    for (let i = 0; i < 4; i++) this.vehicle.setWheelBrake(i, brakeForce);

    this.vehicle.updateVehicle(Math.min(dt, 1 / 30));

    const t = this.body.translation();
    const r = this.body.rotation();
    this.object.position.set(t.x, t.y, t.z);
    this.object.quaternion.set(r.x, r.y, r.z, r.w);

    for (let i = 0; i < this.wheelMeshes.length; i++) {
      const conn = this.vehicle.wheelChassisConnectionPointCs(i);
      const susp = this.vehicle.wheelSuspensionLength(i) ?? 0;
      if (conn) this.wheelMeshes[i].position.set(conn.x, conn.y - susp, conn.z);
    }
  }
}
