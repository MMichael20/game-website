import type { Placement } from "../system/types";

/** Integer grid cell index. */
export interface Cell { col: number; row: number; }

/** Grid placement: world origin of cell (0,0) and per-step cell size in metres. */
export interface GridSpec { originX: number; originZ: number; cellW: number; cellD: number; }

/** A lot: a building and/or props placed at a grid cell, authored in lot-local coords. */
export interface LotSpec {
  cell: Cell;
  building?: string;
  buildingParams?: Record<string, unknown>;
  rot?: number;                 // {0,90,180,270}, applied to the whole lot
  props?: Placement[];          // x,z are lot-local (relative to the cell centre)
}

export interface RowOpts {
  x: number; z: number; count: number; gap: number;
  axis?: "x" | "z"; rot?: number; params?: Record<string, unknown>;
}
export interface GridOpts {
  x: number; z: number; cols: number; rows: number; gap: number;
  gapZ?: number; rot?: number; params?: Record<string, unknown>;
}
export interface RingOpts {
  x: number; z: number; count: number; radius: number;
  rot?: number; params?: Record<string, unknown>;
}
