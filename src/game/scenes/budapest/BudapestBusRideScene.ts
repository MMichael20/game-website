import Phaser from 'phaser';
import {
  addLetterbox, removeLetterbox, showDialogue, addSkipButton,
  addBreathing, addSway, addHeartParticles, AnimationSet,
} from './cutsceneHelpers';
import { loadGameState } from '../../systems/SaveSystem';
import { OUTFIT_STYLES } from '../../rendering/PixelArtGenerator';
import { generateBudapestCoupleSprites } from '../../rendering/BudapestTextures';
import { audioManager } from '../../../audio/AudioManager';

export class BudapestBusRideScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BudapestBusRideScene' });
  }

  create() {
    audioManager.transitionToScene(this.scene.key);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const roadY = h * 0.78;
    const roadH = 50;

    // ── Load outfit data and generate couple sprites ──────────────────
    const state = loadGameState();
    const playerOutfit = OUTFIT_STYLES[state.outfits.player] ?? OUTFIT_STYLES[0];
    const partnerOutfit = OUTFIT_STYLES[state.outfits.partner] ?? OUTFIT_STYLES[0];
    generateBudapestCoupleSprites(this, playerOutfit, partnerOutfit);

    // Track active animations for cleanup
    const activeAnims: AnimationSet[] = [];

    // ── Phase 1: Departure (0-4s) ──────────────────────────────────────

    // Green suburban background
    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x6a9a4e).setDepth(0);

    // Countryside layer (slow parallax)
    const countryside = this.add.image(w / 2, h * 0.45, 'bp-bus-countryside')
      .setDepth(1).setAlpha(1);

    // Road surface
    this.add.rectangle(w / 2, roadY, w, roadH, 0x555555).setDepth(5);
    this.add.rectangle(w / 2, roadY - roadH / 2, w, 2, 0x777777).setDepth(6);
    this.add.rectangle(w / 2, roadY + roadH / 2, w, 2, 0x777777).setDepth(6);

    // Scrolling road dashes
    const dashes: Phaser.GameObjects.Rectangle[] = [];
    for (let x = -20; x < w + 40; x += 36) {
      dashes.push(this.add.rectangle(x, roadY, 16, 3, 0xffcc00).setDepth(7));
    }
    this.tweens.add({ targets: dashes, x: '-=36', duration: 300, ease: 'Linear', repeat: -1 });

    // Foreground trees (fast parallax)
    const trees: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 10; i++) {
      const tx = w + i * 140;
      const trunk = this.add.rectangle(tx, roadY - roadH / 2 - 20, 6, 40, 0x5a3a1a).setDepth(8);
      const canopy = this.add.circle(tx, roadY - roadH / 2 - 48, 16, 0x3a8a2a).setDepth(8);
      trees.push(trunk, canopy as unknown as Phaser.GameObjects.Rectangle);
    }
    const treeTween = this.tweens.add({
      targets: trees, x: `-=${w + 1600}`, duration: 18000, ease: 'Linear',
    });

    // Bus window frame (slightly transparent dark border)
    const frameAlpha = 0.85;
    this.add.rectangle(w / 2, 20, w, 40, 0x333333).setDepth(40).setAlpha(frameAlpha);
    this.add.rectangle(w / 2, h - 16, w, 32, 0x333333).setDepth(40).setAlpha(frameAlpha);
    this.add.rectangle(16, h / 2, 32, h, 0x333333).setDepth(40).setAlpha(frameAlpha);
    this.add.rectangle(w - 16, h / 2, 32, h, 0x333333).setDepth(40).setAlpha(frameAlpha);

    // ── Couple sprite — prominently centered at 2.0 scale ─────────────
    const coupleX = w * 0.5;
    const coupleY = h * 0.65;
    const couple = this.add.image(coupleX, coupleY, 'bp-couple-bus')
      .setDepth(45)
      .setScale(2.0);

    // Phase 1 animations: breathing + slight sway (excited departure)
    activeAnims.push(addBreathing(this, couple, 1.5, 2200));
    activeAnims.push(addSway(this, couple, 1.0, 3500));

    // Letterbox bars slide in
    const bars = addLetterbox(this);

    // Skip button
    addSkipButton(this, 'BudapestOverworldScene');

    // Departure dialogue
    this.time.delayedCall(800, () => {
      showDialogue(this, 'This is going to be amazing...', 'partner');
    });

    // Golden light overlay (used in phases 2-5)
    const goldenOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0xFFAA44)
      .setDepth(35).setAlpha(0);

    // ── Phase 2: Countryside (4-8s) ────────────────────────────────────

    this.time.delayedCall(4000, () => {
      // Slow parallax scroll on countryside
      this.tweens.add({
        targets: countryside, x: `-=${w * 0.3}`, duration: 14000, ease: 'Linear',
      });

      // Midground houses (medium speed)
      const houses: Phaser.GameObjects.Rectangle[] = [];
      for (let i = 0; i < 6; i++) {
        const hx = w + 60 + i * 180;
        const hh = 30 + Math.random() * 20;
        const houseColor = [0xCC9966, 0xBBAA88, 0xAA8877, 0xDDBB99][i % 4];
        const house = this.add.rectangle(hx, roadY - roadH / 2 - hh / 2 - 4, 50, hh, houseColor).setDepth(3);
        // Roof
        const roof = this.add.rectangle(hx, roadY - roadH / 2 - hh - 4, 56, 8, 0x884422).setDepth(3);
        // Window
        const win = this.add.rectangle(hx, roadY - roadH / 2 - hh / 2, 8, 8, 0xFFEEAA).setDepth(4);
        houses.push(house, roof, win);
      }
      this.tweens.add({
        targets: houses, x: `-=${w + 1200}`, duration: 12000, ease: 'Linear',
      });

      // Golden light fading in
      this.tweens.add({ targets: goldenOverlay, alpha: 0.08, duration: 4000 });

      // Phase 2: increase sway slightly as bus drives through countryside
      activeAnims.forEach(a => a.kill());
      activeAnims.length = 0;
      activeAnims.push(addBreathing(this, couple, 2, 2000));
      activeAnims.push(addSway(this, couple, 2.0, 2800));
    });

    // ── Phase 3: City Approach (8-14s) ─────────────────────────────────

    this.time.delayedCall(8000, () => {
      // Colorful pastel buildings scrolling in
      const cityElements: Phaser.GameObjects.Image[] = [];
      const pastelKeys = [
        'bp-bus-building-pastel-1', 'bp-bus-building-pastel-2',
        'bp-bus-building-pastel-3', 'bp-bus-building-pastel-4',
      ];
      for (let i = 0; i < 8; i++) {
        const bx = w + 60 + i * 110;
        const key = pastelKeys[i % 4];
        const building = this.add.image(bx, roadY - roadH / 2 - 44, key)
          .setDepth(3).setOrigin(0.5, 1);
        cityElements.push(building);
      }
      this.tweens.add({
        targets: cityElements, x: `-=${w + 1000}`, duration: 10000, ease: 'Linear',
      });

      // Budapest skyline approaching in distance
      const skyline = this.add.image(w * 0.8, h * 0.32, 'budapest-skyline')
        .setDepth(2).setAlpha(0.4).setScale(0.3);
      this.tweens.add({
        targets: skyline, scaleX: 0.6, scaleY: 0.6, alpha: 0.7, x: w * 0.5,
        duration: 6000, ease: 'Sine.easeOut',
      });

      // Danube flash between buildings at ~10s
      this.time.delayedCall(2000, () => {
        const danube = this.add.image(w / 2, h * 0.42, 'bp-bus-danube-flash')
          .setDepth(2).setAlpha(0);
        this.tweens.add({
          targets: danube, alpha: 0.7, duration: 600,
          yoyo: true, hold: 400,
          onComplete: () => danube.destroy(),
        });
      });

      // Phase 3: couple shifts forward slightly (excitement/anticipation)
      activeAnims.forEach(a => a.kill());
      activeAnims.length = 0;
      activeAnims.push(addBreathing(this, couple, 1.5, 1800));
      activeAnims.push(addSway(this, couple, 1.2, 3000));

      // Subtle forward lean — couple leans toward the window
      this.tweens.add({
        targets: couple,
        y: coupleY - 4,
        scaleX: 2.05,
        scaleY: 2.05,
        duration: 2000,
        ease: 'Sine.easeOut',
      });
    });

    // City approach dialogue
    this.time.delayedCall(9000, () => {
      showDialogue(this, 'Look! Is that the Parliament?', 'player', { duration: 1800 });
    });
    this.time.delayedCall(11000, () => {
      showDialogue(this, "It's even more beautiful than I imagined.", 'partner', { duration: 2500 });
    });

    // ── Phase 4: Crossing the Danube (14-18s) — THE ROMANTIC MOMENT ───

    this.time.delayedCall(14000, () => {
      // River visible below the road
      bg.setFillStyle(0x3388AA);

      // Bridge railings scrolling across bottom
      const railings: Phaser.GameObjects.Rectangle[] = [];
      for (let i = 0; i < 20; i++) {
        const rail = this.add.rectangle(w + i * 40, roadY + roadH / 2 + 8, 4, 16, 0x888888).setDepth(9);
        railings.push(rail);
      }
      this.tweens.add({ targets: railings, x: `-=${w + 900}`, duration: 4000, ease: 'Linear' });

      // Wide blue river below
      const river = this.add.rectangle(w / 2, roadY + roadH / 2 + 30, w, 40, 0x2277BB).setDepth(1);
      river.setAlpha(0);
      this.tweens.add({ targets: river, alpha: 0.8, duration: 800 });

      // Warm skyline across water
      const farSkyline = this.add.image(w / 2, h * 0.35, 'budapest-skyline')
        .setDepth(2).setAlpha(0).setScale(0.5).setTint(0xFFCC88);
      this.tweens.add({ targets: farSkyline, alpha: 0.8, duration: 1200 });

      // Golden particles floating upward
      for (let i = 0; i < 15; i++) {
        this.time.delayedCall(i * 250, () => {
          const px = Math.random() * w;
          const py = h * 0.5 + Math.random() * (h * 0.3);
          const particle = this.add.circle(px, py, 2 + Math.random() * 2, 0xFFDD66)
            .setDepth(30).setAlpha(0.6);
          this.tweens.add({
            targets: particle, y: py - 60 - Math.random() * 40, alpha: 0,
            duration: 1500 + Math.random() * 1000, ease: 'Sine.easeOut',
            onComplete: () => particle.destroy(),
          });
        });
      }

      // Warm color shift
      this.tweens.add({ targets: goldenOverlay, alpha: 0.12, duration: 1500 });

      // ── EMOTIONAL PEAK: texture swap to cozy variant ──
      activeAnims.forEach(a => a.kill());
      activeAnims.length = 0;

      // Swap to the cozy leaning-together texture
      couple.setTexture('bp-couple-bus-cozy');

      // Settle back to center with gentle animation
      this.tweens.add({
        targets: couple,
        y: coupleY,
        scaleX: 2.0,
        scaleY: 2.0,
        duration: 1000,
        ease: 'Sine.easeInOut',
      });

      // Soft breathing — slower, content
      activeAnims.push(addBreathing(this, couple, 1.2, 2800));
      activeAnims.push(addSway(this, couple, 0.8, 4000));

      // Heart particles floating above the couple
      activeAnims.push(addHeartParticles(this, coupleX, coupleY - couple.displayHeight * 0.5, 4, 46));

      // Camera zoom in slightly for intimacy
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.08,
        duration: 2000,
        ease: 'Sine.easeInOut',
        // Scroll to keep the couple centered during zoom
        scrollX: (w * 0.08) / 2,
        scrollY: (h * 0.08) / 2,
      });
    });

    // Danube crossing dialogue
    this.time.delayedCall(15000, () => {
      showDialogue(this, 'Welcome to Budapest.', 'ambient', { fontSize: '13px', duration: 2500 });
    });

    // ── Phase 5: Arrival (18-20s) ──────────────────────────────────────

    this.time.delayedCall(18000, () => {
      // Slow down remaining scrolling elements
      treeTween.timeScale = 0.3;

      // Dense arrival buildings
      const arrivalBuildings: Phaser.GameObjects.Rectangle[] = [];
      for (let i = 0; i < 6; i++) {
        const bx = w + i * 60;
        const bh = 70 + Math.random() * 40;
        const color = [0xD4A574, 0xC4B494, 0xB4A484, 0xE4C594][i % 4];
        const b = this.add.rectangle(bx, roadY - roadH / 2 - bh / 2, 50, bh, color).setDepth(3);
        arrivalBuildings.push(b);
      }
      this.tweens.add({
        targets: arrivalBuildings, x: `-=${w * 0.4}`, duration: 2000, ease: 'Sine.easeOut',
      });

      // Phase 5: content, cozy — keep cozy texture, gentle breathing
      activeAnims.forEach(a => a.kill());
      activeAnims.length = 0;
      activeAnims.push(addBreathing(this, couple, 1.0, 3000));

      // Reset camera zoom back to normal for transition
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1.0,
        scrollX: 0,
        scrollY: 0,
        duration: 1000,
        ease: 'Sine.easeInOut',
      });

      // Remove letterbox bars
      removeLetterbox(this, bars);

      // Fade to black and transition
      this.time.delayedCall(1200, () => {
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('BudapestOverworldScene');
        });
      });
    });
  }
}
