// src/game/entities/NPC.ts
import Phaser from 'phaser';
import { tileToWorld } from '../data/mapLayout';

type NPCState = 'idle' | 'walking' | 'sitting';

const NPC_SPEED = 40;

export class NPC {
  public sprite: Phaser.GameObjects.Sprite;
  private state: NPCState;
  private walkPath: Array<{ x: number; y: number }>;
  private currentPathIndex = 0;
  private targetPos: { x: number; y: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    behavior: 'idle' | 'walk' | 'sit',
    walkPath?: Array<{ x: number; y: number }>,
  ) {
    const worldPos = tileToWorld(tileX, tileY);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, 'npc-default');
    this.sprite.setDepth(8);

    this.walkPath = walkPath ?? [];
    this.state = behavior === 'walk' ? 'walking' : behavior === 'sit' ? 'sitting' : 'idle';

    if (this.state === 'walking' && this.walkPath.length > 1) {
      this.currentPathIndex = 0;
      this.setNextTarget();
    }
  }

  private setNextTarget(): void {
    this.currentPathIndex = (this.currentPathIndex + 1) % this.walkPath.length;
    const tile = this.walkPath[this.currentPathIndex];
    this.targetPos = tileToWorld(tile.x, tile.y);
  }

  update(delta: number): void {
    if (this.state !== 'walking' || !this.targetPos) return;

    const dx = this.targetPos.x - this.sprite.x;
    const dy = this.targetPos.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.sprite.x = this.targetPos.x;
      this.sprite.y = this.targetPos.y;
      // Brief pause then next target
      this.sprite.scene.time.delayedCall(1000, () => {
        this.setNextTarget();
      });
      this.targetPos = null;
      return;
    }

    const step = NPC_SPEED * (delta / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
