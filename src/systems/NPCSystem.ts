import Phaser from 'phaser';
import type { NPCDef, NPCScheduleEntry, PathNode } from '../data/mapLayout';

// ---------------------------------------------------------------------------
// Behavior Strategy Interface
// ---------------------------------------------------------------------------

interface BehaviorStrategy {
  enter(npc: NPCEntity): void;
  update(npc: NPCEntity, delta: number): boolean; // true = done
  exit(npc: NPCEntity): void;
}

// ---------------------------------------------------------------------------
// NPC Entity (internal state)
// ---------------------------------------------------------------------------

interface NPCEntity {
  def: NPCDef;
  sprite: Phaser.GameObjects.Sprite;
  currentBehavior: BehaviorStrategy | null;
  currentScheduleIdx: number;
  // Movement state
  route: PathNode[];
  routeIdx: number;
  // Stuck detection
  lastX: number;
  lastY: number;
  stuckTimer: number;
  // Idle timer (for idle-at and sit-bench)
  idleTimer: number;
  idleDuration: number;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// BFS Pathfinding
// ---------------------------------------------------------------------------

function bfs(
  fromId: string,
  toId: string,
  networkMap: Map<string, PathNode>,
): PathNode[] | null {
  if (fromId === toId) return [networkMap.get(fromId)!];

  const queue: string[] = [fromId];
  const visited = new Set<string>([fromId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = networkMap.get(current);
    if (!node) continue;

    for (const neighborId of node.neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      parent.set(neighborId, current);

      if (neighborId === toId) {
        // Reconstruct path
        const path: PathNode[] = [];
        let id: string | undefined = toId;
        while (id !== undefined) {
          path.unshift(networkMap.get(id)!);
          id = parent.get(id);
        }
        return path;
      }
      queue.push(neighborId);
    }
  }

  return null; // no path
}

function findClosestNode(x: number, y: number, networkMap: Map<string, PathNode>): PathNode {
  let closest: PathNode | null = null;
  let closestDist = Infinity;
  for (const node of networkMap.values()) {
    const d = (node.x - x) ** 2 + (node.y - y) ** 2;
    if (d < closestDist) {
      closestDist = d;
      closest = node;
    }
  }
  return closest!;
}

// ---------------------------------------------------------------------------
// Concrete Behaviors
// ---------------------------------------------------------------------------

class WalkRouteBehavior implements BehaviorStrategy {
  private targetRoute: PathNode[] = [];
  private targetIdx = 0;

  constructor(private routeNodeIds: string[], private networkMap: Map<string, PathNode>) {}

  enter(npc: NPCEntity): void {
    // Build the full path from NPC's current position to route start, then the route itself
    const currentNode = findClosestNode(npc.sprite.x, npc.sprite.y, this.networkMap);
    const routeNodes = this.routeNodeIds
      .map(id => this.networkMap.get(id))
      .filter((n): n is PathNode => n !== undefined);

    if (routeNodes.length === 0) {
      this.targetRoute = [];
      return;
    }

    // BFS from current to first route node
    const pathToStart = bfs(currentNode.id, routeNodes[0].id, this.networkMap);
    if (pathToStart && pathToStart.length > 1) {
      // Combine: path to start (excluding last, which is first of route) + route
      this.targetRoute = [...pathToStart.slice(0, -1), ...routeNodes];
    } else {
      this.targetRoute = routeNodes;
    }
    this.targetIdx = 0;
  }

  update(npc: NPCEntity, delta: number): boolean {
    if (this.targetRoute.length === 0 || this.targetIdx >= this.targetRoute.length) {
      return true; // done
    }

    const target = this.targetRoute[this.targetIdx];
    const dx = target.x - npc.sprite.x;
    const dy = target.y - npc.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      // Reached node
      npc.sprite.setPosition(target.x, target.y);
      this.targetIdx++;
      return this.targetIdx >= this.targetRoute.length;
    }

    // Move toward target
    const speed = npc.def.speed * (delta / 1000);
    const angle = Math.atan2(dy, dx);
    npc.sprite.x += Math.cos(angle) * speed;
    npc.sprite.y += Math.sin(angle) * speed;

    // Face direction
    if (dx < -1) npc.sprite.setFlipX(true);
    else if (dx > 1) npc.sprite.setFlipX(false);

    // Play walk animation
    npc.sprite.play(`npc-${npc.def.id}-walk`, true);

    return false;
  }

  exit(npc: NPCEntity): void {
    npc.sprite.stop();
    npc.sprite.setTexture(`npc-${npc.def.id}-frame-0`);
  }
}

class IdleAtBehavior implements BehaviorStrategy {
  private flipTimer = 0;
  private nextFlipAt = 0;

