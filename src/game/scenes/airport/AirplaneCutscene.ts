// src/game/scenes/airport/AirplaneCutscene.ts
// Pure sprite animation cutscene — no tilemap, no physics, no pathfinding.
// 7 phases: takeoff, cabin settle, flight attendant, cozy moment, cloud whiteout, landing, transition.

import Phaser from 'phaser';
import { loadGameState, saveCurrentScene } from '../../systems/SaveSystem';
import { generateCutsceneSeatedSprites } from '../../rendering/AirportTextures';

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

    // Generate seated sprites for the active outfits
    generateCutsceneSeatedSprites(this, state.outfits.player, state.outfits.partner);

    // ── Exterior elements (Phase 1 + 6) ─────────────────────────────────

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

    // ── Interior elements (Phase 2–4) ──────────────────────────────────

    const cabinBg = this.add.image(w / 2, h / 2, 'airplane-cabin-bg').setAlpha(0);
    cabinBg.setDisplaySize(w, h);

    // Seated sprites instead of standing spritesheet frames
    const playerSprite = this.add.image(w * 0.62, h * 0.70, 'cutscene-player-seated')
      .setAlpha(0).setScale(2.0);
    const partnerSprite = this.add.image(w * 0.72, h * 0.68, 'cutscene-partner-seated')
      .setAlpha(0).setScale(2.0);

    // Cloud sprites for left-wall windows (scroll top→bottom through windows)
    const cloudKeys = ['cloud-1', 'cloud-2', 'cloud-3', 'cloud-1', 'cloud-2', 'cloud-3'];
    const clouds: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 6; i++) {
      const cx = 40 + Math.random() * 40;
      const cloud = this.add.image(cx, -30 - i * 60, cloudKeys[i])
        .setAlpha(0).setScale(0.5 + Math.random() * 0.1);
      clouds.push(cloud);
    }

    // Flight attendant sprites
    const attendant1 = this.add.image(w * 0.5, h * 0.15, 'cabin-flight-attendant')
      .setAlpha(0).setScale(1.0);
    const attendant2 = this.add.image(w * 0.48, h * 0.85, 'cabin-flight-attendant')
      .setAlpha(0).setScale(1.8).setFlipX(true);

    // ── Whiteout overlay (Phase 5) ────────────────────────────────────

    const whiteout = this.add.rectangle(w / 2, h / 2, w, h, 0xffffff).setAlpha(0).setDepth(10);

    // ── Landing elements (Phase 6) ────────────────────────────────────

    const landSky = this.add.rectangle(w / 2, h / 2, w, h, 0x87ceeb).setAlpha(0);
    const landGround = this.add.image(w / 2, h + 100, 'ground-strip').setAlpha(0);
    landGround.setDisplaySize(w, 200);
    const landPlane = this.add.image(w / 2, -60, 'airplane-exterior').setAlpha(0).setScale(1.5);

    // ═════════════════════════════════════════════════════════════════════
    // Phase 1 — Takeoff (0–3s)
    // ═════════════════════════════════════════════════════════════════════

    this.tweens.add({ targets: [sky, ground, runway, plane], alpha: 1, duration: 500 });

    this.time.delayedCall(500, () => {
      this.tweens.add({
        targets: plane,
        y: h * 0.3,
        x: w / 2 + 50,
        duration: 2000,
        ease: 'Quad.easeIn',
      });
      this.tweens.add({
        targets: ground,
        y: h + 200,
        duration: 2000,
        ease: 'Quad.easeIn',
      });
      this.tweens.add({
        targets: runway,
        alpha: 0,
        y: h + 50,
        duration: 1500,
        ease: 'Quad.easeIn',
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 2 — Cabin Settle (3–8s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(3000, () => {
      // Fade out exterior
      this.tweens.add({ targets: [sky, ground, runway, plane], alpha: 0, duration: 500 });

      this.time.delayedCall(500, () => {
        // Set depth ordering
        cabinBg.setDepth(0);
        for (const cloud of clouds) cloud.setDepth(1);
        attendant1.setDepth(2);
        attendant2.setDepth(2);
        playerSprite.setDepth(3);
        partnerSprite.setDepth(3);

        // Fade in cabin bg first, then characters staggered
        this.tweens.add({ targets: cabinBg, alpha: 1, duration: 500 });
        this.tweens.add({ targets: partnerSprite, alpha: 1, duration: 500, delay: 200 });
        this.tweens.add({ targets: playerSprite, alpha: 1, duration: 500, delay: 400 });

        // Clouds scroll top→bottom
        for (let i = 0; i < clouds.length; i++) {
          const cloud = clouds[i];
          cloud.setAlpha(0.7);
          const speed = 4000 + Math.random() * 2000;
          this.tweens.add({
            targets: cloud,
            y: h + 60,
            duration: speed,
            ease: 'Linear',
            delay: i * 700,
          });
        }
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 3 — Flight Attendant (8–13s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(8000, () => {
      // Attendant 1: walks toward camera
      attendant1.setAlpha(1);
      this.tweens.add({
        targets: attendant1,
        y: h * 0.85,
        scaleX: 2.0,
        scaleY: 2.0,
        duration: 3500,
        ease: 'Linear',
        delay: 200,
      });

      // Attendant 2: walks away
      attendant2.setAlpha(1);
      this.tweens.add({
        targets: attendant2,
        y: h * 0.15,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 4000,
        ease: 'Linear',
        delay: 500,
      });

      // Turbulence shake at 10s (2s into this phase)
      this.time.delayedCall(2000, () => {
        this.cameras.main.shake(300, 0.002);
      });

      // Second wave of clouds during this phase
      this.time.delayedCall(1500, () => {
        for (let i = 0; i < 3; i++) {
          const cloud = clouds[i];
          if (!cloud) continue;
          cloud.setY(-30 - i * 50);
          cloud.setAlpha(0.6);
          this.tweens.add({
            targets: cloud,
            y: h + 60,
            duration: 3500 + Math.random() * 1500,
            ease: 'Linear',
            delay: i * 600,
          });
        }
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 4 — Cozy Moment (13–20s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(13000, () => {
      // Hide attendants that have walked off
      attendant1.setAlpha(0);
      attendant2.setAlpha(0);

      // Player tilts to lean on partner
      playerSprite.setOrigin(0.5, 1.0);
      // Recalculate position after origin change
      playerSprite.setY(h * 0.70 + playerSprite.displayHeight * 0.5);

      this.tweens.add({
        targets: playerSprite,
        angle: 25,
        x: playerSprite.x + 20,
        y: playerSprite.y + 10,
        duration: 1500,
        ease: 'Sine.easeInOut',
      });

      // At 14.5s swap to resting (eyes closed) texture
      this.time.delayedCall(1500, () => {
        playerSprite.setTexture('cutscene-player-resting');
      });

      // At 15s start idle breathing animations
      this.time.delayedCall(2000, () => {
        // Partner subtle breathing (y oscillation)
        this.tweens.add({
          targets: partnerSprite,
          y: partnerSprite.y - 2,
          duration: 2000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });

        // Player gentle angle sway while resting
        this.tweens.add({
          targets: playerSprite,
          angle: 27,
          duration: 3000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });

        // Floating "z" text — 3 waves
        for (let wave = 0; wave < 3; wave++) {
          this.time.delayedCall(wave * 1800, () => {
            const zx = playerSprite.x - 10;
            const zy = playerSprite.y - playerSprite.displayHeight * 0.8;
            const zText = this.add.text(zx, zy, 'z', {
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '8px',
              color: '#ffffff',
            }).setDepth(5).setAlpha(0.8);

            this.tweens.add({
              targets: zText,
              y: zy - 30,
              alpha: 0,
              duration: 1600,
              ease: 'Sine.easeIn',
              onComplete: () => zText.destroy(),
            });

            // Second smaller z offset
            this.time.delayedCall(400, () => {
              const z2 = this.add.text(zx + 8, zy - 5, 'z', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: '#ddddff',
              }).setDepth(5).setAlpha(0.6);

              this.tweens.add({
                targets: z2,
                y: zy - 35,
                alpha: 0,
                duration: 1400,
                ease: 'Sine.easeIn',
                onComplete: () => z2.destroy(),
              });
            });
          });
        }
      });

      // More clouds at 18s for continued motion feel
      this.time.delayedCall(5000, () => {
        for (let i = 0; i < 3; i++) {
          const cloud = clouds[i + 3] ?? clouds[i];
          if (!cloud) continue;
          cloud.setY(-30 - i * 40);
          cloud.setAlpha(0.5);
          this.tweens.add({
            targets: cloud,
            y: h + 60,
            duration: 4000 + Math.random() * 1500,
            ease: 'Linear',
            delay: i * 500,
          });
        }
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 5 — Cloud Whiteout (20–23s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(20000, () => {
      this.tweens.add({
        targets: whiteout,
        alpha: 1,
        duration: 3000,
        ease: 'Linear',
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 6 — Landing (23–27s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(23000, () => {
      // Hide interior elements
      cabinBg.setAlpha(0);
      playerSprite.setAlpha(0);
      partnerSprite.setAlpha(0);
      attendant1.setAlpha(0);
      attendant2.setAlpha(0);
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
        duration: 3000,
        ease: 'Quad.easeOut',
      });

      // Ground rises
      this.tweens.add({
        targets: landGround,
        y: h - 100,
        duration: 3000,
        ease: 'Quad.easeOut',
      });

      // Touchdown shake
      this.time.delayedCall(2500, () => {
        this.cameras.main.shake(300, 0.005);
      });
    });

    // ═════════════════════════════════════════════════════════════════════
    // Phase 7 — Transition (27s)
    // ═════════════════════════════════════════════════════════════════════

    this.time.delayedCall(27000, () => {
      skipBtn.remove();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.transitionToDestination();
      });
    });

    // ── Skip Button ──────────────────────────────────────────────────────
    const skipBtn = document.createElement('div');
    skipBtn.className = 'skip-cutscene';
    skipBtn.textContent = 'Skip ▶▶';
    document.getElementById('ui-layer')!.appendChild(skipBtn);

    skipBtn.addEventListener('click', () => {
      skipBtn.remove();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.transitionToDestination();
      });
    });

    this.events.once('shutdown', () => { skipBtn.remove(); });
  }

  private transitionToDestination() {
    if (this.destination === 'maui') {
      saveCurrentScene('MauiOverworldScene');
      this.scene.start('MauiOverworldScene');
    } else {
      saveCurrentScene('WorldScene');
      this.scene.start('WorldScene');
    }
  }
}
