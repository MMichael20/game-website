import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { BUDAPEST_AIRPORT_LAYOUT } from './budapestAirportLayout';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';

const AIRPORT_NPCS: NPCDef[] = [
  {
    id: 'bp-airport-exchange', tileX: 6, tileY: 8, behavior: 'idle',
    texture: 'npc-bp-exchange-clerk', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: [
      'Welcome to Budapest!',
      'The Hungarian Forint is the local currency. 1 USD ≈ 360 HUF.',
      'Here you go! You\'re all set for the city.',
    ] },
  },
  {
    id: 'bp-airport-bus-ticket', tileX: 16, tileY: 8, behavior: 'idle',
    texture: 'npc-bp-ticket-clerk', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: [
      'Bus 100E goes straight to the city center!',
      'The ride takes about 40 minutes.',
      'Here\'s your ticket. Head to the exit for the bus stop!',
    ] },
  },
  {
    id: 'bp-airport-info', tileX: 32, tileY: 8, behavior: 'idle',
    texture: 'npc-bp-info-desk', interactable: true, onInteract: 'dialog',
    facingDirection: 'down',
    interactionData: { lines: [
      'Welcome to Budapest Ferenc Liszt Airport!',
      'Don\'t miss the Jewish Quarter and the Budapest Eye!',
      'Enjoy your stay!',
    ] },
  },
  { id: 'bp-airport-traveler-1', tileX: 10, tileY: 9, behavior: 'walk', texture: 'npc-bp-traveler',
    walkPath: [{ x: 10, y: 9 }, { x: 20, y: 9 }] },
  { id: 'bp-airport-traveler-2', tileX: 25, tileY: 8, behavior: 'walk', texture: 'npc-bp-traveler-2',
    walkPath: [{ x: 25, y: 8 }, { x: 35, y: 8 }] },
  { id: 'bp-airport-traveler-3', tileX: 20, tileY: 10, behavior: 'idle', texture: 'npc-bp-traveler' },
  { id: 'bp-airport-luggage-1', tileX: 12, tileY: 5, behavior: 'idle', texture: 'npc-bp-traveler-2' },
  { id: 'bp-airport-luggage-2', tileX: 26, tileY: 5, behavior: 'sit', texture: 'npc-bp-traveler' },
];

export class BudapestAirportScene extends InteriorScene {
  private npcSystem!: NPCSystem;

  constructor() {
    super({ key: 'BudapestAirportScene' });
  }

  getLayout(): InteriorLayout {
    return BUDAPEST_AIRPORT_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('BudapestAirportScene');

    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, AIRPORT_NPCS);

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

  protected exitToOverworld(): void {
    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam, alpha: 0, duration: 300, ease: 'Linear',
      onComplete: () => {
        this.scene.start('BudapestBusRideScene');
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
