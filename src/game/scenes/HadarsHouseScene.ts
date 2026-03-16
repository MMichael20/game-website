// src/game/scenes/HadarsHouseScene.ts
import { InteriorScene } from './InteriorScene';
import { InteriorLayout, HADARS_HOUSE_LAYOUT } from '../data/interiorLayouts';
import { NPCDef } from '../data/mapLayout';
import { NPCSystem } from '../systems/NPCSystem';
import { uiManager } from '../../ui/UIManager';

const HADAR_NPCS: NPCDef[] = [
  // Living room — Mom
  {
    id: 'hadar-mom', tileX: 3, tileY: 4, behavior: 'idle',
    texture: 'npc-hadar-mom', interactable: true, onInteract: 'dialog',
    facingDirection: 'right',
    interactionData: { lines: ['Make yourself at home!', 'Hadar is around here somewhere...'] },
  },
  // Kitchen — Dad
  {
    id: 'hadar-dad', tileX: 14, tileY: 4, behavior: 'idle',
    texture: 'npc-hadar-dad', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ["I'm trying a new recipe!", 'The kitchen is my domain.'] },
  },
  // Bedroom — Little Sister (soldier patrol)
  {
    id: 'hadar-sister', tileX: 6, tileY: 11, behavior: 'walk',
    texture: 'npc-hadar-sister', interactable: true, onInteract: 'dialog',
    walkPath: [{ x: 6, y: 11 }, { x: 12, y: 11 }, { x: 12, y: 13 }, { x: 6, y: 13 }],
    speed: 35,
    interactionData: { lines: ["I'm on patrol duty!", 'A soldier never rests!'] },
  },
  // Living room — Chihuahua wandering
  {
    id: 'hadar-chihuahua', tileX: 5, tileY: 5, behavior: 'walk',
    texture: 'npc-hadar-chihuahua', interactable: false,
    walkPath: [{ x: 5, y: 5 }, { x: 7, y: 3 }, { x: 8, y: 6 }, { x: 4, y: 6 }],
    speed: 25,
  },
];

export class HadarsHouseScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'HadarsHouseScene' });
  }

  getLayout(): InteriorLayout {
    return HADARS_HOUSE_LAYOUT;
  }

  create(): void {
    super.create();

    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, HADAR_NPCS);

    this.npcSystem.onDwellTrigger = (npc) => {
      if (npc.onInteract === 'dialog' && npc.interactionData?.lines) {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
        });
      }
    };
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const playerPos = this.player.getPosition();
    this.npcSystem.update(delta, playerPos.x, playerPos.y, this.inputSystem.isFrozen);
  }

  shutdown(): void {
    this.npcSystem?.destroy();
    super.shutdown();
  }
}
