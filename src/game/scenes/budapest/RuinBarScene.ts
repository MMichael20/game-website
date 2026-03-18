import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { RUIN_BAR_LAYOUT } from './ruinBarLayout';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const RUIN_BAR_NPCS: NPCDef[] = [
  {
    id: 'rb-bartender', tileX: 5, tileY: 3, behavior: 'idle',
    texture: 'npc-bp-bartender', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: ['What\'ll it be?', 'We have pálinka, spritzer, or craft beer!'] },
  },
  {
    id: 'rb-local', tileX: 14, tileY: 6, behavior: 'idle',
    texture: 'npc-bp-local', interactable: true, onInteract: 'dialog',
    facingDirection: 'left',
    interactionData: { lines: ['Ruin bars started in abandoned buildings in the early 2000s.', 'Now they\'re the heart of Budapest nightlife!'] },
  },
  { id: 'rb-patron-1', tileX: 12, tileY: 4, behavior: 'sit', texture: 'npc-bp-tourist' },
  { id: 'rb-patron-2', tileX: 16, tileY: 4, behavior: 'sit', texture: 'npc-bp-local-2' },
  { id: 'rb-dancer', tileX: 7, tileY: 11, behavior: 'walk', texture: 'npc-bp-tourist-2',
    walkPath: [{ x: 7, y: 11 }, { x: 9, y: 11 }, { x: 9, y: 13 }, { x: 7, y: 13 }] },
  { id: 'rb-photo-tourist', tileX: 14, tileY: 12, behavior: 'idle', texture: 'npc-bp-tourist' },
];

export class RuinBarScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() { super({ key: 'RuinBarScene' }); }

  getLayout(): InteriorLayout { return RUIN_BAR_LAYOUT; }

  create(): void {
    super.create();
    saveCurrentScene('RuinBarScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, RUIN_BAR_NPCS);
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    };
  }

  // CRITICAL: Override to return to JewishQuarterScene, not WorldScene
  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('JewishQuarterScene', {
          returnFromInterior: true,
          returnX: this.returnData.returnX,
          returnY: this.returnData.returnY,
        });
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
