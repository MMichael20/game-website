import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import type { Input } from "../core/Input";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";

const SPEED = 8;

export class Character implements Tickable {
  readonly object = new THREE.Group();
  enabled = true;

  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private controller: RAPIER.KinematicCharacterController;
  private tmp = new THREE.Vector3();
  private velY = 0;

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    spawn: Vec2,
    private camera: THREE.Camera,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e6fb0 }),
    );
    mesh.position.y = 0.9;
    mesh.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf0c9a0 }),
    );
    head.position.y = 1.75;
    head.castShadow = true;
    this.object.add(mesh, head);
    this.object.position.set(spawn.x, 0, spawn.z);
    scene.add(this.object);

    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, 1.0, spawn.z),
    );
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(0.5, 0.4),
      this.body,
    );
    this.controller = physics.world.createCharacterController(0.1);
    this.controller.enableAutostep(0.5, 0.2, true);
    this.controller.enableSnapToGround(0.5);
  }

  get position(): THREE.Vector3 { return this.object.position; }

  setPosition(x: number, z: number): void {
    this.body.setNextKinematicTranslation({ x, y: 1.0, z });
    this.object.position.set(x, 0, z);
  }

  update(dt: number): void {
    if (!this.enabled) return;

    // camera-relative input direction on XZ plane
    const forward = this.tmp.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0; forward.normalize();
    // cross(forward, up) with right-hand rule: when forward = -Z, result = +X (screen-right). No negate needed.
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (this.input.isDown("KeyW") || this.input.isDown("ArrowUp")) move.add(forward);
    if (this.input.isDown("KeyS") || this.input.isDown("ArrowDown")) move.sub(forward);
    if (this.input.isDown("KeyA") || this.input.isDown("ArrowLeft")) move.sub(right);
    if (this.input.isDown("KeyD") || this.input.isDown("ArrowRight")) move.add(right);

    // Integrate vertical velocity; reset to 0 when grounded (evaluated after previous frame's computeColliderMovement)
    if (this.controller.computedGrounded()) {
      this.velY = 0;
    } else {
      this.velY += -9.81 * dt;
    }
    const gravityDy = this.velY * dt;

    let desired = { x: 0, y: gravityDy, z: 0 };
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * dt);
      desired = { x: move.x, y: gravityDy, z: move.z };
      this.object.rotation.y = Math.atan2(move.x, move.z);
    }

    this.controller.computeColliderMovement(this.collider, desired);
    const corrected = this.controller.computedMovement();
    const t = this.body.translation();
    const nx = t.x + corrected.x, ny = t.y + corrected.y, nz = t.z + corrected.z;
    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    this.object.position.set(nx, ny - 1.0, nz);
  }
}
