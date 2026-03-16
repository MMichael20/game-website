// src/game/systems/NPCSystem.ts
import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { NPC_DEFS } from '../data/mapLayout';

export class NPCSystem {
  private npcs: NPC[] = [];

  create(scene: Phaser.Scene): void {
    this.npcs = NPC_DEFS.map(def =>
      new NPC(scene, def.tileX, def.tileY, def.behavior, def.walkPath)
    );
  }

  update(delta: number): void {
    this.npcs.forEach(npc => npc.update(delta));
  }

  destroy(): void {
    this.npcs.forEach(npc => npc.destroy());
    this.npcs = [];
  }
}