  constructor(private nodeId: string, private networkMap: Map<string, PathNode>) {}

  enter(npc: NPCEntity): void {
    const node = this.networkMap.get(this.nodeId);
    if (node) {
      npc.sprite.setPosition(node.x, node.y);
    }
    npc.sprite.stop();
    npc.sprite.setTexture(`npc-${npc.def.id}-frame-0`);
    npc.idleTimer = 0;
    npc.idleDuration = 8000 + Math.random() * 12000; // 8-20 seconds
    this.flipTimer = 0;
    this.nextFlipAt = 3000 + Math.random() * 4000;
  }

  update(npc: NPCEntity, delta: number): boolean {
    npc.idleTimer += delta;
    this.flipTimer += delta;

    // Occasionally look around (threshold set once, not per-frame)
    if (this.flipTimer >= this.nextFlipAt) {
      npc.sprite.setFlipX(!npc.sprite.flipX);
      this.flipTimer = 0;
      this.nextFlipAt = 3000 + Math.random() * 4000;
    }

    return npc.idleTimer >= npc.idleDuration;
  }

  exit(_npc: NPCEntity): void {}
}

class SitBenchBehavior implements BehaviorStrategy {
  constructor(private nodeId: string, private networkMap: Map<string, PathNode>) {}

  enter(npc: NPCEntity): void {
    const node = this.networkMap.get(this.nodeId);
    if (node) {
      npc.sprite.setPosition(node.x, node.y);
    }
    npc.sprite.stop();
    npc.sprite.setTexture(`npc-${npc.def.id}-frame-0`);
    // Sitting = slightly lower position
    npc.sprite.y += 4;
    npc.idleTimer = 0;
    npc.idleDuration = 15000 + Math.random() * 15000; // 15-30 seconds
  }

  update(npc: NPCEntity, delta: number): boolean {
    npc.idleTimer += delta;
    return npc.idleTimer >= npc.idleDuration;
  }

  exit(npc: NPCEntity): void {
    npc.sprite.y -= 4; // stand back up
  }
}

// ---------------------------------------------------------------------------
// NPC System
// ---------------------------------------------------------------------------

export class NPCSystem {
  private npcs: NPCEntity[] = [];
  private networkMap: Map<string, PathNode>;
  private scene: Phaser.Scene;
  private updateIndex = 0;

  constructor(scene: Phaser.Scene, npcDefs: NPCDef[], pathNetwork: PathNode[]) {
    this.scene = scene;
    this.networkMap = new Map(pathNetwork.map(n => [n.id, n]));

    for (const def of npcDefs) {
      const startNode = this.getStartNode(def);
      const sprite = scene.add.sprite(startNode.x, startNode.y, `npc-${def.id}-frame-0`);
      sprite.setDepth(startNode.y);

      const npc: NPCEntity = {
        def,
        sprite,
        currentBehavior: null,
        currentScheduleIdx: -1,
        route: [],
        routeIdx: 0,
        lastX: startNode.x,
        lastY: startNode.y,
        stuckTimer: 0,
        idleTimer: 0,
        idleDuration: 0,
        visible: true,
      };

      this.npcs.push(npc);
    }
  }

  private getStartNode(def: NPCDef): PathNode {
    if (def.schedule.length > 0) {
      const first = def.schedule[0];
      if (first.route && first.route.length > 0) {
        const node = this.networkMap.get(first.route[0]);
        if (node) return node;
      }
      if (first.idleAt) {
        const node = this.networkMap.get(first.idleAt);
        if (node) return node;
      }
    }
    // Fallback: first node in network
    return this.networkMap.values().next().value!;
  }

  update(delta: number, gameTimeMinutes: number): void {
    // Adaptive throttling: at low FPS, update fewer NPCs per frame
    const fps = 1000 / Math.max(delta, 1);
    const npcsPerFrame = fps < 30 ? 2 : fps < 45 ? 3 : this.npcs.length;

    for (let i = 0; i < Math.min(npcsPerFrame, this.npcs.length); i++) {
      const idx = (this.updateIndex + i) % this.npcs.length;
      const scaledDelta = delta * (this.npcs.length / npcsPerFrame);
      this.updateNPC(this.npcs[idx], scaledDelta, gameTimeMinutes);
    }
    this.updateIndex = (this.updateIndex + npcsPerFrame) % this.npcs.length;

    // Ambient proximity interaction: idle NPCs near each other face one another
    this.updateProximityFacing();
  }

