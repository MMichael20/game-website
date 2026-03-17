// src/game/scenes/airport/AirportInteriorScene.ts
import { InteriorScene } from '../InteriorScene';
import { InteriorLayout, createInteriorWalkCheck } from '../../data/interiorLayouts';
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

// ── Doorway definitions ─────────────────────────────────────────────────
const DOORWAY_POSITIONS = [
  { x: 17, label: 'passport' },     // Check-in → Passport
  { x: 27, label: 'security' },     // Passport → Security
  { x: 37, label: 'dutyfree' },     // Security → Duty Free
  { x: 53, label: 'foodcourt' },    // Duty Free → Food Court
  { x: 63, label: 'terminal' },     // Food Court → Terminal
  { x: 73, label: 'gate' },         // Terminal → Gate
];

// ── Station NPCs — static sprites rendered at their posts ───────────────
const STATION_NPC_DEFS = [
  { texture: 'npc-ticket-agent', tileX: 4, tileY: 15 },      // Counter 1
  { texture: 'npc-ticket-agent', tileX: 8, tileY: 15 },       // Counter 2 (decorative)
  { texture: 'npc-ticket-agent', tileX: 12, tileY: 15 },      // Counter 3 (luggage station)
  { texture: 'npc-ticket-agent', tileX: 4, tileY: 22 },       // Counter 4 (decorative)
  { texture: 'npc-passport-officer', tileX: 22, tileY: 18 },  // Passport (active)
  { texture: 'npc-passport-officer', tileX: 20, tileY: 18 },  // Passport (decorative)
  { texture: 'npc-passport-officer', tileX: 24, tileY: 18 },  // Passport (decorative)
  { texture: 'npc-security-guard', tileX: 30, tileY: 18 },    // Security lane 1
  { texture: 'npc-security-guard', tileX: 34, tileY: 18 },    // Security lane 2 (decorative)
  { texture: 'npc-gate-agent', tileX: 76, tileY: 10 },        // Boarding gate
];

// ── Dialog NPCs (via NPCSystem) ─────────────────────────────────────────
const DIALOG_NPCS: NPCDef[] = [
  // Zone 1
  { id: 'sitting-pax-1', tileX: 3, tileY: 30, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'sitting-pax-2', tileX: 12, tileY: 33, behavior: 'sit', texture: 'npc-traveler-2' },
  { id: 'walking-pax-1', tileX: 10, tileY: 25, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 10, y: 25 }, { x: 10, y: 10 }] },
  // Zone 4: Duty Free
  { id: 'duty-free-clerk', tileX: 45, tileY: 10, behavior: 'idle',
    texture: 'npc-duty-free-clerk', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Ben Gurion Duty Free!',
      'We have the finest perfumes, chocolates, and Dead Sea cosmetics.',
      'Take your time browsing!',
    ] } },
  { id: 'shopping-pax-1', tileX: 42, tileY: 20, behavior: 'idle', texture: 'npc-traveler' },
  { id: 'shopping-pax-2', tileX: 48, tileY: 25, behavior: 'idle', texture: 'npc-traveler-2' },
  // Zone 5: Food Court
  { id: 'food-chef', tileX: 56, tileY: 8, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Terminal Cafe!',
      'Try our shakshuka or grab a coffee for the gate.',
    ] } },
  { id: 'eating-pax-1', tileX: 56, tileY: 17, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'eating-pax-2', tileX: 60, tileY: 23, behavior: 'sit', texture: 'npc-traveler-2' },
  // Zone 6: Terminal
  { id: 'walking-pax-2', tileX: 65, tileY: 20, behavior: 'walk', texture: 'npc-traveler-2',
    walkPath: [{ x: 65, y: 20 }, { x: 72, y: 20 }] },
  // Zone 7: Gate
  { id: 'gate-pax-1', tileX: 75, tileY: 22, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'gate-pax-2', tileX: 77, tileY: 26, behavior: 'sit', texture: 'npc-traveler-2' },
];

