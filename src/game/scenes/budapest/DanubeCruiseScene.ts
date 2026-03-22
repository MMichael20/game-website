import Phaser from 'phaser';
import { addLetterbox, removeLetterbox, showDialogue, addSkipButton, addBreathing, addSway, addHeartParticles, AnimationSet } from './cutsceneHelpers';
import { generateBudapestCoupleSprites } from '../../rendering/BudapestTextures';
import { loadGameState } from '../../systems/SaveSystem';
import { OUTFIT_STYLES } from '../../rendering/PixelArtGenerator';

export class DanubeCruiseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DanubeCruiseScene' });
  }

  create() {
    const w = Number(this.cameras.main.width);
    const h = Number(this.cameras.main.height);
    const waterY = h * 0.4;

    // ── Load outfits and generate outfit-aware sprites ──────────────
    const state = loadGameState();
    const pIdx = state.outfits.player;
    const rIdx = state.outfits.partner;
    const pStyle = OUTFIT_STYLES[pIdx] ?? OUTFIT_STYLES[0];
    const rStyle = OUTFIT_STYLES[rIdx] ?? OUTFIT_STYLES[0];
    const playerOutfit = {
      shirt: pStyle.shirt, hair: pStyle.hair, maleHair: pStyle.maleHair,
      skin: pStyle.skin, hairStyle: pStyle.hairStyle, maleHairStyle: pStyle.maleHairStyle,
    };
    const partnerOutfit = {
      shirt: rStyle.shirt, hair: rStyle.hair, maleHair: rStyle.maleHair,
      skin: rStyle.skin, hairStyle: rStyle.hairStyle, maleHairStyle: rStyle.maleHairStyle,
    };
    generateBudapestCoupleSprites(this, playerOutfit, partnerOutfit);

    // Track active animations for cleanup between phases
    const activeAnims: AnimationSet[] = [];
    const killAll = () => { activeAnims.forEach(a => a.kill()); activeAnims.length = 0; };

    // ── Background: deep evening sky ─────────────────────────────────
    this.add.rectangle(w / 2, h / 2, w, h, 0x1a1a3a).setDepth(0);

    // Stars: ~20 tiny white dots with gentle alpha twinkle
    const stars: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 20; i++) {
      const star = this.add.circle(
        Math.random() * w, Math.random() * waterY * 0.9,
        1 + Math.random(), 0xffffff,
      ).setDepth(1).setAlpha(0.3 + Math.random() * 0.4);
      stars.push(star);
      this.tweens.add({
        targets: star, alpha: 0.2, duration: 1500 + Math.random() * 2000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Danube water (lower 60%) ─────────────────────────────────────
    this.add.rectangle(w / 2, waterY + (h - waterY) / 2, w, h - waterY, 0x1a2a5a)
      .setDepth(2).setAlpha(0.92);

    // Water ripples: semi-transparent light blue rectangles drifting
    const ripples: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 10; i++) {
      const rx = Math.random() * w;
      const ry = waterY + 20 + Math.random() * (h - waterY - 40);
      const ripple = this.add.rectangle(rx, ry, 30 + Math.random() * 40, 3, 0x3355aa)
        .setDepth(3).setAlpha(0.15 + Math.random() * 0.1);
      ripples.push(ripple);
      this.tweens.add({
        targets: ripple, x: rx + 60 + Math.random() * 40, alpha: 0.05,
        duration: 4000 + Math.random() * 3000, ease: 'Sine.easeInOut',
        yoyo: true, repeat: -1,
      });
    }

    // ── Phase 1: Boarding (0-4s) ─────────────────────────────────────

    // Stone dock on the right side
    const dock = this.add.rectangle(w - 60, waterY + 10, 120, h - waterY + 20, 0x666655)
      .setDepth(4);

    // Cruise boat at dock
    const boat = this.add.image(w - 160, waterY + 20, 'bp-cruise-boat')
      .setDepth(10).setOrigin(0.5, 0.5);

    // ── Couple sprite — ALWAYS VISIBLE from phase 1 onward ──────────
    const coupleX = w / 2;
    const coupleY = h * 0.78;
    const couple = this.add.image(coupleX, coupleY, 'bp-couple-close')
      .setDepth(40).setScale(1.2);

    // Phase 1: boarding position near the boat, then tween to center
    couple.setPosition(w - 160, waterY + 5);
    this.tweens.add({
      targets: couple,
      x: coupleX,
      y: coupleY,
      duration: 3500,
      ease: 'Sine.easeInOut',
    });

    // Phase 1 breathing
    activeAnims.push(addBreathing(this, couple, 1.5, 2200));

    // Letterbox bars
    const bars = addLetterbox(this);

    // Skip button
    addSkipButton(this, 'BudapestOverworldScene', { returnFromInterior: true });

    // Boarding dialogue
    this.time.delayedCall(800, () => {
      showDialogue(this, "I've always wanted to do this.", 'partner');
    });

    // ── Phase 2: Departure (4-8s) ────────────────────────────────────

    this.time.delayedCall(4000, () => {
      // Couple stays visible! Scale up to 1.5
      this.tweens.add({
        targets: couple, scaleX: 1.5, scaleY: 1.5,
        duration: 3000, ease: 'Sine.easeInOut',
      });

      // Add gentle sway (on the boat)
      activeAnims.push(addSway(this, couple, 1.2, 3500));

      // Boat departs — tween left
      this.tweens.add({
        targets: boat, x: w * 0.35, duration: 6000, ease: 'Sine.easeInOut',
      });

      // Dock scrolls away to right
      this.tweens.add({
        targets: dock, x: w + 100, duration: 4000, ease: 'Sine.easeIn',
      });

      // Parliament slides in from the left
      const parliament = this.add.image(-130, waterY - 40, 'bp-cruise-parliament-lit')
        .setDepth(5).setOrigin(0.5, 1);
      this.tweens.add({
        targets: parliament, x: w * 0.25, duration: 5000, ease: 'Sine.easeOut',
      });

      // Orange glow overlay behind parliament
      const parliamentGlow = this.add.rectangle(w * 0.25, waterY - 60, 280, 140, 0xff8833)
        .setDepth(4).setAlpha(0);
      this.tweens.add({
        targets: parliamentGlow, alpha: 0.08, x: w * 0.25, duration: 5000, ease: 'Sine.easeOut',
      });

      // Warm reflections on water: orange-gold rectangles with alpha pulsing
      for (let i = 0; i < 6; i++) {
        const ref = this.add.rectangle(
          w * 0.1 + i * 50, waterY + 30 + Math.random() * 40,
          20 + Math.random() * 30, 4, 0xffaa44,
        ).setDepth(3).setAlpha(0);
        this.tweens.add({
          targets: ref, alpha: 0.15, duration: 1500, delay: i * 300,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }

      // Phase 2 -> Phase 3: Parliament scrolls away as boat continues
      this.time.delayedCall(4000, () => {
        this.tweens.add({
          targets: [parliament, parliamentGlow],
          x: `+=${w * 0.6}`, duration: 6000, ease: 'Linear',
        });
      });
    });

    // ── Phase 3: Under the Bridges (8-16s) ───────────────────────────

    this.time.delayedCall(8000, () => {
      // Couple leans forward slightly (excitement) — tilt angle
      this.tweens.add({
        targets: couple, angle: -3,
        duration: 1500, ease: 'Sine.easeOut',
        yoyo: true, hold: 2000,
      });

      // Chain Bridge appears from the left and passes overhead
      const bridge = this.add.image(-200, 30, 'bp-cruise-bridge-overhead')
        .setDepth(20).setOrigin(0.5, 0);
      this.tweens.add({
        targets: bridge, x: w / 2, duration: 3000, ease: 'Sine.easeOut',
        onComplete: () => {
          // Bridge passes to the right after pause
          this.tweens.add({
            targets: bridge, x: w + 250, duration: 4000, delay: 1000, ease: 'Sine.easeIn',
          });
        },
      });

      // Shadow overlay as boat passes under the bridge
      const shadow = this.add.rectangle(w / 2, h / 2, w, h, 0x000000)
        .setDepth(30).setAlpha(0);
      this.time.delayedCall(2500, () => {
        this.tweens.add({
          targets: shadow, alpha: 0.2, duration: 1000, yoyo: true,
          ease: 'Sine.easeInOut', onComplete: () => shadow.destroy(),
        });
      });

      // Buildings on both sides with lit windows
      const buildingElements: Phaser.GameObjects.Rectangle[] = [];
      // Left bank buildings
      for (let i = 0; i < 4; i++) {
        const bh = 40 + Math.random() * 30;
        const bx = -50 + i * 45;
        const building = this.add.rectangle(bx, waterY - bh / 2, 36, bh, 0x2a2a3a).setDepth(4);
        buildingElements.push(building);
        // Lit windows
        for (let wy = 0; wy < 3; wy++) {
          const win = this.add.rectangle(bx, waterY - bh + 12 + wy * 12, 6, 5, 0xffdd77)
            .setDepth(4).setAlpha(0.8);
          buildingElements.push(win);
        }
      }
      // Right bank buildings
      for (let i = 0; i < 4; i++) {
        const bh = 40 + Math.random() * 30;
        const bx = w + 50 + i * 45;
        const building = this.add.rectangle(bx, waterY - bh / 2, 36, bh, 0x2a2a3a).setDepth(4);
        buildingElements.push(building);
        for (let wy = 0; wy < 3; wy++) {
          const win = this.add.rectangle(bx, waterY - bh + 12 + wy * 12, 6, 5, 0xffdd77)
            .setDepth(4).setAlpha(0.8);
          buildingElements.push(win);
        }
      }
      // Slide buildings into view
      this.tweens.add({
        targets: buildingElements.filter((_, idx) => idx < 16),
        x: '+=80', duration: 4000, ease: 'Sine.easeOut',
      });
      this.tweens.add({
        targets: buildingElements.filter((_, idx) => idx >= 16),
        x: '-=80', duration: 4000, ease: 'Sine.easeOut',
      });

      // Add more stars
      for (let i = 0; i < 10; i++) {
        const s = this.add.circle(
          Math.random() * w, Math.random() * waterY * 0.8,
          1, 0xffffff,
        ).setDepth(1).setAlpha(0);
        this.tweens.add({
          targets: s, alpha: 0.5 + Math.random() * 0.3,
          duration: 2000, delay: i * 200,
        });
        this.tweens.add({
          targets: s, alpha: 0.2, duration: 1800 + Math.random() * 1500,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 2000 + i * 200,
        });
      }
    });

    // Phase 3 dialogue at 12s
    this.time.delayedCall(12000, () => {
      showDialogue(this, 'The city looks so different from the water.', 'partner');
    });

    // ── Phase 4: City of Lights (16-24s) — THE ROMANTIC PEAK ─────────

    this.time.delayedCall(16000, () => {
      // Kill phase 1-3 breathing/sway, start fresh for the romantic peak
      killAll();

      // Scale up to 2.0 — the big romantic close-up
      this.tweens.add({
        targets: couple, scaleX: 2.0, scaleY: 2.0,
        duration: 2000, ease: 'Sine.easeInOut',
      });

      // Swap texture to cozy variant (leaning together)
      this.time.delayedCall(1800, () => {
        couple.setTexture('bp-couple-close-cozy');
      });

      // Romantic animations: breathing + sway
      activeAnims.push(addBreathing(this, couple, 2, 2500));
      activeAnims.push(addSway(this, couple, 1.0, 4000));

      // Heart particles floating up from the couple
      activeAnims.push(addHeartParticles(this, coupleX, coupleY - 40, 5, 55));

      // Camera zoom for intimacy
      this.tweens.add({
        targets: this.cameras.main, zoom: 1.03,
        duration: 3000, ease: 'Sine.easeInOut',
      });

      // Both riverbanks visible with building silhouettes
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i < 5; i++) {
          const bh = 35 + Math.random() * 40;
          const bx = side === 0 ? 20 + i * 40 : w - 20 - i * 40;
          const building = this.add.rectangle(bx, waterY - bh / 2, 32, bh, 0x222233)
            .setDepth(4).setAlpha(0);
          this.tweens.add({ targets: building, alpha: 1, duration: 1500 });
          // Yellow window dots
          for (let wy = 0; wy < 3; wy++) {
            const win = this.add.circle(bx, waterY - bh + 10 + wy * 12, 2, 0xffdd66)
              .setDepth(4).setAlpha(0);
            this.tweens.add({ targets: win, alpha: 0.9, duration: 1500, delay: 300 });
          }
        }
      }

      // Buda Castle on the right hill
      const castleHill = this.add.rectangle(w - 80, waterY - 50, 140, 40, 0x333344)
        .setDepth(4).setAlpha(0);
      const castle = this.add.image(w - 80, waterY - 60, 'bp-cruise-castle-lit')
        .setDepth(5).setAlpha(0).setOrigin(0.5, 1);
      const castleGlow = this.add.rectangle(w - 80, waterY - 70, 160, 90, 0xffeedd)
        .setDepth(4).setAlpha(0);
      this.tweens.add({ targets: castleHill, alpha: 1, duration: 2000 });
      this.tweens.add({ targets: castle, alpha: 1, duration: 2000 });
      this.tweens.add({
        targets: castleGlow, alpha: 0.06, duration: 2000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Golden sparkle particles floating up from the water
      for (let i = 0; i < 20; i++) {
        this.time.delayedCall(i * 350, () => {
          const px = w * 0.15 + Math.random() * w * 0.7;
          const py = waterY + 20 + Math.random() * 30;
          const sparkle = this.add.circle(px, py, 1.5 + Math.random(), 0xffdd66)
            .setDepth(15).setAlpha(0.7);
          this.tweens.add({
            targets: sparkle, y: py - 50 - Math.random() * 30, alpha: 0,
            duration: 2000 + Math.random() * 1500, ease: 'Sine.easeOut',
            onComplete: () => sparkle.destroy(),
          });
        });
      }
    });

    // Phase 4 dialogue sequence
    this.time.delayedCall(18000, () => {
      showDialogue(this, "It's like the city is made of light.", 'partner', { duration: 1800 });
    });
    this.time.delayedCall(20000, () => {
      showDialogue(this, 'Just like you.', 'player', { duration: 1500 });
    });
    this.time.delayedCall(22000, () => {
      showDialogue(this, '...That was so cheesy.', 'partner', { duration: 1200 });
    });
    this.time.delayedCall(23000, () => {
      showDialogue(this, "You're smiling though.", 'player', { duration: 1500 });
    });

    // ── Phase 5: Return (24-30s) ─────────────────────────────────────

    this.time.delayedCall(24000, () => {
      // Keep cozy texture, gentle settle — scale eases back slightly
      this.tweens.add({
        targets: couple, scaleX: 1.8, scaleY: 1.8,
        duration: 3000, ease: 'Sine.easeInOut',
      });

      // Camera zoom settles back
      this.tweens.add({
        targets: this.cameras.main, zoom: 1.0,
        duration: 3000, ease: 'Sine.easeInOut',
      });

      // Breathing continues (already running from phase 4)

      // Boat flips — heading back
      boat.setFlipX(true);

      // City buildings slowly scroll right (moving away)
      this.children.list
        .filter(c => (c as Phaser.GameObjects.Rectangle).depth === 4 && c instanceof Phaser.GameObjects.Rectangle)
        .forEach(c => {
          this.tweens.add({
            targets: c, x: `+=${60}`, alpha: 0.4,
            duration: 5000, ease: 'Sine.easeInOut',
          });
        });

      // Warm glow fades, cooler blue tones return
      const coolOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0x1a1a4a)
        .setDepth(25).setAlpha(0);
      this.tweens.add({
        targets: coolOverlay, alpha: 0.1, duration: 3000, ease: 'Sine.easeIn',
      });

      // Stars multiply — additional dots tween in
      for (let i = 0; i < 15; i++) {
        const s = this.add.circle(
          Math.random() * w, Math.random() * waterY * 0.85,
          1 + Math.random() * 0.5, 0xffffff,
        ).setDepth(1).setAlpha(0);
        this.tweens.add({
          targets: s, alpha: 0.4 + Math.random() * 0.4,
          duration: 1500, delay: i * 150,
        });
      }
    });

    // Phase 5 dialogue
    this.time.delayedCall(27000, () => {
      showDialogue(this, 'Best night ever.', 'partner', { duration: 2000 });
    });

    // Letterbox bars slide away at 28s
    this.time.delayedCall(28000, () => {
      removeLetterbox(this, bars);
    });

    // Fade to black at 29s, transition at completion
    this.time.delayedCall(29000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('BudapestOverworldScene', { returnFromInterior: true });
      });
    });
  }
}