  private updateProximityFacing(): void {
    const idleNpcs = this.npcs.filter(n => n.visible && !(n.currentBehavior instanceof WalkRouteBehavior));
    for (let i = 0; i < idleNpcs.length; i++) {
      for (let j = i + 1; j < idleNpcs.length; j++) {
        const a = idleNpcs[i];
        const b = idleNpcs[j];
        const dx = b.sprite.x - a.sprite.x;
        const dist = Math.abs(dx) + Math.abs(b.sprite.y - a.sprite.y);
        if (dist < 48 * 2) {
          // Face each other
          a.sprite.setFlipX(dx > 0);
          b.sprite.setFlipX(dx < 0);
        }
      }
    }
  }

  private updateNPC(npc: NPCEntity, delta: number, gameTimeMinutes: number): void {
    // Check schedule
    const scheduleIdx = this.getActiveScheduleIndex(npc.def.schedule, gameTimeMinutes);

    // Visibility: hide NPCs outside any schedule window
    if (scheduleIdx === -1) {
      if (npc.visible) {
        npc.visible = false;
        npc.sprite.setVisible(false);
        if (npc.currentBehavior) {
          npc.currentBehavior.exit(npc);
          npc.currentBehavior = null;
        }
      }
      return;
    }

    if (!npc.visible) {
      npc.visible = true;
      npc.sprite.setVisible(true);
    }

    // Switch behavior if schedule changed
    if (scheduleIdx !== npc.currentScheduleIdx) {
      if (npc.currentBehavior) {
        npc.currentBehavior.exit(npc);
      }
      npc.currentScheduleIdx = scheduleIdx;
      npc.currentBehavior = this.createBehavior(npc.def.schedule[scheduleIdx]);
      npc.currentBehavior.enter(npc);
    }

    // Update current behavior
    if (npc.currentBehavior) {
      const done = npc.currentBehavior.update(npc, delta);
      if (done) {
        npc.currentBehavior.exit(npc);
        // Loop: re-enter same behavior (e.g., walk route again)
        npc.currentBehavior.enter(npc);
      }
    }

    // Depth sort
    npc.sprite.setDepth(npc.sprite.y);

    // Stuck detection (only when walking)
    if (npc.currentBehavior instanceof WalkRouteBehavior) {
      const moved = Math.abs(npc.sprite.x - npc.lastX) + Math.abs(npc.sprite.y - npc.lastY);
      if (moved < 2) {
        npc.stuckTimer += delta;
        if (npc.stuckTimer > 3000) {
          // Teleport to nearest path node
          const nearest = findClosestNode(npc.sprite.x, npc.sprite.y, this.networkMap);
          npc.sprite.setPosition(nearest.x, nearest.y);
          npc.stuckTimer = 0;
          console.warn(`NPC ${npc.def.id} was stuck, teleported to ${nearest.id}`);
        }
      } else {
        npc.stuckTimer = 0;
      }
      npc.lastX = npc.sprite.x;
      npc.lastY = npc.sprite.y;
    }
  }

  private getActiveScheduleIndex(schedule: NPCScheduleEntry[], gameTime: number): number {
    for (let i = 0; i < schedule.length; i++) {
      const entry = schedule[i];
      if (entry.startMinute <= entry.endMinute) {
        if (gameTime >= entry.startMinute && gameTime < entry.endMinute) return i;
      } else {
        // Wraps midnight
        if (gameTime >= entry.startMinute || gameTime < entry.endMinute) return i;
      }
    }
    return -1; // no active schedule
  }

  private createBehavior(entry: NPCScheduleEntry): BehaviorStrategy {
    switch (entry.behavior) {
      case 'walk-route':
        return new WalkRouteBehavior(entry.route ?? [], this.networkMap);
      case 'idle-at':
        return new IdleAtBehavior(entry.idleAt ?? '', this.networkMap);
      case 'sit-bench':
        return new SitBenchBehavior(entry.idleAt ?? '', this.networkMap);
      default:
        return new IdleAtBehavior('main-center', this.networkMap);
    }
  }

  /** Get all NPC sprites (for proximity checks, etc.) */
  getSprites(): Phaser.GameObjects.Sprite[] {
    return this.npcs.filter(n => n.visible).map(n => n.sprite);
  }

  destroy(): void {
    for (const npc of this.npcs) {
      npc.sprite.destroy();
    }
    this.npcs = [];
  }
}
