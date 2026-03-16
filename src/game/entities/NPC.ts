// src/game/entities/NPC.ts
import Phaser from 'phaser';
import { NPCDef, tileToWorld } from '../data/mapLayout';

type NPCState = 'idle' | 'walking' | 'sitting';

const DEFAULT_NPC_SPEED = 40;
const DEFAULT_INTERACTION_RADIUS = 48;

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

  private state: NPCState;
  private walkPath: Array<{ x: number; y: number }>;
  private currentPathIndex = 0;
  private targetPos: { x: number; y: number } | null = null;
  private speed: number;
  private interactionRadius: number;
  private _inRange = false;
  private _currentDistance = Infinity;
  private promptText: Phaser.GameObjects.Text | null = null;
  private scene: Phaser.Scene;

  get inRange(): boolean {
    return this._inRange;
  }

  get currentDistance(): number {
    return this._currentDistance;
  }

  constructor(scene: Phaser.Scene, def: NPCDef) {
    this.scene = scene;
    this.id = def.id;
    this.interactable = def.interactable ?? false;
    this.onInteract = def.onInteract;
    this.interactionData = def.interactionData;
    this.interactionRadius = def.interactionRadius ?? DEFAULT_INTERACTION_RADIUS;

    const worldPos = tileToWorld(def.tileX, def.tileY);
    this.sprite = scene.add.sprite(worldPos.x, worldPos.y, def.texture ?? 'npc-default');
    this.sprite.setDepth(8);

    this.walkPath = def.walkPath ?? [];
    this.speed = def.speed ?? DEFAULT_NPC_SPEED;
    this.state = def.behavior === 'walk' ? 'walking' : def.behavior === 'sit' ? 'sitting' : 'idle';

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

  checkProximity(playerX: number, playerY: number): boolean {
    if (!this.interactable) {
      this._inRange = false;
      this._currentDistance = Infinity;
      return false;
    }

    const dx = this.sprite.x - playerX;
    const dy = this.sprite.y - playerY;
    this._currentDistance = Math.sqrt(dx * dx + dy * dy);
    this._inRange = this._currentDistance <= this.interactionRadius;

    if (this._inRange) {
      if (!this.promptText) {
        this.promptText = this.scene.add.text(
          this.sprite.x,
          this.sprite.y - 20,
          'Tap',
          {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 3, y: 2 },
          },
        );
        this.promptText.setOrigin(0.5, 1);
        this.promptText.setDepth(100);
      }
    } else if (this.promptText) {
      this.promptText.destroy();
      this.promptText = null;
    }

    return this._inRange;
  }

  update(delta: number): void {
    if (this.promptText) {
      this.promptText.setPosition(this.sprite.x, this.sprite.y - 20);
    }

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

    const step = this.speed * (delta / 1000);
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
  }

  destroy(): void {
    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = null;
    }
    this.sprite.destroy();
  }
}
