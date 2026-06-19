import * as THREE from "three";
import type { Tickable } from "../core/Engine";
import { inRange } from "./culling";

// An agent is anything with a scene object and per-frame update (NPC people,
// animals, traffic). The manager owns the population and applies a simple
// distance LOD: agents beyond cullDistance are hidden and skip their update.
export interface Agent extends Tickable {
  readonly object: THREE.Object3D;
}

export class EntityManager implements Tickable {
  private agents: Agent[] = [];

  constructor(
    private getCameraPos: () => THREE.Vector3,
    private cullDistance = 130,
  ) {}

  add(agent: Agent): void {
    this.agents.push(agent);
  }

  get count(): number {
    return this.agents.length;
  }

  update(dt: number): void {
    const cam = this.getCameraPos();
    for (const a of this.agents) {
      const p = a.object.position;
      const visible = inRange(p.x - cam.x, p.z - cam.z, this.cullDistance);
      a.object.visible = visible;
      if (visible) a.update(dt);
    }
  }
}
