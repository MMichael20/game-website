// src/game/scenes/airport/AirportInteriorScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_INTERIOR_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef, worldToTile } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { SignTooltip, SignDef } from '../../../ui/SignTooltip';

const INTERIOR_NPCS: NPCDef[] = [
  // CHECK-IN
  {
    id: 'checkin-agent-1', tileX: 8, tileY: 15, behavior: 'idle',
    texture: 'npc-ticket-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Witchy Airlines!', 'Where would you like to go today?', 'Maui flights depart from Gate 1!'] },
  },
  {
    id: 'checkin-agent-2', tileX: 20, tileY: 15, behavior: 'idle',
    texture: 'npc-ticket-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Our tropical destinations are very popular!', 'Check the departures board for flight times.'] },
  },
  // SECURITY
  {
    id: 'security-guard', tileX: 18, tileY: 10, behavior: 'idle',
    texture: 'npc-security-guard', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Have a safe flight!', 'Please proceed to the gates.'] },
  },
  // GATE
  {
    id: 'gate-agent-maui', tileX: 24, tileY: 4, behavior: 'idle',
    texture: 'npc-gate-agent', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Flight to Maui is now boarding!', 'Ready to board?'] },
  },
  // CAFE
  {
    id: 'barista', tileX: 3, tileY: 4, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Sky Cafe!', 'Can I get you a coffee for the flight?'] },
  },
  // PASSENGERS
  { id: 'sitting-passenger-1', tileX: 14, tileY: 3, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'sitting-passenger-2', tileX: 20, tileY: 5, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'walking-passenger', tileX: 18, tileY: 14, behavior: 'walk', texture: 'npc-traveler', walkPath: [{ x: 18, y: 14 }, { x: 18, y: 7 }] },
];

const INTERIOR_SIGNS: SignDef[] = [
  { id: 'sign-gate-maui', tileX: 24, tileY: 2, texture: 'sign-gate-number', tooltipText: 'Gate 1 — Maui' },
  { id: 'sign-cafe', tileX: 5, tileY: 2, texture: 'sign-cafe', tooltipText: 'Sky Cafe' },
  { id: 'sign-security', tileX: 18, tileY: 8, texture: 'sign-security', tooltipText: 'Security' },
];

export class AirportInteriorScene extends InteriorScene {
  private npcSystem!: NPCSystem;
  private signTooltip!: SignTooltip;
  private boardingTriggered = false;

  constructor() {
    super({ key: 'AirportInteriorScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_INTERIOR_LAYOUT;
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportInteriorScene');
    this.player.setTemporaryTexture('player-suitcase', this);
    this.partner.setTemporaryTexture('partner-suitcase', this);
    this.boardingTriggered = false;
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, INTERIOR_NPCS);
    this.signTooltip = new SignTooltip(this, INTERIOR_SIGNS);

    // Wire dwell trigger for NPC interaction
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;

      if (npc.id === 'gate-agent-maui') {
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
