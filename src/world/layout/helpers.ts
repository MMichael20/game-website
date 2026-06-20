import type { Placement } from "../system/types";
import type { RowOpts, GridOpts, RingOpts } from "./types";

/** A straight line of `count` copies of `kind`, `gap` metres apart along one axis. */
export function row(kind: string, o: RowOpts): Placement[] {
  const out: Placement[] = [];
  const axis = o.axis ?? "x";
  for (let i = 0; i < o.count; i++) {
    const d = i * o.gap;
    out.push({
      kind,
      x: axis === "x" ? o.x + d : o.x,
      z: axis === "z" ? o.z + d : o.z,
      rot: o.rot,
      params: o.params,
    });
  }
  return out;
}

/** A cols×rows grid of `kind`: `gap` apart in x, `gapZ` (default `gap`) apart in z. */
export function grid(kind: string, o: GridOpts): Placement[] {
  const out: Placement[] = [];
  const gz = o.gapZ ?? o.gap;
  for (let r = 0; r < o.rows; r++) {
    for (let c = 0; c < o.cols; c++) {
      out.push({ kind, x: o.x + c * o.gap, z: o.z + r * gz, rot: o.rot, params: o.params });
    }
  }
  return out;
}

/** `count` copies of `kind` evenly spaced on a circle of `radius` around (x,z). */
export function ring(kind: string, o: RingOpts): Placement[] {
  const out: Placement[] = [];
  for (let i = 0; i < o.count; i++) {
    const t = (i / o.count) * Math.PI * 2;
    out.push({
      kind,
      x: o.x + Math.cos(t) * o.radius,
      z: o.z + Math.sin(t) * o.radius,
      rot: o.rot,
      params: o.params,
    });
  }
  return out;
}