// ── Interior signs ───────────────────────────────────────────────────────
const INTERIOR_SIGNS: SignDef[] = [
  { id: 'sign-departures', tileX: 9, tileY: 2, texture: 'sign-departures', tooltipText: 'Departures' },
  { id: 'sign-passport', tileX: 22, tileY: 3, texture: 'sign-passport', tooltipText: 'Passport Control' },
  { id: 'sign-security', tileX: 32, tileY: 3, texture: 'sign-security', tooltipText: 'Security Screening' },
  { id: 'sign-duty-free', tileX: 45, tileY: 3, texture: 'sign-duty-free', tooltipText: 'Duty Free' },
  { id: 'sign-food-court', tileX: 58, tileY: 3, texture: 'sign-food-court', tooltipText: 'Food Court' },
  { id: 'sign-gates', tileX: 66, tileY: 3, texture: 'sign-gates', tooltipText: 'Gates \u2192' },
  { id: 'sign-gate-maui', tileX: 76, tileY: 3, texture: 'sign-gate-number', tooltipText: 'Gate 1 \u2014 Maui' },
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

  // Zone gating
  private blockedDoorways = new Set<string>();
  private barrierSprites: (Phaser.GameObjects.Image | null)[] = [];

  constructor() {
    super({ key: 'AirportInteriorScene' });
  }

  getLayout(): InteriorLayout {
    return AIRPORT_INTERIOR_LAYOUT;
  }

  protected getWalkCheck(layout: InteriorLayout) {
    const baseCheck = createInteriorWalkCheck(layout);
    return (tx: number, ty: number) => {
      if (this.blockedDoorways.has(`${tx},${ty}`)) return false;
      return baseCheck(tx, ty);
    };
  }

  create(): void {
    super.create();
    saveCurrentScene('AirportInteriorScene');
    this.player.setTemporaryTexture('player-suitcase', this);
    this.partner.setTemporaryTexture('partner-suitcase', this);
    this.boardingTriggered = false;
    this.currentStation = 0;
    this.sequenceActive = false;

    // ── Block all doorways initially ──────────────────────────────────
    this.blockedDoorways.clear();
    this.barrierSprites = [];
    DOORWAY_POSITIONS.forEach(pos => {
      for (let y = 16; y <= 20; y++) {
        this.blockedDoorways.add(`${pos.x},${y}`);
        this.blockedDoorways.add(`${pos.x + 1},${y}`);
      }
      // Barrier decoration sprite at center of doorway
      const centerPos = tileToWorld(pos.x, 18);
      const barrier = this.add.image(centerPos.x + TILE_SIZE / 2, centerPos.y, 'interior-airport-doorway-barrier').setDepth(10);
      this.barrierSprites.push(barrier);
    });

    // ── Create station NPC sprites (static images) ────────────────────
    this.stationNPCSprites = STATION_NPC_DEFS.map(def => {
      const pos = tileToWorld(def.tileX, def.tileY);
      return this.add.image(pos.x, pos.y, def.texture, 0).setDepth(8);
    });

    // ── NPCSystem for dialogue NPCs ──────────────────────────────────
    this.npcSystem = new NPCSystem();
    this.npcSystem.create(this, DIALOG_NPCS);
    this.signTooltip = new SignTooltip(this, INTERIOR_SIGNS);

    // Wire NPC dialogue
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

  private unlockDoorway(index: number): void {
    const pos = DOORWAY_POSITIONS[index];
    for (let y = 16; y <= 20; y++) {
      this.blockedDoorways.delete(`${pos.x},${y}`);
      this.blockedDoorways.delete(`${pos.x + 1},${y}`);
    }
    const barrier = this.barrierSprites[index];
    if (barrier) {
      this.tweens.add({
        targets: barrier, alpha: 0, duration: 400,
        onComplete: () => barrier.destroy(),
      });
      this.barrierSprites[index] = null;
    }
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

    // Doorway unlocking based on station completion
    if (stationIndex === 1) {
      // After luggage-checkin: open passport zone
      this.unlockDoorway(0);
    } else if (stationIndex === 2) {
      // After passport-control: open security zone
      this.unlockDoorway(1);
    } else if (stationIndex === 3) {
      // After security-screening: open all remaining zones
      this.unlockDoorway(2);
      this.unlockDoorway(3);
      this.unlockDoorway(4);
      this.unlockDoorway(5);
    }

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

    // Cleanup barrier sprites
    this.barrierSprites.forEach(s => s?.destroy());
    this.barrierSprites = [];

  }
}
