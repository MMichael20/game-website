// src/game/scenes/maui/MauiHotelScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef, worldToTile } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const HOTEL_LAYOUT: InteriorLayout = {
  id: 'maui-hotel',
  widthInTiles: 10,
  heightInTiles: 8,
  wallGrid: Array.from({ length: 8 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) =>
      y === 0 || y === 7 || x === 0 || x === 9
    ),
  ),
  floors: [
    { floorType: 'wood', tileX: 1, tileY: 1, width: 8, height: 6 },
  ],
  decorations: [
    { type: 'kitchen-counter', tileX: 1, tileY: 1 },
    { type: 'kitchen-counter', tileX: 2, tileY: 1 },
    { type: 'sink', tileX: 3, tileY: 1 },
    { type: 'fridge', tileX: 1, tileY: 2 },
    { type: 'bathroom-wall', tileX: 8, tileY: 1 },
    { type: 'toilet', tileX: 8, tileY: 2 },
    { type: 'tv', tileX: 3, tileY: 4 },
    { type: 'bed', tileX: 5, tileY: 5 },
    { type: 'desk', tileX: 8, tileY: 6 },
  ],
  entrance: { tileX: 4, tileY: 6 },
  exit: { tileX: 4, tileY: 7, width: 2, height: 1, promptText: 'Tap to go out' },
};

const HOTEL_NPCS: NPCDef[] = [
  {
    id: 'hotel-frontdesk', tileX: 7, tileY: 6, behavior: 'idle',
    texture: 'npc-maui-frontdesk', interactable: true,
    onInteract: 'cutscene-trigger',
    interactionData: {
      lines: ['Ready to check out?', "We'll arrange your flight home. Mahalo!"],
      sceneKey: 'AirplaneCutscene',
      sceneData: { destination: 'home' },
    },
    facingDirection: 'left',
  },
];

export class MauiHotelScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'MauiHotelScene' });
  }

  getLayout(): InteriorLayout {
    return HOTEL_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('MauiHotelScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, HOTEL_NPCS);

    // Wire dwell trigger for front desk NPC
    this.npcSystem.onDwellTrigger = (npc) => {
      if (npc.onInteract === 'cutscene-trigger' && npc.interactionData?.sceneKey) {
        this.inputSystem.freeze();
        const sceneKey = npc.interactionData.sceneKey;
        const sceneData = npc.interactionData.sceneData ?? {};
        const triggerCutscene = () => {
          this.npcSystem.onDialogueEnd(npc.id);
          uiManager.hideInteractionPrompt();
          uiManager.hideHUD();
          const cam = this.cameras.main;
          this.tweens.add({
            targets: cam, alpha: 0, duration: 500, ease: 'Linear',
            onComplete: () => { this.scene.start(sceneKey, sceneData); },
          });
        };
        if (npc.interactionData.lines?.length) {
          uiManager.showNPCDialog(npc.interactionData.lines, triggerCutscene);
        } else {
          triggerCutscene();
        }
      } else if (npc.interactionData?.lines) {
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
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
  }

  // Override to return to Maui overworld, not home WorldScene
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('MauiOverworldScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
