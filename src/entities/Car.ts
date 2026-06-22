import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import type { Input } from "../core/Input";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";
import { makeCarBody } from "./carMesh";

const ENGINE_FORCE = 350;
const BRAKE = 12;
const MAX_STEER = 0.5;
const REVERSE_MAX = 8; // m/s — cap on how fast the car may travel in reverse
const _q = new THREE.Quaternion();
const _fwd = new THREE.Vector3();

export class Car implements Tickable {
  readonly object = new THREE.Group();
  enabled = false;

  private body: RAPIER.RigidBody;
  private vehicle: RAPIER.DynamicRayCastVehicleController;
  private wheelMeshes: THREE.Mesh[] = [];

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    spawn: Vec2,
  ) {
    this.object.add(makeCarBody({ bodyColor: 0xc0392b, withWheels: false }));
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
      this.vehicle.setWheelFrictionSlip(idx, 2.0);
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111 }),
      );
      wheel.castShadow = true;
      this.object.add(wheel);
      this.wheelMeshes.push(wheel);
    }
  }

  get position(): THREE.Vector3 { return this.object.position; }

  // The Rapier body, so the follow camera can exclude it from its wall-cast.
  get rigidBody(): RAPIER.RigidBody { return this.body; }

  get speed(): number {
    const v = this.body.linvel();
    return Math.hypot(v.x, v.z);
  }

  // Place the car at a spot/heading (used when a summoned car "arrives" and the
  // player gets in). Zeroes velocity so it doesn't inherit stale momentum.
  teleportTo(x: number, z: number, yaw: number): void {
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.body.setTranslation({ x, y: 1.0, z }, true);
    this.body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.object.position.set(x, 1.0, z);
    this.object.quaternion.copy(_q);
  }

  update(dt: number): void {
    const mx = this.input.move.x, my = this.input.move.y;
    const accel = this.input.isDown("KeyW") || this.input.isDown("ArrowUp") || my > 0.15;
    const reverse = this.input.isDown("KeyS") || this.input.isDown("ArrowDown") || my < -0.15;
    const left = this.input.isDown("KeyA") || this.input.isDown("ArrowLeft");
    const right = this.input.isDown("KeyD") || this.input.isDown("ArrowRight");
    const braking = this.input.isDown("Space");

    // Signed speed along the car's forward axis (+z is forward).
    const rot = this.body.rotation();
    _q.set(rot.x, rot.y, rot.z, rot.w);
    _fwd.set(0, 0, 1).applyQuaternion(_q);
    const vel = this.body.linvel();
    const along = vel.x * _fwd.x + vel.z * _fwd.z;

    let engine = 0;
    if (this.enabled) {
      if (accel) engine = ENGINE_FORCE;
      // Reverse pushes back, and still works as a brake while moving forward,
      // but stops adding force once we're already reversing faster than the cap.
      else if (reverse && along > -REVERSE_MAX) engine = -ENGINE_FORCE * 0.7;
    }
    let steer = 0;
    if (this.enabled) {
      if (left) steer = MAX_STEER;
      else if (right) steer = -MAX_STEER;
      if (Math.abs(mx) > 0.05) steer = -mx * MAX_STEER; // analog joystick steering
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

      // Compose wheel rotation: axle alignment (PI/2 around Z) + spin around axle (X) + steer around Y
      const spin = this.vehicle.wheelRotation(i) ?? 0;
      const steer = this.vehicle.wheelSteering(i) ?? 0;
      this.wheelMeshes[i].rotation.set(spin, steer, Math.PI / 2, "YXZ");
    }
  }
}
