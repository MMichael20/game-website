// src/game/systems/Pathfinder.ts
// Standalone A* pathfinding on a tile grid. No Phaser dependencies.

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

type WalkCheck = (tileX: number, tileY: number) => boolean;

const CARDINAL = [
  { x: 0, y: -1 }, // up
  { x: 1, y: 0 },  // right
  { x: 0, y: 1 },  // down
  { x: -1, y: 0 }, // left
];

const DIAGONAL = [
  { x: -1, y: -1 }, // up-left
  { x: 1, y: -1 },  // up-right
  { x: -1, y: 1 },  // down-left
  { x: 1, y: 1 },   // down-right
];

const DIRS = [...CARDINAL, ...DIAGONAL];
const SQRT2 = Math.SQRT2;

const MAX_VISITED = 2000;

/** Octile distance — admissible heuristic for 8-directional grids */
function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * A* pathfinding on a tile grid (8-directional with diagonal support).
 * Returns array of tile coords from start to end (inclusive), or empty if unreachable.
 * If endX/endY is unwalkable, tries the nearest walkable neighbor.
 * Diagonals are blocked when either adjacent cardinal tile is unwalkable (no corner-cutting).
 */
export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  walkCheck: WalkCheck,
  gridW: number,
  gridH: number,
): Array<{ x: number; y: number }> {
  // If start equals end, nothing to do
  if (startX === endX && startY === endY) return [];

  // If end tile is unwalkable, find nearest walkable neighbor
  let goalX = endX;
  let goalY = endY;
  if (!walkCheck(goalX, goalY)) {
    let best: { x: number; y: number; dist: number } | null = null;
    for (const d of DIRS) {
      const nx = goalX + d.x;
      const ny = goalY + d.y;
      if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH && walkCheck(nx, ny)) {
        const dist = octile(startX, startY, nx, ny);
        if (!best || dist < best.dist) {
          best = { x: nx, y: ny, dist };
        }
      }
    }
    if (!best) return []; // completely surrounded by unwalkable
    goalX = best.x;
    goalY = best.y;
  }

  // If start is same as adjusted goal
  if (startX === goalX && startY === goalY) return [];

  // A* search
  const open: Node[] = [];
  const closed = new Set<string>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: octile(startX, startY, goalX, goalY),
    f: octile(startX, startY, goalX, goalY),
    parent: null,
  };
  open.push(startNode);

  let visited = 0;

  while (open.length > 0 && visited < MAX_VISITED) {
    // Find lowest f in open list
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    const ck = key(current.x, current.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    visited++;

    // Goal reached
    if (current.x === goalX && current.y === goalY) {
      const path: Array<{ x: number; y: number }> = [];
      let node: Node | null = current;
      while (node) {
        path.push({ x: node.x, y: node.y });
        node = node.parent;
      }
      path.reverse();
      return path;
    }

    // Expand neighbors
    for (const d of DIRS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
      if (!walkCheck(nx, ny)) continue;
      if (closed.has(key(nx, ny))) continue;

      // Prevent corner-cutting: for diagonal moves, both adjacent cardinal tiles must be walkable
      const isDiag = d.x !== 0 && d.y !== 0;
      if (isDiag) {
        if (!walkCheck(current.x + d.x, current.y) || !walkCheck(current.x, current.y + d.y)) continue;
      }

      const cost = isDiag ? SQRT2 : 1;
      const g = current.g + cost;
      const h = octile(nx, ny, goalX, goalY);
      open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
    }
  }

  return []; // unreachable
}
