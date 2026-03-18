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
  { texture: 'npc-ticket-agent', tileX: 4, tileY: 13 },       // Counter 1
  { texture: 'npc-ticket-agent', tileX: 8, tileY: 13 },       // Counter 2 (decorative)
  { texture: 'npc-ticket-agent', tileX: 12, tileY: 13 },      // Counter 3 (luggage station)
  // Counter 4 removed — no space in shorter layout
  { texture: 'npc-passport-officer', tileX: 22, tileY: 16 },  // Passport (active)
  { texture: 'npc-passport-officer', tileX: 20, tileY: 16 },  // Passport (decorative)
  { texture: 'npc-passport-officer', tileX: 24, tileY: 16 },  // Passport (decorative)
  { texture: 'npc-security-guard', tileX: 30, tileY: 16 },    // Security lane 1
  { texture: 'npc-security-guard', tileX: 34, tileY: 16 },    // Security lane 2 (decorative)
  { texture: 'npc-gate-agent', tileX: 76, tileY: 12 },        // Boarding gate
  { texture: 'npc-gate-agent', tileX: 68, tileY: 12 },        // Gate 2 (coming soon)
  { texture: 'npc-gate-agent', tileX: 64, tileY: 12 },        // Gate 3 (coming soon)
];

// ── Dialog NPCs (via NPCSystem) ─────────────────────────────────────────
const DIALOG_NPCS: NPCDef[] = [
  // Zone 1: walking passenger
  { id: 'walking-pax-1', tileX: 10, tileY: 19, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 10, y: 19 }, { x: 10, y: 12 }] },
  // Zone 4: Duty Free
  { id: 'duty-free-clerk', tileX: 45, tileY: 12, behavior: 'idle',
    texture: 'npc-duty-free-clerk', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Ben Gurion Duty Free!',
      'We have the finest perfumes, chocolates, and Dead Sea cosmetics.',
      'Take your time browsing!',
    ] } },
  { id: 'shopping-pax-1', tileX: 42, tileY: 17, behavior: 'idle', texture: 'npc-traveler' },
  // Zone 5: Food Court
  { id: 'food-chef', tileX: 56, tileY: 12, behavior: 'idle',
    texture: 'npc-cafe-worker', interactable: true, onInteract: 'dialog',
    interactionData: { lines: [
      'Welcome to Terminal Cafe!',
      'Try our shakshuka or grab a coffee for the gate.',
    ] } },
  { id: 'eating-pax-1', tileX: 56, tileY: 15, behavior: 'sit', texture: 'npc-traveler' },
  // Zone 6: Terminal
  { id: 'walking-pax-2', tileX: 65, tileY: 18, behavior: 'walk', texture: 'npc-traveler-2',
    walkPath: [{ x: 65, y: 18 }, { x: 72, y: 18 }] },
  // More passengers
  { id: 'standing-pax-1', tileX: 10, tileY: 16, behavior: 'idle', texture: 'npc-traveler-2' },
  // Passport zone
  { id: 'passport-waiter-1', tileX: 21, tileY: 18, behavior: 'idle', texture: 'npc-traveler' },
  // Security zone
  { id: 'security-queue-1', tileX: 31, tileY: 18, behavior: 'idle', texture: 'npc-traveler' },
  { id: 'security-queue-2', tileX: 33, tileY: 18, behavior: 'idle', texture: 'npc-traveler-2' },
  // Terminal corridor walker
  { id: 'corridor-walker-1', tileX: 66, tileY: 15, behavior: 'walk', texture: 'npc-traveler',
    walkPath: [{ x: 66, y: 15 }, { x: 72, y: 15 }] },
  // Gate area
  { id: 'gate-pax-1', tileX: 75, tileY: 18, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'gate-pax-3', tileX: 75, tileY: 16, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'gate-pax-4', tileX: 77, tileY: 18, behavior: 'sit', texture: 'npc-traveler-2' },
  // Coming soon gate passengers
  { id: 'gate2-pax-1', tileX: 67, tileY: 14, behavior: 'sit', texture: 'npc-traveler' },
  { id: 'gate3-pax-1', tileX: 65, tileY: 14, behavior: 'sit', texture: 'npc-traveler-2' },
];

