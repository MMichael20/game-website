// src/game/entities/NPC.ts
import Phaser from 'phaser';
import { NPCDef, tileToWorld } from '../data/mapLayout';
import {
  TILE_SIZE, FACING_OFFSETS, TRIGGER_INDICATOR_COLOR, TRIGGER_INDICATOR_ALPHA,
} from '../../utils/constants';

type NPCState = 'idle' | 'walking' | 'sitting';

const DEFAULT_NPC_SPEED = 40;

export class NPC {
  public sprite: Phaser.GameObjects.Sprite;
  public readonly id: string;
  public readonly interactable: boolean;
  public readonly onInteract?: string;
  public readonly interactionData?: {
    lines?: string[];
    sceneKey?: string;
    sceneData?: any;
  };

  // Trigger zone (only for interactable non-walking NPCs)
  public readonly facingDirection: 'up' | 'down' | 'left' | 'right';
  public readonly triggerTile: { tileX: number; tileY: number } | null = null;
  public triggerIndicator: Phaser.GameObjects.Rectangle | null = null;

  private state: NPCState;
  private walkPath: Array<{ x: number; y: number }>;
  private currentPathIndex = 0;
  private targetPos: { x: number; y: number } | null = null;
  private speed: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, def: NPCDef) {
    this.scene = scene;
    this.id = def.id;
    this.interactable = def.interactable ?? false;
    this.onInteract = def.onInteract;
    this.interactionData = def.interactionData;
    this.facingDirection = def.facingDirection ?? 'down';

    const worldPos = tileToWorld(def.tileX, def.tileY);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, def.texture ?? 'npc-default');
    this.sprite.setDepth(8);

    this.walkPath = def.walkPath ?? [];
    this.speed = def.speed ?? DEFAULT_NPC_SPEED;
    this.state = def.behavior === 'walk' ? 'walking' : def.behavior === 'sit' ? 'sitting' : 'idle';

    // Compute trigger tile for interactable non-walking NPCs
    if (this.interactable && this.state !== 'walking') {
      const offset = FACING_OFFSETS[this.facingDirection];
      this.triggerTile = {
        tileX: def.tileX + offset.dx,
        tileY: def.tileY + offset.dy,
      };

      // Create subtle ground indicator on trigger tile
      const triggerWorldPos = tileToWorld(this.triggerTile.tileX, this.triggerTile.tileY);
      this.triggerIndicator = scene.add.rectangle(
        triggerWorldPos.x, triggerWorldPos.y,
        TILE_SIZE - 4, TILE_SIZE - 4,
        TRIGGER_INDICATOR_COLOR, TRIGGER_INDICATOR_ALPHA,
      );
      this.triggerIndicator.setDepth(0);
    }

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
      this.sprite.scene.time.delayedCall(1000, () => {
        this.setNextTarget();
      });
      this.targetPos = null;
      return;
    }

    const step = this.speed * (delta / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
  }

  destroy(): void {
    if (this.triggerIndicator) {
      this.triggerIndicator.destroy();
      this.triggerIndicator = null;
    }
    this.sprite.destroy();
  }
}
