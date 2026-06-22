import * as THREE from "three";
import type { Tickable } from "./Engine";
import { Physics, RAPIER } from "./Physics";
import { cameraOffset, clampPitch, clampCameraDistance } from "./cameraMath";

const SENSITIVITY = 0.0026; // radians per pixel of mouse movement
const MIN_DIST = 0.6; // low enough that tight interiors can pull the camera right behind you
const MAX_DIST = 20; // headroom for the pulled-back driving distance (14) + zoom-out
const SKIN = 0.3; // back the camera off the wall so the near plane clears it

// Third-person orbit camera (GTA-style): mouse orbits yaw/pitch around the
// target, scroll zooms. Movement code reads camera.quaternion, so on-foot
// control stays camera-relative automatically.
//
// Wall-aware: each frame it casts a ray from the player's head toward where the
// camera wants to sit and pulls the camera in to just before any wall, ceiling
// or solid prop. That keeps the camera inside a room when you walk into a shop.
export class FollowCamera implements Tickable {
  private target?: THREE.Object3D;
  private excludeBody?: RAPIER.RigidBody;
  private yaw = 0;
  private pitch = 0.34; // lower, street-level starting angle (props read at player scale)
  private distance = 8; // matches the on-foot default; close enough to walk the street
  private lookHeight = 1.6;
  private desired = new THREE.Vector3();
  private head = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private lookAtPoint = new THREE.Vector3();
  private ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  // Smoothed camera distance from the head. Driving the distance (not snapping the
  // position) is what keeps the camera steady: outdoors it sits at a constant
  // distance with no jitter; indoors it eases in/out smoothly.
  private curDist = 8;

  constructor(private camera: THREE.PerspectiveCamera, private physics: Physics) {}

  // `excludeBody` is the active target's Rapier body, kept out of the wall-cast
  // so the camera doesn't immediately hit the player capsule / car it follows.
  setTarget(
    obj: THREE.Object3D,
    distance: number,
    lookHeight: number,
    excludeBody?: RAPIER.RigidBody,
  ): void {
    this.target = obj;
    this.distance = distance;
    this.lookHeight = lookHeight;
    this.excludeBody = excludeBody;
    this.curDist = distance; // start at the new target's distance, no transition jump
  }

  // dx/dy are raw mouse movement deltas (pixels).
  addOrbit(dx: number, dy: number): void {
    this.yaw -= dx * SENSITIVITY;
    this.pitch = clampPitch(this.pitch + dy * SENSITIVITY);
  }

  zoom(deltaY: number): void {
    this.distance = Math.max(MIN_DIST, Math.min(MAX_DIST, this.distance + deltaY * 0.01));
  }

  // Distance to the nearest solid collider along head -> camera, or null if clear.
  private castDistance(maxDist: number): number | null {
    this.ray.origin = this.head;
    this.ray.dir = this.dir;
    const hit = this.physics.world.castRay(
      this.ray, maxDist, true, undefined, undefined, undefined, this.excludeBody,
    );
    return hit ? hit.timeOfImpact : null;
  }

  update(dt: number): void {
    if (!this.target) return;

    const off = cameraOffset(this.yaw, this.pitch, this.distance);
    this.head.set(
      this.target.position.x,
      this.target.position.y + this.lookHeight,
      this.target.position.z,
    );
    this.desired.set(
      this.target.position.x + off.x,
      this.target.position.y + off.y,
      this.target.position.z + off.z,
    );

    // Cast from the head toward the desired camera spot and pull in past any wall.
    this.dir.subVectors(this.desired, this.head);
    const maxDist = this.dir.length();
    let camDist = maxDist;
    if (maxDist > 1e-4) {
      this.dir.multiplyScalar(1 / maxDist); // normalize (timeOfImpact is then a distance)
      const hit = this.castDistance(maxDist);
      camDist = clampCameraDistance(hit, maxDist, SKIN, MIN_DIST);
    }
    // Ease the DISTANCE toward the target: pull in quickly (so a wall doesn't show
    // through) but ease back out gently. No per-frame position snap, so the camera
    // stays rock-steady during normal play instead of oscillating.
    const inRate = 1 - Math.pow(1e-6, dt);   // ~0.2/frame at 60fps — quick
    const outRate = 1 - Math.pow(0.05, dt);  // ~0.05/frame — gentle
    const rate = camDist < this.curDist ? inRate : outRate;
    this.curDist += (camDist - this.curDist) * rate;

    this.camera.position.copy(this.head).addScaledVector(this.dir, this.curDist);
    this.lookAtPoint.copy(this.head);
    this.camera.lookAt(this.lookAtPoint);
  }
}
