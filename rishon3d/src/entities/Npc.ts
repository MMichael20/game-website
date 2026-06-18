import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import type { Vec2 } from "../world/rishonMap";
import { makeHumanoid, animateWalk, type HumanoidPalette, type HumanoidLimbs } from "./Humanoid";
import { moveToward, reachedTarget, clampToBounds, pickTarget, pointInRects, type Rect } from "../game/wander";

interface NpcOpts { bounds: number; rects: Rect[]; radius?: number; speed?: number }

export class Npc implements Tickable {
  readonly object: THREE.Group;
  private limbs: HumanoidLimbs;
  private pos: Vec2;
  private target: Vec2;
  private phase = 0;
  private pause = 0;
  private readonly radius: number;
  private readonly speed: number;

  constructor(scene: THREE.Scene, private origin: Vec2, palette: HumanoidPalette, private opts: NpcOpts) {
    const h = makeHumanoid(palette);
    this.object = h.group;
    this.limbs = h.limbs;
    this.radius = opts.radius ?? 12;
    this.speed = opts.speed ?? 1.6;
    this.pos = { x: origin.x, z: origin.z };
    this.target = this.newTarget();
    this.object.position.set(origin.x, 0, origin.z);
    scene.add(this.object);
  }

  private newTarget(): Vec2 {
    for (let i = 0; i < 12; i++) {
      const t = clampToBounds(pickTarget(this.origin, this.radius, Math.random(), Math.random()), this.opts.bounds);
      if (!pointInRects(t, this.opts.rects)) return t;
    }
    return { x: this.origin.x, z: this.origin.z };
  }

  update(dt: number): void {
    if (this.pause > 0) {
      this.pause -= dt;
      animateWalk(this.limbs, this.phase, 0);
      return;
    }
    const step = this.speed * dt;
    const next = clampToBounds(moveToward(this.pos, this.target, step), this.opts.bounds);
    if (pointInRects(next, this.opts.rects)) {
      this.target = this.newTarget();
      animateWalk(this.limbs, this.phase, 0);
      return;
    }
    const dx = next.x - this.pos.x, dz = next.z - this.pos.z;
    if (dx !== 0 || dz !== 0) this.object.rotation.y = Math.atan2(dx, dz);
    this.pos = next;
    this.phase += step * 6;
    animateWalk(this.limbs, this.phase, 0.5);
    this.object.position.set(this.pos.x, 0, this.pos.z);
    if (reachedTarget(this.pos, this.target, 0.6)) {
      this.pause = 0.6 + Math.random() * 0.8;
      this.target = this.newTarget();
    }
  }
}
