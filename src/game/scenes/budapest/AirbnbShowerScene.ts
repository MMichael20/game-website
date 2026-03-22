// src/game/scenes/budapest/AirbnbShowerScene.ts
// Romantic shower cutscene at the Budapest Airbnb — bathing suits, steam, water effects, zoom-in

import Phaser from 'phaser';
import {
  addLetterbox, removeLetterbox, showDialogue, addSkipButton,
  addBreathing, addSway, addHeartParticles, addSleepingZ,
  AnimationSet,
} from './cutsceneHelpers';
import { generateBudapestCoupleSprites } from '../../rendering/BudapestTextures';
import { loadGameState } from '../../systems/SaveSystem';
import { OUTFIT_STYLES } from '../../rendering/PixelArtGenerator';

export class AirbnbShowerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AirbnbShowerScene' });
  }

  create() {
    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);

    // ── Load outfits and generate couple sprites ──
    const state = loadGameState();
    const playerOutfit = OUTFIT_STYLES[state.outfits.player] ?? OUTFIT_STYLES[0];
    const partnerOutfit = OUTFIT_STYLES[state.outfits.partner] ?? OUTFIT_STYLES[0];
    generateBudapestCoupleSprites(this, playerOutfit, partnerOutfit);

    addSkipButton(this, 'BudapestAirbnbScene', { returnFromInterior: true });

    const activeAnims: AnimationSet[] = [];

    // ── Background: bathroom tiles ──
    this.add.rectangle(w / 2, h / 2, w, h, 0x1A2A3A).setDepth(0);

    // Tile wall pattern
    for (let tx = 0; tx < Math.ceil(w / 24); tx++) {
      for (let ty = 0; ty < Math.ceil(h / 24); ty++) {
        const tileColor = (tx + ty) % 2 === 0 ? 0x2A3A4A : 0x253545;
        this.add.rectangle(tx * 24 + 12, ty * 24 + 12, 22, 22, tileColor)
          .setDepth(1);
      }
    }

    // Shower head at top
    this.add.rectangle(w / 2, 20, 60, 12, 0xC0C0C0).setDepth(3);
    this.add.rectangle(w / 2, 10, 8, 20, 0xA0A0A0).setDepth(3);

    // Glass door frame (left and right)
    this.add.rectangle(40, h / 2, 6, h, 0x88AACC, 0.3).setDepth(4);
    this.add.rectangle(w - 40, h / 2, 6, h, 0x88AACC, 0.3).setDepth(4);

    // Warm mist overlay
    const mistOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0xFFFFFF)
      .setAlpha(0.05).setDepth(40);

    // ── Steam helper ──
    const spawnSteam = (sx: number, sy: number) => {
      const steam = this.add.circle(
        sx + (Math.random() - 0.5) * 60, sy,
        4 + Math.random() * 5, 0xFFFFFF,
      ).setAlpha(0.2).setDepth(35);
      this.tweens.add({
        targets: steam,
        y: sy - 40 - Math.random() * 30,
        x: steam.x + (Math.random() - 0.5) * 20,
        alpha: 0, scaleX: 2, scaleY: 2,
        duration: 2500 + Math.random() * 1500,
        onComplete: () => steam.destroy(),
      });
    };

    // ── Water droplet helper ──
    const spawnWaterDrop = () => {
      const x = w * 0.25 + Math.random() * w * 0.5;
      const drop = this.add.rectangle(x, 30, 1.5, 5 + Math.random() * 4, 0x6699CC)
        .setAlpha(0.35 + Math.random() * 0.2).setDepth(30);
      this.tweens.add({
        targets: drop,
        y: h + 10,
        duration: 300 + Math.random() * 200,
        ease: 'Linear',
        onComplete: () => drop.destroy(),
      });
    };

    // Letterbox
    const bars = addLetterbox(this);

    // ════════════════════════════════════════════════════════
    // PHASE 1: Stepping In (0–5s)
    // ════════════════════════════════════════════════════════

    // Couple sprite — bathing suits, starts small and zooms in
    const coupleY = h * 0.5;
    const couple = this.add.image(w / 2, coupleY, 'bp-couple-shower')
      .setScale(1.5).setDepth(20).setAlpha(0);

    // Fade in and zoom
    this.tweens.add({
      targets: couple,
      alpha: 1, scaleX: 2.5, scaleY: 2.5,
      duration: 3000, ease: 'Sine.easeInOut',
    });

    activeAnims.push(addBreathing(this, couple, 2, 2200));

    // Light steam from the start
    const steamEvent = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => spawnSteam(w / 2, h * 0.3),
    });

    // Water drops — light shower
    const waterEvent = this.time.addEvent({
      delay: 60, loop: true,
      callback: spawnWaterDrop,
    });

    this.time.delayedCall(1000, () => {
      showDialogue(this, 'The water is perfect...', 'partner');
    });
    this.time.delayedCall(3500, () => {
      showDialogue(this, 'This is so nice after walking all day.', 'player');
    });

    // ════════════════════════════════════════════════════════
    // PHASE 2: Close-up Zoom (5–12s)
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(5000, () => {
      // Big zoom in — intimate close-up
      this.tweens.add({
        targets: couple,
        scaleX: 3.5, scaleY: 3.5,
        duration: 3000, ease: 'Sine.easeInOut',
      });

      // Camera zoom too
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.1,
        duration: 3000, ease: 'Sine.easeInOut',
      });

      // Add sway
      activeAnims.push(addSway(this, couple, 1.0, 3500));

      // Water droplets on bodies — sparkles
      this.time.addEvent({
        delay: 600, loop: true,
        callback: () => {
          const dx = (Math.random() - 0.5) * 60;
          const dy = (Math.random() - 0.5) * 40;
          const droplet = this.add.circle(
            w / 2 + dx, coupleY + dy,
            1.5, 0xAADDFF,
          ).setAlpha(0.6).setDepth(22);
          this.tweens.add({
            targets: droplet,
            y: droplet.y + 10 + Math.random() * 10,
            alpha: 0, duration: 800,
            onComplete: () => droplet.destroy(),
          });
        },
      });

      // Mist thickens
      this.tweens.add({
        targets: mistOverlay, alpha: 0.1, duration: 3000,
      });

      this.time.delayedCall(2000, () => {
        showDialogue(this, 'Come closer...', 'partner');
      });
      this.time.delayedCall(4500, () => {
        showDialogue(this, 'You have shampoo in your hair.', 'player');
      });
      this.time.delayedCall(6000, () => {
        showDialogue(this, "No I don't! ...Do I?", 'partner');
      });
    });

    // ════════════════════════════════════════════════════════
    // PHASE 3: Cozy Moment (12–20s)
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(12000, () => {
      // Swap to cozy sprite (eyes closed, arm around)
      couple.setTexture('bp-couple-shower-cozy');

      // Even bigger zoom
      this.tweens.add({
        targets: couple,
        scaleX: 4.0, scaleY: 4.0,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.15,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      // Hearts
      addHeartParticles(this, w / 2, coupleY - 60, 5, 55);

      // Warm color shift
      this.tweens.add({
        targets: mistOverlay, alpha: 0.15, duration: 4000,
      });

      // Steam intensifies
      steamEvent.destroy();
      this.time.addEvent({
        delay: 300, loop: true,
        callback: () => spawnSteam(w / 2, h * 0.25),
      });

      this.time.delayedCall(1500, () => {
        showDialogue(this, "I don't want to leave Budapest.", 'partner');
      });
      this.time.delayedCall(4000, () => {
        showDialogue(this, "We'll come back. I promise.", 'player');
      });
      this.time.delayedCall(6500, () => {
        showDialogue(this, "...Can we just stay here a bit longer?", 'partner');
      });
    });

    // ════════════════════════════════════════════════════════
    // PHASE 4: Fade Out (20–24s)
    // ════════════════════════════════════════════════════════

    this.time.delayedCall(20000, () => {
      activeAnims.forEach(a => a.kill());

      // Fade couple
      this.tweens.add({
        targets: couple, alpha: 0, duration: 2000,
      });

      // Mist fills the screen
      this.tweens.add({
        targets: mistOverlay, alpha: 0.6, duration: 2500,
      });

      removeLetterbox(this, bars);

      // White fade out
      const whiteOut = this.add.rectangle(w / 2, h / 2, w, h, 0xFFFFFF)
        .setAlpha(0).setDepth(100);
      this.tweens.add({
        targets: whiteOut, alpha: 1, duration: 2500,
        onComplete: () => {
          this.scene.start('BudapestAirbnbScene', { returnFromInterior: true });
        },
      });
    });
  }
}
