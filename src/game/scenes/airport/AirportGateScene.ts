// src/game/scenes/airport/AirportGateScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_GATE_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef, worldToTile } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { SignTooltip, SignDef } from '../../../ui/SignTooltip';

const GATE_NPCS: NPCDef[] = [
  {
    id: 'gate-agent', tileX: 19, tileY: 3, behavior: 'idle',
    texture: 'npc-gate-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Flight to Maui is now boarding!', 'Ready to board?'] },
  },
  {
    id: 'cafe-worker', tileX: 5, tileY: 3, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Sky Cafe!', 'Can I get you a coffee for the flight?'] },
  },
  {
    id: 'shopkeeper', tileX: 2, tileY: 8, behavior: 'idle',
    texture: 'npc-shopkeeper', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Looking for souvenirs?', 'Come back after your trip!'] },
  },
  { id: 'traveler-sit-1', tileX: 13, tileY: 7, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'traveler-sit-2', tileX: 18, tileY: 7, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'traveler-sit-3', tileX: 13, tileY: 10, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'traveler-walk-gate', tileX: 11, tileY: 11, behavior: 'walk', texture: 'npc-traveler-2', walkPath: [{ x: 11, y: 11 }, { x: 19, y: 11 }] },
];

const GATE_SIGNS: SignDef[] = [
  { id: 'cafe-sign', tileX: 2, tileY: 1, texture: 'sign-cafe', tooltipText: 'Sky Cafe' },
  { id: 'gate-num-sign', tileX: 19, tileY: 1, texture: 'sign-gate-number', tooltipText: 'Gate 7 - Maui' },
];

export class AirportGateScene extends InteriorScene {
  private npcSystem!: NPCSystem;
  private signTooltip!: SignTooltip;
  private boardingTriggered = false;

  constructor() {
    super({ key: 'AirportGateScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_GATE_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportGateScene');
    this.player.setTemporaryTexture('player-suitcase', this);
    this.partner.setTemporaryTexture('partner-suitcase', this);
    this.boardingTriggered = false;
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, GATE_NPCS);
    this.signTooltip = new SignTooltip(this, GATE_SIGNS);

    // Wire dwell trigger for NPC interaction
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;

      if (npc.id === 'gate-agent') {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
          this.startBoarding();
        });
      } else {
        this.inputSystem.freeze();
        uiManager.showNPCDialog(npc.interactionData.lines, () => {
          uiManager.hideNPCDialog();
          this.inputSystem.unfreeze();
          this.npcSystem.onDialogueEnd(npc.id);
        });
      }
    };
  }

  private startBoarding(): void {
    if (this.boardingTriggered) return;
    this.boardingTriggered = true;

    uiManager.hideInteractionPrompt();
    const cam = this.cameras.main;
    this.tweens.add({
      targets: cam,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      onComplete: () => {
        this.scene.start('AirplaneCutscene', { destination: 'maui' });
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    const pos = this.player.getPosition();
    this.npcSystem.update(delta, pos.x, pos.y, this.inputSystem.isFrozen);
    const playerTile = worldToTile(pos.x, pos.y);
    this.signTooltip.update(playerTile.x, playerTile.y);
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
    this.signTooltip?.destroy();
  }
}
