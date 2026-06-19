export interface MiniPoint { x: number; y: number }
export interface MiniRect { x: number; y: number; w: number; h: number }

// World XZ spans [-worldSize/2, +worldSize/2]; minimap pixel space is [0, mapPx].
// World +z maps downward on the minimap (screen-natural).
export function worldToMinimap(wx: number, wz: number, worldSize: number, mapPx: number): MiniPoint {
  const half = worldSize / 2;
  return {
    x: ((wx + half) / worldSize) * mapPx,
    y: ((wz + half) / worldSize) * mapPx,
  };
}

// A centered world footprint (cx,cz,w,d) as a top-left pixel rect + pixel size.
export function worldRectToMinimap(
  cx: number, cz: number, w: number, d: number, worldSize: number, mapPx: number,
): MiniRect {
  const tl = worldToMinimap(cx - w / 2, cz - d / 2, worldSize, mapPx);
  const scale = mapPx / worldSize;
  return { x: tl.x, y: tl.y, w: w * scale, h: d * scale };
}
