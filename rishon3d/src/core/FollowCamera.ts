import * as THREE from "three";
import type { Tickable } from "./Engine";
import { cameraOffset, clampPitch } from "./cameraMath";

const SENSITIVITY = 0.0026; // radians per pixel of mouse movement
const MIN_DIST = 4;
const MAX_DIST = 20; // headroom for the pulled-back driving distance (14) + zoom-out

// Third-person orbit camera (GTA-style): mouse orbits yaw/pitch around the
// target, scroll zooms. Movement code reads camera.quaternion, so on-foot
// control stays camera-relative automatically.
export class FollowCamera implements Tickable {
  private target?: THREE.Object3D;
  private yaw = 0;
  private pitch = 0.34; // lower, street-level starting angle (props read at player scale)
  private distance = 8; // matches the on-foot default; close enough to walk the street
  private lookHeight = 1.6;
  private desired = new THREE.Vector3();
  private lookAtPoint = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {}

  setTarget(obj: THREE.Object3D, distance: number, lookHeight: number): void {
    this.target = obj;
    this.distance = distance;
    this.lookHeight = lookHeight;
  }

  // dx/dy are raw mouse movement deltas (pixels).
  addOrbit(dx: number, dy: number): void {
    this.yaw -= dx * SENSITIVITY;
    this.pitch = clampPitch(this.pitch + dy * SENSITIVITY);
  }

  zoom(deltaY: number): void {
    this.distance = Math.max(MIN_DIST, Math.min(MAX_DIST, this.distance + deltaY * 0.01));
  }

  update(dt: number): void {
    if (!this.target) return;
    const off = cameraOffset(this.yaw, this.pitch, this.distance);
    this.desired.set(
      this.target.position.x + off.x,
      this.target.position.y + off.y,
      this.target.position.z + off.z,
    );
    const lerp = 1 - Math.pow(0.0001, dt); // frame-rate independent smoothing
    this.camera.position.lerp(this.desired, lerp);
    this.lookAtPoint.set(
      this.target.position.x,
      this.target.position.y + this.lookHeight,
      this.target.position.z,
    );
    this.camera.lookAt(this.lookAtPoint);
  }
}
