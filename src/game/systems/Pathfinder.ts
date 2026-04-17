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

// Raised from 2000 -> 4000 since heap-based selection is O(log n) instead of
// O(n); the budget is now spent on exploring, not on scanning.
const MAX_VISITED = 4000;

/** Octile distance — admissible heuristic for 8-directional grids */
function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

// ── minimal binary min-heap keyed on (f, h) ──────────────────────────────
// Ties broken by h (prefer nodes closer to goal) — produces smoother paths
// and avoids flat-f plateaus that cause the old linear scan to bounce around.
class NodeHeap {
  private data: Node[] = [];

  get size(): number { return this.data.length; }

  push(n: Node): void {
    this.data.push(n);
    this.siftUp(this.data.length - 1);
  }

  pop(): Node | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private less(a: Node, b: Node): boolean {
    return a.f < b.f || (a.f === b.f && a.h < b.h);
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.less(this.data[i], this.data[p])) {
        [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
        i = p;
      } else break;
    }
  }

  private siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let best = i;
      if (l < n && this.less(this.data[l], this.data[best])) best = l;
      if (r < n && this.less(this.data[r], this.data[best])) best = r;
      if (best === i) break;
      [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
      i = best;
    }
  }
}

function reconstruct(end: Node): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let node: Node | null = end;
  while (node) {
    path.push({ x: node.x, y: node.y });
    node = node.parent;
  }
  path.reverse();
  return path;
}

/**
 * A* pathfinding on a tile grid (8-directional with diagonal support).
 * Returns array of tile coords from start to end (inclusive), or empty if unreachable.
 *
 * If endX/endY is unwalkable, tries the nearest walkable neighbor.
 * Diagonals are blocked when either adjacent cardinal tile is unwalkable (no corner-cutting).
 *
 * On MAX_VISITED exhaustion (search budget spent without finding the goal),
 * returns the best-so-far path — from start to the closest node we saw by
 * heuristic. This prevents long clicks across Budapest from doing nothing;
 * the player moves toward their intent instead of standing still. When the
 * goal is genuinely unreachable (open list drained), returns [].
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
  const open = new NodeHeap();
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
  // Track the closest node to the goal we've seen, for the best-so-far fallback.
  let closest: Node = startNode;

  while (open.size > 0 && visited < MAX_VISITED) {
    const current = open.pop()!;

    const ck = key(current.x, current.y);
    if (closed.has(ck)) continue;
    closed.add(ck);
    visited++;

    if (current.h < closest.h) closest = current;

    // Goal reached
    if (current.x === goalX && current.y === goalY) {
      return reconstruct(current);
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

  // Only produce a best-so-far path on budget exhaustion, not on a truly
  // drained open list (i.e. goal is in an unreachable pocket). Otherwise
  // clicks inside a sealed room would pull the player to the closest wall,
  // which feels worse than doing nothing.
  if (visited >= MAX_VISITED && closest !== startNode) {
    return reconstruct(closest);
  }

  return []; // unreachable
}
