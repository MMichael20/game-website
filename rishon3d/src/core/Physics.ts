import RAPIER from "@dimforge/rapier3d-compat";

export { RAPIER };

export class Physics {
  readonly world: RAPIER.World;
  private static ready = false;

  static async init(): Promise<void> {
    if (!Physics.ready) { await RAPIER.init(); Physics.ready = true; }
  }

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  }

  step(dt: number): void {
    this.world.timestep = Math.min(dt, 1 / 30);
    this.world.step();
  }
}
