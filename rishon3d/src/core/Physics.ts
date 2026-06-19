import RAPIER from "@dimforge/rapier3d-compat";
import { accumulateSteps } from "./timestep";

export { RAPIER };

const FIXED_STEP = 1 / 60;
const MAX_SUBSTEPS = 5;

export class Physics {
  readonly world: RAPIER.World;
  private static ready = false;
  private carry = 0;

  static async init(): Promise<void> {
    if (!Physics.ready) { await RAPIER.init(); Physics.ready = true; }
  }

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = FIXED_STEP;
  }

  step(dt: number): void {
    const { steps, remainder } = accumulateSteps(this.carry, dt, FIXED_STEP, MAX_SUBSTEPS);
    this.carry = remainder;
    for (let i = 0; i < steps; i++) this.world.step();
  }
}
