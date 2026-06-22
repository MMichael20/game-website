import * as THREE from "three";
import { Physics, RAPIER } from "../core/Physics";
import type { Input } from "../core/Input";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";
import { makeHumanoid, animateWalk, animateIdle, applyPhonePose, type HumanoidLimbs } from "./Humanoid";

const SPEED = 8;       // walking
const RUN_SPEED = 13;  // holding Shift
const TURBO_SPEED = 120; // holding Space: dev-only fly-through to scan the map fast

export class Character implements Tickable {
  readonly object = new THREE.Group();
  enabled = true;

  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private controller: RAPIER.KinematicCharacterController;
  private limbs: HumanoidLimbs;
  private phase = 0;
  private idlePhase = 0;       // always-advancing clock for the breathing idle
  private gait = 0;            // eased walk/run amplitude (no snap on Shift/start/stop)
  private phoneAnim = 0;       // 0 = phone down, 1 = fully raised (eased)
  private phoneTarget = 0;     // where phoneAnim is heading (set on phone open/close)
  private phoneSway = 0;       // clock for the looking/scrolling micro-motion
  private tmp = new THREE.Vector3();
  private tmpRight = new THREE.Vector3();
  private tmpMove = new THREE.Vector3();
  private static readonly UP = new THREE.Vector3(0, 1, 0);
  private velY = 0;
  // Set by setPosition(); consumed on the next update() frame. Needed because
  // setNextKinematicTranslation() doesn't update body.translation() until the
  // physics step runs, so without this the teleport gets overwritten by the
  // same-frame update() reading the stale (pre-teleport) translation.
  private teleportTo: { x: number; y: number; z: number } | null = null;

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    private input: Input,
    spawn: Vec2,
    private camera: THREE.Camera,
  ) {
    // Explicit warm medium-brown hair to match the City Traveler reference (the
    // deterministic fallback color happens to land near-black for this palette).
    const h = makeHumanoid({ skin: 0xf0c9a0, shirt: 0x2e6fb0, pants: 0x274060, hair: 0x4a3526 });
    this.object.add(h.group);
    this.limbs = h.limbs;
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

  // The Rapier body, so the follow camera can exclude it from its wall-cast.
  get rigidBody(): RAPIER.RigidBody { return this.body; }

  setPosition(x: number, z: number): void {
    this.body.setNextKinematicTranslation({ x, y: 1.0, z });
    this.object.position.set(x, 0, z);
    this.teleportTo = { x, y: 1.0, z };
    this.velY = 0;
  }

  update(dt: number): void {
    if (!this.enabled) return;

    // camera-relative input direction on XZ plane
    const forward = this.tmp.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0; forward.normalize();
    // cross(forward, up) with right-hand rule: when forward = -Z, result = +X (screen-right). No negate needed.
    const right = this.tmpRight.crossVectors(forward, Character.UP).normalize();

    const move = this.tmpMove.set(0, 0, 0);
    if (this.input.isDown("KeyW") || this.input.isDown("ArrowUp")) move.add(forward);
    if (this.input.isDown("KeyS") || this.input.isDown("ArrowDown")) move.sub(forward);
    if (this.input.isDown("KeyA") || this.input.isDown("ArrowLeft")) move.sub(right);
    if (this.input.isDown("KeyD") || this.input.isDown("ArrowRight")) move.add(right);
    // Analog joystick (mobile): additive with the keys, camera-relative.
    move.addScaledVector(forward, this.input.move.y);
    move.addScaledVector(right, this.input.move.x);

    const turbo = this.input.isDown("Space"); // dev: hold to zoom around the map
    const running = this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight");
    const speed = turbo ? TURBO_SPEED : running ? RUN_SPEED : SPEED;

    // Integrate vertical velocity; reset to 0 when grounded (evaluated after previous frame's computeColliderMovement)
    if (this.controller.computedGrounded()) {
      this.velY = 0;
    } else {
      this.velY += -9.81 * dt;
    }
    const gravityDy = this.velY * dt;

    this.idlePhase += dt * 1.6; // breathing clock, always advances

    let desired = { x: 0, y: gravityDy, z: 0 };
    let bob = 0;
    const moving = move.lengthSq() > 1e-6;
    if (moving) {
      // Scale by clamped magnitude so a partial joystick push walks slowly; a
      // single key or keyboard diagonal both clamp to 1 (keyboard feel unchanged).
      const mag = Math.min(1, move.length());
      move.normalize().multiplyScalar(speed * dt * mag);
      desired = { x: move.x, y: gravityDy, z: move.z };
      this.object.rotation.y = Math.atan2(move.x, move.z);
      this.phase += speed * dt * 6;
    }

    // Limb animation. The phone pose owns the limbs while it's up (ticked separately
    // in tickPhone, which runs even when gameplay is frozen); otherwise ease the gait
    // amplitude toward walk/run/idle so transitions don't snap.
    if (this.phoneAnim <= 0.01) {
      const targetGait = moving ? (running ? 0.95 : 0.6) : 0;
      this.gait += (targetGait - this.gait) * (1 - Math.pow(0.0005, dt));
      if (moving) {
        animateWalk(this.limbs, this.phase, this.gait);
        bob = Math.abs(Math.sin(this.phase)) * (running ? 0.07 : 0.04) * (this.gait / 0.95);
      } else {
        animateIdle(this.limbs, this.idlePhase);
      }
    }

    this.controller.computeColliderMovement(this.collider, desired);
    const corrected = this.controller.computedMovement();
    // On the frame after a teleport, body.translation() is still the stale
    // pre-teleport position (setNextKinematicTranslation applies on the physics
    // step), so use the teleport target as the base to avoid snapping back.
    const t = this.teleportTo ?? this.body.translation();
    this.teleportTo = null;
    const nx = t.x + corrected.x, ny = t.y + corrected.y, nz = t.z + corrected.z;
    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    this.object.position.set(nx, ny - 1.0 + bob, nz);
  }

  // Aim the phone pose up (on) or down (off). The actual motion is eased in tickPhone.
  setPhonePose(on: boolean): void {
    this.phoneTarget = on ? 1 : 0;
  }

  // Advance + apply the phone raise/lower. Called every frame by Game — including
  // while the phone UI is up and gameplay (update) is frozen — so the raise plays
  // with the UI open and the lower plays after it closes.
  tickPhone(dt: number): void {
    this.phoneSway += dt * 2.2;
    this.phoneAnim += (this.phoneTarget - this.phoneAnim) * (1 - Math.pow(0.0009, dt));
    if (this.phoneAnim > 0.01) applyPhonePose(this.limbs, this.phoneAnim, this.phoneSway);
  }
}
