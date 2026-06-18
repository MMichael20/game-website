import type { Vec2 } from "./rishonMap";

// A district is a square region with a uniform street grid and a building style.
// The procedural generator (cityGen) turns a spec into buildings/roads/props.
export interface DistrictSpec {
  id: string;
  center: Vec2;
  size: number;        // side length of the square footprint, world units
  blocks: number;      // grid divisions per side (blocks x blocks cells)
  seed: number;
  palette: number[];   // candidate building colors
  minHeight: number;
  maxHeight: number;
  density: number;     // 0..1 probability a cell receives a building
}
