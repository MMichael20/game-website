// src/game/scenes/airport/AirportInteriorScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout } from '../../data/interiorLayouts';
import { AIRPORT_INTERIOR_LAYOUT } from './airportLayouts';
import { NPCSystem } from '../../systems/NPCSystem';
import { NPCDef, worldToTile, tileToWorld } from '../../data/mapLayout';
import { uiManager } from '../../../ui/UIManager';
import { saveCurrentScene } from '../../systems/SaveSystem';
import { SignTooltip, SignDef } from '../../../ui/SignTooltip';
import { TILE_SIZE } from '../../../utils/constants';
import {
  STATIONS,
  playTicketCounter,
  playLuggageCheckin,
  playPassportControl,
  playSecurityScreening,
  playBoardingGate,
} from './CheckinStations';

// NPCs managed by NPCSystem (dialogue-based) — cafe + passengers only
const DIALOG_NPCS: NPCDef[] = [
  {
    id: 'barista', tileX: 3, tileY: 4, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: ['Welcome to Sky Cafe!', 'Can I get you a coffee for the flight?'] },
  },
  { id: 'sitting-passenger-1', tileX: 14, tileY: 3, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'sitting-passenger-2', tileX: 20, tileY: 5, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'walking-passenger', tileX: 18, tileY: 14, behavior: 'walk', texture: 'npc-traveler', walkPath: [{ x: 18, y: 14 }, { x: 18, y: 7 }] },
];

// Station NPCs — static sprites rendered at their posts, animated by station sequences
const STATION_NPC_DEFS = [
  { texture: 'npc-ticket-agent', tileX: 8, tileY: 15 },      // Station 1: ticket counter
  { texture: 'npc-ticket-agent', tileX: 20, tileY: 15 },      // Second check-in agent (background)
  { texture: 'npc-passport-officer', tileX: 18, tileY: 12 },  // Station 3: passport control
  { texture: 'npc-security-guard', tileX: 18, tileY: 10 },    // Station 4: security
  { texture: 'npc-gate-agent', tileX: 24, tileY: 4 },         // Station 5: boarding gate
];

const INTERIOR_SIGNS: SignDef[] = [
  { id: 'sign-gate-maui', tileX: 24, tileY: 2, texture: 'sign-gate-number', tooltipText: 'Gate 1 — Maui' },
  { id: 'sign-cafe', tileX: 5, tileY: 2, texture: 'sign-cafe', tooltipText: 'Sky Cafe' },
  { id: 'sign-security', tileX: 18, tileY: 8, texture: 'sign-security', tooltipText: 'Security' },
];

export class AirportInteriorScene extends InteriorScene {
  // Exposed for CheckinStations module to access
  public declare player: import('../../entities/Player').Player;
  public declare partner: import('../../entities/Partner').Partner;

  private npcSystem!: NPCSystem;
  private signTooltip!: SignTooltip;
  private boardingTriggered = false;

  // Station progression (transient — resets each visit)
  private currentStation = 0;
  private sequenceActive = false;
  private stationIndicator: Phaser.GameObjects.Rectangle | null = null;
  private stationNPCSprites: Phaser.GameObjects.Image[] = [];

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
    this.currentStation = 0;
    this.sequenceActive = false;

    // Create station NPC sprites (static images, not in NPCSystem)
    this.stationNPCSprites = STATION_NPC_DEFS.map(def => {
      const pos = tileToWorld(def.tileX, def.tileY);
      return this.add.image(pos.x, pos.y, def.texture, 0).setDepth(8);
    });

    // NPCSystem for dialogue NPCs only (barista + passengers)
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, DIALOG_NPCS);
    this.signTooltip = new SignTooltip(this, INTERIOR_SIGNS);

    // Wire barista dialogue
    this.npcSystem.onDwellTrigger = (npc) => {
      if (!npc.interactionData?.lines) return;
      this.inputSystem.freeze();
      uiManager.showNPCDialog(npc.interactionData.lines, () => {
        uiManager.hideNPCDialog();
        this.inputSystem.unfreeze();
        this.npcSystem.onDialogueEnd(npc.id);
      });
    };

    // Show first station indicator
    this.updateStationIndicator();
  }

  private updateStationIndicator(): void {
    this.stationIndicator?.destroy();
    this.stationIndicator = null;

    if (this.currentStation >= STATIONS.length) return;

    const station = STATIONS[this.currentStation];
    const pos = tileToWorld(station.triggerTileX, station.triggerTileY);
    this.stationIndicator = this.add.rectangle(
      pos.x, pos.y, TILE_SIZE - 4, TILE_SIZE - 4,
      0xFFDD44, 0.3,
    ).setDepth(1);

    // Pulsing alpha tween
    this.tweens.add({
      targets: this.stationIndicator,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private async runStation(stationIndex: number): Promise<void> {
    this.sequenceActive = true;
    this.inputSystem.freeze();

    const sequences = [
      playTicketCounter,
      playLuggageCheckin,
      playPassportControl,
      playSecurityScreening,
      playBoardingGate,
    ];

    await sequences[stationIndex](this);

    this.currentStation = stationIndex + 1;
    this.sequenceActive = false;
    this.inputSystem.unfreeze();
    this.updateStationIndicator();

    // After final station, trigger boarding
    if (this.currentStation >= STATIONS.length) {
      this.startBoarding();
    }
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

    // Station trigger check — only when no sequence is running
    if (!this.sequenceActive && this.currentStation < STATIONS.length) {
      const nextStation = STATIONS[this.currentStation];
      if (playerTile.x === nextStation.triggerTileX && playerTile.y === nextStation.triggerTileY) {
        this.runStation(this.currentStation);
      }
    }
  }

  shutdown(): void {
    super.shutdown();
    this.npcSystem?.destroy();
    this.signTooltip?.destroy();
    this.stationIndicator?.destroy();
    this.stationNPCSprites.forEach(s => s.destroy());
    this.stationNPCSprites = [];
  }
}
