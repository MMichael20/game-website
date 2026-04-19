import Phaser from 'phaser';
import {
  addLetterbox, removeLetterbox, showDialogue, addSkipButton,
  addBreathing, addSway, addSleepingZ, addHeartParticles,
  AnimationSet,
} from './cutsceneHelpers';
import { generateBudapestCoupleSprites } from '../../rendering/BudapestTextures';
import { loadGameState } from '../../systems/SaveSystem';
import { OUTFIT_STYLES } from '../../rendering/PixelArtGenerator';
import { audioManager } from '../../../audio/AudioManager';
import { startScene } from '../sceneData';
import { BP_PROP_KEYS } from '../../rendering/BudapestWorldProps';

export class ThermalBathScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ThermalBathScene' });
  }

  create() {
    audioManager.transitionToScene(this.scene.key);

    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);

    // ── Load outfits and generate couple sprites ──
    const state = loadGameState();
    const playerOutfitIdx = state.outfits.player;
    const partnerOutfitIdx = state.outfits.partner;
    const playerOutfit = OUTFIT_STYLES[playerOutfitIdx] ?? OUTFIT_STYLES[0];
    const partnerOutfit = OUTFIT_STYLES[partnerOutfitIdx] ?? OUTFIT_STYLES[0];
    generateBudapestCoupleSprites(this, playerOutfit, partnerOutfit);

    // Skip button
    addSkipButton(this, 'BudapestOverworldScene', { returnFromInterior: true });

    // ── Warm amber background ──
    this.add.rectangle(w / 2, h / 2, w, h, 0x2A1A0A).setDepth(0);

    // Amber/golden tint overlay
    const amberOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0xFFAA33)
      .setAlpha(0.15).setDepth(50);

    // ── Arched ceiling — marble pillars with arch spans between them ──
    const archPositions: number[] = [];
    for (let i = 0; i < 5; i++) {
      const ax = w * (i / 4);
      archPositions.push(ax);
      // One pillar per column (replaces the old 3-rect fake arch composition)
      this.add.image(ax, 60, BP_PROP_KEYS.thermalArchPillar).setDepth(2);
    }
    // Arch span between each consecutive pillar pair
    for (let i = 0; i < archPositions.length - 1; i++) {
      const midX = (archPositions[i] + archPositions[i + 1]) / 2;
      this.add.image(midX, 20, BP_PROP_KEYS.thermalArchSpan).setDepth(2);
    }

    // ── Tiled floor using bp-bath-mosaic ──
    const floorY = h - 32;
    const tilesNeeded = Math.ceil(w / 32) + 1;
    const floorTiles: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < tilesNeeded; i++) {
      const tile = this.add.image(i * 32 + 16, floorY + 16, 'bp-bath-mosaic')
        .setDepth(3);
      floorTiles.push(tile);
    }

    // ── Ornate columns ──
    const columnPositions = [w * 0.15, w * 0.4, w * 0.6, w * 0.85];
    const columns: Phaser.GameObjects.Image[] = [];
    for (const cx of columnPositions) {
      const col = this.add.image(cx, floorY - 48, 'bp-bath-columns')
        .setOrigin(0.5, 1).setDepth(5);
      columns.push(col);
    }

    // ── Couple walking in — outfit-aware sprite ──
    const coupleY = floorY - 10;
    const coupleWalking = this.add.image(-30, coupleY, 'bp-couple-walking')
      .setScale(2.0).setOrigin(0.5, 1).setDepth(10);

    // Breathing animation from the start
    const activeAnims: AnimationSet[] = [];
    const breathingWalk = addBreathing(this, coupleWalking, 2, 2000);
    activeAnims.push(breathingWalk);

    // ── Steam effect helper ──
    const spawnSteam = (sx: number, sy: number, depth: number = 20) => {
      const steam = this.add.circle(
        sx + Math.random() * 40 - 20,
        sy,
        3 + Math.random() * 3,
        0xFFFFFF
      ).setAlpha(0.25).setDepth(depth);
      this.tweens.add({
        targets: steam,
        y: sy - 30 - Math.random() * 20,
        alpha: 0,
        scaleX: 1.5, scaleY: 1.5,
        duration: 2000 + Math.random() * 1000,
        onComplete: () => steam.destroy(),
      });
    };

    // ── Bubble effect helper ──
    const spawnBubble = (bx: number, by: number, depth: number = 11) => {
      const r = 2 + Math.random() * 3;
      const bubble = this.add.circle(
        bx + (Math.random() - 0.5) * 40, by,
        r, 0xAAEEFF
      ).setAlpha(0.5).setDepth(depth);
      // Bubble has a subtle outline look
      const outline = this.add.circle(
        bubble.x, bubble.y, r + 0.5, 0xFFFFFF
      ).setAlpha(0.2).setDepth(depth - 1);
      this.tweens.add({
        targets: [bubble, outline],
        y: by - 20 - Math.random() * 30,
        x: bubble.x + (Math.random() - 0.5) * 16,
        alpha: 0,
        duration: 1200 + Math.random() * 800,
        onComplete: () => { bubble.destroy(); outline.destroy(); },
      });
    };

    // ── Splash droplet helper ──
    const spawnSplash = (sx: number, sy: number, count: number, depth: number = 16) => {
      for (let i = 0; i < count; i++) {
        const drop = this.add.circle(sx, sy, 1.5 + Math.random(), 0x5ECFEF)
          .setAlpha(0.8).setDepth(depth);
        const angle = Math.random() * Math.PI;
        const dist = 20 + Math.random() * 40;
        this.tweens.add({
          targets: drop,
          x: sx + Math.cos(angle) * dist * (Math.random() > 0.5 ? 1 : -1),
          y: sy - Math.sin(angle) * dist,
          alpha: 0,
          duration: 500 + Math.random() * 400,
          ease: 'Quad.easeOut',
          onComplete: () => drop.destroy(),
        });
      }
    };

    // ════════════════════════════════════════════════════════
    // PHASE 1: Entrance (0–5s)
    // ════════════════════════════════════════════════════════

    // Letterbox bars slide in
    const bars = addLetterbox(this);

    // Couple walks in from left — prominent center position
    this.tweens.add({
      targets: coupleWalking,
      x: w * 0.33,
      duration: 4000,
      ease: 'Sine.easeInOut',
    });

    // Early entrance steam — ambient wisps
    const entranceSteamEvent = this.time.addEvent({
      delay: 800, loop: true,
      callback: () => spawnSteam(w * 0.5, h * 0.6, 6),
    });

    // Dialogue at 1s
    this.time.delayedCall(1000, () => {
      showDialogue(this, 'Wow... this place is gorgeous.', 'partner');
    });

    // ════════════════════════════════════════════════════════
    // PHASE 2: Getting In the Pool (5–12s)
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(5000, () => {
      // Destroy entrance steam event
      entranceSteamEvent.destroy();

      // Kill walking breathing before switching sprites
      breathingWalk.kill();

      // "Camera pan" — tween background elements slightly left
      const panTargets = [...columns, ...floorTiles];
      for (const obj of panTargets) {
        this.tweens.add({ targets: obj, x: obj.x - 30, duration: 2000, ease: 'Sine.easeInOut' });
      }

      // Turquoise pool
      const poolW = w * 0.6;
      const poolH = h * 0.3;
      const poolX = w * 0.5;
      const poolY = h * 0.55;
      const pool = this.add.tileSprite(poolX, poolY, poolW, poolH, BP_PROP_KEYS.thermalPoolSurface)
        .setAlpha(0).setDepth(8);
      this.tweens.add({ targets: pool, alpha: 1, duration: 1500 });

      // Pool ripple effect — lighter rectangles oscillating
      for (let i = 0; i < 4; i++) {
        const ripple = this.add.rectangle(
          poolX - poolW * 0.3 + i * (poolW * 0.2),
          poolY,
          poolW * 0.15, 4, 0x3AAFBF
        ).setAlpha(0.4).setDepth(9);
        this.tweens.add({
          targets: ripple,
          x: ripple.x + 10,
          yoyo: true, repeat: -1,
          duration: 1500 + i * 300,
          ease: 'Sine.easeInOut',
        });
      }

      // Couple sprite at pool edge
      const poolCoupleY = poolY + poolH / 2 - 8;
      const couplePool = this.add.image(poolX, poolCoupleY, 'bp-couple-pool')
        .setScale(2.0).setAlpha(0).setDepth(15);
      this.tweens.add({ targets: couplePool, alpha: 1, duration: 1500 });

      // Breathing + gentle sway on pool sprite
      const breathingPool = addBreathing(this, couplePool, 2, 2200);
      const swayPool = addSway(this, couplePool, 1.5, 3000);
      activeAnims.push(breathingPool, swayPool);

      // Heart particles as they settle into the pool
      addHeartParticles(this, poolX, poolCoupleY - 40, 3, 55);

      // Fade out walking sprite
      this.tweens.add({
        targets: coupleWalking,
        alpha: 0,
        duration: 1000,
      });

      // Pool columns flanking
      const poolColPositions = [poolX - poolW / 2 - 20, poolX + poolW / 2 + 20];
      for (const px of poolColPositions) {
        this.add.image(px, poolY, 'bp-bath-columns').setOrigin(0.5, 0.5).setDepth(5);
      }

      // Steam rising from pool — continuous
      let poolSteamEvent = this.time.addEvent({
        delay: 600, loop: true,
        callback: () => spawnSteam(poolX + (Math.random() - 0.5) * poolW, poolY - poolH / 2),
      });

      // Bubbles rising from pool
      const bubbleEvent = this.time.addEvent({
        delay: 400, loop: true,
        callback: () => spawnBubble(poolX + (Math.random() - 0.5) * poolW * 0.6, poolY + poolH * 0.2),
      });

      // Light reflections — sparkles on water
      let sparkleEvent = this.time.addEvent({
        delay: 900, loop: true,
        callback: () => {
          const sparkle = this.add.circle(
            poolX + (Math.random() - 0.5) * poolW * 0.8,
            poolY + (Math.random() - 0.5) * poolH * 0.6,
            1.5, 0xFFFFDD
          ).setAlpha(0).setDepth(12);
          this.tweens.add({
            targets: sparkle,
            alpha: 0.7, yoyo: true, duration: 800,
            onComplete: () => sparkle.destroy(),
          });
        },
      });

      // Dialogue — getting in
      this.time.delayedCall(2000, () => {
        showDialogue(this, 'The water is SO warm...', 'partner');
      });
      this.time.delayedCall(4500, () => {
        showDialogue(this, 'I could stay here forever.', 'player');
      });

      // ════════════════════════════════════════════════════════
      // PHASE 3: Splashing & Playing (12–18s) — from scene start, 7s from phase 2
      // ════════════════════════════════════════════════════════

      this.time.delayedCall(7000, () => {
        // Playful splash! Couple bounces and water flies
        showDialogue(this, 'Splash fight!', 'partner', { duration: 1500 });

        // First splash — couple bobs down then up
        this.tweens.add({
          targets: couplePool,
          y: poolCoupleY + 8,
          duration: 200,
          ease: 'Quad.easeIn',
          yoyo: true,
          onYoyo: () => {
            spawnSplash(poolX - 20, poolCoupleY, 12);
            // Pool ripple wave
            const wave = this.add.rectangle(poolX - 20, poolY, poolW * 0.3, 6, 0x5ECFEF)
              .setAlpha(0.4).setDepth(10);
            this.tweens.add({
              targets: wave, scaleX: 2, alpha: 0, duration: 800,
              onComplete: () => wave.destroy(),
            });
          },
        });

        // Second splash after 1.5s
        this.time.delayedCall(1500, () => {
          showDialogue(this, 'Hey! No fair!', 'player', { duration: 1500 });

          this.tweens.add({
            targets: couplePool,
            y: poolCoupleY + 6,
            duration: 200,
            ease: 'Quad.easeIn',
            yoyo: true,
            onYoyo: () => {
              spawnSplash(poolX + 20, poolCoupleY, 12);
              const wave = this.add.rectangle(poolX + 20, poolY, poolW * 0.3, 6, 0x5ECFEF)
                .setAlpha(0.4).setDepth(10);
              this.tweens.add({
                targets: wave, scaleX: 2, alpha: 0, duration: 800,
                onComplete: () => wave.destroy(),
              });
            },
          });
        });

        // Big double splash at 3s
        this.time.delayedCall(3000, () => {
          // Both splash simultaneously
          this.tweens.add({
            targets: couplePool,
            y: poolCoupleY + 12,
            duration: 250,
            ease: 'Quad.easeIn',
            yoyo: true,
            onYoyo: () => {
              spawnSplash(poolX, poolCoupleY, 20);
              // Big wave from both sides
              for (const offset of [-30, 30]) {
                const wave = this.add.rectangle(poolX + offset, poolY, poolW * 0.4, 8, 0x5ECFEF)
                  .setAlpha(0.5).setDepth(10);
                this.tweens.add({
                  targets: wave, scaleX: 2.5, alpha: 0, duration: 1000,
                  onComplete: () => wave.destroy(),
                });
              }
            },
          });

          showDialogue(this, 'Hahahaha!!', 'partner', { duration: 1500 });
        });

        // Couple dips underwater briefly at 4.5s
        this.time.delayedCall(4500, () => {
          // Dip below water line
          this.tweens.add({
            targets: couplePool,
            y: poolCoupleY + 25,
            alpha: 0.4,
            duration: 600,
            ease: 'Sine.easeIn',
            onComplete: () => {
              // Burst of bubbles while underwater
              for (let i = 0; i < 8; i++) {
                this.time.delayedCall(i * 100, () => {
                  spawnBubble(poolX + (Math.random() - 0.5) * 30, poolCoupleY);
                });
              }

              // Come back up after a beat
              this.time.delayedCall(800, () => {
                this.tweens.add({
                  targets: couplePool,
                  y: poolCoupleY,
                  alpha: 1,
                  duration: 400,
                  ease: 'Back.easeOut',
                  onComplete: () => {
                    spawnSplash(poolX, poolCoupleY - 5, 10);
                  },
                });

                showDialogue(this, "Ahh that's refreshing!", 'player', { duration: 2000 });
              });
            },
          });
        });
      });

      // ════════════════════════════════════════════════════════
      // PHASE 4: Relaxation (18–27s) — 13s from phase 2 start
      // ════════════════════════════════════════════════════════
      this.time.delayedCall(13000, () => {
        // Texture swap to relaxed pose (eyes closed, blissful)
        couplePool.setTexture('bp-couple-pool-relaxed');

        // Kill previous breathing/sway, add intensified versions
        breathingPool.kill();
        swayPool.kill();
        const breathingRelaxed = addBreathing(this, couplePool, 3, 2500);
        const swayRelaxed = addSway(this, couplePool, 1.0, 4000);
        activeAnims.push(breathingRelaxed, swayRelaxed);

        // Sleeping Z's — blissful dozing
        addSleepingZ(this, couplePool, 3, 55);

        // Heart particles — romantic closeness
        addHeartParticles(this, poolX, poolCoupleY - 40, 4, 55);

        // Subtle camera zoom
        this.tweens.add({
          targets: this.cameras.main,
          zoom: 1.05,
          duration: 8000,
          ease: 'Sine.easeInOut',
        });

        // Steam intensifies — destroy old event, create faster one
        poolSteamEvent.destroy();
        poolSteamEvent = this.time.addEvent({
          delay: 400, loop: true,
          callback: () => spawnSteam(poolX + (Math.random() - 0.5) * poolW, poolY - poolH / 2),
        });

        // Amber overlay warms up
        this.tweens.add({
          targets: amberOverlay,
          alpha: 0.25,
          duration: 6000,
        });

        // Golden sparkles on water — destroy old, create faster
        sparkleEvent.destroy();
        sparkleEvent = this.time.addEvent({
          delay: 500, loop: true,
          callback: () => {
            const s = this.add.circle(
              poolX + (Math.random() - 0.5) * poolW * 0.8,
              poolY + (Math.random() - 0.5) * poolH * 0.6,
              1.5, 0xFFFFDD
            ).setAlpha(0).setDepth(12);
            this.tweens.add({ targets: s, alpha: 0.7, yoyo: true, duration: 800, onComplete: () => s.destroy() });
          },
        });

        // Bubbles slow down — relaxed pace
        bubbleEvent.destroy();
        this.time.addEvent({
          delay: 800, loop: true,
          callback: () => spawnBubble(poolX + (Math.random() - 0.5) * poolW * 0.4, poolY + poolH * 0.2),
        });

        // Golden light stars
        this.time.addEvent({
          delay: 700, loop: true,
          callback: () => {
            const star = this.add.circle(
              poolX + (Math.random() - 0.5) * poolW * 0.8,
              poolY + (Math.random() - 0.5) * poolH * 0.5,
              2, 0xFFDD88
            ).setAlpha(0).setDepth(12);
            this.tweens.add({
              targets: star,
              alpha: 0.6, yoyo: true, duration: 1000,
              onComplete: () => star.destroy(),
            });
          },
        });

        // Dialogue — intimate conversation
        this.time.delayedCall(1000, () => {
          showDialogue(this, 'Okay... truce. Come here.', 'partner');
        });
        this.time.delayedCall(3000, () => {
          showDialogue(this, 'This is hundreds of years old, you know.', 'player');
        });
        this.time.delayedCall(5000, () => {
          showDialogue(this, 'Mmm... the Romans knew what they were doing.', 'partner');
        });
        this.time.delayedCall(7000, () => {
          showDialogue(this, 'Actually, it was the Ottomans--', 'player');
        });
        this.time.delayedCall(8000, () => {
          showDialogue(this, 'Shhh. Just relax.', 'partner');
        });

        // ════════════════════════════════════════════════════════
        // PHASE 5: Exit (27–31s) — 9s from phase 4 start
        // ════════════════════════════════════════════════════════
        this.time.delayedCall(9000, () => {
          // Kill all active character animations
          activeAnims.forEach(a => a.kill());

          // Content fade out on couple
          this.tweens.add({
            targets: couplePool,
            alpha: 0,
            duration: 1500,
          });

          // Remove letterbox
          removeLetterbox(this, bars);

          // Warm white fade
          const warmWhite = this.add.rectangle(w / 2, h / 2, w, h, 0xFFF8E0)
            .setAlpha(0).setDepth(100);
          this.tweens.add({
            targets: warmWhite,
            alpha: 1,
            duration: 2000,
            onComplete: () => {
              startScene(this, 'BudapestOverworldScene', { returnFromInterior: true });
            },
          });
        });
      });
    });
  }
}
