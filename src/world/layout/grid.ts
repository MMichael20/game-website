import type { Cell, GridSpec } from "./types";

/** Default grid: origin at world (0,0), 8m square cells. */
export const DEFAULT_GRID: GridSpec = { originX: 0, originZ: 0, cellW: 8, cellD: 8 };

/** World-space centre of a single grid cell. */
export function cell(c: Cell, grid: GridSpec = DEFAULT_GRID): { x: number; z: number } {
  return { x: grid.originX + c.col * grid.cellW, z: grid.originZ + c.row * grid.cellD };
}

/** World-space centre of a w×h block of cells whose corner cell is `c`. */
export function cellRegion(
  c: Cell, w: number, h: number, grid: GridSpec = DEFAULT_GRID,
): { x: number; z: number } {
  const first = cell(c, grid);
  return { x: first.x + ((w - 1) * grid.cellW) / 2, z: first.z + ((h - 1) * grid.cellD) / 2 };
}
