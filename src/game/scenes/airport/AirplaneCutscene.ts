// src/game/scenes/airport/AirplaneCutscene.ts
// Pure sprite animation cutscene — no tilemap, no physics, no pathfinding.
// 5 phases: takeoff, cabin interior, cloud whiteout, landing, transition.

import Phaser from 'phaser';
import { loadGameState, saveCurrentScene } from '../../systems/SaveSystem';

export class AirplaneCutscene extends Phaser.Scene {
  private destination: 'maui' | 'home' = 'maui';

  constructor() {
    super('AirplaneCutscene');
  }

  init(data: { destination: 'maui' | 'home' }) {
    this.destination = data?.destination ?? 'maui';
  }

  create() {
    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);
    const state = loadGameState();

    // ── Exterior elements (Phase 1 + 4) ─────────────────────────────────

    // Sky background
    const sky = this.add.rectangle(w / 2, h / 2, w, h, 0x87ceeb).setAlpha(0);

    // Ground
    const ground = this.add.image(w / 2, h - 100, 'ground-strip').setAlpha(0);
    ground.setDisplaySize(w, 200);

    // Runway
    const runway = this.add.image(w / 2, h - 32, 'runway').setAlpha(0);
    runway.setDisplaySize(w, 64);

    // Airplane
    const plane = this.add.image(w / 2, h - 80, 'airplane-exterior').setAlpha(0).setScale(2);

    // ── Interior elements (Phase 2) ─────────────────────────────────────

    const cabinBg = this.add.image(w / 2, h / 2, 'airplane-cabin-bg').setAlpha(0);
    cabinBg.setDisplaySize(w, h);

    const playerKey = `player-outfit-${state.outfits.player}`;
    const partnerKey = `partner-outfit-${state.outfits.partner}`;

    const playerSprite = this.add.sprite(w / 2 - 40, h * 0.55, playerKey, 1)
      .setAlpha(0).setScale(2);
    const partnerSprite = this.add.sprite(w / 2 + 40, h * 0.55, partnerKey, 1)
      .setAlpha(0).setScale(2);

    // Cloud sprites for window scrolling
    const cloudKeys = ['cloud-1', 'cloud-2', 'cloud-3', 'cloud-1', 'cloud-2', 'cloud-3'];
    const clouds: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 6; i++) {
      const cy = 150 + Math.random() * 200;
      const cloud = this.add.image(-80 - i * 120, cy, cloudKeys[i])
        .setAlpha(0).setScale(1.5);
      clouds.push(cloud);
    }

    // ── Whiteout overlay (Phase 3) ──────────────────────────────────────

    const whiteout = this.add.rectangle(w / 2, h / 2, w, h, 0xffffff).setAlpha(0).setDepth(10);

    // ── Landing elements (Phase 4) ──────────────────────────────────────

    const landSky = this.add.rectangle(w / 2, h / 2, w, h, 0x87ceeb).setAlpha(0);
    const landGround = this.add.image(w / 2, h + 100, 'ground-strip').setAlpha(0);
    landGround.setDisplaySize(w, 200);
    const landPlane = this.add.image(w / 2, -60, 'airplane-exterior').setAlpha(0).setScale(1.5);

    // ═════════════════════════════════════════════════════════════════════
    // Phase 1 — Takeoff (0–3s)
    // ═════════════════════════════════════════════════════════════════════

    // Fade in exterior
    this.tweens.add({ targets: [sky, ground, runway, plane], alpha: 1, duration: 500 });

    // After fade-in, plane takes off
    this.time.delayedCall(500, () => {
      // Plane lifts off
      this.tweens.add({
        targets: plane,
        y: h * 0.3,
        x: w / 2 + 50,
        duration: 2000,
        ease: 'Quad.easeIn',
      });

      // Ground drops away
      this.tweens.add({
        targets: ground,
        y: h + 200,
        duration: 2000,
        ease: 'Quad.easeIn',
      });

      // Runway fades
      this.tweens.add({
        targets: runway,
        alpha: 0,
        y: h + 50,
        duration: 1500,
        ease: 'Quad.easeIn',
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 2 — Interior Cabin (3–7s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(3000, () => {
      // Fade out exterior
      this.tweens.add({ targets: [sky, ground, runway, plane], alpha: 0, duration: 500 });

      // Fade in cabin
      this.time.delayedCall(500, () => {
        this.tweens.add({ targets: [cabinBg, playerSprite, partnerSprite], alpha: 1, duration: 500 });

        // Show and scroll clouds
        for (let i = 0; i < clouds.length; i++) {
          const cloud = clouds[i];
          cloud.setAlpha(0.7);
          const speed = 4000 + Math.random() * 2000;
          this.tweens.add({
            targets: cloud,
            x: w + 100,
            duration: speed,
            ease: 'Linear',
            delay: i * 400,
          });
        }

        // Turbulence shake at 1.5s into cabin phase
        this.time.delayedCall(1500, () => {
          this.cameras.main.shake(300, 0.002);
        });
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 3 — Cloud Whiteout (7–9s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(7000, () => {
      this.tweens.add({
        targets: whiteout,
        alpha: 1,
        duration: 2000,
        ease: 'Linear',
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 4 — Landing (9–12s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(9000, () => {
      // Hide interior elements
      cabinBg.setAlpha(0);
      playerSprite.setAlpha(0);
      partnerSprite.setAlpha(0);
      for (const cloud of clouds) cloud.setAlpha(0);

      // Show landing sky and plane
      landSky.setAlpha(1);
      landPlane.setAlpha(1);
      landGround.setAlpha(1);

      // Fade whiteout away
      this.tweens.add({
        targets: whiteout,
        alpha: 0,
        duration: 500,
        ease: 'Linear',
      });

      // Plane descends
      this.tweens.add({
        targets: landPlane,
        y: h - 80,
        scaleX: 2,
        scaleY: 2,
        duration: 2500,
        ease: 'Quad.easeOut',
      });

      // Ground rises
      this.tweens.add({
        targets: landGround,
        y: h - 100,
        duration: 2500,
        ease: 'Quad.easeOut',
      });

      // Touchdown shake at 2s into landing phase (11s total)
      this.time.delayedCall(2000, () => {
        this.cameras.main.shake(300, 0.005);
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 5 — Transition (12s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(12000, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (this.destination === 'maui') {
          saveCurrentScene('MauiOverworldScene');
          this.scene.start('MauiOverworldScene');
        } else {
          saveCurrentScene('WorldScene');
          this.scene.start('WorldScene');
        }
      });
    });
  }
}
