import * as THREE from "three";
import type { Tickable } from "./Engine";

export class FollowCamera implements Tickable {
  private target?: THREE.Object3D;
  private offset = new THREE.Vector3(0, 6, 10);
  private desired = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {}

  setTarget(obj: THREE.Object3D, offset: THREE.Vector3): void {
    this.target = obj;
    this.offset.copy(offset);
  }

  update(dt: number): void {
    if (!this.target) return;
    this.desired.copy(this.target.position).add(this.offset);
    const lerp = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
    this.camera.position.lerp(this.desired, lerp);
    this.camera.lookAt(this.target.position);
  }
}
