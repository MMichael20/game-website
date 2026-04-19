// src/game/scenes/budapest/BudapestTransportScene.ts
// A 15-second parallax tram journey with diegetic departure-board
// destination selection. Framed transient cutscene: no save target, no
// player sprite. See design spec §4 for the phase table and invariants.

import Phaser from 'phaser';
import { audioManager } from '../../../audio/AudioManager';
import { BP_PROP_KEYS } from '../../rendering/BudapestWorldProps';
import {
  addLetterbox, showDialogue, addSkipButton, AnimationSet,
} from './cutsceneHelpers';
import { startScene } from '../sceneData';

// ── Phase durations (total 15s) ──────────────────────────────────────────
export const PHASE_DURATIONS_MS = {
  T1_DEPARTURE: 2000,
  T2_PEST_STREETS: 4000,
  T3_LANDMARK: 4000,
  T4_CROSSING: 3000,
  T5_FADE_OUT: 2000,
} as const;

// ── Scene-data contract ──────────────────────────────────────────────────
interface TransportSceneData {
  returnX: number;
  returnY: number;
  returnScene: 'BudapestOverworldScene' | 'JewishQuarterScene';
}

// ── Destination IDs ──────────────────────────────────────────────────────
type DestinationId = 'goBack' | 'jewishQuarter' | 'budapestEye' | 'airport';

interface Destination {
  id: DestinationId;
  label: string;
  // visible is decided at build time; no runtime gating needed
}

export class BudapestTransportScene extends Phaser.Scene {
  private sceneData!: TransportSceneData;

  // Cleanup arrays — populated at construction time, flushed in shutdown()
  private phaseTimers: Phaser.Time.TimerEvent[] = [];
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private activeAnims: AnimationSet[] = [];

  // Currently-selected destination (used by skip button fallback)
  private selectedDestination: DestinationId = 'goBack';

  constructor() {
    super({ key: 'BudapestTransportScene' });
  }

  init(data: Partial<TransportSceneData>): void {
    if (!data || typeof data.returnX !== 'number' || typeof data.returnY !== 'number') {
      throw new Error('BudapestTransportScene: missing returnX/returnY in scene data');
    }
    if (data.returnScene !== 'BudapestOverworldScene' && data.returnScene !== 'JewishQuarterScene') {
      throw new Error(
        `BudapestTransportScene: invalid returnScene "${String(data.returnScene)}" ` +
        `(expected 'BudapestOverworldScene' | 'JewishQuarterScene')`,
      );
    }
    this.sceneData = {
      returnX: data.returnX,
      returnY: data.returnY,
      returnScene: data.returnScene,
    };

    // Reset cleanup arrays — init can fire before shutdown on fast restarts
    this.phaseTimers = [];
    this.activeTweens = [];
    this.activeAnims = [];
    this.selectedDestination = 'goBack';
  }

