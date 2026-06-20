import type { Placement } from "../system/types";
import type { LotSpec, GridSpec } from "./types";
import { cell, DEFAULT_GRID } from "./grid";
import { rotateXZ } from "../system/transform";

/**
 * Expand a lot into world-space placements. The building (if any) and every prop
 * are authored in lot-LOCAL coords (centre = the cell centre); each is rotated by
 * the lot's `rot` (90° increments) and offset to the lot's world cell. This is the
 * "move-together" unit: change the cell and the whole lot follows.
 */
export function lot(spec: LotSpec, grid: GridSpec = DEFAULT_GRID): Placement[] {
  const origin = cell(spec.cell, grid);
  const rot = spec.rot ?? 0;
  const out: Placement[] = [];

  const place = (
    kind: string, lx: number, lz: number, localRot: number, params?: Record<string, unknown>,
  ) => {
    const r = rotateXZ(lx, lz, rot);
    out.push({ kind, x: origin.x + r.x, z: origin.z + r.z, rot: (localRot + rot) % 360, params });
  };

  if (spec.building) place(spec.building, 0, 0, 0, spec.buildingParams);
  for (const p of spec.props ?? []) {
    place(p.kind, p.x ?? 0, p.z ?? 0, p.rot ?? 0, p.params);
  }
  return out;
}
