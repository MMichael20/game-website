// src/game/scenes/airport/AirportSecurityScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_SECURITY_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const SECURITY_NPCS: NPCDef[] = [
  {
    id: 'security-guard', tileX: 8, tileY: 5, behavior: 'idle',
    texture: 'npc-security-guard', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Have a safe flight!', 'Please proceed to the gates.'] },
  },
  { id: 'traveler-queue', tileX: 4, tileY: 2, behavior: 'walk', texture: 'npc-traveler', walkPath: [{ x: 4, y: 2 }, { x: 7, y: 2 }] },
];

export class AirportSecurityScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'AirportSecurityScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_SECURITY_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportSecurityScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, SECURITY_NPCS);
  }

  protected onInteractPressed(): boolean {
    const npc = this.npcSystem.getInteractableInRange();
    if (npc && npc.interactionData?.lines) {
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
      });
      return true;
    }
    return false;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y);
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
  }
}
