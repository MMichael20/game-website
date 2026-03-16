// src/game/scenes/MichaelsHouseScene.ts
import { InteriorScene } from './InteriorScene';
import { InteriorLayout, MICHAELS_HOUSE_LAYOUT } from '../data/interiorLayouts';
import { NPCDef } from '../data/mapLayout';
import { NPCSystem } from '../systems/NPCSystem';
import { uiManager } from '../../ui/UIManager';

const HOUSE_NPCS: NPCDef[] = [
  // Living room (top-left) — Studio Lana: Mom and Aunt tailoring business
  {
    id: 'house-mom', tileX: 3, tileY: 4, behavior: 'idle',
    texture: 'npc-house-mom', interactable: true, onInteract: 'dialog',
    facingDirection: 'right',
    interactionData: { lines: ['Welcome to Studio Lana!', 'We fix, we sew, we make it beautiful!'] },
  },
  {
    id: 'house-aunt', tileX: 6, tileY: 4, behavior: 'idle',
    texture: 'npc-house-aunt', interactable: true, onInteract: 'dialog',
    facingDirection: 'left',
    interactionData: { lines: ["Lana means 'wool' in Italian, you know...", 'Hand me those scissors, dear!'] },
  },
  // Studio Lana — Grandmother client
  {
    id: 'house-grandma', tileX: 4, tileY: 6, behavior: 'idle',
    texture: 'npc-house-grandma', interactable: true, onInteract: 'dialog',
    facingDirection: 'up',
    interactionData: { lines: ["They're fixing my favorite dress...", "I've been coming here for years!"] },
  },
  // Studio Lana — Mannequin decoration
  {
    id: 'house-mannequin', tileX: 8, tileY: 3, behavior: 'idle',
    texture: 'npc-house-mannequin', interactable: false,
    facingDirection: 'down',
  },
  // Kitchen (top-center) — Little Sister ballet twirling
  {
    id: 'house-littlesis', tileX: 15, tileY: 8, behavior: 'walk',
    texture: 'npc-house-littlesis', interactable: true, onInteract: 'dialog',
    walkPath: [{ x: 15, y: 8 }, { x: 16, y: 7 }, { x: 17, y: 8 }, { x: 16, y: 9 }],
    speed: 30,
    interactionData: { lines: ["Watch me spin! I'm a ballerina!", 'One day I\'ll dance on a big stage!'] },
  },
  // Bottom-left big room — Father with cape
  {
    id: 'house-dad', tileX: 10, tileY: 16, behavior: 'idle',
    texture: 'npc-house-dad', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['Stand tall, son. A cape makes the man.', "I'm watching over everyone."] },
  },
  // Bottom-left big room — Sphinx Cat wandering near dad
  {
    id: 'house-sphinx', tileX: 12, tileY: 16, behavior: 'walk',
    texture: 'npc-house-sphinx', interactable: false,
    walkPath: [{ x: 12, y: 16 }, { x: 11, y: 17 }, { x: 13, y: 18 }, { x: 14, y: 17 }],
    speed: 20,
  },
  // Bottom-right room — Big Sister holding baby
  {
    id: 'house-bigsis', tileX: 23, tileY: 16, behavior: 'idle',
    texture: 'npc-house-bigsis', interactable: true, onInteract: 'dialog',
    facingDirection: 'right',
    interactionData: { lines: ['Oh no, the baby woke up!', "She's running everywhere — help me catch her!"] },
  },
  // Bottom-right room — Baby toddler
  {
    id: 'house-baby', tileX: 24, tileY: 16, behavior: 'idle',
    texture: 'npc-house-baby', interactable: false,
    facingDirection: 'left',
  },
];

export class MichaelsHouseScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'MichaelsHouseScene' });
  }

  getLayout(): InteriorLayout {
    return MICHAELS_HOUSE_LAYOUT;
  }

  create(): void {
    super.create();

    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, HOUSE_NPCS);

    this.npcSystem.onDwellTrigger = (npc) => {
      if (npc.onInteract === 'dialog' && npc.interactionData?.lines) {
        this.inputSystem.freeze();

        if (npc.id === 'house-bigsis') {
          // Trigger Chase the Baby mini-game
          uiManager.showNPCDialog(
            ['Oh no, the baby woke up!', "She's running everywhere — help me catch her!"],
            () => {
              uiManager.hideNPCDialog();
              this.inputSystem.unfreeze();
              this.npcSystem.onDialogueEnd(npc.id);
              this.scene.start('ChaseBabyScene', {
                returnScene: 'MichaelsHouseScene',
                returnX: this.returnData.returnX,
                returnY: this.returnData.returnY,
              });
            }
          );
        } else {
          uiManager.showNPCDialog(npc.interactionData.lines, () => {
            uiManager.hideNPCDialog();
            this.inputSystem.unfreeze();
            this.npcSystem.onDialogueEnd(npc.id);
          });
        }
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
