// src/game/systems/NPCSystem.ts
import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { NPCDef } from '../data/mapLayout';

export class NPCSystem {
  private npcs: NPC[] = [];

  create(scene: Phaser.Scene, defs: NPCDef[]): void {
    this.npcs = defs.map(def => new NPC(scene, def));
  }

  update(delta: number, playerX?: number, playerY?: number): void {
    this.npcs.forEach(npc => {
      npc.update(delta);
      if (playerX != null && playerY != null) {
        npc.checkProximity(playerX, playerY);
      }
    });
  }

  /** Find an interactable NPC whose sprite is near the given world position (tap radius) */
  getNPCAtPosition(worldX: number, worldY: number, radius = 24): NPC | null {
    for (const npc of this.npcs) {
      if (!npc.interactable) continue;
      const dx = npc.sprite.x - worldX;
      const dy = npc.sprite.y - worldY;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) return npc;
    }
    return null;
  }

  getInteractableInRange(): NPC | null {
    let closest: NPC | null = null;
    let closestDist = Infinity;

    for (const npc of this.npcs) {
      if (npc.inRange && npc.currentDistance < closestDist) {
        closest = npc;
        closestDist = npc.currentDistance;
      }
    }

    return closest;
  }

  destroy(): void {
    this.npcs.forEach(npc => npc.destroy());
    this.npcs = [];
  }
}
