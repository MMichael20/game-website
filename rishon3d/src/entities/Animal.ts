import * as THREE from "three";
import type { Agent } from "../game/EntityManager";
import type { Vec2 } from "../world/rishonMap";
import { getGeometry, getMaterial } from "../world/assets";
import { moveToward, reachedTarget, clampToBounds, pickTarget, pointInRects, type Rect } from "../game/wander";

export type AnimalKind = "cat" | "dog";

interface AnimalOpts { bounds: number; rects: Rect[] }

const STYLE: Record<AnimalKind, { color: number; scale: number; speed: number; radius: number }> = {
  cat: { color: 0x8a8a8a, scale: 0.5, speed: 1.1, radius: 7 },
  dog: { color: 0x9c6b3f, scale: 0.75, speed: 1.6, radius: 10 },
};

// Low-poly quadruped: body + head + 4 legs + tail, all from cached boxes.
// Reuses the same wander logic as pedestrians, with smaller radius/speed.
export class Animal implements Agent {
  readonly object = new THREE.Group();
  private legs: THREE.Object3D[] = [];
  private pos: Vec2;
  private target: Vec2;
  private phase = 0;
  private pause = 0;
  private readonly speed: number;
  private readonly radius: number;

  constructor(scene: THREE.Scene, private origin: Vec2, kind: AnimalKind, private opts: AnimalOpts) {
    const s = STYLE[kind];
    this.speed = s.speed;
    this.radius = s.radius;
    const mat = getMaterial(`animal-${kind}`, () => new THREE.MeshStandardMaterial({ color: s.color }));

    const body = new THREE.Mesh(getGeometry("animalBody", () => new THREE.BoxGeometry(0.4, 0.4, 0.9)), mat);
    body.position.y = 0.55; body.castShadow = true;
    const head = new THREE.Mesh(getGeometry("animalHead", () => new THREE.BoxGeometry(0.34, 0.34, 0.34)), mat);
    head.position.set(0, 0.7, 0.6); head.castShadow = true;
    const tail = new THREE.Mesh(getGeometry("animalTail", () => new THREE.BoxGeometry(0.1, 0.1, 0.4)), mat);
    tail.position.set(0, 0.65, -0.6);
    this.object.add(body, head, tail);

    const legGeo = getGeometry("animalLeg", () => {
      const g = new THREE.BoxGeometry(0.12, 0.45, 0.12);
      g.translate(0, -0.225, 0); // pivot at hip
      return g;
    });
    for (const [lx, lz] of [[-0.13, 0.3], [0.13, 0.3], [-0.13, -0.3], [0.13, -0.3]] as const) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx, 0.45, lz); leg.castShadow = true;
      this.object.add(leg);
      this.legs.push(leg);
    }

    this.object.scale.setScalar(s.scale);
    this.pos = { x: origin.x, z: origin.z };
    this.object.position.set(origin.x, 0, origin.z);
    this.target = this.newTarget();
    scene.add(this.object);
  }

  private newTarget(): Vec2 {
    for (let i = 0; i < 12; i++) {
      const t = clampToBounds(pickTarget(this.origin, this.radius, Math.random(), Math.random()), this.opts.bounds);
      if (!pointInRects(t, this.opts.rects)) return t;
    }
    return { x: this.origin.x, z: this.origin.z };
  }

  private swingLegs(intensity: number): void {
    const s = Math.sin(this.phase) * intensity;
    this.legs[0].rotation.x = s; this.legs[3].rotation.x = s;
    this.legs[1].rotation.x = -s; this.legs[2].rotation.x = -s;
  }

  update(dt: number): void {
    if (this.pause > 0) { this.pause -= dt; this.swingLegs(0); return; }
    const step = this.speed * dt;
    const next = clampToBounds(moveToward(this.pos, this.target, step), this.opts.bounds);
    if (pointInRects(next, this.opts.rects)) { this.target = this.newTarget(); this.swingLegs(0); return; }
    const dx = next.x - this.pos.x, dz = next.z - this.pos.z;
    if (dx !== 0 || dz !== 0) this.object.rotation.y = Math.atan2(dx, dz);
    this.pos = next;
    this.phase += step * 8;
    this.swingLegs(0.6);
    this.object.position.set(this.pos.x, 0, this.pos.z);
    if (reachedTarget(this.pos, this.target, 0.5)) {
      this.pause = 0.5 + Math.random() * 1.0;
      this.target = this.newTarget();
    }
  }
}
