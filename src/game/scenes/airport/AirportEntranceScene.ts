// src/game/scenes/airport/AirportEntranceScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_ENTRANCE_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const ENTRANCE_NPCS: NPCDef[] = [
  {
    id: 'ticket-agent-1', tileX: 5, tileY: 3, behavior: 'idle',
    texture: 'npc-ticket-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Witchy Airlines!', 'Where would you like to go today?', 'Maui flights depart from Gate 7!'] },
  },
  {
    id: 'ticket-agent-2', tileX: 13, tileY: 3, behavior: 'idle',
    texture: 'npc-ticket-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Our tropical destinations are very popular!', 'Check the departures board for flight times.'] },
  },
  { id: 'traveler-1', tileX: 7, tileY: 8, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'traveler-2', tileX: 11, tileY: 8, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'traveler-walk-1', tileX: 4, tileY: 11, behavior: 'walk', texture: 'npc-traveler', walkPath: [{ x: 4, y: 11 }, { x: 15, y: 11 }] },
  { id: 'traveler-walk-2', tileX: 15, tileY: 5, behavior: 'walk', texture: 'npc-traveler-2', walkPath: [{ x: 15, y: 5 }, { x: 15, y: 10 }] },
];

export class AirportEntranceScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'AirportEntranceScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_ENTRANCE_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportEntranceScene');
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, ENTRANCE_NPCS);
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