// ── Interior signs ───────────────────────────────────────────────────────
const INTERIOR_SIGNS: SignDef[] = [
  { id: 'sign-departures', tileX: 9, tileY: 11, texture: 'sign-departures', tooltipText: 'Departures' },
  { id: 'sign-passport', tileX: 22, tileY: 11, texture: 'sign-passport', tooltipText: 'Passport Control' },
  { id: 'sign-security', tileX: 32, tileY: 11, texture: 'sign-security', tooltipText: 'Security Screening' },
  { id: 'sign-duty-free', tileX: 45, tileY: 11, texture: 'sign-duty-free', tooltipText: 'Duty Free' },
  { id: 'sign-food-court', tileX: 58, tileY: 11, texture: 'sign-food-court', tooltipText: 'Food Court' },
  { id: 'sign-gates', tileX: 66, tileY: 11, texture: 'sign-gates', tooltipText: 'Gates \u2192' },
  { id: 'sign-gate-maui', tileX: 76, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 1 \u2014 Maui' },
  { id: 'sign-gate-2', tileX: 68, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 2 \u2014 Budapest' },
  { id: 'sign-gate-3', tileX: 64, tileY: 11, texture: 'sign-gate-number', tooltipText: 'Gate 3 \u2014 Coming Soon' },
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

  // Tarmac background
  private tarmacRT: Phaser.GameObjects.RenderTexture | null = null;
  private tarmacSprites: Phaser.GameObjects.GameObject[] = [];
  private tarmacTweens: Phaser.Tweens.Tween[] = [];
  private windowFrames: Phaser.GameObjects.Image[] = [];
  private glassTints: Phaser.GameObjects.Rectangle[] = [];
  private takeoffTimer: Phaser.Time.TimerEvent | null = null;

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
      for (let y = 14; y <= 18; y++) {
        this.blockedDoorways.add(`${pos.x},${y}`);
        this.blockedDoorways.add(`${pos.x + 1},${y}`);
      }
      // Barrier decoration sprite at center of doorway
      const centerPos = tileToWorld(pos.x, 16);
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

    // ── Tarmac animated background ──────────────────────────────────
    this.createTarmacBackground();
    this.createTarmacAnimations();
    this.createWindowFrames();
  }

  private createTarmacBackground(): void {
    const tarmacW = this.layout.widthInTiles * TILE_SIZE;  // 2560
    const tarmacH = 10 * TILE_SIZE;                         // 320 (rows 0-9)

    this.tarmacRT = this.add.renderTexture(0, 0, tarmacW, tarmacH);
    this.tarmacRT.setOrigin(0, 0);
    this.tarmacRT.setDepth(-49);

    // Sky gradient (top 40%)
    const skyH = Math.floor(tarmacH * 0.4);
    for (let y = 0; y < skyH; y++) {
      const t = y / skyH;
      const r = Math.round(135 + t * 40);
      const g = Math.round(206 + t * 18);
      const b = Math.round(235 + t * 10);
      const color = (r << 16) | (g << 8) | b;
      const line = this.add.rectangle(tarmacW / 2, y + 0.5, tarmacW, 1, color).setOrigin(0.5, 0.5);
      this.tarmacRT.draw(line);
      line.destroy();
    }

    // Tarmac surface (bottom 60%)
    const tarmacRect = this.add.rectangle(tarmacW / 2, skyH + (tarmacH - skyH) / 2, tarmacW, tarmacH - skyH, 0x555555).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(tarmacRect);
    tarmacRect.destroy();

    // Grass strip at horizon
    const grassRect = this.add.rectangle(tarmacW / 2, skyH + 4, tarmacW, 12, 0x2D5016).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(grassRect);
    grassRect.destroy();

    // Runway center line (white dashes)
    for (let x = 0; x < tarmacW; x += 40) {
      const dash = this.add.rectangle(x + 10, skyH + 72, 20, 3, 0xFFFFFF).setOrigin(0, 0.5);
      this.tarmacRT.draw(dash);
      dash.destroy();
    }

    // Taxiway lines (yellow)
    const taxiLine1 = this.add.rectangle(tarmacW / 2, skyH + 40, tarmacW, 2, 0xFFD700).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(taxiLine1);
    taxiLine1.destroy();
    const taxiLine2 = this.add.rectangle(tarmacW / 2, skyH + 110, tarmacW, 2, 0xFFD700).setOrigin(0.5, 0.5);
    this.tarmacRT.draw(taxiLine2);
    taxiLine2.destroy();
  }

  private createTarmacAnimations(): void {
    const addSprite = (x: number, y: number, texture: string, depth: number, scaleX = 1, scaleY = 1) => {
      const s = this.add.image(x, y, texture).setDepth(depth).setScale(scaleX, scaleY);
      this.tarmacSprites.push(s);
      return s;
    };
    const addTween = (config: Phaser.Types.Tweens.TweenBuilderConfig) => {
      const t = this.tweens.add(config);
      this.tarmacTweens.push(t);
      return t;
    };

    // ── A. Taxiing planes ──
    const taxi1 = addSprite(-140, 180, 'airplane-exterior', -48);
    taxi1.setFlipX(true);
    addTween({ targets: taxi1, x: 2700, duration: 30000, ease: 'Linear', repeat: -1, repeatDelay: 8000 });

    const taxi2 = addSprite(2700, 220, 'airplane-exterior', -48);
    addTween({ targets: taxi2, x: -140, duration: 35000, ease: 'Linear', repeat: -1, repeatDelay: 15000 });

    // ── B. Parked plane at gate ──
    addSprite(2350, 160, 'airplane-exterior', -48, 1.5, 1.5);
    const beacon = addSprite(2380, 145, 'tarmac-blink-light', -48);
    addTween({ targets: beacon, alpha: 0, duration: 600, yoyo: true, repeat: -1 });
    const leftTip = addSprite(2330, 170, 'tarmac-blink-light', -48);
    leftTip.setTint(0xFF0000);
    addTween({ targets: leftTip, alpha: 0, duration: 1000, yoyo: true, repeat: -1 });
    const rightTip = addSprite(2430, 170, 'tarmac-blink-light', -48);
    rightTip.setTint(0x00FF00);
    addTween({ targets: rightTip, alpha: 0, duration: 1000, yoyo: true, repeat: -1, delay: 500 });

    // ── C. Takeoff sequence (every 60s) ──
    this.takeoffTimer = this.time.addEvent({
      delay: 60000,
      loop: true,
      callback: () => {
        const plane = this.add.image(2600, 200, 'airplane-exterior').setDepth(-48).setScale(1.2);
        this.tweens.add({
          targets: plane, x: 600, duration: 3500, ease: 'Quad.easeIn',
          onComplete: () => {
            this.tweens.add({
              targets: plane, y: 40, scaleX: 0.5, scaleY: 0.5, alpha: 0,
              duration: 2000, ease: 'Sine.easeIn',
              onComplete: () => plane.destroy(),
            });
          },
        });
      },
    });

    // ── D. Luggage cart train ──
    const cart = addSprite(-60, 250, 'tarmac-luggage-cart', -47);
    addTween({ targets: cart, x: 2700, duration: 40000, ease: 'Linear', repeat: -1, repeatDelay: 5000 });

    // ── E. Fuel truck ──
    const fuel = addSprite(800, 260, 'tarmac-fuel-truck', -47);
    addTween({ targets: fuel, x: 2300, duration: 15000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', repeatDelay: 8000 });

    // ── F. Airport workers ──
    const worker1 = addSprite(500, 270, 'tarmac-worker', -47);
    addTween({ targets: worker1, x: 900, duration: 8000, yoyo: true, repeat: -1, ease: 'Linear' });
    const worker2 = addSprite(1600, 280, 'tarmac-worker', -47);
    addTween({ targets: worker2, x: 2000, duration: 10000, yoyo: true, repeat: -1, ease: 'Linear', delay: 3000 });

    // ── G. Ground crew with wands ──
    addSprite(2300, 190, 'tarmac-ground-crew', -47);
    addSprite(2320, 200, 'tarmac-ground-crew', -47);
    const wand1 = addSprite(2294, 190, 'tarmac-wand', -47);
    wand1.rotation = -0.5;
    addTween({ targets: wand1, rotation: 0.5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const wand2 = addSprite(2314, 200, 'tarmac-wand', -47);
    wand2.rotation = 0.5;
    addTween({ targets: wand2, rotation: -0.5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 });

    // ── H. Runway lights ──
    const lightXPositions = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
    lightXPositions.forEach((lx, i) => {
      const light = addSprite(lx, 200, 'tarmac-runway-light', -47);
      light.setAlpha(0.3);
      addTween({ targets: light, alpha: 1, duration: 800, yoyo: true, repeat: -1, delay: i * 100 });
    });

    // ── I. Distant landing plane ──
    const distant = addSprite(2700, 40, 'airplane-exterior', -48, 0.4, 0.4);
    addTween({ targets: distant, x: -100, y: 80, duration: 45000, ease: 'Linear', repeat: -1, repeatDelay: 20000 });

    // ── J. Control tower (static) ──
    addSprite(100, 60, 'tarmac-control-tower', -48);

    // ── K. Windsock ──
    const sock = addSprite(350, 50, 'tarmac-windsock', -47);
    sock.rotation = -0.2;
    addTween({ targets: sock, rotation: 0.2, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private createWindowFrames(): void {
    const windowXPositions = [2, 5, 8, 11, 14, 19, 22, 25, 29, 32, 35, 39, 42, 45, 48, 51, 55, 58, 61, 65, 67, 69, 71, 75, 77];
    windowXPositions.forEach(tx => {
      // Glass tint
      const tint = this.add.rectangle(tx * TILE_SIZE + TILE_SIZE / 2, 160, TILE_SIZE, 320, 0xAADDFF, 0.05)
        .setOrigin(0.5, 0.5).setDepth(-44);
      this.glassTints.push(tint);

      // Window frame (transparent panes show tarmac through)
      const frame = this.add.image(tx * TILE_SIZE, 0, 'interior-airport-window-tall')
        .setOrigin(0, 0).setDepth(-40);
      this.windowFrames.push(frame);
    });
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
    for (let y = 14; y <= 18; y++) {
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
      // Show gate choice hint and add pulsing indicators at both gates
      this.showGateIndicators();
      uiManager.showNPCDialog([
        'Security cleared! Head to your gate:',
        'Gate 1 — Maui  |  Gate 2 — Budapest',
      ], () => { uiManager.hideNPCDialog(); });
    }

  }

  private gateIndicators: Phaser.GameObjects.Rectangle[] = [];

  private showGateIndicators(): void {
    // Pulsing yellow indicators at Gate 1 and Gate 2
    const gates = [
      { tileX: 76, tileY: 12 },  // Gate 1 — Maui
      { tileX: 68, tileY: 12 },  // Gate 2 — Budapest
    ];
    gates.forEach(g => {
      const pos = tileToWorld(g.tileX, g.tileY);
      const indicator = this.add.rectangle(
        pos.x, pos.y, TILE_SIZE - 4, TILE_SIZE - 4, 0xFFDD44, 0.3,
      ).setDepth(1);
      this.tweens.add({
        targets: indicator, alpha: 0.6, duration: 800,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.gateIndicators.push(indicator);
    });
  }

  private startBoarding(destination: 'maui' | 'budapest'): void {
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
        this.scene.start('AirplaneCutscene', { destination });
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

    // Gate boarding — only after all stations are complete
    if (!this.sequenceActive && this.currentStation >= STATIONS.length && !this.boardingTriggered) {
      // Gate 1 — Maui (tile 76, 12)
      if (playerTile.x >= 75 && playerTile.x <= 77 && playerTile.y >= 11 && playerTile.y <= 13) {
        this.startBoarding('maui');
      }
      // Gate 2 — Budapest (tile 68, 12)
      if (playerTile.x >= 67 && playerTile.x <= 69 && playerTile.y >= 11 && playerTile.y <= 13) {
        this.startBoarding('budapest');
      }
    }
  }

  shutdown(): void {
    // Cleanup tarmac
    this.tarmacTweens.forEach(t => { t.stop(); t.destroy(); });
    this.tarmacTweens = [];
    this.takeoffTimer?.destroy();
    this.takeoffTimer = null;
    this.tarmacSprites.forEach(s => {
      if (s && 'destroy' in s) (s as Phaser.GameObjects.Image).destroy();
    });
    this.tarmacSprites = [];
    this.windowFrames.forEach(f => f.destroy());
    this.windowFrames = [];
    this.glassTints.forEach(t => t.destroy());
    this.glassTints = [];
    this.tarmacRT?.destroy();
    this.tarmacRT = null;

    super.shutdown();
    this.npcSystem?.destroy();
    this.signTooltip?.destroy();
    this.stationIndicator?.destroy();
    this.stationNPCSprites.forEach(s => s.destroy());
    this.stationNPCSprites = [];

    // Cleanup barrier sprites
    this.barrierSprites.forEach(s => s?.destroy());
    this.barrierSprites = [];

    // Cleanup gate indicators
    this.gateIndicators.forEach(i => i.destroy());
    this.gateIndicators = [];

  }
}
