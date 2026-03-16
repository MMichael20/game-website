// src/game/systems/NPCSystem.ts
import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { NPCDef, worldToTile } from '../data/mapLayout';
import {
  DWELL_TIME_MS, DWELL_COOLDOWN_MS,
  TRIGGER_INDICATOR_ALPHA, TRIGGER_INDICATOR_ACTIVE_ALPHA,
} from '../../utils/constants';

export class NPCSystem {
  private npcs: NPC[] = [];
  private dwellTimers: Map<string, number> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private dialogueOpen = false;

  /** Callback fired when dwell threshold is reached on an NPC's trigger tile */
  public onDwellTrigger?: (npc: NPC) => void;

  create(scene: Phaser.Scene, defs: NPCDef[]): void {
    this.npcs = defs.map(def => new NPC(scene, def));
  }

  update(delta: number, playerX?: number, playerY?: number, inputFrozen = false): void {
    this.npcs.forEach(npc => npc.update(delta));

    if (playerX == null || playerY == null || inputFrozen || this.dialogueOpen) return;

    const playerTile = worldToTile(playerX, playerY);
    const now = Date.now();

    for (const npc of this.npcs) {
      if (!npc.triggerTile) continue;

      const onTile = playerTile.x === npc.triggerTile.tileX &&
                     playerTile.y === npc.triggerTile.tileY;

      if (onTile) {
        const cooldownEnd = this.cooldowns.get(npc.id) ?? 0;
        if (now < cooldownEnd) continue;

        const prev = this.dwellTimers.get(npc.id) ?? 0;
        const elapsed = prev + delta;
        this.dwellTimers.set(npc.id, elapsed);

        const progress = Math.min(elapsed / DWELL_TIME_MS, 1);
        const alpha = TRIGGER_INDICATOR_ALPHA +
          (TRIGGER_INDICATOR_ACTIVE_ALPHA - TRIGGER_INDICATOR_ALPHA) * progress;
        if (npc.triggerIndicator) npc.triggerIndicator.setAlpha(alpha);

        if (elapsed >= DWELL_TIME_MS) {
          this.dwellTimers.set(npc.id, 0);
          if (npc.triggerIndicator) npc.triggerIndicator.setAlpha(TRIGGER_INDICATOR_ALPHA);
          this.dialogueOpen = true;
          this.onDwellTrigger?.(npc);
        }
      } else {
        if (this.dwellTimers.has(npc.id)) {
          this.dwellTimers.set(npc.id, 0);
          if (npc.triggerIndicator) npc.triggerIndicator.setAlpha(TRIGGER_INDICATOR_ALPHA);
        }
      }
    }
  }

  onDialogueEnd(npcId: string): void {
    this.dialogueOpen = false;
    this.cooldowns.set(npcId, Date.now() + DWELL_COOLDOWN_MS);
    this.dwellTimers.set(npcId, 0);
  }

  getNPCAtPosition(worldX: number, worldY: number, radius = 32): NPC | null {
    for (const npc of this.npcs) {
      if (!npc.interactable) continue;
      const dx = npc.sprite.x - worldX;
      const dy = npc.sprite.y - worldY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) return npc;
    }
    return null;
  }

  destroy(): void {
    this.npcs.forEach(npc => npc.destroy());
    this.npcs = [];
    this.dwellTimers.clear();
    this.cooldowns.clear();
    this.dialogueOpen = false;
  }
}