  create(): void {
    audioManager.transitionToScene(this.scene.key);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // ── Tram stop framing ────────────────────────────────────────────────
    // Plain dusk sky fill at depth -10 — matches the "sky background" pattern
    // used elsewhere (letterbox sits above at depth 50).
    this.add.rectangle(w / 2, h / 2, w, h, 0x5a6a8a).setDepth(-10);

    // Distant horizon band — subtle warmth near the ground
    this.add.rectangle(w / 2, h * 0.55, w, 40, 0x8a7a6e).setDepth(-9).setAlpha(0.35);

    // Rails: far first (higher on screen, smaller), then near (lower, bigger)
    const railFarY = Math.round(h * 0.58);
    const railNearY = Math.round(h * 0.68);
    const railFar = this.add.tileSprite(0, railFarY, w, 6, BP_PROP_KEYS.tramRailFar)
      .setOrigin(0, 0.5).setDepth(1);
    const railNear = this.add.tileSprite(0, railNearY, w, 12, BP_PROP_KEYS.tramRailNear)
      .setOrigin(0, 0.5).setDepth(6);

    // Overhead catenary wire — drawn statically for pre-boarding, scrolled in T2
    const wire = this.add.tileSprite(0, Math.round(h * 0.18), w, 4, BP_PROP_KEYS.tramWire)
      .setOrigin(0, 0.5).setDepth(4);

    // Tram shelter — left side of screen
    const shelter = this.add.image(Math.round(w * 0.32), railNearY - 24, BP_PROP_KEYS.tramShelter)
      .setOrigin(0.5, 1).setDepth(5);

    // Tram stop sign — right side of shelter
    const signPole = this.add.image(Math.round(w * 0.54), railNearY - 8, BP_PROP_KEYS.tramSignPole)
      .setOrigin(0.5, 1).setDepth(5);

    // ── Departure board overlay ──────────────────────────────────────────
    const boardX = w / 2;
    const boardY = h * 0.35;
    const board = this.add.image(boardX, boardY, BP_PROP_KEYS.tramDepartureBoard)
      .setOrigin(0.5, 0.5).setDepth(52).setScale(2);

    // Destinations — filtered per §4.2
    const destinations: Destination[] = [
      { id: 'goBack',        label: 'Go Back' },
    ];
    if (this.sceneData.returnScene !== 'JewishQuarterScene') {
      destinations.push({ id: 'jewishQuarter', label: 'Jewish Quarter' });
    }
    destinations.push({ id: 'budapestEye', label: 'Budapest Eye' });
    destinations.push({ id: 'airport',     label: 'Airport (Go Home)' });

    // Render destination buttons as Phaser Text overlays on the board
    const boardFaceTopY = boardY - 64;      // approx top of inner black face
    const rowSpacing = 26;
    const boardButtons: Phaser.GameObjects.Text[] = [];
    destinations.forEach((dest, i) => {
      const rowY = boardFaceTopY + 20 + i * rowSpacing;
      const btn = this.add.text(boardX, rowY, `> ${dest.label}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#F2C024',
        backgroundColor: '#1A1A20',
        padding: { left: 8, right: 8, top: 3, bottom: 3 },
      }).setOrigin(0.5, 0.5).setDepth(53).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#F6D860'));
      btn.on('pointerout',  () => btn.setColor('#F2C024'));
      btn.on('pointerdown', () => {
        this.selectedDestination = dest.id;
        this.startJourney(dest.id, boardButtons, board, shelter, signPole, railNear, railFar, wire);
      });
      boardButtons.push(btn);
    });

    // Skip button — routes to currently-selected destination (or Go Back if none)
    const skipSceneAndData = this.getTargetStart(this.selectedDestination);
    addSkipButton(this, skipSceneAndData.scene, skipSceneAndData.data);
  }

  // ── Journey orchestration ────────────────────────────────────────────
  private startJourney(
    dest: DestinationId,
    boardButtons: Phaser.GameObjects.Text[],
    board: Phaser.GameObjects.Image,
    shelter: Phaser.GameObjects.Image,
    signPole: Phaser.GameObjects.Image,
    railNear: Phaser.GameObjects.TileSprite,
    railFar: Phaser.GameObjects.TileSprite,
    wire: Phaser.GameObjects.TileSprite,
  ): void {
    // Disable further clicks on buttons
    boardButtons.forEach(b => b.disableInteractive());

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Dismiss departure board — slide up + fade
    const fadeBoard = this.tweens.add({
      targets: [board, ...boardButtons],
      y: '-=120',
      alpha: 0,
      duration: 450,
      ease: 'Sine.easeIn',
      onComplete: () => {
        board.destroy();
        boardButtons.forEach(b => b.destroy());
      },
    });
    this.activeTweens.push(fadeBoard);

    // Slide tram in: from x=-200 to x=screenW/2 over 2s
    const tram = this.add.image(-200, Math.round(h * 0.62), BP_PROP_KEYS.tramSide)
      .setOrigin(0.5, 1).setDepth(20).setScale(2);

    const tramIn = this.tweens.add({
      targets: tram,
      x: w / 2,
      duration: 2000,
      ease: 'Sine.easeOut',
      onComplete: () => this.runParallaxPhases(dest, tram, shelter, signPole, railNear, railFar, wire),
    });
    this.activeTweens.push(tramIn);
  }

  // ── Phase scheduling: T1–T5 from cumulative offsets ─────────────────
  private runParallaxPhases(
    dest: DestinationId,
    tram: Phaser.GameObjects.Image,
    shelter: Phaser.GameObjects.Image,
    signPole: Phaser.GameObjects.Image,
    railNear: Phaser.GameObjects.TileSprite,
    railFar: Phaser.GameObjects.TileSprite,
    wire: Phaser.GameObjects.TileSprite,
  ): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const offsetT1 = 0;
    const offsetT2 = offsetT1 + PHASE_DURATIONS_MS.T1_DEPARTURE;
    const offsetT3 = offsetT2 + PHASE_DURATIONS_MS.T2_PEST_STREETS;
    const offsetT4 = offsetT3 + PHASE_DURATIONS_MS.T3_LANDMARK;
    const offsetT5 = offsetT4 + PHASE_DURATIONS_MS.T4_CROSSING;

    // Shared parallax scroll duration = the full 15s journey
    const journeyMs =
      PHASE_DURATIONS_MS.T1_DEPARTURE + PHASE_DURATIONS_MS.T2_PEST_STREETS +
      PHASE_DURATIONS_MS.T3_LANDMARK + PHASE_DURATIONS_MS.T4_CROSSING +
      PHASE_DURATIONS_MS.T5_FADE_OUT;

    // ── T1: Departure (0–2s) ──────────────────────────────────────────
    this.phaseTimers.push(this.time.delayedCall(offsetT1, () => {
      // Tram stop foreground scrolls off right-to-left
      this.activeTweens.push(this.tweens.add({
        targets: [shelter, signPole],
        x: `-=${w + 200}`,
        duration: 1800,
        ease: 'Sine.easeIn',
      }));

      // Rails start scrolling (near fast, far slow — parallax)
      this.activeTweens.push(this.tweens.add({
        targets: railNear, tilePositionX: 2400, duration: journeyMs, ease: 'Linear',
      }));
      this.activeTweens.push(this.tweens.add({
        targets: railFar, tilePositionX: 800, duration: journeyMs, ease: 'Linear',
      }));
      this.activeTweens.push(this.tweens.add({
        targets: wire, tilePositionX: 1600, duration: journeyMs, ease: 'Linear',
      }));

      // Cinematic letterbox
      addLetterbox(this);
    }));

    // ── T2: Pest Streets (2–6s) ───────────────────────────────────────
    this.phaseTimers.push(this.time.delayedCall(offsetT2, () => {
      const roadY = Math.round(h * 0.72);

      // Mid-depth pastel buildings — reuse existing assets
      const pastelKeys = [
        'bp-bus-building-pastel-1', 'bp-bus-building-pastel-2',
        'bp-bus-building-pastel-3', 'bp-bus-building-pastel-4',
      ];
      const buildings: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 10; i++) {
        const bx = w + 80 + i * 110;
        const key = pastelKeys[i % pastelKeys.length];
        const b = this.add.image(bx, roadY - 20, key)
          .setDepth(3).setOrigin(0.5, 1);
        buildings.push(b);
      }
      this.activeTweens.push(this.tweens.add({
        targets: buildings,
        x: `-=${w + 1300}`,
        duration: 9000,
        ease: 'Linear',
      }));

      // Foreground street trees — fast parallax
      const trees: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 8; i++) {
        const tx = w + 120 + i * 180;
        const tree = this.add.image(tx, roadY + 4, BP_PROP_KEYS.streetTree)
          .setDepth(8).setOrigin(0.5, 1);
        trees.push(tree);
      }
      this.activeTweens.push(this.tweens.add({
        targets: trees,
        x: `-=${w + 1800}`,
        duration: 6000,
        ease: 'Linear',
      }));

      // Dialogue 1
      showDialogue(this, 'The yellow trams never change.', 'player');
    }));

    // ── T3: Landmark (6–10s) ──────────────────────────────────────────
    this.phaseTimers.push(this.time.delayedCall(offsetT3, () => {
      const landmarkKey =
        dest === 'jewishQuarter' ? BP_PROP_KEYS.landmarkBasilica :
        /* budapestEye / airport / goBack */ BP_PROP_KEYS.landmarkParliament;

      const landmark = this.add.image(w / 2, h * 0.42, landmarkKey)
        .setDepth(2).setOrigin(0.5, 0.5).setAlpha(0).setScale(0.9);

      this.activeTweens.push(this.tweens.add({
        targets: landmark,
        alpha: 0.95,
        scale: 1.05,
        duration: 1400,
        ease: 'Sine.easeOut',
      }));
      this.activeTweens.push(this.tweens.add({
        targets: landmark,
        scale: 1.15,
        duration: PHASE_DURATIONS_MS.T3_LANDMARK,
        ease: 'Linear',
      }));

      // Dialogue 2
      this.phaseTimers.push(this.time.delayedCall(400, () => {
        showDialogue(this, 'There she is.', 'partner');
      }));
    }));

    // ── T4: Danube crossing (10–13s) ──────────────────────────────────
    this.phaseTimers.push(this.time.delayedCall(offsetT4, () => {
      const danube = this.add.tileSprite(0, Math.round(h * 0.62), w, 80, BP_PROP_KEYS.tramDanubeStrip)
        .setOrigin(0, 0.5).setDepth(2).setAlpha(0);
      this.activeTweens.push(this.tweens.add({
        targets: danube, alpha: 0.92, duration: 500, ease: 'Sine.easeOut',
      }));
      this.activeTweens.push(this.tweens.add({
        targets: danube,
        tilePositionX: 640,
        duration: PHASE_DURATIONS_MS.T4_CROSSING,
        ease: 'Linear',
      }));
      // Water-beat is dialogue-free. No couple sprite exists in this scene
      // (player sprite not rendered per §4.1) so addLeanTogether is skipped.
    }));

    // ── T5: Fade out + launch target (13–15s) ─────────────────────────
    this.phaseTimers.push(this.time.delayedCall(offsetT5, () => {
      this.cameras.main.fadeOut(PHASE_DURATIONS_MS.T5_FADE_OUT, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.launchTarget(dest);
      });

      // Tram slides off-screen during the fade so the hand-off feels continuous
      this.activeTweens.push(this.tweens.add({
        targets: tram,
        x: w + 400,
        duration: PHASE_DURATIONS_MS.T5_FADE_OUT,
        ease: 'Sine.easeIn',
      }));
    }));
  }

  // ── Target routing ───────────────────────────────────────────────────
  private launchTarget(dest: DestinationId): void {
    switch (dest) {
      case 'goBack':
        startScene(this, this.sceneData.returnScene, {
          returnFromInterior: true,
          returnX: this.sceneData.returnX,
          returnY: this.sceneData.returnY,
        });
        break;
      case 'jewishQuarter':
        this.scene.start('JewishQuarterScene', { returnFromInterior: true });
        break;
      case 'budapestEye':
        startScene(this, 'BudapestOverworldScene', {
          returnFromInterior: true,
          returnX: 27 * 32 + 16,
          returnY: 21 * 32 + 16,
        });
        break;
      case 'airport':
        startScene(this, 'AirplaneCutscene', { destination: 'home' });
        break;
    }
  }

  // Skip-button fallback: compute a scene key + data payload from a
  // destination id. "goBack" uses the stored returnScene.
  private getTargetStart(dest: DestinationId): { scene: string; data: Record<string, unknown> } {
    switch (dest) {
      case 'goBack':
        return {
          scene: this.sceneData.returnScene,
          data: {
            returnFromInterior: true,
            returnX: this.sceneData.returnX,
            returnY: this.sceneData.returnY,
          },
        };
      case 'jewishQuarter':
        return { scene: 'JewishQuarterScene', data: { returnFromInterior: true } };
      case 'budapestEye':
        return {
          scene: 'BudapestOverworldScene',
          data: { returnFromInterior: true, returnX: 27 * 32 + 16, returnY: 21 * 32 + 16 },
        };
      case 'airport':
        return { scene: 'AirplaneCutscene', data: { destination: 'home' } };
    }
  }

  shutdown(): void {
    this.phaseTimers.forEach(t => t.remove(false));
    this.activeTweens.forEach(t => t.stop());
    this.activeAnims.forEach(a => a.kill());
    this.phaseTimers.length = 0;
    this.activeTweens.length = 0;
    this.activeAnims.length = 0;
  }
}
