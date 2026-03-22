import Phaser from 'phaser';
import {
  addLetterbox, removeLetterbox, showDialogue, addSkipButton,
  addBreathing, addSway, addSleepingZ, addHeartParticles,
  AnimationSet,
} from './cutsceneHelpers';
import { generateBudapestCoupleSprites } from '../../rendering/BudapestTextures';
import { loadGameState } from '../../systems/SaveSystem';
import { OUTFIT_STYLES } from '../../rendering/PixelArtGenerator';

export class ThermalBathScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ThermalBathScene' });
  }

  create() {
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

    // ── Arched ceiling — rectangles forming arch shapes at top ──
    const archColor = 0x1A0F05;
    for (let i = 0; i < 5; i++) {
      const ax = w * (i / 4);
      this.add.rectangle(ax, 0, 40, 30, archColor).setDepth(2);
      this.add.rectangle(ax - 15, 15, 10, 20, archColor).setDepth(2);
      this.add.rectangle(ax + 15, 15, 10, 20, archColor).setDepth(2);
    }
    // Top bar connecting arches
    this.add.rectangle(w / 2, 5, w, 10, archColor).setDepth(1);

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

    // ── Couple walking in — outfit-aware sprite, NOT colored rectangles ──
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

    // Early entrance steam — ambient wisps (STORED to fix memory leak)
    const entranceSteamEvent = this.time.addEvent({
      delay: 800, loop: true,
      callback: () => spawnSteam(w * 0.5, h * 0.6, 6),
    });

    // Dialogue at 1s
    this.time.delayedCall(1000, () => {
      showDialogue(this, 'Wow... this place is gorgeous.', 'partner');
    });

    // ════════════════════════════════════════════════════════
    // PHASE 2: The Pool (5–14s)
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(5000, () => {
      // FIX MEMORY LEAK: destroy entrance steam event
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
      const pool = this.add.rectangle(poolX, poolY, poolW, poolH, 0x2A8A9A)
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

      // Couple sprite at pool edge — bp-couple-pool at 2.0 scale, center of attention
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
      const poolSteamEvent = this.time.addEvent({
        delay: 600, loop: true,
        callback: () => spawnSteam(poolX + (Math.random() - 0.5) * poolW, poolY - poolH / 2),
      });

      // Light reflections — sparkles on water
      const sparkleEvent = this.time.addEvent({
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

      // Dialogue at 8s and 11s
      this.time.delayedCall(3000, () => {
        showDialogue(this, 'The water is SO warm...', 'partner');
      });
      this.time.delayedCall(6000, () => {
        showDialogue(this, 'I could stay here forever.', 'player');
      });

      // ════════════════════════════════════════════════════════
      // PHASE 3: Relaxation (14–22s) — from scene start, so 9s from phase 2
      // ════════════════════════════════════════════════════════
      this.time.delayedCall(9000, () => {
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

        // Subtle camera zoom
        this.tweens.add({
          targets: this.cameras.main,
          zoom: 1.05,
          duration: 8000,
          ease: 'Sine.easeInOut',
        });

        // Steam intensifies — destroy old event, create faster one
        poolSteamEvent.destroy();
        this.time.addEvent({
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
        this.time.addEvent({
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

        // Dialogue at 16s, 18s, 20s, 21s (offsets from 14s)
        this.time.delayedCall(2000, () => {
          showDialogue(this, 'This is hundreds of years old, you know.', 'player');
        });
        this.time.delayedCall(4000, () => {
          showDialogue(this, 'Mmm... the Romans knew what they were doing.', 'partner');
        });
        this.time.delayedCall(6000, () => {
          showDialogue(this, 'Actually, it was the Ottomans--', 'player');
        });
        this.time.delayedCall(7000, () => {
          showDialogue(this, 'Shhh. Just relax.', 'partner');
        });

        // ════════════════════════════════════════════════════════
        // PHASE 4: Exit (22–25s) — 8s from phase 3 start
        // ════════════════════════════════════════════════════════
        this.time.delayedCall(8000, () => {
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
              this.scene.start('BudapestOverworldScene', { returnFromInterior: true });
            },
          });
        });
      });
    });
  }
}
